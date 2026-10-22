// scripts/dev/staticImportClosure.js
// 从 esbuild metafile.outputs 计算某个输出文件的静态 import 传递闭包（BFS，去重，
// 不跟随 dynamic-import）。用于 SSR 在 <head> 一次性输出 modulepreload，消除
// entry → chunk → chunk 的串行发现瀑布。

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
 * @param {Record<string, { imports?: Array<{ path?: unknown; kind?: unknown }> }> | undefined} outputs
 * @param {string} startPath metafile 中的输出路径（例：public/assets/entry-XXX.js）
 * @returns {string[]} 公共 URL 列表：起点在首位，随后为按 BFS 顺序去重的静态依赖
 */
export const collectStaticImportClosure = (outputs, startPath) => {
  if (!outputs || typeof startPath !== "string" || !startPath) return [];
  const visited = new Set([startPath]);
  const order = [startPath];
  const queue = [startPath];
  while (queue.length > 0) {
    const current = queue.shift();
    const imports = outputs[current]?.imports || [];
    for (const item of imports) {
      if (item?.kind !== "import-statement" || typeof item.path !== "string") continue;
      if (visited.has(item.path)) continue;
      visited.add(item.path);
      order.push(item.path);
      queue.push(item.path);
    }
  }
  return Array.from(new Set(order.map(toPublicUrl)));
};
