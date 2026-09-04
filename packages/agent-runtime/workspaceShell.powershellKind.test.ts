import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildPowerShellSpawnArgs,
  buildWorkspaceShellPlan,
  resolvePowerShellShellKind,
  wrapPowerShellCommand,
} from "./workspaceShell";

const ENCODING_PREFIXES = [
  "[Console]::InputEncoding=[System.Text.Encoding]::UTF8",
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
  "$OutputEncoding=[System.Text.Encoding]::UTF8",
];

describe("resolvePowerShellShellKind", () => {
  it("maps pwsh executables to the pwsh kind (PowerShell 7+)", () => {
    expect(resolvePowerShellShellKind("pwsh")).toBe("pwsh");
    expect(resolvePowerShellShellKind("pwsh.exe")).toBe("pwsh");
    expect(resolvePowerShellShellKind("C:\\Program Files\\PowerShell\\7\\pwsh.exe")).toBe("pwsh");
    expect(resolvePowerShellShellKind("/opt/homebrew/bin/pwsh")).toBe("pwsh");
  });

  it("maps Windows PowerShell 5.1 executables to the powershell5 kind", () => {
    expect(resolvePowerShellShellKind("powershell.exe")).toBe("powershell5");
    expect(resolvePowerShellShellKind("powershell")).toBe("powershell5");
    expect(resolvePowerShellShellKind("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")).toBe("powershell5");
  });
});

describe("wrapPowerShellCommand", () => {
  it("keeps the $PSStyle prefix for pwsh (PowerShell 7+)", () => {
    const wrapped = wrapPowerShellCommand("Get-Location", "pwsh");
    expect(wrapped).toContain("$PSStyle.OutputRendering='PlainText'");
    expect(wrapped.endsWith("; Get-Location")).toBe(true);
  });

  it("drops the $PSStyle prefix for powershell5 (5.1 has no $PSStyle)", () => {
    const wrapped = wrapPowerShellCommand("Get-Location", "powershell5");
    expect(wrapped).not.toContain("$PSStyle");
    for (const prefix of ENCODING_PREFIXES) {
      expect(wrapped).toContain(prefix);
    }
    expect(wrapped.endsWith("; Get-Location")).toBe(true);
  });

  it("keeps the legacy 4-prefix shape when no kind is passed (back-compat)", () => {
    const wrapped = wrapPowerShellCommand("Get-Location");
    expect(wrapped).toContain("$PSStyle.OutputRendering='PlainText'");
    for (const prefix of ENCODING_PREFIXES) {
      expect(wrapped).toContain(prefix);
    }
  });
});

describe("buildPowerShellSpawnArgs", () => {
  it("wraps with the powershell5 shape for Windows PowerShell 5.1 executables", () => {
    const args = buildPowerShellSpawnArgs({
      executable: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      command: "git status",
    });
    expect(args[0]).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    expect(args).toContain("-NonInteractive");
    const wrapped = args[args.length - 1]!;
    expect(wrapped).not.toContain("$PSStyle");
    expect(wrapped).toContain("[Console]::InputEncoding=[System.Text.Encoding]::UTF8");
    expect(wrapped.endsWith("; git status")).toBe(true);
  });

  it("wraps with the pwsh shape for PowerShell 7+ executables", () => {
    const args = buildPowerShellSpawnArgs({ executable: "pwsh", command: "git status" });
    const wrapped = args[args.length - 1]!;
    expect(wrapped).toContain("$PSStyle.OutputRendering='PlainText'");
    expect(wrapped.endsWith("; git status")).toBe(true);
  });
});

describe("buildWorkspaceShellPlan", () => {
  const originalPath = process.env.PATH;
  let injectedDirs: string[] = [];

  beforeEach(() => {
    injectedDirs = [];
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    for (const dir of injectedDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  });

  /** Fake executables only need to exist: resolveExecutableOnPath checks isFile. */
  function injectFakePathDir(files: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), "nolo-shell-kind-"));
    for (const file of files) {
      writeFileSync(join(dir, file), "#!/bin/sh\n");
    }
    injectedDirs.push(dir);
    process.env.PATH = dir;
    return dir;
  }

  it("keeps the bash plan shape unchanged (no shellKind)", () => {
    const plan = buildWorkspaceShellPlan({ toolName: "execShell", command: "echo hi", shell: "bash" });
    expect(plan.resolvedShell).toBe("bash");
    expect(plan.shellKind).toBeUndefined();
    expect(plan.argv[1]).toBe("-lc");
    expect(plan.argv[2]).toBe("echo hi");
  });

  it("carries shellKind=pwsh when PATH resolves a pwsh executable first", () => {
    const dir = injectFakePathDir(["pwsh"]);
    const plan = buildWorkspaceShellPlan({
      toolName: "execShell",
      command: "Get-Location",
      shell: "powershell",
    });
    expect(plan.resolvedShell).toBe("powershell");
    expect(plan.executable).toBe(join(dir, "pwsh"));
    expect(plan.shellKind).toBe("pwsh");
    expect(plan.argv[plan.argv.length - 1]).toContain("$PSStyle");
  });

  it("carries shellKind=powershell5 when only powershell.exe resolves", () => {
    injectFakePathDir(["powershell.exe"]);
    const plan = buildWorkspaceShellPlan({
      toolName: "execShell",
      command: "Get-Location",
      shell: "powershell",
    });
    expect(plan.resolvedShell).toBe("powershell");
    if (plan.executable.includes("powershell.exe")) {
      expect(plan.shellKind).toBe("powershell5");
      expect(plan.argv[plan.argv.length - 1]).not.toContain("$PSStyle");
    } else {
      // A real pwsh exists in fallback dirs; the mapping must stay consistent.
      expect(plan.shellKind).toBe("pwsh");
    }
  });
});
