/**
 * 聚焦探针 v2：复刻 writeDialog A 相（hybrid store.read）+ C 相（store.batch）
 * 交替负载，用生产同款 createLegacyServerDb + createCliHybridRecordStore 包装。
 * 目的：确认 0.7-2.1s stall 是否可在包装层下复现，并区分 read vs write 归属。
 * 运行：bun packages/cli/__perf__/levelStallProbe.ts
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createLevelAuthorityStore } from "../../database-engine/levelAuthorityStore";
import { createLegacyServerDb } from "../../database-engine/legacyServerDb";
import { createCliHybridRecordStore } from "../client/hybridRecordStore";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-level-stall2-"));
const db = createLegacyServerDb(createLevelAuthorityStore(dir));
await db.open();
const store = createCliHybridRecordStore({ db, env: {} });

const smallBody = JSON.stringify({ body: "x".repeat(13 * 1024) });

async function oneWrite(i: number) {
  // ── A 相：read dialog record
  const t0 = performance.now();
  const existing = await store.read(`dialog-local-bench`);
  const readMs = performance.now() - t0;

  // ── C 相：batch(dialog + 10 messages)
  const ops = [{ type: "put" as const, key: `dialog-local-bench`, value: { seq: i, title: "t", updatedAt: new Date().toISOString(), ...(existing ?? {}) } }];
  for (let m = 0; m < 10; m++) {
    ops.push({ type: "put" as const, key: `msg-${i}-${m}`, value: { role: "tool", content: "y".repeat(1200), dbKey: `msg-${i}-${m}` } });
  }
  const t1 = performance.now();
  await store.batch(ops);
  const writeMs = performance.now() - t1;

  // ── D 相：token detail + day stats（同 writeLocalTokenRecord）
  const t2 = performance.now();
  await store.write(`token-local-callid-${i}`, { id: `t${i}`, type: "token", cost: 0.01 });
  await store.write(`token-local-2026-08-31`, { id: "s", type: "token", total: i });
  const tokenMs = performance.now() - t2;

  return { readMs, writeMs, tokenMs };
}

const readStalls: string[] = [];
const writeStalls: string[] = [];
const tokenStalls: string[] = [];
for (let i = 0; i < 80; i++) {
  const { readMs, writeMs, tokenMs } = await oneWrite(i);
  if (readMs > 100) readStalls.push(`#${i}:${readMs.toFixed(0)}ms`);
  if (writeMs > 100) writeStalls.push(`#${i}:${writeMs.toFixed(0)}ms`);
  if (tokenMs > 100) tokenStalls.push(`#${i}:${tokenMs.toFixed(0)}ms`);
}
console.log(`read stalls : ${readStalls.length ? readStalls.join(" ") : "none"}`);
console.log(`write stalls: ${writeStalls.length ? writeStalls.join(" ") : "none"}`);
console.log(`token stalls: ${tokenStalls.length ? tokenStalls.join(" ") : "none"}`);
await db.close();
fs.rmSync(dir, { recursive: true, force: true });
