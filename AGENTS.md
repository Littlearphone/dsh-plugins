# 本仓库的 Agent 规则

## 页面调试：只准用 Playwright

- **禁止**用 Edge（含 `msedge --headless`、`--dump-dom`、`--screenshot`、CDP over Edge）做页面调试。
- 需要调试页面时，**只允许**用独立的 Playwright（仓库自带的 `playwright` 依赖 + 它自己的 Chromium）。
- 调试脚本**必须**在 `finally` 里关闭浏览器（`await browser.close()`），退出前确认没有遗留进程。
  历史上的教训：用 `Stop-Process` 只杀主进程，渲染子进程全部残留，三十多次运行堆了 540 个。
  在这个环境里 `Stop-Process` / `taskkill` 对那批子进程还被拒绝，只能靠 WMI 收拾。
- 入口：`node scripts/ui-probe.mjs --url "<带 token 的地址>"`。token 只走命令行，不写进文件。

## 客户端插件：包内 chunk 的两条硬约束

- **chunk 拿不到别的 chunk 里的标识符**。跨 chunk 使用的函数必须由入口显式传入 deps，
  否则会抛 `ReferenceError`；而这类异常常常落在 `fetch().catch()` 或 `try/catch` 里被吞掉，
  界面只表现为"空/没有内容"。
- **chunk 的 `?rev=` 跟着入口走**。只改 chunk 不改入口，浏览器继续用旧 chunk——改 chunk
  时必须同时动一下入口，否则测的是旧代码。

## 生效方式：什么要重启、什么不用

改完插件，先分清改的是哪一层，别默认“刷新一下就好”：

- **客户端**（`client.js`、`client.*.js` 等 chunk、CSS）：浏览器按入口的 `?rev=` 重新拉取，
  **不用重启**；改了 chunk 要同时动入口（见上一节）。
- **Host 代码**（`index.js`、`updates.js` 这类只在 Host 跑的模块）：**要重启 dsh 进程**。
  HMR 管的是补丁层，`plugin install` / 重装也不会换掉已经加载进内存的 Host 模块。
- **`package.json` 的 `exports`，或新增 `locale/`、`icon.svg` 这类资源路径：必须重启**。
  原因：Host 用 Node 的 ESM 解析器读 `meta.title` / 图标，Node 会把读过的 `package.json`
  **缓存在进程内**；旧缓存里没有新导出，插件页/设置页就一直回退成包名
  （Settings 显示 `guide-style`，Plugin Manager 显示 `@local/guide-style`）。
  `pnpm install`、重装、插件页的「刷新」都清不掉这个缓存。
- **只改 `locale/*.json` 的文案、或加一个导出已覆盖的语言文件**：每次现读，**不用重启**。

判断是否真的生效：改完 GUI 里还是裸包名，就是 Host 缓存没刷新（不是 locale 文件写错）。
要脱离 GUI 单独确认元数据本身，可以在**新进程**里用 DSH 自己的 `readPluginMeta` 读一遍
（`@deepseek-ai/dsh-app-boot/lib/index.js`，parentURL 传 profile 的 `package.json`）。

## 写文件：别让 PowerShell 5.1 加 BOM 或改换行

这台机器的 `powershell.exe` 是 **5.1**：

- `Set-Content -Encoding UTF8` 写的是**带 BOM 的 UTF-8**。`package.json` 一带 BOM，`JSON.parse`
  当场失败，插件整个加载不起来（2026-11 真踩过一次，靠 `git commit --amend` 才擦掉）；
- `Get-Content … | Set-Content …` 顺手把换行改成 CRLF（仓库约定 LF，见 `.gitattributes`）。

所以：

- 改源码用 `edit` / `write` 工具，或 node（`fs.writeFileSync(file, text, 'utf8')`）；
- 非要在 PS 里写，用
  `[IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))`，
  或 `[IO.File]::WriteAllBytes($path, [Text.Encoding]::UTF8.GetBytes($text))`；
- **不要** `Get-Content` 读、`Set-Content` 写回同一个文件；
- `node scripts/check.mjs` 现在会扫全仓库的 BOM，命中即失败——提交前必须全绿。

## 改动插件客户端的验收

1. `node scripts/check.mjs` 全绿（它会检查每个 `client*.js`，含 chunk）；
2. `node scripts/ui-probe.mjs --url ...` 跑通：看板 15 张卡、服务下拉列出脚本、面板能打开；
3. 提交前 `git status` 干净，提交信息写清楚"为什么"，不只写"改了什么"。
