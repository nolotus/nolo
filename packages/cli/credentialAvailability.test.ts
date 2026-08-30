import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyCredentialAvailability,
  clearCredentialAvailability,
  markCredentialUnavailable,
  readCredentialAvailability,
  readCredentialEntry,
  recordCredentialProbe,
  resolveCredentialAvailabilityPath,
  resolveCredentialKey,
  resolveCredentialKeyWithFallback,
} from "./credentialAvailability";
import {
  MAX_COOLDOWN_MS,
  PROBE_INTERVAL_MS,
  resolveAvailabilityAction,
  resolveCooldownGate,
} from "ai/agent/agentAvailabilityShared";

let home: string;
let env: NodeJS.ProcessEnv;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "nolo-cred-avail-"));
  env = { NOLO_HOME: home };
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

describe("resolveCredentialKey", () => {
  it("prefers apiKeyRef so agents sharing one OAuth share a cooldown", () => {
    expect(resolveCredentialKey({ apiKeyRef: "chatgpt" })).toBe("chatgpt");
    // 两个不同 agent、同一 OAuth ⇒ 同一把 key，冷却因此共享。
    expect(resolveCredentialKey({ apiKeyRef: "chatgpt", key: "agent-a" })).toBe(
      resolveCredentialKey({ apiKeyRef: "chatgpt", key: "agent-b" }),
    );
  });

  it("falls back to credentialRef, then to undefined", () => {
    expect(resolveCredentialKey({ credentialRef: "api-key:agent-x" })).toBe(
      "api-key:agent-x",
    );
    // 没有凭证的 agent 不臆造 key —— 调用方回退到 agent 级行为。
    expect(resolveCredentialKey({ key: "public-agent" })).toBeUndefined();
    expect(resolveCredentialKey(null)).toBeUndefined();
    expect(resolveCredentialKey({ apiKeyRef: "   " })).toBeUndefined();
  });
});

describe("resolveCredentialKeyWithFallback", () => {
  it("keeps the ref-based key (and resolveCredentialKey behavior) when a ref exists", () => {
    expect(
      resolveCredentialKeyWithFallback({
        apiKeyRef: "chatgpt",
        customProviderUrl: "https://ollama.com/v1",
      }),
    ).toBe("chatgpt");
    expect(
      resolveCredentialKeyWithFallback({ credentialRef: "api-key:agent-x" }),
    ).toBe("api-key:agent-x");
  });

  it("derives a deterministic endpoint key from customProviderUrl", () => {
    expect(
      resolveCredentialKeyWithFallback({
        key: "ollama",
        customProviderUrl: "https://ollama.com/v1",
      }),
    ).toBe("custom-endpoint:https://ollama.com");
    // 同一 origin（不同路径/尾斜杠/大小写 host）派生同一把 key，跨进程稳定。
    expect(
      resolveCredentialKeyWithFallback({
        key: "ollama",
        customProviderUrl: "https://ollama.com/v1/",
      }),
    ).toBe("custom-endpoint:https://ollama.com");
    expect(
      resolveCredentialKeyWithFallback({
        key: "other",
        customProviderUrl: "https://OLLAMA.com/chat/completions",
      }),
    ).toBe("custom-endpoint:https://ollama.com");
  });

  it("falls back to an agent-key key when the endpoint is not a parseable URL", () => {
    expect(
      resolveCredentialKeyWithFallback({
        key: "ollama",
        customProviderUrl: "not a url",
      }),
    ).toBe("custom-agent:ollama");
  });

  it("falls back to an agent-key key without any endpoint field", () => {
    expect(resolveCredentialKeyWithFallback({ key: "public-agent" })).toBe(
      "custom-agent:public-agent",
    );
  });

  it("returns undefined when there is nothing to derive from", () => {
    expect(resolveCredentialKeyWithFallback(null)).toBeUndefined();
    expect(resolveCredentialKeyWithFallback({})).toBeUndefined();
    expect(resolveCredentialKeyWithFallback({ key: "   " })).toBeUndefined();
  });
});

describe("fallback-key cooldown for credential-less custom providers", () => {
  // 无 apiKeyRef/credentialRef、本地也无 agent 记录的 agentConfig
  // （服务端 global-cache 下发的 Ollama cloud 直连 agent 即此形态）。
  const agentConfig = {
    key: "ollama-cloud",
    name: "Ollama cloud",
    customProviderUrl: "https://ollama.com/v1",
  };
  // 真实 Ollama 429 body：无 Retry-After、无 resets_at、无 "reset at" 文案。
  const weeklyBody = {
    error: {
      message:
        "you (blissful_dewdney_254) have reached your weekly usage limit, upgrade for higher limits: https://ollama.com/upgrade or add extra usage: https://ollama.com/settings (ref: abc-def)",
      type: "api_error",
      param: null,
      code: null,
    },
  };

  it("persists a 429 cooldown under the fallback key in credential-availability.json", async () => {
    const now = 1_000;
    const credentialKey = resolveCredentialKeyWithFallback(agentConfig);
    expect(credentialKey).toBe("custom-endpoint:https://ollama.com");

    // 与 localRuntimeAdapter.recordLocalAvailability 相同的落盘链路：
    // resolveAvailabilityAction 决策 → markCredentialUnavailable 写盘。
    const action = resolveAvailabilityAction(429, weeklyBody, now);
    expect(action.kind).toBe("mark");
    if (action.kind !== "mark") return;
    await markCredentialUnavailable(credentialKey!, action.nextAvailableAt, env, now);

    const raw = JSON.parse(
      await readFile(resolveCredentialAvailabilityPath(env), "utf8"),
    );
    expect(Object.keys(raw.entries)).toContain(
      "custom-endpoint:https://ollama.com",
    );

    const entry = await readCredentialEntry(credentialKey!, env, now);
    // 周期性硬配额文案 → 24h 冷却，而非 5 分钟默认窗口。
    expect(entry?.nextAvailableAt).toBe(now + MAX_COOLDOWN_MS);
  });

  it("no longer leaves the gate unconditionally open: probe first, then blocked", async () => {
    const now = 1_000;
    const credentialKey = resolveCredentialKeyWithFallback(agentConfig)!;
    await markCredentialUnavailable(credentialKey, now + MAX_COOLDOWN_MS, env, now);

    // 冷却期内且从未探测 → gate 判 probe（放行一次真实请求），而非旧缺陷下的
    // 永远 open（key 为 undefined → 冷却读不到 → 每次派发都撞 429）。
    const entry = await readCredentialEntry(credentialKey, env, now);
    expect(resolveCooldownGate({ ...entry }, now)).toBe("probe");

    // probe 被记录后 → blocked，10 分钟内不再重复打上游。
    await recordCredentialProbe(credentialKey, env, now);
    const after = await readCredentialEntry(credentialKey, env, now);
    expect(resolveCooldownGate({ ...after }, now)).toBe("blocked");

    // 2xx clear 恢复：条目消失，gate 回到 open。
    await clearCredentialAvailability(credentialKey, env, now);
    expect(await readCredentialEntry(credentialKey, env, now)).toBeUndefined();
  });
});

describe("credential availability persistence", () => {
  // 这是原缺陷的核心回归：冷却落盘不得依赖本地是否存在该 agent 的记录。
  // 此前 agent 定义来自远端 global-cache 时本地无副本，429 结论被静默丢弃。
  it("persists a cooldown with no pre-existing local agent record", async () => {
    await markCredentialUnavailable("chatgpt", 4_000, env, 1_000);
    expect(await readCredentialAvailability(env, 1_000)).toEqual({
      chatgpt: 4_000,
    });
  });

  it("keeps the later deadline so a short cooldown cannot erase a long one", async () => {
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    await markCredentialUnavailable("chatgpt", 3_000, env, 1_000);
    expect((await readCredentialAvailability(env, 1_000)).chatgpt).toBe(9_000);
  });

  it("drops expired entries on read instead of accumulating forever", async () => {
    await markCredentialUnavailable("chatgpt", 2_000, env, 1_000);
    expect(await readCredentialAvailability(env, 5_000)).toEqual({});
  });

  it("clears a cooldown when the credential recovers", async () => {
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    await clearCredentialAvailability("chatgpt", env, 1_000);
    expect(await readCredentialAvailability(env, 1_000)).toEqual({});
  });

  it("treats a corrupt file as no cooldown rather than failing dispatch", async () => {
    await writeFile(resolveCredentialAvailabilityPath(env), "{not json", "utf8");
    expect(await readCredentialAvailability(env, 1_000)).toEqual({});
    // 且后续写入能把它恢复成合法内容。
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    const raw = await readFile(resolveCredentialAvailabilityPath(env), "utf8");
    expect(JSON.parse(raw).entries.chatgpt.nextAvailableAt).toBe(9_000);
  });

  // 【2】核心回归：旧格式文件（无 lastProbeAt 字段）必须仍能正常读，不因结构变化失效。
  it("reads a legacy file that has no lastProbeAt field", async () => {
    await writeFile(
      resolveCredentialAvailabilityPath(env),
      JSON.stringify({ entries: { chatgpt: { nextAvailableAt: 9_000 } } }),
      "utf8",
    );
    expect(await readCredentialAvailability(env, 1_000)).toEqual({ chatgpt: 9_000 });
    // readCredentialEntry 也正常返回，lastProbeAt 为 undefined → gate 视为从未探测。
    expect(await readCredentialEntry("chatgpt", env, 1_000)).toEqual({
      nextAvailableAt: 9_000,
    });
    // 重写后仍保持合法结构。
    await markCredentialUnavailable("chatgpt", 9_500, env, 1_000);
    const raw = await readFile(resolveCredentialAvailabilityPath(env), "utf8");
    expect(JSON.parse(raw).entries.chatgpt.nextAvailableAt).toBe(9_500);
  });

  it("records a probe timestamp without losing the deadline", async () => {
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    await recordCredentialProbe("chatgpt", env, 4_000);
    const entry = await readCredentialEntry("chatgpt", env, 4_000);
    expect(entry).toEqual({ nextAvailableAt: 9_000, lastProbeAt: 4_000 });
    // 公开读取接口仍只暴露 deadline。
    expect(await readCredentialAvailability(env, 4_000)).toEqual({ chatgpt: 9_000 });
  });

  it("recordCredentialProbe is a no-op when there is no active cooldown", async () => {
    await recordCredentialProbe("chatgpt", env, 4_000);
    expect(await readCredentialAvailability(env, 4_000)).toEqual({});
  });

  it("mark preserves a previously recorded probe time", async () => {
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    await recordCredentialProbe("chatgpt", env, 4_000);
    await markCredentialUnavailable("chatgpt", 9_500, env, 5_000);
    const entry = await readCredentialEntry("chatgpt", env, 5_000);
    expect(entry).toEqual({ nextAvailableAt: 9_500, lastProbeAt: 4_000 });
  });

  it("clearing a cooldown removes the probe timestamp too", async () => {
    await markCredentialUnavailable("chatgpt", 9_000, env, 1_000);
    await recordCredentialProbe("chatgpt", env, 4_000);
    await clearCredentialAvailability("chatgpt", env, 5_000);
    expect(await readCredentialEntry("chatgpt", env, 5_000)).toBeUndefined();
  });

  /**
   * 兼容：历史文件把 entry 存成裸 number。不做规范化的话这些条目会被静默丢弃，
   * 刚撞出来的限流转眼被忘掉，下一个请求立刻再撞一次 429。
   */
  it("reads legacy bare-number entries and mixed-format files", async () => {
    const path = resolveCredentialAvailabilityPath(env);
    await writeFile(
      path,
      JSON.stringify({
        entries: {
          legacy: 9_000,
          modern: { nextAvailableAt: 9_000, lastProbeAt: 2_000 },
          expiredLegacy: 3_000,
          malformed: { nope: 1 },
          garbage: "not-a-number",
          // 字段存在但非法 → 整条丢弃（不是当作「从未探测」放行一次 probe）。
          badProbe: { nextAvailableAt: 9_000, lastProbeAt: "123" },
        },
      }),
      "utf8",
    );

    expect(await readCredentialAvailability(env, 4_000)).toEqual({
      legacy: 9_000,
      modern: 9_000,
    });
    // 裸 number 无探测记录 → 视为从未探测。
    expect(await readCredentialEntry("legacy", env, 4_000)).toEqual({
      nextAvailableAt: 9_000,
    });
    expect(await readCredentialEntry("modern", env, 4_000)).toEqual({
      nextAvailableAt: 9_000,
      lastProbeAt: 2_000,
    });
    expect(await readCredentialEntry("badProbe", env, 4_000)).toBeUndefined();
  });

  /**
   * 回归：派发门控必须把持久化的 lastProbeAt 读回来喂给 resolveCooldownGate。
   *
   * 漏传时该函数一律返回 "probe"，"blocked" 永不可达 —— 冷却完全失效、每次派发
   * 都放行去撞 429。这正是本次修复前 localRuntimeAdapter 的真实缺陷，故在
   * 持久化层锁死「写入 → 读回」这一往返契约。
   */
  it("persists lastProbeAt so a follow-up gate check can block within the interval", async () => {
    const deadline = 10_000_000;
    await markCredentialUnavailable("chatgpt", deadline, env, 1_000);

    // 首次门控：无探测记录 → probe，并记录探测时间。
    const before = await readCredentialEntry("chatgpt", env, 2_000);
    expect(resolveCooldownGate({ ...before }, 2_000)).toBe("probe");
    await recordCredentialProbe("chatgpt", env, 2_000);

    // 间隔内的下一次门控：读回 lastProbeAt → blocked（而非再次放行）。
    const after = await readCredentialEntry("chatgpt", env, 3_000);
    expect(after?.lastProbeAt).toBe(2_000);
    expect(resolveCooldownGate({ ...after }, 3_000)).toBe("blocked");

    // 超过探测间隔后重新放行一次。
    const later = 2_000 + PROBE_INTERVAL_MS + 1;
    const nextEntry = await readCredentialEntry("chatgpt", env, later);
    expect(resolveCooldownGate({ ...nextEntry }, later)).toBe("probe");
  });
});

describe("applyCredentialAvailability", () => {
  it("marks every agent sharing the exhausted credential, not just the one that hit 429", () => {
    const agents = [
      { id: "luna", apiKeyRef: "chatgpt" },
      { id: "other-chatgpt-agent", apiKeyRef: "chatgpt" },
      { id: "glm", apiKeyRef: "api-key:agent-glm" },
    ];
    const merged = applyCredentialAvailability(agents, { chatgpt: 9_000 });
    expect(merged.map((a: any) => a.nextAvailableAt)).toEqual([
      9_000,
      9_000,
      undefined,
    ]);
  });

  it("keeps the later of agent-level and credential-level deadlines", () => {
    const merged = applyCredentialAvailability(
      [{ id: "a", apiKeyRef: "chatgpt", nextAvailableAt: 20_000 }],
      { chatgpt: 9_000 },
    );
    expect((merged[0] as any).nextAvailableAt).toBe(20_000);
  });

  // 读侧必须与写侧同一把 fallback key：无 ref 的 custom-provider agent 的冷却
  // 记在 custom-endpoint:/custom-agent: 条目下，若这里匹配不到，冷却期内 agent
  // 仍会被 list 列出并被选中，429 循环复活。
  it("matches runtime-written fallback-key entries for credential-less custom providers", () => {
    const merged = applyCredentialAvailability(
      [
        {
          id: "ollama-cloud",
          key: "ollama-cloud",
          customProviderUrl: "https://ollama.com/v1",
        },
      ],
      { "custom-endpoint:https://ollama.com": 9_000 },
    );
    expect((merged[0] as any).nextAvailableAt).toBe(9_000);
  });

  it("is a no-op when there are no cooldowns", () => {
    const agents = [{ id: "a", apiKeyRef: "chatgpt" }];
    expect(applyCredentialAvailability(agents, {})).toBe(agents);
  });
});
