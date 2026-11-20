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

    /** Product-wide guide page restyle: the guide renders as a centred grid of
     *  square tiles. */
const GUIDE_CSS = `
[data-sidebar-right-guide][data-sidebar-right-guide]{
--dsh-guide-tile-min:88px;
--dsh-guide-tile-max:112px;
--dsh-guide-tile-gap:12px;
--dsh-guide-sheen:rgba(255,255,255,.30);
box-sizing:border-box;
display:grid;
/* fit-content, not 100%: the track count must follow the number of cards, not
   the panel width. With a full-width box auto-fit sizes tracks from the panel
   (four tracks in a four-track-wide panel) and a shorter row looks left-aligned;
   shrinking the box to its content keeps three cards three tracks, and
   margin-inline:auto centres the group. */
width:fit-content;
min-width:0;
grid-template-columns:repeat(auto-fit,minmax(var(--dsh-guide-tile-min),var(--dsh-guide-tile-max)));
justify-content:center;
align-content:center;
gap:var(--dsh-guide-tile-gap);
min-height:100%;
padding:24px 20px;
max-width:min(100%,calc(4 * var(--dsh-guide-tile-max) + 3 * var(--dsh-guide-tile-gap) + 40px));
margin-inline:auto;
}
[data-sidebar-right-guide][data-sidebar-right-guide]::after{content:none;}
[data-sidebar-right-guide] > span[aria-hidden="true"]{grid-column:1/-1;justify-self:center;margin:0 0 6px;}
body[data-ds-dark-theme] [data-sidebar-right-guide][data-sidebar-right-guide]{--dsh-guide-sheen:rgba(255,255,255,.12);}
/* One tile for every card. The shell sits on the grid item, so a provider's
   card (the terminal ships one) and the guide's own More card are framed
   exactly like ours — no square/wide mixture. */
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]){
box-sizing:border-box;
position:relative;
min-width:0;
min-height:0;
display:flex;
aspect-ratio:1/1;
border:.5px solid var(--dsw-alias-border-l1);
border-radius:18px;
background-color:var(--dsw-alias-bg-layer-1);
background-image:linear-gradient(135deg,transparent 18%,var(--dsh-guide-sheen) 44%,rgba(255,255,255,.05) 56%,transparent 74%);
box-shadow:inset 0 1px 0 var(--dsh-guide-sheen),0 1px 2px rgba(0,0,0,.05);
overflow:hidden;
transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease;
}
@media (hover:hover){
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]):hover{
transform:translateY(-2px);
border-color:var(--dsw-alias-brand-primary);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px rgba(76,111,231,.22),inset 0 1px 0 var(--dsh-guide-sheen);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent),inset 0 1px 0 var(--dsh-guide-sheen);
}
}
/* The card inside fills the tile and is laid out like the most complex one:
   icon on its own row, then a single-line title. The same rule is expressed
   for the card root at the tile's child level and for a keyed entry card at
   any depth, so a slot wrapper between them changes nothing. */
[data-sidebar-right-guide] > * > *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry]{
box-sizing:border-box;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:8px;
width:100%;
height:100%;
min-width:0;
min-height:0;
padding:10px 8px;
text-align:center;
border:0;
border-radius:inherit;
background:transparent;
box-shadow:none;
color:var(--dsw-alias-label-primary);
font:inherit;
}
[data-sidebar-right-guide] > * > * > span:first-of-type,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type{width:34px;height:34px;flex:none;color:var(--dsw-alias-label-secondary);}
[data-sidebar-right-guide] > * > * > span:first-of-type svg,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type svg{width:100%;height:100%;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2){display:flex;flex:0 0 auto;flex-direction:column;align-items:center;gap:2px;width:100%;min-width:0;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:first-child,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:first-child{min-width:0;max-width:100%;font-size:12px;line-height:1.35;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:not(:first-child),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:not(:first-child){display:none;}
/* The shortcut rides under the title as a quiet third line instead of being
   hidden: the tile has the room, and hiding it left the space looking reserved. */
[data-sidebar-right-guide] > * > * > span:nth-of-type(3),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3){
display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:2px;
width:100%;min-width:0;overflow:hidden;white-space:nowrap;
font-size:9px;line-height:1;color:var(--dsw-alias-label-secondary);
}
[data-sidebar-right-guide] > * > * > span:nth-of-type(3) *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3) *,
[data-sidebar-right-guide] kbd{
border:0;background:transparent;box-shadow:none;padding:0;margin:0;
min-width:0;font:inherit;font-size:9px;line-height:1;color:inherit;
}
`;

    /** Board tokens plus every surface the board draws. */
    const CSS = `
/* Linear's palette lives on the board root so every surface inside it — cards,
   menus, popovers — reads from the same tokens. */
.dsh-board-root{
--tb-ink:#000000;--tb-ink-muted:rgba(0,0,0,.66);--tb-ink-subtle:rgba(0,0,0,.48);
--tb-canvas:#ffffff;--tb-surface:#f6f7f7;--tb-control:#f6f7f7;--tb-control-hover:#ececee;
--tb-hairline:rgba(0,0,0,.10);--tb-hairline-strong:rgba(0,0,0,.18);
--tb-accent:#5e6ad2;--tb-run:#5e6ad2;--tb-wait:#a35c00;--tb-error:#b3242a;--tb-queue:#6b6f8f;
box-sizing:border-box;display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;min-width:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
body[data-ds-dark-theme] .dsh-board-root{
--tb-ink:#f7f8f8;--tb-ink-muted:#d0d6e0;--tb-ink-subtle:#8a8f98;
--tb-canvas:#0f1011;--tb-surface:#18191a;--tb-control:#18191a;--tb-control-hover:#1f2021;
--tb-hairline:#23252a;--tb-hairline-strong:#34343a;
--tb-accent:#828fff;--tb-run:#828fff;--tb-wait:#f2994a;--tb-error:#e5484d;--tb-queue:#9aa0cc;
}
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
/* The list is the scroll container, so its padding is what stops a hovered
   card's 1px lift and shadow from being clipped at the first/last position. */
/* The list is the scroll container. It is pulled out over the lane's right
   padding so its scrollbar sits against the lane edge instead of floating in
   the middle of the gutter; the content keeps the same inset through padding. */
.dsh-board-list{display:flex;flex:1 1 auto;flex-direction:column;gap:6px;min-height:44px;margin-right:-8px;padding:3px 8px 3px 2px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--tb-hairline-strong) transparent;}
.dsh-board-list::-webkit-scrollbar{width:8px;}
.dsh-board-list::-webkit-scrollbar-track{background:transparent;}
.dsh-board-list::-webkit-scrollbar-thumb{background:var(--tb-hairline-strong);background-clip:content-box;border:2px solid transparent;border-radius:999px;}
.dsh-board-list::-webkit-scrollbar-thumb:hover{background:var(--tb-ink-subtle);background-clip:content-box;}
/* ---- card ----------------------------------------------------------------
   Three bands, fixed: header (id · status), body (title · session), actions.
   No leading colour rail — the lane already owns the column, and a rail on
   every card just paints the column twice. The one state channel is the 2px
   top edge; a quiet card carries a neutral line so colour only means
   something. While running that edge becomes an indeterminate slider. */
.dsh-board-card{
position:relative;box-sizing:border-box;display:flex;flex-direction:column;
/* A card keeps its own height: in a scrolling flex column the default
   flex-shrink would squeeze every card and clip its text once the lane fills. */
flex:0 0 auto;
padding:12px 12px 11px;
border:1px solid var(--tb-hairline);border-radius:12px;
background:var(--tb-canvas);color:var(--tb-ink);
box-shadow:inset 0 2px 0 var(--tb-state,var(--tb-hairline-strong));
cursor:grab;overflow:hidden;
transition:border-color .15s ease;
}
.dsh-board-card.is-running{--tb-state:color-mix(in srgb,var(--tb-run) 26%,transparent);}
.dsh-board-card.is-running::after{content:"";position:absolute;top:0;left:0;height:2px;width:34%;background:var(--tb-run);animation:tb-slide 1.35s cubic-bezier(.45,0,.25,1) infinite;}
.dsh-board-card.is-awaiting{--tb-state:var(--tb-wait);}
.dsh-board-card.is-queued{--tb-state:var(--tb-queue);}
.dsh-board-card.is-error{--tb-state:var(--tb-error);}
.dsh-board-card.is-flagged{--tb-state:var(--tb-wait);}
.dsh-board-card.is-blocked{--tb-state:var(--tb-error);}
@keyframes tb-slide{from{transform:translateX(-100%)}to{transform:translateX(300%)}}
@media (prefers-reduced-motion:reduce){
.dsh-board-card.is-running::after{animation:none;width:100%;opacity:.55;}
}
@media (hover:hover){
.dsh-board-card:hover{border-color:var(--tb-hairline-strong);}
}
.dsh-board-card:active{cursor:grabbing;}
.dsh-board-card.is-dragging{opacity:.5;}
.dsh-board-marker{height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary);}
.dsh-board-lane-tools{display:flex;flex:none;align-items:center;gap:4px;}
/* Tinted with the lane's own accent: an opaque neutral chip sat on a tinted
   lane like a sticker from another board. */
.dsh-board-add{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;width:20px;height:20px;margin:0;padding:0;border:1px solid color-mix(in srgb,var(--dsh-lane-accent,var(--tb-hairline)) 38%,transparent);border-radius:6px;background:color-mix(in srgb,var(--dsh-lane-accent,var(--tb-hairline)) 14%,transparent);color:var(--dsh-lane-accent,var(--tb-ink));cursor:pointer;}
.dsh-board-add:hover{background:color-mix(in srgb,var(--dsh-lane-accent,var(--tb-hairline)) 24%,transparent);border-color:color-mix(in srgb,var(--dsh-lane-accent,var(--tb-hairline)) 55%,transparent);}
.dsh-board-add svg{width:12px;height:12px;display:block;}
.dsh-board-compose{display:flex;flex:none;gap:6px;margin-top:2px;}
.dsh-board-compose-input{box-sizing:border-box;flex:1 1 auto;min-width:0;padding:6px 8px;border:1px solid var(--tb-accent);border-radius:10px;background:var(--tb-canvas);color:var(--tb-ink);font:inherit;font-size:12px;line-height:1.3;}
.dsh-board-compose-input::placeholder{color:var(--tb-ink-subtle);}
.dsh-board-compose-input:focus{outline:2px solid color-mix(in srgb,var(--tb-accent) 35%,transparent);outline-offset:0;}
.dsh-board-empty{height:40px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;}
/* Radius tokens measure 4/8/12/16/20/28px. On a 24px control, --dsw-radius-md
   (12px) is exactly half the box — a circle — while the menu surface it was
   copied from is a large plane where the same token reads as a soft corner.
   --dsw-radius-sm (8px) is the proportion a 24px icon control wants. */
.dsh-board-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
.dsh-board-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-board-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-board-entry svg{width:15px;height:15px;display:block;}
/* ---- card internals -------------------------------------------------------
   Three bands: header (id · status), body (title · session+facts), actions.
   Every band is always rendered, in that order, so any card on the board can be
   read at the same coordinates as any other. */
.dsh-board-card-head{display:flex;align-items:center;gap:6px;min-height:20px;}
.dsh-board-card-id{flex:none;font:400 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2px;color:var(--tb-ink-subtle);}
.dsh-board-type{display:flex;flex:none;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:var(--tb-surface);color:var(--tb-ink-muted);}
.dsh-board-type svg{width:14px;height:14px;display:block;}
.dsh-board-card-grow{flex:1 1 auto;min-width:0;}
.dsh-board-chip{display:inline-flex;flex:none;align-items:center;gap:5px;margin:0;padding:4px 8px;border:0;border-radius:999px;background:var(--tb-surface);color:var(--tb-ink-subtle);font:inherit;font-size:12px;font-weight:500;line-height:1;white-space:nowrap;cursor:pointer;}
.dsh-board-chip svg{flex:none;width:12px;height:12px;display:block;}
.dsh-board-chip.is-run{background:color-mix(in srgb,var(--tb-run) 16%,transparent);color:var(--tb-run);}
.dsh-board-chip.is-wait{background:color-mix(in srgb,var(--tb-wait) 16%,transparent);color:var(--tb-wait);}
.dsh-board-chip.is-error{background:color-mix(in srgb,var(--tb-error) 16%,transparent);color:var(--tb-error);}
.dsh-board-chip.is-queued{background:color-mix(in srgb,var(--tb-queue) 16%,transparent);color:var(--tb-queue);}
/* Two dots on one baseline, fading in alternation: activity without pretending
   to be progress. */
.dsh-board-live{animation:tb-live 1.15s ease-in-out infinite;}
.dsh-board-live.is-b{animation-delay:.575s;}
@keyframes tb-live{0%,65%,100%{opacity:.2}30%{opacity:1}}
@media (prefers-reduced-motion:reduce){.dsh-board-live{animation:none;opacity:1}}
/* Facts are counters, not pills: a second filled shape next to the status
   chip would compete with it. */
.dsh-board-chip.is-fact{background:transparent;padding:4px 2px;font-weight:400;color:var(--tb-ink-subtle);}
.dsh-board-chip-num{font-variant-numeric:tabular-nums;}
.dsh-board-chip-num.is-zero{opacity:.45;}
.dsh-board-card-clock{font:400 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;opacity:.85;}
.dsh-board-card-title{margin-top:8px;font-size:14px;font-weight:500;line-height:1.45;letter-spacing:-.1px;color:var(--tb-ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;}
.dsh-board-card-meta{display:flex;align-items:center;gap:10px;margin-top:8px;min-width:0;font-size:12px;line-height:1.3;color:var(--tb-ink-subtle);}
.dsh-board-session{display:flex;flex:0 1 auto;align-items:center;gap:4px;min-width:0;margin:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;}
.dsh-board-session > span{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.dsh-board-session svg{flex:none;width:10px;height:10px;}
.dsh-board-session.is-empty{opacity:.8;}
.dsh-board-session.is-archived{opacity:.7;}
.dsh-board-session.is-link{cursor:pointer;}
.dsh-board-session.is-link:hover{color:var(--tb-ink);}
.dsh-board-card-foot{display:flex;align-items:center;gap:4px;margin-top:12px;padding-top:10px;border-top:1px solid var(--tb-hairline);}
.dsh-board-split{display:inline-flex;flex:none;min-width:0;}
.dsh-board-iconbtn{box-sizing:border-box;flex:none;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;margin:0;padding:0;border:1px solid var(--tb-hairline);border-radius:8px;background:var(--tb-surface);color:var(--tb-ink-subtle);cursor:pointer;transition:background-color .12s ease,color .12s ease,border-color .12s ease;}
.dsh-board-iconbtn svg{width:14px;height:14px;display:block;}
.dsh-board-iconbtn:hover{background:var(--tb-control-hover);border-color:var(--tb-hairline-strong);color:var(--tb-ink);}
/* One background, one border for every action. Rank is carried by icon colour
   alone, so a row never looks stitched together from two styles. */
.dsh-board-iconbtn.is-primary{color:var(--tb-ink);}
.dsh-board-iconbtn.is-danger{color:var(--tb-error);}
.dsh-board-iconbtn.is-danger:hover{background:color-mix(in srgb,var(--tb-error) 12%,var(--tb-surface));border-color:var(--tb-hairline-strong);color:var(--tb-error);}
.dsh-board-split .dsh-board-iconbtn{border-radius:8px 0 0 8px;}
.dsh-board-split .dsh-board-iconbtn{border-right:0;}
.dsh-board-split-caret{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;width:16px;height:24px;margin:0;padding:0;border:1px solid var(--tb-hairline);border-radius:0 8px 8px 0;background:var(--tb-surface);color:var(--tb-ink-subtle);cursor:pointer;}
.dsh-board-split-caret:hover{background:var(--tb-control-hover);border-color:var(--tb-hairline-strong);color:var(--tb-ink);}
.dsh-board-split-caret svg{width:12px;height:12px;display:block;}
.dsh-board-iconbtn:focus-visible,.dsh-board-split-caret:focus-visible{outline:2px solid var(--tb-accent);outline-offset:1px;}
/* Target picker behind the split caret. Fixed-positioned so the card's
   overflow:hidden cannot clip it. */
.dsh-board-menu-backdrop{position:fixed;inset:0;z-index:9998;}
.dsh-board-menu{position:fixed;z-index:9999;min-width:186px;padding:4px;border:1px solid var(--tb-hairline-strong);border-radius:10px;background:var(--tb-canvas);box-shadow:0 12px 30px rgba(0,0,0,.30);}
.dsh-board-menu-item{display:flex;width:100%;align-items:center;gap:6px;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:var(--tb-ink);font:inherit;font-size:12px;line-height:1.3;text-align:left;cursor:pointer;}
.dsh-board-menu-item:hover{background:var(--tb-surface);}
.dsh-board-menu-item.is-current{color:var(--tb-ink-subtle);cursor:default;}
.dsh-board-menu-item.is-current:hover{background:transparent;}
.dsh-board-menu-item svg{flex:none;width:12px;height:12px;display:block;}
.dsh-board-menu-title{padding:4px 8px 6px;font-size:11px;line-height:1.3;color:var(--tb-ink-subtle);}
/* One dialog for every simulated action: the prototype must answer a click,
   even when it cannot do the thing. */
.dsh-board-dialog-backdrop{position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.38);}
.dsh-board-dialog{box-sizing:border-box;width:min(300px,100%);padding:14px;border:1px solid var(--tb-hairline-strong);border-radius:12px;background:var(--tb-canvas);color:var(--tb-ink);box-shadow:0 18px 48px rgba(0,0,0,.42);}
.dsh-board-dialog-title{margin:0 0 8px;font-size:14px;font-weight:600;line-height:1.4;}
.dsh-board-dialog-line{margin:0 0 6px;font-size:12px;line-height:1.55;color:var(--tb-ink-muted);}
.dsh-board-dialog-line b{font-weight:500;color:var(--tb-ink);}
.dsh-board-dialog-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:12px;}
.dsh-board-dialog-btn{box-sizing:border-box;min-height:26px;margin:0;padding:4px 10px;border:1px solid var(--tb-hairline-strong);border-radius:8px;background:transparent;color:var(--tb-ink);font:inherit;font-size:12px;line-height:1.2;cursor:pointer;}
.dsh-board-dialog-btn:hover{background:var(--tb-surface);}
.dsh-board-dialog-btn.is-primary{background:var(--tb-control);font-weight:500;}
.dsh-board-dialog-btn.is-link{border-color:transparent;color:var(--tb-accent);}
.dsh-board-dialog-btn.is-link:hover{background:transparent;text-decoration:underline;}
`;

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

        /** Both sheets are global, so they ride the frame-wide seat. */
        function GuideStyle() {
          return h('style', null, GUIDE_CSS + CSS);
        }

        let board = null;
        let boardRequest = null;

        /**
         * The board is a package-local chunk, fetched when the tab first shows.
         * A failure renders its own text instead of an empty tab: a blank panel
         * is indistinguishable from "the board has no cards".
         */
        function BoardBody(props) {
          useLocaleRevision();
          const [ready, setReady] = React.useState(board === null ? null : { Board: board });
          const [failure, setFailure] = React.useState('');
          React.useEffect(() => {
            if (ready !== null || failure !== '') return undefined;
            let alive = true;
            if (boardRequest === null) {
              boardRequest = require.async('./client.board.js').then((chunkModule) => {
                board = chunkModule.createBoard({
                  t,
                  useLocaleRevision,
                  ctx,
                  css: CSS,
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
