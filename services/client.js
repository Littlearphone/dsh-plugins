/**
 * Services — the workspace's start scripts, in two places:
 *
 *   1. a right-sidebar tab that lists them (the "Services" panel), and
 *   2. a Session-header dropdown for reaching one without leaving the chat.
 *
 * Discovery is the Host half's job (`GET /services/list/<sessionId>`); this half
 * only renders what it returns and hands a chosen command to the composer.
 * Executing scripts as Host-owned processes is deliberately not part of this
 * version: the harness already runs commands through the conversation, so the
 * dropdown sends the command there instead of maintaining a second lifecycle.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/services';
    const KIND = 'services';
    const NS = 'services';
    const ROUTE = '/services/list/';

    const ZH = {
      'tab.title': '服务',
      'entry.label': '启动脚本',
      'panel.loading': '正在读取脚本…',
      'panel.empty': '这个工作区没有 package.json，或者里面没有 scripts。',
      'panel.error': '读取脚本失败。',
      'panel.refresh': '刷新',
      'panel.dir': '目录',
      'panel.send': '发送到对话',
      'panel.note': '点击脚本名把命令发到对话里执行；执行本身仍由会话负责。',
      'menu.title': '启动脚本',
      'menu.empty': '没有可用的脚本。',
      'menu.hint': '点击一项，命令会填进输入框并发送。',
      'menu.open': '在侧栏打开',
    };

    const EN = {
      'tab.title': 'Services',
      'entry.label': 'Start scripts',
      'panel.loading': 'Reading scripts…',
      'panel.empty': 'This workspace has no package.json, or it declares no scripts.',
      'panel.error': 'Could not read the scripts.',
      'panel.refresh': 'Refresh',
      'panel.dir': 'Directory',
      'panel.send': 'Send to chat',
      'panel.note': 'Clicking a script sends its command to the conversation; execution stays with the Session.',
      'menu.title': 'Start scripts',
      'menu.empty': 'No scripts available.',
      'menu.hint': 'Clicking a script fills the composer and sends it.',
      'menu.open': 'Open in sidebar',
    };

    /**
     * Which tool will run a script, guessed from the command line. One entry per
     * tool, matched by the earliest occurrence so a wrapper prefix does not win
     * over the real runner ("npm run build" is npm, "vite build" is node).
     * Extending this list is the whole "add another runtime" story.
     */
    const RUNTIMES = [
      { id: 'npm', label: 'npm', tint: '#CB3837', pattern: /(^|[\s/\\])npm\b/ },
      { id: 'pnpm', label: 'pnpm', tint: '#F69220', pattern: /(^|[\s/\\])pnpm\b/ },
      { id: 'yarn', label: 'yarn', tint: '#2C8EBB', pattern: /(^|[\s/\\])yarn\b/ },
      {
        id: 'node',
        label: 'node',
        tint: '#5FA04E',
        pattern: /(^|[\s/\\])(node|tsx|ts-node|nodemon|vite|next|webpack|rollup|esbuild|jest|vitest|mocha)\b/,
      },
      { id: 'maven', label: 'mvn', tint: '#C71A36', pattern: /(^|[\s/\\])(mvn|mvnd)\b/ },
      { id: 'gradle', label: 'gradle', tint: '#0F8A6A', pattern: /(^|[\s/\\])(gradle|gradlew)\b/ },
      { id: 'java', label: 'java', tint: '#5382A1', pattern: /(^|[\s/\\])java\b/ },
      {
        id: 'python',
        label: 'py',
        tint: '#3776AB',
        pattern: /(^|[\s/\\])(python|python3|uv|poetry|pipenv|pytest|django-admin)\b/,
      },
      { id: 'docker', label: 'docker', tint: '#2496ED', pattern: /(^|[\s/\\])docker(-compose)?\b/ },
      { id: 'dotnet', label: '.net', tint: '#512BD4', pattern: /(^|[\s/\\])dotnet\b/ },
    ];

    /** Earliest-matching runtime for one command line, or undefined for the generic glyph. */
    function detectRuntime(command) {
      const text = String(command ?? '');
      let best;
      let bestIndex = Number.POSITIVE_INFINITY;
      for (const runtime of RUNTIMES) {
        const match = runtime.pattern.exec(text);
        if (match === null) continue;
        const index = match.index + match[1].length;
        if (index < bestIndex) {
          best = runtime;
          bestIndex = index;
        }
      }
      return best;
    }

    /** The badge that fronts one script row. */
    function RuntimeBadge(command, key) {
      const runtime = detectRuntime(command);
      if (runtime === undefined) {
        return h(
          'span',
          { key, className: 'dsh-svc-badge is-generic', title: 'run' },
          h(
            'svg',
            { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
            h('path', {
              d: 'M5.5 3.6 11.4 8l-5.9 4.4z',
              fill: 'currentColor',
              stroke: 'currentColor',
              strokeWidth: 1,
              strokeLinejoin: 'round',
            }),
          ),
        );
      }
      return h(
        'span',
        {
          key,
          className: 'dsh-svc-badge',
          style: { '--dsh-svc-tint': runtime.tint },
          title: runtime.label,
        },
        runtime.label,
      );
    }

    const CSS = `
.dsh-svc-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;height:100%;min-height:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
.dsh-svc-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;}
.dsh-svc-dir{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;}
.dsh-svc-refresh{flex:none;box-sizing:border-box;height:22px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}
.dsh-svc-refresh:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-note{flex:none;margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.dsh-svc-list{display:flex;flex:1 1 auto;flex-direction:column;gap:4px;min-height:0;padding:2px 12px 12px;overflow-y:auto;}
.dsh-svc-row{box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;background:var(--dsw-alias-bg-base);text-align:left;}
.dsh-svc-row-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-row.is-button{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
@media (hover:hover){
.dsh-svc-row.is-button:hover{transform:translateY(-1px);border-color:var(--dsw-alias-state-business-primary);box-shadow:0 6px 16px rgba(0,0,0,.10);}
}
.dsh-svc-name{font-size:12px;line-height:1.3;font-weight:500;}
.dsh-svc-command{font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);overflow-wrap:anywhere;}
.dsh-svc-empty{padding:14px 0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
/* The overlay layer is click-through by design, so the dropdown opts back into
   pointer events. */
/* Mirrors the shipped dropdown surface: it sits on bg-base (white in the light
   theme, not the grey bg-overlay), radius-lg, a half-pixel border-l2 and 4px of
   padding. The overlay layer is click-through by design, so the panel opts back
   into pointer events. */
.dsh-svc-menu{position:fixed;z-index:80;pointer-events:auto;box-sizing:border-box;width:300px;max-height:min(60vh,420px);display:flex;flex-direction:column;gap:2px;padding:4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-base);box-shadow:0 10px 28px rgba(0,0,0,.14);}
.dsh-svc-menu-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:4px 7px 2px;font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary);}
.dsh-svc-menu-list{display:flex;flex-direction:column;gap:1px;min-height:0;padding:2px 0;overflow-y:auto;}
.dsh-svc-item{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:4px 7px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}
.dsh-svc-item:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dsh-svc-item-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-item-name{font-size:12px;line-height:1.3;}
.dsh-svc-item-command{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-menu-foot{flex:none;padding-top:2px;border-top:1px solid var(--dsw-alias-border-l1);}
.dsh-svc-foot-button{box-sizing:border-box;width:100%;padding:5px 7px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;text-align:left;cursor:pointer;}
.dsh-svc-foot-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
/* Runtime badge: a monogram tile tinted by the tool that will run the script,
   so a list of bare command lines still says node / npm / mvn / java at a
   glance. Adding a tool is one entry in RUNTIMES. */
.dsh-svc-badge{box-sizing:border-box;display:flex;flex:none;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;font-size:9px;font-weight:600;line-height:1;letter-spacing:-.2px;text-transform:lowercase;background:color-mix(in srgb,var(--dsh-svc-tint,#8a8a8a) 16%,transparent);color:var(--dsh-svc-tint,#8a8a8a);}
.dsh-svc-badge.is-generic{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.dsh-svc-badge svg{width:12px;height:12px;display:block;}
.dsh-svc-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
.dsh-svc-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-svc-entry svg{width:15px;height:15px;display:block;}
`;

    /**
     * Cross-slot state. The dropdown lives in `shell.overlay` (the header clips
     * its overflow, so a popover cannot be a descendant of the entry), and an
     * overlay is root-scoped: it has neither `sessionId` nor `inputActions`.
     * The header entry hands both over here on every render.
     */
    const store = {
      open: false,
      sessionId: undefined,
      actions: undefined,
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
      const [state, setState] = React.useState({ phase: 'idle', dir: '', scripts: [] });

      const load = React.useCallback(() => {
        if (sessionId === undefined || sessionId === null) {
          setState({ phase: 'empty', dir: '', scripts: [] });
          return;
        }
        setState((current) => ({ ...current, phase: 'loading' }));
        fetch(ROUTE + encodeURIComponent(String(sessionId)))
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('http'))))
          .then((data) => {
            const scripts = Array.isArray(data?.scripts) ? data.scripts : [];
            setState({ phase: scripts.length === 0 ? 'empty' : 'ready', dir: data?.dir ?? '', scripts });
          })
          .catch(() => setState({ phase: 'error', dir: '', scripts: [] }));
      }, [sessionId]);

      React.useEffect(() => {
        load();
      }, [load]);

      return [state, load];
    }

    /** Hand a command to the composer: fill the draft, then send it. */
    function sendCommand(command) {
      const actions = store.actions;
      if (actions === undefined || actions === null) return false;
      try {
        if (typeof actions.setDraft === 'function') actions.setDraft(command);
        if (typeof actions.submit === 'function') actions.submit();
        return true;
      } catch (error) {
        console.error('[services] cannot hand the command to the composer', error);
        return false;
      }
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale', 'layout'],

      apply(ctx) {
        const locale = ctx.get('locale');
        const registry = ctx.get('sidebarRightTabs');
        const slots = ctx.get('slots');
        const controller = ctx.get('sidebarRight');
        if (locale === undefined || registry === undefined || slots === undefined) {
          console.error('[services] the right Sidebar or locale service is unavailable');
          return;
        }

        ctx.effect(() => locale.register(NS, 'zh', ZH));
        ctx.effect(() => locale.register(NS, 'en', EN));
        const t = locale.bind(NS);

        function useLocaleRevision() {
          return React.useSyncExternalStore(
            (notify) => locale.subscribe(notify),
            () => locale.getSnapshot().revision,
            () => 0,
          );
        }

        function row(script, key, interactive) {
          const common = {
            key,
            className: 'dsh-svc-row' + (interactive ? ' is-button' : ''),
            title: script.command,
          };
          const body = [
            RuntimeBadge(script.command, 'badge'),
            h(
              'span',
              { className: 'dsh-svc-row-text', key: 'text' },
              h('span', { className: 'dsh-svc-name', key: 'name' }, script.name),
              h('span', { className: 'dsh-svc-command', key: 'command' }, script.command),
            ),
          ];
          return interactive
            ? h('button', { ...common, type: 'button', onClick: () => sendCommand(script.command) }, body)
            : h('div', common, body);
        }

        /** Right-sidebar tab: the list, with its directory and a refresh control. */
        function PanelBody(props) {
          useLocaleRevision();
          const sessionId = props?.sessionId ?? store.sessionId;
          const [state, load] = useScripts(sessionId);

          const content =
            state.phase === 'loading'
              ? h('p', { className: 'dsh-svc-empty', key: 'loading' }, t('panel.loading'))
              : state.phase === 'error'
                ? h('p', { className: 'dsh-svc-empty', key: 'error' }, t('panel.error'))
                : state.phase === 'empty'
                  ? h('p', { className: 'dsh-svc-empty', key: 'empty' }, t('panel.empty'))
                  : state.scripts.map((script, index) => row(script, 'row-' + index, true));

          return h(
            'div',
            { className: 'dsh-svc-panel' },
            h('style', { key: 'css' }, CSS),
            h(
              'div',
              { className: 'dsh-svc-head', key: 'head' },
              h(
                'span',
                { className: 'dsh-svc-dir', title: state.dir },
                (state.dir === '' ? '' : '…') + state.dir,
              ),
              h(
                'button',
                {
                  className: 'dsh-svc-refresh',
                  key: 'refresh',
                  type: 'button',
                  onClick: load,
                },
                t('panel.refresh'),
              ),
            ),
            h('p', { className: 'dsh-svc-note', key: 'note' }, t('panel.note')),
            h('div', { className: 'dsh-svc-list', key: 'list' }, content),
          );
        }

        function PanelTitle() {
          useLocaleRevision();
          return h('span', null, t('tab.title'));
        }

        /**
         * Header entry: toggles the dropdown. It also publishes the Session and
         * the composer actions the overlay needs, because the overlay itself is
         * root-scoped and receives neither.
         */
        function HeaderEntry(props) {
          useLocaleRevision();
          store.sessionId = props?.sessionId;
          store.actions = props?.inputActions;
          const ref = React.useRef(null);

          // Size from the control physically next to us in the same row.
          React.useEffect(() => {
            const button = ref.current;
            if (button === null) return;
            const wrapper = button.parentElement;
            const rowElement = wrapper?.parentElement;
            if (wrapper === null || rowElement === null) return;
            const siblings = Array.from(rowElement.children);
            const index = siblings.indexOf(wrapper);
            if (index === -1) return;
            const neighbour = siblings[index + 1] ?? siblings[index - 1];
            if (neighbour === undefined) return;
            const box = neighbour.getBoundingClientRect();
            if (box.height <= 0) return;
            const size = Math.round(box.height) + 'px';
            button.style.height = size;
            button.style.width = size;
          });

          React.useEffect(() => {
            if (store.open === false) return undefined;
            const onKey = (event) => {
              if (event.key === 'Escape') setOpen(false);
            };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [store.open]);

          const label = t('entry.label');
          return h(
            React.Fragment,
            null,
            h('style', { key: 'css' }, CSS),
            h(
              'button',
              {
                key: 'button',
                id: 'dsh-services-entry',
                type: 'button',
                ref,
                className: 'dsh-svc-entry',
                title: label,
                'aria-label': label,
                'aria-expanded': store.open ? 'true' : 'false',
                onClick: (event) => {
                  event.stopPropagation();
                  setOpen(!store.open);
                },
              },
              h(
                'svg',
                { viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': true, fill: 'none' },
                h('path', {
                  d: 'M5.5 3.6 11.4 8l-5.9 4.4z',
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                  strokeLinejoin: 'round',
                  fill: 'currentColor',
                }),
              ),
            ),
          );
        }

        /** The dropdown, mounted on the frame overlay and anchored to the entry. */
        function MenuOverlay() {
          useLocaleRevision();
          useStoreRevision();
          const [anchor, setAnchor] = React.useState(null);
          const [state, load] = useScripts(store.open ? store.sessionId : undefined);

          React.useEffect(() => {
            if (store.open === false) {
              setAnchor(null);
              return undefined;
            }
            const measure = () => {
              const button = document.getElementById('dsh-services-entry');
              if (button === null) return;
              const box = button.getBoundingClientRect();
              setAnchor({ right: window.innerWidth - box.right, top: box.bottom + 6 });
            };
            measure();
            window.addEventListener('resize', measure);
            window.addEventListener('scroll', measure, true);
            return () => {
              window.removeEventListener('resize', measure);
              window.removeEventListener('scroll', measure, true);
            };
          }, [store.open]);

          React.useEffect(() => {
            if (store.open === false) return undefined;
            const onDown = (event) => {
              const target = event.target;
              if (target instanceof Element) {
                if (target.closest('.dsh-svc-menu') !== null) return;
                if (target.closest('#dsh-services-entry') !== null) return;
              }
              setOpen(false);
            };
            document.addEventListener('mousedown', onDown, true);
            return () => document.removeEventListener('mousedown', onDown, true);
          }, [store.open]);

          if (store.open === false || anchor === null) return null;

          const items =
            state.phase === 'ready'
              ? state.scripts.map((script, index) =>
                  h(
                    'button',
                    {
                      key: 'item-' + index,
                      type: 'button',
                      className: 'dsh-svc-item',
                      title: script.command,
                      onClick: () => {
                        sendCommand(script.command);
                        setOpen(false);
                      },
                    },
                    RuntimeBadge(script.command, 'badge'),
                    h(
                      'span',
                      { className: 'dsh-svc-item-text', key: 'text' },
                      h('span', { className: 'dsh-svc-item-name' }, script.name),
                      h('span', { className: 'dsh-svc-item-command' }, script.command),
                    ),
                  ),
                )
              : [
                  h(
                    'div',
                    { key: 'state', className: 'dsh-svc-empty' },
                    state.phase === 'loading' ? t('panel.loading') : t('menu.empty'),
                  ),
                ];

          return h(
            'div',
            {
              className: 'dsh-svc-menu',
              style: { right: anchor.right + 'px', top: anchor.top + 'px' },
              role: 'menu',
            },
            h(
              'div',
              { className: 'dsh-svc-menu-head' },
              h('span', null, t('menu.title')),
              h(
                'button',
                { type: 'button', className: 'dsh-svc-refresh', onClick: load },
                t('panel.refresh'),
              ),
            ),
            h('div', { className: 'dsh-svc-menu-list' }, items),
            h(
              'div',
              { className: 'dsh-svc-menu-foot' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-svc-foot-button',
                  onClick: () => {
                    try {
                      controller?.openTab(KIND);
                    } catch (error) {
                      console.error('[services] cannot open the panel', error);
                    }
                    setOpen(false);
                  },
                },
                t('menu.open'),
              ),
            ),
          );
        }

        ctx.effect(
          () =>
            registry.register({
              id: PACKAGE,
              kind: KIND,
              priority: 'extension',
              title: () => t('tab.title'),
            }),
          'services: panel tab type',
        );
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register({ name: 'sidebar.right.pane.tab', key: PACKAGE }, PanelBody),
        );
        slots.inject('sidebar.right.pane.tab.title', () =>
          slots.register({ name: 'sidebar.right.pane.tab.title', key: PACKAGE }, PanelTitle),
        );
        slots.inject('conversation.session.header.utilities', () =>
          slots.register(
            { name: 'conversation.session.header.utilities', id: 'services', order: -2 },
            HeaderEntry,
          ),
        );
        slots.inject('shell.overlay', () =>
          slots.register({ name: 'shell.overlay', id: 'services-menu', order: 860 }, MenuOverlay),
        );
      },
    };
  },
});
