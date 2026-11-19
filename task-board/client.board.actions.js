/**
 * Task board — what a click does.
 *
 * Session resolution, lane moves, menus and dialogs. The board hands in its
 * setters and a lane getter, so this module owns behaviour but no state.
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  chunk: 'client.board.actions.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createActions(deps) {
      const { t, view, data, live, ctx, getLanes, setLanes, setMenu, setDialog, openBoardTab } = deps;

          /** Where a verb lands. Actions with a lane perform a real (in-memory)
           *  move; the rest open a dialog, because the prototype cannot do them
           *  but must still answer the click. */
          const ACTION_LANE = {
            startDesign: 'design',
            continueDesign: 'design',
            directImplement: 'doing',
            startImpl: 'doing',
            continueImpl: 'doing',
            pass: 'done',
            reopen: 'review',
            backDesign: 'design',
            backImplement: 'doing',
            backBacklog: 'backlog',
          };

          /** Real Session behind a card. Demo cards name a Session; the same
           *  name always resolves to the same real Session in this workspace,
           *  so two cards sharing a name share one jump target. */
          const sessionFor = (task) => {
            if (live.length === 0 || task.session === null || task.session === undefined) return undefined;
            let hash = 0;
            for (const ch of String(task.session)) hash = (hash * 31 + ch.codePointAt(0)) % 9973;
            return live[hash % live.length];
          };

          const laneOf = (taskId) => {
            const lane = getLanes().find((entry) => entry.tasks.some((task) => task.id === taskId));
            return lane === undefined ? undefined : lane.id;
          };

          const moveCardTo = (taskId, laneId) => {
            setLanes((current) => {
              const from = current.find((lane) => lane.tasks.some((task) => task.id === taskId));
              if (from === undefined || from.id === laneId) return current;
              return data.sortLanes(data.moveTask(current, taskId, from.id, laneId, 0));
            });
            setMenu(null);
          };

          const closeDialog = () => setDialog(null);

          /** Verbs with a lane effect really move the card; the rest explain
           *  themselves in a dialog. Either way the click is answered. */
          const runAction = (task, action) => {
            setMenu(null);
            if (ACTION_LANE[action] !== undefined) {
              moveCardTo(task.id, ACTION_LANE[action]);
              return;
            }
            setDialog({
              title: view.actionLabel(action),
              lines: [t('dialog.simulated')],
              actions: [{ label: t('dialog.close'), onClick: closeDialog }],
            });
          };

          const openMenu = (task, kind, event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu({ taskId: task.id, kind, x: rect.right, y: rect.bottom });
          };

          const openStopDialog = (task) => {
            setMenu(null);
            setDialog({
              title: t('action.stop'),
              lines: [t('dialog.stopHint')],
              options: [
                { label: t('lane.backlog'), run: () => moveCardTo(task.id, 'backlog') },
                { label: t('lane.ready'), run: () => moveCardTo(task.id, 'ready') },
              ],
              actions: [{ label: t('dialog.cancel'), onClick: closeDialog }],
            });
          };

          const openStatusDialog = (task, status) => {
            const target = sessionFor(task);
            const lines = [];
            if (view.noteText(task) !== undefined) lines.push(view.noteText(task));
            if (task.vc === 'none') lines.push(t('dialog.vcNone'));
            if (task.vc === 'warn') lines.push(t('dialog.vcWarn'));
            if (lines.length === 0) lines.push(t('dialog.noDetail'));
            setDialog({
              title: status.text,
              lines,
              actions:
                target === undefined
                  ? [{ label: t('dialog.close'), onClick: closeDialog }]
                  : [
                      { label: t('dialog.openSession'), kind: 'link', onClick: () => jumpToSession(target) },
                      { label: t('dialog.close'), onClick: closeDialog },
                    ],
            });
          };

          /** Switch Session, then make sure the board tab is open there — the
           *  tab belongs to a Session, so a plain switch can land on one that
           *  never opened it. Retry until that Session's store is adopted. */
          const jumpToSession = (target) => {
            closeDialog();
            if (target === undefined) return;
            const workspace = ctx.get('uiWorkspace');
            try {
              if (workspace !== undefined) workspace.openSession(target.id);
            } catch (error) {
              console.error('[task-board] cannot open the session', error);
            }
            let tries = 12;
            const open = () => {
              try {
                openBoardTab();
              } catch {
                if (tries > 0) {
                  tries -= 1;
                  setTimeout(open, 120);
                }
              }
            };
            setTimeout(open, 140);
          };

          /** Where the card runs. The icon is always present, bound or not —
           *  a slot that loses its icon when empty reads as a different widget. */
          const sessionLabel = (task, state) => {
            const target = sessionFor(task);
            const name = target === undefined ? task.session : target.title;
            const empty = name === null || name === undefined;
            return h(
              'button',
              {
                type: 'button',
                className:
                  'dsh-board-session' +
                  (empty ? ' is-empty' : '') +
                  (state === 'archived' ? ' is-archived' : '') +
                  (target === undefined ? '' : ' is-link'),
                title: empty ? t('state.unassigned') : t('dialog.openSession') + '：' + name,
                onClick: (event) => {
                  event.stopPropagation();
                  if (target === undefined) {
                    setDialog({
                      title: empty ? t('state.unassigned') : name,
                      lines: [t('dialog.noSessionId')],
                      actions: [{ label: t('dialog.close'), onClick: closeDialog }],
                    });
                    return;
                  }
                  jumpToSession(target);
                },
              },
              h(
                'svg',
                { viewBox: '0 0 12 12', 'aria-hidden': true, fill: 'none' },
                h('rect', { x: 1.4, y: 2.4, width: 9.2, height: 7.6, rx: 2, stroke: 'currentColor', strokeWidth: 1.1 }),
                h('path', { d: 'M1.4 5.2h9.2', stroke: 'currentColor', strokeWidth: 1.1 }),
              ),
              h('span', null, empty ? t('state.unassigned') : name),
            );
          };

      return {
        sessionFor,
        laneOf,
        moveCardTo,
        closeDialog,
        runAction,
        openMenu,
        openStopDialog,
        openStatusDialog,
        jumpToSession,
        sessionLabel,
      };
    }

    return { createActions };
  },
});