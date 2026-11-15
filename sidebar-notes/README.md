# 右侧便签 · `@local/sidebar-notes`

一个装进当前 profile 的 DSH 插件（bundle），演示「Web GUI 右侧栏标签页 + 会话内入口 + 插件自管持久化」的骨架。
功能本身是占位：给每个会话一块随手记的便签。真正要复用的是它把注册链路和存储链路跑通了，功能可以整段替换。

## 安装

安装命令、git 规格写法、更新与卸载，见仓库根 [README](../README.md)。两条最常用的：

```
# 本地开发（改代码即时生效）
D:\DataCenter\Documents\IdeaProjects\dsh-plugins\sidebar-notes

# 分发安装
github:Littlearphone/dsh-plugins#path:/sidebar-notes
```

## 怎么看到它

**这个插件已经不再提供界面入口**：会话头部按钮和指南页卡片都已移除，标签类型仍然注册着，
但只能由代码打开（`ctx.sidebarRight.openTab('sidebar-notes')`）。它保留在仓库里的原因是那套
**Host 侧持久化 + 同源路由**的参考实现——后续的启动面板、任务板持久化都照这个模式写。

指南页的方块网格样式（`GUIDE_CSS`）仍然生效，它和便签功能无关，是独立的样式覆盖。

## 存储：为什么不在 localStorage

浏览器的 `localStorage` 按 **origin** 分仓，而这个页面的 origin 含端口。`dsh web` 用随机端口启动时，
每次都是新 origin，`localStorage` 就是空的——DSH 自己的右侧栏布局（`dsh.sidebar-right.v1.<sessionId>`）
同样会因此重置。所以插件要留数据就不能放这里。

本插件的做法：

| 半边 | 职责 |
|---|---|
| `index.js`（Host） | 在 `$DSH_HOME/sidebar-notes/notes.json` 存 `{ version: 1, notes: { <sessionId>: text } }`，并注册同源路由 `GET/PUT /sidebar-notes/notes/<sessionId>` |
| `client.js`（Browser） | 用**相对** URL 调这个路由（不写死端口），300ms 防抖保存，页面卸载时 `keepalive` 冲刷 |

- 跨端口、跨浏览器、跨设备都还在，因为数据在 Host 侧。
- 路由不存在时（Host 半边没加载、老 bundle、离线）自动退回 `localStorage`，并在提示行里说明；
  Host 路由恢复后第一次读到空值会把浏览器里的旧内容迁过去。
- 路由只做同源校验（`Origin` 与 `Host` 不一致则 403）；DSH 默认只监听 loopback，但如果你把
  `webServer.host` 配成对外的地址，这条路由也就会对外——**对外部署时请自己补鉴权**。

改数据文件位置只改 `index.js` 的 `dataFile()`。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch`、`dsh.client`（platform/inject）、导出与 `files` |
| `cordis.patch.yml` | 往 profile 插一行 `sidebar-notes` |
| `index.js` | Host 半边：笔记存储 + 同源路由（只依赖 node 内置模块，不 import 任何 DSH 包） |
| `client.js` | 浏览器半边：标签页类型、面板主体、标题、入口按钮、关闭转指南、中英文案 |
| `locale/*.json` | 插件列表里的标题/描述（面板内文案在 `client.js` 里注册） |
| `icon.svg` | 插件清单图标（自制） |

## 注册了什么

```js
// 1. 标签页类型：id 是这条实现的身份，也是下面两个插槽的 key
ctx.sidebarRightTabs.register({
  id: '@local/sidebar-notes', kind: 'sidebar-notes', priority: 'extension',
  title: () => t('tab.title'),
  guide: [{ id: 'notes', order: 30, title, description }],  // 指南页上的卡片=侧栏内的入口
});

// 2. 面板主体 + 3. 标签页标题
slots.register({ name: 'sidebar.right.pane.tab',       key: PACKAGE }, NotesBody);
slots.register({ name: 'sidebar.right.pane.tab.title', key: PACKAGE }, NotesTitle);

// 4. 会话头部入口按钮
slots.register({ name: 'conversation.session.header.actions', id: 'sidebar-notes', order: 30 }, HeaderEntry);

// 5. 关闭时保住侧栏
controller.registerCloseHandler(KIND, (sessionId, tab) => {
  if (controller.tabsIn(sessionId).length !== 1) return;
  if (!controller.isExpanded()) return;
  controller.openTabIn(sessionId, 'guide');   // 先放指南，再让本次关闭生效
});
```

全部挂在 `ctx.effect` / `ctx.slots.inject` 上：插件卸载后类型、面板、路由一起消失。

## 换成你要的功能

- 面板内容：只改 `NotesBody`（自绘 React，不 import 任何 DSH 客户端包）。
- 存储：`index.js` 换成你的数据形状即可；路由名、文件名随便改。
- 入口再加强：给 `guide` 条目加 `commandId` 并注册 `ctx.shortcuts`，就得到可配置快捷键；
  或给 `patterns` 声明 `dsh-resource://...` 通配，让自己的类型接管某类文件预览。

## 侧栏开始页（指南页）改成方格

右侧栏没有"起始页"座位：默认页只可能是指南页（`guide`），或恰好只有一个指南条目时的那个条目页。
所以改"侧栏开始界面"= 改指南页。这里走的是**纯样式覆盖**，不替换组件：

- 指南页的 DOM 带语义标记而不是只有哈希类名：`data-sidebar-right-guide`（容器）、
  `data-sidebar-right-guide-entry="<kind>"`（每张卡片）、`data-sidebar-right-tab` 等。
- 容器改成 `grid`，卡片变成 `aspect-ratio: 1/1` 的方块：外壳在网格项上（`display:flex`），卡片
  `width/height:100%`，所以内容垂直居中、终端那种 `div` 卡也被撑满；内部是图标 34px 独占一行、
  标题单行截断、快捷键作为第三行 9px 静音小字（键帽的边框底色被抹平），描述隐藏。
- 居中靠三件事一起：`justify-content/align-content: center`、轨道宽度有上限
  （`minmax(88px, 112px)`，不是 `1fr`）、容器 `max-width` 封顶列数并 `margin-inline:auto`。
- 玻璃光效是叠在 `--dsw-alias-bg-layer-1` 上的一道 `linear-gradient(135deg, …)` 斜向高光，
  加顶部 inset 高光；深色主题用 `body[data-ds-dark-theme]` 把高光强度降到 12%。
  hover 是上浮 2px + 品牌色描边 + 品牌色 `color-mix` 光晕（前面留了一条 rgba 兜底，
  不支持 `color-mix` 的浏览器只掉阴影）。
- 不是所有"卡片"都长一样：终端走的是 `sidebar.right.tab.guide.entry` 的**自定义卡片**——
  根节点是 `div` 不是 `button`（里面还有一个 `aria-haspopup="menu"` 的外壳菜单按钮，以及一个
  `position:absolute; inset:0` 的整卡隐形点击层）。所以外壳（边框/底色/玻璃/hover）挂在**网格项**
  （`[data-sidebar-right-guide] > *`）上而不是卡片上，所有格子因此同尺寸；
  卡片内部再用一条规则统一成"图标独占一行 + 单行标题"，标准按钮、终端的 `div` 卡、More 按钮都吃这一条。
  规则同时写成 `> * > *` 和 `[data-sidebar-right-guide-entry]` 两种路径，插槽在中间套一层也不受影响。
- 指南页这版 CSS 里**没有任何 `:has()`**，全部是属性/结构/`:not()`，少一层选择器兼容风险。
- 属性选择器重复写一遍（`[data-sidebar-right-guide][data-sidebar-right-guide]`）是为了在
  特异性上和产品那条类名规则打平并胜出，从而不依赖样式表的先后顺序。
- 布局是 grid：`repeat(auto-fit, minmax(min(128px, 45%), 160px))`。最小列宽取
  `min(--dsh-guide-tile-min, 45%)`：面板够宽时是 128px，窄到 45% 更小时下限自己缩，于是
  **窄到任何程度都稳定两列、不会掉到一列，也不会出现三列挤一个**。一行几个由
  `floor((可用宽 + gap) / (下限 + gap))` 推出：面板 < 448px → 2 个，448–588px → 3 个，
  ≥ 588px → 4 个（四张卡时正好全部排一行）。容器 `max-width` 封顶四列，整组居中；
  罗盘用 `grid-column: 1 / -1` 独占一行。调密度改 `--dsh-guide-tile-min` / `--dsh-guide-tile-max` 即可。
- 样式表挂在哪里：已安装的 bundle **拿不到** `styles.insert()`（那是被求值的动态包才有的符号），
  所以由一个无可见输出的组件挂在 `shell.overlay`（root 域、整帧常驻）里带进页面。
- 卡片、固定/取消固定、More 菜单、快捷键文案全部仍由产品实现——样式只改长相，不改行为。
- 不想要了就改 `client.js` 顶部的 `const GUIDE_GRID = false`，指南页立刻回到产品原样。

代价与风险：这是一层**平行样式**，键在产品的内部 DOM 标记上。标记不是文档承诺的 API，升级后可能改名，
那时最坏的结果是指南页回到产品原样或间距不对，而不是崩掉。

## 升级兼容性

| 依赖的东西 | 用的形式 | 升级风险 |
|---|---|---|
| 颜色/圆角 | `--dsw-alias-*` 主题令牌 | 低：令牌改名最多掉色，不会崩 |
| 结构 | 插槽名 + 组件 props（`sidebar.right.pane.tab` 等，`keyDomain` 明确对外开放） | 中：标了 `shadows-shipped-ui` 的座位随时可能被产品改 |
| 指南页外观 | `data-sidebar-right-*` 语义标记上的 CSS 覆盖 | 中低：标记改了会退回产品原样 |
| 样式 | 自己的 `.dsh-notes-*` 类名 + `<style>` | 低 |
| 存储 | Host 路由 + `$DSH_HOME` 下的 JSON | 低；只有 `webServer.register` 的签名会变 |
| 不碰的东西 | CSS Modules 哈希类名（如 `wSkVaW_heroOptions`）、别的插件的 DOM、`require()` 客户端包 | — |

标签页类型用 `priority: 'extension'`，同 `kind` 的 `builtin` 会被本插件接管；因此 `kind` 取了
`sidebar-notes` 这个带前缀的值，避免将来 DSH 自带同名类型时被静默顶掉。

## 已知边界

- 没有会话就没有右侧栏；主栏开始页（hero）不显示它，侧栏自己那一页是指南页。
- 右侧栏没有「面板级动作」「折叠态控件」的扩展座位。
- 左侧栏 `sidebar.panellist` 只服务主面板（按 id 切主栏），不能跨到右侧栏。
- 指南页的**布局**能靠样式覆盖改成网格，但**行为**（点哪开哪、固定规则、More 菜单内容）改不了；
  要改行为只能替换 `sidebar.right.tab.guide`，那就得自己实现全部卡片与菜单。
- 「任意最后一个标签关掉后显示指南」没有座位：关闭钩子按 kind 注册，本插件只覆盖自己的 kind。
