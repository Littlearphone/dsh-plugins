# 服务（启动脚本）

把当前会话工作区的 `package.json` 脚本列出来，两个入口：

- **右侧栏标签页「服务」**：完整列表，显示工作目录和每条脚本的命令；
- **会话头部图标按钮**：点击弹出下拉，同样的列表，点一项即可把命令发到对话里执行。

## 它做了什么

1. Host 半注册同源路由 `GET /services/list/<sessionId>`；
2. 路由用 Host 自己的 `sessions` 找到会话、用 `workingDirectory` 拿到该会话的**实际工作目录**；
3. 读该目录的 `package.json`，返回 `scripts` 列表（没有文件时返回 `hasManifest: false`）；
4. 浏览器半只负责渲染：点脚本 → `inputActions.setDraft(命令)` + `submit()`，由会话执行。

**这一版不自己管理进程**。脚本执行完全交给对话（agent 用 bash/pwsh 工具跑），所以没有第二套生命周期、不用处理端口占用、不用管日志流。代价是不会像 IDEA 的 Services 那样有"运行中/已停止"状态——那需要 Host 侧进程管理，等你确认真要走这条路再做。

## 为什么发现逻辑在 Host

浏览器读不到工作区文件；而相对路径路由在任何端口都能用（`dsh web` 的端口是随机的，写死 origin 会失效）。

## 会话 ID 的格式

`SessionId` 带 `session-` 前缀。直接测路由：

```powershell
# 换成本机真实会话 id
Invoke-WebRequest http://127.0.0.1:63428/services/list/session-<uuid> -UseBasicParsing
```

不带前缀会 404（Host 里查不到会话），这是正常的。

## 装

```powershell
# 本地（link，改代码即时生效）
dsh --profile web plugin install D:\DataCenter\Documents\IdeaProjects\dsh-plugins\services
```

或用 `plugin_manager` 的 `install_bundle`，目标传绝对路径。

## 已知取舍

- **只读根目录**：目前只读工作目录根部的 `package.json`，monorepo 的子包脚本还没扫（下一步可以用 `pnpm-workspace.yaml` 的 globs）。
- **发送即执行**：点一项会把命令填进输入框并立即发送。如果你希望"只填入、由我自己按回车"，把 `sendCommand` 里的 `submit()` 去掉即可。
- **没有自定义命令**：只能看到 `package.json` 里声明的脚本，不能手工添加（比如 `docker compose up`）。
