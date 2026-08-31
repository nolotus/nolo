/**
 * TUI history memory benchmark.
 *
 * Run with:
 *   bun --expose-gc packages/cli/tui/__bench__/memoryBench.ts
 *
 * Every measurement is made in a fresh Bun process.  The `--baseline` module
 * is generated from `git show alpha:...`, so the numbers below compare the
 * checked-out implementation with the actual alpha implementation rather
 * than with a hand-written approximation.
 */
import { join } from "node:path";

process.env.NOLO_CLI_COLOR = "1";

const benchDir = join(import.meta.dir, "..");
const currentModule = join(benchDir, "tuiHistory.ts");
const baselineModule = join(benchDir, "tuiHistory.alpha.memoryBench.ts");
/** Capacities swept by scenario D; each runs in its own derived module + child process. */
const CALIBRATION_CAPACITIES = [16, 32, 64, 128] as const;
const args = new Set(Bun.argv.slice(2));
const scenario = Bun.argv[Bun.argv.indexOf("--scenario") + 1];
const moduleArg = Bun.argv[Bun.argv.indexOf("--module") + 1];

type HistoryApi = {
  createTurnHistory: () => any;
  startTurn: (history: any, role: "user" | "assistant" | "local") => void;
  appendToCurrentTurn: (history: any, content: string) => void;
  finalizeCurrentTurn: (history: any) => void;
  getTurnLayoutRows: (turn: any, width: number, color: boolean, density: string, surface: string) => unknown[];
  getTurnLineCacheStats?: () => { size: number; capacity: number; hits: number; misses: number; evictions: number };
  resetTurnLineCacheStats?: () => void;
};

function gc(): void {
  // The benchmark is intentionally run with --expose-gc.  A few rounds make
  // the result much less sensitive to Bun's nursery timing.
  if (!globalThis.gc) return;
  for (let i = 0; i < 3; i++) globalThis.gc();
}

function payload(size: number, seed: number): string {
  const unit = 1024;
  const chunks: string[] = [];
  let made = 0;
  let n = 0;
  while (made < size) {
    const line = `tool-${seed}-${n++} ` + "x".repeat(unit - 1);
    chunks.push(line);
    made += line.length;
  }
  return chunks.join("\n").slice(0, size);
}

function addTurn(api: HistoryApi, history: any, role: "user" | "assistant" | "local", content: string): void {
  api.startTurn(history, role);
  api.appendToCurrentTurn(history, content);
  api.finalizeCurrentTurn(history);
}

function runA(api: HistoryApi, totalBytes: number) {
  const history = api.createTurnHistory();
  const perTurn = 512 * 1024;
  for (let i = 0; i < totalBytes / perTurn; i++) {
    addTurn(api, history, "assistant", payload(perTurn, i));
  }
  gc();
  for (const turn of history.turns) api.getTurnLayoutRows(turn, 119, false, "compact", "default");
  gc();
  return { heapUsed: process.memoryUsage().heapUsed, storedBytes: history.turns.reduce((n: number, t: any) => n + Buffer.byteLength(t.content), 0), turns: history.turns.length };
}

function runB(api: HistoryApi) {
  const history = api.createTurnHistory();
  const lines = Array.from({ length: 5000 }, (_, i) => `tool output line ${i} ${"y".repeat(96)}`).join("\n");
  addTurn(api, history, "assistant", lines);
  gc();
  const turn = history.turns[0];
  api.getTurnLayoutRows(turn, 119, false, "compact", "default");
  gc();
  return {
    heapUsed: process.memoryUsage().heapUsed,
    originalBytes: Buffer.byteLength(lines),
    storedBytes: Buffer.byteLength(turn.content),
    storedLines: turn.content.split("\n").length,
    marker: turn.content.includes("lines elided"),
    headOk: turn.content.startsWith("tool output line 0"),
    tailOk: turn.content.includes("tool output line 4999"),
  };
}

function runD(api: HistoryApi) {
  if (!api.getTurnLineCacheStats || !api.resetTurnLineCacheStats) throw new Error("D: cache stats API unavailable");
  api.resetTurnLineCacheStats();
  const history = api.createTurnHistory();
  for (let i = 0; i < 500; i++) addTurn(api, history, "assistant", `turn ${i} ${"z".repeat(180)}`);

  // A viewport goes down 10 screens, back up 8, then down 12. Each screen
  // advances by half a viewport (10 turns), so adjacent renders overlap as
  // they do during real wheel/key scrolling. Repeat the route three times.
  const starts: number[] = [];
  for (let round = 0; round < 3; round++) {
    for (let screen = 0; screen < 10; screen++) starts.push(screen * 10);
    for (let screen = 8; screen >= 1; screen--) starts.push(screen * 10);
    for (let screen = 2; screen < 14; screen++) starts.push(screen * 10);
  }
  let peakSize = 0;
  const residentLines = new Map<any, number>();
  for (const first of starts) {
    for (const turn of history.turns.slice(first, first + 20)) {
      const rows = api.getTurnLayoutRows(turn, 119, false, "compact", "default");
      residentLines.delete(turn);
      residentLines.set(turn, rows.length);
      while (residentLines.size > api.getTurnLineCacheStats().capacity) residentLines.delete(residentLines.keys().next().value);
    }
    peakSize = Math.max(peakSize, api.getTurnLineCacheStats().size);
  }
  const final = api.getTurnLineCacheStats();
  const heapSamples: number[] = [];
  for (let i = 0; i < 5; i++) {
    gc();
    heapSamples.push(process.memoryUsage().heapUsed);
  }
  heapSamples.sort((a, b) => a - b);
  return { heapUsed: heapSamples[2], historyTurns: history.turns.length, screens: starts.length, peakSize, hitRate: final.hits / (final.hits + final.misses), cachedLines: [...residentLines.values()].reduce((sum, lines) => sum + lines, 0), final };
}

function runC(api: HistoryApi, totalTurns: number) {
  if (!api.getTurnLineCacheStats || !api.resetTurnLineCacheStats) throw new Error("C: cache stats API unavailable");
  api.resetTurnLineCacheStats();
  const history = api.createTurnHistory();
  let peakSize = 0;
  let windows = 0;
  // Feed the requested total workload in 20-turn viewport batches.  The live
  // history itself is intentionally capped at MAX_TUI_HISTORY_TURNS; using a
  // rolling workload ensures the cache is exercised against both scales.
  for (let first = 0; first < totalTurns; first += 20) {
    for (let i = first; i < Math.min(first + 20, totalTurns); i++) {
      addTurn(api, history, "assistant", `turn ${i} ${"z".repeat(180)}`);
    }
    for (const turn of history.turns.slice(-20)) api.getTurnLayoutRows(turn, 119, false, "compact", "default");
    const stats = api.getTurnLineCacheStats();
    peakSize = Math.max(peakSize, stats.size);
    windows += 1;
  }
  gc();
  return { heapUsed: process.memoryUsage().heapUsed, requestedTurns: totalTurns, retainedTurns: history.turns.length, windows, peakSize, final: api.getTurnLineCacheStats() };
}

if (args.has("--child")) {
  if (!moduleArg || !scenario) throw new Error("child requires --module and --scenario");
  const capacityIndex = Bun.argv.indexOf("--capacity");
  let childModule = moduleArg;
  if (capacityIndex >= 0) {
    const capacity = Bun.argv[capacityIndex + 1];
    childModule = join(benchDir, `tuiHistory.capacity-${capacity}.ts`);
    const source = await Bun.file(moduleArg).text();
    await Bun.write(childModule, source.replace(/const TURN_LINE_CACHE_CAPACITY = \d+;/, `const TURN_LINE_CACHE_CAPACITY = ${capacity};`));
  }
  const api = (await import(childModule)) as HistoryApi;
  let result: unknown;
  if (scenario === "A") result = runA(api, Number(Bun.argv[Bun.argv.indexOf("--bytes") + 1]));
  else if (scenario === "B") result = runB(api);
  else if (scenario === "C") result = runC(api, Number(Bun.argv[Bun.argv.indexOf("--turns") + 1]) || 500);
  else result = runD(api);
  console.log(JSON.stringify(result));
  process.exit(0);
}

const baselineSource = Bun.spawnSync(["git", "show", "alpha:packages/cli/tui/tuiHistory.ts"], { cwd: join(benchDir, "../../..") });
if (baselineSource.exitCode !== 0) throw new Error("unable to read alpha tuiHistory.ts");
await Bun.write(baselineModule, baselineSource.stdout);

function measure(module: string, name: string, extra: string[] = []) {
  const command = [process.execPath, "--expose-gc", import.meta.path, "--child", "--module", module, "--scenario", name, ...extra];
  const result = Bun.spawnSync(command, { cwd: join(benchDir, "../../.."), stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return JSON.parse(new TextDecoder().decode(result.stdout).trim().split("\n").at(-1)!);
}

try {
  const a50 = ["--bytes", String(50 * 1024 * 1024)];
  const a200 = ["--bytes", String(200 * 1024 * 1024)];
  const a = { before: { mb50: measure(baselineModule, "A", a50), mb200: measure(baselineModule, "A", a200) }, after: { mb50: measure(currentModule, "A", a50), mb200: measure(currentModule, "A", a200) } };
  const b = { before: measure(baselineModule, "B"), after: measure(currentModule, "B") };
  const c = { after: measure(currentModule, "C", ["--turns", "500"]) };
  const c2000 = measure(currentModule, "C", ["--turns", "2000"]);
  const d = CALIBRATION_CAPACITIES.map((capacity) => ({ capacity, result: measure(currentModule, "D", ["--capacity", String(capacity)]) }));

  console.log("Scenario A — byte budget (heapUsed bytes; 50 MB vs 200 MB injected; cache lines included)");
  console.log(JSON.stringify(a, null, 2));
  console.log("Scenario B — 5000-line turn compaction (heapUsed and stored bytes)");
  console.log(JSON.stringify(b, null, 2));
  console.log("Scenario C — bounded LRU cache (500-turn and 2000-turn histories)");
  console.log(JSON.stringify({ c, c2000 }, null, 2));
  console.log("Scenario D — reciprocal scrolling (capacity calibration; each capacity is an isolated child process)");
  console.log(JSON.stringify(d, null, 2));
  if (a.after.mb200.heapUsed > a.after.mb50.heapUsed * 1.35) throw new Error("A: heap did not plateau");
  if (!b.after.marker || !b.after.headOk || !b.after.tailOk || b.after.storedLines !== 301 || b.after.storedBytes >= b.after.originalBytes) throw new Error("B: compaction assertion failed");
  if (c.after.final.size > c.after.final.capacity || c.after.peakSize > c.after.final.capacity || c.after.final.evictions <= 0) throw new Error("C: cache bound/eviction assertion failed");
  if (c2000.peakSize !== c.after.peakSize) throw new Error("C: cache peak varies with total history");
  if (c.after.final.misses <= 0 || c.after.windows !== 25) throw new Error("C: cache observation assertion failed");
} finally {
  // Clean up every derived module this run wrote into the source tree: the
  // alpha baseline copy plus one tuiHistory.capacity-<n>.ts per calibrated
  // capacity. Leaving them behind pollutes `git status` and makes grep hits
  // ambiguous between the real module and its bench clones.
  const derived = [baselineModule, ...CALIBRATION_CAPACITIES.map((c) => join(benchDir, `tuiHistory.capacity-${c}.ts`))];
  for (const file of derived) {
    try { await Bun.file(file).delete(); } catch {}
  }
}
