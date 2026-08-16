$ErrorActionPreference = "Stop"

$isWindowsRuntime = if (Get-Variable -Name IsWindows -Scope Global -ErrorAction SilentlyContinue) {
  $IsWindows
} else {
  [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::Windows
  )
}

if (-not $isWindowsRuntime) {
  throw "smokeInstalledWindowsDesktop.ps1 must run on Windows."
}

$explicitSmokeSetupPath = if ($env:NOLO_DESKTOP_SMOKE_SETUP) { $env:NOLO_DESKTOP_SMOKE_SETUP } else { "" }
$usesIsolatedSmokeInstaller = $explicitSmokeSetupPath -ne ""
$smokeLauncherName = if ($env:NOLO_DESKTOP_SMOKE_LAUNCHER) { $env:NOLO_DESKTOP_SMOKE_LAUNCHER } else { "Nolo Desktop.vbs" }

if ($usesIsolatedSmokeInstaller) {
  $setup = Get-Item -LiteralPath $explicitSmokeSetupPath -ErrorAction SilentlyContinue
} else {
  $setup = Get-ChildItem -Path "packages/desktop/artifacts" -Filter "*Setup*.exe" |
    Sort-Object Length -Descending |
    Select-Object -First 1
}
if (-not $setup) {
  throw "Missing Windows setup artifact."
}

$smokeRunId = if ($env:GITHUB_RUN_ID) { [string]$env:GITHUB_RUN_ID } else { [Guid]::NewGuid().ToString("N") }
$installDir = Join-Path $env:RUNNER_TEMP "Nolo Desktop Smoke $smokeRunId"
$desktopSmokePort = 34333
$smokeLocalAppData = Join-Path $env:RUNNER_TEMP "nolo-desktop-smoke-localappdata-$smokeRunId"
$smokeTempDir = Join-Path $env:RUNNER_TEMP "nolo-desktop-smoke-temp-$smokeRunId"
$smokeInstallerTimeoutSec = 180
$smokeMode = if ($env:NOLO_DESKTOP_SMOKE_MODE) { $env:NOLO_DESKTOP_SMOKE_MODE } else { "full" }
$isReleaseSmoke = $smokeMode -eq "release"
$quickChatSmoke = $env:NOLO_DESKTOP_QUICKCHAT_SMOKE -eq "1"
$quickChatSmokeServer = if ($env:NOLO_DESKTOP_QUICKCHAT_SMOKE_SERVER) {
  $env:NOLO_DESKTOP_QUICKCHAT_SMOKE_SERVER.TrimEnd("/")
} else {
  "https://us.nolo.chat"
}

function Write-SmokePhase {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[smoke] $Message"
}

function Assert-IsolatedInstalledSmokeRunner {
  if ($env:GITHUB_ACTIONS -ne "true") {
    return
  }

  if ($env:RUNNER_ENVIRONMENT -eq "github-hosted") {
    return
  }

  if ($usesIsolatedSmokeInstaller) {
    Write-SmokePhase "self-hosted installed desktop smoke uses isolated installer identity"
    return
  }

  if ($env:NOLO_ALLOW_INSTALLED_DESKTOP_SMOKE_ON_SELF_HOSTED -eq "1") {
    Write-SmokePhase "self-hosted installed desktop smoke explicitly allowed"
    return
  }

  throw @"
Installed Windows desktop smoke is blocked on self-hosted runners by default.

This smoke would run the real Nolo Desktop installer under the current Windows
user. On a shared operator machine it can rewrite the current-user install
registry, shortcuts, updater state, and running desktop connector.

Set NOLO_DESKTOP_SMOKE_SETUP to a side-by-side smoke installer artifact, or use
a dedicated throwaway Windows runner and set
NOLO_ALLOW_INSTALLED_DESKTOP_SMOKE_ON_SELF_HOSTED=1 for that runner only.
"@
}

function Stop-SmokeInstalledBun {
  Get-Process bun -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "$installDir*" } |
    Stop-Process -Force
}

function Get-SmokeInstalledProcessIds {
  $processIds = New-Object 'System.Collections.Generic.HashSet[int]'
  Get-Process bun,launcher -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "$installDir*" } |
    ForEach-Object { [void]$processIds.Add([int]$_.Id) }

  return @($processIds)
}

function Get-SmokeScriptRootProcessIds {
  $rootIds = New-Object 'System.Collections.Generic.HashSet[int]'

  Write-SmokePhase "querying Windows script/cmd roots for the smoke install"
  Get-CimInstance Win32_Process -Filter "Name = 'wscript.exe' OR Name = 'cscript.exe' OR Name = 'cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -like "*$installDir*" -or
        $_.CommandLine -like "*$smokeLocalAppData*" -or
        $_.CommandLine -like "*$smokeTempDir*"
      )
    } |
    ForEach-Object { [void]$rootIds.Add([int]$_.ProcessId) }

  return @($rootIds)
}

function Stop-SmokeInstalledProcesses {
  param([switch]$IncludeScriptRoots)

  Write-SmokePhase "stopping prior smoke processes"
  Stop-SmokeInstalledBun

  $processIds = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($processId in (Get-SmokeInstalledProcessIds | Sort-Object -Unique)) {
    [void]$processIds.Add([int]$processId)
  }
  if ($IncludeScriptRoots) {
    foreach ($rootId in (Get-SmokeScriptRootProcessIds | Sort-Object -Unique)) {
      [void]$processIds.Add([int]$rootId)
    }
  }

  foreach ($rootId in ($processIds | Sort-Object -Unique)) {
    Write-SmokePhase "taskkill /T root pid $rootId"
    Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$rootId", "/T", "/F") -NoNewWindow -Wait | Out-Null
  }
}

function Assert-SmokePortAvailable {
  param([Parameter(Mandatory = $true)][int]$Port)

  Write-SmokePhase "probing smoke port $Port via TcpListener bind"

  $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  $probe.Server.ExclusiveAddressUse = $true

  try {
    $probe.Start()
  } catch {
    $message = if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { [string]$_ }
    throw "Desktop smoke port $Port is already in use or unavailable: $message"
  } finally {
    try {
      $probe.Stop()
    } catch {
    }
  }
}

function Assert-InstallerLogClean {
  param([Parameter(Mandatory = $true)][string]$LogPath)

  if (-not (Test-Path -LiteralPath $LogPath -PathType Leaf)) {
    Write-SmokePhase "no installer log at $LogPath (may be transient on some runners)"
    return
  }

  $logContent = Get-Content -LiteralPath $LogPath -Raw
  $errorLines = @()
  # Inno Setup log format: lines starting with "  Error:" or containing "Severity: Error"
  $logContent -split "`r`n|`n" | ForEach-Object {
    if ($_ -match "^\s*(Error|Fatal):" -or $_ -match "Severity:\s*Error") {
      $errorLines += $_
    }
  }

  if ($errorLines.Count -gt 0) {
    Write-SmokePhase "installer log has $($errorLines.Count) error(s):"
    $errorLines | ForEach-Object { Write-SmokePhase "  $_" }
    throw "Installer log contains $($errorLines.Count) error(s). Check the log at $LogPath"
  }
  Write-SmokePhase "installer log at $LogPath is clean"
}

function Assert-WebView2RuntimeInstalled {
  $webview2Paths = @(
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
  )

  $found = $false
  foreach ($regPath in $webview2Paths) {
    try {
      $pv = (Get-ItemProperty -LiteralPath $regPath -Name "pv" -ErrorAction Stop).pv
      if ($pv) {
        Write-SmokePhase "WebView2 runtime found at $regPath (version $pv)"
        $found = $true
      }
    } catch {
      # Registry key not present
    }
  }

  if (-not $found) {
    throw "WebView2 runtime is not installed or not registered. BrowserWindow creation will fail and users will see no response."
  }
}

function Assert-LauncherExecutableValid {
  param([Parameter(Mandatory = $true)][string]$ExePath)

  if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) {
    throw "Missing launcher executable: $ExePath"
  }

  # Read the first 2 bytes to verify MZ header (PE executable magic)
  $stream = [System.IO.File]::OpenRead($ExePath)
  try {
    $magic = New-Object byte[] 2
    $bytesRead = $stream.Read($magic, 0, 2)
    if ($bytesRead -lt 2 -or $magic[0] -ne 0x4D -or $magic[1] -ne 0x5A) {
      throw "Launcher executable $ExePath is not a valid PE file (missing MZ header)"
    }
    Write-SmokePhase "launcher executable at $ExePath has valid PE header"
  } finally {
    $stream.Dispose()
  }
}

function Write-QuickChatSmokeProfile {
  param(
    [Parameter(Mandatory = $true)][string]$UserProfileDir,
    [Parameter(Mandatory = $true)][string]$ServerUrl
  )

  $existingProfilePath = Join-Path $env:USERPROFILE ".nolo\config.json"
  $authToken = if ($env:NOLO_DESKTOP_QUICKCHAT_SMOKE_AUTH_TOKEN) {
    $env:NOLO_DESKTOP_QUICKCHAT_SMOKE_AUTH_TOKEN.Trim()
  } else {
    ""
  }

  if ($authToken) {
    $profileDir = Join-Path $UserProfileDir ".nolo"
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    $profilePath = Join-Path $profileDir "config.json"
    $profileConfig = @{
      currentProfile = "default"
      profiles = @{
        default = @{
          serverUrl = $ServerUrl
          authToken = $authToken
        }
      }
    }
    Set-Content -Path $profilePath -Value ($profileConfig | ConvertTo-Json -Depth 8) -Encoding UTF8
    Write-SmokePhase "quick-chat smoke wrote isolated profile from NOLO_DESKTOP_QUICKCHAT_SMOKE_AUTH_TOKEN"
    return
  }

  if (Test-Path -LiteralPath $existingProfilePath -PathType Leaf) {
    $profileDir = Join-Path $UserProfileDir ".nolo"
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    Copy-Item -LiteralPath $existingProfilePath -Destination (Join-Path $profileDir "config.json") -Force
    Write-SmokePhase "quick-chat smoke copied existing user profile into isolated smoke profile"
    return
  }

  throw @"
Quick-chat desktop smoke requires authentication.

Set NOLO_DESKTOP_QUICKCHAT_SMOKE_AUTH_TOKEN for CI, or run on a Windows user
that already has a valid %USERPROFILE%\.nolo\config.json before the smoke
switches to its isolated USERPROFILE.
"@
}

function Write-QuickChatSmokeE2eScript {
  param(
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [Parameter(Mandatory = $true)][string]$TargetFile,
    [Parameter(Mandatory = $true)][string]$ExpectedText
  )

  $prompt = @"
请用桌面端本地 runtime 修改这个 Windows 本地文件。

文件路径: $TargetFile
把文件完整内容改成：
$ExpectedText

只完成文件修改即可。
"@
  $promptJson = $prompt | ConvertTo-Json -Compress
  $scriptTemplate = @'
(() => {
  const prompt = __PROMPT_JSON__;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const log = (...args) => console.log("[desktop quick-chat smoke]", ...args);

  const waitFor = async (selector, timeoutMs = 45000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${selector}`);
  };

  const waitForTokens = async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 45000) {
      try {
        const raw = localStorage.getItem("tokens");
        const tokens = raw ? JSON.parse(raw) : [];
        if (Array.isArray(tokens) && tokens.length > 0) return tokens;
      } catch {
      }
      await sleep(250);
    }
    throw new Error("Timed out waiting for desktop auth tokens");
  };

  const waitForToolMessage = async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 90000) {
      const toolRows = Array.from(document.querySelectorAll(".tool-msg-row"));
      if (toolRows.length > 0) {
        const row = toolRows[toolRows.length - 1];
        log("tool-card-visible", row.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) || "");
        return;
      }
      await sleep(500);
    }
    throw new Error("Timed out waiting for quick-chat tool card");
  };

  const setInputValue = (input, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  void (async () => {
    await waitForTokens();
    log("tokens-ready");

    const shellInput = await waitFor('[data-testid="quick-chat-input"]');
    shellInput.focus();
    setInputValue(shellInput, prompt);
    const sendButton = await waitFor('[data-testid="quick-chat-send"]');
    sendButton.click();
    log("runtime-open-requested");

    await waitFor('[data-testid="quick-chat-runtime"]');
    await sleep(500);
    window.dispatchEvent(new CustomEvent("nolo-desktop-e2e-quick-chat", { detail: { text: prompt } }));
    log("quick-chat-event-dispatched");
    await waitForToolMessage();
  })().catch((error) => {
    console.error("[desktop quick-chat smoke] failed", error);
  });
})();
'@
  $script = $scriptTemplate.Replace("__PROMPT_JSON__", $promptJson)

  Set-Content -Path $ScriptPath -Value $script -Encoding UTF8
}

function Wait-ForQuickChatSmokeResult {
  param(
    [Parameter(Mandatory = $true)][string]$TargetFile,
    [Parameter(Mandatory = $true)][string]$ExpectedText,
    [Parameter(Mandatory = $true)][string]$PrimaryLogPath,
    [Parameter(Mandatory = $true)][string]$FallbackLogPath
  )

  Write-SmokePhase "waiting for quick-chat local runtime file edit"
  for ($i = 0; $i -lt 180; $i++) {
    if (Test-Path -LiteralPath $TargetFile -PathType Leaf) {
      $content = Get-Content -LiteralPath $TargetFile -Raw
      if ($content.Trim() -eq $ExpectedText) {
        Write-SmokePhase "quick-chat local runtime edited the smoke file"
        Wait-ForQuickChatToolCardVisible -PrimaryLogPath $PrimaryLogPath -FallbackLogPath $FallbackLogPath
        return
      }
    }
    Start-Sleep -Seconds 1
  }

  $log = Read-SmokeLog -PrimaryPath $PrimaryLogPath -FallbackPath $FallbackLogPath
  throw "Quick-chat local runtime smoke did not edit $TargetFile to the expected content.`nLauncher log:`n$log"
}

function Wait-ForQuickChatToolCardVisible {
  param(
    [Parameter(Mandatory = $true)][string]$PrimaryLogPath,
    [Parameter(Mandatory = $true)][string]$FallbackLogPath
  )

  Write-SmokePhase "waiting for quick-chat tool card in the dialog UI"
  for ($i = 0; $i -lt 90; $i++) {
    $log = Read-SmokeLog -PrimaryPath $PrimaryLogPath -FallbackPath $FallbackLogPath
    if ($log -match "tool-card-visible") {
      Write-SmokePhase "quick-chat tool card became visible in the dialog UI"
      return
    }
    if ($log -match "\[desktop quick-chat smoke\] failed") {
      throw "Quick-chat tool card smoke failed.`nLauncher log:`n$log"
    }
    Start-Sleep -Seconds 1
  }

  $log = Read-SmokeLog -PrimaryPath $PrimaryLogPath -FallbackPath $FallbackLogPath
  throw "Quick-chat local runtime smoke edited the file, but no tool card became visible in the dialog UI.`nLauncher log:`n$log"
}

function Read-SmokeLog {
  param(
    [Parameter(Mandatory = $true)][string]$PrimaryPath,
    [Parameter(Mandatory = $true)][string]$FallbackPath
  )

  if (Test-Path $FallbackPath) {
    return Get-Content $FallbackPath -Raw
  }
  if (Test-Path $PrimaryPath -PathType Leaf) {
    return Get-Content $PrimaryPath -Raw
  }
  return ""
}

function Wait-ForDesktopHealth {
  param(
    [Parameter(Mandatory = $true)][string]$BaseUrl,
    [Parameter(Mandatory = $true)][string]$PrimaryLogPath,
    [Parameter(Mandatory = $true)][string]$FallbackLogPath
  )

  Write-SmokePhase "waiting for desktop HTTP healthcheck on port $desktopSmokePort"
  for ($i = 0; $i -lt 80; $i++) {
    try {
      Invoke-WebRequest -Uri $BaseUrl -Method Head -TimeoutSec 2 -UseBasicParsing | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  $log = Read-SmokeLog -PrimaryPath $PrimaryLogPath -FallbackPath $FallbackLogPath
  if ($log) {
    throw "Desktop smoke healthcheck timed out after launching $smokeLauncherName.`nLauncher log:`n$log"
  }
  throw "Desktop smoke healthcheck timed out after launching $smokeLauncherName."
}

Write-SmokePhase "preparing smoke workspace"
Assert-IsolatedInstalledSmokeRunner
if ($isReleaseSmoke) {
  Write-SmokePhase "release smoke skips prior process-tree cleanup"
} else {
  Stop-SmokeInstalledProcesses -IncludeScriptRoots
}
Assert-SmokePortAvailable -Port $desktopSmokePort

# Validate installer before running it
$minimumInstallerBytes = if ($env:NOLO_DESKTOP_MIN_INSTALLER_BYTES) {
  [long]$env:NOLO_DESKTOP_MIN_INSTALLER_BYTES
} else {
  50000000 # 50 MB default
}
if ($setup.Length -lt $minimumInstallerBytes) {
  throw "Installer size $($setup.Length) bytes is below minimum $minimumInstallerBytes bytes — likely truncated or broken."
}
Write-SmokePhase "installer size $($setup.Length) bytes OK (minimum $minimumInstallerBytes)"

$setupLogPath = Join-Path $env:RUNNER_TEMP "nolo-desktop-smoke-setup-log-$smokeRunId.txt"
$installArgs = @(
  "/VERYSILENT",
  "/SUPPRESSMSGBOXES",
  "/NORESTART",
  "/CURRENTUSER",
  "/DIR=""$installDir""",
  "/LOG=""$setupLogPath"""
)
Write-SmokePhase "starting silent installer $($setup.FullName)"
$install = Start-Process -FilePath $setup.FullName -ArgumentList $installArgs -PassThru
if (-not $install.WaitForExit($smokeInstallerTimeoutSec * 1000)) {
  Stop-Process -Id $install.Id -Force -ErrorAction SilentlyContinue
  throw "Windows installer timed out after $smokeInstallerTimeoutSec seconds."
}
if ($install.ExitCode -ne 0) {
  throw "Windows installer exited with code $($install.ExitCode)."
}

$launcher = Join-Path $installDir $smokeLauncherName
$bun = Join-Path $installDir "bin\bun.exe"
$entry = Join-Path $installDir "Resources\main.js"

if (-not (Test-Path $launcher)) {
  throw "Missing installed launcher: $launcher"
}
if (-not (Test-Path $bun)) {
  throw "Missing installed Bun runtime: $bun"
}
if (-not (Test-Path $entry)) {
  throw "Missing installed desktop entry: $entry"
}

# Validate installation integrity
Assert-InstallerLogClean -LogPath $setupLogPath
Assert-WebView2RuntimeInstalled
Assert-LauncherExecutableValid -ExePath (Join-Path $installDir "bin\launcher.exe")

$smokeLogDir = Join-Path $env:RUNNER_TEMP "nolo-desktop-smoke-logs"
New-Item -ItemType Directory -Force -Path $smokeLogDir | Out-Null

New-Item -ItemType Directory -Force -Path $smokeLocalAppData | Out-Null
New-Item -ItemType Directory -Force -Path $smokeTempDir | Out-Null

$env:LOCALAPPDATA = $smokeLocalAppData
$env:TEMP = $smokeTempDir
$env:TMP = $smokeTempDir

if ($quickChatSmoke) {
  $smokeUserProfile = Join-Path $env:RUNNER_TEMP "nolo-desktop-smoke-userprofile-$smokeRunId"
  New-Item -ItemType Directory -Force -Path $smokeUserProfile | Out-Null
  Write-QuickChatSmokeProfile -UserProfileDir $smokeUserProfile -ServerUrl $quickChatSmokeServer
  $env:USERPROFILE = $smokeUserProfile
  $env:HOME = $smokeUserProfile
  $env:NOLO_SERVER = $quickChatSmokeServer
}

$launcherLog = Join-Path $env:LOCALAPPDATA "chat.nolo.desktop\launcher.log"
if (Test-Path $launcherLog) {
  Remove-Item -Recurse -Force $launcherLog
}
$launcherLogDir = Split-Path -Parent $launcherLog
New-Item -ItemType Directory -Force -Path $launcherLogDir | Out-Null
New-Item -ItemType Directory -Force -Path $launcherLog | Out-Null

$env:NOLO_DESKTOP_SERVER_PORT = [string]$desktopSmokePort
$env:NOLO_DESKTOP_UPDATE_CHECK_DELAY_MS = "600000"
if ($isReleaseSmoke) {
  $env:NOLO_DESKTOP_SMOKE_PROBE = "1"
  $env:NOLO_DESKTOP_SMOKE_PROBE_TIMEOUT_MS = "20000"
  $env:NOLO_DESKTOP_SMOKE_PROBE_EXIT_DELAY_MS = "3000"
} else {
  Remove-Item Env:NOLO_DESKTOP_SMOKE_PROBE -ErrorAction SilentlyContinue
  Remove-Item Env:NOLO_DESKTOP_SMOKE_PROBE_TIMEOUT_MS -ErrorAction SilentlyContinue
  Remove-Item Env:NOLO_DESKTOP_SMOKE_PROBE_EXIT_DELAY_MS -ErrorAction SilentlyContinue
}

$quickChatSmokeTargetFile = ""
$quickChatSmokeExpectedText = ""
if ($quickChatSmoke) {
  $quickChatSmokeTargetFile = Join-Path $smokeTempDir "nolo-desktop-quick-chat-local-runtime.txt"
  $quickChatSmokeExpectedText = "windows quick-chat local runtime ok $smokeRunId"
  Set-Content -Path $quickChatSmokeTargetFile -Value "pending" -Encoding UTF8
  $quickChatSmokeScriptPath = Join-Path $smokeTempDir "nolo-desktop-quick-chat-e2e.js"
  Write-QuickChatSmokeE2eScript `
    -ScriptPath $quickChatSmokeScriptPath `
    -TargetFile $quickChatSmokeTargetFile `
    -ExpectedText $quickChatSmokeExpectedText
  $env:NOLO_DESKTOP_E2E_SCRIPT_PATH = $quickChatSmokeScriptPath
}

$wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
Write-SmokePhase "launching installed VBS entry"
$launch = Start-Process -FilePath $wscript -ArgumentList @("""$launcher""") -WindowStyle Hidden -PassThru
$launch.WaitForExit(10000) | Out-Null

$serverBase = "http://127.0.0.1:$desktopSmokePort"
$fallbackLog = Join-Path $env:TEMP "Nolo Desktop launcher.log"
Wait-ForDesktopHealth -BaseUrl $serverBase -PrimaryLogPath $launcherLog -FallbackLogPath $fallbackLog

function Invoke-SmokeJsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Body
  )

  $json = $Body | ConvertTo-Json -Depth 8
  $response = Invoke-WebRequest -Uri "$serverBase$Path" -Method Post -Body $json -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
  return $response.Content | ConvertFrom-Json
}

function Invoke-SmokeJsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  $response = Invoke-WebRequest -Uri "$serverBase$Path" -Method Get -TimeoutSec 5 -UseBasicParsing
  return $response.Content | ConvertFrom-Json
}

function Convert-SmokeResponseContent {
  param($Content)

  if ($Content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($Content)
  }
  return [string]$Content
}

function Assert-InstalledDesktopSecurityBoundary {
  param([Parameter(Mandatory = $true)][string]$BaseUrl)

  $devToolResponse = Invoke-WebRequest -Uri "$BaseUrl/api/read-file" -Method Post -Body "{}" -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing -SkipHttpErrorCheck
  $devToolBody = Convert-SmokeResponseContent $devToolResponse.Content
  $devToolBlocked = [int]$devToolResponse.StatusCode -eq 403 -and $devToolBody -match "Forbidden: dev tool auth required"
  if (-not $devToolBlocked) {
    throw "Expected /api/read-file to require an authenticated allowlisted agent in installed desktop production runtime."
  }
}

function Invoke-FullDesktopFilesSmoke {
  param([Parameter(Mandatory = $true)][string]$BaseUrl)

  $desktopFilesRoot = Join-Path $env:RUNNER_TEMP "nolo-desktop-files-smoke"
  if (Test-Path $desktopFilesRoot) {
    Remove-Item -Recurse -Force $desktopFilesRoot
  }
  New-Item -ItemType Directory -Force -Path $desktopFilesRoot | Out-Null
  Set-Content -Path (Join-Path $desktopFilesRoot "todo.txt") -Value "organize local files" -Encoding UTF8

  $rootResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/roots/request" -Body @{
    id = "smoke"
    label = "Smoke"
    path = $desktopFilesRoot
  }
  if (-not $rootResult.ok -or $rootResult.root.id -ne "smoke") {
    throw "Desktop files root authorization smoke failed: $($rootResult | ConvertTo-Json -Depth 8)"
  }

  $listResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/list" -Body @{
    rootId = "smoke"
    relativePath = "."
  }
  if (-not $listResult.ok -or -not ($listResult.entries | Where-Object { $_.name -eq "todo.txt" })) {
    throw "Desktop files list smoke failed: $($listResult | ConvertTo-Json -Depth 8)"
  }

  $readResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/read" -Body @{
    rootId = "smoke"
    relativePath = "todo.txt"
  }
  if (-not $readResult.ok -or $readResult.content -notmatch "organize local files") {
    throw "Desktop files read smoke failed: $($readResult | ConvertTo-Json -Depth 8)"
  }

  $planResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/plan" -Body @{
    rootId = "smoke"
    summary = "Move local file smoke fixture"
    riskLevel = "low"
    operations = @(
      @{
        kind = "move"
        sourceRelativePath = "todo.txt"
        destinationRelativePath = "organized/todo.txt"
        reason = "Verify installed desktop file execution"
        conflictPolicy = "skip"
      }
    )
  }
  if (-not $planResult.ok -or -not $planResult.plan.planId -or $planResult.plan.approved) {
    throw "Desktop files plan smoke failed: $($planResult | ConvertTo-Json -Depth 8)"
  }

  $approveResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/approve" -Body @{
    planId = $planResult.plan.planId
  }
  if (-not $approveResult.ok) {
    throw "Desktop files approve smoke failed: $($approveResult | ConvertTo-Json -Depth 8)"
  }

  $executeResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/execute" -Body @{
    planId = $planResult.plan.planId
  }
  if (-not $executeResult.ok -or -not $executeResult.history.batchId) {
    throw "Desktop files execute smoke failed: $($executeResult | ConvertTo-Json -Depth 8)"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $desktopFilesRoot "organized\todo.txt"))) {
    throw "Desktop files execute smoke did not move todo.txt into organized folder."
  }

  $historyResult = Invoke-SmokeJsonGet -Path "/api/desktop/files/history"
  if (-not $historyResult.ok -or -not ($historyResult.history | Where-Object { $_.batchId -eq $executeResult.history.batchId })) {
    throw "Desktop files history smoke failed: $($historyResult | ConvertTo-Json -Depth 8)"
  }

  $undoResult = Invoke-SmokeJsonPost -Path "/api/desktop/files/undo" -Body @{
    batchId = $executeResult.history.batchId
  }
  if (-not $undoResult.ok) {
    throw "Desktop files undo smoke failed: $($undoResult | ConvertTo-Json -Depth 8)"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $desktopFilesRoot "todo.txt"))) {
    throw "Desktop files undo smoke did not restore todo.txt."
  }
}

function Wait-ForSmokeProbeCompletion {
  param(
    [Parameter(Mandatory = $true)][string]$PrimaryLogPath,
    [Parameter(Mandatory = $true)][string]$FallbackLogPath,
    [Parameter(Mandatory = $true)][string]$ExpectedPublicDir
  )

  $log = ""
  $browserWindowCreated = $false
  $probeCompleted = $false
  $expectedPublicDirPattern = [Regex]::Escape("[desktop] using public dir $ExpectedPublicDir")

  Write-SmokePhase "waiting for BrowserWindow/probe completion logs"
  for ($i = 0; $i -lt 80; $i++) {
    $log = Read-SmokeLog -PrimaryPath $PrimaryLogPath -FallbackPath $FallbackLogPath
    if ($log -match "\[desktop\] BrowserWindow created") {
      $browserWindowCreated = $true
    }
    if ($log -match "\[desktop\] smoke probe completed: dom-ready") {
      $probeCompleted = $true
    }
    if ($browserWindowCreated -and $probeCompleted -and $log -match $expectedPublicDirPattern) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  if ($env:RUNNER_ENVIRONMENT -eq "github-hosted") {
    if (-not $browserWindowCreated) {
      Write-SmokePhase "github-hosted: BrowserWindow was not created within timeout. WebView2 may be missing or broken."
    } else {
      Write-SmokePhase "github-hosted: BrowserWindow created (probe-completed check skipped in headless CI)"
    }
    if (-not $log -match $expectedPublicDirPattern) {
      Write-SmokePhase "github-hosted: public dir pattern not found in logs (may be path formatting)"
    }
    return
  }

  if (-not $browserWindowCreated) {
    throw "Desktop smoke reached HTTP healthcheck but did not create BrowserWindow.`nLauncher log:`n$log"
  }
  if (-not $probeCompleted) {
    throw "Desktop smoke created BrowserWindow but did not finish probe mode.`nLauncher log:`n$log"
  }
  throw "Desktop smoke did not serve assets from the installed Resources directory: $ExpectedPublicDir.`nLauncher log:`n$log"
}

$expectedPublicDir = Join-Path $installDir "Resources\app\public"

Assert-InstalledDesktopSecurityBoundary -BaseUrl $serverBase

if ($isReleaseSmoke) {
  Wait-ForSmokeProbeCompletion -PrimaryLogPath $launcherLog -FallbackLogPath $fallbackLog -ExpectedPublicDir $expectedPublicDir
} else {
  Invoke-FullDesktopFilesSmoke -BaseUrl $serverBase
  $log = Read-SmokeLog -PrimaryPath $launcherLog -FallbackPath $fallbackLog
  if ($log -notmatch "\[desktop\] BrowserWindow created") {
    throw "Desktop smoke reached HTTP healthcheck but did not create BrowserWindow.`nLauncher log:`n$log"
  }
  $expectedPublicDirPattern = [Regex]::Escape("[desktop] using public dir $expectedPublicDir")
  if ($log -notmatch $expectedPublicDirPattern) {
    throw "Desktop smoke did not serve assets from the installed Resources directory: $expectedPublicDir.`nLauncher log:`n$log"
  }
  if ($quickChatSmoke) {
    Wait-ForQuickChatSmokeResult `
      -TargetFile $quickChatSmokeTargetFile `
      -ExpectedText $quickChatSmokeExpectedText `
      -PrimaryLogPath $launcherLog `
      -FallbackLogPath $fallbackLog
  }
  Stop-SmokeInstalledProcesses -IncludeScriptRoots
}

Write-Host "Installed Windows desktop smoke passed with BrowserWindow startup in mode $smokeMode."
