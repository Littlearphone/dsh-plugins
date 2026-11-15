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

## 运行时图标

每条脚本前面有一个小方牌，显示**这条命令会由什么工具执行**。判断方式是扫描命令行里
最先出现的已知程序名（所以 `npm run build` 判成 npm、`vite build` 判成 node），目前覆盖：

| 牌子 | 匹配 |
|---|---|
| `npm` / `pnpm` / `yarn` | 对应包管理器 |
| `node` | `node`、`tsx`、`ts-node`、`nodemon`、`vite`、`next`、`webpack`、`rollup`、`esbuild`、`jest`、`vitest`、`mocha` |
| `mvn` | `mvn`、`mvnd` |
| `gradle` | `gradle`、`gradlew` |
| `java` | `java` |
| `py` | `python`、`python3`、`uv`、`poetry`、`pipenv`、`pytest`、`django-admin` |
| `docker` | `docker`、`docker-compose` |
| `.net` | `dotnet` |
| ▶（灰） | 其他，统一用播放图标 |

**加一个工具 = 在 `RUNTIMES` 里加一行**（`label` 显示在牌子上，`tint` 是它的品牌色，
`pattern` 是匹配正则）。牌子底色是 `color-mix(tint 16%, transparent)`，所以在黑白两套主题里
都跟着主题的底色走，不会在深色下糊掉。

## 为什么下拉的底色和别的不一样过

第一版用了 `--dsw-alias-bg-overlay`，那是**灰的**（浅色主题下是 `neutral-bluish-150`），
而产品自己的下拉菜单面板用的是 `--dsw-alias-bg-base`（浅色下是纯白）+ `radius-lg` +
`.5px` 的 `border-l2` + `4px` 内边距。现在按后者对齐，视觉上和「更多」菜单一致。

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
