/**
 * 真实蓝绿交接探针：按 deployRemote.sh 的 blue_green_reload_nolo 时序跑一遍，
 * 测量**用户可见缺口**——从旧进程摘 listener 到 canary 能正常服务之间，
 * 客户端到底收到什么、持续多久。
 *
 *   老进程(nolo, reusePort) → canary(nolo-next, reusePort) 起来 /health 200
 *   → SIGINT 老进程 → 老进程 drain + 关 DB 释放锁 → canary 抢到锁 → ready
 *
 * 用法：bun scripts/dev/handoverProbe.ts [--load=1] [--port=38970]
 *   --load=1 时在交接前灌入一条长 SSE 般的在途请求，触发 phase-1 的 5s quiesce 预算。
 *
 * 注意：macOS 的 SO_REUSEPORT 不是 Linux 的 hash-balance（新连接倾向最后 bind 者），
 * 所以「流量如何分摊」不可外推到生产；但「缺口多长、期间返回什么」是可比的。
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Level } from "level";
import { generateKeyPairFromSeedV1 } from "core/generateKeyPairFromSeedV1";
import { signToken } from "core/authToken";
import { safeJsonEncoding } from "database-engine/serverStoreFactory";

const arg = (name: string, fallback: number) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};
const port = arg("port", 38970);
const withLoad = arg("load", 0) === 1;
// --defer=1：canary 用 NOLO_DEFER_LISTEN_UNTIL_READY=1 启动（DB 就绪后才 bind），
// 并用 boot-ready 文件代替共享端口 /health 作为「canary 已启动」信号。
const withDefer = arg("defer", 0) === 1;
const USER_ID = "probe-user";
const entry = path.join(import.meta.dir, "../../packages/server/entry.ts");

const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "nolo-handover-")), "leveldb");
const { publicKey, secretKey } = generateKeyPairFromSeedV1("handover-probe");
{
  const db = new Level<string, any>(dbPath, { valueEncoding: safeJsonEncoding });
  await db.open();
  await db.put(`user:${USER_ID}`, {
    id: USER_ID, username: "probe", publicKey, balance: 100, isDisabled: false,
  });
  await db.close();
}
const nowSec = Math.floor(Date.now() / 1000);
const token = signToken(
  { userId: USER_ID, username: "probe", iat: nowSec, nbf: nowSec - 60 },
  secretKey
);

const bootReadyFile = path.join(path.dirname(dbPath), "canary.ready");

const startSlot = (slot: string, defer = false) =>
  Bun.spawn(["bun", entry], {
    env: {
      ...process.env,
      ...(defer
        ? {
            NOLO_DEFER_LISTEN_UNTIL_READY: "1",
            NOLO_BOOT_READY_FILE: bootReadyFile,
          }
        : {}),
      NOLO_SERVER_DB_PATH: dbPath,
      HTTP_PORT: String(port),
      NOLO_DISABLE_HTTPS: "1",
      NOLO_DISABLE_BACKGROUND_WORKERS: "1",
      NOLO_REUSE_PORT: "1",
      NOLO_SLOT: slot,
      NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS: "90000",
    },
    stdout: process.env.PROBE_VERBOSE === "1" ? "inherit" : "ignore",
    stderr: process.env.PROBE_VERBOSE === "1" ? "inherit" : "ignore",
  });

const probeSlot = async (endpoint: "health" | "ready") => {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/${endpoint}`, {
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok, slot: res.headers.get("x-nolo-slot") };
  } catch {
    return { ok: false, slot: null };
  }
};

const waitFor = async (fn: () => Promise<boolean>, label: string, timeoutMs = 60_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return Date.now() - start;
    await Bun.sleep(50);
  }
  throw new Error(`timeout waiting for ${label}`);
};

// ── 1. 旧进程起来并 ready ──────────────────────────────────────────────
const oldProc = startSlot("nolo");
await waitFor(async () => (await probeSlot("ready")).ok, "old ready");

// ── 2. 持续流量（每 20ms 一发，带真 token） ─────────────────────────────
const url = `http://127.0.0.1:${port}/api/dialog/probe-dialog/billing`;
type Sample = { t: number; ms: number; status: number | string; slot: string | null; body: string };
const samples: Sample[] = [];
let stop = false;
let t0 = 0;
const traffic = (async () => {
  const inflight: Promise<void>[] = [];
  while (!stop) {
    const at = Date.now();
    inflight.push(
      (async () => {
        try {
          const res = await fetch(url, {
            headers: { authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(30_000),
          });
          const body = (await res.text()).slice(0, 90);
          samples.push({ t: at, ms: Date.now() - at, status: res.status, slot: res.headers.get("x-nolo-slot"), body });
        } catch (e: any) {
          samples.push({ t: at, ms: Date.now() - at, status: e?.name ?? "ERR", slot: null, body: String(e?.message ?? e).slice(0, 90) });
        }
      })()
    );
    await Bun.sleep(20);
  }
  await Promise.all(inflight);
})();

await Bun.sleep(1000);

// ── 3. canary 起来，等它的 listener 出现在共享端口上 ─────────────────────
// macOS 的 SO_REUSEPORT 把新连接全给**第一个** binder，canary 在旧进程摘 listener
// 前收不到任何请求，所以这里不能像 deployRemote.sh 那样靠共享端口上的 /health
// 探到 canary（Linux 是 hash-balance，能探到）。改为固定预热时间。
// 影响：本机测不出「流量如何分摊」，但「缺口多长、期间返回什么」仍然可比。
const canaryProc = startSlot("nolo-next", withDefer);
let canaryListenerMs: number;
if (withDefer) {
  // 部署脚本的新探法：等 boot-ready 文件出现（= 模块加载完、进入等锁循环）
  canaryListenerMs = await waitFor(
    async () => await Bun.file(bootReadyFile).exists(),
    "canary boot-ready file"
  );
} else {
  canaryListenerMs = arg("warmup", 4000);
  await Bun.sleep(canaryListenerMs);
}

// 可选：制造在途工作，逼旧进程走满 phase-1 quiesce 预算
if (withLoad) {
  void fetch(`http://127.0.0.1:${port}/api/dialog/slow-dialog/billing`, {
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => {});
  await Bun.sleep(50);
}

// ── 4. SIGINT 旧进程（= graceful_stop_slot） ────────────────────────────
t0 = Date.now();
oldProc.kill("SIGINT");

// ── 5. 等 canary 拿到锁并 ready ─────────────────────────────────────────
const canaryReadyMs = await waitFor(
  async () => {
    const r = await probeSlot("ready");
    return r.ok && r.slot === "nolo-next";
  },
  "canary ready"
);

await Bun.sleep(1500);
stop = true;
await traffic;
oldProc.kill("SIGKILL");
canaryProc.kill("SIGKILL");
await Bun.sleep(300);
rmSync(path.dirname(dbPath), { recursive: true, force: true });

// ── 6. 报告：只看 SIGINT 之后的样本 ─────────────────────────────────────
const window = samples.filter((s) => s.t >= t0).map((s) => ({ ...s, t: s.t - t0 }));
window.sort((a, b) => a.t - b.t);
// 404 = dialog 不存在，说明鉴权已通过、DB 可读，算正常业务响应。
// 只有 401（误判账号）、5xx（服务不可用）、连接错误才算「用户看到故障」。
const isServed = (s: Sample) =>
  typeof s.status === "number" && s.status !== 401 && s.status < 500;
const bad = window.filter((s) => !isServed(s));
const lastBad = bad.at(-1);

const byStatus = new Map<string, { n: number; body: string }>();
for (const s of window) {
  const key = String(s.status);
  const cur = byStatus.get(key);
  if (cur) cur.n += 1;
  else byStatus.set(key, { n: 1, body: s.body.replace(/\s+/g, " ") });
}

console.log(`\n=== 蓝绿交接实测（load=${withLoad ? "有在途请求" : "空闲"}，defer=${withDefer ? "开" : "关"}，流量 50 req/s）===`);
console.log(`  canary 启动就绪：SIGINT 前 ${canaryListenerMs}ms`);
console.log(`  canary DB ready    ：SIGINT 后 ${canaryReadyMs}ms   ← 锁交接耗时`);
console.log(`  SIGINT 后样本 ${window.length} 个：`);
for (const [status, v] of byStatus) console.log(`     ${status.padEnd(6)} n=${String(v.n).padStart(3)}  ${v.body}`);
console.log(`  故障响应（401/5xx/连接错误）共 ${bad.length} 个${lastBad ? `，最后一个在 SIGINT 后 ${lastBad.t}ms` : ""}`);
console.log(`  最长单请求等待：${Math.max(...window.map((s) => s.ms))}ms`);
console.log(`  用户可见缺口：${bad.length === 0 ? "0（无失败请求）" : `${lastBad!.t}ms`}\n`);
