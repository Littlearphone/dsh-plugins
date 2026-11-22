# 指南页样式 · `@local/guide-style`

右侧栏**指南页**（"开始页面"）的外观：把产品默认的列表重排成**居中的方块网格**，
含玻璃高光、悬停描边、图标在上/文字在下的居中排列。

另外它承担一件和样式无关的事：**定时检查已安装插件的更新并自动安装**（见下文）。
两半互不依赖——样式是纯客户端的一个 `<style>`，更新器只在 Host 侧跑。

- 选择器是 `[data-sidebar-right-guide]`，属于产品 DOM 契约，升级后若类名/结构变化需要跟着改；
- 与 `task-board` / `services` 的指南卡片无关：它只改**容器与卡片的样式**，不负责注册卡片。

## 装

```powershell
# 本地（link，改代码即时生效）
dsh --profile web plugin install D:\DataCenter\Documents\IdeaProjects\dsh-plugins\guide-style

# 从 GitHub（必须带 path）
dsh --profile web plugin install "github:Littlearphone/dsh-plugins#path:/guide-style"
```

卸载它，指南页会立即回到产品默认样式——其他插件不受影响。

## 更新器

DSH 自带**更新这个操作**（`pluginManager.listVersions` / `updateBundle`），但**没有任何调度**：
不开插件页就不会去问 registry，也不会去看 Git 远端。这一半补的就是调度。

每 `intervalMinutes` 分钟（启动 `initialDelaySeconds` 秒后先跑一次）：

1. `listBundles()` 取本 profile 的插件清单；
2. 只挑 DSH 自己能替换的两类：
   - **registry**：`listVersions(name)` → 取最新一个**非预发布、声明了 bundle、且与当前 DSH 兼容的**版本 → `updateBundle(name, version)`；
   - **git**：`git ls-remote <url> HEAD` 拿远端 commit，和已装的 commit 比较；不同就按该 commit 读远端 `package.json`，版本号更大才 `updateBundle(name, version, { spec })`，`spec` 是原依赖写法重新 pin 到新 commit。
3. 其余的一律跳过并记原因：`link:` 装法（DSH 加载的就是那个目录，没有包可换）、Official 包、带插件管理的包、以分支/tag 存的 git spec。

**两个必须知道的约束**（都是 DSH 的规则，不是这里的实现选择）：

- `updateBundle` 要求目标版本**严格大于**已装版本（semver）。所以 git 装法的仓库，改代码时**必须同时 bump `package.json` 的 version**，否则只会报 "newer commit, same version"。
- 只有 **registry** 和 **固定 40 位 commit 的 git spec** 这两种装法会被更新。`link:` 装的插件在 `listBundles` 里连 `update` 字段都没有。

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
