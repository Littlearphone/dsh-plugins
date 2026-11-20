/**
 * Task board — seed data and lane maths.
 *
 * The demo cards plus the pure geometry helpers (insertion index, moved lanes,
 * attention order). No React, no state: everything here is a function of its
 * arguments, which is what lets the board chunk stay a state machine.
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  chunk: 'client.board.data.js',
  factory() {
    /**
     * One card per runtime state, so the whole language can be reviewed at once.
     * `state` is the runtime state (not the lane); `flag` is what needs a human;
     * `primary` names the single action the card offers.
     */
    const INITIAL_LANES = [
      {
        id: 'backlog',
        titleKey: 'lane.backlog',
        tasks: [
          {
            id: 't1',
            title: '启动面板：自定义命令（不只是 package.json 里的）',
            state: 'idle',
            session: null,
            vc: 'ok',
            primary: 'startDesign',
            secondary: ['directImplement'],
          },
          {
            id: 't2',
            title: '任务板：数据模型（工作区 / 会话关联）',
            state: 'idle',
            session: '数据模型',
            vc: 'ok',
            primary: 'startDesign',
            note: 'note.noReport',
            secondary: ['directImplement'],
          },
          {
            id: 't3',
            title: '终端复用：验证 terminalController 客户端可达性',
            state: 'idle',
            session: null,
            vc: 'none',
            primary: 'startDesign',
            secondary: ['directImplement'],
          },
          {
            id: 't7',
            title: 'Host 同源路由：会话解析与 404',
            state: 'idle',
            session: '数据模型',
            vc: 'warn',
            primary: 'startDesign',
            note: 'note.noReport',
            secondary: ['directImplement'],
          },
        ],
      },
      {
        id: 'design',
        titleKey: 'lane.design',
        tasks: [
          {
            id: 't4',
            title: '轨道配色与卡片左侧色条',
            state: 'running',
            session: '数据模型',
            startedAt: Date.now() - 42 * 1000,
            vc: 'ok',
            primary: 'stop',
          },
          {
            id: 't5',
            title: '拖拽插入位置与跨轨道投放',
            state: 'queued',
            session: '数据模型',
            position: 2,
            vc: 'ok',
            primary: 'stop',
          },
          {
            id: 't6',
            title: '任务卡：状态语言的视觉规范',
            state: 'awaiting',
            session: '数据模型',
            vc: 'ok',
            primary: 'stop',
          },
        ],
      },
      {
        id: 'ready',
        titleKey: 'lane.ready',
        tasks: [
          {
            id: 't8',
            title: '执行记录与账本：requestId → itemId',
            state: 'idle',
            session: '数据模型',
            vc: 'ok',
            primary: 'startImpl',
            flag: 'approve',
            steps: 3,
          },
          {
            id: 't9',
            title: '会话列表：按工作区过滤',
            state: 'archived',
            session: '会话列表',
            vc: 'ok',
            primary: 'startImpl',
          },
        ],
      },
      {
        id: 'doing',
        titleKey: 'lane.doing',
        tasks: [
          {
            id: 't10',
            title: '卡片状态机：move() 与目的地选择',
            state: 'running',
            session: '数据模型',
            startedAt: Date.now() - 128 * 1000,
            vc: 'ok',
            primary: 'stop',
            steps: 4,
          },
          {
            id: 't11',
            title: '回滚：按路径恢复与冲突确认',
            state: 'error',
            session: '数据模型',
            vc: 'ok',
            primary: 'retry',
            note: 'context overflow',
          },
          {
            id: 't12',
            title: '派单消息包装：六段模板',
            state: 'queued',
            session: '数据模型',
            position: 1,
            vc: 'ok',
            primary: 'stop',
          },
          {
            id: 't15',
            title: '会话锁：归档之后怎么换绑',
            state: 'idle',
            session: '数据模型',
            vc: 'ok',
            primary: 'openSession',
            flag: 'blocked',
            note: '等你决定：换会话还是新建',
          },
        ],
      },
      {
        id: 'review',
        titleKey: 'lane.review',
        tasks: [
          {
            id: 't13',
            title: '右栏标签页与头部入口',
            state: 'idle',
            session: '数据模型',
            vc: 'ok',
            primary: 'pass',
            flag: 'review',
            files: 6,
          },
        ],
      },
      {
        id: 'done',
        titleKey: 'lane.done',
        tasks: [
          {
            id: 't14',
            title: '右侧栏标签页骨架',
            state: 'idle',
            session: '数据模型',
            vc: 'ok',
            primary: 'reopen',
            note: 'note.done',
            secondary: ['archive'],
          },
        ],
      },
    ];

    /**
     * Task type, keyed by demo id. In the real board this is a field on the
     * card; here it stays a side table so the seed data above stays readable.
     */
    const KIND_BY_ID = {
      t1: 'feature',
      t2: 'feature',
      t3: 'bug',
      t4: 'refactor',
      t5: 'feature',
      t6: 'docs',
      t7: 'bug',
      t8: 'feature',
      t9: 'bug',
      t10: 'refactor',
      t11: 'bug',
      t12: 'docs',
      t13: 'feature',
      t14: 'refactor',
      t15: 'bug',
    };

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

    /** mm:ss for a running card's elapsed time; ticking every second. */
    function formatElapsed(from, now) {
      const total = Math.max(0, Math.floor((now - from) / 1000));
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
    }

    /**
     * Attention ordering. A lane floats the cards that carry colour to its top,
     * because a 2px top edge is worth nothing if the card needing you is buried
     * under three quiet ones. The sort is stable, so manual order survives
     * inside a rank.
     */
    function rankOf(task) {
      if (task.flag !== undefined) return 0;
      if (task.state === 'error' || task.state === 'archived') return 1;
      if (task.state === 'running' || task.state === 'awaiting') return 2;
      if (task.state === 'queued') return 3;
      return 4;
    }

    function sortLanes(lanes) {
      return lanes.map((lane) => ({
        ...lane,
        tasks: lane.tasks.slice().sort((a, b) => rankOf(a) - rankOf(b)),
      }));
    }

    /** A new Session is a legal dispatch target only before execution starts. */
    const SPLIT_LANES = new Set(['backlog', 'ready']);

    /**
     * "Return" is one verb with several destinations, so it is always a split
     * button: the left half takes the default return, the caret lists the rest.
     */
    const RETURN_DEFAULT = { ready: 'design', review: 'doing' };
    const RETURN_OPTIONS = {
      ready: ['design', 'backlog'],
      review: ['doing', 'design', 'ready'],
    };

    return {
      INITIAL_LANES,
      KIND_BY_ID,
      LANE_ACCENT,
      indexAt,
      moveTask,
      formatElapsed,
      rankOf,
      sortLanes,
      SPLIT_LANES,
      RETURN_DEFAULT,
      RETURN_OPTIONS,
    };
  },
});