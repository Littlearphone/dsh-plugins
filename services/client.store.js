/**
 * Services — client store, hooks and the routes they read.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.store.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createStore(d) {
      const { t, ROUTE, PACKAGE, KIND, sortScripts: sortScriptsFromData } = d;
    const sortScripts = typeof sortScriptsFromData === 'function' ? sortScriptsFromData : (list) => list;

    const store = {
      open: false,
      sessionId: undefined,
      actions: undefined,
      notice: '',
      busy: false,
      focusServiceId: '',
      diag: '',
      revision: 0,
      listeners: new Set(),
      // Runs this page started, so a finished run can announce itself without
      // also announcing services that were already finished when the page loaded.
      watched: new Set(),
      toasts: [],
    };

    /** A toast lives long enough to read, but does not stack up forever. */
    const TOAST_TTL_MS = 8000;
    const MAX_TOASTS = 4;
    let toastSeq = 0;
    const toastTimers = new Map();

    /**
     * Auto-dismiss only while the page is actually in front of the user. When
     * the window is blurred, minimised or on another desktop tab, the timer is
     * dropped instead: an execution result that expired while nobody looked is
     * the same as no notification at all.
     */
    function windowIsActive() {
      return (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        document.hasFocus()
      );
    }

    function clearToastTimer(id) {
      const timer = toastTimers.get(id);
      if (timer === undefined) return;
      clearTimeout(timer);
      toastTimers.delete(id);
    }

    function scheduleToastDismiss(id) {
      if (!windowIsActive() || toastTimers.has(id)) return;
      const timer = setTimeout(() => {
        toastTimers.delete(id);
        // A missed blur event must not let the timer burn through an unfocused
        // window: drop this timer and let the focus handler arm a fresh one.
        if (!windowIsActive()) return;
        dismissToast(id);
      }, TOAST_TTL_MS);
      toastTimers.set(id, timer);
    }

    /** Start timers on focus, freeze them on blur/hide. */
    function syncToastTimers() {
      if (!windowIsActive()) {
        for (const id of [...toastTimers.keys()]) clearToastTimer(id);
        return;
      }
      for (const toast of store.toasts) scheduleToastDismiss(toast.id);
    }

    function dismissToast(id) {
      clearToastTimer(id);
      const next = store.toasts.filter((toast) => toast.id !== id);
      if (next.length === store.toasts.length) return;
      store.toasts = next;
      emit();
    }

    function pushToast(toast) {
      const id = 'toast-' + (toastSeq += 1);
      const next = [...store.toasts, { ...toast, id }];
      if (next.length > MAX_TOASTS) {
        for (const dropped of next.slice(0, next.length - MAX_TOASTS)) {
          clearToastTimer(dropped.id);
        }
      }
      store.toasts = next.slice(-MAX_TOASTS);
      emit();
      scheduleToastDismiss(id);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncToastTimers);
      window.addEventListener('blur', syncToastTimers);
      document.addEventListener('visibilitychange', syncToastTimers);
    }

    function emit() {
      store.revision += 1;
      for (const listener of store.listeners) listener();
    }

    function setOpen(open) {
      if (store.open === open) return;
      store.open = open;
      emit();
    }

    function useStoreRevision() {
      return React.useSyncExternalStore(
        (notify) => {
          store.listeners.add(notify);
          return () => store.listeners.delete(notify);
        },
        () => store.revision,
        () => 0,
      );
    }

    /** Fetch the workspace manifest summary for one Session. */
    function useScripts(sessionId) {
      const [state, setState] = React.useState({ phase: 'idle', dir: '', groups: [], jdk: undefined });

      const load = React.useCallback(() => {
        if (sessionId === undefined || sessionId === null) {
          setState({ phase: 'empty', dir: '', groups: [], jdk: undefined });
          return;
        }
        setState((current) => ({ ...current, phase: 'loading' }));
        fetch(ROUTE + encodeURIComponent(String(sessionId)))
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('http'))))
          .then((data) => {
            const groups = Array.isArray(data?.groups)
              ? data.groups
                  .map((group) => ({
                    id: String(group?.id ?? ''),
                    kind: ['go', 'maven', 'gradle'].includes(group?.kind) ? group.kind : 'npm',
                    name: typeof group?.name === 'string' ? group.name : '',
                    dir: typeof group?.dir === 'string' ? group.dir : '',
                    scripts: Array.isArray(group?.scripts) ? sortScripts(group.scripts) : [],
                  }))
                  .filter((group) => group.scripts.length > 0)
              : [];
            // The JDK picker's data is per workspace, not per script: the Host
            // resolves it once and every editor of this list shares it.
            const jdk =
              data?.jdk !== null && typeof data?.jdk === 'object' ? data.jdk : undefined;
            setState({
              phase: groups.length === 0 ? 'empty' : 'ready',
              dir: data?.dir ?? '',
              groups,
              jdk,
            });
          })
          .catch(() => setState({ phase: 'error', dir: '', groups: [], jdk: undefined }));
      }, [sessionId]);

      React.useEffect(() => {
        load();
      }, [load]);

      return [state, load];
    }

    const STATE_ROUTE = '/services/state/';
    const START_ROUTE = '/services/start/';
    const STOP_ROUTE = '/services/stop/';
    const RESTART_ROUTE = '/services/restart/';
    const CONFIG_ROUTE = '/services/config/';
    const PIN_ROUTE = '/services/pin/';
    const UI_ROUTE = '/services/ui/';
    const OUTPUT_ROUTE = '/services/output/';

    /** Stop one started service; failures are silent because the next poll shows state. */
    async function stopService(sessionId, id) {
      // A stop the user asked for is not an execution result worth a toast.
      store.watched.delete(id);
      try {
        await postJson(STOP_ROUTE + encodeURIComponent(String(sessionId)), { id });
      } catch {
        /* the state poll reports what actually happened */
      }
    }

    /**
     * Stop one run and start the same script again in a single Host call. The
     * reply is the replacement's id, which is what lets a row tell "restarting"
     * apart from "the old run is still the current one".
     */
    async function restartService(sessionId, id) {
      const created = await postJson(RESTART_ROUTE + encodeURIComponent(String(sessionId)), { id });
      // The old id is gone for good once the Host replaced it; watch the new run
      // instead, so its eventual exit still gets a toast.
      store.watched.delete(id);
      const nextId = String(created?.service?.id ?? '');
      if (nextId !== '') store.watched.add(nextId);
      return created?.service;
    }

    async function postJson(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    /**
     * Started services of one Session, polled while a surface is mounted. The
     * Host owns the process; this is only the observed state.
     */
    function useServices(sessionId) {
      const [services, setServices] = React.useState([]);
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null) return undefined;
        let alive = true;
        const tick = async () => {
          try {
            const response = await fetch(STATE_ROUTE + encodeURIComponent(String(sessionId)));
            if (!response.ok) return;
            const data = await response.json();
            if (alive) setServices(Array.isArray(data?.services) ? data.services : []);
          } catch {
            /* a failed poll keeps the previous list */
          }
        };
        void tick();
        const timer = setInterval(tick, 1000);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [sessionId]);
      return services;
    }

    /**
     * Turn one watched run's terminal state into a toast, once. The visible
     * surfaces already poll `services`; this only looks at ids this page
     * started, so runs that were already finished on page load stay quiet.
     */
    function useServiceNotices(services) {
      React.useEffect(() => {
        for (const service of services) {
          if (!store.watched.has(service.id)) continue;
          if (service.state !== 'exited' && service.state !== 'failed') continue;
          store.watched.delete(service.id);
          pushToast({
            serviceId: service.id,
            name: service.name,
            command: service.command,
            state: service.state,
            exitCode: service.exitCode,
          });
        }
      }, [services]);
    }

    /**
     * The start-configuration editor. The script body is shown read-only and
     * carries a lock: it belongs to package.json, and this plugin only ever adds
     * parameters, environment and a working directory around it.
     */


      return { store, emit, setOpen, postJson, stopService, restartService, useStoreRevision, useScripts, useServices, useServiceNotices, dismissToast, STATE_ROUTE, START_ROUTE, STOP_ROUTE, RESTART_ROUTE, CONFIG_ROUTE, PIN_ROUTE, UI_ROUTE, OUTPUT_ROUTE };
    }

    return { createStore };
  },
});