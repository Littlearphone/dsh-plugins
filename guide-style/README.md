# 指南页样式 · `@local/guide-style`

右侧栏**指南页**（"开始页面"）的外观：把产品默认的列表重排成**居中的方块网格**，
含玻璃高光、悬停描边、图标在上/文字在下的居中排列。

- **只有客户端半边**：`shell.overlay` 上一个 `<style>`，没有 Host 逻辑、没有文案；
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
