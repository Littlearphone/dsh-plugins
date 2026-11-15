/**
 * Sidebar notes — a right-sidebar tab type, its body, and the way in.
 *
 * Two registrations make the panel reachable, exactly the way a shipped type
 * does it:
 *
 * 1. `ctx.sidebarRightTabs.register()` declares the type itself: its `id` is the
 *    implementation identity, its `kind` is what an open names, and its `guide`
 *    entry is the capsule that opens it from the right Sidebar's guide page.
 * 2. `ctx.slots.register({ name: 'sidebar.right.pane.tab', key: <id> })` supplies
 *    the body the seat dispatches under that same `id`, and the matching
 *    `...tab.title` seat supplies the live chip text.
 *
 * Notes live on the Host (`index.js`), not in `localStorage`: the browser
 * arrays storage by origin, and this page's origin includes the listening port,
 * so a random-port run would start empty every time. The page calls the Host
 * route with a relative URL, which is what makes any port work. `localStorage`
 * stays as the fallback for a composition whose Host half has no route.
 *
 * Everything lives inside `ctx.effect` / `ctx.slots.inject`, so unloading the
 * plugin removes the type, the panel and the route together.
 */
window.__ModuleLoader__.load({
  id: '@local/sidebar-notes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** This implementation's identity: unique per registration, and the seat key. */
    const PACKAGE = '@local/sidebar-notes';
    /** The tab type an `openTab` names; namespaced so no shipped kind can collide. */
    const KIND = 'sidebar-notes';
    /** Client locale namespace owned by this plugin. */
    const NS = 'sidebarNotes';
    /** Host route registered by this bundle's Host half; relative on purpose. */
    const ENDPOINT = '/sidebar-notes/notes/';
    /** Last-resort store when the Host route is unavailable. */
    const STORAGE_PREFIX = 'dsh.sidebar-notes.v1.';

    /**
     * Restyle the shipped guide page into an icon grid.
     *
     * This is the cheap way to change the column's start page: it touches no
     * component, so cards, pinning, the More menu and shortcut hints all keep
     * working. It keys on the guide's semantic DOM markers
     * (`data-sidebar-right-guide`, `data-sidebar-right-guide-entry`) instead of
     * its hashed CSS-module class names, and it repeats the attribute to win the
     * specificity tie against the shipped class. Turn it off by setting this to
     * false: the page then renders exactly as the product draws it.
     */
    const GUIDE_GRID = true;

    const ZH = {
      'tab.title': '便签',
      'panel.hint.host': '存在本机 DSH 数据目录里，按会话分开，换端口或换浏览器都还在。',
      'panel.hint.local': '暂时只存在这个浏览器里；端口一变就找不到了。',
      'panel.label': '会话便签',
      'panel.placeholder': '记下要点、待办或结论，停笔即保存。',
      'panel.clear': '清空',
      'unit.chars': '字',
      'guide.title': '便签',
      'guide.description': '为当前会话随手记笔记。',
      'entry.label': '便签',
    };

    const EN = {
      'tab.title': 'Notes',
      'panel.hint.host': 'Kept in this machine’s DSH data directory, per session — it survives ports and browsers.',
      'panel.hint.local': 'Kept in this browser only; a different port loses it.',
      'panel.label': 'Session notes',
      'panel.placeholder': 'Jot down highlights, todos, or conclusions — typing is saved automatically.',
      'panel.clear': 'Clear',
      'unit.chars': 'chars',
      'guide.title': 'Notes',
      'guide.description': 'A scratchpad for the current session.',
      'entry.label': 'Notes',
    };

    const CSS = `
.dsh-notes-root{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;padding:16px 16px 14px;color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size,14px);}
.dsh-notes-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.dsh-notes-input{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:170px;margin:0;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:var(--dsh-content-font-size,14px);line-height:1.65;resize:none;}
.dsh-notes-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:1;}
.dsh-notes-input:disabled{opacity:.6;}
.dsh-notes-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.dsh-notes-count{font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);}
.dsh-notes-clear{appearance:none;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;padding:6px 10px;cursor:pointer;}
.dsh-notes-clear:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.dsh-notes-clear:disabled{opacity:.45;cursor:default;}
.dsh-notes-entry{appearance:none;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;padding:6px 8px;cursor:pointer;}
.dsh-notes-entry:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
`;

    const GUIDE_CSS = `
[data-sidebar-right-guide][data-sidebar-right-guide]{
--dsh-guide-tile:104px;
--dsh-guide-tile-gap:12px;
--dsh-guide-sheen:rgba(255,255,255,.30);
box-sizing:border-box;
display:grid;
width:100%;
min-width:0;
/* Fixed-size tracks, not a stretchy range: the track count is derived from the
   panel width, empty tracks collapse, and the remaining tiles centre as a group
   — so removing one card recentres the rest instead of leaving its slot empty. */
grid-template-columns:repeat(auto-fit,var(--dsh-guide-tile));
justify-content:center;
align-content:center;
gap:var(--dsh-guide-tile-gap);
min-height:100%;
padding:24px 20px;
}
[data-sidebar-right-guide][data-sidebar-right-guide]::after{content:none;}
[data-sidebar-right-guide] > span[aria-hidden="true"]{grid-column:1/-1;justify-self:center;margin:0 0 6px;}
body[data-ds-dark-theme] [data-sidebar-right-guide][data-sidebar-right-guide]{--dsh-guide-sheen:rgba(255,255,255,.12);}
/* One tile for every card. The shell sits on the grid item, so a provider's
   card (the terminal ships one) and the guide's own More card are framed
   exactly like ours — no square/wide mixture. */
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]){
box-sizing:border-box;
position:relative;
min-width:0;
min-height:0;
display:flex;
aspect-ratio:1/1;
border:.5px solid var(--dsw-alias-border-l1);
border-radius:18px;
background-color:var(--dsw-alias-bg-layer-1);
background-image:linear-gradient(135deg,transparent 18%,var(--dsh-guide-sheen) 44%,rgba(255,255,255,.05) 56%,transparent 74%);
box-shadow:inset 0 1px 0 var(--dsh-guide-sheen),0 1px 2px rgba(0,0,0,.05);
overflow:hidden;
transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease;
}
@media (hover:hover){
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]):hover{
transform:translateY(-2px);
border-color:var(--dsw-alias-brand-primary);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px rgba(76,111,231,.22),inset 0 1px 0 var(--dsh-guide-sheen);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent),inset 0 1px 0 var(--dsh-guide-sheen);
}
}
/* The card inside fills the tile and is laid out like the most complex one:
   icon on its own row, then a single-line title. The same rule is expressed
   for the card root at the tile's child level and for a keyed entry card at
   any depth, so a slot wrapper between them changes nothing. */
[data-sidebar-right-guide] > * > *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry]{
box-sizing:border-box;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:8px;
width:100%;
height:100%;
min-width:0;
min-height:0;
padding:10px 8px;
text-align:center;
border:0;
border-radius:inherit;
background:transparent;
box-shadow:none;
color:var(--dsw-alias-label-primary);
font:inherit;
}
[data-sidebar-right-guide] > * > * > span:first-of-type,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type{width:34px;height:34px;flex:none;color:var(--dsw-alias-label-secondary);}
[data-sidebar-right-guide] > * > * > span:first-of-type svg,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type svg{width:100%;height:100%;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2){display:flex;flex:0 0 auto;flex-direction:column;align-items:center;gap:2px;width:100%;min-width:0;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:first-child,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:first-child{min-width:0;max-width:100%;font-size:12px;line-height:1.35;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:not(:first-child),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:not(:first-child){display:none;}
/* The shortcut rides under the title as a quiet third line instead of being
   hidden: the tile has the room, and hiding it left the space looking reserved. */
[data-sidebar-right-guide] > * > * > span:nth-of-type(3),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3){
display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:2px;
width:100%;min-width:0;overflow:hidden;white-space:nowrap;
font-size:9px;line-height:1;color:var(--dsw-alias-label-secondary);
}
[data-sidebar-right-guide] > * > * > span:nth-of-type(3) *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3) *,
[data-sidebar-right-guide] kbd{
border:0;background:transparent;box-shadow:none;padding:0;margin:0;
min-width:0;font:inherit;font-size:9px;line-height:1;color:inherit;
}
`;

    /** Read the browser-local copy; storage may be unavailable, so absence is empty. */
    function readLocal(sessionId) {
      if (sessionId === undefined) return '';
      try {
        return window.localStorage.getItem(STORAGE_PREFIX + sessionId) || '';
      } catch (error) {
        return '';
      }
    }

    /** Write the browser-local copy, dropping the key when the note is empty. */
    function saveLocal(sessionId, text) {
      if (sessionId === undefined) return;
      try {
        if (text === '') window.localStorage.removeItem(STORAGE_PREFIX + sessionId);
        else window.localStorage.setItem(STORAGE_PREFIX + sessionId, text);
      } catch (error) {
        /* A read-only or full store keeps the note in memory for this tab. */
      }
    }

    /**
     * Ask the Host for one Session's note.
     * A missing route, an older bundle, or an offline Host falls back to the
     * browser-local copy instead of losing the panel.
     */
    async function loadText(sessionId) {
      try {
        const response = await window.fetch(ENDPOINT + encodeURIComponent(sessionId), {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error('status ' + response.status);
        const payload = await response.json();
        return { text: typeof payload?.text === 'string' ? payload.text : '', backend: 'host' };
      } catch (error) {
        return { text: readLocal(sessionId), backend: 'local' };
      }
    }

    /** Send one note to the Host; `keepalive` lets an unmount flush survive the navigation. */
    async function putNote(sessionId, text) {
      const response = await window.fetch(ENDPOINT + encodeURIComponent(sessionId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
        keepalive: true,
      });
      if (!response.ok) throw new Error('status ' + response.status);
    }

    /** Persist through the backend the panel is bound to, degrading to the local copy. */
    function persist(sessionId, text, backend) {
      if (sessionId === undefined) return;
      if (backend !== 'host') {
        saveLocal(sessionId, text);
        return;
      }
      putNote(sessionId, text).catch(() => saveLocal(sessionId, text));
    }

    return {
      // Hard dependencies: the slot seat, the tab-type registry, the right Sidebar
      // controller, and the dictionary registry.
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale'],

      apply(ctx) {
        const locale = ctx.get('locale');
        const registry = ctx.get('sidebarRightTabs');
        const controller = ctx.get('sidebarRight');
        const slots = ctx.get('slots');
        if (locale === undefined || registry === undefined || slots === undefined) {
          console.error('[sidebar-notes] the right Sidebar or locale service is unavailable');
          return;
        }

        // Dictionaries first: `bind` resolves every later call against them.
        ctx.effect(() => locale.register(NS, 'zh', ZH));
        ctx.effect(() => locale.register(NS, 'en', EN));
        const t = locale.bind(NS);

        /** Re-render a component when the active language changes. */
        function useLocaleRevision() {
          return React.useSyncExternalStore(
            (notify) => locale.subscribe(notify),
            () => locale.getSnapshot().revision,
            () => 0,
          );
        }

        /** The tab body: one note per Session, loaded from the Host and saved shortly after typing stops. */
        function NotesBody(props) {
          const sessionId = props.sessionId;
          useLocaleRevision();
          const [state, setState] = React.useState({
            sessionId,
            status: 'loading',
            text: '',
            backend: 'host',
          });
          const latest = React.useRef(state);
          latest.current = state;

          // Load on mount and whenever this seat switches Session.
          React.useEffect(() => {
            let cancelled = false;
            if (sessionId === undefined) {
              setState({ sessionId, status: 'ready', text: '', backend: 'local' });
              return undefined;
            }
            setState({ sessionId, status: 'loading', text: '', backend: 'host' });
            loadText(sessionId).then(({ text, backend }) => {
              if (cancelled) return;
              const local = readLocal(sessionId);
              if (backend === 'host' && text === '' && local !== '') {
                // First run after the Host store appeared: adopt what this browser had.
                setState({ sessionId, status: 'ready', text: local, backend: 'host' });
                putNote(sessionId, local).catch(() => undefined);
                return;
              }
              setState({ sessionId, status: 'ready', text, backend });
            });
            return () => {
              cancelled = true;
            };
          }, [sessionId]);

          // Debounced save; a session switch never writes the old text to the new key.
          React.useEffect(() => {
            if (state.status !== 'ready' || state.sessionId !== sessionId) return undefined;
            const timer = window.setTimeout(() => persist(sessionId, state.text, state.backend), 300);
            return () => window.clearTimeout(timer);
          }, [state, sessionId]);

          // Flush the last keystrokes when this body goes away.
          React.useEffect(
            () => () => {
              const last = latest.current;
              if (last.status === 'ready') persist(last.sessionId, last.text, last.backend);
            },
            [],
          );

          const ready = state.status === 'ready' && state.sessionId === sessionId;
          const text = ready ? state.text : '';
          const hint = ready && state.backend === 'local' ? t('panel.hint.local') : t('panel.hint.host');

          return h(
            'div',
            { className: 'dsh-notes-root' },
            h('style', { key: 'css' }, CSS),
            h('p', { className: 'dsh-notes-hint', key: 'hint' }, hint),
            h('textarea', {
              key: 'input',
              className: 'dsh-notes-input',
              'aria-label': t('panel.label'),
              placeholder: t('panel.placeholder'),
              spellCheck: false,
              disabled: !ready,
              value: text,
              onChange: (event) =>
                setState({ sessionId, status: 'ready', text: event.target.value, backend: 'host' }),
            }),
            h(
              'div',
              { className: 'dsh-notes-bar', key: 'bar' },
              h('span', { className: 'dsh-notes-count' }, text.length + ' ' + t('unit.chars')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-notes-clear',
                  disabled: text.length === 0,
                  onClick: () => setState({ sessionId, status: 'ready', text: '', backend: 'host' }),
                },
                t('panel.clear'),
              ),
            ),
          );
        }

        /** The chip text, kept live so a language change does not leave it stale. */
        function NotesTitle() {
          useLocaleRevision();
          return h('span', null, t('tab.title'));
        }

        /**
         * A frame-wide stylesheet holder. An installed bundle gets no
         * `styles.insert()` — that symbol belongs to evaluated dynamic packages —
         * so a mounted component with no visible output carries global CSS.
         */
        function GuideStyle() {
          if (!GUIDE_GRID) return null;
          return h('style', null, GUIDE_CSS);
        }

        const definition = {
          id: PACKAGE,
          kind: KIND,
          // A type from outside the product: the band that outranks shipped viewers.
          priority: 'extension',
          title: () => t('tab.title'),
        };

        ctx.effect(() => registry.register(definition), 'sidebar-notes: notes tab type');
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register({ name: 'sidebar.right.pane.tab', key: PACKAGE }, NotesBody),
        );
        slots.inject('sidebar.right.pane.tab.title', () =>
          slots.register({ name: 'sidebar.right.pane.tab.title', key: PACKAGE }, NotesTitle),
        );
        // The guide's restyle is a global sheet, so it rides a frame-wide seat
        // rather than a Session-scoped one.
        if (GUIDE_GRID) {
          slots.inject('shell.overlay', () =>
            slots.register(
              { name: 'shell.overlay', id: 'sidebar-notes-guide-style', order: 900 },
              GuideStyle,
            ),
          );
        }

        // Closing the panel when it is the only tab would collapse the whole
        // column. Stand the guide in its place instead, so the column survives.
        ctx.effect(() => {
          if (typeof controller?.registerCloseHandler !== 'function') return undefined;
          return controller.registerCloseHandler(KIND, (sessionId, tab) => {
            try {
              const tabs = controller.tabsIn?.(sessionId);
              if (tabs === undefined || tabs.length !== 1) return;
              if (controller.isExpanded?.() !== true) return;
              controller.openTabIn?.(sessionId, 'guide', {});
            } catch (error) {
              console.error('[sidebar-notes] cannot keep the column open', error);
            }
          });
        }, 'sidebar-notes: close to guide');
      },
    };
  },
});
