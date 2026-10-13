// packages/agent-runtime/loopTiming.concurrentChild.ts
// loopTiming 并发隔离集成测试的子进程入口（由 loopTiming.concurrent.test.ts
// 以 NOLO_LOOP_TIMING=1 + NOLO_LOOP_TIMING_FILE 环境启动，不参与测试发现）。
// 两个 mock provider 的 runLocalAgentTurn 并发跑完一整轮（含一个工具回合）；
// 相位行由 per-turn createLoopTiming 实例收集，flush 时整块落盘。
import { runLocalAgentTurn } from "./localLoop";
import type { AgentRuntimeHostAdapter } from "./hostAdapter";
import type { AgentRuntimeResult } from "./types";

function makeAdapter(tag: string): AgentRuntimeHostAdapter {
  let calls = 0;
  return {
    host: "cli",
    capabilities: ["local-provider", "local-persistence", "local-tools"],
    loadAgentConfig: async (agentRef) => ({
      key: agentRef,
      prompt: "p",
      model: "m",
      toolNames: ["execShell"],
    }),
    loadDialogHistory: async () => [],
    saveTurn: async () => ({ dialogId: `d-${tag}` }),
    resolveProvider: async () => ({
      model: "m",
      complete: async () => {
        calls += 1;
        // setImmediate 制造真实交错窗口：共享模块态的计时实现会在这里互相污染。
        await new Promise<void>((r) => setImmediate(r));
        if (calls === 1) {
          return {
            content: "",
            model: "m",
            tool_calls: [{
              id: `tc-${tag}-1`,
              type: "function",
              function: { name: "execShell", arguments: '{"command":"echo hi"}' },
            }],
          } as unknown as AgentRuntimeResult;
        }
        return { content: `done-${tag}`, model: "m" } as unknown as AgentRuntimeResult;
      },
    }),
    executeTool: async () => {
      await new Promise<void>((r) => setImmediate(r));
      return { content: "tool output" };
    },
  };
}

await Promise.all([
  runLocalAgentTurn({ adapter: makeAdapter("a"), agentRef: "a", input: "go" }),
  runLocalAgentTurn({ adapter: makeAdapter("b"), agentRef: "b", input: "go" }),
]);
console.log("child done");
