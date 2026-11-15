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

## 嵌套结构（monorepo）

工作区如果声明了子包，会一并扫描，并按包分组显示：

- 先看 `pnpm-workspace.yaml` 的 `packages:` 列表（只读这一段，够用）；
- 没有再读根部 `package.json` 的 `workspaces`（数组，或 `{ packages: [...] }`）；
- 支持 `packages/*` 和精确路径；带 `**` 的写法会被跳过并在响应的 `skippedPatterns` 里列出来，
  而不是猜一个近似结果；
- 以 `!` 开头的排除项忽略，`node_modules` 和点开头的目录不扫；
- 上限 60 个包，防止异常 glob 把目录翻个底朝天。

响应形状：

```json
{ "dir": "...", "hasManifest": true, "workspacePatterns": ["packages/*"],
  "groups": [
    { "id": "root", "name": "my-repo", "dir": "", "scripts": [...] },
    { "id": "packages/web", "name": "@my/web", "dir": "packages/web", "scripts": [...] }
  ] }
```

客户端的分组标题**一直显示**（它是唯一说明"这些脚本属于哪个包"的东西），并且是：

- **没有脚本的包不出现**：Host 在返回前就过滤掉了空分组，客户端再过滤一次，所以不会看到空标题；
- **吸顶**：`position: sticky`，滚动时停在列表顶部，同一组的脚本从它下面滑过；
- **可折叠**：点标题折叠/展开该组，右侧显示该组脚本数量；折叠状态在刷新后保留；
- 标题文字超长时省略，`title` 里带完整路径。

下拉里用同一套标题，只是更紧凑（无边框、`radius-sm`），嵌套多包时也不会迷路。

## Go 项目怎么办

Go 没有 `package.json` 那样的脚本清单，它的可执行目标是 **`package main` 目录**，等价启动命令是
`go run ./cmd/x`。所以 Host 半会额外扫 Go：

- `go.work` 存在 → 按它列出的模块扫；否则找根部的 `go.mod`；
- 每个模块内做**有界**的广度遍历（深度 4、最多 1200 个目录），跳过
  `node_modules`/`vendor`/`testdata`/`dist`/`build`/点开头等目录；
- 含 `package main` 的目录生成一条：名字取目录末段，命令是 `go run ./<相对路径>`（模块根部是 `go run .`）；
- 一个模块就是一个分组，和 npm 包分组**同级**（不多套一层折叠），标题后面带 `go` 标记。

没有 `package main` 的库模块（例如只有 `libs/codec` 这种）不会出现在面板里。

Makefile / Taskfile / justfile **目前不解析**：它们不是 Go 的约定，解析成本也高，等真的遇到再说。

## 排序与搜索

- **按类型排序**：`dev/start/serve/watch` → `build/compile/package/release` → `test/e2e/coverage`
  → `lint/check/format` → `size/report/audit` → 其他，同类型内按名称。这样 dev 和 build 不会被
  e2e 之类穿插开。
- **下拉顶部有搜索框**：打开即聚焦，按脚本名**和命令内容**做大小写不敏感的过滤，组名不参与匹配；
  没有命中时显示「没有匹配的脚本」。每次打开都会清空上一次的输入。



## 运行时图标

每条脚本前面有一个小方牌，画的是**这条命令会由什么工具执行**的图形，颜色用该工具的品牌色。
判断方式是扫描命令行里最先出现的已知程序名（所以 `npm run build` 判成 npm、`vite build` 判成 node）：

| 图形 | 工具 | 匹配 |
|---|---|---|
| Node.js 六边形 | node | `node`、`tsx`、`ts-node`、`nodemon`、`vite`、`next`、`webpack`、`rollup`、`esbuild`、`jest`、`vitest`、`mocha` |
| npm 标志 | npm / pnpm / yarn | 三种包管理器共用 npm 的图标与 npm 红 `#CB3837`，只有右侧文字与 tooltip 区分 |
| Maven 标志 | mvn | `mvn`、`mvnd` |
| Gradle 标志 | gradle | `gradle`、`gradlew` |
| OpenJDK 标志 | java | `java` |
| Python 标志 | python | `python`、`python3`、`uv`、`poetry`、`pipenv`、`pytest`、`django-admin` |
| Docker 标志 | docker | `docker`、`docker-compose` |
| .NET 字标 | .net | `dotnet` |
| ▶ | 其他 | 兜底 |

图形是**官方品牌图形**，取自 [Simple Icons](https://simpleicons.org/)（CC0 路径数据，24×24 网格），
不是我手画的近似形状；填充用 `currentColor`，所以颜色只由 tint 决定，不依赖外部图片资源。
商标归各自所有者。

**加一个工具 = `RUNTIMES` 加一行 +（如需要）`BRAND_ICONS` 加一条路径**：

```js
// RUNTIMES 里
{ id: 'rust', label: 'cargo', tint: '#DEA584', icon: 'cargo', pattern: /(^|[\s/\\])cargo\b/ },
```

`icon` 可以指向已有图形（比如新工具暂时复用 `gear`），只有它的商标确实是新的才需要加一条路径。

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
