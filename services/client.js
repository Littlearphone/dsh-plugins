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

    const ZH = {
      'tab.title': '服务',
      'entry.label': '启动脚本',
      'panel.loading': '正在读取脚本…',
      'panel.empty': '这个工作区没有 package.json，或者里面没有 scripts。',
      'panel.error': '读取脚本失败。',
      'panel.refresh': '刷新',
      'panel.dir': '目录',
      'group.root': '根包',
      'panel.send': '发送到对话',
      'panel.note': '点击脚本名把命令发到对话里执行；执行本身仍由会话负责。',
      'menu.title': '启动脚本',
      'menu.empty': '没有可用的脚本。',
      'menu.hint': '点击一项，命令会填进输入框并发送。',
      'menu.open': '在侧栏打开',
    };

    const EN = {
      'tab.title': 'Services',
      'entry.label': 'Start scripts',
      'panel.loading': 'Reading scripts…',
      'panel.empty': 'This workspace has no package.json, or it declares no scripts.',
      'panel.error': 'Could not read the scripts.',
      'panel.refresh': 'Refresh',
      'panel.dir': 'Directory',
      'group.root': 'root',
      'panel.send': 'Send to chat',
      'panel.note': 'Clicking a script sends its command to the conversation; execution stays with the Session.',
      'menu.title': 'Start scripts',
      'menu.empty': 'No scripts available.',
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
      { id: 'pnpm', label: 'pnpm', tint: '#F69220', icon: 'pnpm', pattern: /(^|[\s/\\])pnpm\b/ },
      { id: 'yarn', label: 'yarn', tint: '#2C8EBB', icon: 'yarn', pattern: /(^|[\s/\\])yarn\b/ },
      {
        id: 'node',
        label: 'node',
        tint: '#5FA04E',
        icon: 'node',
        pattern: /(^|[\s/\\])(node|tsx|ts-node|nodemon|vite|next|webpack|rollup|esbuild|jest|vitest|mocha)\b/,
      },
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
      node: 'M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z',
      npm: 'M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z',
      pnpm: 'M0 0v7.5h7.5V0zm8.25 0v7.5h7.498V0zm8.25 0v7.5H24V0zM8.25 8.25v7.5h7.498v-7.5zm8.25 0v7.5H24v-7.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.498v-7.5zm8.25 0V24H24v-7.5z',
      yarn: 'M12 0C5.375 0 0 5.375 0 12s5.375 12 12 12 12-5.375 12-12S18.625 0 12 0zm.768 4.105c.183 0 .363.053.525.157.125.083.287.185.755 1.154.31-.088.468-.042.551-.019.204.056.366.19.463.375.477.917.542 2.553.334 3.605-.241 1.232-.755 2.029-1.131 2.576.324.329.778.899 1.117 1.825.278.774.31 1.478.273 2.015a5.51 5.51 0 0 0 .602-.329c.593-.366 1.487-.917 2.553-.931.714-.009 1.269.445 1.353 1.103a1.23 1.23 0 0 1-.945 1.362c-.649.158-.95.278-1.821.843-1.232.797-2.539 1.242-3.012 1.39a1.686 1.686 0 0 1-.704.343c-.737.181-3.266.315-3.466.315h-.046c-.783 0-1.214-.241-1.45-.491-.658.329-1.51.19-2.122-.134a1.078 1.078 0 0 1-.58-1.153 1.243 1.243 0 0 1-.153-.195c-.162-.25-.528-.936-.454-1.946.056-.723.556-1.367.88-1.71a5.522 5.522 0 0 1 .408-2.256c.306-.727.885-1.348 1.32-1.737-.32-.537-.644-1.367-.329-2.21.227-.602.412-.936.82-1.08h-.005c.199-.074.389-.153.486-.259a3.418 3.418 0 0 1 2.298-1.103c.037-.093.079-.185.125-.283.31-.658.639-1.029 1.024-1.168a.94.94 0 0 1 .328-.06zm.006.7c-.507.016-1.001 1.519-1.001 1.519s-1.27-.204-2.266.871c-.199.218-.468.334-.746.44-.079.028-.176.023-.417.672-.371.991.625 2.094.625 2.094s-1.186.839-1.626 1.881c-.486 1.144-.338 2.261-.338 2.261s-.843.732-.899 1.487c-.051.663.139 1.2.343 1.515.227.343.51.176.51.176s-.561.653-.037.931c.477.25 1.283.394 1.71-.037.31-.31.371-1.001.486-1.283.028-.065.12.111.209.199.097.093.264.195.264.195s-.755.324-.445 1.066c.102.246.468.403 1.066.398.222-.005 2.664-.139 3.313-.296.375-.088.505-.283.505-.283s1.566-.431 2.998-1.357c.917-.598 1.293-.76 2.034-.936.612-.148.57-1.098-.241-1.084-.839.009-1.575.44-2.196.825-1.163.718-1.742.672-1.742.672l-.018-.032c-.079-.13.371-1.293-.134-2.678-.547-1.515-1.413-1.881-1.344-1.997.297-.5 1.038-1.297 1.334-2.78.176-.899.13-2.377-.269-3.151-.074-.144-.732.241-.732.241s-.616-1.371-.788-1.483a.271.271 0 0 0-.157-.046z',
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

    const CSS = `
.dsh-svc-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;height:100%;min-height:0;padding:10px 0 0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;}
.dsh-svc-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;}
.dsh-svc-dir{min-width:0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;}
.dsh-svc-refresh{flex:none;box-sizing:border-box;height:22px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}
.dsh-svc-refresh:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dsh-svc-note{flex:none;margin:0;padding:0 12px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.dsh-svc-group{display:flex;flex:none;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 2px 2px;font-size:11px;line-height:1.3;color:var(--dsw-alias-label-secondary);}
.dsh-svc-group-name{min-width:0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-svc-group-dir{flex:none;font-size:10px;font-family:var(--dsh-font-family-code,monospace);color:var(--dsw-alias-label-secondary);opacity:.8;}
.dsh-svc-list{display:flex;flex:1 1 auto;flex-direction:column;gap:4px;min-height:0;padding:2px 12px 12px;overflow-y:auto;}
.dsh-svc-row{box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;background:var(--dsw-alias-bg-base);text-align:left;}
.dsh-svc-row-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
.dsh-svc-row.is-button{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
@media (hover:hover){
.dsh-svc-row.is-button:hover{transform:translateY(-1px);border-color:var(--dsw-alias-state-business-primary);box-shadow:0 6px 16px rgba(0,0,0,.10);}
}
.dsh-svc-name{font-size:12px;line-height:1.3;font-weight:500;}
.dsh-svc-command{font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary);font-family:var(--dsh-font-family-code,monospace);overflow-wrap:anywhere;}
.dsh-svc-empty{padding:14px 0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
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
.dsh-svc-item:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dsh-svc-item-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
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
                    name: typeof group?.name === 'string' ? group.name : '',
                    dir: typeof group?.dir === 'string' ? group.dir : '',
                    scripts: Array.isArray(group?.scripts) ? group.scripts : [],
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

    /** Hand a command to the composer: fill the draft, then send it. */
    function sendCommand(command) {
      const actions = store.actions;
      if (actions === undefined || actions === null) return false;
      try {
        if (typeof actions.setDraft === 'function') actions.setDraft(command);
        if (typeof actions.submit === 'function') actions.submit();
        return true;
      } catch (error) {
        console.error('[services] cannot hand the command to the composer', error);
        return false;
      }
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale', 'layout'],

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

        function row(script, key, interactive) {
          const common = {
            key,
            className: 'dsh-svc-row' + (interactive ? ' is-button' : ''),
            title: script.command,
          };
          const body = [
            RuntimeBadge(script.command, 'badge'),
            h(
              'span',
              { className: 'dsh-svc-row-text', key: 'text' },
              h('span', { className: 'dsh-svc-name', key: 'name' }, script.name),
              h('span', { className: 'dsh-svc-command', key: 'command' }, script.command),
            ),
          ];
          return interactive
            ? h('button', { ...common, type: 'button', onClick: () => sendCommand(script.command) }, body)
            : h('div', common, body);
        }

        /**
         * One section per package. The heading only appears when the workspace
         * actually has several packages, so a single-package project stays a
         * flat list.
         */
        function groupHeading(group, index) {
          const label = group.name === '' ? t('group.root') : group.name;
          return h(
            'div',
            { className: 'dsh-svc-group', key: 'group-' + index, title: group.dir === '' ? label : group.dir },
            h('span', { className: 'dsh-svc-group-name' }, label),
            group.dir === ''
              ? null
              : h('span', { className: 'dsh-svc-group-dir' }, group.dir),
          );
        }

        function panelSections(groups) {
          const nodes = [];
          const showHeadings = groups.length > 1;
          groups.forEach((group, groupIndex) => {
            if (showHeadings) nodes.push(groupHeading(group, groupIndex));
            group.scripts.forEach((script, index) => {
              nodes.push(row(script, 'row-' + groupIndex + '-' + index, true));
            });
          });
          return nodes;
        }

        function menuItems(groups) {
          const nodes = [];
          const showHeadings = groups.length > 1;
          groups.forEach((group, groupIndex) => {
            if (showHeadings) nodes.push(groupHeading(group, 'menu-' + groupIndex));
            group.scripts.forEach((script, index) => {
              nodes.push(
                h(
                  'button',
                  {
                    key: 'item-' + groupIndex + '-' + index,
                    type: 'button',
                    className: 'dsh-svc-item',
                    title: script.command,
                    onClick: () => {
                      sendCommand(script.command);
                      setOpen(false);
                    },
                  },
                  RuntimeBadge(script.command, 'badge'),
                  h(
                    'span',
                    { className: 'dsh-svc-item-text', key: 'text' },
                    h('span', { className: 'dsh-svc-item-name' }, script.name),
                    h('span', { className: 'dsh-svc-item-command' }, script.command),
                  ),
                ),
              );
            });
          });
          return nodes;
        }

        /** Right-sidebar tab: the list, with its directory and a refresh control. */
        function PanelBody(props) {
          useLocaleRevision();
          const sessionId = props?.sessionId ?? store.sessionId;
          const [state, load] = useScripts(sessionId);

          const content =
            state.phase === 'loading'
              ? h('p', { className: 'dsh-svc-empty', key: 'loading' }, t('panel.loading'))
              : state.phase === 'error'
                ? h('p', { className: 'dsh-svc-empty', key: 'error' }, t('panel.error'))
                : state.phase === 'empty'
                  ? h('p', { className: 'dsh-svc-empty', key: 'empty' }, t('panel.empty'))
                  : panelSections(state.groups);

          return h(
            'div',
            { className: 'dsh-svc-panel' },
            h('style', { key: 'css' }, CSS),
            h(
              'div',
              { className: 'dsh-svc-head', key: 'head' },
              h(
                'span',
                { className: 'dsh-svc-dir', title: state.dir },
                (state.dir === '' ? '' : '…') + state.dir,
              ),
              h(
                'button',
                {
                  className: 'dsh-svc-refresh',
                  key: 'refresh',
                  type: 'button',
                  onClick: load,
                },
                t('panel.refresh'),
              ),
            ),
            h('p', { className: 'dsh-svc-note', key: 'note' }, t('panel.note')),
            h('div', { className: 'dsh-svc-list', key: 'list' }, content),
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

          if (store.open === false || anchor === null) return null;

          const items =
            state.phase === 'ready'
              ? menuItems(state.groups)
              : [
                  h(
                    'div',
                    { key: 'state', className: 'dsh-svc-empty' },
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
