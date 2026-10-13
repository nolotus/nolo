import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Connector 树在不同布局下的相对位置（相对 bundler 产物的 `import.meta.dir`）：
 * - dev / 单仓：`packages/desktop-runtime/handlers` → `../../desktop-chrome-connector`
 *   即 `packages/desktop-chrome-connector`；
 * - 打包（v1 parity）：`Resources/app/bun` → `../../desktop-chrome-connector`
 *   即 `Resources/desktop-chrome-connector`；
 * - 打包（flat Linux）：`Resources/app/bun` 下的 `../integrations/connector`
 *   即 `Resources/app/integrations/connector`；mac 经 post-wrap 后为
 *   `Resources/integrations/connector`。
 *
 * 逐项探测并选取第一个含 `extension/manifest.json` 的目录；全部落空时抛出带完整
 * 候选列表的错误（2026-09-16 修复：此前只探测第一项，flat Linux 安装下连接器
 * 功能因 ENOENT 直接不可用）。
 *
 * 这段逻辑原本在 `desktopChromeConnectorHandler.ts` 里。桌面启动时的自动安装也要用它：
 * 打包后 `import.meta.url` 指向 bundle 目录，任何拿 `dirname(import.meta.url)` 当 connector
 * 根的做法都会指向一个没有 connector 的目录（review 2026-10-02 复现：两个浏览器都 ENOENT）。
 * 放在单独模块里，是为了让 handler 与启动路径共用同一份探测，而不是各写一套。
 */
export const CONNECTOR_ROOT_CANDIDATES = [
  "../../desktop-chrome-connector",
  "../integrations/connector",
  "../../integrations/connector",
  "../integrations/desktop-chrome-connector",
  "../../integrations/desktop-chrome-connector",
] as const;

/** 选取第一个含连接器清单的候选目录；用于测试与诊断。 */
export function pickConnectorRoot(candidates: readonly string[]): string | null {
  for (const dir of candidates) {
    if (existsSync(join(dir, "extension", "manifest.json"))) return dir;
  }
  return null;
}

export function connectorRootFromHere(): string {
  const candidates = CONNECTOR_ROOT_CANDIDATES.map((rel) => resolve(import.meta.dir, rel));
  const found = pickConnectorRoot(candidates);
  if (!found) {
    throw new Error(
      `desktop chrome connector root not found; probed: ${candidates.join(", ")}`,
    );
  }
  return found;
}
