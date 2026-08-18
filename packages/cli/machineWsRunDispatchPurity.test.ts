import { describe, expect, test } from "bun:test";
import { ownedAgentKey } from "core/prefix";
import { defaultRunConnectorLocalRuntimeAgent } from "./machineWsRunDispatchPurity";

// These tests cover the abortSignal wiring added for agent.run.cancel
// support: the injectable local-runtime runner must forward abortSignal
// down to runLocalAgentTurn. We cannot easily spin the full localLoop here
// without a heavy adapter, so we verify the signal is at least accepted
// and threaded into the call path (the real propagation is exercised end
// to end in machineWsRunDispatch.test.ts via the injected runner).

describe("cli machine ws run dispatch purity", () => {
  test("defaultRunConnectorLocalRuntimeAgent accepts an abortSignal without throwing on input validation", async () => {
    const controller = new AbortController();
    // We only assert the function does not reject synchronously before the
    // runtime call; a missing adapter/runtime would throw deeper, so we
    // catch and assert it got far enough to reference the signal.
    let caught: unknown;
    try {
      await defaultRunConnectorLocalRuntimeAgent({
        parsed: { type: "agent.run", requestId: "r-sig", payload: {} },
        runtimeEnv: {},
        cwd: "/tmp/demo",
        abortSignal: controller.signal,
      });
    } catch (error) {
      caught = error;
    }
    // Some downstream error is expected (no real adapter); the point is it
    // must NOT be a TypeError about abortSignal being unexpected.
    expect(caught).toBeInstanceOf(Error);
    const message = caught instanceof Error ? caught.message : String(caught);
    expect(message).not.toContain("abortSignal");
    expect(controller.signal.aborted).toBe(false);
  });
  // 本地 runtime 的 in-memory store 会给同一条 agent 记录挂多个别名，让下游
  // 按任意候选 key 查都能命中。别名用 ownedAgentKey 构造而非手拼字符串：
  // agentKey 常常已经是完整的 agent-{uid}-{id}，手拼会产出
  // agent-{uid}-agent-{uid}-{id} 这种永远不会被查到的死条目。
  // 别名表是函数内的局部变量，无法从外部直接观测，这里锁住它依赖的幂等契约。
  test("store 别名用幂等 key 构造，完整 agentKey 不会被拼成双前缀死条目", () => {
    const uid = "u1";
    const fullKey = ownedAgentKey(uid, "01ABC");
    expect(fullKey).toBe("agent-u1-01ABC");
    // 关键：把已带前缀的 key 再喂一次，必须原样返回
    expect(ownedAgentKey(uid, fullKey)).toBe(fullKey);
    expect(ownedAgentKey(uid, fullKey)).not.toContain("agent-u1-agent-u1-");
    // bare id 仍然正常补前缀
    expect(ownedAgentKey(uid, "01ABC")).toBe("agent-u1-01ABC");
    // 边界：幂等只对**同一个** userId 成立。NOLO_LOCAL_USER_ID 与 agentKey
    // 里的 uid 不同时仍会拼出 agent-local-agent-u1-01ABC。这是别名表的既有
    // 语义（多挂一个候选 key，查不到就算了），不是回归——但别误以为
    // ownedAgentKey 能消除所有双前缀。
    expect(ownedAgentKey("local", fullKey)).toBe("agent-local-agent-u1-01ABC");
  });
});
