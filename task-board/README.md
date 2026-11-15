# 任务列表 · `@local/task-board`

按状态分轨道的任务列表，用于验证「轨道内排序 + 跨轨道拖动」的交互。**当前是交互原型**：
卡片写死、只存在 React 内存里，刷新即复位；持久化和会话关联是下一步。

## 怎么看到它

会话头部**右侧**的工具区（`conversation.session.header.utilities`）会出现一个图标按钮：28×28、
图标是三列看板，悬浮提示「任务列表」（`title`/`aria-label`）。它排在最右那个「更多」菜单
（`session-log-download`，默认 order 0）**左边**——本插件取 order -1。

样式刻意对齐产品按钮（primitives `Button size="sm"` 的 outline 变体）：`--dsw-radius-sm` 圆角 +
发丝内描边 `inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l3)`，hover/active
用 `--dsw-alias-interactive-bg-hover/active`。不是 1px 实线边框。

点它打开右侧栏的任务列表标签页。

四条轨道：设计中 / 等待实现 / 正在实现 / 已完成。拖任意卡片：

- 在同一轨道内上下拖 → 改排序，插入位置由指针相对卡片中线的位置决定，拖动时有蓝色插入线；
- 拖到另一条轨道 → 改状态，计数徽标跟着变；
- 轨道为空时有一条虚线投放区，仍然能接收卡片。

轨道用 flex 换行：面板窄时轨道自动上下堆叠，宽时并排。

## 实现要点

| 关注点 | 做法 |
|---|---|
| 插入位置 | `indexAt(list, clientY)`：数指针越过了多少张卡片的垂直中线 |
| 移动 | `moveTask()` 纯函数，返回新 lanes；同轨道内移动时索引要减一（先移除再插入） |
| 投放 | 轨道容器上 `onDragOver`（必须 `preventDefault` 才允许 drop）+ `onDrop` |
| 视觉 | 全局只用自己的 `.dsh-board-*` 类名 + `--dsw-alias-*` 令牌，不碰产品类名 |
| 入口 | 头部 utilities 座位（已验证可追加，`replaceRisk: none`） |

## 下一步（待定）

- **数据模型**：任务属于工作区还是全局看板；是否需要跨工作区视图。
- **持久化**：Host 侧 JSON（沿用已在早期验证过的同源路由模式），键用 workspacePath 而不是 sessionId。
- **会话关联**：任务挂到会话上、点任务跳转会话、会话活跃时自动改状态。
- **跨会话编排**：从任务新建/分叉会话并注入上下文——这是独立的子系统，别塞进看板首版。

## 装

```powershell
# 本地（link，改代码即时生效）
dsh --profile web plugin install D:\DataCenter\Documents\IdeaProjects\dsh-plugins\task-board

# 从 GitHub（必须带 path，因为仓库根不是包）
dsh --profile web plugin install "github:Littlearphone/dsh-plugins#path:/task-board"
```

它同时提供右侧栏指南页的方块网格样式（`GUIDE_CSS`，挂在 `shell.overlay`），
装与不装会直接改变指南页的外观。