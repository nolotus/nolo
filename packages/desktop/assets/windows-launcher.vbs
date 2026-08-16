Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
tempDir = shell.ExpandEnvironmentStrings("%TEMP%")
logDir = localAppData & "\chat.nolo.desktop"
logPath = logDir & "\launcher.log"
bunPath = appDir & "\bin\bun.exe"
entryPath = appDir & "\Resources\main.js"
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
LogMessage "Launching " & bunPath & " " & entryPath

launchCommand = Chr(34) & bunPath & Chr(34) & " " & Chr(34) & entryPath & Chr(34)
If logEnabled Then
  launchCommand = launchCommand & " >> " & Chr(34) & logPath & Chr(34) & " 2>&1"
  launchCommand = launchCommand & " & echo [launcher] Process exited code !ERRORLEVEL! >> " & Chr(34) & logPath & Chr(34)
End If

command = shell.ExpandEnvironmentStrings("%ComSpec%") & " /v:on /d /c " & Chr(34) & launchCommand & Chr(34)
shell.Run command, 0, False
