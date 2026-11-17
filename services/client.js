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
    const RUNTIMES = [
      { id: 'npm', label: 'npm', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])npm\b/ },
      { id: 'pnpm', label: 'pnpm', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])pnpm\b/ },
      { id: 'yarn', label: 'yarn', tint: '#CB3837', icon: 'npm', pattern: /(^|[\s/\\])yarn\b/ },
      {
        id: 'node',
        label: 'node',
        tint: '#5FA04E',
        icon: 'node',
        pattern: /(^|[\s/\\])(node|tsx|ts-node|nodemon|vite|next|webpack|rollup|esbuild|jest|vitest|mocha)\b/,
      },
      { id: 'go', label: 'go', tint: '#00ADD8', icon: 'go', pattern: /(^|[\s/\\])go\b/ },
      { id: 'maven', label: 'mvn', tint: '#C71A36', icon: 'maven', pattern: /(^|[\s/\\])(mvn|mvnd)\b/ },
      {
        id: 'gradle',
        label: 'gradle',
        tint: '#0F8A6A',
        icon: 'gradle',
        pattern: /(^|[\s/\\])(gradle|gradlew)\b/,
      },
      { id: 'java', label: 'java', tint: '#5382A1', icon: 'java', pattern: /(^|[\s/\\])java\b/ },
      {
        id: 'python',
        label: 'python',
        tint: '#3776AB',
        icon: 'python',
        pattern: /(^|[\s/\\])(python|python3|uv|poetry|pipenv|pytest|django-admin)\b/,
      },
      {
        id: 'docker',
        label: 'docker',
        tint: '#2496ED',
        icon: 'docker',
        pattern: /(^|[\s/\\])docker(-compose)?\b/,
      },
      { id: 'dotnet', label: '.net', tint: '#512BD4', icon: 'dotnet', pattern: /(^|[\s/\\])dotnet\b/ },
    ];

    /**
     * The official marks, taken from Simple Icons (CC0 path data, 24x24 grid).
     * They are monochrome and filled with currentColor, so the runtime tint
     * carries the colour. The trademarks belong to their respective owners.
     */
    const BRAND_ICONS = {
      go: 'M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.174-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.115.175-.795.514-1.204 1.274-1.192 2.22.011.935.654 1.706 1.577 1.835.795.105 1.46-.175 1.987-.77.105-.13.198-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35.152-.362.432-.97.596-1.274a.315.315 0 01.292-.187h4.253c-.023.316-.023.631-.07.947a4.983 4.983 0 01-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986-1.145.152-2.209-.07-3.143-.77-.865-.655-1.356-1.52-1.484-2.595-.152-1.274.222-2.419.993-3.424.83-1.086 1.928-1.776 3.272-2.02 1.098-.2 2.15-.07 3.096.571.62.41 1.063.97 1.356 1.648.07.105.023.164-.117.2m3.868 6.461c-1.064-.024-2.034-.328-2.852-1.029a3.665 3.665 0 01-1.262-2.255c-.21-1.32.152-2.489.947-3.529.853-1.122 1.881-1.706 3.272-1.95 1.192-.21 2.314-.095 3.33.595.923.63 1.496 1.484 1.648 2.605.198 1.578-.257 2.863-1.344 3.962-.771.783-1.718 1.273-2.805 1.495-.315.06-.63.07-.934.106zm2.78-4.72c-.011-.153-.011-.27-.034-.387-.21-1.157-1.274-1.81-2.384-1.554-1.087.245-1.788.935-2.045 2.033-.21.912.234 1.835 1.075 2.21.643.28 1.285.244 1.905-.07.923-.48 1.425-1.228 1.484-2.233z',
      node: 'M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z',
      npm: 'M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z',
      maven: 'M4.237.001c-.312-.013-.665.072-.828.457-.158.374-.283 1.188-.34 2.276l1.223.591c-.02-.737.007-1.43.076-2.066-.026.299-.056.96.006 2.039.019.342.049.725.088 1.15.002.024.002.047.007.069a45.485 45.485 0 0 0 .309 2.412c.057.368.126.752.195 1.16l-.01.01c.014.01.015.018.014.023l.03.16c.03.162.06.328.093.494l.108.553.056.289a61.72 61.72 0 0 0 .457 2.068c.09.382.186.78.287 1.186.098.386.199.783.309 1.193.096.362.199.735.303 1.117.003.018.012.036.015.055a145.826 145.826 0 0 0 .34 1.185l.049.174c.078.261.158.533.242.805a4.2 4.2 0 0 1-.293-.135l-.19-.654c-.02-.077-.042-.148-.062-.225l-.002-.004-.004-.002c-.087-.3-.17-.607-.257-.916-.023-.087-.044-.173-.069-.263l-.314-1.178c-.1-.381-.194-.765-.29-1.154-.094-.39-.185-.78-.277-1.172-.093-.401-.181-.8-.265-1.203-.085-.396-.161-.798-.24-1.193a50.315 50.315 0 0 1-.211-1.17c-.004-.013-.006-.03-.01-.041l.004-.002c-.057-.386-.116-.77-.174-1.15a60.905 60.905 0 0 1-.154-1.204 27.447 27.447 0 0 1-.172-2.41l-1.22-.59c-.004.074-.01.15-.013.23-.012.294-.02.605-.023.93a45.3 45.3 0 0 0 .006 1.157c.009.37.025.755.045 1.148.02.336.042.675.07 1.022l.002.039.006.004c.003.023.007.05.006.076.033.368.064.739.107 1.115a34.493 34.493 0 0 0 .303 2.125c.01.064.024.131.035.195a23.418 23.418 0 0 0 .547 2.32c.07.237.14.464.21.68.063.182.13.365.194.545.155.422.327.832.512 1.232l.006.004a.318.318 0 0 0 .02.05c.225.485.475.95.755 1.395.01.013.02.033.03.047-.455-.183-1.259-.098-1.253-.097.83.288 1.557.64 2.016 1.175-.183.2-.523.352-.953.477.594.064.924-.039 1.045-.092-.31.26-.483.732-.635 1.24.35-.57.696-.949 1.033-1.094.078.258.162.524.244.788A147.532 147.532 0 0 0 5.157 24a.56.56 0 0 0 .43-.312c.13-.282.83-1.775 1.908-3.875.413 1.303.88 2.679 1.386 4.109a.494.494 0 0 0 .076-.465 103.735 103.735 0 0 1-1.308-3.945c.154-.299.316-.612.484-.932.125.04.255.094.389.155.203.186.352.491.482.84a1.515 1.515 0 0 0-.334-1.098c1.335.258 2.547.09 3.287-.81a3.97 3.97 0 0 0 .192-.258c-.325.304-.682.404-1.313.273.996-.281 1.523-.617 2.035-1.22.12-.145.244-.303.371-.48-.943.722-1.927.822-2.9.493l-.045-.018c.914.02 2.203-.474 3.092-1.189.41-.33.796-.73 1.17-1.21.28-.359.55-.76.82-1.216.234-.393.468-.824.7-1.293a2.83 2.83 0 0 1-.74.137l-.144.008c-.048.002-.093 0-.146.002.885-.198 1.5-.74 1.994-1.447-.24.117-.628.262-1.07.297-.058.006-.12.006-.182.006-.013-.002-.028 0-.047-.002.306-.078.574-.178.81-.309a3.363 3.363 0 0 0 .358-.236c.044-.037.088-.07.13-.106.099-.086.193-.18.28-.287.028-.034.056-.063.08-.098.036-.05.073-.098.104-.146a8.388 8.388 0 0 0 .51-.828c.015-.031.032-.057.046-.088.04-.084.08-.16.11-.227.042-.099.074-.179.092-.238a.515.515 0 0 1-.108.051c-.273.112-.727.187-1.086.201-.004 0-.008 0-.013.004h-.067c.72-.214 1.067-.45 1.422-.818a13.883 13.883 0 0 0 1.154-1.428c.264-.37.505-.738.692-1.072a6.5 6.5 0 0 0 .298-.592c.066-.157.122-.305.172-.45-.466.01-.986.011-1.48 0 .495.01 1.015.007 1.484-.005.5-1.485.063-2.262.063-2.262s-.526-1.212-1.4-.851c-.426.175-1.172.73-2.083 1.56l.514 1.45a17.561 17.561 0 0 1 1.703-1.602c-.257.22-.807.726-1.615 1.644-.256.29-.537.624-.844.997-.017.02-.035.038-.047.06a51.435 51.435 0 0 0-1.666 2.187c-.248.34-.498.704-.765 1.088h-.016c.002.02-.004.028-.01.032l-.101.152c-.104.155-.213.31-.318.47l-.352.534c-.061.09-.124.181-.186.277-.184.282-.367.573-.558.873a97.351 97.351 0 0 0-1.428 2.338 96.866 96.866 0 0 0-1.341 2.343c-.012.017-.02.04-.034.057a197.256 197.256 0 0 0-.668 1.223l-.097.181c-.17.318-.346.642-.52.979 0 .004-.005.008-.006.013-.026.048-.05.093-.072.141-.117.222-.218.424-.45.87a1.352 1.352 0 0 0-.233-.182l.345-.65c.047-.089.096-.177.143-.27l.04-.077.546-1.001.13-.233v-.006l-.001-.006c.169-.31.345-.62.52-.94.051-.087.102-.173.153-.265.224-.395.454-.794.684-1.197a91.685 91.685 0 0 1 2.135-3.504c.247-.386.503-.77.754-1.152.092-.138.182-.272.279-.41a72.9 72.9 0 0 1 .48-.701c.007-.012.019-.024.026-.037h.006c.26-.356.517-.713.773-1.065.278-.373.554-.735.83-1.09a31.075 31.075 0 0 1 1.777-2.075l-.515-1.446c-.06.057-.126.116-.192.178a32.37 32.37 0 0 0-.758.729c-.295.294-.597.606-.912.935a46.032 46.032 0 0 0-1.632 1.838l-.03.033.002.008c-.017.02-.033.044-.054.064-.266.323-.538.649-.801.985a39.105 39.105 0 0 0-1.445 1.95c-.043.06-.085.126-.127.186a26.458 26.458 0 0 0-1.403 2.303c-.13.247-.256.485-.37.715-.096.195-.187.395-.278.591-.21.463-.398.93-.566 1.399l.002.006a.36.36 0 0 0-.026.058c-.108.303-.203.608-.29.914-.14.174-.302.325-.483.46a3.505 3.505 0 0 0-.131-.153 5.148 5.148 0 0 0 .824-2.211 6.4 6.4 0 0 0-.016-1.488c-.046-.4-.126-.82-.238-1.274-.097-.393-.217-.81-.363-1.248-.091.185-.22.367-.379.545l-.086.094c-.029.032-.06.06-.092.094.434-.674.486-1.397.358-2.148a2.722 2.722 0 0 1-.49.85c-.033.038-.072.077-.11.116-.01.007-.019.018-.033.028.144-.24.25-.467.318-.698a1.29 1.29 0 0 0 .04-.146 2.85 2.85 0 0 0 .038-.225l.018-.146a2.11 2.11 0 0 0-.002-.354c-.003-.04-.004-.076-.01-.113-.01-.055-.016-.105-.027-.154a7.416 7.416 0 0 0-.193-.84c-.01-.028-.015-.056-.026-.084-.027-.079-.048-.149-.072-.209a2.1 2.1 0 0 0-.09-.209.455.455 0 0 1-.035.1c-.102.24-.34.57-.557.8-.003.003-.007.005-.007.01l-.04.043c.318-.58.39-.946.385-1.398a12.274 12.274 0 0 0-.16-1.615 10.68 10.68 0 0 0-.232-1.104 5.853 5.853 0 0 0-.18-.558 6.337 6.337 0 0 0-.172-.391 26.18 26.18 0 0 0 .002-.004C5.576.341 4.82.124 4.82.124s-.27-.11-.582-.123zm3.38 15.783l.032.082v.002c-.06.033-.116.067-.178.097-.012.004-.024.012-.039.018a2.41 2.41 0 0 0 .186-.2zm-.603 1.626c.13.136.25.242.354.32l.07.227a1.866 1.866 0 0 0-.246.053l-.03-.098c-.024-.084-.048-.17-.076-.257l-.021-.073zm.26.875a2.34 2.34 0 0 1 .271.01l.07.229a.778.778 0 0 1 .247-.004l-.326.627a127.643 127.643 0 0 1-.262-.862z',
      gradle: 'M22.695 4.297a3.807 3.807 0 0 0-5.29-.09.368.368 0 0 0 0 .533l.46.47a.363.363 0 0 0 .474.032 2.182 2.182 0 0 1 2.86 3.291c-3.023 3.02-7.056-5.447-16.211-1.083a1.24 1.24 0 0 0-.534 1.745l1.571 2.713a1.238 1.238 0 0 0 1.681.461l.037-.02-.029.02.688-.384a16.083 16.083 0 0 0 2.193-1.635.384.384 0 0 1 .499-.016.357.357 0 0 1 .016.534 16.435 16.435 0 0 1-2.316 1.741H8.77l-.696.39a1.958 1.958 0 0 1-.963.25 1.987 1.987 0 0 1-1.726-.989L3.9 9.696C1.06 11.72-.686 15.603.26 20.522a.363.363 0 0 0 .354.296h1.675a.363.363 0 0 0 .37-.331 2.478 2.478 0 0 1 4.915 0 .36.36 0 0 0 .357.317h1.638a.363.363 0 0 0 .357-.317 2.478 2.478 0 0 1 4.914 0 .363.363 0 0 0 .358.317h1.627a.363.363 0 0 0 .363-.357c.037-2.294.656-4.93 2.42-6.25 6.108-4.57 4.502-8.486 3.088-9.9zm-6.229 6.901l-1.165-.584a.73.73 0 1 1 1.165.587z',
      java: 'M11.915 0 11.7.215C9.515 2.4 7.47 6.39 6.046 10.483c-1.064 1.024-3.633 2.81-3.711 3.551-.093.87 1.746 2.611 1.55 3.235-.198.625-1.304 1.408-1.014 1.939.1.188.823.011 1.277-.491a13.389 13.389 0 0 0-.017 2.14c.076.906.27 1.668.643 2.232.372.563.956.911 1.667.911.397 0 .727-.114 1.024-.264.298-.149.571-.33.91-.5.68-.34 1.634-.666 3.53-.604 1.903.062 2.872.39 3.559.704.687.314 1.15.664 1.925.664.767 0 1.395-.336 1.807-.9.412-.563.631-1.33.72-2.24.06-.623.055-1.32 0-2.066.454.45 1.117.604 1.213.424.29-.53-.816-1.314-1.013-1.937-.198-.624 1.642-2.366 1.549-3.236-.08-.748-2.707-2.568-3.748-3.586C16.428 6.374 14.308 2.394 12.13.215zm.175 6.038a2.95 2.95 0 0 1 2.943 2.942 2.95 2.95 0 0 1-2.943 2.943A2.95 2.95 0 0 1 9.148 8.98a2.95 2.95 0 0 1 2.942-2.942zM8.685 7.983a3.515 3.515 0 0 0-.145.997c0 1.951 1.6 3.55 3.55 3.55 1.95 0 3.55-1.598 3.55-3.55 0-.329-.046-.648-.132-.951.334.095.64.208.915.336a42.699 42.699 0 0 1 2.042 5.829c.678 2.545 1.01 4.92.846 6.607-.082.844-.29 1.51-.606 1.94-.315.431-.713.651-1.315.651-.593 0-.932-.27-1.673-.61-.741-.338-1.825-.694-3.792-.758-1.974-.064-3.073.293-3.821.669-.375.188-.659.373-.911.5s-.466.2-.752.2c-.53 0-.876-.209-1.16-.64-.285-.43-.474-1.101-.545-1.948-.141-1.693.176-4.069.823-6.614a43.155 43.155 0 0 1 1.934-5.783c.348-.167.749-.31 1.192-.425zm-3.382 4.362a.216.216 0 0 1 .13.031c-.166.56-.323 1.116-.463 1.665a33.849 33.849 0 0 0-.547 2.555 3.9 3.9 0 0 0-.2-.39c-.58-1.012-.914-1.642-1.16-2.08.315-.24 1.679-1.755 2.24-1.781zm13.394.01c.562.027 1.926 1.543 2.24 1.783-.246.438-.58 1.068-1.16 2.08a4.428 4.428 0 0 0-.163.309 32.354 32.354 0 0 0-.562-2.49 40.579 40.579 0 0 0-.482-1.652.216.216 0 0 1 .127-.03z',
      python: 'M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z',
      docker: 'M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z',
      dotnet: 'M24 8.77h-2.468v7.565h-1.425V8.77h-2.462V7.53H24zm-6.852 7.565h-4.821V7.53h4.63v1.24h-3.205v2.494h2.953v1.234h-2.953v2.604h3.396zm-6.708 0H8.882L4.78 9.863a2.896 2.896 0 0 1-.258-.51h-.036c.032.189.048.592.048 1.21v5.772H3.157V7.53h1.659l3.965 6.32c.167.261.275.442.323.54h.024c-.04-.233-.06-.629-.06-1.185V7.529h1.372zm-8.703-.693a.868.829 0 0 1-.869.829.868.829 0 0 1-.868-.83.868.829 0 0 1 .868-.828.868.829 0 0 1 .869.829Z',
    };

    /** Fallback for a command whose tool is not recognised. */
    const GENERIC_ICON = 'M9 5.5 19 12 9 18.5z';

    /** Earliest-matching runtime for one command line, or undefined for the generic glyph. */
    function detectRuntime(command) {
      const text = String(command ?? '');
      let best;
      let bestIndex = Number.POSITIVE_INFINITY;
      for (const runtime of RUNTIMES) {
        const match = runtime.pattern.exec(text);
        if (match === null) continue;
        const index = match.index + match[1].length;
        if (index < bestIndex) {
          best = runtime;
          bestIndex = index;
        }
      }
      return best;
    }

    /** The badge that fronts one script row: the tool's own mark, tinted by the tool. */
    function RuntimeBadge(command, key) {
      const runtime = detectRuntime(command);
      const path = runtime === undefined ? GENERIC_ICON : BRAND_ICONS[runtime.icon] ?? GENERIC_ICON;
      return h(
        'span',
        {
          key,
          className: 'dsh-svc-badge' + (runtime === undefined ? ' is-generic' : ''),
          style: { '--dsh-svc-tint': runtime?.tint ?? 'var(--dsw-alias-label-secondary)' },
          title: runtime?.label ?? 'run',
        },
        h(
          'svg',
          { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true },
          h('path', { d: path }),
        ),
      );
    }

    /**
     * Scripts are ordered by the tool that runs them first — package managers,
     * then node, go, the JVM tools, python, docker, .NET — so an `npm run` entry
     * never sits in the middle of a run of `node` ones. Inside one tool, they are
     * ordered by what they do (dev, build, test, check, report), then by name.
     */
    const TOOL_ORDER = ['npm', 'node', 'go', 'maven', 'gradle', 'java', 'python', 'docker', 'dotnet'];

    function toolRank(script) {
      const runtime = detectRuntime(script?.command);
      if (runtime === undefined) return TOOL_ORDER.length;
      const index = TOOL_ORDER.indexOf(runtime.icon);
      return index === -1 ? TOOL_ORDER.length : index;
    }

    const SCRIPT_CATEGORIES = [
      [/^(dev|start|serve|watch|run)\b/i, 0],
      [/^(build|compile|bundle|package|dist|release)\b/i, 1],
      [/^(test|e2e|spec|coverage)\b/i, 2],
      [/^(lint|check|typecheck|format|fmt|validate|verify)\b/i, 3],
      [/^(size|report|audit|scan|analy|stats)\b/i, 4],
    ];

    function scriptRank(script) {
      const name = String(script?.name ?? '');
      for (const [pattern, rank] of SCRIPT_CATEGORIES) {
        if (pattern.test(name)) return rank;
      }
      return 9;
    }

    function sortScripts(scripts) {
      return [...scripts].sort((left, right) => {
        const tool = toolRank(left) - toolRank(right);
        if (tool !== 0) return tool;
        const rank = scriptRank(left) - scriptRank(right);
        if (rank !== 0) return rank;
        return String(left.name ?? '').localeCompare(String(right.name ?? ''));
      });
    }

    /** Case-insensitive filter over both the script name and its command. */
    function filterGroups(groups, query) {
      const needle = query.trim().toLowerCase();
      if (needle === '') return groups;
      const matched = [];
      for (const group of groups) {
        const scripts = group.scripts.filter(
          (script) =>
            String(script.name ?? '').toLowerCase().includes(needle) ||
            String(script.command ?? '').toLowerCase().includes(needle),
        );
        if (scripts.length > 0) matched.push({ ...group, scripts });
      }
      return matched;
    }

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
.dsh-svc-search input:focus{border-color:var(--dsw-alias-state-business-primary);}
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
.dsh-svc-stop{flex:none;align-self:center;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:20px;height:20px;padding:0;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:18px;cursor:pointer;}
.dsh-svc-stop:hover,.dsh-svc-stop:focus-visible{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);color:var(--dsw-alias-state-error-primary);}
.dsh-svc-stop.is-armed,.dsh-svc-stop.is-armed:hover,.dsh-svc-stop.is-armed:focus-visible{width:auto;padding:0 7px;gap:4px;border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);}
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
.dsh-svc-search-row{flex:none;padding:0 12px 6px;}
.dsh-svc-search-input{width:100%;box-sizing:border-box;padding:3px 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-menu);color:var(--dsw-alias-label-primary);font:inherit;font-size:10px;}
.dsh-svc-search-input:focus{border-color:var(--dsw-alias-border-l3);outline:none;}
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
.dsh-svc-entry{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:0;vertical-align:middle;cursor:pointer;}
.dsh-svc-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-entry:active{background:var(--dsw-alias-interactive-bg-active);}
.dsh-svc-entry svg{width:15px;height:15px;display:block;}
`;

    /**
     * Cross-slot state. The dropdown lives in `shell.overlay` (the header clips
     * its overflow, so a popover cannot be a descendant of the entry), and an
     * overlay is root-scoped: it has neither `sessionId` nor `inputActions`.
     * The header entry hands both over here on every render.
     */
    const store = {
      open: false,
      sessionId: undefined,
      actions: undefined,
      notice: '',
      busy: false,
      focusServiceId: '',
      diag: '',
      revision: 0,
      listeners: new Set(),
    };

    function emit() {
      store.revision += 1;
      for (const listener of store.listeners) listener();
    }

    function setOpen(open) {
      if (store.open === open) return;
      store.open = open;
      emit();
    }

    function useStoreRevision() {
      return React.useSyncExternalStore(
        (notify) => {
          store.listeners.add(notify);
          return () => store.listeners.delete(notify);
        },
        () => store.revision,
        () => 0,
      );
    }

    /** Fetch the workspace manifest summary for one Session. */
    function useScripts(sessionId) {
      const [state, setState] = React.useState({ phase: 'idle', dir: '', groups: [] });

      const load = React.useCallback(() => {
        if (sessionId === undefined || sessionId === null) {
          setState({ phase: 'empty', dir: '', groups: [] });
          return;
        }
        setState((current) => ({ ...current, phase: 'loading' }));
        fetch(ROUTE + encodeURIComponent(String(sessionId)))
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('http'))))
          .then((data) => {
            const groups = Array.isArray(data?.groups)
              ? data.groups
                  .map((group) => ({
                    id: String(group?.id ?? ''),
                    kind: group?.kind === 'go' ? 'go' : 'npm',
                    name: typeof group?.name === 'string' ? group.name : '',
                    dir: typeof group?.dir === 'string' ? group.dir : '',
                    scripts: Array.isArray(group?.scripts) ? sortScripts(group.scripts) : [],
                  }))
                  .filter((group) => group.scripts.length > 0)
              : [];
            setState({ phase: groups.length === 0 ? 'empty' : 'ready', dir: data?.dir ?? '', groups });
          })
          .catch(() => setState({ phase: 'error', dir: '', groups: [] }));
      }, [sessionId]);

      React.useEffect(() => {
        load();
      }, [load]);

      return [state, load];
    }

    const STATE_ROUTE = '/services/state/';
    const START_ROUTE = '/services/start/';
    const STOP_ROUTE = '/services/stop/';
    const CONFIG_ROUTE = '/services/config/';
    const PIN_ROUTE = '/services/pin/';
    const UI_ROUTE = '/services/ui/';
    const OUTPUT_ROUTE = '/services/output/';

    /** Stop one started service; failures are silent because the next poll shows state. */
    async function stopService(sessionId, id) {
      try {
        await postJson(STOP_ROUTE + encodeURIComponent(String(sessionId)), { id });
      } catch {
        /* the state poll reports what actually happened */
      }
    }

    async function postJson(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    /**
     * Started services of one Session, polled while a surface is mounted. The
     * Host owns the process; this is only the observed state.
     */
    function useServices(sessionId) {
      const [services, setServices] = React.useState([]);
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null) return undefined;
        let alive = true;
        const tick = async () => {
          try {
            const response = await fetch(STATE_ROUTE + encodeURIComponent(String(sessionId)));
            if (!response.ok) return;
            const data = await response.json();
            if (alive) setServices(Array.isArray(data?.services) ? data.services : []);
          } catch {
            /* a failed poll keeps the previous list */
          }
        };
        void tick();
        const timer = setInterval(tick, 1000);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [sessionId]);
      return services;
    }

    /**
     * The start-configuration editor. The script body is shown read-only and
     * carries a lock: it belongs to package.json, and this plugin only ever adds
     * parameters, environment and a working directory around it.
     */
    function ConfigEditor({ sessionId, script, dir, labels, onSaved, onCancel }) {
      const [label, setLabel] = React.useState(script.variantLabel ?? '');
      const [args, setArgs] = React.useState(script.args ?? '');
      const [env, setEnv] = React.useState(
        Object.entries(script.env ?? {})
          .map(([key, value]) => key + '=' + value)
          .join('\n'),
      );
      const [cwd, setCwd] = React.useState(script.cwd ?? '');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');

      const save = async (reset) => {
        setBusy(true);
        setError('');
        try {
          const url = CONFIG_ROUTE + encodeURIComponent(String(sessionId));
          if (reset === true) {
            const query =
              script.configId === undefined
                ? '?dir=' + encodeURIComponent(dir ?? '') + '&script=' + encodeURIComponent(scriptName)
                : '?id=' + encodeURIComponent(String(script.configId));
            const response = await fetch(url + query, { method: 'DELETE' });
            if (!response.ok) {
              const detail = await response.json().catch(() => null);
              throw new Error('HTTP ' + response.status + ' ' + String(detail?.error ?? ''));
            }
          } else {
            const envEntries = {};
            for (const line of env.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (trimmed === '' || trimmed.startsWith('#')) continue;
              const at = trimmed.indexOf('=');
              if (at <= 0) throw new Error(labels.badEnv + ': ' + trimmed);
              envEntries[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1);
            }
            const response = await fetch(url, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: script.configId ?? undefined,
                dir: dir ?? '',
                script: scriptName,
                label: label.trim(),
                args: args.trim(),
                env: envEntries,
                cwd: cwd.trim(),
              }),
            });
            if (!response.ok) {
              const detail = await response.json().catch(() => null);
              throw new Error('HTTP ' + response.status + ' ' + String(detail?.error ?? ''));
            }
          }
          setBusy(false);
          if (typeof onSaved === 'function') onSaved();
        } catch (failure) {
          setBusy(false);
          setError(String(failure?.message ?? failure));
        }
      };

      const field = (key, value, onChange, placeholder) =>
        h(
          'label',
          { className: 'dsh-svc-field', key },
          h('span', { className: 'dsh-svc-field-label' }, labels[key]),
          h('input', {
            className: 'dsh-svc-input',
            value,
            spellCheck: false,
            placeholder: placeholder ?? '',
            onChange: (event) => onChange(event.target.value),
          }),
        );

      return h(
        'div',
        { className: 'dsh-svc-drawer dsh-svc-editor' },
        h(
          'div',
          { className: 'dsh-svc-drawer-head' },
          h('span', { className: 'dsh-svc-drawer-title' }, labels.title + ' · ' + scriptName),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-run-button',
              onClick: () => {
                if (typeof onCancel === 'function') onCancel();
              },
            },
            labels.close,
          ),
        ),
        h(
          'div',
          { className: 'dsh-svc-readonly', title: labels.locked },
          h('span', { className: 'dsh-svc-lock', 'aria-hidden': true }, '🔒'),
          h('code', { className: 'dsh-svc-readonly-text' }, script.command),
          h('span', { className: 'dsh-svc-readonly-note' }, labels.locked),
        ),
        field('label', label, setLabel, script.name),
        field('args', args, setArgs, labels.argsHint),
        h(
          'label',
          { className: 'dsh-svc-field' },
          h('span', { className: 'dsh-svc-field-label' }, labels.env),
          h('textarea', {
            className: 'dsh-svc-input dsh-svc-textarea',
            value: env,
            spellCheck: false,
            rows: 2,
            placeholder: 'KEY=VALUE',
            onChange: (event) => setEnv(event.target.value),
          }),
        ),
        field('cwd', cwd, setCwd, labels.cwdHint),
        error === '' ? null : h('p', { className: 'dsh-svc-notice is-error' }, error),
        h(
          'div',
          { className: 'dsh-svc-editor-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-icon is-primary',
              title: labels.save,
              'aria-label': labels.save,
              disabled: busy,
              onClick: () => void save(false),
            },
            h(
              'svg',
              { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
              h('path', {
                d: 'M3.5 8.5 6.5 11.5 12.5 4.5',
                stroke: 'currentColor',
                strokeWidth: 1.6,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
          ),
          script.overridden === true
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-svc-icon',
                  title: labels.reset,
                  'aria-label': labels.reset,
                  disabled: busy,
                  onClick: () => void save(true),
                },
                h(
                  'svg',
                  { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                  h('path', {
                    d: 'M4 6.5A5 5 0 1 1 5.5 11',
                    stroke: 'currentColor',
                    strokeWidth: 1.4,
                    strokeLinecap: 'round',
                  }),
                ),
              )
            : null,
        ),
      );
    }

    /**
     * A started service's collected output, polled while its view is open. It
     * carries its own header and close control, so leaving it never depends on
     * finding the row again, and the id/status make an empty result diagnosable.
     */
    function OutputView({ sessionId, id, name, labels, onClose }) {
      const [text, setText] = React.useState('');
      const [issue, setIssue] = React.useState('');
      const [loaded, setLoaded] = React.useState(false);
      const [truncated, setTruncated] = React.useState(false);
      // Line wrapping is a reading preference, not a per-run decision, so it is
      // remembered per browser rather than per service.
      const [wrap, setWrap] = React.useState(() => {
        try {
          return window.localStorage.getItem('dsh.services.logWrap') === '1';
        } catch {
          return false;
        }
      });
      const toggleWrap = () => {
        setWrap((current) => {
          const next = !current;
          try {
            window.localStorage.setItem('dsh.services.logWrap', next ? '1' : '0');
          } catch {
            /* storage may be unavailable */
          }
          return next;
        });
      };
      React.useEffect(() => {
        let alive = true;
        const tick = async () => {
          const url =
            OUTPUT_ROUTE + encodeURIComponent(String(sessionId)) + '?id=' + encodeURIComponent(String(id));
          try {
            const response = await fetch(url);
            if (!response.ok) {
              if (alive) setIssue('HTTP ' + response.status + ' · ' + url);
              return;
            }
            const data = await response.json();
            if (!alive) return;
            setLoaded(true);
            if (typeof data?.text === 'string') {
              setText(data.text);
              setTruncated(data.truncated === true);
              setIssue('');
            }
          } catch (error) {
            if (alive) setIssue(String(error?.message ?? error) + ' · ' + url);
          }
        };
        void tick();
        const timer = setInterval(tick, 1200);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [sessionId, id]);
      // The Host already sends only the tail; this caps what the DOM ever holds,
      // so a chatty service cannot turn the drawer into a multi-megabyte node.
      const lines = text.split(/\r?\n/);
      const tail = lines.slice(Math.max(0, lines.length - 400)).join('\n');
      const body =
        issue !== ''
          ? issue
          : tail !== ''
            ? (truncated && labels?.truncated ? String(labels.truncated) + '\n' : '') + tail
            : loaded
              ? String(labels?.waiting ?? '')
              : String(labels?.reading ?? '');
      // A log card, not another list row: its own bordered frame, a header band
      // that carries the title and the run state, then the scrolling body.
      return h(
        'div',
        { className: 'dsh-svc-log' },
        h(
          'div',
          { className: 'dsh-svc-log-head' },
          h(
            'span',
            { className: 'dsh-svc-log-title' },
            String(labels?.title ?? 'output') + ' · ' + (name ?? ''),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-icon is-tiny' + (wrap ? ' is-active' : ''),
              title: wrap ? labels?.noWrap : labels?.wrap,
              'aria-label': wrap ? labels?.noWrap : labels?.wrap,
              'aria-pressed': wrap ? 'true' : 'false',
              onClick: toggleWrap,
            },
            h(
              'svg',
              { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
              h('path', {
                d: 'M3 4.5h10M3 8h6.5a2.5 2.5 0 0 1 0 5H6',
                stroke: 'currentColor',
                strokeWidth: 1.3,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
              wrap
                ? h('path', {
                    d: 'M7.2 11 5.2 13l2 2',
                    stroke: 'currentColor',
                    strokeWidth: 1.3,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  })
                : h('path', {
                    d: 'M3.2 13 12.8 3',
                    stroke: 'currentColor',
                    strokeWidth: 1.3,
                    strokeLinecap: 'round',
                  }),
            ),
          ),
          h(
            'span',
            { className: 'dsh-svc-log-meta' },
            String(id),
            labels?.state === undefined ? '' : ' · ' + String(labels.state),
          ),
        ),
        h('pre', { className: 'dsh-svc-log-body' + (wrap ? ' is-wrap' : '') }, body),
      );
    }


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
        async function togglePin(sessionId, dir, script, pinned) {
          try {
            await postJson(PIN_ROUTE + encodeURIComponent(String(sessionId)), {
              dir: dir ?? '',
              script,
              pinned,
            });
            emit();
          } catch (error) {
            store.notice = t('run.failed') + ' ' + String(error?.message ?? error);
            emit();
          }
        }

        /**
         * Clicking a script starts it as a Host-owned process. An npm-kind script
         * goes through the package manager in its own directory — that is what
         * puts `node_modules/.bin` on PATH — while a Go program runs as written.
         */
        async function launch(script, groupDir, groupKind) {
          store.notice = '';
          store.busy = true;
          emit();
          try {
            const created = await postJson(START_ROUTE + encodeURIComponent(String(store.sessionId)), {
              name: script.name,
              command: script.command,
              source: script.command,
              dir: groupDir ?? '',
              kind: groupKind ?? 'npm',
            });
            store.busy = false;
            store.notice = '';
            store.focusServiceId = String(created?.service?.id ?? '');
            // Starting never navigates: the dropdown is meant to be usable
            // without opening the panel, and the panel is already open when its
            // own start button is the caller.
            setOpen(false);
          } catch (error) {
            store.busy = false;
            store.notice = t('run.failed') + ' ' + String(error?.message ?? error);
          }
          emit();
        }

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

        /**
         * One section per package. The heading is always shown — it is the only
         * thing that says which package a script belongs to — and it is sticky
         * and collapsible, because a workspace with many scripts otherwise
         * scrolls past its own labels.
         */
        function groupHeading(group, compact, collapsed, toggle) {
          const label = group.name === '' ? t('group.root') : group.name;
          const open = !collapsed.has(group.id);
          return h(
            'button',
            {
              key: 'group-' + group.id,
              type: 'button',
              className:
                'dsh-svc-group' + (compact ? ' is-compact' : '') + (open ? ' is-open' : ''),
              title: group.dir === '' ? label : group.dir,
              'aria-expanded': open ? 'true' : 'false',
              onClick: () => toggle(group.id),
            },
            h(
              'svg',
              { className: 'dsh-svc-chevron', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
              h('path', {
                d: 'M6 3.5 10.5 8 6 12.5',
                stroke: 'currentColor',
                strokeWidth: 1.4,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
            h('span', { className: 'dsh-svc-group-name' }, label),
            group.kind === 'go' ? h('span', { className: 'dsh-svc-kind' }, 'go') : null,
            group.dir === '' ? null : h('span', { className: 'dsh-svc-group-dir' }, group.dir),
            h('span', { className: 'dsh-svc-count' }, String(group.scripts.length)),
          );
        }

        
        /**
         * Rows of the dropdown: click starts, and a running service exposes its
         * stop right here so the common action needs no detour through the panel.
         */
        /**
         * Rows of the dropdown. The row text is inert and one icon button acts:
         * start while idle, stop while running — so a service can be stopped from
         * here without opening the panel, and a stray click cannot start anything.
         */
        function menuItems(groups, collapsed, toggle, runningByCommand, stopService, armedStop, armStop, disarmStop) {
          const nodes = [];
          groups.forEach((group, groupIndex) => {
            nodes.push(groupHeading(group, true, collapsed, toggle));
            if (collapsed.has(group.id)) return;
            sortScripts(group.scripts).forEach((script, index) => {
              const runningId = runningByCommand.get(script.command);
              const running = runningId !== undefined;
              nodes.push(
                h(
                  'div',
                  {
                    key: 'item-' + groupIndex + '-' + index,
                    className: 'dsh-svc-item' + (running ? ' is-running' : ''),
                    title: script.command,
                  },
                  RuntimeBadge(script.command, 'badge'),
                  h(
                    'span',
                    { className: 'dsh-svc-item-text', key: 'text' },
                    h('span', { className: 'dsh-svc-item-name' }, script.name),
                    h('span', { className: 'dsh-svc-item-command' }, script.command),
                  ),
                  h(
                    'span',
                    { className: 'dsh-svc-actions', key: 'actions' },
                    running
                      ? h(
                          'button',
                          {
                            key: 'stop',
                            type: 'button',
                            className: 'dsh-svc-stop' + (armedStop === runningId ? ' is-armed' : ''),
                            title: armedStop === runningId ? t('run.confirmStop') : t('run.stop'),
                            'aria-label': armedStop === runningId ? t('run.confirmStop') : t('run.stop'),
                            onClick: () => {
                              if (armedStop === runningId) {
                                disarmStop();
                                void stopService(runningId);
                                return;
                              }
                              armStop(runningId);
                            },
                          },
                          armedStop === runningId
                            ? h('span', { className: 'dsh-svc-stop-label' }, t('run.confirmStop'))
                            : h(
                                'svg',
                                { viewBox: '0 0 16 16', 'aria-hidden': true },
                                h('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.5, fill: 'currentColor' }),
                              ),
                        )
                      : h(
                          'button',
                          {
                            key: 'start',
                            type: 'button',
                            className: 'dsh-svc-icon',
                            title: t('run.start'),
                            'aria-label': t('run.start'),
                            onClick: () => {
                              void launch(script, group.dir, group.kind);
                            },
                          },
                          h(
                            'svg',
                            { viewBox: '0 0 16 16', 'aria-hidden': true },
                            h('path', { d: 'M5.5 3.5 12 8l-6.5 4.5z', fill: 'currentColor' }),
                          ),
                        ),
                  ),
                ),
              );
            });
          });
          return nodes;
        }

        /**
         * Two-step stop: the first press arms one service, the second confirms.
         * The arm stays until the user confirms, cancels, or arms another row —
         * it never expires on a timer, because a confirm that vanishes on its own
         * is the opposite of a confirmation.
         */
        function useArmedStop() {
          const [armed, setArmed] = React.useState('');
          const arm = React.useCallback((id) => setArmed(id), []);
          const disarm = React.useCallback(() => setArmed(''), []);
          return [armed, arm, disarm];
        }

        /** Collapsed group ids; a group stays collapsed across refreshes. */
        /**
         * Collapsed group ids. The set is seeded from the workspace document and
         * written back on change, so the panel opens the way it was left — with a
         * dozen groups that is the difference between a list and a wall.
         */
        function useCollapsedGroups(sessionId, initial) {
          const [collapsed, setCollapsed] = React.useState(() => new Set(initial ?? []));
          const seeded = React.useRef(false);
          React.useEffect(() => {
            if (seeded.current || !Array.isArray(initial)) return;
            seeded.current = true;
            setCollapsed(new Set(initial));
          }, [initial]);
          const toggle = React.useCallback(
            (id) => {
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                if (sessionId !== undefined && sessionId !== null) {
                  void fetch(UI_ROUTE + encodeURIComponent(String(sessionId)), {
                    method: 'PUT',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ collapsed: [...next] }),
                  }).catch(() => {});
                }
                return next;
              });
            },
            [sessionId],
          );
          return [collapsed, toggle];
        }

        /** Right-sidebar tab: the list, with its directory and a refresh control. */
        /**
         * The panel lists scripts and, under each one, the service that script
         * started: its state, a stop control while it runs, and its output
         * inline. A service belongs to its script, so it is not a separate block.
         */
        function PanelBody(props) {
          useLocaleRevision();
          useStoreRevision();
          const sessionId = props?.sessionId ?? store.sessionId;
          const [state, load] = useScripts(sessionId);
          const [collapsed, toggleGroup] = useCollapsedGroups(sessionId, state.collapsed);
          const services = useServices(sessionId);
          const [query, setQuery] = React.useState('');
          // rowKey -> 'starting' | 'stopping', cleared when the service reaches the
          // expected state, so the button shows the work it is doing.
          const [pending, setPending] = React.useState({});
          // A pin flips locally first: refetching the list just to paint a pin made
          // the whole tab re-render, which is far too much for one boolean.
          const [pinOverride, setPinOverride] = React.useState({});
          const [openKey, setOpenKey] = React.useState('');
          const [editKey, setEditKey] = React.useState('');
          const [armedStop, armStop, disarmStop] = useArmedStop();
          // An arm belongs to one running service; once it is gone there is
          // nothing left to confirm, so drop it (no timer involved).
          React.useEffect(() => {
            if (armedStop === '') return;
            const live = services.some(
              (service) => service.id === armedStop && service.state === 'running',
            );
            if (!live) disarmStop();
          }, [services, armedStop, disarmStop]);

          // Latest service per (command, dir): one script row shows its own run.
          const latest = new Map();
          for (const service of services) {
            const key = String(service.source ?? service.command) + '\u0000' + String(service.dir ?? '');
            const previous = latest.get(key);
            if (previous === undefined || previous.startedAt <= service.startedAt) latest.set(key, service);
          }

          // Clear a pending button once the run settles into the state it asked
          // for, so a spinner never sticks when the service is already there.
          React.useEffect(() => {
            const entries = Object.entries(pending);
            if (entries.length === 0) return;
            const next = {};
            let changed = false;
            for (const [serviceKey, phase] of entries) {
              const service = latest.get(serviceKey);
              const settled =
                phase === 'starting'
                  ? service !== undefined && service.state !== 'starting' && service.state !== 'stopped'
                  : service === undefined || service.state !== 'running';
              if (settled) changed = true;
              else next[serviceKey] = phase;
            }
            if (changed) setPending(next);
          }, [services]);

          const statusChip = (service) => {
            if (service === undefined) return null;
            if (service.state === 'running') {
              return h('span', { className: 'dsh-svc-chip is-running' }, t('run.running'));
            }
            if (service.state === 'stopping') {
              return h('span', { className: 'dsh-svc-chip' }, t('run.stopping'));
            }
            return h(
              'span',
              { className: 'dsh-svc-chip is-done' },
              t('run.exited') + ' ' + String(service.exitCode ?? '?'),
            );
          };

          const rowFor = (group, script, index, showPath, instance) => {
            const key = String(script.command) + '\u0000' + String(group.dir ?? '');
            // Two rows can show the same script (pinned area plus its group); the
            // drawer key carries the row instance so only the clicked one opens.
            const rowKey = String(instance ?? 'group') + '|' + key;
            const service = latest.get(key);
            const open = openKey === rowKey;
            const pinKey = String(group.dir ?? '') + '\u0000' + String(script.original ?? script.name);
            const pinned = pinOverride[pinKey] === undefined ? script.pinned === true : pinOverride[pinKey];
            const phase = pending[key] ?? '';
            const running = service?.state === 'running';
            const actions = [];
            if (!running) {
              actions.push(
                h(
                  'button',
                  {
                    key: 'start',
                    type: 'button',
                    className: 'dsh-svc-icon',
                    title: phase === 'starting' ? t('run.starting') : t('run.start'),
                    'aria-label': t('run.start'),
                    disabled: phase === 'starting',
                    onClick: () => {
                      setPending((current) => ({ ...current, [key]: 'starting' }));
                      void launch(script, group.dir, group.kind);
                    },
                  },
                  phase === 'starting'
                    ? h('span', { className: 'dsh-svc-spinner is-small' })
                    : h(
                        'svg',
                        { viewBox: '0 0 16 16', 'aria-hidden': true },
                        h('path', { d: 'M5.5 3.5 12 8l-6.5 4.5z', fill: 'currentColor' }),
                      ),
                ),
              );
            } else {
              actions.push(
                h(
                  'button',
                  {
                    key: 'stop',
                    type: 'button',
                    className:
                      'dsh-svc-stop' +
                      (armedStop === service.id ? ' is-armed' : '') +
                      (phase === 'stopping' ? ' is-busy' : ''),
                    disabled: phase === 'stopping',
                    title: armedStop === service.id ? t('run.confirmStop') : t('run.stop'),
                    'aria-label': armedStop === service.id ? t('run.confirmStop') : t('run.stop'),
                    onClick: () => {
                      if (armedStop === service.id) {
                        disarmStop();
                        setPending((current) => ({ ...current, [key]: 'stopping' }));
                        void stopService(sessionId, service.id);
                        return;
                      }
                      armStop(service.id);
                    },
                  },
                  phase === 'stopping'
                    ? h('span', { className: 'dsh-svc-spinner is-small' })
                    : armedStop === service.id
                      ? h('span', { className: 'dsh-svc-stop-label' }, t('run.confirmStop'))
                      : h(
                        'svg',
                        { viewBox: '0 0 16 16', 'aria-hidden': true },
                        h('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.5, fill: 'currentColor' }),
                      ),
                ),
              );
            }
            if (service !== undefined) {
              actions.push(
                h(
                  'button',
                  {
                    key: 'output',
                    type: 'button',
                    className: 'dsh-svc-icon',
                    title: open ? t('run.hide') : t('run.output'),
                    'aria-label': open ? t('run.hide') : t('run.output'),
                    onClick: () => setOpenKey(open ? '' : rowKey),
                  },
                  h(
                    'svg',
                    { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                    h('path', {
                      d: open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4',
                      stroke: 'currentColor',
                      strokeWidth: 1.4,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }),
                  ),
                ),
              );
            }
            return h(
              'div',
              { key: 'entry-' + index, className: 'dsh-svc-entry-block' },
              h(
                'div',
                {
                  className: 'dsh-svc-row' + (running ? ' is-running' : ''),
                  title: script.command,
                },
                RuntimeBadge(script.command, 'badge'),
                h(
                  'span',
                  { className: 'dsh-svc-row-text', key: 'text' },
                  h(
                    'span',
                    { className: 'dsh-svc-name-line', key: 'name-line' },
                    h('span', { className: 'dsh-svc-name', key: 'name' }, script.name),
                    statusChip(service),
                    script.overridden === true
                      ? h(
                          'span',
                          { className: 'dsh-svc-chip is-overridden', key: 'ov' },
                          script.variantLabel === '' || script.variantLabel === undefined
                            ? t('run.overridden')
                            : script.variantLabel,
                        )
                      : null,
                  ),
                  h('span', { className: 'dsh-svc-command', key: 'command' }, script.command),
                  showPath === true
                    ? h('span', { className: 'dsh-svc-lastline', key: 'path' }, group.name)
                    : null,
                  service === undefined || service.lastLine === ''
                    ? null
                    : h('span', { className: 'dsh-svc-lastline', key: 'last' }, service.lastLine),
                ),
                h(
                  'span',
                  { className: 'dsh-svc-actions', key: 'actions' },
                  Array.isArray(script.variants) && script.variants.length > 0
                    ? h(
                        'select',
                        {
                          key: 'variant',
                          className: 'dsh-svc-variant',
                          title: t('run.variant'),
                          value: script.configId ?? '',
                          onChange: (event) => {
                            const value = event.target.value;
                            void postJson(UI_ROUTE + encodeURIComponent(String(sessionId)), {
                              dir: group.dir ?? '',
                              script: script.original ?? script.name,
                              configId: value,
                            })
                              .then(() => load())
                              .catch(() => {});
                          },
                        },
                        script.variants.map((variant) =>
                          h(
                            'option',
                            { key: variant.id, value: variant.id },
                            variant.label === '' ? variant.id : variant.label,
                          ),
                        ),
                      )
                    : null,
                  h(
                    'button',
                    {
                      key: 'pin',
                      type: 'button',
                      className: 'dsh-svc-icon' + (pinned ? ' is-pinned' : ''),
                      title: pinned ? t('pin.remove') : t('pin.add'),
                      'aria-label': pinned ? t('pin.remove') : t('pin.add'),
                      onClick: () => {
                        const next = !pinned;
                        setPinOverride((current) => ({ ...current, [pinKey]: next }));
                        void togglePin(
                          sessionId,
                          group.dir,
                          script.original ?? script.name,
                          next,
                        ).catch(() =>
                          setPinOverride((current) => ({ ...current, [pinKey]: !next })),
                        );
                      },
                    },
                    h(
                      'svg',
                      { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                      h('path', {
                        d: 'M6 2.5h4l-.6 3.2 2.1 2.1H4.5l2.1-2.1z',
                        fill: pinned ? 'currentColor' : 'none',
                        stroke: 'currentColor',
                        strokeWidth: 1.2,
                        strokeLinejoin: 'round',
                      }),
                      h('path', { d: 'M8 8v5.5', stroke: 'currentColor', strokeWidth: 1.2 }),
                    ),
                  ),
                  h(
                    'button',
                    {
                      key: 'edit',
                      type: 'button',
                      className: 'dsh-svc-icon',
                      title: t('run.edit'),
                      'aria-label': t('run.edit'),
                      onClick: () => setEditKey(editKey === rowKey ? '' : rowKey),
                    },
                    h(
                      'svg',
                      { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                      h('path', {
                        d: 'M10.8 2.9 13.1 5.2 6 12.3 3 13l.7-3z',
                        stroke: 'currentColor',
                        strokeWidth: 1.3,
                        strokeLinejoin: 'round',
                      }),
                    ),
                  ),
                  actions,
                ),
              open && service !== undefined
                ? h(OutputView, {
                    key: 'output-view',
                    sessionId,
                    id: service.id,
                    name: script.name,
                    labels: {
                      title: t('run.output'),
                      state:
                        service.state === 'running'
                          ? t('run.running')
                          : t('run.exited') + ' ' + String(service.exitCode ?? '?'),
                      waiting: t('output.waiting'),
                      reading: t('output.reading'),
                      hide: t('run.hide'),
                      truncated: t('output.truncated'),
                      wrap: t('output.wrap'),
                      noWrap: t('output.noWrap'),
                    },
                    onClose: () => setOpenKey(''),
                  })
                : null,
              ),
              editKey === rowKey
                ? h(ConfigEditor, {
                    key: 'editor',
                    sessionId,
                    script,
                    dir: group.dir ?? '',
                    labels: {
                      title: t('edit.title'),
                      name: t('edit.name'),
                      args: t('edit.args'),
                      argsHint: t('edit.argsHint'),
                      env: t('edit.env'),
                      cwd: t('edit.cwd'),
                      cwdHint: t('edit.cwdHint'),
                      locked: t('edit.locked'),
                      save: t('edit.save'),
                      reset: t('edit.reset'),
                      close: t('edit.close'),
                      badEnv: t('edit.badEnv'),
                    },
                    onSaved: () => {
                      setEditKey('');
                      load();
                    },
                    onCancel: () => setEditKey(''),
                  })
                : null,
            );
          };

          const sections = [];
          if (state.phase === 'loading') {
            sections.push(
              h(
                'div',
                { className: 'dsh-svc-empty', key: 'loading' },
                h('span', { className: 'dsh-svc-spinner' }),
                t('panel.loading'),
              ),
            );
          } else if (state.phase === 'error') {
            sections.push(h('div', { className: 'dsh-svc-empty', key: 'error' }, t('panel.error')));
          } else if (state.phase === 'empty') {
            sections.push(h('div', { className: 'dsh-svc-empty', key: 'empty' }, t('panel.empty')));
          } else {
            // Pinned rows leave their group and form one flat area on top, so a
            // shortcut is never buried inside a collapsed group. Order inside it
            // is by last start (the only place recency is allowed to reorder);
            // groups keep a fixed order, which is what makes them findable.
            const pinned = [];
            for (const group of state.groups) {
              for (const script of group.scripts) {
                if (script.pinned === true) pinned.push({ group, script });
              }
            }
            pinned.sort(
              (left, right) =>
                Number(right.script.lastStartedAt ?? 0) - Number(left.script.lastStartedAt ?? 0) ||
                String(left.script.name).localeCompare(String(right.script.name)),
            );
            if (pinned.length > 0) {
              sections.push(
                h(
                  'div',
                  { className: 'dsh-svc-pinned-head', key: 'pinned-head' },
                  h('span', { className: 'dsh-svc-pinned-title' }, t('pin.title')),
                  h('span', { className: 'dsh-svc-group-count' }, String(pinned.length)),
                ),
              );
              pinned.forEach((entry, index) => {
                sections.push(rowFor(entry.group, entry.script, 'pin-' + index, true, 'pin'));
              });
            }
            const needle = query.trim().toLowerCase();
            const matches = (script) =>
              needle === '' ||
              String(script.name).toLowerCase().includes(needle) ||
              String(script.command).toLowerCase().includes(needle);
            state.groups.forEach((group, groupIndex) => {
              // Pinned scripts stay in their group: the top area is a shortcut,
              // not a move, and a row that vanishes reads as a bug.
              const rest = sortScripts(group.scripts).filter((script) => matches(script));
              if (rest.length === 0) return;
              sections.push(groupHeading(group, false, collapsed, toggleGroup));
              // While searching, a collapsed group must not hide its matches.
              if (needle === '' && collapsed.has(group.id)) return;
              rest.forEach((script, index) => {
                sections.push(rowFor(group, script, groupIndex + '-' + index, false, 'group'));
              });
            });
            if (needle !== '' && sections.length === 0) {
              sections.push(h('div', { className: 'dsh-svc-empty', key: 'no-match' }, t('menu.noMatch')));
            }
          }

          return h(
            'div',
            { className: 'dsh-svc-panel' },
            h('style', { key: 'css' }, CSS),
            h(
              'div',
              { className: 'dsh-svc-head', key: 'head' },
              h('span', { className: 'dsh-svc-dir', title: state.dir }, state.dir),
              h(
                'div',
                { className: 'dsh-svc-head-actions', key: 'actions' },
                h(
                  'button',
                  { className: 'dsh-svc-refresh', key: 'refresh', type: 'button', title: BUILD, onClick: load },
                  t('panel.refresh'),
                ),

              ),
            ),
            h(
              'div',
              { className: 'dsh-svc-search-row', key: 'search-row' },
              h('input', {
                className: 'dsh-svc-search-input',
                type: 'search',
                value: query,
                placeholder: t('menu.search'),
                spellCheck: false,
                'aria-label': t('menu.search'),
                onChange: (event) => setQuery(event.target.value),
              }),
            ),
            store.notice === ''
              ? null
              : h('p', { className: 'dsh-svc-notice', key: 'notice' }, store.notice),
            h('div', { className: 'dsh-svc-list', key: 'list' }, sections),
          );
        }

        function PanelTitle() {
          useLocaleRevision();
          return h('span', null, t('tab.title'));
        }

        /**
         * Header entry: toggles the dropdown. It also publishes the Session and
         * the composer actions the overlay needs, because the overlay itself is
         * root-scoped and receives neither.
         */
        function HeaderEntry(props) {
          useLocaleRevision();
          store.sessionId = props?.sessionId;
          store.actions = props?.inputActions;
          const ref = React.useRef(null);

          // Size from the control physically next to us in the same row.
          React.useEffect(() => {
            const button = ref.current;
            if (button === null) return;
            const wrapper = button.parentElement;
            const rowElement = wrapper?.parentElement;
            if (wrapper === null || rowElement === null) return;
            const siblings = Array.from(rowElement.children);
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

          React.useEffect(() => {
            if (store.open === false) return undefined;
            const onKey = (event) => {
              if (event.key === 'Escape') setOpen(false);
            };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [store.open]);

          const label = t('entry.label');
          return h(
            React.Fragment,
            null,
            h('style', { key: 'css' }, CSS),
            h(
              'button',
              {
                key: 'button',
                id: 'dsh-services-entry',
                type: 'button',
                ref,
                className: 'dsh-svc-entry',
                title: label,
                'aria-label': label,
                'aria-expanded': store.open ? 'true' : 'false',
                onClick: (event) => {
                  event.stopPropagation();
                  setOpen(!store.open);
                },
              },
              h(
                'svg',
                { viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': true, fill: 'none' },
                h('path', {
                  d: 'M5.5 3.6 11.4 8l-5.9 4.4z',
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                  strokeLinejoin: 'round',
                  fill: 'currentColor',
                }),
              ),
            ),
          );
        }

        /** The dropdown, mounted on the frame overlay and anchored to the entry. */
        function MenuOverlay() {
          useLocaleRevision();
          useStoreRevision();
          const [anchor, setAnchor] = React.useState(null);
          const [state, load] = useScripts(store.open ? store.sessionId : undefined);
          const [collapsed, toggleGroup] = useCollapsedGroups();
          const services = useServices(store.open ? store.sessionId : undefined);
          const [armedStop, armStop, disarmStop] = useArmedStop();

          React.useEffect(() => {
            if (store.open === false) {
              setAnchor(null);
              return undefined;
            }
            const measure = () => {
              const button = document.getElementById('dsh-services-entry');
              if (button === null) return;
              const box = button.getBoundingClientRect();
              setAnchor({ right: window.innerWidth - box.right, top: box.bottom + 6 });
            };
            measure();
            window.addEventListener('resize', measure);
            window.addEventListener('scroll', measure, true);
            return () => {
              window.removeEventListener('resize', measure);
              window.removeEventListener('scroll', measure, true);
            };
          }, [store.open]);

          React.useEffect(() => {
            if (store.open === false) return undefined;
            const onDown = (event) => {
              const target = event.target;
              if (target instanceof Element) {
                if (target.closest('.dsh-svc-menu') !== null) return;
                if (target.closest('#dsh-services-entry') !== null) return;
              }
              setOpen(false);
            };
            document.addEventListener('mousedown', onDown, true);
            return () => document.removeEventListener('mousedown', onDown, true);
          }, [store.open]);

          // The filter is per opening: one click away, empty again next time.
          const [query, setQuery] = React.useState('');
          const searchRef = React.useRef(null);

          React.useEffect(() => {
            if (store.open === false) return;
            setQuery('');
          }, [store.open]);

          React.useEffect(() => {
            if (store.open === false || anchor === null) return;
            const input = searchRef.current;
            if (input !== null) input.focus();
          }, [store.open, anchor]);

          if (store.open === false || anchor === null) return null;

          const visible = filterGroups(state.groups, query);
          const runningByCommand = new Map();
          for (const running of services) {
            if (running.state === 'running') runningByCommand.set(String(running.source ?? running.command), running.id);
          }
          const items =
            state.phase === 'ready'
              ? visible.length > 0
                ? menuItems(
                    visible,
                    collapsed,
                    toggleGroup,
                    runningByCommand,
                    (id) => void stopService(store.sessionId, id),
                    armedStop,
                    armStop,
                    disarmStop,
                  )
                : [h('div', { key: 'nomatch', className: 'dsh-svc-empty' }, t('menu.noMatch'))]
              : [
                  h(
                    'div',
                    { key: 'state', className: 'dsh-svc-empty' },
                    state.phase === 'loading' ? h('span', { className: 'dsh-svc-spinner' }) : null,
                    state.phase === 'loading' ? t('panel.loading') : t('menu.empty'),
                  ),
                ];

          return h(
            'div',
            {
              className: 'dsh-svc-menu',
              style: { right: anchor.right + 'px', top: anchor.top + 'px' },
              role: 'menu',
            },
            h(
              'div',
              { className: 'dsh-svc-menu-head' },
              h('span', null, t('menu.title')),
              h(
                'button',
                { type: 'button', className: 'dsh-svc-refresh', onClick: load },
                t('panel.refresh'),
              ),
            ),
            h(
              'label',
              { className: 'dsh-svc-search', key: 'search' },
              h('input', {
                ref: searchRef,
                type: 'search',
                value: query,
                placeholder: t('menu.search'),
                'aria-label': t('menu.search'),
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setOpen(false);
                  }
                },
              }),
            ),
            h('div', { className: 'dsh-svc-menu-list' }, items),
            h(
              'div',
              { className: 'dsh-svc-menu-foot' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-svc-foot-button',
                  onClick: () => {
                    try {
                      controller?.openTab(KIND);
                    } catch (error) {
                      console.error('[services] cannot open the panel', error);
                    }
                    setOpen(false);
                  },
                },
                t('menu.open'),
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