/**
 * Task board — presentation.
 *
 * Cards, the status vocabulary and the glyphs. Everything here is a pure
 * function of its arguments plus the API object the board hands in, so this
 * chunk can be read and changed without touching the lane state machine.
 */
window.__ModuleLoader__.load({
  id: '@local/task-board',
  chunk: 'client.board.view.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

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

    return { createView };
  },
});