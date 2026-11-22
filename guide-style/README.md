# 指南页样式 · `@local/guide-style`

右侧栏**指南页**（"开始页面"）的外观：把产品默认的列表重排成**居中的方块网格**，
含玻璃高光、悬停描边、图标在上/文字在下的居中排列。

另外它承担一件和样式无关的事：**定时检查已安装插件的更新并自动安装**（见下文）。
两半互不依赖——样式是纯客户端的一个 `<style>`，更新器只在 Host 侧跑。

- 选择器是 `[data-sidebar-right-guide]`，属于产品 DOM 契约，升级后若类名/结构变化需要跟着改；
- 与 `task-board` / `services` 的指南卡片无关：它只改**容器与卡片的样式**，不负责注册卡片。

## 装

**一键（本机 / 另一台机器都一样）：**

```powershell
# 本机（link，改代码即时生效）
dsh --profile web plugin install D:\DataCenter\Documents\IdeaProjects\dsh-plugins\guide-style

# 从 GitHub（必须带 path）
dsh --profile web plugin install "github:Littlearphone/dsh-plugins#path:/guide-style"
```

从 GitHub 装出来的依赖**不带固定 commit**，所以 DSH 自己不会更新它。但 guide-style 的调度器
第一次检查时会把这种装法**自己换成固定 commit 的写法**（`removeBundle` + `installBundle`：
同一个地址，pin 到当前远端 HEAD），之后就走 DSH 原生的 `updateBundle`。

**所以更新时你不需要知道任何 commit hash**——每次都是调度器自己 `git ls-remote` 取远端 HEAD。

> `link:` 装法不会被更新：DSH 加载的就是那个目录，没有"包"可替换，也没有地址可以 pin。

**发布纪律只有一条：要别的机器更新，就把 `guide-style/package.json` 的 version 升上去。**
只改代码不升版本，会停在 `newer commit, same version — updateBundle needs a version bump`。

> 手动写固定 commit 的 spec（`github:…#<40位>&path:/guide-style`）时**不要用 `dsh plugin install`**：
> Windows 上 CLI 用 `shell: true` 起 pnpm，`&` 被 cmd 当命令分隔符，spec 截断成 `#<commit>`，
> 静默装成仓库根包 `dsh-plugins 0.0.0`（退出码还是 0）。插件页 / `plugin_manager` 不走 shell，
> 用它们装没问题。上面那条一行命令不带 `&`，CLI 装没问题。

卸载它，指南页会立即回到产品默认样式——其他插件不受影响。

## 更新器

DSH 自带**更新这个操作**（`pluginManager.listVersions` / `updateBundle`），但**没有任何调度**：
不开插件页就不会去问 registry，也不会去看 Git 远端。这一半补的就是调度。

每 `intervalMinutes` 分钟（启动 `initialDelaySeconds` 秒后先跑一次）：

1. `listBundles()` 取本 profile 的插件清单；
2. 只挑 DSH 自己能替换的：
   - **registry**：`listVersions(name)` → 取最新一个**非预发布、声明了 bundle、且与当前 DSH 兼容的**版本 → `updateBundle(name, version)`；
   - **git（已固定 commit）**：`git ls-remote <url> HEAD` 拿远端 commit，和已装的比较；不同就按该 commit 读远端 `package.json`，版本号更大才 `updateBundle(name, version, { spec })`，`spec` 是原依赖写法重新 pin 到新 commit；
   - **git（没固定 commit）**：只有版本号更大时，`removeBundle` + `installBundle` 换成 pin 到当前远端 HEAD 的同一地址，**一次之后它就走上面那条**；
3. 其余的一律跳过并记原因：`link:` 装法（DSH 加载的就是那个目录，没有包可换）、Official 包、带插件管理的包。

**两个必须知道的约束**（都是 DSH 的规则，不是这里的实现选择）：

- `updateBundle` 要求目标版本**严格大于**已装版本（semver）。所以，**发布时要把 `package.json` 的 version 升上去**，否则只会报 "newer commit, same version"。
- 走原生更新的只有 **registry** 和 **固定 40 位 commit 的 git spec**。没固定 commit 的那种，第一次是靠上面那条 remove + install 换掉的——这一步没有回滚（旧代码在远端已经不存在了），失败时插件会变成未安装，只能重新装。

### 配置

写进 profile 的 `cordis.patch.yml`：

```yaml
- id: guide-style
  name: '@local/guide-style'
  config:
    intervalMinutes: 30      # 检查间隔，最小 1
    apply: auto              # auto = 发现就装；notify = 只记状态，不装
    prerelease: false        # 是否接受预发布版本
    enabled: true            # false 则完全不调度
    initialDelaySeconds: 15  # 启动后第一次检查的延迟
```

### 状态

Host 侧把最近一次检查的结果挂在 `GET /guide-style/updates`（同源相对路径），
`POST` 同一个地址会立刻跑一次并返回结果。每行给出 `installed` / `latest` / `status`
（`up-to-date`、`updated`、`available`、`skipped`、`unavailable`、`failed`）和一行 `detail`。
