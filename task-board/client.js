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

function createBoard(deps) {
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

        const dataApi = {
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

        const viewApi = createView({ t });
        const boardApi = createBoard({
          t,
          useLocaleRevision,
          ctx,
          css: CSS,
          view: viewApi,
          data: dataApi,
          actions: createActions,
          openBoardTab: () => {
            if (controller !== undefined) controller.openTab(KIND);
          },
        });
        const BoardBody = boardApi.Board;

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