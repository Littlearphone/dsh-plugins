/**
 * Services — the workspace's start scripts, in two places:
 *
 *   1. a right-sidebar tab that lists them (the "Services" panel), and
 *   2. a Session-header dropdown for reaching one without leaving the chat.
 *
 * Discovery is the Host half's job (`GET /services/list/<sessionId>`); this half
 * only renders what it returns and hands a chosen command to the composer.
 * Lifecycle calls (`start`, `stop`, `restart`) go to the Host, which owns the
 * process and the launch descriptor a restart needs. Stop and restart are both
 * two-step: one click arms, the second confirms. Finished runs surface through
 * the small toast overlay, not only inside the panel.
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
    const BUILD = 'services 0.1.13';

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
      'run.exitOk': '正常',
      'run.exitFail': '失败',
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
      'edit.runner': '运行器',
      'edit.runnerAuto': '自动',
      'edit.jdk': 'JDK',
      'edit.jdkAuto': '留空 = 自动',
      'edit.jdkCustom': '自定义…',
      'edit.jdkPathHint': 'C:\\path\\to\\jdk（JAVA_HOME）',
      'dl.addJdk': '下载 JDK',
      'dl.addMaven': '下载 Maven',
      'dl.install': '下载',
      'dl.installing': '安装中…',
      'dl.downloading': '下载中',
      'dl.extracting': '解压中…',
      'dl.done': '已安装',
      'dl.failed': '失败',
      'edit.env': '环境变量',
      'edit.cwd': '工作目录',
      'edit.cwdHint': '相对工作区根；留空 = 脚本所在包目录',
      'edit.locked': '来自 package.json，不能在这里修改',
      'edit.save': '保存',
      'edit.reset': '还原为原生',
      'edit.close': '收起',
      'edit.badEnv': '环境变量要写成 KEY=VALUE',
      'warn.maven': '没找到 Maven（mvnw / mvn / mvnd 都没有）：Maven 行和 Java 启动类会报"不是内部或外部命令"。',
      'warn.jdk': '没找到可用的 JDK（~/.jdks、.idea、JAVA_HOME、PATH 都没有）：JVM 的启动都需要它。',
      'run.stop': '停止',
      'run.confirmStop': '确认停止',
      'run.restart': '重启',
      'run.confirmRestart': '确认重启',
      'run.restarting': '重启中…',
      'run.restartFailed': '重启失败：',
      'toast.done': '执行结束',
      'toast.failed': '执行失败',
      'toast.exitCode': '退出码',
      'toast.close': '关闭',
      'toast.service': '服务',
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
      'run.exitOk': 'ok',
      'run.exitFail': 'failed',
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
      'edit.runner': 'Runner',
      'edit.runnerAuto': 'auto',
      'edit.jdk': 'JDK',
      'edit.jdkAuto': 'empty = auto',
      'edit.jdkCustom': 'custom…',
      'edit.jdkPathHint': 'C:\\path\\to\\jdk (JAVA_HOME)',
      'dl.addJdk': 'Download a JDK',
      'dl.addMaven': 'Download Maven',
      'dl.install': 'Download',
      'dl.installing': 'Installing…',
      'dl.downloading': 'downloading',
      'dl.extracting': 'extracting…',
      'dl.done': 'installed',
      'dl.failed': 'failed',
      'edit.env': 'Environment',
      'edit.cwd': 'Working directory',
      'edit.cwdHint': 'Relative to the workspace root; empty = the package directory',
      'edit.locked': 'Owned by package.json — read-only here',
      'edit.save': 'Save',
      'edit.reset': 'Reset to package.json',
      'edit.close': 'Close',
      'edit.badEnv': 'Environment must be KEY=VALUE',
      'warn.maven': 'No Maven found (no mvnw, mvn or mvnd): Maven rows and Java main classes will fail with "not recognized".',
      'warn.jdk': 'No usable JDK found (none in ~/.jdks, .idea, JAVA_HOME or PATH): every JVM start needs one.',
      'run.stop': 'Stop',
      'run.confirmStop': 'Confirm stop',
      'run.restart': 'Restart',
      'run.confirmRestart': 'Confirm restart',
      'run.restarting': 'Restarting…',
      'run.restartFailed': 'Restart failed: ',
      'toast.done': 'Finished',
      'toast.failed': 'Failed',
      'toast.exitCode': 'exit code',
      'toast.close': 'Dismiss',
      'toast.service': 'Service',
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
         * Every surface waits for the same chunk set, and a failure renders its
         * own text: an empty panel and a panel with no scripts look identical.
         */
        function loadSurfaces() {
          if (surfacesRequest === null) {
            surfacesRequest = Promise.all([
              require.async('./client.data.js'),
              require.async('./client.css.js'),
              require.async('./client.store.js'),
              require.async('./client.editor.js'),
              require.async('./client.actions.js'),
              require.async('./client.panel.js'),
              require.async('./client.menu.js'),
              require.async('./client.toast.js'),
              require.async('./client.download.js'),
            ]).then(([dataModule, cssModule, storeModule, editorModule, actionsModule, panelModule, menuModule, toastModule, downloadModule]) => {
              const data = dataModule.createData({ t });
              const styles = cssModule.createCss({ t });
              const storeApi = storeModule.createStore({ t, ROUTE, PACKAGE, KIND, sortScripts: data.sortScripts });
              const actions = actionsModule.createActions({ t, ...storeApi, ...data });
              const editor = editorModule.createEditor({
                t,
                CONFIG_ROUTE: storeApi.CONFIG_ROUTE,
                OUTPUT_ROUTE: storeApi.OUTPUT_ROUTE,
                store: storeApi.store,
                emit: storeApi.emit,
              });
              const download = downloadModule.createDownload({
                t,
                DL_ROUTE: storeApi.DL_ROUTE,
                useLocaleRevision,
              });
              const shared = {
                t,
                BUILD,
                openPanel: () => {
                  if (controller !== undefined) controller.openTab(KIND);
                },
                useLocaleRevision,
                CSS: styles.CSS,
                ...storeApi,
                ...data,
                ...editor,
                ...actions,
                ...download,
              };
              const toast = toastModule.createToast({
                t,
                store: storeApi.store,
                useLocaleRevision,
                useStoreRevision: storeApi.useStoreRevision,
                CSS: styles.CSS,
                dismissToast: storeApi.dismissToast,
              });
              surfaces = {
                panel: panelModule.createPanel(shared),
                menu: menuModule.createMenu(shared),
                toast,
              };
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

        const PanelBody = (props) => surface((loaded) => loaded.panel.PanelBody, props);
        const PanelTitle = () => surface((loaded) => loaded.panel.PanelTitle);
        const HeaderEntry = (props) => surface((loaded) => loaded.menu.HeaderEntry, props);
        const MenuOverlay = () => surface((loaded) => loaded.menu.MenuOverlay);
        const ToastOverlay = () => surface((loaded) => loaded.toast.ToastOverlay);

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
        slots.inject('shell.overlay', () =>
          slots.register({ name: 'shell.overlay', id: 'services-toast', order: 900 }, ToastOverlay),
        );
      },
    };
  },
});
