// packages/cli/client/firstModelGeneratedPtcE2E.test.ts
//
// FIRST MODEL-GENERATED PTC E2E — integration + deterministic safety proof.
//
// 1. Spawns the subprocess probe: a MODEL-GENERATED program travels the real
//    PTC path (extract → validate → QuickJS → CapabilitySdk → real execShell +
//    real agents.run).
// 2. Deterministic safety requirements (QuickJS sandbox / fail-closed):
//    a. A model program cannot reach Bun / Node / process / fs / child_process.
//    b. Unknown tool / malformed program fail closed.
//    c. Timeout / abort remain effective.
//
// NOTE: this test reuses the existing PTC execution path; it does NOT introduce
// a new runtime, sandbox, tool-executor, or authority abstraction.

import { describe, expect, it } from "bun:test";
import {
  runLocalAgentTurn,
  parsePtcProgramOutput,
  validatePtcProgramCode,
  type AgentRuntimeHostAdapter,
  type AgentRuntimeToolCallInput,
} from "agent-runtime";

/** Minimal promise latch (no generic event framework). */
function defer<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

/** Resolve when an AbortSignal fires (deterministic, no polling timer). */
function onAbort(signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (!signal || signal.aborted) { resolve(); return; }
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function buildTestAdapter(options: {
  executeTool?: AgentRuntimeHostAdapter["executeTool"];
  host?: "cli" | "desktop";
} = {}) {
  const executedCalls: Array<{ call: AgentRuntimeToolCallInput; opts?: any }> = [];
  const adapter: AgentRuntimeHostAdapter = {
    host: (options.host ?? "cli") as any,
    capabilities: ["local-tools", "local-provider"],
    loadAgentConfig: async (ref: string) => ({
      key: ref,
      name: "Test Agent",
      model: "test-model",
      provider: "test-provider",
      toolNames: ["execShell", "startAgentRun", "controlAgentRun"],
    }),
    loadDialogHistory: async () => [],
    saveTurn: async () => ({ dialogId: "dialog-first-model-ptc-e2e" }),
    resolveProvider: async () => ({
      model: "test-model",
      complete: async () => ({
        content: "Turn completed successfully",
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    }),
    executeTool: options.executeTool ?? (async (call, opts) => {
      executedCalls.push({ call, opts });
      if (call.name === "startAgentRun") {
        return { content: JSON.stringify({ runId: "child-run-ready", status: "running" }) };
      }
      if (call.name === "controlAgentRun") {
        return {
          content: JSON.stringify({ runId: "child-run-ready", status: "done", exitCode: 0, content: "READY" }),
        };
      }
      return { content: JSON.stringify({ error: `unknown tool: ${call.name}` }), isError: true };
    }),
  };
  return { adapter, executedCalls };
}

const MODEL_RESPONSE = [
  "```js",
  "async function main(tools) {",
  "  const [git, agent] = await Promise.all([",
  "    tools.execShell({ command: \"git status --short\" }),",
  "    tools.agents.run({ agentId: \"agent-pub-child\", task: \"Respond with exactly READY\" })",
  "  ]);",
  "  return { git, agent };",
  "}",
  "```",
].join("\n");

describe("First Model-Generated PTC E2E", () => {
  it("spawns the subprocess probe (model-generated program runs the real PTC path)", () => {
    const proc = Bun.spawnSync(["bun", "packages/cli/client/firstModelGeneratedPtcE2E.subprocessProbe.ts"], {
      cwd: process.cwd(),
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(proc.exitCode).toBe(0);
  });

  it("model output extracts to an async main(tools) and validates (full gate)", () => {
    const parsed = parsePtcProgramOutput(MODEL_RESPONSE);
    expect(parsed.ok).toBe(true);
    const validation = validatePtcProgramCode(parsed.program!.code);
    expect(validation.valid).toBe(true);
  });

  describe("safety = QuickJS sandbox / fail-closed", () => {
    it("(a1) static filter rejects programs that mention process/Bun/Deno/fs/child_process/eval", () => {
      const escapes = [
        "async function main(tools){ return typeof process !== 'undefined'; }",
        "async function main(tools){ return typeof Bun !== 'undefined'; }",
        "async function main(tools){ return typeof Deno !== 'undefined'; }",
        "async function main(tools){ return eval('1'); }",
        "async function main(tools){ return require('fs'); }",
        "async function main(tools){ return new Function(''); }",
        "async function main(tools){ return globalThis; }",
      ];
      for (const code of escapes) {
        expect(validatePtcProgramCode(code).valid).toBe(false);
      }
    });

    it("(a2) sandbox does not leak Node/Bun globals even for identifiers the static filter does not catch", async () => {
      const { adapter } = buildTestAdapter();
      let ptcResult: any = null;
      await runLocalAgentTurn({
        adapter,
        agentRef: "agent-pub-test",
        input: "probe sandbox globals",
        abortSignal: new AbortController().signal,
        runtimeContext: { workspaceRoot: process.cwd(), restrictToWorkspace: true, enableDestructiveShellGuard: true },
        __testPtcProgram: {
          code: [
            "async function main(tools){",
            "  return {",
            "    require: typeof require,",
            "    module: typeof module,",
            "    exports: typeof exports,",
            "    Buffer: typeof Buffer,",
            "    global: typeof global,",
            "  };",
            "}",
          ].join("\n"),
          onResult: (res) => { ptcResult = res; },
        },
      });
      expect(ptcResult).not.toBeNull();
      expect(ptcResult.ok).toBe(true);
      const r = ptcResult.result ?? {};
      expect(r.require).toBe("undefined");
      expect(r.module).toBe("undefined");
      expect(r.exports).toBe("undefined");
      expect(r.Buffer).toBe("undefined");
      expect(r.global).toBe("undefined");
    });

    it("(b) malformed program (no main) fails closed", async () => {
      const { adapter } = buildTestAdapter();
      let ptcResult: any = null;
      await runLocalAgentTurn({
        adapter,
        agentRef: "agent-pub-test",
        input: "malformed",
        abortSignal: new AbortController().signal,
        runtimeContext: { workspaceRoot: process.cwd(), restrictToWorkspace: true, enableDestructiveShellGuard: true },
        __testPtcProgram: {
          code: "const x = 1;",
          onResult: (res) => { ptcResult = res; },
        },
      });
      expect(ptcResult).not.toBeNull();
      expect(ptcResult.ok).toBe(false);
    });

    it("(b2) unknown tool fails closed at runtime", async () => {
      const { adapter } = buildTestAdapter();
      let ptcResult: any = null;
      await runLocalAgentTurn({
        adapter,
        agentRef: "agent-pub-test",
        input: "unknown tool",
        abortSignal: new AbortController().signal,
        runtimeContext: { workspaceRoot: process.cwd(), restrictToWorkspace: true, enableDestructiveShellGuard: true },
        __testPtcProgram: {
          code: [
            "async function main(tools) {",
            "  try { return await tools.unknownTool(); }",
            "  catch (e) { return { failed: true, error: String(e) }; }",
            "}",
          ].join("\n"),
          onResult: (res) => { ptcResult = res; },
        },
      });
      expect(ptcResult).not.toBeNull();
      expect(ptcResult.ok).toBe(true);
      expect((ptcResult.result ?? {}).failed).toBe(true);
    });

    it("(c) timeout is effective (infinite loop is interrupted)", async () => {
      const { adapter } = buildTestAdapter();
      let ptcResult: any = null;
      await runLocalAgentTurn({
        adapter,
        agentRef: "agent-pub-test",
        input: "infinite loop",
        abortSignal: new AbortController().signal,
        runtimeContext: { workspaceRoot: process.cwd(), restrictToWorkspace: true, enableDestructiveShellGuard: true },
        __testPtcProgram: {
          code: "async function main(tools){ while(true){} }",
          timeoutMs: 200,
          onResult: (res) => { ptcResult = res; },
        },
      });
      expect(ptcResult).not.toBeNull();
      expect(ptcResult.ok).toBe(false);
      expect(ptcResult.interrupted).toBe(true);
    });

    it("(c2) abort propagates to the PTC program through a real host RPC (deterministic, no timer race)", async () => {
      // Deterministic sync (no fixed-delay race, no polling timer): a latch
      // resolves when the real host seam has observed startAgentRun; ONLY then do
      // we abort. abortSignal then propagates through the real host RPC
      // (controlAgentRun action:stop) and the PTC execution settles.
      const started = defer<void>();
      const stopCalls: Array<{ call: AgentRuntimeToolCallInput; opts?: any }> = [];
      const turnAbortController = new AbortController();
      const { adapter } = buildTestAdapter({
        executeTool: async (call, opts) => {
          if (call.name === "startAgentRun") {
            started.resolve();
            return { content: JSON.stringify({ runId: "child-run-cancel", status: "running" }) };
          }
          if (call.name === "controlAgentRun") {
            const args = JSON.parse(call.arguments);
            if (args.action === "stop") {
              stopCalls.push({ call, opts });
              return { content: JSON.stringify({ runId: "child-run-cancel", status: "cancelled", wasActive: true }) };
            }
            if (args.action === "wait") {
              // Deterministic: await the abort signal directly (no poll/timer),
              // then report cancelled so the run settles.
              await Promise.race([onAbort(opts?.abortSignal), onAbort(turnAbortController.signal)]);
              return { content: JSON.stringify({ runId: "child-run-cancel", status: "cancelled" }) };
            }
          }
          return { content: "{}" };
        },
      });

      let cancelOutcome: any = null;
      let turnAbortedErrorCaught = false;
      try {
        const turnPromise = runLocalAgentTurn({
          adapter,
          agentRef: "agent-pub-test",
          input: "abort via real host RPC",
          abortSignal: turnAbortController.signal,
          runtimeContext: { workspaceRoot: process.cwd(), restrictToWorkspace: true, enableDestructiveShellGuard: true },
          __testPtcProgram: {
            code: [
              "async function main(tools) {",
              "  try {",
              "    const res = await tools.agents.run({ agentId: 'agent-pub-slow', task: 'Slow task that will be cancelled' });",
              "    return { success: true, res };",
              "  } catch (err) {",
              "    return { success: false, error: err.message };",
              "  }",
              "}",
            ].join("\n"),
            onResult: (res) => { cancelOutcome = res; },
          },
        });

        // Deterministic: wait until the real host seam observed startAgentRun,
        // THEN abort. No fixed-time race.
        await started.promise;
        turnAbortController.abort(new Error("Turn aborted by user"));
        await turnPromise;
      } catch (err: any) {
        if (err?.code === "LOCAL_TURN_ABORTED" || String(err?.message).includes("aborted")) {
          turnAbortedErrorCaught = true;
        }
      }

      expect(turnAbortedErrorCaught).toBe(true);
      expect(stopCalls.length).toBeGreaterThanOrEqual(1);
      expect(cancelOutcome).not.toBeNull();
    });
  });
});
