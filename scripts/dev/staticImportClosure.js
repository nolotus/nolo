// scripts/dev/staticImportClosure.js
// 从 esbuild metafile.outputs 计算某个输出文件的静态 import 传递闭包（BFS，去重，
// 不跟随 dynamic-import）。用于 SSR 在 <head> 一次性输出 modulepreload，消除
// entry → chunk → chunk 的串行发现瀑布。
//
// 为什么需要预算上限（2026-11-19 实测）：无限制展开时线上 entry 闭包是 88–91 个 chunk
// （1102KB raw），首屏 800ms 内就发起 95 个请求 / 605KB，FCP 被拖到 2.7s 而 TTFB 只有
// 0.7s。截断只影响「提前加载的提示」，不改变模块依赖：被截掉的 chunk 仍由浏览器顺着
// import 链按需加载，所以这是纯性能权衡，不是功能开关。

/**
 * 把 metafile 中的输出路径转换成浏览器可访问的 URL。
 * @param {string} path
 */
export const toPublicUrl = (path) => {
  if (path.startsWith("/")) return path;
  if (path.startsWith("public/")) return `/${path}`;
  return `/public/${path.replace(/^\/+/, "")}`;
};

/**
 * 默认 preload 预算：文件数与 raw 字节数上限（约等于 entry + 首屏直接依赖）。
 * 可通过 NOLO_WEB_PRELOAD_MAX_FILES / NOLO_WEB_PRELOAD_MAX_BYTES 覆盖（见 resolvePreloadBudget）。
 */
export const DEFAULT_PRELOAD_BUDGET = Object.freeze({ maxFiles: 14, maxBytes: 300 * 1024 });

/** 只接受纯十进制正整数字符串；`1e3`、`300KB`、`12.5`、`0x20` 一律视为非法并回落默认。 */
const DECIMAL_INT_RE = /^\d+$/;

const readBudgetInt = (raw, fallback) => {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!DECIMAL_INT_RE.test(trimmed)) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * 从环境变量解析 preload 预算。非法值（未设置、空串、纯空白、0、负数、数字前缀/单位后缀、
 * 超安全整数）一律回落到 DEFAULT_PRELOAD_BUDGET，避免一次误配把预加载静默压到只剩 entry。
 * @param {Record<string, string | undefined>} [env]
 */
export const resolvePreloadBudget = (env = process.env) => ({
  maxFiles: readBudgetInt(env?.NOLO_WEB_PRELOAD_MAX_FILES, DEFAULT_PRELOAD_BUDGET.maxFiles),
  maxBytes: readBudgetInt(env?.NOLO_WEB_PRELOAD_MAX_BYTES, DEFAULT_PRELOAD_BUDGET.maxBytes),
});

/**
 * @param {Record<string, { imports?: Array<{ path?: unknown; kind?: unknown }>; bytes?: number }> | undefined} outputs
 * @param {string} startPath metafile 中的输出路径（例：public/assets/entry-XXX.js）
 * @param {{ maxFiles?: number; maxBytes?: number }} [options]
 *   预算上限：按 BFS 顺序（entry 优先、浅层优先）收集，达到上限即停止。
 *   不传时行为与旧实现完全一致（无限闭包）。
 *   语义边界：entry 本身无条件保留（即使它单独就超过 maxBytes）；只有「入选后续 chunk」
 *   受预算约束，且单个候选超额时跳过它、继续尝试后面的小候选。
 * @returns {string[]} 公共 URL 列表：起点在首位，随后为按 BFS 顺序去重的静态依赖
 */
export const collectStaticImportClosure = (outputs, startPath, options = {}) => {
  if (!outputs || typeof startPath !== "string" || !startPath) return [];
  const limitFiles =
    typeof options.maxFiles === "number" &&
    Number.isSafeInteger(options.maxFiles) &&
    options.maxFiles > 0
      ? options.maxFiles
      : Number.POSITIVE_INFINITY;
  const limitBytes =
    typeof options.maxBytes === "number" &&
    Number.isFinite(options.maxBytes) &&
    options.maxBytes > 0
      ? options.maxBytes
      : Number.POSITIVE_INFINITY;

  const visited = new Set([startPath]);
  const order = [startPath];
  const queue = [startPath];
  let totalBytes = Number(outputs[startPath]?.bytes) || 0;

  outer: while (queue.length > 0) {
    const current = queue.shift();
    const imports = outputs[current]?.imports || [];
    for (const item of imports) {
      if (item?.kind !== "import-statement" || typeof item.path !== "string") continue;
      if (visited.has(item.path)) continue;
      if (order.length >= limitFiles) break outer;
      const bytes = Number(outputs[item.path]?.bytes) || 0;
      // 单个 chunk 超预算 → 跳过它，但继续看后面的小 chunk，避免一个大 chunk 把预算吃光
      if (totalBytes + bytes > limitBytes) continue;
      visited.add(item.path);
      order.push(item.path);
      queue.push(item.path);
      totalBytes += bytes;
    }
  }

  return Array.from(new Set(order.map(toPublicUrl)));
};
