import { describe, expect, it } from "bun:test";

import {
  buildModelRuntimeAutostartRegistrationScript,
  buildModelRuntimeAutostartStatusScript,
  buildModelRuntimeAutostartUnregisterScript,
  buildModelRuntimeWatchStartCommand,
  DEFAULT_MODEL_RUNTIME_TASK_NAME,
  resolveModelRuntimeTaskName,
} from "./modelRuntimeAutostart";

describe("modelRuntimeAutostart helpers", () => {
  it("uses the default task name when none is provided", () => {
    expect(resolveModelRuntimeTaskName()).toBe(DEFAULT_MODEL_RUNTIME_TASK_NAME);
    expect(resolveModelRuntimeTaskName(" Custom Task ")).toBe("Custom Task");
  });

  it("builds the watch-start PowerShell command in the repo root", () => {
    expect(
      buildModelRuntimeWatchStartCommand({
        repoRoot: "C:\\Users\\nolot\\bun-nolo",
        bunPath: "C:\\Users\\nolot\\.bun\\bin\\bun.exe",
        currentUser: "DESKTOP-RLLMCB9\\nolot",
      }),
    ).toContain("& 'C:\\Users\\nolot\\.bun\\bin\\bun.exe' '.\\scripts\\runtime\\localModelRuntimeSupervisor.ts' @('watch-start')");
  });

  it("builds registration and status scripts for the scheduled task", () => {
    const registration = buildModelRuntimeAutostartRegistrationScript({
      repoRoot: "C:\\Users\\nolot\\bun-nolo",
      bunPath: "C:\\Users\\nolot\\.bun\\bin\\bun.exe",
      currentUser: "DESKTOP-RLLMCB9\\nolot",
    });
    expect(registration).toContain("Register-ScheduledTask");
    expect(registration).toContain(DEFAULT_MODEL_RUNTIME_TASK_NAME);
    expect(registration).toContain("Nolo local model runtime watchdog bootstrap");

    const status = buildModelRuntimeAutostartStatusScript();
    expect(status).toContain("Get-ScheduledTask");
    expect(status).toContain("installed = $false");

    const unregister = buildModelRuntimeAutostartUnregisterScript();
    expect(unregister).toContain("Unregister-ScheduledTask");
    expect(unregister).toContain(DEFAULT_MODEL_RUNTIME_TASK_NAME);
  });
});
