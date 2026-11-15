/**
 * Task board — status lanes with drag inside and across them.
 *
 * This is the interaction prototype: the cards are hard-coded and the board
 * keeps them in React state only. What it proves is the part that is expensive
 * to get wrong later — lane geometry, the insertion index under the pointer,
 * and moving a card between lanes in one immutable update.
 *
 * Entry point: `conversation.session.header.utilities`, the right-aligned seat
 * next to the Session's other utilities (verified additive, `replaceRisk: none`).
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/task-board';
    const KIND = 'task-board';
    const NS = 'taskBoard';

    const ZH = {
      'tab.title': '任务板',
      'entry.label': '任务板',
      'board.hint': '原型：卡片写死，拖拽只改内存，刷新即复位。',
      'lane.backlog': '待办',
      'lane.design': '设计中',
      'lane.ready': '待实现',
      'lane.doing': '实现中',
      'lane.review': '待验收',
      'lane.done': '已完成',
    };

    const EN = {
      'tab.title': 'Board',
      'entry.label': 'Board',
      'board.hint': 'Prototype: hard-coded cards; drag edits memory only and resets on reload.',
      'lane.backlog': 'Backlog',
      'lane.design': 'Designing',
      'lane.ready': 'Ready',
      'lane.doing': 'In progress',
      'lane.review': 'Review',
      'lane.done': 'Done',
    };

    /**
     * Hard-coded lanes; `titleKey` is resolved through the locale dictionary.
     * Six states: nothing is planned yet → shaped → settled → being written →
     * waiting for a human verdict → accepted.
     */
    const INITIAL_LANES = [
      {
        id: 'backlog',
        titleKey: 'lane.backlog',
        tasks: [
          { id: 't0', title: '启动面板：自定义命令（不只是 package.json 里的）', tag: 'service' },
        ],
      },
      {
        id: 'design',
        titleKey: 'lane.design',
        tasks: [
          { id: 't1', title: '启动面板：脚本扫描与分组', tag: 'service' },
          { id: 't2', title: '任务板：数据模型（工作区 / 会话关联）', tag: 'board' },
        ],
      },
      {
        id: 'ready',
        titleKey: 'lane.ready',
        tasks: [
          { id: 't3', title: '终端复用：验证 terminalController 客户端可达性', tag: 'risk' },
        ],
      },
      {
        id: 'doing',
        titleKey: 'lane.doing',
        tasks: [
          { id: 't4', title: '拖拽交互原型', tag: 'board' },
        ],
      },
      {
        id: 'review',
        titleKey: 'lane.review',
        tasks: [
          { id: 't7', title: '轨道配色与卡片左侧色条', tag: 'board' },
        ],
      },
      {
        id: 'done',
        titleKey: 'lane.done',
        tasks: [
          { id: 't5', title: '右侧栏标签页骨架', tag: 'shell' },
          { id: 't6', title: 'Host 同源路由存储', tag: 'storage' },
        ],
      },
    ];

    /**
     * One saturated colour per lane so none of them reads as "faded" next to a
     * neighbour. Values come from the product's static scales (the same hexes
     * its semantic tokens resolve to): deepseek blue, blue, amber, violet,
     * green, plus a neutral for the not-started lane. Red stays unused — it
     * belongs to a real problem, not to the ordinary wait for a verdict.
     */
    const LANE_ACCENT = {
      backlog: 'var(--dsw-static-neutral-400)',
      design: 'var(--dsw-static-deepseek-400)',
      ready: 'var(--dsw-static-blue-600)',
      doing: 'var(--dsw-static-amber-500)',
      review: 'var(--dsw-static-violet-600)',
      done: 'var(--dsw-static-green-500)',
    };

    const CSS = `
.dsh-board-root{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;min-width:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
.dsh-board-hint{flex:none;margin:0;padding:0 12px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
/* Lanes never wrap: each keeps a clamped share of the width and the row scrolls
   sideways when they no longer fit, so a narrow panel shows a scrollbar instead
   of pushing lanes onto a second line. The padding lives on this scroll
   container, so its horizontal scrollbar sits at the panel edge. */
.dsh-board-lanes{display:flex;flex-wrap:nowrap;align-items:stretch;flex:1 1 auto;gap:10px;min-height:0;min-width:0;padding:0 12px 10px;overflow-x:auto;overflow-y:hidden;}
/* Light theme has one surface colour, so a white card on a white lane reads only
   by its border; a 7% tint of the lane colour separates them in both themes. */
.dsh-board-lane{box-sizing:border-box;display:flex;flex:0 0 clamp(180px,55%,280px);flex-direction:column;gap:8px;min-height:0;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);background:color-mix(in srgb,var(--dsh-lane-accent,var(--dsw-alias-border-l1)) 7%,var(--dsw-alias-bg-layer-1));box-shadow:inset 0 2px 0 var(--dsh-lane-accent,var(--dsw-alias-border-l1));}
.dsh-board-lane.is-source{border-color:var(--dsw-alias-border-l2);}
.dsh-board-lane-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);}
.dsh-board-lane-title{display:flex;align-items:center;gap:5px;min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dsh-board-lane-title::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsh-lane-accent,var(--dsw-alias-border-l2));}
.dsh-board-count{font-variant-numeric:tabular-nums;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);}
.dsh-board-list{display:flex;flex:1 1 auto;flex-direction:column;gap:6px;min-height:44px;overflow-y:auto;}
.dsh-board-card{box-sizing:border-box;display:flex;flex-direction:column;gap:4px;padding:8px 8px 8px 10px;border:1px solid var(--dsw-alias-border-l2);border-left:3px solid var(--dsh-lane-accent,var(--dsw-alias-border-l2));border-radius:8px;background:var(--dsw-alias-bg-base);cursor:grab;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
@media (hover:hover){
.dsh-board-card:hover{transform:translateY(-1px);border-color:var(--dsh-lane-accent,var(--dsw-alias-border-l2));box-shadow:0 6px 16px rgba(0,0,0,.10);box-shadow:0 6px 16px color-mix(in srgb,var(--dsh-lane-accent,transparent) 24%,transparent);}
}
.dsh-board-card:active{cursor:grabbing;}
.dsh-board-card.is-dragging{opacity:.45;}
.dsh-board-card-title{font-size:12px;line-height:1.35;overflow-wrap:anywhere;}
.dsh-board-card-tag{align-self:flex-start;font-size:9px;line-height:1;padding:3px 6px;border-radius:999px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);}
.dsh-board-marker{height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary);}
.dsh-board-empty{height:40px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;}
/* Radius tokens measure 4/8/12/16/20/28px. On a 24px control, --dsw-radius-md
   (12px) is exactly half the box — a circle — while the menu surface it was
   copied from is a large plane where the same token reads as a soft corner.
   --dsw-radius-sm (8px) is the proportion a 24px icon control wants. */
.dsh-board-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
.dsh-board-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-board-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-board-entry svg{width:15px;height:15px;display:block;}
`;

    /** Insertion index under the pointer: how many card midpoints the pointer has passed. */
    function indexAt(list, clientY) {
      const cards = list.querySelectorAll('[data-task-card]');
      let index = 0;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (clientY > rect.top + rect.height / 2) index += 1;
      }
      return index;
    }

    /** Move one task, returning new lanes; the index accounts for the removal when staying in a lane. */
    function moveTask(lanes, taskId, fromLaneId, toLaneId, toIndex) {
      const next = lanes.map((lane) => ({ ...lane, tasks: lane.tasks.slice() }));
      const from = next.find((lane) => lane.id === fromLaneId);
      if (from === undefined) return lanes;
      const fromIndex = from.tasks.findIndex((task) => task.id === taskId);
      if (fromIndex === -1) return lanes;
      const to = next.find((lane) => lane.id === toLaneId);
      if (to === undefined) return lanes;
      const [task] = from.tasks.splice(fromIndex, 1);
      let index = toIndex;
      if (fromLaneId === toLaneId && fromIndex < toIndex) index -= 1;
      index = Math.max(0, Math.min(index, to.tasks.length));
      to.tasks.splice(index, 0, task);
      return next;
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale'],

      apply(ctx) {
        const locale = ctx.get('locale');
        const registry = ctx.get('sidebarRightTabs');
        const controller = ctx.get('sidebarRight');
        const slots = ctx.get('slots');
        if (locale === undefined || registry === undefined || slots === undefined) {
          console.error('[task-board] the right Sidebar or locale service is unavailable');
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

        /** The board body: four lanes, drag a card to reorder or to change its lane. */
        function BoardBody() {
          useLocaleRevision();
          const [lanes, setLanes] = React.useState(INITIAL_LANES);
          const [drag, setDrag] = React.useState(null);
          const [hover, setHover] = React.useState(null);

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
            setLanes((current) => moveTask(current, drag.taskId, drag.laneId, laneId, index));
            setDrag(null);
            setHover(null);
          };

          const marker = (key) => h('div', { className: 'dsh-board-marker', key });

          const card = (task, laneId) =>
            h(
              'article',
              {
                key: task.id,
                'data-task-card': '',
                className:
                  'dsh-board-card' + (drag !== null && drag.taskId === task.id ? ' is-dragging' : ''),
                draggable: true,
                onDragStart: (event) => onDragStart(event, task.id, laneId),
                onDragEnd,
              },
              h('span', { className: 'dsh-board-card-title' }, task.title),
              h('span', { className: 'dsh-board-card-tag' }, task.tag),
            );

          const lane = (entry) => {
            const items = [];
            entry.tasks.forEach((task, index) => {
              if (hover !== null && hover.laneId === entry.id && hover.index === index) {
                items.push(marker(`m-${entry.id}-${index}`));
              }
              items.push(card(task, entry.id));
            });
            if (hover !== null && hover.laneId === entry.id && hover.index === entry.tasks.length) {
              items.push(marker(`m-${entry.id}-end`));
            }
            if (entry.tasks.length === 0) {
              items.push(h('div', { className: 'dsh-board-empty', key: `empty-${entry.id}` }));
            }
            return h(
              'section',
              {
                key: entry.id,
                className:
                  'dsh-board-lane' + (drag !== null && drag.laneId === entry.id ? ' is-source' : ''),
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
                h('span', { className: 'dsh-board-count' }, String(entry.tasks.length)),
              ),
              h('div', { className: 'dsh-board-list', 'data-task-list': '' }, items),
            );
          };

          return h(
            'div',
            { className: 'dsh-board-root' },
            h('style', { key: 'css' }, CSS),
            h('p', { className: 'dsh-board-hint', key: 'hint' }, t('board.hint')),
            h('div', { className: 'dsh-board-lanes', key: 'lanes' }, lanes.map(lane)),
          );
        }

        function BoardTitle() {
          useLocaleRevision();
          return h('span', null, t('tab.title'));
        }

        /**
         * The way in: an icon-only button in the Session header's right-hand
         * utilities. Order -1 puts it immediately left of the header's More
         * menu (the session-log menu sits at the default order 0).
         */
        function HeaderEntry() {
          useLocaleRevision();
          const ref = React.useRef(null);

          // Size from the element physically next to us in the same row, not from
          // "the first menu button in the header": the utilities before us are
          // menu buttons too and need not share this row's control size. The
          // neighbour's rendered box (24px here) is the real answer.
          React.useEffect(() => {
            const button = ref.current;
            if (button === null) return;
            const wrapper = button.parentElement;
            const row = wrapper?.parentElement;
            if (wrapper === null || row === null) return;
            const siblings = Array.from(row.children);
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

          if (controller === undefined) return null;
          const label = t('entry.label');
          return h(
            React.Fragment,
            null,
            h('style', { key: 'css' }, CSS),
            h(
              'button',
              {
                key: 'button',
                type: 'button',
                ref,
                className: 'dsh-board-entry',
                title: label,
                'aria-label': label,
                onClick: () => {
                  try {
                    controller.openTab(KIND);
                  } catch (error) {
                    console.error('[task-board] cannot open the board', error);
                  }
                },
              },
              h(
                'svg',
                {
                  viewBox: '0 0 16 16',
                  width: 15,
                  height: 15,
                  'aria-hidden': true,
                  fill: 'none',
                },
                h('rect', {
                  x: 1.6,
                  y: 2.4,
                  width: 3.4,
                  height: 11.2,
                  rx: 1,
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                }),
                h('rect', {
                  x: 6.3,
                  y: 2.4,
                  width: 3.4,
                  height: 11.2,
                  rx: 1,
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                }),
                h('rect', { x: 11, y: 2.4, width: 3.4, height: 11.2, rx: 1, fill: 'currentColor' }),
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
          'task-board: board tab type',
        );
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register({ name: 'sidebar.right.pane.tab', key: PACKAGE }, BoardBody),
        );
        slots.inject('sidebar.right.pane.tab.title', () =>
          slots.register({ name: 'sidebar.right.pane.tab.title', key: PACKAGE }, BoardTitle),
        );
        slots.inject('conversation.session.header.utilities', () =>
          slots.register(
            { name: 'conversation.session.header.utilities', id: 'task-board', order: -1 },
            HeaderEntry,
          ),
        );
      },
    };
  },
});
