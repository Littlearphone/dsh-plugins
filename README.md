# DSH 插件工作区

一组运行在 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai/deepseek-harness) 上的插件。
一个子目录一个插件，每个目录都是独立、可直接安装的 npm 包（DSH 里叫 bundle）；仓库根不是包，
所以从 git 安装时必须带 `#path:` 指明子目录。

## 插件

| 目录 | 包名 | 说明 |
|---|---|---|
| [`guide-style`](guide-style/README.md) | `@local/guide-style` | 右侧栏指南页（开始页面）的外观：居中方块网格、玻璃高光与悬停效果；纯样式，无 Host |
| [`task-board`](task-board/README.md) | `@local/task-board` | 按状态分轨道的任务列表（交互原型），入口在会话头部右侧工具区 |
| [`services`](services/README.md) | `@local/services` | 工作区启动脚本与 Go 程序：右侧栏「服务管理」面板 + 会话头部下拉，Host 侧自管进程、可看输出、可停止 |

`sidebar-notes/` 曾在早期作为 Host 存储与同源路由的参考实现，插件与目录都已移除；
指南页的方块网格样式搬到了 `task-board`。

仓库根有一个 `package.json`，只提供 `npm run check`（逐个 `node --check` 三个插件的
Host/Client 半并校验 locale JSON），不参与插件安装。

## 安装

安装动作由 DSH 的 `plugin_manager` 执行，`install_bundle` 的 **target 就是这个字符串**；
GUI 的插件安装入口填的也是同一个值。

### 本地开发：绝对路径（改代码即时生效）

| 插件 | target |
|---|---|
| 指南页样式 | `D:\DataCenter\Documents\IdeaProjects\dsh-plugins\guide-style` |
| 任务列表 | `D:\DataCenter\Documents\IdeaProjects\dsh-plugins\task-board` |
| 服务管理 | `D:\DataCenter\Documents\IdeaProjects\dsh-plugins\services` |

依赖会以 `link:` 记录，profile 的 `node_modules` 里是一个指向该目录的 junction，源码改动直接
作用到运行中的插件。生效方式按改动层次区分：客户端代码由 HMR 重载，不用重启；**Host 代码、
以及 `package.json` 里新增的 `exports` / `locale`、图标等资源路径，要重启 dsh 进程**（重装和
插件页「刷新」都无效，Node 在进程内缓存了 `package.json`）。详见 [`AGENTS.md`](AGENTS.md)。

### 分发给别人：从 GitHub 安装

一个仓库多个插件，所以必须带 `#path:/<子目录>`：

| 插件 | target |
|---|---|
| 指南页样式 | `github:Littlearphone/dsh-plugins#path:/guide-style` |
| 任务列表 | `github:Littlearphone/dsh-plugins#path:/task-board` |
| 服务管理 | `github:Littlearphone/dsh-plugins#path:/services` |

带版本（推荐，可复现）——`<ref>` 可以是分支、tag 或 commit：

```
github:Littlearphone/dsh-plugins#main&path:/task-board
github:Littlearphone/dsh-plugins#main&path:/services
```

仓库目前**没有打 tag**；要按版本安装就先 `git tag v0.1.0 && git push --tags`，
之后 `#v0.1.0&path:/services` 才解析得到。也可以直接钉 commit：

```
github:Littlearphone/dsh-plugins#0047359&path:/services
```

等价的完整 URL 写法（带 `.git` 更稳）：

```
https://github.com/Littlearphone/dsh-plugins.git#main&path:/services
```

规则：`#` 后面用 `&` 把「版本」和「子目录」连起来，`path:` 的值从仓库根开始、以 `/` 开头。

### 这三种填法会被拒

| 填法 | 原因 |
|---|---|
| `Littlearphone/dsh-plugins#path:/services` | 裸简写 pnpm 认，但 plugin-manager 的解析器把它当非法包名 |
| `https://github.com/…/tree/main/services` | 这是网页地址不是 git 地址，报 `a URL must point at a git repository or a tarball` |
| `./services` | 相对路径会解析到 profile 目录里去，必须绝对路径 |

## 装完之后怎么确认

1. 安装结果是 `application: applied`；`warnings` 里的内容要读完再判断，`failed` 需要排查。
2. 插件管理器里能看到这个 bundle 和它插入的行（row）。
3. **任务列表**（`@local/task-board`）：会话头部右侧工具区出现一个看板图标（悬停提示「任务列表」），
   点开是右侧栏的任务列表标签页；指南页出现「任务列表」卡片。
4. **服务管理**（`@local/services`）：会话头部出现「服务管理」按钮（下拉列出脚本）；
   右侧栏指南页出现「服务管理」卡片；Host 半边带 HTTP 路由，可以探活：
   `GET http://127.0.0.1:<端口>/services/list/probe` → 404 且 body 为 `{"error":"unknown-session"}`。

## 更新与卸载

- **更新**：先 `remove_bundle`，再 `install_bundle`。对同名包直接重复安装会返回
  `already-installed`；而且 profile 的 `pnpm-lock.yaml` 会把 git 依赖钉在某个 commit 上，
  不重装不会跟进新提交。
- **脚本改动**（`index.js` / `client.js`）属于「替换已安装包」，git 安装方式下需要重启 dsh
  才会加载新的 JS 模块；本地 `link:` 安装下通常由 HMR 直接生效。
- **卸载**：`remove_bundle @local/services`（任务列表则是 `@local/task-board`）。插件自己的数据（如 `$DSH_HOME/services/`）
  不会被删除。

## 编写约定

- **纯 JS、零依赖、无构建**：`package.json` 的 `exports` 直接指向仓库里的文件。这样 `link:`、
  git、tarball 三种安装方式都能原样工作，也不需要 `prepare` 构建脚本（git 安装时 pnpm 默认
  拦截构建脚本，需要额外审批）。
- **换行统一 LF**（`.gitattributes`），避免 Windows 的 `core.autocrlf` 造成整文件 diff。
- **每个插件的 README** 说明它自己的设计、扩展点与已知边界。