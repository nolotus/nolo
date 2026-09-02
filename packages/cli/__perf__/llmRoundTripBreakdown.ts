/**
 * 单次 LLM 往返的逐阶段拆解探针（平台 nolo provider，真实 alpha 链路）。
 *
 * 上一轮扫描的结论是「除 LLM 往返外所有环节 <2%」，本探针把那个大头本身拆开：
 * 客户端构造 → 连接 → 响应头 → 首个 SSE 帧 → 首个内容 token → 末个内容 token
 * → usage/计费帧 → [DONE] → 流关闭 → 客户端后处理。
 *
 * 能分离出的边界：
 *   buildMs        客户端构造请求（sanitize + 序列化 + 缓存键），纯 CPU
 *   headersMs      t0 → 响应头到达 = 客户端网络 + 服务端 pre-dispatch + 上游排队
 *   firstFrameMs   首个 SSE 帧（若服务端有 meta 帧会早于内容，用于切分服务端/上游）
 *   firstContentMs 首个 content/reasoning delta = 上游 prefill 完成
 *   genMs          首内容 → 末内容 = 纯生成
 *   tailMs         末内容 → [DONE] = 上游收尾 + 服务端 usage/计费改写
 *   closeMs        [DONE] → 流关闭 = 服务端 post-stream（计费落账）暴露出来的尾巴
 *   parseMs        客户端逐帧解析累计（JSON.parse + delta 累积）
 *
 * 冷/热分别计：样本 0 含 DNS + TLS 握手，单独标注，其余走 keep-alive。
 *
 * 运行：bun packages/cli/__perf__/llmRoundTripBreakdown.ts [--samples 5] [--ctx 30000] [--tools]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPlatformChatCompletionRequest,
  resolvePlatformChatProviderConfig,
} from "../../agent-runtime/platformChatProvider";

const arg = (name: string, fallback: string) => {
  const i = Bun.argv.indexOf(`--${name}`);
  return i > 0 ? (Bun.argv[i + 1] ?? fallback) : fallback;
};
const SAMPLES = Math.max(1, Number(arg("samples", "5")) || 5);
const CTX_TOKENS = Math.max(200, Number(arg("ctx", "30000")) || 30000);
const WITH_TOOLS = Bun.argv.includes("--tools");

type Stage = {
  attempt: number;
  cold: boolean;
  buildMs: number;
  headersMs: number;
  firstFrameMs: number;
  firstFrameKind: string;
  firstContentMs: number;
  lastContentMs: number;
  usageFrameMs: number | null;
  doneMs: number | null;
  closeMs: number;
  parseMs: number;
  frames: number;
  bytes: number;
  promptTokens: number | null;
  cachedTokens: number | null;
  completionTokens: number | null;
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

const TOOLS = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a file from the workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, limit: { type: "number" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execShell",
      description: "Run a shell command.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
];

async function probeOnce(args: {
  providerConfig: any;
  messages: any[];
  attempt: number;
  cold: boolean;
}): Promise<Stage> {
  const { providerConfig, messages, attempt, cold } = args;

  const buildStart = performance.now();
  const built = buildPlatformChatCompletionRequest({
    providerConfig,
    messages,
    stream: true,
    dialogId: "perf-probe-roundtrip",
    ...(WITH_TOOLS ? { tools: TOOLS as any } : {}),
    requestOptions: { reasoning_effort: "medium" } as any,
  } as any);
  const buildMs = performance.now() - buildStart;

  const base: Stage = {
    attempt,
    cold,
    buildMs,
    headersMs: 0,
    firstFrameMs: 0,
    firstFrameKind: "",
    firstContentMs: 0,
    lastContentMs: 0,
    usageFrameMs: null,
    doneMs: null,
    closeMs: 0,
    parseMs: 0,
    frames: 0,
    bytes: 0,
    promptTokens: null,
    cachedTokens: null,
    completionTokens: null,
  };

  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 240_000);
  try {
    const res = await fetch(built.url, { ...built.init, signal: ctrl.signal });
    base.headersMs = performance.now() - t0;
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      return { ...base, error: `HTTP ${res.status} ${t.slice(0, 200)}` };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let sawFrame = false;
    let sawContent = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      base.bytes += value?.byteLength ?? 0;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        const now = performance.now() - t0;
        base.frames += 1;
        if (payload === "[DONE]") {
          base.doneMs = now;
          continue;
        }
        const parseStart = performance.now();
        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          base.parseMs += performance.now() - parseStart;
          continue;
        }
        const delta = json?.choices?.[0]?.delta;
        const hasContent =
          (typeof delta?.content === "string" && delta.content.length > 0) ||
          (typeof delta?.reasoning_content === "string" &&
            delta.reasoning_content.length > 0) ||
          (Array.isArray(delta?.tool_calls) && delta.tool_calls.length > 0);
        base.parseMs += performance.now() - parseStart;

        if (!sawFrame) {
          sawFrame = true;
          base.firstFrameMs = now;
          base.firstFrameKind = hasContent
            ? "content"
            : json?.usage
              ? "usage"
              : json?.choices?.[0]?.delta
                ? "empty-delta"
                : "meta";
        }
        if (hasContent) {
          if (!sawContent) {
            sawContent = true;
            base.firstContentMs = now;
          }
          base.lastContentMs = now;
        }
        if (json?.usage && typeof json.usage === "object") {
          base.usageFrameMs = now;
          const u = json.usage;
          base.promptTokens = u.prompt_tokens ?? base.promptTokens;
          base.completionTokens = u.completion_tokens ?? base.completionTokens;
          base.cachedTokens =
            u.prompt_tokens_details?.cached_tokens ??
            u.prompt_cache_hit_tokens ??
            base.cachedTokens;
        }
      }
    }
    base.closeMs = performance.now() - t0;
    return base;
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

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
  const providerConfig = await resolvePlatformChatProviderConfig({
    agentConfig,
    env: { AUTH_TOKEN: authToken },
  });
  console.log(
    `# endpoint=${providerConfig.serverUrl} model=${providerConfig.model} ctx≈${CTX_TOKENS}tok tools=${WITH_TOOLS}`,
  );

  const messages = [{ role: "user", content: makePrompt(CTX_TOKENS) }] as any[];
  const results: Stage[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const r = await probeOnce({
      providerConfig,
      messages,
      attempt: i,
      cold: i === 0,
    });
    results.push(r);
    if (r.error) {
      console.log(`#${i}${r.cold ? " (cold)" : ""} ERROR ${r.error}`);
      continue;
    }
    console.log(
      `#${i}${r.cold ? " (cold)" : "       "} build=${r1(r.buildMs)}ms ` +
        `headers=${r1(r.headersMs)}ms firstFrame=${r1(r.firstFrameMs)}ms(${r.firstFrameKind}) ` +
        `firstContent=${r1(r.firstContentMs)}ms gen=${r1(r.lastContentMs - r.firstContentMs)}ms ` +
        `tail=${r.doneMs != null ? r1(r.doneMs - r.lastContentMs) : "n/a"}ms ` +
        `close-after-done=${r.doneMs != null ? r1(r.closeMs - r.doneMs) : "n/a"}ms ` +
        `parse=${r1(r.parseMs)}ms frames=${r.frames} ` +
        `prompt=${r.promptTokens} cached=${r.cachedTokens} completion=${r.completionTokens}`,
    );
  }

  const warm = results.filter((r) => !r.error && !r.cold);
  if (warm.length) {
    const stage = (f: (r: Stage) => number) => r1(median(warm.map(f)));
    console.log("\n=== 热连接中位数（keep-alive，n=" + warm.length + "）===");
    console.log(`  1. 客户端构造请求        ${stage((r) => r.buildMs)}ms`);
    console.log(
      `  2. 发出 → 响应头到达      ${stage((r) => r.headersMs)}ms  (客户端网络 + 服务端 pre-dispatch + 上游排队)`,
    );
    console.log(
      `  3. 响应头 → 首个 SSE 帧   ${stage((r) => r.firstFrameMs - r.headersMs)}ms`,
    );
    console.log(
      `  4. 首帧 → 首个内容 token  ${stage((r) => r.firstContentMs - r.firstFrameMs)}ms  (上游 prefill 尾段)`,
    );
    console.log(
      `  5. 生成（首内容→末内容）  ${stage((r) => r.lastContentMs - r.firstContentMs)}ms`,
    );
    console.log(
      `  6. 末内容 → [DONE]        ${stage((r) => (r.doneMs ?? r.closeMs) - r.lastContentMs)}ms  (上游收尾 + 服务端 usage/计费改写)`,
    );
    console.log(
      `  7. [DONE] → 流关闭        ${stage((r) => r.closeMs - (r.doneMs ?? r.closeMs))}ms  (服务端 post-stream 落账尾巴)`,
    );
    console.log(`  ─ 客户端逐帧解析累计      ${stage((r) => r.parseMs)}ms（与 5 重叠，非串行）`);
    console.log(`  ═ 总计（构造→流关闭）      ${stage((r) => r.buildMs + r.closeMs)}ms`);
  }
  const cold = results.find((r) => r.cold && !r.error);
  if (cold && warm.length) {
    console.log(
      `\n冷连接一次性代价（DNS+TLS）：headers ${r1(cold.headersMs)}ms vs 热 ${r1(median(warm.map((r) => r.headersMs)))}ms`,
    );
  }
  console.log(`\nBENCH_JSON ${JSON.stringify({ samples: SAMPLES, ctx: CTX_TOKENS, tools: WITH_TOOLS, results })}`);
}

main();
