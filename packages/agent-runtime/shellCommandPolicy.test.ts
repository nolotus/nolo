import { describe, expect, test } from "bun:test";

import { buildWorkspaceToolDefinition } from "./localWorkspaceToolDefs";
import {
  IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS,
  evaluateShellCommandPolicy,
  isDestructiveShellCommand,
  isImmediateDetachShellCommand,
  isLongRunningShellCommand,
} from "./shellCommandPolicy";

describe("shellCommandPolicy", () => {
  test("detects destructive shell commands", () => {
    expect(
      isDestructiveShellCommand({ command: "git reset --hard HEAD~1" }),
    ).toBe(true);
    expect(isDestructiveShellCommand({ command: "printf hello" })).toBe(
      false,
    );
  });

  test("ignores destructive keywords that only appear inside quoted strings", () => {
    expect(
      isDestructiveShellCommand({
        command:
          'git commit -m "fix: stop running rm -rf and git reset --hard in cleanup"',
      }),
    ).toBe(false);
    expect(
      isDestructiveShellCommand({
        command: "echo 'never use git clean -fdx here' >> notes.md",
      }),
    ).toBe(false);
  });

  test("still detects destructive commands with quoted arguments", () => {
    expect(
      isDestructiveShellCommand({ command: 'rm -rf "./build output"' }),
    ).toBe(true);
  });

  test("does not strip quotes when the string may be executed as code", () => {
    expect(
      isDestructiveShellCommand({ command: 'bash -c "rm -rf ./tmp"' }),
    ).toBe(true);
    expect(
      isDestructiveShellCommand({ command: 'echo "rm -rf /" | sh' }),
    ).toBe(true);
    expect(
      isDestructiveShellCommand({
        command: `python3 -c 'import os; os.system("rm -rf ./tmp")'`,
      }),
    ).toBe(true);
  });

  test("blocks destructive commands without an explicit delete request", () => {
    expect(
      evaluateShellCommandPolicy({
        command: "Remove-Item -Recurse -Force .\\temp",
        userInput:
          "Continue fixing the issue, but do not delete my files.",
      }),
    ).toMatchObject({
      verdict: "forbidden",
      permissionDecision: "ask",
      code: "destructive_action_requires_confirmation",
      permissionRequest: {
        tool: "execShell",
        action: "destructive_shell_command",
        suggestedRule: { scope: "once" },
      },
      reason:
        "当前运行默认禁止自动执行可能删除用户内容的 shell 命令。只有当用户在当前请求里明确要求删除/清理时，才能继续；否则请停止并先说明限制。",
      policy: {
        capability: "destructive_action",
        target: "shell_command",
        detail: "execShell destructive command",
      },
    });
  });

  test("allows destructive commands when the user explicitly asks to delete", () => {
    expect(
      evaluateShellCommandPolicy({
        command: "Remove-Item -Recurse -Force .\\temp",
        userInput: "Please delete the temp directory.",
      }),
    ).toEqual({ verdict: "allowed", permissionDecision: "allow" });
  });

  test("treats destructive stdin payloads as destructive commands too", () => {
    expect(
      evaluateShellCommandPolicy({
        command: "python3 cleanup.py",
        input: "rm -rf ./tmp\n",
        userInput: "Keep debugging, but don't delete files.",
      }),
    ).toMatchObject({
      verdict: "forbidden",
      permissionDecision: "ask",
      code: "destructive_action_requires_confirmation",
      permissionRequest: {
        tool: "execShell",
        action: "destructive_shell_command",
      },
      reason:
        "当前运行默认禁止自动执行可能删除用户内容的 shell 命令。只有当用户在当前请求里明确要求删除/清理时，才能继续；否则请停止并先说明限制。",
      policy: {
        capability: "destructive_action",
        target: "shell_command",
        detail: "execShell destructive command",
      },
    });
  });

  test("allows non-destructive commands", () => {
    expect(
      evaluateShellCommandPolicy({
        command: "pwd",
      }),
    ).toEqual({ verdict: "allowed", permissionDecision: "allow" });
  });

  describe("isLongRunningShellCommand", () => {
    test("bun run dev → true", () => {
      expect(isLongRunningShellCommand({ command: "bun run dev" })).toBe(true);
    });

    test("npm run watch → true", () => {
      expect(isLongRunningShellCommand({ command: "npm run watch" })).toBe(
        true,
      );
    });

    test("vite serve → true", () => {
      expect(isLongRunningShellCommand({ command: "vite serve" })).toBe(true);
    });

    test("nodemon index.js → true", () => {
      expect(
        isLongRunningShellCommand({ command: "nodemon index.js" }),
      ).toBe(true);
    });

    test("bun test → false (not long-running)", () => {
      expect(isLongRunningShellCommand({ command: "bun test" })).toBe(false);
    });

    test("git status → false", () => {
      expect(isLongRunningShellCommand({ command: "git status" })).toBe(false);
    });

    test('echo "dev" → false (quoted, stripped)', () => {
      expect(isLongRunningShellCommand({ command: 'echo "dev"' })).toBe(false);
    });

    test("grep dev package.json → false (grep not a long-running pattern)", () => {
      expect(
        isLongRunningShellCommand({ command: "grep dev package.json" }),
      ).toBe(false);
    });
  });

  describe("isImmediateDetachShellCommand", () => {
    test("sleep 300 → true (long sleep)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep 300" })).toBe(
        true,
      );
    });

    test("sleep 6 → true (over the 5s threshold)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep 6" })).toBe(true);
    });

    test("sleep 5 → false (at threshold, stays inline)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep 5" })).toBe(false);
    });

    test("sleep 0.5 → false (short pacing sleep)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep 0.5" })).toBe(
        false,
      );
    });

    test("sleep 5m → true (unit suffix)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep 5m" })).toBe(true);
    });

    test("sleep infinity → true", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep infinity" })).toBe(
        true,
      );
    });

    test("sleep $DELAY → true (unparseable duration detaches conservatively)", () => {
      expect(isImmediateDetachShellCommand({ command: "sleep $DELAY" })).toBe(
        true,
      );
    });

    test("nohup sleep 60 → true (prefix tolerated)", () => {
      expect(isImmediateDetachShellCommand({ command: "nohup sleep 60" })).toBe(
        true,
      );
    });

    test("tail -f app.log → true", () => {
      expect(isImmediateDetachShellCommand({ command: "tail -f app.log" })).toBe(
        true,
      );
    });

    test("tail -n 50 app.log → false (bounded tail)", () => {
      expect(
        isImmediateDetachShellCommand({ command: "tail -n 50 app.log" }),
      ).toBe(false);
    });

    test("watch bun test → true", () => {
      expect(isImmediateDetachShellCommand({ command: "watch bun test" })).toBe(
        true,
      );
    });

    test("while true; do echo hi; done → true", () => {
      expect(
        isImmediateDetachShellCommand({ command: "while true; do echo hi; done" }),
      ).toBe(true);
    });

    test("bun run dev → true (dev-server pattern)", () => {
      expect(isImmediateDetachShellCommand({ command: "bun run dev" })).toBe(
        true,
      );
    });

    test("git status → false", () => {
      expect(isImmediateDetachShellCommand({ command: "git status" })).toBe(
        false,
      );
    });

    test('echo "sleep 300" → false (quoted mention, stripped)', () => {
      expect(
        isImmediateDetachShellCommand({ command: 'echo "sleep 300"' }),
      ).toBe(false);
    });

    test("grep sleep notes.txt → false (sleep not in command position)", () => {
      expect(
        isImmediateDetachShellCommand({ command: "grep sleep notes.txt" }),
      ).toBe(false);
    });

    test("GNU timeout wrapper → false (bounded by the wrapper itself)", () => {
      expect(
        isImmediateDetachShellCommand({ command: "timeout 300 bun run build" }),
      ).toBe(false);
    });

    // R1 护栏：工具描述里的 "sleep over Ns" 是模型可见文案，必须与阈值常量
    // 同步——改常量不改描述，模型会拿到错误的行为预期。
    test("execShell tool description quotes the sleep threshold constant", () => {
      const def = buildWorkspaceToolDefinition("execShell");
      const description = String(
        (def as any)?.function?.description ?? "",
      );
      expect(description).toContain(
        `sleep over ${IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS}s`,
      );
    });
  });

  describe("evaluateShellCommandPolicy longRunningHint", () => {
    test("bun run dev → longRunningHint: true, verdict: allowed", () => {
      const result = evaluateShellCommandPolicy({ command: "bun run dev" });
      expect(result).toMatchObject({
        verdict: "allowed",
        longRunningHint: true,
      });
    });

    test("git status → no longRunningHint", () => {
      const result = evaluateShellCommandPolicy({ command: "git status" });
      expect(result).toEqual({ verdict: "allowed", permissionDecision: "allow" });
      expect(result).not.toHaveProperty("longRunningHint");
    });
  });
});
