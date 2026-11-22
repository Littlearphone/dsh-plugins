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

运行中的行（侧栏面板和下拉里都一样）还有**重启**按钮：同样先按一次进入「确认重启」，
再按一次才执行 → `POST /services/restart/<sessionId>`。Host 按标记杀掉旧进程树后**立刻**
用启动时留在记录上的启动描述拉起同一个脚本，不等待旧进程自己报告退出，所以不存在
「停止慢就先等着，再点启动」的那段空档。

**启动方式按类型区分**（这是不同指令的启动条件不同）：

| 类型 | 实际执行 | 工作目录 |
|---|---|---|
| npm 脚本 | `<pm> run <name>`（按最近 lockfile 判定 pnpm / yarn / npm） | 脚本所属包目录 |
| Go 程序 | `go run ./path/to/cmd` 原样执行 | 工作区根（符合 `go.work` 解析） |

走包管理器而不是直接跑脚本正文，是因为 `npm run` 才会把 `node_modules/.bin` 放进 PATH——
`concurrently` 这类本地 CLI 只有这样才能找到。作为双保险，也把包与根的 `.bin` 注入 PATH。

**脚本名是用户数据，不能拼进命令行**：`build&update` 是合法名字，而 `&` 在每个 shell 里都是
命令分隔符（`%`、`$`、反引号同理）。所以：

- **非 Windows**：直接 `spawn('<pm>', ['run', name, ...])`，不经过任何 shell，名字里有
  什么都不会被解释；
- **Windows / pnpm**：pnpm 在 Node 旁边会装一个真正的 `pnpm.exe`。能找到它时直接用它，
  名字作为 argv 元素传递，`&`、空格、引号都原样到达 pnpm；标记改走
  `--config.DSH_SVC=<id>`，既留在命令行上供 `findMarkedPids` 找到，又不会传给脚本。
- **Windows / npm、yarn（`.cmd` 垫片回退）**：Node 只能通过 `cmd.exe` 启动 `.cmd`，
  而这条 subprocess 通道会反斜杠转义命令串里的双引号——`npm run "check"` 到 pnpm/npm
  手里会变成带字面引号的名字。所以普通名字直接不加引号（`npm run check`），需要保护的
  名字仍保留引号作为尽力而为；`%VAR%` 的限制也仍然存在。要跑带 `&` 的名字，用 pnpm，
  或者把名字改成普通字符。

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

## 重启：一次确认，Host 内完成

`restart` 不是客户端把「停止 → 启动」串起来，而是 Host 侧的一条路由，原因有两个：

- **不等人**：停止可能要等 shell 的 grace 期，而重启要的是「现在换一个新进程」。杀进程树
  （`taskkill /T /F`）本身是同步的，所以杀掉后立即用记录上的 `launch` 描述重新
  `spawnService`，不等旧 handle 的 `done`；
- **请求已经不在浏览器手里**：启动时用过的 variant（参数、环境、工作目录）只有 Host 记录里
  还有，重启必须复用它，不能靠客户端再猜一次。

每条 `RUNNING` 记录因此多一个 `launch` 字段（`name`/`command`/`source`/`dir`/`kind`/
`configId`/`cwd`）。重启会先把旧 id 从注册表移除，再登记新 id，避免落盘的注册表指向一个
已经死掉的运行。重启后是**新 id**，面板据此把「正在重启」的转圈换成新记录；旧记录的状态
不影响新记录。

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

工作区声明的子包会扫描，**没有声明但向下两层存在 `package.json` 的目录也会扫描**（和
Maven 的 `pom.xml`、Gradle 的 `build.gradle` 扫描深度一致）：像 `ohohoho/` 这种自带
`.git`、`package-lock.json`、没有写进 workspace 的嵌套项目，也应当出现在列表里，而不是
因为 pnpm 没枚举就消失。扫描同样跳过 `node_modules`、`dist`、`build`、`target` 等目录。
分组标题用**目录路径**而不是包名：一个工作区里可以有几个同名 `frontend` 包，标题重复就
没法区分。

声明的来源按优先级：

- 先看 `pnpm-workspace.yaml` 的 `packages:` 列表（只读这一段，够用）；
- 没有再读根部 `package.json` 的 `workspaces`（数组，或 `{ packages: [...] }`）；
- 支持 `packages/*` 和精确路径；带 `**` 的写法会被跳过并在响应的 `skippedPatterns` 里列出来，
  而不是猜一个近似结果；
- 以 `!` 开头的排除项忽略，`node_modules` 和点开头的目录不扫；
- 上限 60 个包，防止异常 glob 把目录翻个底朝天。

两层的 `package.json` 回退扫描也受同一个 60 包上限约束；显式声明的包优先占用名额。

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

## Maven / Gradle / Spring

JVM 项目没有脚本清单，能"运行"的是**构建工具的目标**。所以和 Go 一样单独扫，产出同样形状的分组：

- 找 `pom.xml`（根 + 工作区包 + 两层以内的子目录），每个 pom 生成一组脚本：
  - **生命周期**：`clean`、`compile`、`test`、`package`、`install`——就是 IDEA Maven 面板里那排；
  - **插件 goal**：pom 里出现对应插件才给，现在认 `spring-boot:run`、`exec:java`、`jetty:run`、
    `tomcat7:run`、`cargo:run`；
  - **Spring**：除了 `spring-boot-maven-plugin`，继承 `spring-boot-starter-parent` 也算，
    所以标准的 Spring Boot 工程一定会有一行 `spring-boot:run`。
- 命令带 `-f <pom>`：一个工作区里十几个 pom 时，工作目录决定不了跑哪个项目，pom 文件决定。
- 命令开头的 **Maven 可执行文件是解析出来的**：项目自带 `mvnw`/`mvnw.cmd` 就先用它（版本由项目钉住），
  其次是 PATH 上的 `mvn`，最后是 `mvnd`（Maven Daemon，自带一份 Maven、参数与 `mvn` 兼容）。IDEA 用户常常只有
  IDE 自带的那份 Maven、PATH 上根本没有 `mvn`——这一层兜底不是锦上添花，否则每条 Maven 行跑起来
  只有一句"不是内部或外部命令"。三样都没有时仍然写 `mvn`，让缺环境这件事直接暴露在输出里。
  想换一个：行的「编辑启动配置」里选（见「启动变体」），选定值跟着变体存。
- **不加 `-q`**：静默模式会把 `[INFO]` 全吞掉——一次成功的 `clean` 在面板里只剩 mvnd 的
  「Unable to create a system terminal」两行，看着像失败，退出码却是 0。面板是唯一能看到
  构建日志的地方，所以生命周期和插件 goal 都按 Maven 默认的 INFO 级别输出。JVM 启动时还会
  把 `TERM=dumb` 写进环境：jline 因此安静地降级成 dumb 终端，那两行警告不再出现，日志从
  `[INFO] BUILD SUCCESS` 开始。
- Gradle 同理：`build.gradle`/`.kts` → `build`、`test`，含 `org.springframework.boot` 时给
  `bootRun`（不再给 `run`）；有 `gradlew` 就用 `./gradlew`。

所有 Maven 条目归到 `Maven` 那一个组，Gradle 归到 `Gradle`，和 Go 组并列——分组标题是
"这些脚本属于哪个工具"，不是每个项目一个组。

还没做：纯 `javac`/`java` 的散装工程（没有构建工具就没有可靠的主类发现），以及 `Makefile`。

## Java 启动类

Maven 工程里"能运行的东西"不只在 pom 里：`src/main/java` 下带 `public static void main` 的类，
就是 IDEA 里那个绿三角。它们单独成一组 `Java`：

- 扫 `src/main/java` 下所有 `.java`（有预算，最多 400 个文件），认 `public static void main`
  （`String[]`、`String...`、`final`、`static public` 这些写法都算），`module-info.java` /
  `package-info.java` 跳过；
- 行的名字用**全限定类名**（`com.earphone.craft.Start`）：不同包里各有一个 `Main` 是常事，
  而行名是配置的键，必须唯一；
- 命令是 `<runner> [-f pom] compile exec:java -Dexec.mainClass=<全限定名>`：`compile` 先跑
  （`exec:java` 只认 `target/classes`，不编译就会跑到旧类或什么都没有），classpath 由 Maven
  按 pom 算——等价于 IDEA 的绿三角；
- **不带 `-q`**：`exec:java` 把应用输出当 INFO 日志打，`-q` 会连它一起吞掉。实测过：
  `-q` 下程序打印的 `hello-from-main` 一行都看不到，去掉就有；
- 这些行走的是 Maven 的 runner，所以「运行器」「JDK」两个字段一样适用；没有构建工具的工程同样有
  「JDK」字段，而且启动时会把该 JDK 的 `bin` 放到 `PATH` 最前面——`javac` / `java` 才和它一致；
- Spring Boot 工程的启动类照样会被扫出来（`exec:java` 一般也跑得起来），而它的 pom 声明了
  `spring-boot-maven-plugin` 或继承 `spring-boot-starter-parent` 时，还会多一行
  `spring-boot:run`——两条路都在，和 IDEA 里一样；
- **没有构建工具的工程不需要 Maven**：`src/main/java` 有主类、但根目录既没有 `pom.xml` 也没有
  `build.gradle(.kts)` 时，行变成 JDK 自己的一条龙——
  `javac -encoding UTF-8 -sourcepath src/main/java -d .dsh/classes src/main/java/demo/Hello.java
  && java -cp .dsh/classes demo.Hello`。`-sourcepath` 让 javac 顺带编译被引用的类，
  `-d .dsh/classes` 把产物放在插件自己的目录里，`&&` 两种 shell 都认；
- 有 `pom.xml` 就必须有 Maven（`mvnw` / `mvn` / `mvnd` 任一个，`mvnd` 本身就是 Maven 的守护进程版，
  自带 Maven 3.9.9）——没有的话那几行会直接报"不是内部或外部命令"，因为 classpath 只有 Maven 算得出来；
  纯 Gradle 工程的主类要靠 `application` 插件 / `gradle run` 才定位得到，暂时不做。

## JVM 用哪个 JDK

Maven / Gradle 跑在 Host 继承来的 `JAVA_HOME` 上（这台机器是机器级的 `openjdk-21.0.1`），而项目要的
常常是另一个版本——IDEA 知道这件事，shell 不知道。所以启动前按 IDEA 的思路解析一次：

1. `.idea/misc.xml` 的 `project-jdk-name`（比如 `temurin-25`）→ 到 `~/.jdks` 找目录：先精确匹配，
   再按前缀匹配（`temurin-25` → `temurin-25.0.1`）。IDEA 的 SDK 名和目录名本来就不必相同；
2. 名字指向的 JDK 已经卸了，就看同一个 `ProjectRootManager` 上的 `languageLevel="JDK_25"`；
3. 没有 `.idea`，或者前两步都对不上，就读 pom 的 `java.version` /
   `maven.compiler.release|source|target`，在 `~/.jdks` 里取同主版本、版本号最高的那个；
4. 都没有就保持 Host 的环境不动——不猜比猜错好。

只对 `kind` 是 `maven` / `java` / `gradle` / `javac` 的启动生效；`~/.jdks` 里没有 `bin/java`
（Windows 是 `bin\java.exe`）的目录不算候选，`~/.jdks` 不存在时整段跳过。优先级是：启动配置里的
**JDK 字段** > 启动配置里写的 **`JAVA_HOME` 环境变量** > 上面这套自动解析 > Host 自己的 `JAVA_HOME`。
选中的 JDK 会同时写进 `JAVA_HOME` 和 `PATH` 最前面，所以自己调 `javac`/`java` 的行也用它。

「JDK」是**下拉 + 自由输入**：下拉列出 `~/.jdks` 扫到的每一个 JDK（显示目录名，`title` 是完整路径），
最后一项「自定义…」把控件换成文本框，可以填任意 `JAVA_HOME` 路径；保存后再打开，路径不在扫描结果里
就自动回到文本框，不会被悄悄当成"自动"。留空仍然是自动解析。

## 缺工具时

新电脑上什么都没装也照样能看清单，但面板顶部会先给一句提示，而不是等点下去才由 shell 报错：

- **没找到 Maven**（`mvnw` / `mvn` / `mvnd` 一个都没有）→ `warn.maven`：Maven 行和 Java 启动类
  （`exec:java`）点开会报"不是内部或外部命令"；
- **没找到 JDK**（`~/.jdks`、`.idea`、`JAVA_HOME`、`PATH` 都没有）→ `warn.jdk`：Maven / Gradle /
  Java 的启动都需要它。

行本身**不会消失**：它们是这个工程的目标，装好工具刷新一下就能跑。没有构建工具的纯 Java 工程不在此列，
它用 JDK 直接编译运行（见「Java 启动类」）。

## 下载工具（JDK / Maven）

提示旁边就能把工具装上，不用离开面板：

- **JDK**：「JDK」字段右边的 `+` 打开弹层，选发行版（Eclipse Temurin；Windows x64 上另有
  Amazon Corretto、Microsoft OpenJDK）和特性版本（8 / 11 / 17 / 21 / 25），下载的是该发行版的
  **latest GA**；
- **Maven**：「运行器」右边的 `+` 只选版本；版本列表从 Apache CDN 的目录页实时读（连不上时退回
  3.10.1 / 3.9.16）；
- **作业在 Host 里跑**：`POST /services/dl` 立刻返回，界面每秒轮询一次（下载中显示 `已下载 / 总量`，
  然后「解压中…」），完成后自动把字段指向新装的那个，并刷新列表；
- **装到哪里**：JDK → `~/.jdks/<vendor>-<完整版本>`（和 IDEA 放一起，所以 `.idea` 里写的
  `temurin-25` 这类名字能按前缀匹配上）；Maven → `<DSH_HOME>/services/maven/apache-maven-<版本>`，
  在运行器里显示成 `Maven <版本>`，命令里用的是它的**绝对路径**，不往 PATH 里塞东西；
- 完整版本号从解压包里的 `release` 读（`JAVA_VERSION="21.0.13.1"`），不是拿特性版本猜的；
- **只认内置目录**：浏览器只能传 `kind` / `vendor` / `version`，下载 URL 全由 Host 拼，所以这个接口
  变不成任意下载器；已安装的版本直接返回 `already-installed`，不白下 200 MB；
- 解压用系统自带工具（Windows 的 `tar` 能读 zip；其它平台 `.tar.gz` 用 `tar`、`.zip` 用 `unzip`）；
  装失败时半成品会清掉，Host 被强杀留下的 staging 目录在下次下载时按一小时清理。

## 排序与搜索

排序是**两级**的，先按"谁执行"，再按"干什么"：

1. **工具**（看图标那一列）：`npm/pnpm/yarn` → `node` → `go` → `mvn` → `gradle` → `java`
   → `python` → `docker` → `.net` → 未识别。这样 `pnpm --filter … dev` 不会被夹在一串
   `node scripts/…` 中间；
2. **用途**：`dev/start/serve/watch` → `build/compile/package/release` → `test/e2e/coverage`
   → `lint/check/format` → `size/report/audit` → 其他；
3. 最后按名称。

工具判定先看这条脚本自己声明的类型（`category`）——Java 的 `main` 行命令行虽然以 Maven 开头，
它仍然是 Java 程序，图标、排序、tooltip 都按 Java 算；没有声明时才退回"命令行里最先出现的已知
程序名"（`detectRuntime`）。两处都走同一个 `runtimeOf(script)`，所以列表顺序、图标、tooltip
三者永远一致。

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
| Maven 标志（IDEA 那个 M） | mvn | `mvn`、`mvnd`，tint 用 IDEA 的蓝 `#3574F0` |
| Gradle 标志 | gradle | `gradle`、`gradlew` |
| Java 蒸汽标（Devicon） | java | `java`、`javac`，以及 `category` 是 `java` / `javac` 的行（命令行走 Maven 也一样），tint 用 Java 蓝 `#0074BD` |
| Go 标志 | go | `go run`、`go build`、`go test` |
| Python 标志 | python | `python`、`python3`、`uv`、`poetry`、`pipenv`、`pytest`、`django-admin` |
| Docker 标志 | docker | `docker`、`docker-compose` |
| .NET 字标 | .net | `dotnet` |
| ▶ | 其他 | 兜底 |

图形是**官方品牌图形**，多数取自 [Simple Icons](https://simpleicons.org/)（CC0 路径数据，24×24 网格），
不是我手画的近似形状；单色图形填充 `currentColor`，所以颜色只由 tint 决定，不依赖外部图片资源。

Maven 和 Java 两条是例外，而且是**故意**的：认 Maven 官方 oak leaf 的人太少，大家认的是 IDEA 里那个
蓝色 `M`，所以那一条用 JetBrains expUI 的 `images/expui/toolwindow/maven.svg`（Apache-2.0）。
Java 那条用 [Devicon](https://devicon.dev/) 的 `java-original`（MIT，128×128 网格）：蓝红蒸汽标，
14px 下仍然一眼是 Java；Simple Icons 的 Java 图标是 Duke 剪影、OpenJDK 方也没有杯子的辨识度。
注意 Devicon 的许可只覆盖它那份路径数据，**图形本身仍是 Oracle 的 Java 商标**——这里只用来标注
"这一行跑的是 Java"，不当作本插件自己的 logo，也不改图形。若要彻底避开商标，换成普通咖啡杯
（Material `local_cafe`、Tabler `coffee` 之类）即可。

`BRAND_ICONS` 因此接受两种写法：24×24 的单色路径字符串，或自带 viewBox 的 `{ viewBox, paths }`；
mark 里的每条路径还能带自己的 `fill` / `stroke`（Devicon 那条就是靠这个保住蓝/红两色）。
自带颜色的 mark 会换成**中性底牌**（`is-brand`），否则品牌色的底会和图形抢颜色；单色 mark
仍用工具色 15% 的淡底。
要换回 Apache / OpenJDK 官方标，把对应那条换掉即可。商标归各自所有者。

**加一个工具 = `RUNTIMES` 加一行 +（如需要）`BRAND_ICONS` 加一条 mark**：

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
以上两种写法都实测装成过（`application: applied`，版本 0.1.3）。

## 运行结束提示（toast）

以前脚本跑完，只有把面板打开、盯着那一行才能发现状态变了。现在**当前页启动的**服务结束
时，右下角弹一张 toast：成功是绿色 `执行结束 · 退出码 0`，失败是红色 `执行失败 · 退出码 2`，
并带脚本名和命令；窗口可见且聚焦时 8 秒自动消失，**失焦、最小化或切到别的标签页时计时暂停、
toast 一直保留**，回到窗口后重新给满 8 秒。最多同时堆 4 张，也可以点 `×` 关掉。

几个刻意的边界：

- **只提示本页启动的运行**：`store.watched` 记录 start/restart 返回的 id，页面加载前就已经
  结束的历史记录不会补弹，否则每次刷新都是一串旧 toast；
- **停止不提示**：用户点停止时先把这个 id 从 `watched` 里删掉，停止是用户动作，不是运行结果；
- **重启只提示新 run**：重启成功后旧 id 被替换，新 id 接管 watch，旧进程的结束不会误弹；
- **检测挂在始终挂载的 HeaderEntry 上**：面板和下拉都可能没开，但头部入口一直在轮询
  `state`，所以“执行结束”不会因为面板关着而丢掉；
- **toast 是插件自己的 overlay**，注册在 `shell.overlay`（order 900），不依赖 DSH 内部的
  临时提示实现；样式只用了 `--dsw-*` 语义 token；
- **失败 toast 带「查看服务」**：点击后打开侧栏面板，清空搜索、展开目标分组、把失败行滚到
  视野中间并高亮约 3 秒；成功 toast 没有这个按钮。

## 启动变体（IDEA 式）

一条脚本可以挂**多条启动配置**，像 IDEA 的 run configuration 那样：`dev:all` 可以同时有
「默认」「调试（--watch）」「剖面（--inspect）」，各自带参数、环境与工作目录。

```jsonc
{
  "version": 3,
  "configs": [
    { "id": "c-xxx", "dir": "", "script": "dev:all", "label": "调试", "args": "--watch" },
    { "id": "c-yyy", "dir": "", "script": "dev:all", "label": "剖面", "args": "--inspect" },
    { "id": "c-zzz", "dir": "", "script": "clean", "label": "IDEA 的 JDK", "runner": "mvnw",
      "jdk": "C:\\Users\\me\\.jdks\\temurin-25.0.1" }
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
- **配置界面按脚本类型变**：命令的类型（`category`）决定抽屉里有哪些字段——Maven 行多一个
  「运行器」（自动 / `mvnw` / `mvn` / `mvnd`，只列这台机器真有的那几个）和一个「JDK」
  （`JAVA_HOME` 路径，留空 = 按 `.idea` / pom / `~/.jdks` 解析）；Gradle 行只有 JDK；npm 行保持原样。
  这两项随变体存进 `configs`，启动时由 Host 分别用在命令首词和 `JAVA_HOME` 上；
- **行内选择器**：有变体的行多一个下拉，切换即时写回 `selected`；
- **迁移**：v2 的单条覆盖读出来会自动补上 id，等价于「只有一条变体」，行为不变。
## 启动配置卡片

抽屉是一张**卡片**，不是一列挤在一起的小控件。2026-11 按
[Linear 的设计系统](https://github.com/VoltAgent/awesome-design-md)（`references/linear.md`）重做：
表面阶梯 + 发丝线、4px 节奏、8px 圆角控件、没有阴影，强调色只出现在主按钮和焦点环上。

- **卡片自己滚动**：卡片最高 `max(240px, 100dvh - 200px)`，收缩时也留 180px；**只有中间的
  表体滚动**（`overscroll-behavior:contain`，滚到头不会带着整个面板跑），标题和「保存 / 还原」
  固定在两头——表单再长也不会把按钮顶出可视域，上面的行也不会被挤走；
- **和行是同一块表面**：展开时行和卡片共用一条外框（行底边、卡片顶边都去掉，中间只留一条发丝线），
  输出日志也一样——以前卡片/日志各带一圈边框，看起来像两块不相干的内容；
- **自绘下拉箭头**：原生 `select` 的箭头贴着边框，改成 `appearance:none` + 12px 的 chevron 背景图，
  右内边距 30px，两边都是 10px 的视觉留白；
- **两档尺寸，一套语言**：表单控件 32px；列表行和下拉菜单里的按钮 / 选择器 26px（`is-tiny` 22px）。
  都是 1px 发丝线 + 6 / 8px 圆角，密度不同但看起来是一套控件；顺手删掉了没人再用的
  `.dsh-svc-run-button`、`.dsh-svc-drawer`、`.dsh-svc-item-stop` 规则；
- **图标一律 SVG**：`+`、`×` 用文字会坐在基线上，在 32px 盒子里视觉偏下；现在是 12px 描边图标，
  由 flex 居中（实测四边各 10px）；
- **头部**：11px 大写 eyebrow「启动配置」+ mono 的脚本名 + 关闭；
- **锁定的命令行**：单独一块内嵌面板（`bg-base` + 发丝线），锁那一行说明它来自 `package.json`；
- **分区**：运行环境 / 启动参数 / 环境变量；分区之间只有一条发丝线，标题 11px 大写；
- **标签在控件上方**：原来 56px 的标签列会把「Maven 运行器」挤成两行、10px 输入框也小得难点，
  现在每个控件整行 32px、字号 13px；
- **安装面板**：`+` 不再弹一个 40px 的浮层（catalog 还没回来时四个控件挤成一条，看着像错乱），
  而是在字段下面展开一整块面板：先是固定高度的「正在读取可下载版本…」+ spinner，再是
  发行版 / 版本两个整行下拉和主按钮，下载时换成 4px 进度条 + `已下载 / 总量`；
- **主操作**：`保存` 是强调色实心按钮，`还原为原生` 是描边按钮——不再用只有图标、没有文字的按钮。

## 代码结构

Host 半侧按职责拆开（普通 ESM，`import` 直接引）：

| 文件 | 职责 |
|---|---|
| `index.js` | 注册 `/services` 前缀路由、卸载时杀干净 |
| `config.js` | `.dsh/services.json` 的读写、归一化、变体选择 |
| `discover.js` | 扫描：package.json、workspace 包、Go module、Maven/Gradle |
| `jdk.js` | 项目要的 JDK：`.idea` → pom → `~/.jdks` |
| `download.js` | 下载 JDK / Maven 到 `~/.jdks` 和 DSH 的 tools 目录 |
| `processes.js` | 启动、输出缓冲、标记式注册表与上次运行的回收 |
| `routes.js` | HTTP 处理（list / start / stop / state / output / config / pin / ui / dl） |

依赖是单向的：`config → discover → processes → routes → index`；`discover → download → jdk`，
`routes → download`。

客户端半侧拆成入口 + 9 个包内 chunk，最大 534 行：

| 文件 | 行数 | 职责 |
|---|---|---|
| `client.js` | 438 | 入口：locale、注册、chunk 装载与拼装 |
| `client.data.js` | 197 | 运行时识别、图标、排序与过滤 |
| `client.css.js` | 230 | 两张样式表 |
| `client.store.js` | 286 | store、emit、取数 hook、完成的运行、toast 队列 |
| `client.editor.js` | 499 | 按脚本类型变的启动配置卡片、输出视图 |
| `client.actions.js` | 395 | 固定、启动、分组标题、菜单项、两步确认按钮 |
| `client.panel.js` | 534 | 侧栏面板与标题 |
| `client.menu.js` | 262 | 头部入口与下拉覆盖层 |
| `client.toast.js` | 87 | 执行结束的右下角 toast |
| `client.download.js` | 237 | 下载 JDK / Maven 的安装面板与轮询 |

拆分的两个硬约束（都踩过）：

1. **chunk 拿不到别的 chunk 里的标识符**。`useScripts` 和 `menuItems` 都调用过
   `sortScripts`，它在 data chunk 里；拆开后抛 `ReferenceError`，而这个异常落在
   `fetch().catch()` 链里被吞掉，界面只表现为"没有可用的脚本"。凡跨 chunk 使用，
   必须经由入口的 deps 显式传入。
2. **chunk 的 rev 跟着入口走**。只改 chunk 不改入口，`?rev=` 不变，浏览器继续用旧
   chunk；改 chunk 时必须同时动一下入口，否则测的是旧代码。

验证：`node scripts/check.mjs` + `scripts/ui-probe.mjs`（下拉列出脚本、面板打开、
15 张看板卡不受影响）。

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