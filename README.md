# DSH 插件工作区

一组运行在 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai/deepseek-harness) 上的插件。
一个子目录一个插件，每个目录都是独立、可直接安装的 npm 包（DSH 里叫 bundle）；仓库根不是包，
所以从 git 安装时必须带 `#path:` 指明子目录。

## 插件

| 目录 | 包名 | 说明 |
|---|---|---|
| [`sidebar-notes`](sidebar-notes/README.md) | `@local/sidebar-notes` | 便签的 Host 存储 + 同源路由参考实现（入口已移除），另带右侧栏指南页的方块网格样式 |
| [`task-board`](task-board/README.md) | `@local/task-board` | 按状态分轨道的任务板（交互原型）：轨道内排序 + 跨轨道拖拽，入口在会话头部右侧工具区 |
| [`services`](services/README.md) | `@local/services` | 工作区启动脚本：右侧栏「服务」面板 + 会话头部下拉，点一项把命令发到对话执行 |

仓库根有一个 `package.json`，只提供 `npm run check`（逐个 `node --check` 三个插件的
Host/Client 半并校验 locale JSON），不参与插件安装。

## 安装

安装动作由 DSH 的 `plugin_manager` 执行，`install_bundle` 的 **target 就是这个字符串**；
GUI 的插件安装入口填的也是同一个值。

### 本地开发：绝对路径（改代码即时生效）

```
D:\DataCenter\Documents\IdeaProjects\dsh-plugins\sidebar-notes
```

依赖会以 `link:` 记录，profile 的 `node_modules` 里是一个指向该目录的 junction，源码改动直接
作用到运行中的插件；客户端代码通常由 HMR 直接重载，不需要重启。

### 分发给别人：从 GitHub 安装

一个仓库多个插件，所以必须带 `#path:/<子目录>`：

```
github:Littlearphone/dsh-plugins#path:/sidebar-notes
```

带版本（推荐，可复现）：

```
github:Littlearphone/dsh-plugins#v0.1.0&path:/sidebar-notes
github:Littlearphone/dsh-plugins#a55f7e3&path:/sidebar-notes
```

等价的完整 URL 写法（带 `.git` 更稳）：

```
https://github.com/Littlearphone/dsh-plugins.git#main&path:/sidebar-notes
```

规则：`#` 后面用 `&` 把「版本」和「子目录」连起来，`path:` 的值从仓库根开始、以 `/` 开头。

### 这三种填法会被拒

| 填法 | 原因 |
|---|---|
| `Littlearphone/dsh-plugins#path:/sidebar-notes` | 裸简写 pnpm 认，但 plugin-manager 的解析器把它当非法包名 |
| `https://github.com/…/tree/main/sidebar-notes` | 这是网页地址不是 git 地址，报 `a URL must point at a git repository or a tarball` |
| `./sidebar-notes` | 相对路径会解析到 profile 目录里去，必须绝对路径 |

## 装完之后怎么确认

1. 安装结果是 `application: applied`；`warnings` 里的内容要读完再判断，`failed` 需要排查。
2. 插件管理器里能看到这个 bundle 和它插入的行（row）。
3. `sidebar-notes` 额外验证：会话头部出现「便签」按钮；右侧栏指南页出现「便签」卡片；
   Host 半边带 HTTP 路由，可以探活：
   `GET http://127.0.0.1:<端口>/sidebar-notes/notes/probe` → 应返回 `{"text":""}`。

## 更新与卸载

- **更新**：先 `remove_bundle`，再 `install_bundle`。对同名包直接重复安装会返回
  `already-installed`；而且 profile 的 `pnpm-lock.yaml` 会把 git 依赖钉在某个 commit 上，
  不重装不会跟进新提交。
- **脚本改动**（`index.js` / `client.js`）属于「替换已安装包」，git 安装方式下需要重启 dsh
  才会加载新的 JS 模块；本地 `link:` 安装下通常由 HMR 直接生效。
- **卸载**：`remove_bundle @local/sidebar-notes`。插件自己的数据（如 `$DSH_HOME/sidebar-notes/`）
  不会被删除。

## 编写约定

- **纯 JS、零依赖、无构建**：`package.json` 的 `exports` 直接指向仓库里的文件。这样 `link:`、
  git、tarball 三种安装方式都能原样工作，也不需要 `prepare` 构建脚本（git 安装时 pnpm 默认
  拦截构建脚本，需要额外审批）。
- **换行统一 LF**（`.gitattributes`），避免 Windows 的 `core.autocrlf` 造成整文件 diff。
- **每个插件的 README** 说明它自己的设计、扩展点与已知边界。
