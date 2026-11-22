/**
 * Services — styles.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.css.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createCss(d) {
      const { t } = d;

    const CSS = `
.dsh-svc-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;height:100%;min-height:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
.dsh-svc-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;}
.dsh-svc-head-actions{display:flex;flex:none;align-items:center;gap:6px;}
.dsh-svc-dir{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;}
.dsh-svc-refresh{flex:none;box-sizing:border-box;height:26px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}
.dsh-svc-refresh:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-note{flex:none;margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
/* A group heading is a sticky bar: it stays pinned while its own scripts scroll
   under it, and clicking it collapses the group. Negative inline margins let it
   span the list's padding so nothing shows through beside the label. */
.dsh-svc-group{position:sticky;top:-2px;z-index:2;box-sizing:border-box;display:flex;flex:none;align-items:center;gap:5px;margin:0 -12px;padding:6px 12px;border:0;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:1.3;text-align:left;cursor:pointer;}
.dsh-svc-group:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);}
.dsh-svc-group.is-compact{margin:0;padding:4px 7px;border-bottom:0;border-radius:var(--dsw-radius-sm);}
.dsh-svc-group.is-compact:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dsh-svc-chevron{flex:none;width:10px;height:10px;transition:transform .15s ease;}
.dsh-svc-group.is-open .dsh-svc-chevron{transform:rotate(90deg);}
.dsh-svc-search{flex:none;display:flex;align-items:center;padding:2px 4px 4px;}
.dsh-svc-search input{box-sizing:border-box;width:100%;height:26px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none;}
.dsh-svc-search input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none;}
.dsh-svc-kind{flex:none;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:9px;line-height:1.7;text-transform:uppercase;letter-spacing:.04em;}
.dsh-svc-group-name{min-width:0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-group-dir{min-width:0;font-size:10px;font-family:var(--dsh-font-family-code,monospace);opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-count{margin-left:auto;flex:none;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:10px;font-variant-numeric:tabular-nums;}
.dsh-svc-notice{margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;}
.dsh-svc-notice.is-warn{color:var(--dsw-alias-state-warn-primary,#d97706);}
.dsh-svc-busy{margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}
/* One row owns one surface: the row, its output and its editor share a single
   border, so an expanded row reads as "this row grew" rather than as a second
   box that happens to sit below it. */
.dsh-svc-entry-block{display:flex;flex-direction:column;gap:0;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}
.dsh-svc-entry-block.is-running{border-left-color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-entry-block.is-overridden{border-left-color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-entry-block.is-focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);}
.dsh-svc-entry-block > .dsh-svc-card{border:0;border-top:1px solid var(--dsw-alias-border-l1);border-radius:0;background:transparent;}
.dsh-svc-chip{flex:none;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:9px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.dsh-svc-chip.is-running{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-chip.is-done{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2ea043) 14%,transparent);color:var(--dsw-alias-state-success-primary,#2ea043);}
.dsh-svc-run{margin:0;padding:2px 12px 0;display:flex;flex-direction:column;gap:4px;}
.dsh-svc-run-head{display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}
.dsh-svc-run-row{box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);font-size:11px;}
.dsh-svc-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}
.dsh-svc-dot.is-running{background:var(--dsw-alias-state-warn-primary);}
.dsh-svc-dot.is-exited{background:var(--dsw-alias-label-secondary);}
  /* A non-zero exit is a failure, not a warning: make the two states tell apart. */
  .dsh-svc-chip.is-killed{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 12%,transparent);color:var(--dsw-alias-label-secondary);}
  .dsh-svc-chip.is-done.is-failed{background:color-mix(in srgb,var(--dsw-alias-state-danger-primary,#e5484d) 14%,transparent);color:var(--dsw-alias-state-danger-primary,#e5484d);}
.dsh-svc-dot.is-failed{background:var(--dsw-alias-state-error-primary);}
.dsh-svc-run-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* Stop control mirrors the background-job stop button: a 20px square that turns
   red on hover, and expands into a labelled confirm while armed. */
.dsh-svc-stop{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:20px;height:20px;padding:0;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 50%,transparent);border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;}
.dsh-svc-stop:hover,.dsh-svc-stop:focus-visible{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 70%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-stop.is-armed,.dsh-svc-stop.is-armed:hover,.dsh-svc-stop.is-armed:focus-visible{width:auto;padding:0 7px;gap:4px;border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 60%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 24%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-stop-label{white-space:nowrap;font-size:11px;line-height:18px;}
.dsh-svc-stop svg{width:10px;height:10px;display:block;}
/* Restart is the neutral twin of stop: same 20px control, but in the business
   colour because it ends one run only to start it again. It expands into a
   labelled confirm while armed, exactly like stop. */
.dsh-svc-restart{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:20px;height:20px;padding:0;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 8%,transparent);color:var(--dsw-alias-state-business-primary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;}
.dsh-svc-restart:hover,.dsh-svc-restart:focus-visible{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 70%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent);color:var(--dsw-alias-state-business-primary);}
.dsh-svc-restart.is-armed,.dsh-svc-restart.is-armed:hover,.dsh-svc-restart.is-armed:focus-visible{width:auto;padding:0 7px;gap:4px;border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 65%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 22%,transparent);color:var(--dsw-alias-state-business-primary);}
.dsh-svc-restart-label{white-space:nowrap;font-size:11px;line-height:18px;}
.dsh-svc-restart svg{width:10px;height:10px;display:block;}
.dsh-svc-stop:disabled,.dsh-svc-restart:disabled{opacity:.6;cursor:default;}
.dsh-svc-drawer{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);}
.dsh-svc-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-drawer-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-font-family-code,monospace);}
.dsh-svc-log{grid-column:1 / -1;display:flex;flex:none;flex-direction:column;margin:0;border:0;border-top:1px solid var(--dsw-alias-border-l1);border-radius:0;overflow:hidden;background:var(--dsw-alias-bg-base);}
.dsh-svc-log-head{display:flex;align-items:center;justify-content:flex-start;gap:6px;padding:4px 8px;background:var(--dsw-alias-bg-layer-2);border-bottom:.5px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-log-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:500;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-log-body{box-sizing:border-box;margin:0;padding:8px 10px;max-height:240px;overflow:auto;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--dsh-font-family-code,monospace);font-size:10.5px;line-height:1.6;white-space:pre;tab-size:2;scrollbar-width:thin;}
.dsh-svc-list{display:flex;flex:1 1 auto;flex-direction:column;gap:4px;min-height:0;padding:2px 12px 12px;overflow-y:auto;}
.dsh-svc-row{box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:10px;row-gap:0;padding:10px 12px;border:0;border-radius:0;background:transparent;text-align:left;}
.dsh-svc-row-text{display:flex;flex:1 1 auto;flex-direction:column;gap:3px;min-width:0;}
.dsh-svc-name-line{display:flex;align-items:center;gap:6px;min-width:0;}
/* Where a pinned row lives, without spending a third line on it: the pinned
   area has no group heading, and a taller row than the one it was pinned
   from reads as a different kind of entry. */
.dsh-svc-origin{min-width:0;max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-font-family-code,monospace);font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-actions{display:flex;flex:none;align-items:center;gap:4px;margin-left:auto;}
.dsh-svc-lastline{box-sizing:border-box;min-width:0;padding-left:6px;border-left:2px solid var(--dsw-alias-border-l2);font-family:var(--dsh-font-family-code,monospace);font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-lastline::before{content:'↳ ';}
.dsh-svc-row:hover{background:var(--dsw-alias-bg-layer-3);}
/* One-shot flash when a toast opens the panel on a row. */
.dsh-svc-row.is-focus{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);}
.dsh-svc-search-row{flex:none;display:flex;width:100%;box-sizing:border-box;padding:0 12px 8px;}
.dsh-svc-search-input{flex:1 1 auto;width:100%;height:26px;box-sizing:border-box;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;}
.dsh-svc-search-input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none;}
.dsh-svc-variant{height:26px;max-width:110px;box-sizing:border-box;padding:0 20px 0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background-color:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16' fill='none'><path d='M4 6.5 8 10.5 12 6.5' stroke='%238a8f98' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/></svg>");background-repeat:no-repeat;background-position:right 6px center;background-size:10px 10px;}
.dsh-svc-pinned-head{display:flex;align-items:center;gap:6px;padding:8px 12px 2px;font-size:10px;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-pinned-title{letter-spacing:.04em;}
.dsh-svc-group-count{opacity:.7;}
.dsh-svc-chip.is-overridden{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
/* ---- start-configuration card -------------------------------------------
   Linear's surface ladder + hairlines: no shadows, a 4px rhythm, 8px controls,
   and the label above the control — the fixed 56px label column was what made
   this form feel cramped. */
.dsh-svc-card{display:flex;flex-direction:column;min-height:180px;max-height:max(240px,calc(100vh - 200px));max-height:max(240px,calc(100dvh - 200px));border:1px solid var(--dsw-alias-border-l2,#23252a);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#0f1011);overflow:hidden;color:var(--dsw-alias-label-primary,#f7f8f8);}
.dsh-svc-card-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 12px 10px;}
/* Only this scrolls. A form taller than the sidebar must not push Save off screen. */
.dsh-svc-card-body{display:flex;flex:1 1 auto;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;}
.dsh-svc-card-titles{display:flex;flex-direction:column;gap:3px;min-width:0;}
.dsh-svc-card-eyebrow{font-size:11px;line-height:1.3;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#8a8f98);}
.dsh-svc-card-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:1.2;font-weight:500;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#f7f8f8);font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);}
.dsh-svc-card-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#8a8f98);font:inherit;font-size:16px;line-height:1;cursor:pointer;}
.dsh-svc-card-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#f7f8f8);}
.dsh-svc-card-close svg{width:12px;height:12px;display:block;}
.dsh-svc-mini svg{width:12px;height:12px;display:block;}
.dsh-svc-cmd{margin:0 12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#23252a);border-radius:8px;background:var(--dsw-alias-bg-base,#141516);}
.dsh-svc-cmd-head{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px;line-height:1.3;color:var(--dsw-alias-label-tertiary,#62666d);}
.dsh-svc-cmd-text{display:block;font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary,#f7f8f8);word-break:break-all;}
.dsh-svc-section{display:flex;flex-direction:column;gap:12px;padding:16px 12px;}
.dsh-svc-section + .dsh-svc-section{border-top:1px solid var(--dsw-alias-border-l1,#23252a);}
.dsh-svc-section-title{margin:0;font-size:11px;line-height:1.3;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#8a8f98);}
.dsh-svc-field{display:flex;flex-direction:column;gap:6px;min-width:0;}
.dsh-svc-field-label{font-size:12px;line-height:1.35;color:var(--dsw-alias-label-secondary,#8a8f98);}
.dsh-svc-control{display:flex;align-items:center;gap:6px;min-width:0;}
.dsh-svc-input{box-sizing:border-box;flex:1 1 auto;min-width:0;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,#23252a);border-radius:8px;background:var(--dsw-alias-bg-base,#141516);color:var(--dsw-alias-label-primary,#f7f8f8);font:inherit;font-size:13px;}
.dsh-svc-input::placeholder{color:var(--dsw-alias-label-tertiary,#62666d);}
.dsh-svc-input:focus{border-color:var(--dsw-alias-state-business-primary,#5e6ad2);outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary,#5e6ad2) 28%,transparent);}
/* Native select arrows sit on the very edge of a 32px control; draw our own so
   it lines up with the text and leaves the same 10px inset on both sides. */
select.dsh-svc-input{appearance:none;-webkit-appearance:none;padding-right:30px;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none'><path d='M4 6.5 8 10.5 12 6.5' stroke='%238a8f98' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>");background-repeat:no-repeat;background-position:right 10px center;background-size:12px 12px;}
select.dsh-svc-input:disabled{opacity:.55;}
.dsh-svc-textarea{height:64px;min-height:64px;padding:8px 10px;line-height:1.5;resize:vertical;font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;}
.dsh-svc-mini{flex:none;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid var(--dsw-alias-border-l2,#23252a);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#8a8f98);font:inherit;font-size:16px;line-height:1;cursor:pointer;}
.dsh-svc-mini:hover{border-color:var(--dsw-alias-border-l3,#34343a);color:var(--dsw-alias-label-primary,#f7f8f8);}
.dsh-svc-mini.is-active{border-color:var(--dsw-alias-state-business-primary,#5e6ad2);color:var(--dsw-alias-state-business-primary,#5e6ad2);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#5e6ad2) 14%,transparent);}
.dsh-svc-card-actions{flex:none;display:flex;align-items:center;gap:8px;padding:12px 12px 14px;border-top:1px solid var(--dsw-alias-border-l1,#23252a);}
.dsh-svc-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border:1px solid transparent;border-radius:8px;font:inherit;font-size:13px;font-weight:500;line-height:1;cursor:pointer;}
.dsh-svc-btn.is-primary{background:var(--dsw-alias-state-business-primary,#5e6ad2);color:#fff;}
.dsh-svc-btn.is-primary:hover:not(:disabled){filter:brightness(1.12);}
.dsh-svc-btn.is-ghost{border-color:var(--dsw-alias-border-l2,#23252a);background:transparent;color:var(--dsw-alias-label-primary,#f7f8f8);}
.dsh-svc-btn.is-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));}
.dsh-svc-btn:disabled{opacity:.5;cursor:default;}
.dsh-svc-dl-panel{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l2,#23252a);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#141516);}
.dsh-svc-dl-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;line-height:1.3;color:var(--dsw-alias-label-secondary,#8a8f98);}
.dsh-svc-dl-loading{display:flex;align-items:center;gap:8px;min-height:64px;font-size:12px;color:var(--dsw-alias-label-secondary,#8a8f98);}
.dsh-svc-dl-actions{display:flex;align-items:center;gap:10px;min-height:32px;}
.dsh-svc-dl-status{min-width:0;font-size:12px;line-height:1.4;color:var(--dsw-alias-label-secondary,#8a8f98);overflow-wrap:anywhere;}
.dsh-svc-dl-status.is-error{color:var(--dsw-alias-state-error-primary,#ff5c5c);}
.dsh-svc-progress{position:relative;height:4px;border-radius:2px;background:var(--dsw-alias-border-l2,#23252a);overflow:hidden;}
.dsh-svc-progress-fill{position:absolute;inset:0 auto 0 0;background:var(--dsw-alias-state-business-primary,#5e6ad2);transition:width .3s ease;}
.dsh-svc-icon.is-primary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);}
  /* Start is the one affirmative action on a row: green glyph, neutral frame — a
     coloured border would make it a different control from every other icon. */
  .dsh-svc-icon.is-start{color:var(--dsw-alias-state-success-primary,#2ea043);}
  .dsh-svc-icon.is-start:hover{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2ea043) 12%,transparent);color:var(--dsw-alias-state-success-primary,#2ea043);}
  .dsh-svc-icon.is-start:disabled{opacity:.5;}
.dsh-svc-icon.is-pinned{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);}
.dsh-svc-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:26px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);cursor:pointer;}
.dsh-svc-icon:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);}
.dsh-svc-icon svg{width:12px;height:12px;display:block;}
.dsh-svc-name{font-size:12px;line-height:1.3;font-weight:500;}
.dsh-svc-command{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dsh-svc-command::before{content:'$ ';color:var(--dsw-alias-label-tertiary);}
.dsh-svc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:22px 0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);text-align:center;}
.dsh-svc-spinner{width:16px;height:16px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);animation:dsh-svc-spin .8s linear infinite;}
.dsh-svc-spinner.is-small{width:10px;height:10px;border-width:1.5px;}
.dsh-svc-log-body.is-wrap{white-space:pre-wrap;overflow-wrap:anywhere;}
.dsh-svc-icon.is-tiny{width:22px;height:22px;border-radius:6px;}
.dsh-svc-icon.is-tiny svg{width:10px;height:10px;}
.dsh-svc-icon.is-tiny.is-active{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent);color:var(--dsw-alias-state-business-primary);}
@keyframes dsh-svc-spin{to{transform:rotate(360deg);}}
/* The overlay layer is click-through by design, so the dropdown opts back into
   pointer events. */
/* Mirrors the shipped dropdown surface: it sits on bg-base (white in the light
   theme, not the grey bg-overlay), radius-lg, a half-pixel border-l2 and 4px of
   padding. The overlay layer is click-through by design, so the panel opts back
   into pointer events. */
.dsh-svc-menu{position:fixed;z-index:80;pointer-events:auto;box-sizing:border-box;width:300px;max-height:min(60vh,420px);display:flex;flex-direction:column;gap:2px;padding:4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-base);box-shadow:0 10px 28px rgba(0,0,0,.14);}
.dsh-svc-menu-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:4px 7px 2px;font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary);}
.dsh-svc-menu-list{display:flex;flex-direction:column;gap:1px;min-height:0;padding:2px 0;overflow-y:auto;}
.dsh-svc-item{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:4px 7px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}
.dsh-svc-item:hover{background:var(--dsw-alias-bg-layer-2);}
.dsh-svc-item:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px;}
.dsh-svc-item.is-running .dsh-svc-item-name{color:var(--dsw-alias-state-warn-primary);}

.dsh-svc-item-text{display:flex;flex:1 1 auto;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-item-name{font-size:12px;line-height:1.3;}
  .dsh-svc-item-line{display:flex;align-items:center;gap:6px;min-width:0;}
  .dsh-svc-item-line .dsh-svc-item-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .dsh-svc-item-line .dsh-svc-chip{flex:none;}
.dsh-svc-item-command{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-menu-foot{flex:none;padding-top:2px;border-top:1px solid var(--dsw-alias-border-l1);}
.dsh-svc-foot-button{box-sizing:border-box;width:100%;padding:5px 7px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;text-align:left;cursor:pointer;}
.dsh-svc-foot-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
/* Runtime badge: the tool's own pictogram, tinted by that tool's colour, so a
   list of bare command lines still says node / npm / mvn / java at a glance.
   Adding a tool is one entry in RUNTIMES plus a glyph in GLYPHS. */
.dsh-svc-badge{box-sizing:border-box;display:flex;flex:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,var(--dsh-svc-tint,#8a8a8a) 15%,transparent);color:var(--dsh-svc-tint,#8a8a8a);}
.dsh-svc-badge.is-generic{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
/* A mark that carries its own colours keeps a neutral plate: a tinted one would
   fight the artwork (Java's blue/red steam) for attention. */
.dsh-svc-badge.is-brand{background:color-mix(in srgb,var(--dsw-alias-label-secondary,#8a8a8a) 8%,transparent);}
.dsh-svc-badge svg{width:14px;height:14px;display:block;}
.dsh-svc-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-state-success-primary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
/* The entry is a control, not a readout: while a service runs its glyph is the
   square stop mark, so it keeps the stop colour. The yellow "running" tone
   belongs to the chip, the dot and the row accent — colouring the button too
   made the header look like a warning lamp. */
.dsh-svc-entry.is-running{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);}
.dsh-svc-entry:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dsh-svc-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-svc-entry svg{width:15px;height:15px;display:block;}
/* Finished-run toasts: bottom-right, above the header dropdown, click-through
   except for each card's close button. */
.dsh-svc-toasts{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 32px));pointer-events:none;}
.dsh-svc-toast{box-sizing:border-box;display:flex;align-items:flex-start;gap:9px;padding:10px 10px 10px 12px;border:.5px solid var(--dsw-alias-border-l2);border-left:3px solid var(--dsw-alias-state-success-primary);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-base);box-shadow:0 10px 28px rgba(0,0,0,.14);color:var(--dsw-alias-label-primary);pointer-events:auto;font-size:12px;line-height:1.45;}
.dsh-svc-toast.is-error{border-left-color:var(--dsw-alias-state-error-primary);}
.dsh-svc-toast-mark{flex:none;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);font-size:12px;font-weight:600;line-height:1;}
.dsh-svc-toast.is-error .dsh-svc-toast-mark{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-toast-text{display:flex;flex:1 1 auto;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-toast-name{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-toast-detail{font-size:11px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-toast-command{font-family:var(--dsh-font-family-code,monospace);font-size:10px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-toast-action{align-self:flex-start;margin-top:3px;padding:1px 7px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;}
.dsh-svc-toast-action:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent);}
.dsh-svc-toast-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;line-height:1;cursor:pointer;}
.dsh-svc-toast-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
`;

    /**
     * Cross-slot state. The dropdown lives in `shell.overlay` (the header clips
     * its overflow, so a popover cannot be a descendant of the entry), and an
     * overlay is root-scoped: it has neither `sessionId` nor `inputActions`.
     * The header entry hands both over here on every render.
     */


      return { CSS };
    }

    return { createCss };
  },
});