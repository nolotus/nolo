import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type WindowsInstallerRecoverySource =
  | { kind: "tar"; path: string }
  | { kind: "payload-dir"; path: string };

// Payload marker contract mirrors windows-tarball-extract.ts
// (looksLikeWindowsPayload): an electrobun/hutch Windows payload is identified
// by its Resources and bin directories. Requiring Resources/main.js here made
// the recovery path stricter than the post-package path and stranded run
// 34754603578 (GitHub Actions, windows-latest): the electrobun build exited 0
// but recovery reported "neither raw tar nor payload directory is available"
// with no diagnostic about what the build dir actually contained.
const MAX_NESTED_SCAN_DEPTH = 4;
const MAX_NESTED_SCAN_DIRS = 200;
const MAX_ERROR_LISTING_ENTRIES = 40;

const looksLikeWindowsPayloadDir = (path: string): boolean => {
  try {
    return (
      statSync(join(path, "Resources")).isDirectory() &&
      statSync(join(path, "bin")).isDirectory()
    );
  } catch {
    return false;
  }
};

export function findWindowsPayloadDir(
  rootDir: string,
  options: {
    /** 默认 node:fs 的 readdirSync({ withFileTypes: true })；测试注入固定遍历顺序。 */
    readdirFn?: (dir: string) => Array<{ name: string; isDirectory(): boolean }>;
  } = {},
) {
  const visited = { count: 0 };
  const payloadDir = findWindowsPayloadDirNested(
    rootDir,
    options.readdirFn ?? ((dir: string) => readdirSync(dir, { withFileTypes: true })),
    visited,
  );

  if (!payloadDir) {
    throw new Error(
      `Unable to locate Windows desktop payload directory in ${rootDir}`,
    );
  }

  return payloadDir;
}

/**
 * 真正的广度优先：整层目录全部检查完毕（浅层匹配优先于一切深层匹配）才
 * 进入下一层。之前的「先本层扫描再按序递归」本质是 DFS——第一个兄弟子树
 * 深处的匹配会抢先于后面兄弟子树浅处的匹配返回，违反 shallowest-match 语义。
 */
function findWindowsPayloadDirNested(
  rootDir: string,
  readdirFn: (dir: string) => Array<{ name: string; isDirectory(): boolean }>,
  visited: { count: number },
): string | undefined {
  let frontier = [rootDir];
  // 第 depth 层循环检查「相对深度 depth+1」的候选目录；与旧实现一致，
  // 候选最深到相对深度 MAX_NESTED_SCAN_DEPTH + 1。
  for (let depth = 0; depth <= MAX_NESTED_SCAN_DEPTH; depth += 1) {
    const nextFrontier: string[] = [];
    for (const dir of frontier) {
      let entries;
      try {
        entries = readdirFn(dir);
      } catch {
        continue;
      }
      // 浅层优先：先把这一层的每个目录都检查完，绝不提前下潜。
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (visited.count >= MAX_NESTED_SCAN_DIRS) return undefined;
        visited.count += 1;
        const path = join(dir, entry.name);
        if (looksLikeWindowsPayloadDir(path)) return path;
      }
      if (depth >= MAX_NESTED_SCAN_DEPTH) continue;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        nextFrontier.push(join(dir, entry.name));
      }
    }
    frontier = nextFrontier;
  }
  return undefined;
}

function describeDirListing(dir: string): string {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return `  <unreadable: ${code ?? String(error)}>`;
  }

  if (names.length === 0) return "  <empty>";

  const shown = [...names].sort().slice(0, MAX_ERROR_LISTING_ENTRIES);
  const remainder = names.length - shown.length;
  const lines = shown.map((name) => `  ${name}`);
  if (remainder > 0) lines.push(`  ... and ${remainder} more`);
  return lines.join("\n");
}

export function resolveWindowsInstallerRecoverySource(args: {
  buildDir: string;
  rawTarPath: string;
  /** 测试注入固定目录遍历顺序；生产路径用真实 readdirSync。 */
  readdirFn?: (dir: string) => Array<{ name: string; isDirectory(): boolean }>;
}): WindowsInstallerRecoverySource {
  if (existsSync(args.rawTarPath)) {
    return {
      kind: "tar",
      path: args.rawTarPath,
    };
  }

  try {
    return {
      kind: "payload-dir",
      path: findWindowsPayloadDir(args.buildDir, { readdirFn: args.readdirFn }),
    };
  } catch (payloadError) {
    const payloadDetail =
      payloadError instanceof Error && payloadError.message
        ? `\n${payloadError.message}`
        : "";
    throw new Error(
      // Electrobun may have exited 0 and still not left either recovery input
      // (run 34754603578), so do not claim "Electrobun failed" here — list the
      // build dir contents instead so the next run is diagnosable.
      `neither raw tar nor payload directory is available ` +
        `(checked ${args.rawTarPath} and ${args.buildDir})\n` +
        `${args.buildDir} contents:\n${describeDirListing(args.buildDir)}` +
        payloadDetail,
    );
  }
}
