/**
 * Services — the Session-header dropdown.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.menu.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createMenu(d) {
      const { t, useLocaleRevision, CSS, store, setOpen, useServices, useStoreRevision, useScripts, filterGroups, KIND, menuItems, stopService, restartService, useArmedAction, useCollapsedGroups, openPanel } = d;

        /**
         * Header entry: toggles the dropdown. It also publishes the Session and
         * the composer actions the overlay needs, because the overlay itself is
         * root-scoped and receives neither.
         */
        function HeaderEntry(props) {
          useLocaleRevision();
          const services = useServices(props?.sessionId);
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

          const running = services.filter((service) => service.state === 'running');
          const label =
            running.length === 0
              ? t('entry.label')
              : t('entry.label') + ' · ' + String(running.length) + ' ' + t('entry.running');
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
                className: 'dsh-svc-entry' + (running.length === 0 ? '' : ' is-running'),
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
                running.length === 0
                  ? h('path', {
                      d: 'M5.5 3.6 11.4 8l-5.9 4.4z',
                      stroke: 'currentColor',
                      strokeWidth: 1.2,
                      strokeLinejoin: 'round',
                      fill: 'currentColor',
                    })
                  : h('rect', { x: 4.2, y: 4.2, width: 7.6, height: 7.6, rx: 1.6, fill: 'currentColor' }),
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
          const [collapsed, toggleGroup] = useCollapsedGroups();
          const services = useServices(store.open ? store.sessionId : undefined);
          const [armed, arm, disarm] = useArmedAction();

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

          // The filter is per opening: one click away, empty again next time.
          const [query, setQuery] = React.useState('');
          const searchRef = React.useRef(null);

          React.useEffect(() => {
            if (store.open === false) return;
            setQuery('');
          }, [store.open]);

          React.useEffect(() => {
            if (store.open === false || anchor === null) return;
            const input = searchRef.current;
            if (input !== null) input.focus();
          }, [store.open, anchor]);

          if (store.open === false || anchor === null) return null;

          const visible = filterGroups(state.groups, query);
          const runningByCommand = new Map();
          for (const running of services) {
            if (running.state === 'running') runningByCommand.set(String(running.source ?? running.command), running.id);
          }
          const items =
            state.phase === 'ready'
              ? visible.length > 0
                ? menuItems(
                    visible,
                    collapsed,
                    toggleGroup,
                    runningByCommand,
                    (id) => void stopService(store.sessionId, id),
                    (id) => {
                      // The next state poll is the report; a failed restart
                      // leaves the old run in place, which the row already shows.
                      void restartService(store.sessionId, id).catch(() => {});
                    },
                    armed,
                    arm,
                    disarm,
                  )
                : [h('div', { key: 'nomatch', className: 'dsh-svc-empty' }, t('menu.noMatch'))]
              : [
                  h(
                    'div',
                    { key: 'state', className: 'dsh-svc-empty' },
                    state.phase === 'loading' ? h('span', { className: 'dsh-svc-spinner' }) : null,
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
            h(
              'label',
              { className: 'dsh-svc-search', key: 'search' },
              h('input', {
                ref: searchRef,
                type: 'search',
                value: query,
                placeholder: t('menu.search'),
                'aria-label': t('menu.search'),
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setOpen(false);
                  }
                },
              }),
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
                      openPanel();
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


      return { HeaderEntry, MenuOverlay };
    }

    return { createMenu };
  },
});