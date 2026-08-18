// scripts/verify/verifyServerImports.ts
// server 入口 import 健康检查（写码层兜底），两道检查：
//
// 1) bun build 静态解析：对入口模块解析完整 import 图（不执行模块体，避免副作用挂起），
//    解析失败（Could not resolve / ModuleNotFound）→ 失败。
// 2) 相对 import 存在性扫描：正则扫描 packages/server 下全部 .ts/.tsx/.js/.jsx 文件，
//    校验每个相对 import（'./'、'../'）目标存在。弥补 bun build 对「未使用 import」的
//    tree-shake 盲区（未使用的坏 import 不会被 build 解析到）。
//
// 背景：2026-08-13 生产故障 —— chatHandler.ts 一处相对路径漏 ../（import 不存在的
// ./agentAvailability/agentAvailability）未被任何本地检查拦住，上线后崩溃重启循环。
// 本脚本作为硬门：pre-push hook 与 nolo-ci main-web-release 的 verify-server-imports
// phase 都会跑它，坏 import 在部署前必然失败。
//
// 用法：
//   bun scripts/verify/verifyServerImports.ts                    # 默认：入口解析 + server 扫描
//   bun scripts/verify/verifyServerImports.ts --modules a,b      # 自定义入口清单（负例测试）
//   bun scripts/verify/verifyServerImports.ts --scan-dir <dir>   # 自定义静态扫描目录
//   bun scripts/verify/verifyServerImports.ts --no-static-scan   # 只跑入口解析
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const DEFAULT_MODULES = [
  "./packages/server/handlers/chatHandler.ts",
  "./packages/server/handlers/chatProxyRouting.ts",
  "./packages/server/handlers/chatUpstreamRetry.ts",
  "./packages/server/handlers/chatAntigravityOAuth.ts",
  "./packages/server/handlers/chatClaudeOAuth.ts",
  "./packages/server/handlers/chatCodexOAuth.ts",
  "./packages/server/handlers/agentRun/loop.ts",
  "./packages/server/databaseRoutes.ts",
  "./packages/server/agentAvailability/agentAvailability.ts",
];
const DEFAULT_SCAN_DIR = "./packages/server";

function argvValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx === -1 ? undefined : argv[idx + 1];
}

function parseModules(argv: string[]): string[] {
  const raw = argvValue(argv, "--modules");
  if (!raw) return DEFAULT_MODULES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------- 检查 1：bun build 静态解析 ----------
function checkBunBuild(modules: string[]): string[] {
  const failed: string[] = [];
  for (const mod of modules) {
    const outDir = mkdtempSync(join(tmpdir(), "verify-server-imports-"));
    const r = spawnSync("bun", ["build", mod, "--target=bun", "--packages=external", "--outdir", outDir], {
      encoding: "utf8",
      timeout: 120_000,
    });
    rmSync(outDir, { recursive: true, force: true });
    if (r.status === 0) {
      console.log(`✅ [resolve] ${mod}`);
      continue;
    }
    failed.push(mod);
    const stderr = (r.stderr ?? "").trim();
    const firstError = stderr
      .split("\n")
      .find((line) => /error|Cannot find module|Could not resolve/i.test(line));
    console.error(`❌ [resolve] ${mod}`);
    console.error(`   ${firstError ?? stderr.split("\n")[0] ?? `exit ${r.status}`}`);
  }
  return failed;
}

// ---------- 检查 2：相对 import 存在性扫描 ----------
const REL_IMPORT_RE = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'](\.[^"']+)["']/g;

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const ent of readdirSync(cur, { withFileTypes: true })) {
      const p = join(cur, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") continue;
        stack.push(p);
      } else if (ent.isFile() && /\.(ts|tsx|js|jsx)$/.test(ent.name)) {
        out.push(p);
      }
    }
  }
  return out;
}

function resolveImportCandidates(baseDir: string, spec: string): string[] {
  const target = resolve(baseDir, spec);
  const cands: string[] = [];
  // 目标本身是文件才算（裸目录不是合法 import 目标——目录需经 index.* / package.json 解析）
  if (existsSync(target) && statSync(target).isFile()) cands.push(target);
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) cands.push(target + ext);
  for (const idx of ["index.ts", "index.tsx", "index.js", "index.jsx"]) cands.push(join(target, idx));
  cands.push(join(target, "package.json"));
  return cands;
}

// 字符串感知扫描：定位所有字符串字面量区间（模板字符串、单/双引号字符串），
// 静态 import ... from 的相对路径在原始内容上匹配，但要求 `from` 关键字位于
// 字符串区间之外 —— 真实 import 的 from 在代码层；测试内嵌片段
// （`import App from "./App"`、toContain('import("...")')）整体在字符串内，跳过。
// 说明：动态 import()/require() 的相对路径不在此检查范围（多为运行时构造，误报率高；
// 真实故障场景均为静态 from 语句，由 STATIC_FROM_RE 覆盖）。
function stringRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const push = (m: RegExpMatchArray) => {
    if (m.index !== undefined) ranges.push([m.index, m.index + m[0].length]);
  };
  for (const m of content.matchAll(/`[^`]*`/g)) push(m);
  for (const m of content.matchAll(/"(?:[^"\\]|\\.)*"/g)) push(m);
  for (const m of content.matchAll(/'(?:[^'\\]|\\.)*'/g)) push(m);
  return ranges.sort((a, b) => a[0] - b[0]);
}

const STATIC_FROM_RE = /from\s*["'](\.[^"']+)["']/g;

function scanRelativeImports(scanDir: string): Array<{ file: string; spec: string }> {
  const bad: Array<{ file: string; spec: string }> = [];
  const cwd = process.cwd();
  for (const file of collectSourceFiles(scanDir)) {
    const raw = readFileSync(file, "utf8");
    const ranges = stringRanges(raw);
    STATIC_FROM_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = STATIC_FROM_RE.exec(raw)) !== null) {
      const fromStart = m.index; // `from` 关键字起始位置
      if (ranges.some(([s, e]) => fromStart >= s && fromStart < e)) continue; // 字符串内嵌，跳过
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const cands = resolveImportCandidates(dirname(file), spec);
      if (!cands.some((c) => existsSync(c))) {
        bad.push({ file: file.startsWith(cwd) ? file.slice(cwd.length + 1) : file, spec });
      }
    }
  }
  return bad;
}

// ---------- main ----------
const argv = process.argv.slice(2);
const modules = parseModules(argv);
const scanDir = argvValue(argv, "--scan-dir") ?? DEFAULT_SCAN_DIR;
const doStaticScan = !argv.includes("--no-static-scan");

const failedModules = checkBunBuild(modules);
let staticFailures: Array<{ file: string; spec: string }> = [];
if (doStaticScan) {
  console.log(`\n🔍 scanning relative imports under ${scanDir} ...`);
  staticFailures = scanRelativeImports(scanDir);
  for (const f of staticFailures) {
    console.error(`❌ [static] ${f.file} → unresolved relative import "${f.spec}"`);
  }
  if (staticFailures.length === 0) console.log(`✅ relative imports under ${scanDir} all resolve.`);
}

const total = failedModules.length + staticFailures.length;
if (total > 0) {
  console.error(
    `\n❌ ${total} import problem(s): ${failedModules.length} entry resolve + ${staticFailures.length} static. ` +
      `Fix the broken imports before pushing.`
  );
  process.exit(1);
}
console.log(`\n✅ All ${modules.length} server entry modules resolve cleanly; relative imports OK.`);
