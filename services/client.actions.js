/**
 * Services — the verbs the panel and the dropdown both need.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.actions.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createActions(d) {
      const {
        t, store, emit, setOpen, postJson, stopService, UI_ROUTE, START_ROUTE, PIN_ROUTE, PACKAGE, KIND,
        sortScripts, RuntimeBadge,
      } = d;

        /** Pin or unpin one script; the pinned area floats by recent use only. */
        async function togglePin(sessionId, dir, script, pinned) {
          try {
            await postJson(PIN_ROUTE + encodeURIComponent(String(sessionId)), {
              dir: dir ?? '',
              script,
              pinned,
            });
            emit();
          } catch (error) {
            store.notice = t('run.failed') + ' ' + String(error?.message ?? error);
            emit();
          }
        }

        /**
         * Clicking a script starts it as a Host-owned process. An npm-kind script
         * goes through the package manager in its own directory — that is what
         * puts `node_modules/.bin` on PATH — while a Go program runs as written.
         */
        async function launch(script, groupDir, groupKind) {
          store.notice = '';
          store.busy = true;
          emit();
          try {
            const created = await postJson(START_ROUTE + encodeURIComponent(String(store.sessionId)), {
              name: script.name,
              command: script.command,
              source: script.command,
              dir: groupDir ?? '',
              kind: groupKind ?? 'npm',
            });
            store.busy = false;
            store.notice = '';
            store.focusServiceId = String(created?.service?.id ?? '');
            // Starting never navigates: the dropdown is meant to be usable
            // without opening the panel, and the panel is already open when its
            // own start button is the caller.
            setOpen(false);
          } catch (error) {
            store.busy = false;
            store.notice = t('run.failed') + ' ' + String(error?.message ?? error);
          }
          emit();
        }


        /**
         * One section per package. The heading is always shown — it is the only
         * thing that says which package a script belongs to — and it is sticky
         * and collapsible, because a workspace with many scripts otherwise
         * scrolls past its own labels.
         */
        function groupHeading(group, compact, collapsed, toggle) {
          const label = group.name === '' ? t('group.root') : group.name;
          const open = !collapsed.has(group.id);
          return h(
            'button',
            {
              key: 'group-' + group.id,
              type: 'button',
              className:
                'dsh-svc-group' + (compact ? ' is-compact' : '') + (open ? ' is-open' : ''),
              title: group.dir === '' ? label : group.dir,
              'aria-expanded': open ? 'true' : 'false',
              onClick: () => toggle(group.id),
            },
            h(
              'svg',
              { className: 'dsh-svc-chevron', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
              h('path', {
                d: 'M6 3.5 10.5 8 6 12.5',
                stroke: 'currentColor',
                strokeWidth: 1.4,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
            h('span', { className: 'dsh-svc-group-name' }, label),
            group.kind === 'go' ? h('span', { className: 'dsh-svc-kind' }, 'go') : null,
            group.dir === '' ? null : h('span', { className: 'dsh-svc-group-dir' }, group.dir),
            h('span', { className: 'dsh-svc-count' }, String(group.scripts.length)),
          );
        }

        
        /**
         * Rows of the dropdown: click starts, and a running service exposes its
         * stop right here so the common action needs no detour through the panel.
         */
        /**
         * Rows of the dropdown. The row text is inert and one icon button acts:
         * start while idle, stop while running — so a service can be stopped from
         * here without opening the panel, and a stray click cannot start anything.
         */
        function menuItems(groups, collapsed, toggle, runningByCommand, stopService, armedStop, armStop, disarmStop) {
          const nodes = [];
          groups.forEach((group, groupIndex) => {
            nodes.push(groupHeading(group, true, collapsed, toggle));
            if (collapsed.has(group.id)) return;
            sortScripts(group.scripts).forEach((script, index) => {
              const runningId = runningByCommand.get(script.command);
              const running = runningId !== undefined;
              nodes.push(
                h(
                  'div',
                  {
                    key: 'item-' + groupIndex + '-' + index,
                    className: 'dsh-svc-item' + (running ? ' is-running' : ''),
                    title: script.command,
                  },
                  RuntimeBadge(script.command, 'badge'),
                  h(
                    'span',
                    { className: 'dsh-svc-item-text', key: 'text' },
                    h('span', { className: 'dsh-svc-item-name' }, script.name),
                    h('span', { className: 'dsh-svc-item-command' }, script.command),
                  ),
                  h(
                    'span',
                    { className: 'dsh-svc-actions', key: 'actions' },
                    running
                      ? h(
                          'button',
                          {
                            key: 'stop',
                            type: 'button',
                            className: 'dsh-svc-stop' + (armedStop === runningId ? ' is-armed' : ''),
                            title: armedStop === runningId ? t('run.confirmStop') : t('run.stop'),
                            'aria-label': armedStop === runningId ? t('run.confirmStop') : t('run.stop'),
                            onClick: () => {
                              if (armedStop === runningId) {
                                disarmStop();
                                void stopService(runningId);
                                return;
                              }
                              armStop(runningId);
                            },
                          },
                          armedStop === runningId
                            ? h('span', { className: 'dsh-svc-stop-label' }, t('run.confirmStop'))
                            : h(
                                'svg',
                                { viewBox: '0 0 16 16', 'aria-hidden': true },
                                h('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.5, fill: 'currentColor' }),
                              ),
                        )
                      : h(
                          'button',
                          {
                            key: 'start',
                            type: 'button',
                            className: 'dsh-svc-icon',
                            title: t('run.start'),
                            'aria-label': t('run.start'),
                            onClick: () => {
                              void launch(script, group.dir, group.kind);
                            },
                          },
                          h(
                            'svg',
                            { viewBox: '0 0 16 16', 'aria-hidden': true },
                            h('path', { d: 'M5.5 3.5 12 8l-6.5 4.5z', fill: 'currentColor' }),
                          ),
                        ),
                  ),
                ),
              );
            });
          });
          return nodes;
        }

        /**
         * Two-step stop: the first press arms one service, the second confirms.
         * The arm stays until the user confirms, cancels, or arms another row —
         * it never expires on a timer, because a confirm that vanishes on its own
         * is the opposite of a confirmation.
         */
        function useArmedStop() {
          const [armed, setArmed] = React.useState('');
          const arm = React.useCallback((id) => setArmed(id), []);
          const disarm = React.useCallback(() => setArmed(''), []);
          return [armed, arm, disarm];
        }

        /** Collapsed group ids; a group stays collapsed across refreshes. */
        /**
         * Collapsed group ids. The set is seeded from the workspace document and
         * written back on change, so the panel opens the way it was left — with a
         * dozen groups that is the difference between a list and a wall.
         */
        function useCollapsedGroups(sessionId, initial) {
          const [collapsed, setCollapsed] = React.useState(() => new Set(initial ?? []));
          const seeded = React.useRef(false);
          React.useEffect(() => {
            if (seeded.current || !Array.isArray(initial)) return;
            seeded.current = true;
            setCollapsed(new Set(initial));
          }, [initial]);
          const toggle = React.useCallback(
            (id) => {
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                if (sessionId !== undefined && sessionId !== null) {
                  void fetch(UI_ROUTE + encodeURIComponent(String(sessionId)), {
                    method: 'PUT',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ collapsed: [...next] }),
                  }).catch(() => {});
                }
                return next;
              });
            },
            [sessionId],
          );
          return [collapsed, toggle];
        }


      return { togglePin, launch, groupHeading, menuItems, useArmedStop, useCollapsedGroups };
    }

    return { createActions };
  },
});