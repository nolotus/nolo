import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  normalizeExecShellInput,
  invokeCapability,
} from "./index";
import { execShellCapability } from "./execShellCapability";
import {
  createLocalWorkspaceToolExecutors,
} from "../localWorkspaceTools";
import {
  executeLocalToolWithPolicy,
} from "../localToolPolicy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertContains(value: string, expected: string, label: string) {
  assert(value.includes(expected), `${label} should contain ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
}

async function run() {
  const root = mkdtempSync(join(tmpdir(), "nolo-exec-cap-probe-"));
  try {
    // 1. Command execution & normalization
    const result1 = await execShellCapability.invoke(
      { workspaceRoot: root },
      { command: "echo 'hello capability'" },
    );
    assertContains(result1.content, "hello capability", "execShellCapability.invoke result");
    assert(result1.metadata?.exitCode === 0, "exitCode should be 0");
    assert(result1.metadata?.command === "echo 'hello capability'", "command should match");

    // 2. cmd compatibility parity
    const resultCmd = await execShellCapability.invoke(
      { workspaceRoot: root },
      normalizeExecShellInput({ cmd: "echo 'parity test'" }),
    );
    const resultCommand = await execShellCapability.invoke(
      { workspaceRoot: root },
      normalizeExecShellInput({ command: "echo 'parity test'" }),
    );
    assert(resultCmd.content === resultCommand.content, "cmd and command content should match");
    assert(resultCmd.metadata?.exitCode === resultCommand.metadata?.exitCode, "exitCode should match");

    // 3. Native vs Standalone invoke parity
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const nativeResult = await executors.execShell({
      id: "call-native-1",
      name: "execShell",
      arguments: JSON.stringify({ command: "echo 'cross surface'" }),
    });
    const standaloneResult = await invokeCapability("execShell", { command: "echo 'cross surface'" }, {
      workspaceRoot: root,
    });

    assert(nativeResult.content === standaloneResult.content, "native vs standalone invoke content should match");
    assert(nativeResult.metadata?.exitCode === 0, "native exitCode should be 0");

    // 4. Policy safe command execution
    const safeResult = await executeLocalToolWithPolicy({
      env: {},
      agentToolNames: ["execShell"],
      call: {
        id: "call-safe-1",
        name: "execShell",
        arguments: JSON.stringify({ command: "echo harmless" }),
      },
      executors,
      enableDestructiveShellGuard: true,
      blockDestructiveWithoutConfirmation: true,
      confirmed: false,
    });
    assertContains(safeResult.content, "harmless", "safeResult content");

    // 5. Destructive policy parity across Native and Standalone
    const destructiveArgs = { command: "rm -rf ./nonexistent-test-dir" };

    // 5a. Native blocked without confirmation
    let nativeBlocked = false;
    try {
      await executeLocalToolWithPolicy({
        env: {},
        agentToolNames: ["execShell"],
        call: {
          id: "call-dest-native",
          name: "execShell",
          arguments: JSON.stringify(destructiveArgs),
        },
        executors,
        enableDestructiveShellGuard: true,
        blockDestructiveWithoutConfirmation: true,
        confirmed: false,
      });
    } catch (err: any) {
      nativeBlocked = err?.code === "destructive_action_requires_confirmation";
    }
    assert(nativeBlocked, "Native invocation should block destructive command without confirmation");

    // 5b. Standalone blocked without confirmation
    let standaloneBlocked = false;
    try {
      await invokeCapability(
        "execShell",
        destructiveArgs,
        {
          workspaceRoot: root,
          enableDestructiveShellGuard: true,
          blockDestructiveWithoutConfirmation: true,
          confirmed: false,
        },
      );
    } catch (err: any) {
      standaloneBlocked = err?.code === "destructive_action_requires_confirmation";
    }
    assert(standaloneBlocked, "Standalone invokeCapability should block destructive command without confirmation");

    // 5c. Audit hook is NOT triggered on policy rejection
    let auditTriggered = false;
    try {
      await invokeCapability(
        "execShell",
        destructiveArgs,
        {
          workspaceRoot: root,
          enableDestructiveShellGuard: true,
          blockDestructiveWithoutConfirmation: true,
          confirmed: false,
          onInvoke: () => {
            auditTriggered = true;
          },
        },
      );
    } catch {
      // Expected rejection
    }
    assert(!auditTriggered, "Audit onInvoke hook should NOT trigger when policy blocks execution");

    console.log("execShellCapability subprocess probe passed.");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

await run();
