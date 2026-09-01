/**
 * AGENTS.md 工作区指令读取（三 host 共享的唯一实现）。
 *
 * TUI（tuiTurnRunner）、CLI（agentRunCommand）、desktop
 * （desktopAgentRuntimeTurnService）此前各手写一份：同样的
 * AGENTS.md → CLAUDE.md 回退、同样的 8KB 截断、同样的 marker。
 * 手写副本必然漂移，此处收敛为单一实现。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildAgentsMdLayer, type TurnContextLayer } from "./turnContext";

const AGENTS_MD_MAX_BYTES = 8192;
const AGENTS_MD_CANDIDATES = ["AGENTS.md", "CLAUDE.md"] as const;

/**
 * 从工作区根目录读取 AGENTS.md（缺失时回退 CLAUDE.md），返回 canonical
 * agents-md layer（session-scope）；都不存在或不可读时返回 null。
 * 超过 8KB 截断并追加 `<!-- AGENTS.md truncated -->` 标记。
 */
export function readAgentsMdLayerFromDisk(cwd: string): TurnContextLayer | null {
  for (const name of AGENTS_MD_CANDIDATES) {
    const filePath = join(cwd, name);
    if (!existsSync(filePath)) continue;
    try {
      let content = readFileSync(filePath, "utf8").trim();
      if (!content) continue;
      if (Buffer.byteLength(content, "utf8") > AGENTS_MD_MAX_BYTES) {
        content =
          Buffer.from(content, "utf8").subarray(0, AGENTS_MD_MAX_BYTES).toString("utf8") +
          "\n\n<!-- AGENTS.md truncated -->";
      }
      return buildAgentsMdLayer(content, name);
    } catch {
      /* skip unreadable */
    }
  }
  return null;
}
