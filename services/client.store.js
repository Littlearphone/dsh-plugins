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
      const { t, ROUTE, PACKAGE, KIND } = d;

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
    };

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
      const [state, setState] = React.useState({ phase: 'idle', dir: '', groups: [] });

      const load = React.useCallback(() => {
        if (sessionId === undefined || sessionId === null) {
          setState({ phase: 'empty', dir: '', groups: [] });
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
                    kind: group?.kind === 'go' ? 'go' : 'npm',
                    name: typeof group?.name === 'string' ? group.name : '',
                    dir: typeof group?.dir === 'string' ? group.dir : '',
                    scripts: Array.isArray(group?.scripts) ? sortScripts(group.scripts) : [],
                  }))
                  .filter((group) => group.scripts.length > 0)
              : [];
            setState({ phase: groups.length === 0 ? 'empty' : 'ready', dir: data?.dir ?? '', groups });
          })
          .catch(() => setState({ phase: 'error', dir: '', groups: [] }));
      }, [sessionId]);

      React.useEffect(() => {
        load();
      }, [load]);

      return [state, load];
    }

    const STATE_ROUTE = '/services/state/';
    const START_ROUTE = '/services/start/';
    const STOP_ROUTE = '/services/stop/';
    const CONFIG_ROUTE = '/services/config/';
    const PIN_ROUTE = '/services/pin/';
    const UI_ROUTE = '/services/ui/';
    const OUTPUT_ROUTE = '/services/output/';

    /** Stop one started service; failures are silent because the next poll shows state. */
    async function stopService(sessionId, id) {
      try {
        await postJson(STOP_ROUTE + encodeURIComponent(String(sessionId)), { id });
      } catch {
        /* the state poll reports what actually happened */
      }
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
     * The start-configuration editor. The script body is shown read-only and
     * carries a lock: it belongs to package.json, and this plugin only ever adds
     * parameters, environment and a working directory around it.
     */


      return { store, emit, setOpen, postJson, stopService, useStoreRevision, useScripts, useServices, STATE_ROUTE, START_ROUTE, STOP_ROUTE, CONFIG_ROUTE, PIN_ROUTE, UI_ROUTE, OUTPUT_ROUTE };
    }

    return { createStore };
  },
});