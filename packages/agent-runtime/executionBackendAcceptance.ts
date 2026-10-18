import { createExecutionChannel, EXECUTION_SHELL_TOOL } from "./executionChannel";
import type {
  ExecutionBackend,
  ExecutionTicket,
} from "./executionBackend";

export type AcceptanceIsolation = "none" | "os-sandbox" | "container";

export type AcceptanceTaskResult = {
  bootMs: number;
  workMs: number;
  totalMs: number;
  testRed: boolean;
  testGreen: boolean;
  diffBytes: number;
  diff: string;
  isolation: AcceptanceIsolation;
};

export type RunAcceptanceTaskArgs = {
  backend: ExecutionBackend;
  workspaceRoot: string;
  readableRoots?: string[];
  commandRunner?: (cmd: string) => Promise<{ exitCode: number; stdout: string }>;
};

export function formatUnifiedDiff(filename: string, oldStr: string, newStr: string): string {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const diffLines: string[] = [`--- a/${filename}`, `+++ b/${filename}`];
  diffLines.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) diffLines.push(` ${o}`);
    } else {
      if (o !== undefined) diffLines.push(`-${o}`);
      if (n !== undefined) diffLines.push(`+${n}`);
    }
  }
  return diffLines.join("\n") + "\n";
}

export async function runAcceptanceTask(
  args: RunAcceptanceTaskArgs,
): Promise<AcceptanceTaskResult> {
  const { backend, workspaceRoot, readableRoots } = args;
  const desc = backend.describe();

  let isolation: AcceptanceIsolation = "none";
  if (desc.capabilities.isolationModes.includes("container")) {
    isolation = "container";
  } else if (desc.capabilities.isolationModes.includes("os-sandbox")) {
    isolation = "os-sandbox";
  }

  const executionClass = desc.capabilities.executionClasses.includes("oneshot")
    ? "oneshot"
    : desc.capabilities.executionClasses[0] ?? "oneshot";

  const ticket: ExecutionTicket = {
    version: 1,
    ticketId: `acceptance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grantId: "acceptance-grant",
    issuedAt: Date.now(),
    agentKey: "acceptance-agent",
    executionClass,
    target: { kind: "server" },
    toolNames: [EXECUTION_SHELL_TOOL],
    filesystem: {
      readScope: "configured-roots",
      readableRoots: [workspaceRoot, ...(readableRoots ?? [])],
      writeScope: "configured-roots",
      writableRoots: [workspaceRoot],
    },
    shellAllowed: true,
    requestedIsolation: isolation,
  };

  const tStart = Date.now();
  const tBootStart = Date.now();
  const lease = await backend.prepare(ticket);
  const bootMs = Math.max(0, Date.now() - tBootStart);

  let runner = args.commandRunner;
  if (!runner) {
    const channel = createExecutionChannel({ backend, lease });
    runner = async (cmd: string) => {
      const raw = await channel(EXECUTION_SHELL_TOOL, { command: cmd });
      try {
        const envelope = JSON.parse(raw);
        if (envelope && typeof envelope === "object" && envelope.ok === false) {
          let exitCode = 1;
          if (typeof envelope.error === "string") {
            const match = envelope.error.match(/^exit_code:(\d+)$/);
            if (match) exitCode = parseInt(match[1], 10);
          }
          const stdout = envelope.stderr ? `${envelope.stderr}` : envelope.error || "command failed";
          return { exitCode, stdout };
        }
      } catch {
        // raw stdout
      }
      return { exitCode: 0, stdout: raw };
    };
  }

  const buggyCode = `function sum(a, b) {\n  return a - b;\n}\nmodule.exports = { sum };\n`;
  const fixedCode = `function sum(a, b) {\n  return a + b;\n}\nmodule.exports = { sum };\n`;
  const testCode = [
    `const { sum } = require("./sum.js");`,
    `const result = sum(2, 3);`,
    `if (result !== 5) {`,
    `  console.error("Assertion failed: sum(2, 3) expected 5, got " + result);`,
    `  process.exit(1);`,
    `}`,
    `console.log("PASS: sum(2, 3) === 5");`,
    ``,
  ].join("\n");

  const sumFile = `${workspaceRoot}/sum.js`;
  const testFile = `${workspaceRoot}/sum.test.js`;
  const testCmd = `node ${testFile} 2>&1 || bun ${testFile} 2>&1`;

  const tWorkStart = Date.now();
  try {
    // 1. Write buggy module and test
    await runner(`cat << 'EOF' > ${sumFile}\n${buggyCode}EOF`);
    await runner(`cat << 'EOF' > ${testFile}\n${testCode}EOF`);

    // 2. Run test on buggy module -> expect failure (testRed)
    const redRes = await runner(testCmd);
    const testRed = redRes.exitCode !== 0;

    // 3. Fix bug in module
    await runner(`cat << 'EOF' > ${sumFile}\n${fixedCode}EOF`);

    // 4. Run test again -> expect success (testGreen)
    const greenRes = await runner(testCmd);
    const testGreen = greenRes.exitCode === 0;

    // 5. Assert "red -> green" state transition
    if (!testRed || !testGreen) {
      const tail = !testRed
        ? `Expected testRed=true, but test exited with ${redRes.exitCode}. Output: ${redRes.stdout.slice(-500)}`
        : `Expected testGreen=true, but test exited with ${greenRes.exitCode}. Output: ${greenRes.stdout.slice(-500)}`;
      throw new Error(
        `Acceptance state transition failed (testRed=${testRed}, testGreen=${testGreen}): ${tail}`,
      );
    }

    const workMs = Math.max(0, Date.now() - tWorkStart);
    const totalMs = Math.max(bootMs + workMs, Date.now() - tStart);

    const diff = formatUnifiedDiff("sum.js", buggyCode, fixedCode);
    const diffBytes = Buffer.byteLength(diff, "utf8");

    return {
      bootMs,
      workMs,
      totalMs,
      testRed,
      testGreen,
      diffBytes,
      diff,
      isolation,
    };
  } finally {
    await backend.release(lease, "completed");
  }
}
