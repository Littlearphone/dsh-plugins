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
     * `glyph` names a pictogram in GLYPHS; extending this list is the whole
     * "add another runtime" story.
     */
    const RUNTIMES = [
      { id: 'npm', label: 'npm', tint: '#CB3837', glyph: 'box', pattern: /(^|[\s/\\])npm\b/ },
      { id: 'pnpm', label: 'pnpm', tint: '#F69220', glyph: 'box', pattern: /(^|[\s/\\])pnpm\b/ },
      { id: 'yarn', label: 'yarn', tint: '#2C8EBB', glyph: 'box', pattern: /(^|[\s/\\])yarn\b/ },
      {
        id: 'node',
        label: 'node',
        tint: '#5FA04E',
        glyph: 'hexagon',
        pattern: /(^|[\s/\\])(node|tsx|ts-node|nodemon|vite|next|webpack|rollup|esbuild|jest|vitest|mocha)\b/,
      },
      { id: 'maven', label: 'mvn', tint: '#C71A36', glyph: 'gear', pattern: /(^|[\s/\\])(mvn|mvnd)\b/ },
      {
        id: 'gradle',
        label: 'gradle',
        tint: '#0F8A6A',
        glyph: 'layers',
        pattern: /(^|[\s/\\])(gradle|gradlew)\b/,
      },
      { id: 'java', label: 'java', tint: '#5382A1', glyph: 'cup', pattern: /(^|[\s/\\])java\b/ },
      {
        id: 'python',
        label: 'py',
        tint: '#3776AB',
        glyph: 'snake',
        pattern: /(^|[\s/\\])(python|python3|uv|poetry|pipenv|pytest|django-admin)\b/,
      },
      {
        id: 'docker',
        label: 'docker',
        tint: '#2496ED',
        glyph: 'whale',
        pattern: /(^|[\s/\\])docker(-compose)?\b/,
      },
      { id: 'dotnet', label: '.net', tint: '#512BD4', glyph: 'dot', pattern: /(^|[\s/\\])dotnet\b/ },
    ];

    /**
     * Pictograms on a 16px grid, drawn with currentColor so the runtime tint
     * carries the only colour. Each is a shape a person can name without a
     * caption: a hexagonal node, a package crate, a gear, stacked layers, a
     * coffee cup, a snake, a whale and a dot.
     */
    const GLYPHS = {
      hexagon: () => [
        h('path', {
          key: 'body',
          d: 'M8 1.9 13.2 4.9v6.2L8 14.1 2.8 11.1V4.9z',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
        }),
        h('path', { key: 'core', d: 'M8 5.6v4.8', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
      ],
      box: () => [
        h('path', {
          key: 'front',
          d: 'M4.2 6h7.6v6.9H4.2z',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'lid',
          d: 'M4.2 6 6.1 3.4h4.4L12.4 6',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', { key: 'seam', d: 'M6.6 3.6v2.2M9.8 3.6v2.2', stroke: 'currentColor', strokeWidth: 1.1 }),
      ],
      gear: () => [
        h('circle', { key: 'hub', cx: 8, cy: 8, r: 2.3, stroke: 'currentColor', strokeWidth: 1.25 }),
        h('path', {
          key: 'teeth',
          d: 'M8 1.9v1.8M8 12.3v1.8M2.5 8h1.8M11.7 8h1.8M4.1 4.1l1.3 1.3M10.6 10.6l1.3 1.3M11.9 4.1l-1.3 1.3M5.4 10.6l-1.3 1.3',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
      ],
      layers: () => [
        h('path', {
          key: 'top',
          d: 'M8 2.4 13 5.2 8 8 3 5.2z',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'mid',
          d: 'M3 8 8 10.8 13 8',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'bottom',
          d: 'M3 10.8 8 13.6 13 10.8',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
      ],
      cup: () => [
        h('path', {
          key: 'body',
          d: 'M3.5 7h7.1v3.1a3.4 3.4 0 0 1-3.4 3.4h-.3a3.4 3.4 0 0 1-3.4-3.4z',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'handle',
          d: 'M10.6 7.9h1.5a1.6 1.6 0 0 1 0 3.2h-1.5',
          stroke: 'currentColor',
          strokeWidth: 1.25,
        }),
        h('path', {
          key: 'steam',
          d: 'M5.5 3.1c0 .9.9.9.9 1.8M8.1 3.1c0 .9.9.9.9 1.8',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          strokeLinecap: 'round',
        }),
      ],
      snake: () => [
        h('path', {
          key: 'upper',
          d: 'M8.2 2.4a2.4 2.4 0 0 1 2.4 2.4v2.6H6.2a2.2 2.2 0 0 0-2.2 2.2v.6',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinecap: 'round',
        }),
        h('path', {
          key: 'lower',
          d: 'M7.8 13.6a2.4 2.4 0 0 1-2.4-2.4V8.6h4.4a2.2 2.2 0 0 0 2.2-2.2v-.6',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinecap: 'round',
        }),
      ],
      whale: () => [
        h('path', {
          key: 'body',
          d: 'M2.4 8.4h9.8c.3 2.6-1.7 4.6-4.6 4.6H6.1C4 13 2.5 11.3 2.4 8.4z',
          stroke: 'currentColor',
          strokeWidth: 1.25,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'tail',
          d: 'M12.2 8.4c.9-.9 2.2-.7 2.5-.2-.6.7-1.6 1-2.5.6',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'crates',
          d: 'M4.4 6.5h1.9V4.6H4.4zM6.7 6.5h1.9V4.6H6.7zM9 6.5h1.9V4.6H9z',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          strokeLinejoin: 'round',
        }),
      ],
      dot: () => [
        h('rect', {
          key: 'frame',
          x: 2.6,
          y: 2.6,
          width: 10.8,
          height: 10.8,
          rx: 3,
          stroke: 'currentColor',
          strokeWidth: 1.25,
        }),
        h('circle', { key: 'core', cx: 8, cy: 8, r: 2, fill: 'currentColor' }),
      ],
      play: () => [
        h('path', {
          key: 'glyph',
          d: 'M5.6 3.7 11.5 8l-5.9 4.3z',
          fill: 'currentColor',
          stroke: 'currentColor',
          strokeWidth: 1,
          strokeLinejoin: 'round',
        }),
      ],
    };

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

    /** The badge that fronts one script row: the runtime's glyph, tinted by the tool. */
    function RuntimeBadge(command, key) {
      const runtime = detectRuntime(command);
      const tint = runtime?.tint ?? 'var(--dsw-alias-label-secondary)';
      const glyph = GLYPHS[runtime?.glyph ?? 'play'] ?? GLYPHS.play;
      return h(
        'span',
        {
          key,
          className: 'dsh-svc-badge' + (runtime === undefined ? ' is-generic' : ''),
          style: { '--dsh-svc-tint': tint },
          title: runtime?.label ?? 'run',
        },
        h('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, glyph()),
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
/* Runtime badge: the tool's own pictogram, tinted by that tool's colour, so a
   list of bare command lines still says node / npm / mvn / java at a glance.
   Adding a tool is one entry in RUNTIMES plus a glyph in GLYPHS. */
.dsh-svc-badge{box-sizing:border-box;display:flex;flex:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,var(--dsh-svc-tint,#8a8a8a) 15%,transparent);color:var(--dsh-svc-tint,#8a8a8a);}
.dsh-svc-badge.is-generic{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.dsh-svc-badge svg{width:14px;height:14px;display:block;}
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
