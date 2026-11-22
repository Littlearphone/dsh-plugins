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
        t, store, emit, setOpen, postJson, stopService, restartService, UI_ROUTE, START_ROUTE, PIN_ROUTE, PACKAGE, KIND,
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
            const startedId = String(created?.service?.id ?? '');
            store.focusServiceId = startedId;
            // This run is now this page's child: when it exits, tell the user.
            if (startedId !== '') store.watched.add(startedId);
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

        
        /** The state chip a row shows next to its name; one shape on every surface. */
        function serviceChip(service) {
          if (service === undefined) return null;
          if (service.state === 'running') {
            return h('span', { className: 'dsh-svc-chip is-running' }, t('run.running'));
          }
          if (service.state === 'stopping') {
            return h('span', { className: 'dsh-svc-chip' }, t('run.stopping'));
          }
          // "已结束 0" says nothing: name the outcome and keep the code beside it,
          // so a 0 reads as success and a 2 as failure without a lookup. A run with
          // no code (killed) has no verdict to name.
          const code = service.exitCode;
          if (code === undefined || code === null) {
            return h('span', { className: 'dsh-svc-chip is-done' }, t('run.exited'));
          }
          const verdict = code === 0 ? t('run.exitOk') : t('run.exitFail');
          return h(
            'span',
            { className: 'dsh-svc-chip is-done' + (code === 0 ? '' : ' is-failed') },
            t('run.exited') + ' · ' + verdict + ' (' + String(code) + ')',
          );
        }

        /** Circular-arrow glyph: restart. */
        function restartIcon() {
          return h(
            'svg',
            { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
            h('path', {
              d: 'M13 8a5 5 0 1 1-1.5-3.6',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
            }),
            h('path', {
              d: 'M13 2.6v3.2H9.8',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
          );
        }

        /** Square glyph: stop. */
        function stopIcon() {
          return h(
            'svg',
            { viewBox: '0 0 16 16', 'aria-hidden': true },
            h('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.5, fill: 'currentColor' }),
          );
        }

        function actionIcon(kind) {
          return kind === 'restart' ? restartIcon() : stopIcon();
        }

        /**
         * The two-step action both surfaces use: the first press arms it, the
         * second confirms, and the label replaces the glyph while armed. `busy`
         * swaps the control for a spinner so an in-flight restart cannot fire
         * twice. One arm is shared by every kind, so arming restart on one row
         * also disarms a stop confirmation elsewhere.
         */
        function armedActionButton(options) {
          const { kind, armed, armKey, busy, busyLabel, idle, confirm, onArm, onConfirm } = options;
          const isArmed = armed === armKey;
          const label = busy && busyLabel !== undefined ? busyLabel : isArmed ? confirm : idle;
          return h(
            'button',
            {
              key: options.key,
              type: 'button',
              className: 'dsh-svc-' + kind + (isArmed ? ' is-armed' : '') + (busy ? ' is-busy' : ''),
              disabled: busy,
              title: label,
              'aria-label': label,
              onClick: () => {
                if (isArmed) onConfirm();
                else onArm(armKey);
              },
            },
            busy
              ? h('span', { className: 'dsh-svc-spinner is-small' })
              : isArmed
                ? h('span', { className: 'dsh-svc-' + kind + '-label' }, confirm)
                : actionIcon(kind),
          );
        }

        /**
         * Rows of the dropdown. The row text is inert: a running service exposes
         * restart and stop here (each with the same two-step confirm as the
         * panel), while an idle one exposes start — so the common action needs no
         * detour through the panel, and a stray click cannot start anything.
         */
        function menuItems(
          groups,
          collapsed,
          toggle,
          runningByCommand,
          stopService,
          restartService,
          armed,
          arm,
          disarm,
        ) {
          const nodes = [];
          groups.forEach((group, groupIndex) => {
            nodes.push(groupHeading(group, true, collapsed, toggle));
            if (collapsed.has(group.id)) return;
            sortScripts(group.scripts).forEach((script, index) => {
              const service = runningByCommand.get(script.command);
              const running = service !== undefined && service.state === 'running';
              const runningId = running ? service.id : undefined;
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
                  serviceChip(service),
                  h(
                    'span',
                    { className: 'dsh-svc-actions', key: 'actions' },
                    running
                      ? [
                          armedActionButton({
                            key: 'restart',
                            kind: 'restart',
                            armed,
                            armKey: 'restart:' + runningId,
                            idle: t('run.restart'),
                            confirm: t('run.confirmRestart'),
                            onArm: arm,
                            onConfirm: () => {
                              disarm();
                              void restartService(runningId);
                            },
                          }),
                          armedActionButton({
                            key: 'stop',
                            kind: 'stop',
                            armed,
                            armKey: 'stop:' + runningId,
                            idle: t('run.stop'),
                            confirm: t('run.confirmStop'),
                            onArm: arm,
                            onConfirm: () => {
                              disarm();
                              void stopService(runningId);
                            },
                          }),
                        ]
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
         * Track restarts that are still waiting for their replacement. A key
         * stays in the map while the polled list still shows the run being
         * replaced; the first poll that names a different id clears it.
         */
        function useRestarting(latest) {
          const [restarting, setRestarting] = React.useState({});
          React.useEffect(() => {
            const entries = Object.entries(restarting);
            if (entries.length === 0) return;
            const next = {};
            let changed = false;
            for (const [key, previousId] of entries) {
              const service = latest.get(key);
              if (service !== undefined && service.id === previousId) next[key] = previousId;
              else changed = true;
            }
            if (changed) setRestarting(next);
          }, [latest, restarting]);
          const mark = React.useCallback((key, id) => {
            setRestarting((current) => ({ ...current, [key]: id }));
          }, []);
          const clear = React.useCallback((key) => {
            setRestarting((current) => {
              const next = { ...current };
              delete next[key];
              return next;
            });
          }, []);
          return [restarting, mark, clear];
        }

        /**
         * One armed action at a time. The key is `<action>:<service id>`, so
         * arming a restart also drops a pending stop confirmation on another
         * row. The arm stays until the user confirms, cancels, or arms another
         * action — it never expires on a timer, because a confirm that vanishes
         * on its own is the opposite of a confirmation.
         */
        function useArmedAction() {
          const [armed, setArmed] = React.useState('');
          const arm = React.useCallback((key) => setArmed(key), []);
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


      return { togglePin, launch, groupHeading, menuItems, serviceChip, armedActionButton, useArmedAction, useRestarting, useCollapsedGroups };
    }

    return { createActions };
  },
});