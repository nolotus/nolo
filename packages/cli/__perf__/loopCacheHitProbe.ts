/**
 * 真实 loop 形状的上游前缀缓存命中探针。
 *
 * 为什么要这个：llmRoundTripBreakdown 已经证明一次 LLM 往返里上游占 95%，其中
 * 「排队 + prefill 到响应头」这一段是最大项，而它的唯一可控变量就是上游前缀
 * 缓存命中率（同一 prompt 第二次发实测 TTFT 5.4s→2.0s）。静态 prompt 连发能命中
 * 96%，但 agent loop 每轮都在改消息数组——真正要量的是**真实 loop 形状下**每轮
 * 还剩多少命中。
 *
 * 手法（保证消息字节来自生产代码，不靠复刻）：
 *   1. 用 scripted mock provider 跑真实 runLocalAgentTurn，逐轮**原样捕获**
 *      provider 收到的 messages（即 prepareMessagesForProviderCall +
 *      filterImagePartsFromMessages 之后的最终请求消息）。
 *   2. 把捕获到的每一轮消息，按轮序依次发给平台（nolo.chat，真实 nolo provider），
 *      读回 usage.prompt_tokens_details.cached_tokens。
 *   3. 逐轮报告 cached/prompt 命中率与 TTFT——命中率在哪一轮塌掉，前缀就在哪里被改。
 *
 * 另外算一份「逐轮与上一轮的最长公共前缀（字符）」，纯本地、零成本，用来在不花
 * token 的情况下先定位前缀漂移点（--dry 只跑这一步）。
 *
 * 运行：
 *   bun packages/cli/__perf__/loopCacheHitProbe.ts --dry            # 只算前缀，不发请求
 *   bun packages/cli/__perf__/loopCacheHitProbe.ts --rounds 6       # 真发平台，测命中率
 */
process.env.NOLO_HOME =
  process.env.NOLO_HOME ??
  `${process.env.TMPDIR ?? "/tmp"}/nolo-cache-probe-home-${process.pid}`;

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (name: string, fallback: string) => {
  const i = Bun.argv.indexOf(`--${name}`);
  return i > 0 ? (Bun.argv[i + 1] ?? fallback) : fallback;
};
const ROUNDS = Math.max(2, Number(arg("rounds", "6")) || 6);
const TOOL_RESULT_TOKENS = Math.max(200, Number(arg("toolTokens", "4000")) || 4000);
const DRY = Bun.argv.includes("--dry");

const { runLocalAgentTurn } = await import("../../agent-runtime/localLoop");
import type {
  AgentRuntimeChatMessage,
} from "../../agent-runtime/types";
import type { AgentRuntimeHostAdapter } from "../../agent-runtime/hostAdapter";

const filler = (tok: number) =>
  'const sample = { id: 42, name: "widget", tags: ["a","b"], meta: { ok: true, n: 7 } };\n'.repeat(
    Math.ceil((tok * 4) / 85),
  );

// ── 捕获每轮请求消息 ───────────────────────────────────────────────────────
const captured: AgentRuntimeChatMessage[][] = [];

function makeScriptedProvider(rounds: number) {
  let callCount = 0;
  return {
    model: "fake-local",
    complete: async (messages: AgentRuntimeChatMessage[]) => {
      captured.push(JSON.parse(JSON.stringify(messages)));
      callCount += 1;
      if (callCount <= rounds) {
        return {
          content: "",
          model: "fake-local",
          tool_calls: [
            {
              id: `call-${callCount}`,
              type: "function",
              function: {
                name: "execShell",
                arguments: JSON.stringify({ command: `rg pattern-${callCount} packages` }),
              },
            },
          ],
          finish_reason: "tool_calls",
        };
      }
      return { content: "done", model: "fake-local", finish_reason: "stop" };
    },
  };
}

function makeAdapter(rounds: number): AgentRuntimeHostAdapter {
  return {
    host: "cli",
    capabilities: ["local-provider", "local-persistence", "local-tools"],
    loadAgentConfig: async (agentRef: string) => ({
      key: agentRef,
      name: "Cache Probe Agent",
      prompt: "You are a coding agent. Measure before optimizing.",
      model: "fake-local",
      toolNames: ["execShell"],
    }),
    loadDialogHistory: async () => [],
    saveTurn: async () => ({ dialogId: "dialog-cache-probe" }),
    resolveProvider: async () => makeScriptedProvider(rounds) as any,
    executeTool: async (call: any) => ({
      content: `${call.id} ${filler(TOOL_RESULT_TOKENS)}`,
      metadata: { exitCode: 0 },
    }),
  } as unknown as AgentRuntimeHostAdapter;
}

await runLocalAgentTurn({
  adapter: makeAdapter(ROUNDS),
  agentRef: "cache-probe",
  input: "请连续排查若干处性能问题，每一步都用工具确认。",
  continueDialogId: "dialog-cache-probe",
} as any);

console.log(`# 捕获到 ${captured.length} 轮请求消息（含最后一轮收尾）`);

// ── 步骤 A：纯本地的跨轮前缀分析（零成本）──────────────────────────────────
const serialize = (msgs: AgentRuntimeChatMessage[]) =>
  msgs
    .map((m) =>
      JSON.stringify({
        role: m.role,
        content: m.content,
        ...(m as any).tool_calls ? { tool_calls: (m as any).tool_calls } : {},
        ...(m as any).tool_call_id ? { tool_call_id: (m as any).tool_call_id } : {},
      }),
    )
    .join("\n");

const commonPrefixLen = (a: string, b: string) => {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
};

console.log("\n=== 跨轮前缀稳定性（纯本地，字符）===");
console.log("轮 | 本轮总字符 | 与上轮公共前缀 | 前缀占上轮比 | 上轮之后新增");
let prevSerialized: string | null = null;
for (let i = 0; i < captured.length; i++) {
  const s = serialize(captured[i]);
  if (prevSerialized === null) {
    console.log(`${String(i + 1).padStart(2)} | ${String(s.length).padStart(10)} | ${"—".padStart(14)} | ${"—".padStart(12)} | —`);
  } else {
    const cp = commonPrefixLen(prevSerialized, s);
    const pct = ((cp / prevSerialized.length) * 100).toFixed(1);
    console.log(
      `${String(i + 1).padStart(2)} | ${String(s.length).padStart(10)} | ${String(cp).padStart(14)} | ${String(pct + "%").padStart(12)} | ${s.length - cp}`,
    );
    if (cp < prevSerialized.length) {
      // 定位漂移点：找出第一条不同的消息
      const prevMsgs = prevSerialized.split("\n");
      const curMsgs = s.split("\n");
      let k = 0;
      while (k < Math.min(prevMsgs.length, curMsgs.length) && prevMsgs[k] === curMsgs[k]) k++;
      const prevLine = prevMsgs[k] ?? "";
      const curLine = curMsgs[k] ?? "";
      console.log(
        `     ↑ 前缀在第 ${k + 1}/${prevMsgs.length} 条消息处断开：` +
          `上轮 ${prevLine.slice(0, 90)}… (${prevLine.length} 字符) / ` +
          `本轮 ${curLine.slice(0, 90)}… (${curLine.length} 字符)`,
      );
    }
  }
  prevSerialized = s;
}

if (DRY) {
  console.log("\n(--dry：跳过真实平台请求)");
  process.exit(0);
}

// ── 步骤 B：按轮序真发平台，读回 cached_tokens ─────────────────────────────
const {
  buildPlatformChatCompletionRequest,
  resolvePlatformChatProviderConfig,
} = await import("../../agent-runtime/platformChatProvider");

const cfg = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".nolo/config.json"), "utf8"),
);
const authToken = cfg?.profiles?.default?.authToken;
if (!authToken) throw new Error("no authToken in ~/.nolo/config.json");

const providerConfig = await resolvePlatformChatProviderConfig({
  agentConfig: {
    key: "agent-0e95801d90-01GLMFLASHPB00000000BT20BC",
    model: "glm-5-3-flash",
    provider: "nolo",
    apiSource: "platform",
  } as any,
  env: { AUTH_TOKEN: authToken },
});
console.log(`\n=== 平台实测（${providerConfig.serverUrl} / ${providerConfig.model}）===`);
console.log("轮 | prompt tok | cached tok | 命中率 | TTFT");

for (let i = 0; i < captured.length; i++) {
  const built = buildPlatformChatCompletionRequest({
    providerConfig,
    messages: captured[i] as any,
    stream: true,
    dialogId: "perf-probe-loop-cache",
    requestOptions: { reasoning_effort: "low", max_tokens: 32 } as any,
  } as any);
  const t0 = performance.now();
  let ttft = 0;
  let prompt: number | null = null;
  let cached: number | null = null;
  try {
    const res = await fetch(built.url, built.init);
    if (!res.ok || !res.body) {
      console.log(`${String(i + 1).padStart(2)} | HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
      continue;
    }
    const rd = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        if (!ttft) ttft = performance.now() - t0;
        try {
          const j = JSON.parse(payload);
          if (j?.usage) {
            prompt = j.usage.prompt_tokens ?? prompt;
            cached =
              j.usage.prompt_tokens_details?.cached_tokens ??
              j.usage.prompt_cache_hit_tokens ??
              cached;
          }
        } catch {}
      }
    }
  } catch (err) {
    console.log(`${String(i + 1).padStart(2)} | ERROR ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  const rate = prompt && cached != null ? ((cached / prompt) * 100).toFixed(1) + "%" : "n/a";
  console.log(
    `${String(i + 1).padStart(2)} | ${String(prompt ?? "?").padStart(10)} | ${String(cached ?? "?").padStart(10)} | ${rate.padStart(6)} | ${Math.round(ttft)}ms`,
  );
}
