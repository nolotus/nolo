/**
 * alpha 线上服务端各段耗时的**外部阶梯差分**探针。
 *
 * 为什么需要它：`chatProxyTtftBench --stub` 测出的「服务端 TTFB 6ms、鉴权
 * 1.1ms、上下文+余额 0.6ms」是在**全新的空 LevelDB** 上跑的。线上库大几个量级、
 * 硬件也不同，这些恰恰是最可能翻车的读路径（token 表、agent 记录、余额）。
 * 而服务端 stage 日志要 ssh 才看得到。
 *
 * 手法：构造在**已知阶段提前失败**的请求，用相邻阶梯的耗时差反推每段成本。
 * 全程在 upstream dispatch 之前就返回，不产生 LLM 调用、不消耗积分、无副作用。
 *
 *   S0 GET /health                      → 纯网络 RTT + 最小 handler
 *   S1 POST /api/v1/chat 无 Authorization → S0 + 请求解析 + 鉴权短路（400）
 *   S2 POST /api/v1/chat 伪造 Bearer     → S0 + 鉴权**真实查库**失败（401）
 *   S3 POST /api/v1/chat 合法 token +
 *      不存在的 model                    → S2 + 余额读 + 路由解析（400，止于 dispatch 前）
 *
 *   auth（真实查库）  ≈ S2 − S1
 *   余额读 + 路由解析 ≈ S3 − S2
 *
 * 注意口径边界：S3 走的是「model 不认识」的失败分支，与成功请求的 pre-dispatch
 * 路径高度重合但不完全等同，S3−S2 应读作该段的**量级界**而非精确值。
 *
 * 每档交替采样（消除时段漂移），第一发单独标注为冷连接。
 *
 * 运行：bun packages/cli/__perf__/alphaServerStageProbe.ts [--samples 10]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (name: string, fallback: string) => {
  const i = Bun.argv.indexOf(`--${name}`);
  return i > 0 ? (Bun.argv[i + 1] ?? fallback) : fallback;
};
const SAMPLES = Math.max(3, Number(arg("samples", "10")) || 10);
const BASE = arg("base", "https://nolo.chat").replace(/\/+$/, "");

const cfg = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".nolo/config.json"), "utf8"),
);
const authToken: string | undefined = cfg?.profiles?.default?.authToken;
if (!authToken) throw new Error("no authToken in ~/.nolo/config.json");

// 一条最小的合法 chat 请求体；S3 用的 agentKey 保证不存在（随机后缀）。
const minimalMessages = [{ role: "user", content: "ping" }];

type Step = {
  id: string;
  label: string;
  run: () => Promise<{ ms: number; status: number }>;
};

async function timed(url: string, init?: RequestInit) {
  const t0 = performance.now();
  const res = await fetch(url, init);
  await res.arrayBuffer().catch(() => {});
  return { ms: performance.now() - t0, status: res.status };
}

const chatBody = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    model: "glm-5-3-flash",
    provider: "nolo",
    stream: false,
    messages: minimalMessages,
    ...overrides,
  });

const STEPS: Step[] = [
  {
    id: "S0",
    label: "GET /health（纯网络 RTT）",
    run: () => timed(`${BASE}/health`),
  },
  {
    id: "S1",
    label: "POST /api/v1/chat 无 Authorization（鉴权短路）",
    run: () =>
      timed(`${BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: chatBody(),
      }),
  },
  {
    id: "S2",
    label: "POST /api/v1/chat 伪造 Bearer（鉴权真实查库失败）",
    run: () =>
      timed(`${BASE}/api/v1/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // 形状合法、值不存在：强制走完真实的 token 校验路径再失败。
          authorization: `Bearer nolo-probe-invalid-${"0".repeat(40)}`,
        },
        body: chatBody(),
      }),
  },
  {
    id: "S3",
    label: "POST /api/v1/chat 合法 token + 不存在的 model（+余额+路由，止于 dispatch 前）",
    run: () =>
      timed(`${BASE}/api/v1/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${authToken}`,
        },
        // 注意：agentKey 传不存在的值**不会**提前失败——服务端会按 provider/model
        // 兜底路由并真的打上游（实测返回 200 + 2.2s）。必须用不存在的 model
        // 才能止在 dispatch 之前，否则这个探针会真实消耗积分。
        body: chatBody({ model: `nonexistent-model-probe-${Date.now()}` }),
      }),
  },
];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
};
const r1 = (n: number) => Math.round(n * 10) / 10;

console.log(`# base=${BASE} samples=${SAMPLES}（交替采样，样本 0 为冷连接单列）`);

const results = new Map<string, { warm: number[]; cold?: number; statuses: Set<number> }>();
for (const s of STEPS) results.set(s.id, { warm: [], statuses: new Set() });

for (let i = 0; i < SAMPLES; i++) {
  for (const step of STEPS) {
    try {
      const { ms, status } = await step.run();
      const bucket = results.get(step.id)!;
      bucket.statuses.add(status);
      if (i === 0) bucket.cold = ms;
      else bucket.warm.push(ms);
    } catch (err) {
      console.log(`${step.id} #${i} ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // 轻微间隔：避免被当成突发流量触发限流/隔离。
  await new Promise((r) => setTimeout(r, 150));
}

console.log("\n=== 各阶梯（热连接中位 / p90，ms）===");
console.log("阶梯 | 中位 | p90 | HTTP 状态 | 说明");
const med: Record<string, number> = {};
for (const step of STEPS) {
  const b = results.get(step.id)!;
  if (!b.warm.length) {
    console.log(`${step.id} | 无有效样本 | | | ${step.label}`);
    continue;
  }
  med[step.id] = median(b.warm);
  console.log(
    `${step.id} | ${String(r1(med[step.id])).padStart(6)} | ${String(r1(pct(b.warm, 0.9))).padStart(6)} | ` +
      `${[...b.statuses].join(",")} | ${step.label}`,
  );
}

console.log("\n=== 差分归因（ms）===");
const diff = (a: string, b: string, label: string) => {
  if (med[a] === undefined || med[b] === undefined) return;
  console.log(`  ${label.padEnd(46)} ${r1(med[a] - med[b])}`);
};
diff("S1", "S0", "请求解析 + chat handler 入口（S1−S0）");
diff("S2", "S1", "鉴权真实查库（S2−S1）");
diff("S3", "S2", "余额读 + 路由解析（S3−S2）");
if (med.S3 !== undefined && med.S0 !== undefined) {
  console.log(`  ${"服务端 pre-dispatch 合计（S3−S0）".padEnd(44)} ${r1(med.S3 - med.S0)}`);
}

console.log("\n=== 冷连接（样本 0，含 DNS+TLS）===");
for (const step of STEPS) {
  const b = results.get(step.id)!;
  if (b.cold !== undefined) console.log(`  ${step.id} ${r1(b.cold)}ms`);
}

console.log(
  `\nBENCH_JSON ${JSON.stringify({
    base: BASE,
    samples: SAMPLES,
    steps: STEPS.map((s) => ({
      id: s.id,
      label: s.label,
      cold: results.get(s.id)!.cold,
      warm: results.get(s.id)!.warm,
      statuses: [...results.get(s.id)!.statuses],
    })),
  })}`,
);
