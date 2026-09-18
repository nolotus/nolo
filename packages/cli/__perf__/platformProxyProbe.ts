/**
 * 平台代理（nolo.chat /api/v1/chat）流式探针：复用仓库真实请求构造，
 * 测 TUI 平台 agent（GLM 5.3 Flash → RunInfra）真实链路的
 * ttftMs / genMs / usage / tok/s。与 providerStreamProbe（直连）同口径。
 *
 * 运行：bun packages/cli/__perf__/platformProxyProbe.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPlatformChatCompletionRequest,
  resolvePlatformChatProviderConfig,
} from "../../agent-runtime/platformChatProvider";

type ProbeResult = {
  label: string;
  attempt: number;
  ttftMs: number;
  genMs: number;
  totalMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningChars: number;
  contentChars: number;
  tokPerSec: number | null;
  error?: string;
};

function makePrompt(approxTokens: number): string {
  const block =
    'const sample = { id: 42, name: "widget", tags: ["a","b"], meta: { ok: true, n: 7 } };\n';
  const repeats = Math.ceil((approxTokens * 4) / block.length);
  return [
    "以下是历史上下文（模拟 agent loop 后期的累积工具结果）：",
    block.repeat(repeats),
    "",
    "请忽略上面的历史内容，直接回答：用 3 句话总结「性能排查应先测量再优化」的原则。中文回答。",
  ].join("\n");
}

async function probeOnce(args: {
  label: string;
  attempt: number;
  build: { url: string; init: RequestInit };
  timeoutMs?: number;
}): Promise<ProbeResult> {
  const { label, attempt, build, timeoutMs = 240_000 } = args;
  const t0 = performance.now();
  let ttftMs = 0;
  let reasoningChars = 0;
  let contentChars = 0;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(build.url, { ...build.init, signal: ctrl.signal });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      return {
        label, attempt, ttftMs: 0, genMs: 0, totalMs: performance.now() - t0,
        promptTokens: null, completionTokens: null, reasoningChars: 0, contentChars: 0,
        tokPerSec: null, error: `HTTP ${res.status} ${t.slice(0, 200)}`,
      };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let sawFirst = false;
    const firstAt = () => {
      if (!sawFirst) { sawFirst = true; ttftMs = performance.now() - t0; }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        firstAt();
        let ev: any;
        try { ev = JSON.parse(payload); } catch { continue; }
        if (ev.usage) {
          promptTokens = ev.usage.prompt_tokens ?? null;
          completionTokens = ev.usage.completion_tokens ?? null;
        }
        const delta = ev.choices?.[0]?.delta ?? {};
        if (typeof delta.reasoning_content === "string") reasoningChars += delta.reasoning_content.length;
        if (typeof delta.reasoning === "string") reasoningChars += delta.reasoning.length;
        if (typeof delta.content === "string") contentChars += delta.content.length;
        if (typeof ev.choices?.[0]?.message?.content === "string") contentChars += ev.choices[0].message.content.length;
      }
    }
    const genMs = performance.now() - t0 - ttftMs;
    const tokPerSec = completionTokens && genMs > 0 ? Math.round((completionTokens / genMs) * 1000) : null;
    return {
      label, attempt,
      ttftMs: Math.round(ttftMs),
      genMs: Math.round(genMs),
      totalMs: Math.round(performance.now() - t0),
      promptTokens, completionTokens, reasoningChars, contentChars, tokPerSec,
    };
  } catch (e: any) {
    return {
      label, attempt, ttftMs: Math.round(ttftMs), genMs: 0, totalMs: performance.now() - t0,
      promptTokens: null, completionTokens: null, reasoningChars, contentChars, tokPerSec: null,
      error: e?.message ?? String(e),
    };
  } finally { clearTimeout(timer); }
}

async function main() {
  const cfg = JSON.parse(
    fs.readFileSync(path.join(os.homedir(), ".nolo/config.json"), "utf8"),
  );
  const authToken = cfg?.profiles?.default?.authToken;
  if (!authToken) throw new Error("no authToken in ~/.nolo/config.json");

  const agentConfig = {
    key: "agent-0e95801d90-01GLMFLASHPB00000000BT20BC",
    model: "glm-5-3-flash",
    provider: "nolo",
    apiSource: "platform",
  } as any;
  const env = { AUTH_TOKEN: authToken };
  const providerConfig = await resolvePlatformChatProviderConfig({ agentConfig, env });
  console.log("# proxy endpoint:", providerConfig.serverUrl, "model:", providerConfig.model);

  const SMALL = makePrompt(500);
  const LARGE = makePrompt(30_000);
  const mk = (label: string, attempt: number, prompt: string) => ({
    label, attempt,
    build: buildPlatformChatCompletionRequest({
      providerConfig,
      messages: [{ role: "user", content: prompt }] as any,
      stream: true,
      dialogId: "perf-probe-platform-proxy",
      requestOptions: { reasoning_effort: "medium" } as any,
    } as any),
  });

  console.log(`# probe start ${new Date().toISOString()}`);
  const results: ProbeResult[] = [];
  const mkBig = (tok: number) => makePrompt(tok);
  const jobs = [
    mk("proxy glm small(~500tok)", 1, SMALL),
    mk("proxy glm small(~500tok)", 2, SMALL),
    mk("proxy glm large(~30ktok)", 1, LARGE),
    mk("proxy glm large(~30ktok)", 2, LARGE),
  ];
  if (process.env.PROBE_BIGCTX === "1") {
    for (const tok of [60_000, 90_000, 90_000]) {
      const attempt = tok === 90_000 ? (jobs.filter((j) => j.label.includes("90k")).length + 1) : 1;
      jobs.push({
        label: `proxy glm ${tok / 1000}k tok`,
        attempt,
        build: buildPlatformChatCompletionRequest({
          providerConfig,
          messages: [{ role: "user", content: mkBig(tok) }] as any,
          stream: true,
          dialogId: "perf-probe-bigctx",
          requestOptions: { reasoning_effort: "medium" } as any,
        } as any),
      });
    }
  }
  for (const job of jobs) {
    const r = await probeOnce(job);
    results.push(r);
    console.log(JSON.stringify(r));
  }

  console.log("\n=== summary ===");
  const by = new Map<string, ProbeResult[]>();
  for (const r of results) {
    if (!by.has(r.label)) by.set(r.label, []);
    by.get(r.label)!.push(r);
  }
  for (const [label, rs] of by) {
    const ok = rs.filter((r) => !r.error);
    if (!ok.length) { console.log(`${label}: ALL FAILED ${rs[0].error}`); continue; }
    const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    console.log(
      `${label}: ttft=${med(ok.map((r) => r.ttftMs))}ms gen=${med(ok.map((r) => r.genMs))}ms ` +
        `tok/s=${med(ok.map((r) => r.tokPerSec ?? 0))} completion=${med(ok.map((r) => r.completionTokens ?? 0))} ` +
        `reasoningChars=${med(ok.map((r) => r.reasoningChars))} n=${ok.length}/${rs.length}`,
    );
  }
}

main();
