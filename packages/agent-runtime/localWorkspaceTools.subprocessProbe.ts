import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createLocalWorkspaceToolExecutors } from "./localWorkspaceTools.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertContains(value: string, expected: string, label: string) {
  assert(value.includes(expected), `${label} should contain ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
}

function createWorkspace() {
  return mkdtempSync(join(tmpdir(), "nolo-workspace-tools-probe-"));
}

async function run() {
  const roots: string[] = [];
  try {
    {
      const root = createWorkspace();
      roots.push(root);
      writeFileSync(join(root, "README.md"), "hello search\n");
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const glob = await executors.globFiles({
        id: "call-glob",
        name: "globFiles",
        arguments: JSON.stringify({ pattern: "*.md" }),
      });
      assertContains(glob.content, "README.md", "globFiles content");

      const command = process.platform === "win32"
        ? "Get-Location; if (!(Test-Path README.md)) { exit 1 }"
        : "pwd && test -f README.md";
      const shell = await executors.execShell({
        id: "call-shell",
        name: "execShell",
        arguments: JSON.stringify({ command }),
      });
      assertContains(shell.content, "exitCode: 0", "execShell content");
      assert(shell.metadata?.exitCode === 0, "execShell exitCode should be 0");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      writeFileSync(join(root, ".gitignore"), ".tmp/\n");
      mkdirSync(join(root, ".git"), { recursive: true });
      mkdirSync(join(root, ".tmp"), { recursive: true });
      writeFileSync(join(root, ".tmp", "ignored.txt"), "hidden token SEARCH_IGNORED_TOKEN\n");
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const defaultGlob = await executors.globFiles({
        id: "call-glob-default",
        name: "globFiles",
        arguments: JSON.stringify({ pattern: "**/*.txt" }),
      });
      assert(!defaultGlob.content.includes("ignored.txt"), "default glob should respect .gitignore");
      const ignoredGlob = await executors.globFiles({
        id: "call-glob-ignored",
        name: "globFiles",
        arguments: JSON.stringify({ pattern: "**/*.txt", includeIgnored: true }),
      });
      assertContains(ignoredGlob.content, "ignored.txt", "includeIgnored glob content");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({
        workspaceRoot: root,
        commandTimeoutMs: 50,
      });
      const timeout = await executors.execShell({
        id: "call-shell-timeout",
        name: "execShell",
        arguments: JSON.stringify({
          command: process.platform === "win32" ? "Start-Sleep -Seconds 5" : "sleep 5",
        }),
      });
      assertContains(timeout.content, "command timed out after 50ms", "timeout content");
      assert(timeout.metadata?.exitCode === 124, "timeout exitCode should be 124");
      assert(timeout.metadata?.timedOut === true, "timeout metadata should mark timedOut");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const blocked = await executors.execShell({
        id: "call-shell-interactive-auth",
        name: "execShell",
        arguments: JSON.stringify({ command: "gh auth refresh -h github.com -s delete_repo" }),
      });
      assertContains(blocked.content, "action_gate: handoff", "interactive auth content");
      assert(blocked.metadata?.exitCode === 130, "interactive auth exitCode should be 130");
      const gate = blocked.metadata?.actionGate as any;
      assert(gate?.kind === "handoff", "interactive auth should require handoff gate");
      assert(gate?.payload?.displayCommand === "gh auth refresh -h github.com -s delete_repo", "interactive auth should carry display command");
      assert(JSON.stringify(gate?.payload?.command) === JSON.stringify(["gh", "auth", "refresh", "-h", "github.com", "-s", "delete_repo"]), "interactive auth should carry command argv");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const blocked = await executors.execShell({
        id: "call-shell-interactive-auth-sanitized",
        name: "execShell",
        arguments: JSON.stringify({ command: "gh auth refresh -h github.com -s delete_repo 2>&1; echo \"---exit: $?---\"" }),
      });
      assert((blocked.metadata?.actionGate as any)?.payload?.displayCommand === "gh auth refresh -h github.com -s delete_repo", "interactive auth should strip shell suffixes");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const help = await executors.execShell({
        id: "call-shell-auth-help",
        name: "execShell",
        arguments: JSON.stringify({ command: "gh auth refresh --help" }),
      });
      assert(!help.metadata?.actionGate, "auth help should not require manual terminal action");
      assertContains(help.content, "USAGE", "auth help content");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const previousTimeout = process.env.NOLO_EXEC_SHELL_TIMEOUT_MS;
      process.env.NOLO_EXEC_SHELL_TIMEOUT_MS = "50";
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const timeout = await executors.execShell({
        id: "call-shell-env-timeout",
        name: "execShell",
        arguments: JSON.stringify({
          command: process.platform === "win32" ? "Start-Sleep -Seconds 5" : "sleep 5",
        }),
      });
      if (previousTimeout === undefined) delete process.env.NOLO_EXEC_SHELL_TIMEOUT_MS;
      else process.env.NOLO_EXEC_SHELL_TIMEOUT_MS = previousTimeout;
      assertContains(timeout.content, "command timed out after", "env timeout content");
      assert(timeout.metadata?.exitCode === 124, "env timeout exitCode should be 124");
      assert(timeout.metadata?.timedOut === true, "env timeout metadata should mark timedOut");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({
        workspaceRoot: root,
        // Leave enough room for the truncation marker and spill metadata; a
        // limit smaller than that marker intentionally returns a plain prefix.
        commandOutputLimit: 500,
      });
      const longString = "abcdefghijklmnopqrstuvwxyz0123456789".repeat(100); // Length 3600
      const limited = await executors.execShell({
        id: "call-shell-output-limit",
        name: "execShell",
        arguments: JSON.stringify({
          command: process.platform === "win32"
            ? `'${longString}'`
            : `printf %s ${longString}`,
        }),
      });
      assertContains(limited.content, "[... truncated ", "limited content");
      assert(limited.metadata?.exitCode === 0, "limited command exitCode should be 0");
    }

    if (process.platform !== "win32") {
      const root = createWorkspace();
      roots.push(root);
      const executors = createLocalWorkspaceToolExecutors({
        workspaceRoot: root,
        commandPrefix: ["env", "NOLO_TEST_SANDBOX=light"],
      });
      const sandboxed = await executors.execShell({
        id: "call-shell-sandbox",
        name: "execShell",
        arguments: JSON.stringify({ command: "printf %s \"$NOLO_TEST_SANDBOX\"" }),
      });
      assertContains(sandboxed.content, "stdout:\nlight", "sandboxed content");
      assert(sandboxed.metadata?.exitCode === 0, "sandboxed command exitCode should be 0");
    }

    {
      const root = createWorkspace();
      roots.push(root);
      writeFileSync(join(root, "package.json"), JSON.stringify({
        scripts: {
          "probe:visual-review": "bun ./probe.ts",
        },
      }));
      writeFileSync(join(root, "probe.ts"), [
        "import { writeFileSync, mkdirSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "const get = (name: string) => args[args.indexOf(name) + 1];",
        "const screenshotPath = get('--screenshot');",
        "const metricsPath = get('--metrics');",
        "mkdirSync(dirname(screenshotPath), { recursive: true });",
        "mkdirSync(dirname(metricsPath), { recursive: true });",
        "writeFileSync(screenshotPath, 'png');",
        "writeFileSync(metricsPath, JSON.stringify({ targetText: '开聊' }));",
        "console.log(JSON.stringify({",
        "  pageUrl: get('--base') + get('--path'),",
        "  screenshotPath,",
        "  metricsPath,",
        "  waitSelector: get('--wait-selector'),",
        "  focusSelector: get('--focus-selector'),",
        "  expectText: get('--expect-text'),",
        "  targetText: get('--expect-text'),",
        "  targetRect: { width: 251, height: 36 },",
        "  targetComputed: { display: 'flex' }",
        "}));",
      ].join("\n"));
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const capture = await executors.captureVisualState({
        id: "call-capture",
        name: "captureVisualState",
        arguments: JSON.stringify({
          baseUrl: "http://127.0.0.1:38323",
          path: "/",
          waitSelector: ".agent",
          focusSelector: ".agent__primary",
          expectText: "开聊",
          screenshotPath: "test-results/frontend-agent/after.png",
          metricsPath: "test-results/frontend-agent/metrics.json",
        }),
      });
      assertContains(capture.content, "screenshotPath: test-results/frontend-agent/after.png", "capture content");
      assert(capture.metadata?.pageUrl === "http://127.0.0.1:38323/", "capture should parse pageUrl");
      assert(capture.metadata?.targetText === "开聊", "capture should parse targetText");
    }

  } finally {
    for (const root of roots) {
      rmSync(root, { recursive: true, force: true });
    }
  }
}

await run();
