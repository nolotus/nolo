/**
 * TTFT 尾延迟分布探针（alpha 线上）。
 *
 * 动机：逐环节扫描的结论是「上游占一次 LLM 往返的 95%」，但已采到的样本显示
 * 同一条链路、同一个模型下 TTFT 在 1.7s–8.7s 之间摆动，而且**更小的 prompt
 * 反而更慢**（8,592 tok → 1,705ms vs 7,019 tok → 8,289ms）。这说明主导项不是
 * prefill 而是上游排队。若 p90 是 p50 的 4 倍，300 轮里 10% 撞尾部就多出几分钟——
 * 比本轮所有代码优化加起来还大一个量级。
 *
 * 设计（控变量，隔离排队方差）：
 *   - A「小上下文」~300 tok：prefill 可忽略，测到的几乎纯粹是排队 + 调度。
 *   - B「固定大上下文」~8k tok，每次**逐字节相同**：首发之后缓存应命中，
 *     prefill 也被消掉，剩下的同样是排队。
 *   - 两档交替发，消除时段漂移；A/B 若同步出现尾部 → 与 prompt 体量无关，
 *     坐实排队主导；只有 B 有尾部 → 与上下文相关（prefill/缓存未命中）。
 *   - max_tokens 压到 24，把生成时间和成本降到最低（本探针只关心 TTFT）。
 *
 * 输出：p50/p75/p90/p95/max、变异系数、直方图（看双峰）、按时间序的原始值
 * （看尾部是否成簇出现），以及每发的 cached_tokens（排除缓存未命中的混淆）。
 *
 * 运行：bun packages/cli/__perf__/ttftTailProbe.ts [--samples 20]
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
const SAMPLES = Math.max(5, Number(arg("samples", "20")) || 20);

function makePrompt(approxTokens: number): string {
  const block =
    'const sample = { id: 42, name: "widget", tags: ["a","b"], meta: { ok: true, n: 7 } };\n';
  const repeats = Math.ceil((approxTokens * 4) / block.length);
  return [
    "以下是固定不变的上下文块（用于让上游前缀缓存命中，从而把 prefill 从测量中消掉）：",
    block.repeat(repeats),
    "",
    "请只回答两个字：收到。",
  ].join("\n");
}

type Shot = {
  variant: "A-small" | "B-8k";
  i: number;
  atMs: number;
  ttftMs: number;
  promptTokens: number | null;
  cachedTokens: number | null;
  error?: string;
};

async function shoot(
  variant: Shot["variant"],
  i: number,
  providerConfig: any,
  prompt: string,
  originMs: number,
): Promise<Shot> {
  const built = buildPlatformChatCompletionRequest({
    providerConfig,
    messages: [{ role: "user", content: prompt }] as any,
    stream: true,
    dialogId: "perf-probe-ttft-tail",
    requestOptions: { reasoning_effort: "low", max_tokens: 24 } as any,
  } as any);

  const t0 = performance.now();
  const base: Shot = {
    variant,
    i,
    atMs: Math.round(t0 - originMs),
    ttftMs: 0,
    promptTokens: null,
    cachedTokens: null,
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(built.url, { ...built.init, signal: ctrl.signal });
    if (!res.ok || !res.body) {
      return { ...base, error: `HTTP ${res.status}` };
    }
    const rd = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let sawContent = false;
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
        try {
          const j = JSON.parse(payload);
          const d = j?.choices?.[0]?.delta;
          const hasContent =
            (typeof d?.content === "string" && d.content.length > 0) ||
            (typeof d?.reasoning_content === "string" && d.reasoning_content.length > 0);
          if (hasContent && !sawContent) {
            sawContent = true;
            base.ttftMs = performance.now() - t0;
          }
          if (j?.usage) {
            base.promptTokens = j.usage.prompt_tokens ?? base.promptTokens;
            base.cachedTokens =
              j.usage.prompt_tokens_details?.cached_tokens ??
              j.usage.prompt_cache_hit_tokens ??
              base.cachedTokens;
          }
        } catch {}
      }
    }
    if (!sawContent) base.ttftMs = performance.now() - t0;
    return base;
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

const sortNum = (xs: number[]) => [...xs].sort((a, b) => a - b);
const q = (xs: number[], p: number) => {
  const s = sortNum(xs);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const stdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const r0 = (n: number) => Math.round(n);

function histogram(xs: number[], buckets = 10) {
  if (!xs.length) return [];
  const s = sortNum(xs);
  const lo = s[0];
  const hi = s[s.length - 1];
  const width = (hi - lo) / buckets || 1;
  const counts = new Array(buckets).fill(0);
  for (const x of xs) {
    counts[Math.min(buckets - 1, Math.floor((x - lo) / width))] += 1;
  }
  return counts.map((c, i) => ({
    from: r0(lo + i * width),
    to: r0(lo + (i + 1) * width),
    count: c,
  }));
}

function report(label: string, shots: Shot[]) {
  const ok = shots.filter((s) => !s.error);
  const xs = ok.map((s) => s.ttftMs);
  if (!xs.length) {
    console.log(`\n=== ${label} === 无有效样本`);
    return;
  }
  console.log(`\n=== ${label}（n=${xs.length}）===`);
  console.log(
    `  p50=${r0(q(xs, 0.5))}ms  p75=${r0(q(xs, 0.75))}ms  p90=${r0(q(xs, 0.9))}ms  ` +
      `p95=${r0(q(xs, 0.95))}ms  max=${r0(Math.max(...xs))}ms  min=${r0(Math.min(...xs))}ms`,
  );
  const cv = stdev(xs) / mean(xs);
  console.log(
    `  均值=${r0(mean(xs))}ms  标准差=${r0(stdev(xs))}ms  变异系数=${cv.toFixed(2)}` +
      `  p90/p50=${(q(xs, 0.9) / q(xs, 0.5)).toFixed(1)}×  max/p50=${(Math.max(...xs) / q(xs, 0.5)).toFixed(1)}×`,
  );
  const cached = ok.map((s) => s.cachedTokens ?? 0);
  const prompt = ok.map((s) => s.promptTokens ?? 0);
  console.log(
    `  prompt tok 中位=${r0(q(prompt, 0.5))}  cached 中位=${r0(q(cached, 0.5))}` +
      `（缓存命中率中位 ${prompt.length && q(prompt, 0.5) ? ((q(cached, 0.5) / q(prompt, 0.5)) * 100).toFixed(0) : "?"}%）`,
  );
  console.log("  直方图（看是否双峰）：");
  for (const b of histogram(xs)) {
    console.log(
      `    ${String(b.from).padStart(6)}–${String(b.to).padStart(6)}ms │${"█".repeat(b.count)}${b.count ? " " + b.count : ""}`,
    );
  }
  console.log("  时间序（发出时刻 s → TTFT ms，看尾部是否成簇）：");
  console.log(
    "    " +
      ok
        .map((s) => `${(s.atMs / 1000).toFixed(0)}s:${r0(s.ttftMs)}`)
        .join("  "),
  );
}

async function main() {
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
  console.log(
    `# ${providerConfig.serverUrl} / ${providerConfig.model} · 每档 ${SAMPLES} 发交替 · max_tokens=24`,
  );

  const promptA = makePrompt(300);
  const promptB = makePrompt(8000);
  const origin = performance.now();
  const shots: Shot[] = [];

  for (let i = 0; i < SAMPLES; i++) {
    const a = await shoot("A-small", i, providerConfig, promptA, origin);
    shots.push(a);
    const b = await shoot("B-8k", i, providerConfig, promptB, origin);
    shots.push(b);
    process.stdout.write(
      `#${i} A=${a.error ? "ERR" : r0(a.ttftMs) + "ms"} B=${b.error ? "ERR" : r0(b.ttftMs) + "ms"}\n`,
    );
  }

  report("A 小上下文（~300 tok，prefill 可忽略）", shots.filter((s) => s.variant === "A-small"));
  report("B 固定大上下文（~8k tok，逐字节相同）", shots.filter((s) => s.variant === "B-8k"));

  const aOk = shots.filter((s) => s.variant === "A-small" && !s.error).map((s) => s.ttftMs);
  const bOk = shots.filter((s) => s.variant === "B-8k" && !s.error).map((s) => s.ttftMs);
  if (aOk.length && bOk.length) {
    console.log("\n=== 归因判读 ===");
    const aTail = q(aOk, 0.9) / q(aOk, 0.5);
    const bTail = q(bOk, 0.9) / q(bOk, 0.5);
    console.log(`  A p90/p50 = ${aTail.toFixed(1)}×   B p90/p50 = ${bTail.toFixed(1)}×`);
    console.log(`  A p50 = ${r0(q(aOk, 0.5))}ms   B p50 = ${r0(q(bOk, 0.5))}ms   ` +
      `差值 ${r0(q(bOk, 0.5) - q(aOk, 0.5))}ms ← 这一段才是上下文体量的代价`);
    console.log(
      "  判读规则：两档都出现同量级尾部 → 排队主导，与 prompt 体量无关；" +
        "仅 B 有尾部 → 与上下文/缓存相关。",
    );
  }

  console.log(`\nBENCH_JSON ${JSON.stringify({ samples: SAMPLES, shots })}`);
}

main();
