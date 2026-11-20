param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$appUrl = 'http://127.0.0.1:4317'
function Show-StartupError([string]$message) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, '见微', 'OK', 'Error') | Out-Null
}
function Open-DesktopWindow([string]$browserPath) {
  $windowTitle = '见微 · 创意与研究助手'
  $arguments = @("--app=$appUrl/?v=desktop#home", '--start-maximized', '--start-fullscreen')
  $launchMutex = New-Object System.Threading.Mutex($false, 'Local\JianweiDesktopLaunch')
  $locked = $false
  try {
    try { $locked = $launchMutex.WaitOne(12000) }
    catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { return }

    Add-Type -Path (Join-Path $PSScriptRoot 'DesktopFullscreen.cs')
    $existingWindows = [JianweiDesktopFullscreen]::BrowserWindows()
    Start-Process -FilePath $browserPath -ArgumentList $arguments | Out-Null

    $deadline = [DateTime]::UtcNow.AddSeconds(8)
    do {
      $newWindows = @([JianweiDesktopFullscreen]::BrowserWindows() | Where-Object {
        $_ -notin $existingWindows -and [JianweiDesktopFullscreen]::IsAppWindow($_, $browserPath, $windowTitle)
      })
      if ($newWindows.Count -eq 1) {
        # Give the browser a moment to honor its own fullscreen flag first.
        Start-Sleep -Milliseconds 180
        [JianweiDesktopFullscreen]::EnterFullscreen($newWindows[0], $browserPath, $windowTitle)
        return
      }
      Start-Sleep -Milliseconds 80
    } while ([DateTime]::UtcNow -lt $deadline)
  } finally {
    if ($locked) { $launchMutex.ReleaseMutex() }
    $launchMutex.Dispose()
  }
}
try {
  $ready = $false
  try { $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 2; $ready = $health.app -eq 'jianwei' } catch {}
  if (-not $ready) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCommand) { throw '没有找到 Node.js。请安装 Node.js 24 或更新版本后重新打开见微。' }
    if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'dist\index.html'))) { throw '应用文件不完整，请在项目文件夹运行 npm install 和 npm run build。' }
    $appData = Join-Path $appRoot 'data'
    New-Item -ItemType Directory -Force -Path $appData | Out-Null
    $nodeArguments = '"' + (Join-Path $appRoot 'server\index.mjs') + '"'
    Start-Process -FilePath $nodeCommand.Source -ArgumentList $nodeArguments -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $appData 'app.log') -RedirectStandardError (Join-Path $appData 'app-error.log') | Out-Null
    for ($attempt = 0; $attempt -lt 35; $attempt++) {
      Start-Sleep -Milliseconds 300
      try { $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 1; if ($health.app -eq 'jianwei') { $ready = $true; break } } catch {}
    }
  }
  if (-not $ready) { throw '见微没有成功启动。请确认端口 4317 没有被其他应用占用，然后重试。' }
  if (-not $NoOpen) {
    $browserPath = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($browserPath) { Open-DesktopWindow $browserPath }
    else { Start-Process $appUrl }
  }
} catch { Show-StartupError $_.Exception.Message; exit 1 }
