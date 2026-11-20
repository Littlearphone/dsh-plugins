/**
 * Task board — the board itself.
 *
 * This is a package-local chunk: the entry resolves `./client.board.js`
 * through `require.async`, so nothing here is fetched until the tab is opened.
 * The loader's protocol forbids a chunk from synchronously requiring a sibling
 * chunk, so this file stays self-contained.
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  chunk: 'client.board.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Provided by the entry through createBoard, before the first render. */
    let t = () => '';
    let useLocaleRevision = () => {};
    let ctx;
    let css = '';
    let openBoardTab = () => {};
    let view = null;

    let data = null;

    let actionsFactory = null;

        /** Plus, for the board's one create affordance. */
        function plusGlyph() {
          return h(
            'svg',
            {
              viewBox: '0 0 12 12',
              'aria-hidden': true,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.8,
              strokeLinecap: 'round',
            },
            h('path', { d: 'M6 2.4v7.2M2.4 6h7.2' }),
          );
        }

        /**
         * The workspace's real Sessions, read defensively: the Client store's
         * shape is not part of this plugin's contract, so any missing piece
         * degrades to "no Sessions to jump to" instead of breaking the board.
         */
        function useLiveSessions() {
          return React.useMemo(() => {
            const sessions = ctx.get('sessions');
            if (sessions === undefined || sessions.list === undefined) return [];
            try {
              const snapshot =
                typeof sessions.list.get === 'function'
                  ? sessions.list.get()
                  : typeof sessions.list.getSnapshot === 'function'
                    ? sessions.list.getSnapshot()
                    : undefined;
              if (snapshot === undefined || snapshot.ids === undefined) return [];
              return snapshot.ids.map((id) => {
                const row = snapshot.byId[id];
                return { id, title: row === undefined || row.displayTitle === undefined ? String(id) : row.displayTitle };
              });
            } catch (error) {
              console.error('[task-board] cannot read the Session list', error);
              return [];
            }
          }, []);
        }

        /** The board body: drag a card to reorder or to change its lane. */
        function BoardBody() {
          const { INITIAL_LANES, KIND_BY_ID, LANE_ACCENT, SPLIT_LANES, RETURN_DEFAULT, RETURN_OPTIONS, indexAt, moveTask, formatElapsed, sortLanes } = data;
          useLocaleRevision();
          const [lanes, setLanes] = React.useState(() => sortLanes(INITIAL_LANES));
          const [drag, setDrag] = React.useState(null);
          const [hover, setHover] = React.useState(null);
          const [menu, setMenu] = React.useState(null);
          const [dialog, setDialog] = React.useState(null);
          const [composing, setComposing] = React.useState(false);
          const [draft, setDraft] = React.useState('');
          const nextId = React.useRef(16);
          const live = useLiveSessions();
          const actions = actionsFactory({
            t,
            view,
            data,
            live,
            ctx,
            getLanes: () => lanes,
            setLanes,
            setMenu,
            setDialog,
            openBoardTab,
          });

          // A running card's clock must move, otherwise "running" looks identical
          // to "queued" in a still frame.
          const [now, setNow] = React.useState(() => Date.now());

          React.useEffect(() => {
            const id = setInterval(() => setNow(Date.now()), 1000);
            return () => clearInterval(id);
          }, []);

          const onDragStart = (event, taskId, laneId) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', taskId);
            setDrag({ taskId, laneId });
          };

          const onDragEnd = () => {
            setDrag(null);
            setHover(null);
          };

          const onDragOver = (event, laneId) => {
            if (drag === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const list = event.currentTarget.querySelector('[data-task-list]');
            const index = list === null ? 0 : indexAt(list, event.clientY);
            setHover({ laneId, index });
          };

          const onDrop = (event, laneId) => {
            event.preventDefault();
            if (drag === null) return;
            const list = event.currentTarget.querySelector('[data-task-list]');
            const index =
              hover !== null && hover.laneId === laneId
                ? hover.index
                : list === null
                  ? 0
                  : indexAt(list, event.clientY);
            setLanes((current) => sortLanes(moveTask(current, drag.taskId, drag.laneId, laneId, index)));
            setDrag(null);
            setHover(null);
          };

          const marker = (key) => h('div', { className: 'dsh-board-marker', key });
          // Everything the renderer needs from the board: state it reads and
          // actions it can trigger. The card itself lives in the view chunk.
          const cardApi = {
            now,
            drag,
            onDragStart,
            onDragEnd,
            sessionFor: actions.sessionFor,
            sessionLabel: actions.sessionLabel,
            openMenu: actions.openMenu,
            openStopDialog: actions.openStopDialog,
            openStatusDialog: actions.openStatusDialog,
            runAction: actions.runAction,
            jumpToSession: actions.jumpToSession,
            formatElapsed,
            SPLIT_LANES,
            RETURN_DEFAULT,
            KIND_BY_ID,
          };



          /** A new card always starts unstarted and unbound — in the backlog. */
          const createTask = () => {
            const title = draft.trim();
            if (title === '') return;
            const id = 't' + nextId.current;
            nextId.current += 1;
            setLanes((current) =>
              sortLanes(
                current.map((lane) =>
                  lane.id === 'backlog'
                    ? {
                        ...lane,
                        tasks: [
                          {
                            id,
                            title,
                            kind: 'feature',
                            state: 'idle',
                            session: null,
                            vc: 'ok',
                            primary: 'startDesign',
                          },
                          ...lane.tasks,
                        ],
                      }
                    : lane,
                ),
              ),
            );
            setDraft('');
            setComposing(false);
          };

          const lane = (entry) => {
            const items = [];
            // Composing happens where the entry lives — at the top, above the
            // first card, not at the end of a list you have to scroll.
            if (entry.id === 'backlog' && composing) {
              items.push(
                h(
                  'div',
                  { className: 'dsh-board-compose', key: 'compose' },
                  h('input', {
                    className: 'dsh-board-compose-input',
                    autoFocus: true,
                    value: draft,
                    placeholder: t('compose.placeholder'),
                    onChange: (event) => setDraft(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        createTask();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setComposing(false);
                        setDraft('');
                      }
                    },
                  }),
                ),
              );
            }
            entry.tasks.forEach((task, index) => {
              if (hover !== null && hover.laneId === entry.id && hover.index === index) {
                items.push(marker(`m-${entry.id}-${index}`));
              }
              items.push(view.renderCard(task, entry.id, cardApi));
            });
            if (hover !== null && hover.laneId === entry.id && hover.index === entry.tasks.length) {
              items.push(marker(`m-${entry.id}-end`));
            }
            if (entry.tasks.length === 0) {
              items.push(h('div', { className: 'dsh-board-empty', key: `empty-${entry.id}` }));
            }
            const isSource = drag !== null && drag.laneId === entry.id;
            return h(
              'section',
              {
                key: entry.id,
                className: 'dsh-board-lane' + (isSource ? ' is-source' : ''),
                // Lane identity colour: the lane cap, its title dot and every
                // card's left bar read from this one custom property.
                style: { '--dsh-lane-accent': LANE_ACCENT[entry.id] },
                onDragOver: (event) => onDragOver(event, entry.id),
                onDrop: (event) => onDrop(event, entry.id),
              },
              h(
                'header',
                { className: 'dsh-board-lane-head' },
                h('span', { className: 'dsh-board-lane-title' }, t(entry.titleKey)),
                h(
                  'span',
                  { className: 'dsh-board-lane-tools' },
                  h('span', { className: 'dsh-board-count' }, String(entry.tasks.length)),
                  // The one entry point for new work: always visible in the
                  // header, never below the fold.
                  entry.id === 'backlog'
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-board-add',
                          title: t('compose.new'),
                          'aria-label': t('compose.new'),
                          onClick: (event) => {
                            event.stopPropagation();
                            setComposing(true);
                          },
                        },
                        plusGlyph(),
                      )
                    : null,
                ),
              ),
              h('div', { className: 'dsh-board-list', 'data-task-list': '' }, items),
            );
          };

          const menuTask =
            menu === null
              ? null
              : lanes
                  .map((lane) => lane.tasks)
                  .flat()
                  .find((task) => task.id === menu.taskId) || null;

          const menuItem = (key, label, onClick, glyph) =>
            h(
              'button',
              { key, type: 'button', className: 'dsh-board-menu-item', onClick },
              glyph === undefined ? null : view.actionGlyph(glyph),
              label,
            );

          const menuItems = () => {
            if (menu === null || menuTask === null) return [];
            const title = (key) => h('div', { key: 'title', className: 'dsh-board-menu-title' }, t(key));
            if (menu.kind === 'target') {
              const target = actions.sessionFor(menuTask);
              return [
                title('menu.startTo'),
                menuItem(
                  'bound',
                  target === undefined ? t('menu.noBinding') : t('menu.dispatchTo') + ' ' + target.title,
                  () => actions.runAction(menuTask, menuTask.primary),
                  'play',
                ),
                menuItem('new', t('menu.newSession'), () => actions.runAction(menuTask, 'newSession'), 'newSession'),
              ];
            }
            if (menu.kind === 'dest') {
              // Stop's caret skips the chooser: pick a lane and the card is
              // already there.
              return [
                title('menu.stopTo'),
                menuItem('l-backlog', t('menu.moveTo') + ' ' + t('lane.backlog'), () => actions.moveCardTo(menuTask.id, 'backlog'), 'move'),
                menuItem('l-ready', t('menu.moveTo') + ' ' + t('lane.ready'), () => actions.moveCardTo(menuTask.id, 'ready'), 'move'),
                menuItem('l-design', t('menu.moveTo') + ' ' + t('lane.design'), () => actions.moveCardTo(menuTask.id, 'design'), 'move'),
              ];
            }
            if (menu.kind === 'back') {
              const from = actions.laneOf(menuTask.id);
              const options = RETURN_OPTIONS[from] === undefined ? [] : RETURN_OPTIONS[from];
              return [
                title('menu.backTo'),
                ...options
                  .filter((laneId) => laneId !== from)
                  .map((laneId) =>
                    menuItem(
                      'b-' + laneId,
                      t('menu.moveTo') + ' ' + t('lane.' + laneId),
                      () => actions.moveCardTo(menuTask.id, laneId),
                      'move',
                    ),
                  ),
              ];
            }
            const more = (menuTask.secondary === undefined ? [] : menuTask.secondary).map((action) =>
              menuItem(action, view.actionLabel(action), () => actions.runAction(menuTask, action), action),
            );
            return more;
          };

          const dialogAction = (action, index) =>
            h(
              'button',
              {
                key: index,
                type: 'button',
                className: 'dsh-board-dialog-btn' + (action.kind === 'link' ? ' is-link' : ''),
                onClick: action.onClick,
              },
              action.label,
            );

          return h(
            'div',
            { className: 'dsh-board-root' },
            h('style', { key: 'css' }, css),
            h('p', { className: 'dsh-board-hint', key: 'hint' }, t('board.hint')),
            h('div', { className: 'dsh-board-lanes', key: 'lanes' }, lanes.map(lane)),
            menu === null
              ? null
              : h(
                  React.Fragment,
                  { key: 'menu' },
                  h('div', { className: 'dsh-board-menu-backdrop', onClick: () => setMenu(null) }),
                  h(
                    'div',
                    {
                      className: 'dsh-board-menu',
                      style: { left: Math.max(8, menu.x - 186), top: menu.y + 6 },
                    },
                    menuItems(),
                  ),
                ),
            dialog === null
              ? null
              : h(
                  'div',
                  { key: 'dialog', className: 'dsh-board-dialog-backdrop', onClick: closeDialog },
                  h(
                    'div',
                    {
                      className: 'dsh-board-dialog',
                      role: 'dialog',
                      onClick: (event) => event.stopPropagation(),
                    },
                    h('p', { className: 'dsh-board-dialog-title' }, dialog.title),
                    dialog.lines.map((line, index) =>
                      h('p', { className: 'dsh-board-dialog-line', key: index }, line),
                    ),
                    dialog.options === undefined
                      ? null
                      : h(
                          'div',
                          { className: 'dsh-board-dialog-actions' },
                          dialog.options.map((option, index) =>
                            h(
                              'button',
                              {
                                key: index,
                                type: 'button',
                                className: 'dsh-board-dialog-btn is-primary',
                                onClick: () => {
                                  option.run();
                                  closeDialog();
                                },
                              },
                              option.label,
                            ),
                          ),
                        ),
                    h(
                      'div',
                      { className: 'dsh-board-dialog-actions' },
                      dialog.actions.map(dialogAction),
                    ),
                  ),
                ),
          );
        }

    return {
      /** Wire the chunk to the entry's services; call once, before rendering. */
      createBoard(deps) {
        t = deps.t;
        view = deps.view;
        data = deps.data;
        actionsFactory = deps.actions;
        useLocaleRevision = deps.useLocaleRevision;
        ctx = deps.ctx;
        css = deps.css;
        openBoardTab = deps.openBoardTab;
        return { Board: BoardBody };
      },
    };
  },
});