#define AppName "__APP_NAME__"
#define AppVersion "__APP_VERSION__"
#define SourceDir "__SOURCE_DIR__"
#define OutputDir "__OUTPUT_DIR__"
#define OutputBaseFilename "__OUTPUT_BASE_FILENAME__"
#define SetupIconFile "__SETUP_ICON_FILE__"
#define LaunchScriptFile "__LAUNCH_SCRIPT_FILE__"
#define LaunchScriptDestName "__LAUNCH_SCRIPT_DEST_NAME__"
#define WebView2BootstrapperFile "__WEBVIEW2_BOOTSTRAPPER_FILE__"

[Setup]
AppId={{__APP_ID__}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Nolo
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=__INSTALLER_COMPRESSION__
SolidCompression=__INSTALLER_SOLID_COMPRESSION__
WizardStyle=modern
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
SetupIconFile={#SetupIconFile}
UninstallDisplayIcon={app}\bin\launcher.exe
CloseApplications=yes
RestartApplications=no
UsePreviousAppDir=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#LaunchScriptFile}"; DestDir: "{app}"; DestName: "{#LaunchScriptDestName}"; Flags: ignoreversion
Source: "{#WebView2BootstrapperFile}"; DestDir: "{tmp}"; DestName: "MicrosoftEdgeWebview2Setup.exe"; Flags: deleteafterinstall

[InstallDelete]
Type: files; Name: "{userprograms}\{#AppName}.lnk"

[Icons]
Name: "{group}\{#AppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#LaunchScriptDestName}"""; WorkingDir: "{app}"; IconFilename: "{app}\bin\launcher.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#LaunchScriptDestName}"""; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\bin\launcher.exe"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"

[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; Flags: waituntilterminated; Check: not IsWebView2RuntimeInstalled
Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#LaunchScriptDestName}"""; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: files; Name: "{app}\bin\app.log"
Type: files; Name: "{localappdata}\__APP_IDENTIFIER__\launcher.log"

[Code]
function QuoteForPowerShellSingleQuotedString(value: String): String;
var
  idx: Integer;
begin
  Result := '';
  for idx := 1 to Length(value) do begin
    if value[idx] = '''' then begin
      Result := Result + #39 + #39;
    end else begin
      Result := Result + value[idx];
    end;
  end;
end;

procedure StopRunningInstalledBunAt(baseDir: String);
var
  bunPath: String;
  params: String;
  powershellPath: String;
  resultCode: Integer;
begin
  if baseDir = '' then begin
    exit;
  end;

  bunPath := AddBackslash(baseDir) + 'bin\bun.exe';
  if not FileExists(bunPath) then begin
    exit;
  end;

  powershellPath := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  params :=
    '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$target = ''' + QuoteForPowerShellSingleQuotedString(bunPath) + '''; ' +
    'Get-Process bun -ErrorAction SilentlyContinue | ' +
    'Where-Object { $_.Path -eq $target } | ' +
    'Stop-Process -Force' +
    '"';

  if Exec(powershellPath, params, '', SW_HIDE, ewWaitUntilTerminated, resultCode) then begin
    Log(Format('Attempted to stop installed Bun process at %s before file replacement. Exit code: %d', [bunPath, resultCode]));
  end else begin
    Log(Format('Failed to invoke PowerShell to stop installed Bun process at %s.', [bunPath]));
  end;
end;

procedure StopStaleNoloProcesses();
var
  params: String;
  powershellPath: String;
  resultCode: Integer;
begin
  powershellPath := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  params :=
    '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$noloInstallPattern = ''*__APP_NAME__*''; ' +
    '$noloDataPattern = ''*__APP_IDENTIFIER__*''; ' +
    'Get-Process -Name bun,launcher -ErrorAction SilentlyContinue | ' +
    'Where-Object { $_.Path -and ($_.Path -like $noloInstallPattern -or $_.Path -like $noloDataPattern) } | ' +
    'Stop-Process -Force; ' +
    'Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ' +
    'Where-Object { ' +
    '  $_.Name -in @(''wscript.exe'', ''cscript.exe'', ''cmd.exe'', ''msedgewebview2.exe'') -and ' +
    '  $_.CommandLine -and ($_.CommandLine -like $noloInstallPattern -or $_.CommandLine -like $noloDataPattern) ' +
    '} | ' +
    'Invoke-CimMethod -MethodName Terminate -ErrorAction SilentlyContinue' +
    '"';

  if Exec(powershellPath, params, '', SW_HIDE, ewWaitUntilTerminated, resultCode) then begin
    Log(Format('[repair] StopStaleNoloProcesses completed. Exit code: %d', [resultCode]));
  end else begin
    Log('[repair] Failed to invoke PowerShell for StopStaleNoloProcesses.');
  end;
end;

procedure CleanStaleRuntimeCache();
var
  localAppData: String;
  stableAppDir: String;
  stableDataDir: String;
begin
  localAppData := ExpandConstant('{localappdata}');
  stableAppDir := AddBackslash(localAppData) + '__APP_IDENTIFIER__' + '\stable\app';
  stableDataDir := AddBackslash(localAppData) + '__APP_IDENTIFIER__' + '\stable\data';

  if DirExists(stableAppDir) then begin
    Log(Format('[repair] Removing stale runtime app cache: %s', [stableAppDir]));
    if DelTree(stableAppDir, True, True, True) then begin
      Log('[repair] Stale runtime app cache removed successfully.');
    end else begin
      Log('[repair] Failed to remove stale runtime app cache.');
    end;
  end else begin
    Log('[repair] No stale runtime app cache found to clean.');
  end;

  if DirExists(stableDataDir) then begin
    Log(Format('[repair] Preserved user data directory: %s', [stableDataDir]));
  end;
end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Log('[repair] Starting Windows desktop repair hotfix.');
  StopRunningInstalledBunAt(WizardDirValue);
  StopStaleNoloProcesses();
  CleanStaleRuntimeCache();
  Log('[repair] Windows desktop repair hotfix completed.');
  Result := '';
end;

function HasWebView2Runtime(rootKey: Integer; subkey: String): Boolean;
var
  version: String;
begin
  Result := RegQueryStringValue(rootKey, subkey, 'pv', version) and (version <> '');
end;

function IsWebView2RuntimeInstalled: Boolean;
begin
  Result :=
    HasWebView2Runtime(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}') or
    HasWebView2Runtime(HKLM, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}') or
    HasWebView2Runtime(HKLM, 'Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}');
end;
