/**
 * Desktop dev 编排：先完成一次性 web 构建，再并发起 esbuild watch 与
 * electrobun dev。
 *
 * 为什么不像以前那样用 concurrently 直接并发：electrobun 的 pre-build 会把
 * public/assets 复制进 app 包，而 esbuild 首次构建会先清空 chunks 目录再重写。
 * 两者并发时 pre-build 可能复制到半成品快照（entry.js 是新的、chunks 是旧的），
 * 打出来的应用黑屏且无任何报错。先串行完成首轮构建即可消除这个竞态；
 * 之后的增量重建由 pre-build 的快照一致性重试兜底。
 */
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const desktopRoot = resolve(import.meta.dir, "..");

const spawnInherit = (argv: string[], cwd: string, env: Record<string, string> = {}) =>
  Bun.spawn(argv, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

// 1) 首轮一次性 web 构建（dev 模式），保证 electrobun pre-build 复制到完整快照。
const initialBuild = spawnInherit(
  [process.execPath, "./scripts/dev/esBuild.js"],
  repoRoot,
  { NODE_ENV: "development" },
);
if ((await initialBuild.exited) !== 0) {
  console.error("[dev] initial web build failed; desktop dev not started");
  process.exit(1);
}

// 2) 并发起 watch 与 desktop dev；任一退出则带走另一个（同 concurrently -k）。
const children = [
  spawnInherit([process.execPath, "./scripts/dev/esDev.js"], repoRoot, {
    NODE_ENV: "development",
  }),
  spawnInherit([process.execPath, "run", "dev:electrobun"], desktopRoot),
];

const shutdown = (code: number) => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
};
process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

const exits = children.map((child) => child.exited);
const firstExit = await Promise.race(exits);
shutdown(firstExit);
