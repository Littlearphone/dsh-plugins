/**
 * Task board — the board itself.
 *
 * Loaded as a package-local chunk: the entry resolves `./client.board.js`
 * through `require.async`, so nothing here is fetched until the tab opens.
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  chunk: 'client.board.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

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

    function createView(deps) {
      const t = deps.t;

          /**
           * One status slot, always rendered — a human block outranks the
           * runtime state, because "waiting for you" is the thing that matters
           * even when the agent is also running.
           */
          const statusOf = (task, state) => {
            if (task.flag === 'approve') return { text: t('flag.approve'), tone: 'wait', glyph: 'wait' };
            if (task.flag === 'review') return { text: t('flag.review'), tone: 'wait', glyph: 'wait' };
            // Blocked is a decision only a human can make, so it belongs to the
            // waiting family, not the failure family; the ⊘ glyph separates it
            // from the other waits.
            if (task.flag === 'blocked') return { text: t('flag.blocked'), tone: 'wait', glyph: 'blocked' };
            if (state === 'running') return { text: t('state.running'), tone: 'run', glyph: 'run' };
            if (state === 'queued') {
              return {
                text: t('state.queued') + (task.position === undefined ? '' : ' ' + task.position),
                tone: 'queued',
                glyph: 'queue',
              };
            }
            if (state === 'awaiting') return { text: t('state.awaiting'), tone: 'wait', glyph: 'wait' };
            if (state === 'error') return { text: t('state.error'), tone: 'error', glyph: 'error' };
            if (state === 'archived') return { text: t('state.archived'), tone: 'quiet', glyph: 'archive' };
            return { text: t('state.idle'), tone: 'quiet', glyph: 'idle' };
          };

          /** A 12px glyph per state; the text still names the exact state. */
          const statusGlyph = (glyph) => {
            const frame = (children) =>
              h(
                'svg',
                {
                  viewBox: '0 0 12 12',
                  'aria-hidden': true,
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 1.3,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                },
                children,
              );
            if (glyph === 'run') {
              // Two dots on one baseline, alternating: activity, with no claim
              // about how far along the work is.
              return frame([
                h('circle', { key: 'a', className: 'dsh-board-live', cx: 4.3, cy: 6, r: 1.6, fill: 'currentColor', stroke: 'none' }),
                h('circle', { key: 'b', className: 'dsh-board-live is-b', cx: 8.1, cy: 6, r: 1.6, fill: 'currentColor', stroke: 'none' }),
              ]);
            }
            if (glyph === 'wait') {
              return frame([
                h('circle', { key: 'ring', cx: 6, cy: 6, r: 3.6 }),
                h('circle', { key: 'dot', cx: 6, cy: 6, r: 1.3, fill: 'currentColor', stroke: 'none' }),
              ]);
            }
            if (glyph === 'error') {
              return frame([h('path', { key: 'tri', d: 'M6 1.9 10.7 10H1.3z' })]);
            }
            if (glyph === 'blocked') {
              return frame([
                h('circle', { key: 'ring', cx: 6, cy: 6, r: 3.7 }),
                h('path', { key: 'slash', d: 'M3.4 8.6 8.6 3.4' }),
              ]);
            }
            if (glyph === 'queue') {
              return frame([
                h('path', { key: 'a', d: 'M2.4 3.6h7.2' }),
                h('path', { key: 'b', d: 'M2.4 6h7.2' }),
                h('path', { key: 'c', d: 'M2.4 8.4h7.2' }),
              ]);
            }
            if (glyph === 'archive') {
              return frame([
                h('path', { key: 'lid', d: 'M1.9 2.4h8.2v1.9H1.9z' }),
                h('path', { key: 'box', d: 'M2.6 4.3v5.6h6.8V4.3' }),
              ]);
            }
            return frame([h('circle', { key: 'ring', cx: 6, cy: 6, r: 3.6 })]);
          };

          const stepsGlyph = () =>
            h(
              'svg',
              {
                viewBox: '0 0 12 12',
                'aria-hidden': true,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.3,
                strokeLinecap: 'round',
              },
              h('path', { d: 'M2.2 3.4h7.6M2.2 6h7.6M2.2 8.6h4.6' }),
            );

          const filesGlyph = () =>
            h(
              'svg',
              {
                viewBox: '0 0 12 12',
                'aria-hidden': true,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.2,
                strokeLinejoin: 'round',
              },
              h('path', { d: 'M3.1 1.7h3.8l2 2v6.6H3.1z' }),
              h('path', { d: 'M6.9 1.7v2h2' }),
            );

          /** Action glyphs. Verbs like start/stop/approve are conventional enough
           *  to read as icons; the label stays in the primary button and in every
           *  tooltip, because a bare glyph is never the only channel. */
          const actionGlyph = (action) => {
            const frame = (children) =>
              h(
                'svg',
                {
                  viewBox: '0 0 14 14',
                  'aria-hidden': true,
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 1.4,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                },
                children,
              );
            if (action === 'stop') {
              return frame([h('rect', { key: 'sq', x: 3.6, y: 3.6, width: 6.8, height: 6.8, rx: 1.2, fill: 'currentColor', stroke: 'none' })]);
            }
            if (action === 'pass') return frame([h('path', { key: 'ck', d: 'M3 7.4 6 10.4l5-6' })]);
            if (action === 'reopen' || action === 'retry') {
              return frame([
                h('path', { key: 'a', d: 'M3.4 4.6A4.2 4.2 0 1 1 2.8 8' }),
                h('path', { key: 'b', d: 'M2.4 2.6v2.6h2.6' }),
              ]);
            }
            if (action === 'respond') return frame([h('path', { key: 'r', d: 'M7.6 3.4 4 7l3.6 3.6M4 7h4.6a2.6 2.6 0 0 1 0 5.2' })]);
            if (action === 'newSession') return frame([h('path', { key: 'p', d: 'M7 3.2v7.6M3.2 7h7.6' })]);
            if (action === 'directImplement') return frame([h('path', { key: 'b', d: 'M7.8 2 4 7.6h2.8L6.2 12 10 6.4H7.2z' })]);
            if (action === 'backDesign' || action === 'backImplement' || action === 'backBacklog' || action === 'return') {
              return frame([h('path', { key: 'c', d: 'M10 7H4M6.8 3.8 3.6 7l3.2 3.2' })]);
            }
            if (action === 'archive') {
              return frame([
                h('path', { key: 'lid', d: 'M2.4 3.2h9.2v2.2H2.4z' }),
                h('path', { key: 'box', d: 'M3.2 5.4v5.4h7.6V5.4' }),
              ]);
            }
            if (action === 'edit') return frame([h('path', { key: 'p', d: 'M8.6 2.6 11.4 5.4 6 10.8l-3 .6.6-3z' })]);
            if (action === 'move') return frame([h('path', { key: 'a', d: 'M2.6 7h8.2M7.6 3.8 10.8 7l-3.2 3.2' })]);
            if (action === 'openSession') {
              return frame([
                h('path', { key: 'a', d: 'M8.2 2.6H4.2a1.6 1.6 0 0 0-1.6 1.6v6a1.6 1.6 0 0 0 1.6 1.6h6a1.6 1.6 0 0 0 1.6-1.6V6.4' }),
                h('path', { key: 'b', d: 'M8.6 2.6h3v3M11.3 2.9 7.4 6.8' }),
              ]);
            }
            if (action === 'delete') {
              return frame([
                h('path', { key: 'a', d: 'M3.4 4.4h7.2' }),
                h('path', { key: 'b', d: 'M5 4.4V2.8h4v1.6M4.4 4.4 5 11.4h4l.6-7' }),
              ]);
            }
            // start / continue design and build all mean "run this stage".
            return frame([h('path', { key: 'play', d: 'M4.4 2.6 11 7l-6.6 4.4z', fill: 'currentColor', stroke: 'none' })]);
          };

          /**
           * Task type. These have to survive a 14px box at arm's length, so the
           * shapes are simple silhouettes with a 2px stroke or a solid fill —
           * an outline drawing at 12px reads as a smudge, which is exactly why
           * the first version failed.
           */
          const typeGlyph = (kind) => {
            const frame = (children, filled) =>
              h(
                'svg',
                {
                  viewBox: '0 0 14 14',
                  'aria-hidden': true,
                  fill: filled === true ? 'currentColor' : 'none',
                  stroke: filled === true ? 'none' : 'currentColor',
                  strokeWidth: 2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                },
                children,
              );
            if (kind === 'bug') {
              // A solid body does the silhouette work; the legs stay strokes.
              return frame([
                h('ellipse', { key: 'body', cx: 7, cy: 7.9, rx: 2.5, ry: 3, fill: 'currentColor', stroke: 'none' }),
                h('path', { key: 'antenna', d: 'M5.3 4.5 6.3 5.7M8.7 4.5 7.7 5.7' }),
                h('path', { key: 'legs', d: 'M4.6 7.4H3M11 7.4H9.4M4.9 10.1 3.5 11M9.1 10.1 10.5 11' }),
              ]);
            }
            if (kind === 'refactor') {
              return frame([
                h('path', { key: 'top', d: 'M2.6 5h7.6M7.9 3 10 5 7.9 7' }),
                h('path', { key: 'bottom', d: 'M11.4 9H3.8M6.1 7 4 9l2.1 2' }),
              ]);
            }
            if (kind === 'docs') {
              return frame([
                h('path', { key: 'page', d: 'M3.8 2h4.2l2.2 2.2V12H3.8z' }),
                h('path', { key: 'fold', d: 'M8 2v2.2h2.2' }),
                h('path', { key: 'lines', d: 'M5.8 7.2h2.4M5.8 9.6h2.4' }),
              ]);
            }
            return frame([
              h('path', { key: 'spark', d: 'M7 1.8 8.6 5.4 12.2 7 8.6 8.6 7 12.2 5.4 8.6 1.8 7 5.4 5.4z' }),
            ], true);
          };

          const actionLabel = (action) => t('action.' + action);

          /** Recorded facts, always both, so the meta line never grows a new
           *  element: 0 is shown, dimmed, instead of disappearing. */
          const facts = (task) => {
            const steps = task.steps === undefined ? 0 : task.steps;
            const files = task.files === undefined ? 0 : task.files;
            const counter = (key, glyph, value, unit) =>
              h(
                'span',
                { className: 'dsh-board-chip is-fact', key, title: value + ' ' + t(unit) },
                glyph,
                h('span', { className: 'dsh-board-chip-num' + (value === 0 ? ' is-zero' : '') }, String(value)),
              );
            return [
              counter('steps', stepsGlyph(), steps, 'meta.steps'),
              counter('files', filesGlyph(), files, 'meta.files'),
            ];
          };

          /** A note is a locale key (`note.*`) or raw text; it rides the status
           *  dialog, so the card body stays a fixed two-line block. */
          const noteText = (task) => {
            if (task.note === undefined) return undefined;
            const raw = String(task.note);
            return raw.startsWith('note.') ? t(raw) : raw;
          };
      /** Split-button caret. */
      function caretGlyph() {
        return h(
          'svg',
          {
            viewBox: '0 0 12 12',
            'aria-hidden': true,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.4,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          h('path', { d: 'M4.2 5 6 6.8 7.8 5' }),
        );
      }

          const card = (task, laneId, b) => {
            const state = task.state === undefined ? 'idle' : task.state;
            const status = statusOf(task, state);
            const flagged = task.flag === 'approve' || task.flag === 'review';
            const blocked = task.flag === 'blocked';
            const splittable = b.SPLIT_LANES.has(laneId);
            const primary = task.primary;
            // Split by verb: stop always needs a destination, start always has
            // a target choice, everything else is a plain button.
            const splitKind = primary === 'stop' ? 'dest' : splittable ? 'target' : null;
            const onPrimary = (event) => {
              event.stopPropagation();
              // Without a bound Session there is nowhere to dispatch, so the
              // button itself becomes the target picker.
              if (splittable && b.sessionFor(task) === undefined) {
                b.openMenu(task, 'target', event);
                return;
              }
              if (splitKind === 'dest') {
                b.openStopDialog(task);
                return;
              }
              b.runAction(task, primary);
            };
            return h(
              'article',
              {
                key: task.id,
                'data-task-card': '',
                className:
                  'dsh-board-card is-' +
                  state +
                  (flagged ? ' is-flagged' : '') +
                  (blocked ? ' is-blocked' : '') +
                  (b.drag !== null && b.drag.taskId === task.id ? ' is-dragging' : ''),
                draggable: true,
                onDragStart: (event) => b.onDragStart(event, task.id, laneId),
                onDragEnd: b.onDragEnd,
              },
              h(
                'div',
                { className: 'dsh-board-card-head' },
                h(
                  'span',
                  { className: 'dsh-board-type', title: t('type.' + (task.kind === undefined ? b.KIND_BY_ID[task.id] || 'feature' : task.kind)) },
                  typeGlyph(task.kind === undefined ? b.KIND_BY_ID[task.id] || 'feature' : task.kind),
                ),
                h('span', { className: 'dsh-board-card-id' }, 'T-' + String(task.id).replace(/^t/, '')),
                h('span', { className: 'dsh-board-card-grow' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-board-chip' + (status.tone === 'quiet' ? '' : ' is-' + status.tone),
                    title: t('status.open'),
                    onClick: (event) => {
                      event.stopPropagation();
                      b.openStatusDialog(task, status);
                    },
                  },
                  statusGlyph(status.glyph),
                  status.text,
                  state === 'running' && task.startedAt !== undefined
                    ? h('span', { className: 'dsh-board-card-clock' }, b.formatElapsed(task.startedAt, b.now))
                    : null,
                ),
              ),
              h('span', { className: 'dsh-board-card-title' }, task.title),
              h('div', { className: 'dsh-board-card-meta' }, b.sessionLabel(task, state), facts(task)),
              h(
                'div',
                { className: 'dsh-board-card-foot' },
                // Every action is the same 24px icon button; the primary one is
                // filled. Whether it splits depends on the verb, not on the
                // card's state: stop and start always have a choice attached,
                // pass/reopen never do.
                splitKind === null
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-board-iconbtn is-primary',
                        title: actionLabel(primary),
                        'aria-label': actionLabel(primary),
                        onClick: onPrimary,
                      },
                      actionGlyph(primary),
                    )
                  : h(
                      'div',
                      { className: 'dsh-board-split' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-board-iconbtn is-primary',
                          title: actionLabel(primary),
                          'aria-label': actionLabel(primary),
                          onClick: onPrimary,
                        },
                        actionGlyph(primary),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-board-split-caret',
                          title: splitKind === 'target' ? t('action.pickTarget') : t('action.pickLane'),
                          'aria-label': splitKind === 'target' ? t('action.pickTarget') : t('action.pickLane'),
                          onClick: (event) => {
                            event.stopPropagation();
                            b.openMenu(task, splitKind, event);
                          },
                        },
                        caretGlyph(),
                      ),
                    ),
                // "Return" is a split button on every lane that has one: the
                // left half goes to the default stage, the caret lists the rest.
                b.RETURN_DEFAULT[laneId] === undefined
                  ? null
                  : h(
                      'div',
                      { className: 'dsh-board-split' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-board-iconbtn',
                          title: actionLabel('return') + ' ' + t('lane.' + b.RETURN_DEFAULT[laneId]),
                          'aria-label': t('action.returnTo') + ' ' + t('lane.' + b.RETURN_DEFAULT[laneId]),
                          onClick: (event) => {
                            event.stopPropagation();
                            moveCardTo(task.id, b.RETURN_DEFAULT[laneId]);
                          },
                        },
                        actionGlyph('return'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-board-split-caret',
                          title: t('action.pickBack'),
                          'aria-label': t('action.pickBack'),
                          onClick: (event) => {
                            event.stopPropagation();
                            b.openMenu(task, 'back', event);
                          },
                        },
                        caretGlyph(),
                      ),
                    ),
                (task.secondary === undefined ? [] : task.secondary).map((action) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      key: action,
                      className: 'dsh-board-iconbtn',
                      title: actionLabel(action),
                      'aria-label': actionLabel(action),
                      onClick: (event) => {
                        event.stopPropagation();
                        if (action === 'openSession') {
                          b.jumpToSession(b.sessionFor(task));
                          return;
                        }
                        b.runAction(task, action);
                      },
                    },
                    actionGlyph(action),
                  ),
                ),
                h('span', { className: 'dsh-board-card-grow' }),
                // Edit is a property of a task, not of a stage: every card has it.
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-board-iconbtn',
                    title: actionLabel('edit'),
                    'aria-label': actionLabel('edit'),
                    onClick: (event) => {
                      event.stopPropagation();
                      b.runAction(task, 'edit');
                    },
                  },
                  actionGlyph('edit'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-board-iconbtn is-danger',
                    title: actionLabel('delete'),
                    'aria-label': actionLabel('delete'),
                    onClick: (event) => {
                      event.stopPropagation();
                      b.runAction(task, 'delete');
                    },
                  },
                  actionGlyph('delete'),
                ),
              ),
            );
          };

      return { renderCard: card, actionGlyph, actionLabel, noteText };
    }

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

function boardComponent(deps) {
  const { t, useLocaleRevision, ctx, css, openBoardTab, view, data, actions: actionsFactory } = deps;

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
  return { Board: BoardBody };
}

    /** Wire the board's own view, data and actions, then hand back the tab body. */
    function createBoard(deps) {
      const view = createView({ t: deps.t });
      const data = {
        INITIAL_LANES,
        KIND_BY_ID,
        LANE_ACCENT,
        SPLIT_LANES,
        RETURN_DEFAULT,
        RETURN_OPTIONS,
        indexAt,
        moveTask,
        formatElapsed,
        rankOf,
        sortLanes,
      };
      return boardComponent({ ...deps, view, data, actions: createActions });
    }

    return { createBoard };
  },
});
