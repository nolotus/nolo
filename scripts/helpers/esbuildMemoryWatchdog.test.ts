import { describe, expect, test } from "bun:test";
import {
  parseWindowsEsbuildProcessJson,
  shouldRecycleEsbuildService,
} from "./esbuildMemoryWatchdog";

const repoRoot = "C:\\Users\\nolot\\bun-nolo";

describe("esbuild memory watchdog", () => {
  test("parses Windows Get-Process JSON output", () => {
    const processes = parseWindowsEsbuildProcessJson(
      JSON.stringify({
        Id: 123,
        Path: "C:\\Users\\nolot\\bun-nolo\\node_modules\\@esbuild\\win32-x64\\esbuild.exe",
        WorkingSetMB: 2450.6,
      })
    );

    expect(processes).toEqual([
      {
        pid: 123,
        path: "C:\\Users\\nolot\\bun-nolo\\node_modules\\@esbuild\\win32-x64\\esbuild.exe",
        workingSetMb: 2450.6,
      },
    ]);
  });

  test("recycles only repo-owned esbuild processes above the threshold", () => {
    const decision = shouldRecycleEsbuildService({
      repoRoot,
      processes: [
        {
          pid: 1,
          path: "C:\\tmp\\other\\node_modules\\@esbuild\\win32-x64\\esbuild.exe",
          workingSetMb: 3000,
        },
        {
          pid: 2,
          path: "C:\\Users\\nolot\\bun-nolo\\node_modules\\@esbuild\\win32-x64\\esbuild.exe",
          workingSetMb: 2501,
        },
      ],
      maxWorkingSetMb: 2400,
      nowMs: 10_000,
      lastRecycleAtMs: 0,
      cooldownMs: 1_000,
    });

    expect(decision?.pid).toBe(2);
    expect(decision?.workingSetMb).toBe(2501);
  });

  test("does not recycle during the cooldown window", () => {
    const decision = shouldRecycleEsbuildService({
      repoRoot,
      processes: [
        {
          pid: 2,
          path: "C:\\Users\\nolot\\bun-nolo\\node_modules\\@esbuild\\win32-x64\\esbuild.exe",
          workingSetMb: 2600,
        },
      ],
      maxWorkingSetMb: 2400,
      nowMs: 10_000,
      lastRecycleAtMs: 9_500,
      cooldownMs: 1_000,
    });

    expect(decision).toBeNull();
  });
});
