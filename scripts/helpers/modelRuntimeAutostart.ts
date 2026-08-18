export type ModelRuntimeAutostartConfig = {
  repoRoot: string;
  bunPath: string;
  currentUser: string;
  taskName?: string;
  runtimeScriptPath?: string;
  runtimeArgs?: string[];
};

export const DEFAULT_MODEL_RUNTIME_TASK_NAME = "Nolo-LocalModelRuntimeWatch";

function quoteForPowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function resolveModelRuntimeTaskName(taskName?: string): string {
  const trimmed = taskName?.trim();
  return trimmed ? trimmed : DEFAULT_MODEL_RUNTIME_TASK_NAME;
}

export function buildModelRuntimeWatchStartCommand(config: ModelRuntimeAutostartConfig): string {
  const scriptPath = config.runtimeScriptPath?.trim() || ".\\scripts\\runtime\\localModelRuntimeSupervisor.ts";
  const runtimeArgs = config.runtimeArgs?.length ? config.runtimeArgs : ["watch-start"];
  const argumentList = runtimeArgs.map((value) => quoteForPowerShell(value)).join(", ");

  return [
    `Set-Location ${quoteForPowerShell(config.repoRoot)}`,
    `& ${quoteForPowerShell(config.bunPath)} ${quoteForPowerShell(scriptPath)} @(${argumentList})`,
  ].join("; ");
}

export function buildModelRuntimeAutostartRegistrationScript(config: ModelRuntimeAutostartConfig): string {
  const taskName = resolveModelRuntimeTaskName(config.taskName);
  const command = buildModelRuntimeWatchStartCommand(config);

  return [
    `$taskName = ${quoteForPowerShell(taskName)}`,
    `$currentUser = ${quoteForPowerShell(config.currentUser)}`,
    `$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ${quoteForPowerShell(`-NoProfile -WindowStyle Hidden -Command "${command}"`)}`,
    `$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser`,
    `$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew`,
    "Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Nolo local model runtime watchdog bootstrap' -User $currentUser -Force | Out-Null",
  ].join("; ");
}

export function buildModelRuntimeAutostartStatusScript(taskName?: string): string {
  const resolvedTaskName = resolveModelRuntimeTaskName(taskName);
  return [
    `$taskName = ${quoteForPowerShell(resolvedTaskName)}`,
    "$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue",
    "if ($null -eq $task) { [pscustomobject]@{ installed = $false; taskName = $taskName } | ConvertTo-Json -Compress; exit 0 }",
    "$info = Get-ScheduledTaskInfo -TaskName $taskName",
    "$action = $task.Actions | Select-Object -First 1",
    "[pscustomobject]@{ installed = $true; taskName = $task.TaskName; state = [string]$task.State; lastTaskResult = $info.LastTaskResult; lastRunTime = $info.LastRunTime; nextRunTime = $info.NextRunTime; execute = $action.Execute; arguments = $action.Arguments } | ConvertTo-Json -Compress",
  ].join("; ");
}

export function buildModelRuntimeAutostartUnregisterScript(taskName?: string): string {
  const resolvedTaskName = resolveModelRuntimeTaskName(taskName);
  return [
    `$taskName = ${quoteForPowerShell(resolvedTaskName)}`,
    "$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue",
    "if ($null -eq $task) { exit 0 }",
    "Unregister-ScheduledTask -TaskName $taskName -Confirm:$false",
  ].join("; ");
}
