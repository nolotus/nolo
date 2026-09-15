Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
tempDir = shell.ExpandEnvironmentStrings("%TEMP%")
logDir = localAppData & "\chat.nolo.desktop"
logPath = logDir & "\launcher.log"
bunPath = appDir & "\bin\bun.exe"
entryPath = appDir & "\Resources\main.js"
wrapperLauncherPath = appDir & "\bin\launcher.exe"
logEnabled = True

Sub EnsureFolder(path)
  If fso.FolderExists(path) Then
    Exit Sub
  End If

  On Error Resume Next
  fso.CreateFolder(path)
  If Err.Number <> 0 Then
    Err.Clear
  End If
  On Error GoTo 0
End Sub

Function CanAppendLog(path)
  On Error Resume Next
  Set probeFile = fso.OpenTextFile(path, 8, True)
  If Err.Number <> 0 Then
    Err.Clear
    CanAppendLog = False
  Else
    probeFile.Close
    CanAppendLog = True
  End If
  On Error GoTo 0
End Function

EnsureFolder logDir
If Not CanAppendLog(logPath) Then
  logDir = tempDir
  logPath = logDir & "\Nolo Desktop launcher.log"
  If Not CanAppendLog(logPath) Then
    logEnabled = False
  End If
End If

Sub LogMessage(message)
  If Not logEnabled Then
    Exit Sub
  End If

  On Error Resume Next
  Set logFile = fso.OpenTextFile(logPath, 8, True)
  If Err.Number = 0 Then
    logFile.WriteLine Now & " " & message
    logFile.Close
  Else
    Err.Clear
  End If
  On Error GoTo 0
End Sub

shell.CurrentDirectory = appDir & "\bin"

' Layout-adaptive entry (2026-09-15): Electrobun v2 stable installs use a wrapper
' payload (bin\launcher.exe + Resources\<hash>.tar.zst with the real app inside),
' while legacy flat payloads carry bin\bun.exe + Resources\main.js. Launch whichever
' layout is actually installed; fail loudly (logged, non-zero) when neither exists.
If fso.FileExists(bunPath) And fso.FileExists(entryPath) Then
  LogMessage "Launching " & bunPath & " " & entryPath
  launchCommand = Chr(34) & bunPath & Chr(34) & " " & Chr(34) & entryPath & Chr(34)
ElseIf fso.FileExists(wrapperLauncherPath) Then
  LogMessage "Launching " & wrapperLauncherPath
  launchCommand = Chr(34) & wrapperLauncherPath & Chr(34)
Else
  LogMessage "No runnable desktop entry found in " & appDir & " (neither " & bunPath & " + " & entryPath & " nor " & wrapperLauncherPath & ")"
  WScript.Quit 1
End If

If logEnabled Then
  launchCommand = launchCommand & " >> " & Chr(34) & logPath & Chr(34) & " 2>&1"
  launchCommand = launchCommand & " & echo [launcher] Process exited code !ERRORLEVEL! >> " & Chr(34) & logPath & Chr(34)
End If

command = shell.ExpandEnvironmentStrings("%ComSpec%") & " /v:on /d /c " & Chr(34) & launchCommand & Chr(34)
shell.Run command, 0, False
