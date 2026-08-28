/**
 * 部署窗口探针：复现「canary 已在监听、但 LevelDB 锁还被旧进程占着」的那几秒，
 * 用**真实 HTTP + 真实 token + 真实 server 进程**测量客户端到底收到什么。
 *
 * 这不是单测，是可复跑的实验（起完整 server，秒级）。用法：
 *   bun scripts/dev/deployWindowProbe.ts            # 默认占锁 10s
 *   bun scripts/dev/deployWindowProbe.ts --hold=6000 --port=38997
 *
 * 输出：按时间线统计每个响应状态码，以及首个 200 的时刻。
 * 判据：窗口内不得出现 401（那是把「存储不可用」误判成「账号无效」），
 * 锁释放后必须自愈到 200。
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

const USER_ID = "probe-user";
const openDb = (dbPath: string) =>
  new Level<string, any>(dbPath, { valueEncoding: safeJsonEncoding });

// ── role: holder ──────────────────────────────────────────────────────────
// 扮演「旧进程」：先把 LevelDB 锁攥住 holdMs，再释放。
if (process.argv.includes("--role=holder")) {
  const dbPath = process.env.PROBE_DB_PATH!;
  const holdMs = arg("hold", 10_000);
  const db = openDb(dbPath);
  await db.open();
  console.log("HOLDER_READY");
  await Bun.sleep(holdMs);
  await db.close();
  console.log("HOLDER_RELEASED");
  process.exit(0);
}

// ── role: orchestrator ────────────────────────────────────────────────────
const holdMs = arg("hold", 10_000);
const port = arg("port", 38997);
const probeWindowMs = holdMs + 4_000;

const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "nolo-probe-")), "leveldb");

// 1. 播种一个正常账号（有 publicKey、有余额、未禁用）
const { publicKey, secretKey } = generateKeyPairFromSeedV1("deploy-window-probe");
{
  const db = openDb(dbPath);
  await db.open();
  await db.put(`user:${USER_ID}`, {
    id: USER_ID,
    username: "probe",
    publicKey,
    balance: 100,
    isDisabled: false,
  });
  await db.close();
}
const nowSec = Math.floor(Date.now() / 1000);
const token = signToken(
  { userId: USER_ID, username: "probe", iat: nowSec, nbf: nowSec - 60 },
  secretKey
);

// 2. 旧进程占锁
const holder = Bun.spawn(
  ["bun", import.meta.path, "--role=holder", `--hold=${holdMs}`],
  { env: { ...process.env, PROBE_DB_PATH: dbPath }, stdout: "pipe", stderr: "inherit" }
);
const holderOut = holder.stdout.getReader();
const decoder = new TextDecoder();
while (true) {
  const { value, done } = await holderOut.read();
  if (done) break;
  if (decoder.decode(value).includes("HOLDER_READY")) break;
}

// 3. canary 起来：listener 立刻可用，DB 还在等锁
const server = Bun.spawn(["bun", path.join(import.meta.dir, "../../packages/server/entry.ts")], {
  env: {
    ...process.env,
    NOLO_SERVER_DB_PATH: dbPath,
    HTTP_PORT: String(port),
    NOLO_DISABLE_HTTPS: "1",
    NOLO_DISABLE_BACKGROUND_WORKERS: "1",
    NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS: String(holdMs + 15_000),
  },
  stdout: process.env.PROBE_VERBOSE === "1" ? "inherit" : "ignore",
  stderr: process.env.PROBE_VERBOSE === "1" ? "inherit" : "ignore",
});

const t0 = Date.now();
const samples: { t: number; ms: number; status: number | string; body: string }[] = [];
const url = `http://127.0.0.1:${port}/api/dialog/probe-dialog/billing`;

// 4. 每 100ms **并发**打一次带 token 的真实请求（不等上一个回来），
//    模拟窗口期持续到达的真实流量，同时压到 park 队列。
const inflight: Promise<void>[] = [];
while (Date.now() - t0 < probeWindowMs) {
  const at = Date.now() - t0;
  inflight.push(
    (async () => {
      try {
        const res = await fetch(url, {
          headers: { authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        });
        const body = (await res.text()).slice(0, 160);
        samples.push({ t: at, ms: Date.now() - t0 - at, status: res.status, body });
      } catch (e: any) {
        samples.push({
          t: at,
          ms: Date.now() - t0 - at,
          status: e?.name ?? "ERR",
          body: String(e?.message ?? e).slice(0, 120),
        });
      }
    })()
  );
  await Bun.sleep(100);
}
await Promise.all(inflight);
samples.sort((a, b) => a.t - b.t);

server.kill();
holder.kill();
await Bun.sleep(200);
rmSync(path.dirname(dbPath), { recursive: true, force: true });

// 5. 报告
const byStatus = new Map<string, { n: number; firstAt: number; lastAt: number; maxMs: number; sample: string }>();
for (const s of samples) {
  const key = String(s.status);
  const cur = byStatus.get(key);
  if (cur) {
    cur.n += 1;
    cur.lastAt = s.t;
    cur.maxMs = Math.max(cur.maxMs, s.ms);
  } else {
    byStatus.set(key, { n: 1, firstAt: s.t, lastAt: s.t, maxMs: s.ms, sample: s.body });
  }
}
const firstAuthPassed = samples.find(
  (s) => typeof s.status === "number" && s.status !== 401 && s.status !== 503
);
const auth401 = samples.filter((s) => s.status === 401);

console.log(`\n=== deploy-window probe (hold=${holdMs}ms, samples=${samples.length}) ===`);
for (const [status, v] of byStatus) {
  console.log(
    `  ${status.padEnd(6)} n=${String(v.n).padStart(3)}  发出于 ${String(v.firstAt).padStart(6)}ms → ${String(v.lastAt).padStart(6)}ms  最长等待 ${String(v.maxMs).padStart(5)}ms  ${v.sample.replace(/\s+/g, " ")}`
  );
}
console.log(`  auth first passed at: ${firstAuthPassed ? `${firstAuthPassed.t}ms` : "NEVER"}`);
console.log(`  401 count   : ${auth401.length}${auth401.length ? `  (${auth401[0].t}ms → ${auth401[auth401.length - 1].t}ms)` : ""}`);
console.log(auth401.length === 0 && firstAuthPassed ? "  VERDICT: PASS\n" : "  VERDICT: FAIL\n");
