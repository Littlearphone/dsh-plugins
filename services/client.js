/**
 * Services — the workspace's start scripts, in two places:
 *
 *   1. a right-sidebar tab that lists them (the "Services" panel), and
 *   2. a Session-header dropdown for reaching one without leaving the chat.
 *
 * Discovery is the Host half's job (`GET /services/list/<sessionId>`); this half
 * only renders what it returns and hands a chosen command to the composer.
 * Executing scripts as Host-owned processes is deliberately not part of this
 * version: the harness already runs commands through the conversation, so the
 * dropdown sends the command there instead of maintaining a second lifecycle.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PACKAGE = '@local/services';
    const KIND = 'services';
    const NS = 'services';
    const ROUTE = '/services/list/';
    /** Shown on the refresh control so a stale page is recognisable at a glance. */
    const BUILD = 'services 0.1.1';

    const ZH = {
      'tab.title': '服务管理',
      'entry.label': '服务管理',
      'entry.running': '个运行中',
      'guide.title': '服务管理',
      'guide.description': '列出工作区的启动脚本与 Go 程序，启动后可看输出、可停止。',
      'panel.loading': '正在读取脚本…',
      'panel.empty': '这个工作区没有 package.json，或者里面没有 scripts。',
      'panel.error': '读取脚本失败。',
      'panel.refresh': '刷新',
      'panel.dir': '目录',
      'group.root': '根包',
      'panel.send': '发送到对话',
      'panel.note': '点击脚本在 Host 上启动进程；启动后在上方查看输出、可停止。',
      'menu.title': '启动脚本',
      'menu.empty': '没有可用的脚本。',
      'menu.search': '搜索脚本…',
      'menu.noMatch': '没有匹配的脚本。',
      'run.title': '运行中',
      'run.running': '运行中',
      'run.stopping': '停止中',
      'run.exited': '已结束',
      'run.hide': '收起',
      'run.finished': '已结束',
      'run.start': '启动',
      'run.edit': '编辑启动配置',
      'run.variant': '启动变体',
      'pin.title': '固定',
      'pin.add': '固定到顶部',
      'pin.remove': '取消固定',
      'run.overridden': '已覆盖',
      'edit.title': '启动配置',
      'edit.name': '显示名',
      'edit.args': '参数',
      'edit.argsHint': '--port 8899 --watch（原样透传给脚本，引号会保留）',
      'edit.env': '环境变量',
      'edit.cwd': '工作目录',
      'edit.cwdHint': '相对工作区根；留空 = 脚本所在包目录',
      'edit.locked': '来自 package.json，不能在这里修改',
      'edit.save': '保存',
      'edit.reset': '还原为原生',
      'edit.close': '收起',
      'edit.badEnv': '环境变量要写成 KEY=VALUE',
      'run.stop': '停止',
      'run.confirmStop': '确认停止',
      'output.truncated': '（已省略较早的输出）',
      'run.output': '输出',
      'run.starting': '正在启动…',
      'run.failed': '启动失败：',
      'output.waiting': '（还没有输出）',
      'output.reading': '（正在读取输出…）',
      'output.wrap': '自动换行',
      'output.noWrap': '不换行',
      'menu.hint': '点击一项，命令会填进输入框并发送。',
      'menu.open': '在侧栏打开',
    };

    const EN = {
      'tab.title': 'Service manager',
      'entry.label': 'Service manager',
      'entry.running': 'running',
      'guide.title': 'Service manager',
      'guide.description': 'Workspace start scripts and Go programs, with output and a stop control.',
      'panel.loading': 'Reading scripts…',
      'panel.empty': 'This workspace has no package.json, or it declares no scripts.',
      'panel.error': 'Could not read the scripts.',
      'panel.refresh': 'Refresh',
      'panel.dir': 'Directory',
      'group.root': 'root',
      'panel.send': 'Send to chat',
      'panel.note': 'Clicking a script starts it as a Host process; watch its output above and stop it there.',
      'menu.title': 'Start scripts',
      'menu.empty': 'No scripts available.',
      'menu.search': 'Search scripts…',
      'menu.noMatch': 'No matching scripts.',
      'run.title': 'Running',
      'run.running': 'running',
      'run.stopping': 'stopping',
      'run.exited': 'exited',
      'run.hide': 'Hide',
      'run.finished': 'finished',
      'run.start': 'Start',
      'run.edit': 'Edit start configuration',
      'run.variant': 'Start variant',
      'pin.title': 'Pinned',
      'pin.add': 'Pin to top',
      'pin.remove': 'Unpin',
      'run.overridden': 'overridden',
      'edit.title': 'Start configuration',
      'edit.name': 'Label',
      'edit.args': 'Arguments',
      'edit.argsHint': '--port 8899 --watch (passed through verbatim, quotes kept)',
      'edit.env': 'Environment',
      'edit.cwd': 'Working directory',
      'edit.cwdHint': 'Relative to the workspace root; empty = the package directory',
      'edit.locked': 'Owned by package.json — read-only here',
      'edit.save': 'Save',
      'edit.reset': 'Reset to package.json',
      'edit.close': 'Close',
      'edit.badEnv': 'Environment must be KEY=VALUE',
      'run.stop': 'Stop',
      'run.confirmStop': 'Confirm stop',
      'output.truncated': '(earlier output omitted)',
      'run.output': 'Output',
      'run.starting': 'Starting…',
      'run.failed': 'Start failed: ',
      'output.waiting': '(no output yet)',
      'output.reading': '(reading output…)',
      'output.wrap': 'Wrap lines',
      'output.noWrap': 'No wrap',
      'menu.hint': 'Clicking a script fills the composer and sends it.',
      'menu.open': 'Open in sidebar',
    };

    /**
     * Which tool will run a script, guessed from the command line. One entry per
     * tool, matched by the earliest occurrence so a wrapper prefix does not win
     * over the real runner ("npm run build" is npm, "vite build" is node).
     * `icon` names a brand glyph in BRAND_ICONS; adding a tool is one entry here
     * plus, only when its logo is new, one path there.
     */

    const CSS = `
.dsh-svc-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;height:100%;min-height:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
.dsh-svc-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;}
.dsh-svc-head-actions{display:flex;flex:none;align-items:center;gap:6px;}
.dsh-svc-dir{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;}
.dsh-svc-refresh{flex:none;box-sizing:border-box;height:22px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}
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
.dsh-svc-busy{margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}
.dsh-svc-entry-block{display:flex;flex-direction:column;gap:4px;}
.dsh-svc-chip{flex:none;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:9px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.dsh-svc-chip.is-running{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);}
.dsh-svc-chip.is-done{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-row.is-running{border-left-color:var(--dsw-alias-state-success-primary);}
.dsh-svc-run{margin:0;padding:2px 12px 0;display:flex;flex-direction:column;gap:4px;}
.dsh-svc-run-head{display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}
.dsh-svc-run-row{box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);font-size:11px;}
.dsh-svc-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}
.dsh-svc-dot.is-running{background:var(--dsw-alias-state-success-primary);}
.dsh-svc-dot.is-exited{background:var(--dsw-alias-state-warn-primary);}
.dsh-svc-dot.is-failed{background:var(--dsw-alias-state-error-primary);}
.dsh-svc-run-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-run-button{flex:none;display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer;}
.dsh-svc-run-button:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);}
/* Stop control mirrors the background-job stop button: a 20px square that turns
   red on hover, and expands into a labelled confirm while armed. */
.dsh-svc-stop{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:20px;height:20px;padding:0;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 50%,transparent);border-radius:var(--dsw-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;}
.dsh-svc-stop:hover,.dsh-svc-stop:focus-visible{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 70%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-stop.is-armed,.dsh-svc-stop.is-armed:hover,.dsh-svc-stop.is-armed:focus-visible{width:auto;padding:0 7px;gap:4px;border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 60%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 24%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-stop-label{white-space:nowrap;font-size:11px;line-height:18px;}
.dsh-svc-stop svg{width:10px;height:10px;display:block;}
.dsh-svc-run-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-drawer{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);}
.dsh-svc-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-drawer-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-font-family-code,monospace);}
.dsh-svc-log{grid-column:1 / -1;display:flex;flex:none;flex-direction:column;margin:8px 0 0;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);overflow:hidden;background:var(--dsw-alias-bg-base);}
.dsh-svc-log-head{display:flex;align-items:center;justify-content:flex-start;gap:6px;padding:4px 8px;background:var(--dsw-alias-bg-layer-2);border-bottom:.5px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-log-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:500;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-log-body{box-sizing:border-box;margin:0;padding:8px 10px;max-height:240px;overflow:auto;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--dsh-font-family-code,monospace);font-size:10.5px;line-height:1.6;white-space:pre;tab-size:2;scrollbar-width:thin;}
.dsh-svc-list{display:flex;flex:1 1 auto;flex-direction:column;gap:4px;min-height:0;padding:2px 12px 12px;overflow-y:auto;}
.dsh-svc-row{box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:10px;row-gap:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;background:var(--dsw-alias-bg-layer-2);text-align:left;}
.dsh-svc-row-text{display:flex;flex:1 1 auto;flex-direction:column;gap:3px;min-width:0;}
.dsh-svc-name-line{display:flex;align-items:center;gap:6px;min-width:0;}
.dsh-svc-actions{display:flex;flex:none;align-items:center;gap:4px;margin-left:auto;}
.dsh-svc-lastline{box-sizing:border-box;min-width:0;padding-left:6px;border-left:2px solid var(--dsw-alias-border-l2);font-family:var(--dsh-font-family-code,monospace);font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-lastline::before{content:'↳ ';}
.dsh-svc-row:hover{background:var(--dsw-alias-bg-layer-3);}
.dsh-svc-search-row{flex:none;display:flex;width:100%;box-sizing:border-box;padding:0 12px 8px;}
.dsh-svc-search-input{flex:1 1 auto;width:100%;height:26px;box-sizing:border-box;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;}
.dsh-svc-search-input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none;}
.dsh-svc-variant{height:20px;max-width:96px;box-sizing:border-box;padding:0 2px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;}
.dsh-svc-pinned-head{display:flex;align-items:center;gap:6px;padding:8px 12px 2px;font-size:10px;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-pinned-title{letter-spacing:.04em;}
.dsh-svc-group-count{opacity:.7;}
.dsh-svc-row.is-overridden{border-left-color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-chip.is-overridden{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
.dsh-svc-readonly{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);font-size:10px;color:var(--dsw-alias-label-tertiary);}
.dsh-svc-readonly-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-font-family-code,monospace);}
.dsh-svc-readonly-note{margin-left:auto;flex:none;font-size:9px;opacity:.8;}
.dsh-svc-lock{flex:none;font-size:9px;}
.dsh-svc-editor{gap:6px;}
.dsh-svc-field{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary);}
.dsh-svc-field-label{flex:none;width:56px;}
.dsh-svc-input{flex:1 1 auto;min-width:0;box-sizing:border-box;padding:3px 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-primary);font:inherit;font-size:10px;}
.dsh-svc-input:focus{border-color:var(--dsw-alias-border-l3);outline:none;}
.dsh-svc-textarea{resize:vertical;font-family:var(--dsh-font-family-code,monospace);}
.dsh-svc-editor-actions{display:flex;justify-content:flex-end;gap:4px;padding-top:2px;}
.dsh-svc-icon.is-primary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);}
.dsh-svc-icon.is-pinned{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);}
.dsh-svc-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:20px;height:20px;padding:0;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);cursor:pointer;}
.dsh-svc-icon:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);}
.dsh-svc-icon svg{width:11px;height:11px;display:block;}
.dsh-svc-name{font-size:12px;line-height:1.3;font-weight:500;}
.dsh-svc-command{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dsh-svc-command::before{content:'$ ';color:var(--dsw-alias-label-tertiary);}
.dsh-svc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:22px 0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);text-align:center;}
.dsh-svc-spinner{width:16px;height:16px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);animation:dsh-svc-spin .8s linear infinite;}
.dsh-svc-spinner.is-small{width:10px;height:10px;border-width:1.5px;}
.dsh-svc-log-body.is-wrap{white-space:pre-wrap;overflow-wrap:anywhere;}
.dsh-svc-icon.is-tiny{width:16px;height:16px;border-radius:4px;}
.dsh-svc-icon.is-tiny svg{width:9px;height:9px;}
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
.dsh-svc-item.is-running .dsh-svc-item-name{color:var(--dsw-alias-state-success-primary);}

.dsh-svc-item-stop:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-item-text{display:flex;flex:1 1 auto;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-item-name{font-size:12px;line-height:1.3;}
.dsh-svc-item-command{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-menu-foot{flex:none;padding-top:2px;border-top:1px solid var(--dsw-alias-border-l1);}
.dsh-svc-foot-button{box-sizing:border-box;width:100%;padding:5px 7px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;text-align:left;cursor:pointer;}
.dsh-svc-foot-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
/* Runtime badge: the tool's own pictogram, tinted by that tool's colour, so a
   list of bare command lines still says node / npm / mvn / java at a glance.
   Adding a tool is one entry in RUNTIMES plus a glyph in GLYPHS. */
.dsh-svc-badge{box-sizing:border-box;display:flex;flex:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,var(--dsh-svc-tint,#8a8a8a) 15%,transparent);color:var(--dsh-svc-tint,#8a8a8a);}
.dsh-svc-badge.is-generic{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.dsh-svc-badge svg{width:14px;height:14px;display:block;}
.dsh-svc-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-state-success-primary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
.dsh-svc-entry.is-running{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);}
.dsh-svc-entry:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dsh-svc-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-svc-entry svg{width:15px;height:15px;display:block;}
`;

    return {
      // Dotted names are how a generated Remote namespace is injected: `remote`
      // alone satisfies the carrier, `remote.terminal` the namespace itself.
      inject: [
        'slots',
        'sidebarRightTabs',
        'sidebarRight',
        'locale',
        'remote',
        'remote.terminal',
      ],

      apply(ctx) {
        const locale = ctx.get('locale');
        const registry = ctx.get('sidebarRightTabs');
        const slots = ctx.get('slots');
        const controller = ctx.get('sidebarRight');
        if (locale === undefined || registry === undefined || slots === undefined) {
          console.error('[services] the right Sidebar or locale service is unavailable');
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

        /** Pin or unpin one script; the pinned area floats by recent use only. */

        /** Guide capsule glyph: a console window with a play marker. */
        function GuideIcon(props) {
          return h(
            'svg',
            { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true, ...props },
            h('rect', {
              x: 1.8,
              y: 2.8,
              width: 12.4,
              height: 10.4,
              rx: 2,
              stroke: 'currentColor',
              strokeWidth: 1.2,
            }),
            h('path', { d: 'M1.8 6h12.4', stroke: 'currentColor', strokeWidth: 1.2 }),
            h('path', { d: 'M6.3 8.3 9.9 10.2 6.3 12.1z', fill: 'currentColor' }),
          );
        }

        let surfaces = null;
        let surfacesRequest = null;

        /**
         * Every surface waits for the same chunk, and a failure renders its own
         * text: an empty panel and a panel with no scripts look identical.
         */
        function loadSurfaces() {
          if (surfacesRequest === null) {
            surfacesRequest = require.async('./client.services.js').then((chunkModule) => {
              surfaces = chunkModule.createSurfaces({
                t,
                useLocaleRevision,
                CSS,
                ROUTE,
                PACKAGE,
                KIND,
                BUILD,
              });
              return surfaces;
            });
          }
          return surfacesRequest;
        }

        function useSurfaces() {
          const [ready, setReady] = React.useState(surfaces);
          const [failure, setFailure] = React.useState('');
          React.useEffect(() => {
            if (ready !== null || failure !== '') return undefined;
            let alive = true;
            loadSurfaces().then(
              (loaded) => {
                if (alive) setReady(loaded);
              },
              (error) => {
                if (alive) setFailure(String((error && error.message) || error));
              },
            );
            return () => {
              alive = false;
            };
          }, [ready, failure]);
          return { ready, failure };
        }

        function surface(pick, props) {
          const { ready, failure } = useSurfaces();
          if (failure !== '') {
            return h('p', { className: 'dsh-svc-note' }, '服务面板加载失败：' + failure);
          }
          if (ready === null) {
            return h('p', { className: 'dsh-svc-note' }, '正在加载服务面板…');
          }
          return h(pick(ready), props);
        }

        const PanelBody = (props) => surface((loaded) => loaded.PanelBody, props);
        const PanelTitle = () => surface((loaded) => loaded.PanelTitle);
        const HeaderEntry = (props) => surface((loaded) => loaded.HeaderEntry, props);
        const MenuOverlay = () => surface((loaded) => loaded.MenuOverlay);

        ctx.effect(
          () =>
            registry.register({
              id: PACKAGE,
              kind: KIND,
              priority: 'extension',
              title: () => t('tab.title'),
              guide: [
                {
                  id: 'services',
                  order: 40,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GuideIcon,
                },
              ],
            }),
          'services: panel tab type',
        );
        slots.inject('sidebar.right.pane.tab', () =>
          slots.register({ name: 'sidebar.right.pane.tab', key: PACKAGE }, PanelBody),
        );
        slots.inject('sidebar.right.pane.tab.title', () =>
          slots.register({ name: 'sidebar.right.pane.tab.title', key: PACKAGE }, PanelTitle),
        );
        slots.inject('conversation.session.header.utilities', () =>
          slots.register(
            { name: 'conversation.session.header.utilities', id: 'services', order: -2 },
            HeaderEntry,
          ),
        );
        slots.inject('shell.overlay', () =>
          slots.register({ name: 'shell.overlay', id: 'services-menu', order: 860 }, MenuOverlay),
        );
      },
    };
  },
});
