/**
 * Lazy-loading shim for the `level` package.
 *
 * esbuild alias 把 bundle 里所有 `import { Level } from "level"` 指向本文件。
 * 真正的 `level`（及其 native 依赖 classic-level）只在第一次 `new Level(...)` 时
 * 通过 createRequire 同步加载，避免 `node index.js --help` 等不需要数据库的
 * 命令在启动时加载 native .node binding（Linux 上会阻塞事件循环）。
 */
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
let _RealLevel;

function ensureLevel() {
  if (!_RealLevel) {
    _RealLevel = _require("level").Level;
  }
  return _RealLevel;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Level {
  constructor(...args) {
    const RealLevel = ensureLevel();
    // 返回真实实例会替换 this（JS 构造器语义）
    return new RealLevel(...args);
  }
}
