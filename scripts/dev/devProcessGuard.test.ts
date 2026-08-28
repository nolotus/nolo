import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectRunningManagedProcesses,
  findDevRunnerPid,
  findExistingPid,
  resolveManagedPid,
} from "./devProcessGuard";

const MOCK_PS_OUTPUT = `
101 /usr/local/bin/bun ./scripts/dev/devRunner.ts
202 /usr/local/bin/bun ./scripts/dev/esDev.js
404 /usr/local/bin/bun ./packages/server/entry.ts
505 /usr/local/bin/bun ./packages/server/entry.ts --nolo-slot=preview-a
606 /usr/local/bin/bun ./packages/server/entry.ts --nolo-slot=preview-b
`;

describe("devProcessGuard helpers", () => {
  it("finds the interactive bun dev runner from ps output", () => {
    expect(findDevRunnerPid({ psOutput: MOCK_PS_OUTPUT, currentPid: 999 })).toBe(
      101
    );
  });

  it("finds managed dev:ctl processes by command needle", () => {
    expect(
      findExistingPid("./packages/server/entry.ts", {
        psOutput: MOCK_PS_OUTPUT,
        currentPid: 999,
      })
    ).toBe(404);
  });

  it("collects running managed processes without pid files", () => {
    const tempRepoRoot = mkdtempSync(join(tmpdir(), "dev-process-guard-"));
    const configs = {
      web: {
        key: "web" as const,
        command: ["/usr/local/bin/bun", "./scripts/dev/esDev.js"],
      },
      api: {
        key: "api" as const,
        command: ["/usr/local/bin/bun", "./packages/server/entry.ts", "--nolo-slot=preview-a"],
      },
    };

    expect(
      collectRunningManagedProcesses(configs, {
        repoRoot: tempRepoRoot,
        psOutput: MOCK_PS_OUTPUT,
        currentPid: 999,
        pidRunningChecker: () => true,
      })
    ).toEqual([
      { key: "web", pid: 202 },
      { key: "api", pid: 505 },
    ]);
  });

  it("does not accept a live pid file that belongs to another launch config", () => {
    const tempRepoRoot = mkdtempSync(join(tmpdir(), "dev-process-guard-"));
    mkdirSync(join(tempRepoRoot, "logs", "dev-control"), { recursive: true });
    writeFileSync(join(tempRepoRoot, "logs", "dev-control", "api.pid"), "606\n", "utf8");

    // Live foreign pid must not be reclaimed via global needle rediscovery —
    // that would overwrite another launch config's metadata.
    expect(
      resolveManagedPid(
        {
          key: "api",
          command: ["/usr/local/bin/bun", "./packages/server/entry.ts", "--nolo-slot=preview-a"],
        },
        {
          repoRoot: tempRepoRoot,
          psOutput: MOCK_PS_OUTPUT,
          currentPid: 999,
          pidRunningChecker: () => true,
        }
      )
    ).toBeNull();
  });

  it("accepts a live pid file when its command fingerprint matches the slot", () => {
    const tempRepoRoot = mkdtempSync(join(tmpdir(), "dev-process-guard-"));
    mkdirSync(join(tempRepoRoot, "logs", "dev-control"), { recursive: true });
    writeFileSync(join(tempRepoRoot, "logs", "dev-control", "api.pid"), "606\n", "utf8");
    writeFileSync(
      join(tempRepoRoot, "logs", "dev-control", "api.command"),
      "./packages/server/entry.ts --nolo-slot=preview-b\n",
      "utf8"
    );

    expect(
      resolveManagedPid(
        {
          key: "api",
          command: ["/usr/local/bin/bun", "./packages/server/entry.ts", "--nolo-slot=preview-b"],
        },
        {
          repoRoot: tempRepoRoot,
          psOutput: "",
          currentPid: 999,
          pidRunningChecker: () => true,
        }
      )
    ).toBe(606);
  });

  it("drops stale ps matches when the pid is no longer running", () => {
    expect(
      resolveManagedPid(
        {
          key: "web",
          command: ["/usr/local/bin/bun", "./scripts/dev/esDev.js"],
        },
        {
          repoRoot: mkdtempSync(join(tmpdir(), "dev-process-guard-")),
          psOutput: MOCK_PS_OUTPUT,
          currentPid: 999,
          pidRunningChecker: () => false,
        }
      )
    ).toBeNull();
  });
});
