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
      'tab.title': '任务列表',
      'guide.title': '任务列表',
      'guide.description': '按状态分轨道，拖拽卡片即可改状态。',
      'entry.label': '任务列表',
      'board.hint': '点状态看详情、点会话跳转；主操作按图标、右瓣选目标，其余动作都是同尺寸图标按钮',
      'board.loading': '正在加载看板…',
      'board.failed': '看板加载失败，点这里重试。',
      'lane.backlog': '待办',
      'lane.design': '设计中',
      'lane.ready': '待实现',
      'lane.doing': '实现中',
      'lane.review': '待验收',
      'lane.done': '已完成',
      'state.unassigned': '未派单',
      'state.queued': '排队',
      'state.running': '运行中',
      'state.awaiting': '等你回答',
      'state.idle': '空闲',
      'state.error': '出错',
      'state.archived': '已归档',
      'flag.approve': '等你批',
      'flag.review': '等你验',
      'flag.blocked': '阻塞',
      'meta.steps': '步',
      'meta.files': '个文件',
      'menu.dispatchTo': '投递给',
      'menu.newSession': '在新会话执行',
      'vc.none': '无版本控制',
      'vc.warn': '本次无快照',
      'action.startDesign': '开始设计',
      'action.continueDesign': '继续设计',
      'action.startImpl': '开始实现',
      'action.continueImpl': '继续实现',
      'action.stop': '停止',
      'action.pass': '通过',
      'action.reopen': '重开',
      'action.retry': '重试',
      'action.respond': '回应',
      'action.newSession': '新建会话',
      'action.pickTarget': '选择执行位置',
      'dialog.vcNone': '版本控制：这个工作区没有 git，中断后无法回滚。',
      'dialog.vcWarn': '版本控制：本次执行没有快照。',
      'action.pickBack': '选择退回目标',
      'action.return': '退回',
      'action.returnTo': '退回',
      'action.openSession': '打开会话',
      'action.pickLane': '选择去向',
      'compose.new': '新任务',
      'compose.placeholder': '任务标题，回车创建，Esc 取消',
      'type.feature': '功能开发',
      'type.bug': '缺陷修复',
      'type.refactor': '重构',
      'type.docs': '文档',
      'menu.stopTo': '停止并移到',
      'menu.backTo': '退回',
      'menu.moveTo': '移到',
      'status.open': '查看详情',
      'menu.noBinding': '未绑定会话',
      'dialog.simulated': '原型：这个动作只演示流程，不会真的执行。',
      'dialog.stopHint': '停止之后要决定这张卡回到哪条轨道：',
      'dialog.cancel': '取消',
      'dialog.close': '关闭',
      'dialog.openSession': '打开会话',
      'dialog.noDetail': '这张卡没有可查看的细节。',
      'dialog.noSessionId': '这个会话不在当前工作区列表里，无法跳转。',
      'action.directImplement': '直接实现',
      'action.backDesign': '退回设计',
      'action.backImplement': '退回实现',
      'action.backBacklog': '退回待办',
      'action.archive': '归档',
      'action.edit': '编辑',
      'action.delete': '删除',
      'action.more': '更多',
      'note.noReport': '本轮结束，模型未上报',
      'note.noSnapshot': '本阶段没有快照',
      'note.done': '已归档到已完成',
    };

    const EN = {
      'tab.title': 'Task list',
      'guide.title': 'Task list',
      'guide.description': 'Status lanes; drag a card to change its state.',
      'entry.label': 'Task list',
      'board.hint': 'Chip opens details, session jumps, caret picks a target; every action is the same icon button',
      'board.loading': 'Loading the board…',
      'board.failed': 'The board failed to load. Retry.',
      'lane.backlog': 'Backlog',
      'lane.design': 'Designing',
      'lane.ready': 'Ready',
      'lane.doing': 'In progress',
      'lane.review': 'Review',
      'lane.done': 'Done',
      'state.unassigned': 'No session',
      'state.queued': 'Queued',
      'state.running': 'Running',
      'state.awaiting': 'Awaiting you',
      'state.idle': 'Idle',
      'state.error': 'Error',
      'state.archived': 'Archived',
      'flag.approve': 'Needs approval',
      'flag.review': 'Needs review',
      'flag.blocked': 'Blocked',
      'meta.steps': 'steps',
      'meta.files': 'files',
      'menu.dispatchTo': 'Dispatch to',
      'menu.newSession': 'Run in a new session',
      'vc.none': 'No version control',
      'vc.warn': 'No snapshot',
      'action.startDesign': 'Start design',
      'action.continueDesign': 'Continue design',
      'action.startImpl': 'Start build',
      'action.continueImpl': 'Continue build',
      'action.stop': 'Stop',
      'action.pass': 'Pass',
      'action.reopen': 'Reopen',
      'action.retry': 'Retry',
      'action.respond': 'Respond',
      'action.newSession': 'New session',
      'action.pickTarget': 'Choose target',
      'dialog.vcNone': 'Version control: this workspace has no git, so a rollback is impossible.',
      'dialog.vcWarn': 'Version control: this run left no snapshot.',
      'action.pickBack': 'Choose where it returns',
      'action.return': 'Return',
      'action.returnTo': 'Return to',
      'action.openSession': 'Open session',
      'action.pickLane': 'Choose destination',
      'menu.startTo': 'Start and dispatch to',
      'menu.stopTo': 'Stop and move to',
      'menu.backTo': 'Return to',
      'menu.moveTo': 'Move to',
      'compose.new': 'New task',
      'compose.placeholder': 'Task title — Enter to create, Esc to cancel',
      'type.feature': 'Feature',
      'type.bug': 'Bug fix',
      'type.refactor': 'Refactor',
      'type.docs': 'Docs',
      'status.open': 'View details',
      'menu.noBinding': 'No session bound',
      'dialog.simulated': 'Prototype: this action demonstrates the flow only.',
      'dialog.stopHint': 'After stopping, the card needs a lane:',
      'dialog.cancel': 'Cancel',
      'dialog.close': 'Close',
      'dialog.openSession': 'Open session',
      'dialog.noDetail': 'Nothing to show for this card.',
      'dialog.noSessionId': 'This session is not in the workspace list, so it cannot be opened.',
      'action.directImplement': 'Build directly',
      'action.backDesign': 'Back to design',
      'action.backImplement': 'Back to build',
      'action.backBacklog': 'Back to backlog',
      'action.archive': 'Archive',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.more': 'More',
      'note.noReport': 'Turn ended without a report',
      'note.noSnapshot': 'No snapshot for this run',
      'note.done': 'Archived as done',
    };

    /**
     * Styles and the board itself are package-local chunks. They are pulled in
     * together the first time the tab or the guide sheet needs them.
     */


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


        let sheets = null;
        let sheetsRequest = null;

        function loadSheets() {
          if (sheetsRequest === null) {
            sheetsRequest = require.async('./client.css.js').then((mod) => {
              sheets = mod;
              return mod;
            });
          }
          return sheetsRequest;
        }

        /** Both sheets are global, so they ride the frame-wide seat. */
        function GuideStyle() {
          const [sheet, setSheet] = React.useState(sheets);
          React.useEffect(() => {
            if (sheet !== null) return undefined;
            let alive = true;
            loadSheets().then(
              (loaded) => {
                if (alive) setSheet(loaded);
              },
              (error) => console.error('[task-board] cannot load the styles chunk', error),
            );
            return () => {
              alive = false;
            };
          }, [sheet]);
          return sheet === null ? null : h('style', null, sheet.GUIDE_CSS + sheet.BOARD_CSS);
        }

        let board = null;
        let boardRequest = null;

        /**
         * The board is package-local chunks, fetched together when the tab first
         * shows. A failure renders its own text instead of an empty tab: a blank
         * panel is indistinguishable from "the board has no cards".
         */
        function BoardBody(props) {
          useLocaleRevision();
          const [ready, setReady] = React.useState(board === null ? null : { Board: board });
          const [failure, setFailure] = React.useState('');
          React.useEffect(() => {
            if (ready !== null || failure !== '') return undefined;
            let alive = true;
            if (boardRequest === null) {
              boardRequest = Promise.all([
                require.async('./client.board.js'),
                require.async('./client.board.view.js'),
                require.async('./client.board.data.js'),
                require.async('./client.board.actions.js'),
                loadSheets(),
              ]).then(([boardModule, viewModule, dataModule, actionsModule, sheet]) => {
                board = boardModule.createBoard({
                  t,
                  useLocaleRevision,
                  ctx,
                  css: sheet.BOARD_CSS,
                  view: viewModule.createView({ t }),
                  data: dataModule,
                  actions: actionsModule.createActions,
                  openBoardTab: () => {
                    if (controller !== undefined) controller.openTab(KIND);
                  },
                });
                return board;
              });
            }
            boardRequest.then(
              (loaded) => {
                if (alive) setReady({ Board: loaded.Board });
              },
              (error) => {
                if (alive) setFailure(String((error && error.message) || error));
              },
            );
            return () => {
              alive = false;
            };
          }, [ready, failure]);
          if (failure !== '') {
            return h(
              'div',
              { className: 'dsh-board-root' },
              h('p', { className: 'dsh-board-hint' }, '看板加载失败：' + failure),
            );
          }
          if (ready === null) {
            return h('div', { className: 'dsh-board-root' }, h('p', { className: 'dsh-board-hint' }, '正在加载看板…'));
          }
          return h(ready.Board, props);
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

        /** Guide capsule glyph: three status lanes. */
        function GuideIcon(props) {
          return h(
            'svg',
            { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true, ...props },
            h('rect', { x: 1.8, y: 2.6, width: 3.4, height: 10.8, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.2 }),
            h('rect', { x: 6.3, y: 2.6, width: 3.4, height: 10.8, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.2 }),
            h('rect', { x: 10.8, y: 2.6, width: 3.4, height: 10.8, rx: 1.2, fill: 'currentColor' }),
          );
        }

        ctx.effect(
          () =>
            registry.register({
              id: PACKAGE,
              kind: KIND,
              priority: 'extension',
              title: () => t('tab.title'),
              guide: [
                {
                  id: 'task-board',
                  order: 50,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GuideIcon,
                },
              ],
            }),
          'task-board: board tab type',
        );
        slots.inject('shell.overlay', () =>
          slots.register({ name: 'shell.overlay', id: 'task-board-guide-style', order: 900 }, GuideStyle),
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

