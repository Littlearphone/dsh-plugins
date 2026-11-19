/**
 * Services — the right-sidebar panel.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.panel.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createPanel(d) {
      const { BUILD, t, useLocaleRevision, CSS, store, useServices, useStoreRevision, useScripts, UI_ROUTE, RuntimeBadge, sortScripts, ConfigEditor, OutputView, BRAND_ICONS, launch, togglePin, postJson, stopService, groupHeading, useArmedStop, useCollapsedGroups } = d;

        /** Right-sidebar tab: the list, with its directory and a refresh control. */
        /**
         * The panel lists scripts and, under each one, the service that script
         * started: its state, a stop control while it runs, and its output
         * inline. A service belongs to its script, so it is not a separate block.
         */
        function PanelBody(props) {
          useLocaleRevision();
          useStoreRevision();
          const sessionId = props?.sessionId ?? store.sessionId;
          const [state, load] = useScripts(sessionId);
          const [collapsed, toggleGroup] = useCollapsedGroups(sessionId, state.collapsed);
          const services = useServices(sessionId);
          const [query, setQuery] = React.useState('');
          // rowKey -> 'starting' | 'stopping', cleared when the service reaches the
          // expected state, so the button shows the work it is doing.
          const [pending, setPending] = React.useState({});
          // A pin flips locally first: refetching the list just to paint a pin made
          // the whole tab re-render, which is far too much for one boolean.
          const [pinOverride, setPinOverride] = React.useState({});
          const [openKey, setOpenKey] = React.useState('');
          const [editKey, setEditKey] = React.useState('');
          const [armedStop, armStop, disarmStop] = useArmedStop();
          // An arm belongs to one running service; once it is gone there is
          // nothing left to confirm, so drop it (no timer involved).
          React.useEffect(() => {
            if (armedStop === '') return;
            const live = services.some(
              (service) => service.id === armedStop && service.state === 'running',
            );
            if (!live) disarmStop();
          }, [services, armedStop, disarmStop]);

          // Latest service per (command, dir): one script row shows its own run.
          const latest = new Map();
          for (const service of services) {
            const key = String(service.source ?? service.command) + '\u0000' + String(service.dir ?? '');
            const previous = latest.get(key);
            if (previous === undefined || previous.startedAt <= service.startedAt) latest.set(key, service);
          }

          // Clear a pending button once the run settles into the state it asked
          // for, so a spinner never sticks when the service is already there.
          React.useEffect(() => {
            const entries = Object.entries(pending);
            if (entries.length === 0) return;
            const next = {};
            let changed = false;
            for (const [serviceKey, phase] of entries) {
              const service = latest.get(serviceKey);
              const settled =
                phase === 'starting'
                  ? service !== undefined && service.state !== 'starting' && service.state !== 'stopped'
                  : service === undefined || service.state !== 'running';
              if (settled) changed = true;
              else next[serviceKey] = phase;
            }
            if (changed) setPending(next);
          }, [services]);

          const statusChip = (service) => {
            if (service === undefined) return null;
            if (service.state === 'running') {
              return h('span', { className: 'dsh-svc-chip is-running' }, t('run.running'));
            }
            if (service.state === 'stopping') {
              return h('span', { className: 'dsh-svc-chip' }, t('run.stopping'));
            }
            return h(
              'span',
              { className: 'dsh-svc-chip is-done' },
              t('run.exited') + ' ' + String(service.exitCode ?? '?'),
            );
          };

          const rowFor = (group, script, index, showPath, instance) => {
            const key = String(script.command) + '\u0000' + String(group.dir ?? '');
            // Two rows can show the same script (pinned area plus its group); the
            // drawer key carries the row instance so only the clicked one opens.
            const rowKey = String(instance ?? 'group') + '|' + key;
            const service = latest.get(key);
            const open = openKey === rowKey;
            const pinKey = String(group.dir ?? '') + '\u0000' + String(script.original ?? script.name);
            const pinned = pinOverride[pinKey] === undefined ? script.pinned === true : pinOverride[pinKey];
            const phase = pending[key] ?? '';
            const running = service?.state === 'running';
            const actions = [];
            if (!running) {
              actions.push(
                h(
                  'button',
                  {
                    key: 'start',
                    type: 'button',
                    className: 'dsh-svc-icon',
                    title: phase === 'starting' ? t('run.starting') : t('run.start'),
                    'aria-label': t('run.start'),
                    disabled: phase === 'starting',
                    onClick: () => {
                      setPending((current) => ({ ...current, [key]: 'starting' }));
                      void launch(script, group.dir, group.kind);
                    },
                  },
                  phase === 'starting'
                    ? h('span', { className: 'dsh-svc-spinner is-small' })
                    : h(
                        'svg',
                        { viewBox: '0 0 16 16', 'aria-hidden': true },
                        h('path', { d: 'M5.5 3.5 12 8l-6.5 4.5z', fill: 'currentColor' }),
                      ),
                ),
              );
            } else {
              actions.push(
                h(
                  'button',
                  {
                    key: 'stop',
                    type: 'button',
                    className:
                      'dsh-svc-stop' +
                      (armedStop === service.id ? ' is-armed' : '') +
                      (phase === 'stopping' ? ' is-busy' : ''),
                    disabled: phase === 'stopping',
                    title: armedStop === service.id ? t('run.confirmStop') : t('run.stop'),
                    'aria-label': armedStop === service.id ? t('run.confirmStop') : t('run.stop'),
                    onClick: () => {
                      if (armedStop === service.id) {
                        disarmStop();
                        setPending((current) => ({ ...current, [key]: 'stopping' }));
                        void stopService(sessionId, service.id);
                        return;
                      }
                      armStop(service.id);
                    },
                  },
                  phase === 'stopping'
                    ? h('span', { className: 'dsh-svc-spinner is-small' })
                    : armedStop === service.id
                      ? h('span', { className: 'dsh-svc-stop-label' }, t('run.confirmStop'))
                      : h(
                        'svg',
                        { viewBox: '0 0 16 16', 'aria-hidden': true },
                        h('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.5, fill: 'currentColor' }),
                      ),
                ),
              );
            }
            if (service !== undefined) {
              actions.push(
                h(
                  'button',
                  {
                    key: 'output',
                    type: 'button',
                    className: 'dsh-svc-icon',
                    title: open ? t('run.hide') : t('run.output'),
                    'aria-label': open ? t('run.hide') : t('run.output'),
                    onClick: () => setOpenKey(open ? '' : rowKey),
                  },
                  h(
                    'svg',
                    { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                    h('path', {
                      d: open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4',
                      stroke: 'currentColor',
                      strokeWidth: 1.4,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }),
                  ),
                ),
              );
            }
            return h(
              'div',
              { key: 'entry-' + index, className: 'dsh-svc-entry-block' },
              h(
                'div',
                {
                  className: 'dsh-svc-row' + (running ? ' is-running' : ''),
                  title: script.command,
                },
                RuntimeBadge(script.command, 'badge'),
                h(
                  'span',
                  { className: 'dsh-svc-row-text', key: 'text' },
                  h(
                    'span',
                    { className: 'dsh-svc-name-line', key: 'name-line' },
                    h('span', { className: 'dsh-svc-name', key: 'name' }, script.name),
                    statusChip(service),
                    script.overridden === true
                      ? h(
                          'span',
                          { className: 'dsh-svc-chip is-overridden', key: 'ov' },
                          script.variantLabel === '' || script.variantLabel === undefined
                            ? t('run.overridden')
                            : script.variantLabel,
                        )
                      : null,
                  ),
                  h('span', { className: 'dsh-svc-command', key: 'command' }, script.command),
                  showPath === true
                    ? h('span', { className: 'dsh-svc-lastline', key: 'path' }, group.name)
                    : null,
                  service === undefined || service.lastLine === ''
                    ? null
                    : h('span', { className: 'dsh-svc-lastline', key: 'last' }, service.lastLine),
                ),
                h(
                  'span',
                  { className: 'dsh-svc-actions', key: 'actions' },
                  Array.isArray(script.variants) && script.variants.length > 0
                    ? h(
                        'select',
                        {
                          key: 'variant',
                          className: 'dsh-svc-variant',
                          title: t('run.variant'),
                          value: script.configId ?? '',
                          onChange: (event) => {
                            const value = event.target.value;
                            void postJson(UI_ROUTE + encodeURIComponent(String(sessionId)), {
                              dir: group.dir ?? '',
                              script: script.original ?? script.name,
                              configId: value,
                            })
                              .then(() => load())
                              .catch(() => {});
                          },
                        },
                        script.variants.map((variant) =>
                          h(
                            'option',
                            { key: variant.id, value: variant.id },
                            variant.label === '' ? variant.id : variant.label,
                          ),
                        ),
                      )
                    : null,
                  h(
                    'button',
                    {
                      key: 'pin',
                      type: 'button',
                      className: 'dsh-svc-icon' + (pinned ? ' is-pinned' : ''),
                      title: pinned ? t('pin.remove') : t('pin.add'),
                      'aria-label': pinned ? t('pin.remove') : t('pin.add'),
                      onClick: () => {
                        const next = !pinned;
                        setPinOverride((current) => ({ ...current, [pinKey]: next }));
                        void togglePin(
                          sessionId,
                          group.dir,
                          script.original ?? script.name,
                          next,
                        ).catch(() =>
                          setPinOverride((current) => ({ ...current, [pinKey]: !next })),
                        );
                      },
                    },
                    h(
                      'svg',
                      { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                      h('path', {
                        d: 'M6 2.5h4l-.6 3.2 2.1 2.1H4.5l2.1-2.1z',
                        fill: pinned ? 'currentColor' : 'none',
                        stroke: 'currentColor',
                        strokeWidth: 1.2,
                        strokeLinejoin: 'round',
                      }),
                      h('path', { d: 'M8 8v5.5', stroke: 'currentColor', strokeWidth: 1.2 }),
                    ),
                  ),
                  h(
                    'button',
                    {
                      key: 'edit',
                      type: 'button',
                      className: 'dsh-svc-icon',
                      title: t('run.edit'),
                      'aria-label': t('run.edit'),
                      onClick: () => setEditKey(editKey === rowKey ? '' : rowKey),
                    },
                    h(
                      'svg',
                      { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                      h('path', {
                        d: 'M10.8 2.9 13.1 5.2 6 12.3 3 13l.7-3z',
                        stroke: 'currentColor',
                        strokeWidth: 1.3,
                        strokeLinejoin: 'round',
                      }),
                    ),
                  ),
                  actions,
                ),
              open && service !== undefined
                ? h(OutputView, {
                    key: 'output-view',
                    sessionId,
                    id: service.id,
                    name: script.name,
                    labels: {
                      title: t('run.output'),
                      state:
                        service.state === 'running'
                          ? t('run.running')
                          : t('run.exited') + ' ' + String(service.exitCode ?? '?'),
                      waiting: t('output.waiting'),
                      reading: t('output.reading'),
                      hide: t('run.hide'),
                      truncated: t('output.truncated'),
                      wrap: t('output.wrap'),
                      noWrap: t('output.noWrap'),
                    },
                    onClose: () => setOpenKey(''),
                  })
                : null,
              ),
              editKey === rowKey
                ? h(ConfigEditor, {
                    key: 'editor',
                    sessionId,
                    script,
                    dir: group.dir ?? '',
                    labels: {
                      title: t('edit.title'),
                      name: t('edit.name'),
                      args: t('edit.args'),
                      argsHint: t('edit.argsHint'),
                      env: t('edit.env'),
                      cwd: t('edit.cwd'),
                      cwdHint: t('edit.cwdHint'),
                      locked: t('edit.locked'),
                      save: t('edit.save'),
                      reset: t('edit.reset'),
                      close: t('edit.close'),
                      badEnv: t('edit.badEnv'),
                    },
                    onSaved: () => {
                      setEditKey('');
                      load();
                    },
                    onCancel: () => setEditKey(''),
                  })
                : null,
            );
          };

          const sections = [];
          if (state.phase === 'loading') {
            sections.push(
              h(
                'div',
                { className: 'dsh-svc-empty', key: 'loading' },
                h('span', { className: 'dsh-svc-spinner' }),
                t('panel.loading'),
              ),
            );
          } else if (state.phase === 'error') {
            sections.push(h('div', { className: 'dsh-svc-empty', key: 'error' }, t('panel.error')));
          } else if (state.phase === 'empty') {
            sections.push(h('div', { className: 'dsh-svc-empty', key: 'empty' }, t('panel.empty')));
          } else {
            // Pinned rows leave their group and form one flat area on top, so a
            // shortcut is never buried inside a collapsed group. Order inside it
            // is by last start (the only place recency is allowed to reorder);
            // groups keep a fixed order, which is what makes them findable.
            const pinned = [];
            for (const group of state.groups) {
              for (const script of group.scripts) {
                if (script.pinned === true) pinned.push({ group, script });
              }
            }
            pinned.sort(
              (left, right) =>
                Number(right.script.lastStartedAt ?? 0) - Number(left.script.lastStartedAt ?? 0) ||
                String(left.script.name).localeCompare(String(right.script.name)),
            );
            if (pinned.length > 0) {
              sections.push(
                h(
                  'div',
                  { className: 'dsh-svc-pinned-head', key: 'pinned-head' },
                  h('span', { className: 'dsh-svc-pinned-title' }, t('pin.title')),
                  h('span', { className: 'dsh-svc-group-count' }, String(pinned.length)),
                ),
              );
              pinned.forEach((entry, index) => {
                sections.push(rowFor(entry.group, entry.script, 'pin-' + index, true, 'pin'));
              });
            }
            const needle = query.trim().toLowerCase();
            const matches = (script) =>
              needle === '' ||
              String(script.name).toLowerCase().includes(needle) ||
              String(script.command).toLowerCase().includes(needle);
            state.groups.forEach((group, groupIndex) => {
              // Pinned scripts stay in their group: the top area is a shortcut,
              // not a move, and a row that vanishes reads as a bug.
              const rest = sortScripts(group.scripts).filter((script) => matches(script));
              if (rest.length === 0) return;
              sections.push(groupHeading(group, false, collapsed, toggleGroup));
              // While searching, a collapsed group must not hide its matches.
              if (needle === '' && collapsed.has(group.id)) return;
              rest.forEach((script, index) => {
                sections.push(rowFor(group, script, groupIndex + '-' + index, false, 'group'));
              });
            });
            if (needle !== '' && sections.length === 0) {
              sections.push(h('div', { className: 'dsh-svc-empty', key: 'no-match' }, t('menu.noMatch')));
            }
          }

          return h(
            'div',
            { className: 'dsh-svc-panel' },
            h('style', { key: 'css' }, CSS),
            h(
              'div',
              { className: 'dsh-svc-head', key: 'head' },
              h('span', { className: 'dsh-svc-dir', title: state.dir }, state.dir),
              h(
                'div',
                { className: 'dsh-svc-head-actions', key: 'actions' },
                h(
                  'button',
                  { className: 'dsh-svc-refresh', key: 'refresh', type: 'button', title: BUILD, onClick: load },
                  t('panel.refresh'),
                ),

              ),
            ),
            h(
              'div',
              { className: 'dsh-svc-search-row', key: 'search-row' },
              h('input', {
                className: 'dsh-svc-search-input',
                type: 'search',
                value: query,
                placeholder: t('menu.search'),
                spellCheck: false,
                'aria-label': t('menu.search'),
                onChange: (event) => setQuery(event.target.value),
              }),
            ),
            store.notice === ''
              ? null
              : h('p', { className: 'dsh-svc-notice', key: 'notice' }, store.notice),
            h('div', { className: 'dsh-svc-list', key: 'list' }, sections),
          );
        }

        function PanelTitle() {
          useLocaleRevision();
          return h('span', null, t('tab.title'));
        }


      return { PanelBody, PanelTitle };
    }

    return { createPanel };
  },
});