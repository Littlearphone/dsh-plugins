# 服务管理（启动脚本与进程）

把当前会话工作区的 `package.json` 脚本列出来，两个入口：

- **右侧栏标签页「服务管理」**：完整列表，显示工作目录和每条脚本的命令；
- **会话头部图标按钮**：点击弹出下拉，同样的列表，点一项即可把命令发到对话里执行。

## 它做了什么

1. Host 半注册同源路由 `GET /services/list/<sessionId>`；
2. 路由用 Host 自己的 `sessions` 找到会话、用 `workingDirectory` 拿到该会话的**实际工作目录**；
3. 读该目录的 `package.json`，返回 `scripts` 列表（没有文件时返回 `hasManifest: false`）；
4. 点脚本 → 在右侧栏**新建一个终端**、把命令写进去，并把那个终端开成标签页。

## 执行：Host 侧自管进程

点脚本的启动按钮 → `POST /services/start/<sessionId>` → Host 用 `ctx.subprocess.spawn` 起进程，
stdout/stderr 用 collect 模式收着，浏览器轮询 `state` 与 `output`。

**启动方式按类型区分**（这是不同指令的启动条件不同）：

| 类型 | 实际执行 | 工作目录 |
|---|---|---|
| npm 脚本 | `<pm> run <name>`（按最近 lockfile 判定 pnpm / yarn / npm） | 脚本所属包目录 |
| Go 程序 | `go run ./path/to/cmd` 原样执行 | 工作区根（符合 `go.work` 解析） |

走包管理器而不是直接跑脚本正文，是因为 `npm run` 才会把 `node_modules/.bin` 放进 PATH——
`concurrently` 这类本地 CLI 只有这样才能找到。作为双保险，也把包与根的 `.bin` 注入 PATH。

## 生命周期：重装、卸载、关闭 dsh 都要收干净

一条启动命令会带上唯一标记（`set "DSH_SVC=<id>" && …` / `$env:DSH_SVC=…`），
停止时按标记用 WMI 找回根进程，再 `taskkill /T /F` **连子孙一起结束**——
Windows 上只打 `cmd` 的话，`pnpm → node → vite` 会变成占着端口的孤儿。

三个时机都会收：**停止**、**插件卸载（重装/删除 bundle）**、**下一次 Host 启动**。

最后一条靠一个落盘的注册表 `$DSH_HOME/services/running.json`：启动时写入 id，
清理后移除。dsh 被强杀（没机会跑清理）时，下一次启动 `apply` 会读这个文件、
按标记把上一世留下的进程全部回收再清空。**所以"关闭 dsh"也能保证**——
强杀留下的痕迹会由下一次启动补收。

三条实测：`stop` 后带标记进程归零；`remove_bundle` 时同样归零；伪造一条注册表 + 一个带标记的
孤儿进程，重新安装后孤儿被杀、注册表被清空。
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

工作区如果声明了子包，会一并扫描，并按**目录路径**分组显示（不用包名：一个工作区里可以有几个同名 `frontend` 包，标题重复就没法区分）：

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
- 含 `package main` 的目录生成一条，**按模块分组**（`Go · tools/ring`、`Go · fx/backend`）；
  原来是把所有 Go 程序塞进一个 `Go` 组，模块一多就是一面墙，且与 npm 分组的层级语义不一致；
- 条目名是程序名（`standalone`），`模块末段 · 程序名` 放在 `label` 上；命令是工作区根目录起算的
  完整路径 `go run ./tools/ring/cmd/standalone`，既看得出属于哪个模块，也能直接复制执行。

没有 `package main` 的库模块（例如只有 `libs/codec` 这种）不会出现在面板里。

Makefile / Taskfile / justfile **目前不解析**：它们不是 Go 的约定，解析成本也高，等真的遇到再说。

## 排序与搜索

排序是**两级**的，先按"谁执行"，再按"干什么"：

1. **工具**（看图标那一列）：`npm/pnpm/yarn` → `node` → `go` → `mvn` → `gradle` → `java`
   → `python` → `docker` → `.net` → 未识别。这样 `pnpm --filter … dev` 不会被夹在一串
   `node scripts/…` 中间；
2. **用途**：`dev/start/serve/watch` → `build/compile/package/release` → `test/e2e/coverage`
   → `lint/check/format` → `size/report/audit` → 其他；
3. 最后按名称。

工具判定用的是"命令行里最先出现的已知程序名"，和图标是同一套规则（`detectRuntime`），
所以列表顺序、图标、tooltip 三者永远一致。

- **下拉顶部有搜索框**：打开即聚焦，按脚本名**和命令内容**做大小写不敏感的过滤，组名不参与匹配；
  没有命中时显示「没有匹配的脚本」。每次打开都会清空上一次的输入。

排序在**渲染时**也会重算（不只拉取时），所以 HMR 保留了旧 state 也不会显示成乱序。



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
| Go 标志 | go | `go run`、`go build`、`go test` |
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

# 从 GitHub（必须带 path，因为仓库根不是包）
dsh --profile web plugin install "github:Littlearphone/dsh-plugins#path:/services"
```

或用 `plugin_manager` 的 `install_bundle`，目标传上面两种字符串之一。
以上两种写法都实测装成过（`application: applied`，版本 0.1.1）。
## 启动变体（IDEA 式）

一条脚本可以挂**多条启动配置**，像 IDEA 的 run configuration 那样：`dev:all` 可以同时有
「默认」「调试（--watch）」「剖面（--inspect）」，各自带参数、环境与工作目录。

```jsonc
{
  "version": 3,
  "configs": [
    { "id": "c-xxx", "dir": "", "script": "dev:all", "label": "调试", "args": "--watch" },
    { "id": "c-yyy", "dir": "", "script": "dev:all", "label": "剖面", "args": "--inspect" }
  ],
  "selected": { "|dev:all": "c-xxx" },   // 该脚本上次选中的变体
  "pinned": [{ "dir": "", "script": "dev:all" }],
  "ui": { "recent": {}, "collapsed": [] }
}
```

- **键是 `id`**，不是 `(dir, script)`；`selected` 记住每条脚本上次用哪个；
- **启动请求带 `configId`**，Host 按 id 取那一条，参数、环境、目录都从它来；
- **`args` 是原始字符串、原样透传**：`npm run x -- <args>`，引号与分组不会被拆散；
- **脚本正文永远只读**：`normaliseConfig` 不接受 `command` 字段，覆盖不了 `package.json`；
- **行内选择器**：有变体的行多一个下拉，切换即时写回 `selected`；
- **迁移**：v2 的单条覆盖读出来会自动补上 id，等价于「只有一条变体」，行为不变。
## 代码结构

Host 半侧按职责拆开（普通 ESM，`import` 直接引）：

| 文件 | 职责 |
|---|---|
| `index.js` | 注册 `/services` 前缀路由、卸载时杀干净 |
| `config.js` | `.dsh/services.json` 的读写、归一化、变体选择 |
| `discover.js` | 扫描：package.json、workspace 包、Go module |
| `processes.js` | 启动、输出缓冲、标记式注册表与上次运行的回收 |
| `routes.js` | HTTP 处理（list / start / stop / state / output / config / pin / ui） |

依赖是单向的：`config → discover → processes → routes → index`。

客户端半侧是**一组包内 chunk**，入口在首次渲染时并行拉取：

| 文件 | 职责 |
|---|---|
| `client.js` | 入口：locale、注册、chunk 装载与包装组件 |
| `client.data.js` | 运行时识别、品牌图标、排序与过滤 |
| `client.css.js` | 样式表 |
| `client.store.js` | 客户端 store、hooks、各路由常量 |
| `client.actions.js` | 面板与下拉共用的动作（启动、停止、固定、分组标题） |
| `client.editor.js` | 启动配置编辑器与输出视图 |
| `client.panel.js` | 右侧栏面板 |
| `client.menu.js` | 会话头部下拉 |

契约：文件名必须是 `client.<name>.js`，脚本自己
`__ModuleLoader__.load({ id: '@local/services', chunk: '文件名', factory })` 注册，且每个 chunk
必须自包含（chunk 之间不能同步 `require`）。入口用 `require.async` 并行加载后，把
data / store / actions / editor 组装成一个 `shared` 对象传给面板与下拉的工厂。

## 已知取舍

- **输出只回传尾部**：Host 每次回**最后 64KB**（带 `truncated` 标记），客户端最多渲染 400 行。
  想看完整历史要改成按 offset 增量拉取（`readFrom(nextOffset)` 已支持），再谈虚拟滚动。
- **匹配按命令文本**：同一条命令在多个包里出现时，它们共用一个状态。要精确得给每次启动一个
  与具体行绑定的 id。
- **不需要手动清理**：每个脚本只保留最近一次运行（再次启动即替换），结束的记录 5 分钟后自动消失。
- **没有自定义命令**：只能看到 `package.json` 的 scripts 和 `package main`，不能手工添加
  （比如 `docker compose up`）。
- **标记依赖 PowerShell**：按标记找进程用的是 `Get-CimInstance Win32_Process`，只在 Windows 生效；
  其它平台只做 `kill`，不保证整树。