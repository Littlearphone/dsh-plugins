# Drive the running GUI headlessly (Edge + CDP): open a session, open the task
# board tab and the services entry, report what actually rendered, save a
# screenshot. This is the check that catches "the bundle loaded but the tab is
# blank" — something node --check and stub rendering cannot see.
#
#   pwsh -File scripts/ui-probe.ps1 -Url "http://127.0.0.1:<port>/?token=<token>"
#
# The token is a credential: pass it on the command line, never commit it.
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [string]$Shot = (Join-Path $env:TEMP 'gui.png'),
  [int]$Port = 9226
)
$ErrorActionPreference = 'Stop'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$ud = Join-Path $env:TEMP "edge-cdp-$Port"

Remove-Item $ud -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Shot -Force -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath $edge -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-first-run', "--remote-debugging-port=$Port",
  "--user-data-dir=$ud", '--window-size=1500,950', 'about:blank'
) -PassThru -WindowStyle Hidden

try {
  $list = $null
  for ($i = 0; $i -lt 30 -and $null -eq $list; $i++) {
    Start-Sleep -Milliseconds 500
    try { $list = Invoke-RestMethod "http://127.0.0.1:$Port/json" -TimeoutSec 2 } catch { }
  }
  if ($null -eq $list) { throw 'no devtools endpoint' }
  $target = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()

  function Send-Cdp([int]$id, [string]$method, $params) {
    $payload = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 8 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
    $buffer = New-Object byte[] 262144
    while ($true) {
      $sb = New-Object System.Text.StringBuilder
      do {
        $res = $ws.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).Result
        [void]$sb.Append([Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count))
      } while (-not $res.EndOfMessage)
      $msg = $sb.ToString() | ConvertFrom-Json
      if ($msg.id -eq $id) { return $msg }
    }
  }
  function Eval([int]$id, [string]$expression) {
    $r = Send-Cdp $id 'Runtime.evaluate' @{ expression = $expression; returnByValue = $true; awaitPromise = $true }
    if ($r.result.exceptionDetails) { return 'ERR: ' + $r.result.exceptionDetails.text }
    return $r.result.result.value
  }
  function Click([int]$id, [string]$findExpression) {
    $rect = Eval $id "(() => { const el = $findExpression; if (!el) return 'missing'; const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()"
    if ($rect -isnot [array]) { return $rect }
    $x = [double]$rect[0]; $y = [double]$rect[1]
    Send-Cdp ($id + 100) 'Input.dispatchMouseEvent' @{ type = 'mousePressed'; x = $x; y = $y; button = 'left'; clickCount = 1 } | Out-Null
    Send-Cdp ($id + 101) 'Input.dispatchMouseEvent' @{ type = 'mouseReleased'; x = $x; y = $y; button = 'left'; clickCount = 1 } | Out-Null
    return 'clicked'
  }

  Send-Cdp 1 'Page.enable' @{} | Out-Null
  Send-Cdp 2 'Page.navigate' @{ url = $Url } | Out-Null
  Start-Sleep -Seconds 9

  $session = Click 3 "[...document.querySelectorAll('*')].find((n) => n.children.length === 0 && (n.innerText || '').trim() === '任务列表与会话关联设计')"
  "session: $session"
  Start-Sleep -Seconds 12

  $board = Click 10 "[...document.querySelectorAll('button')].find((b) => (b.title || '') === '任务列表' || (b.getAttribute('aria-label') || '') === '任务列表')"
  "board entry: $board"
  Start-Sleep -Seconds 8
  "cards: " + (Eval 20 "document.querySelectorAll('[data-task-card]').length")

  $services = Click 30 "[...document.querySelectorAll('button')].find((b) => (b.title || '') === '服务管理' || (b.getAttribute('aria-label') || '') === '服务管理')"
  "services entry: $services"
  Start-Sleep -Seconds 6
  "svc nodes: " + (Eval 40 "document.querySelectorAll('[class*=dsh-svc]').length")
  "svc text: " + (Eval 42 "(() => { const n = [...document.querySelectorAll('[class*=dsh-svc]')].map((x) => (x.innerText || '')).filter(Boolean)[0]; return (n || 'none').replace(/\s+/g, ' ').slice(0, 220); })()")
  "svc fetches: " + (Eval 43 "[...performance.getEntriesByType('resource')].map((e) => e.name).filter((n) => n.indexOf('/services/') !== -1).slice(-6).join(' , ')")
  $openSidebar = Click 60 "[...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === '在侧栏打开')"
  "open in sidebar: $openSidebar"
  Start-Sleep -Seconds 6
  "panel rows: " + (Eval 70 "document.querySelectorAll('[class*=dsh-svc-row], [class*=dsh-svc-item]').length")
  "panel text: " + (Eval 71 "(() => { const n = [...document.querySelectorAll('[class*=dsh-svc]')].map((x) => (x.innerText || '')).filter(Boolean).join(' | '); return (n || 'none').replace(/\s+/g, ' ').slice(0, 260); })()")

  $png = Send-Cdp 50 'Page.captureScreenshot' @{ format = 'png' }
  if ($png.result.data) {
    [IO.File]::WriteAllBytes($Shot, [Convert]::FromBase64String($png.result.data))
    "screenshot: $Shot"
  }
}
finally {
  try { $ws.Dispose() } catch { }
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
