import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveRunsDir } from "../agentRunControl";

type EnvLike = Record<string, string | undefined>;

/**
 * 收集本机 CLI 派发的 run 所产生的子对话 dialogId。
 *
 * 依据：run 完成时会把其子对话的 dialogId 写入 `<runsDir>/<runId>.json` 的 `dialogId` 字段。
 * 这类子对话在服务端记录上没有可靠的 triggerType 标记，因此需要按本机 run 记录反查。
 *
 * 容错：runs 目录不存在、单个文件损坏、无读权限等情况都不抛错，跳过该条目并返回已收集部分。
 */
export function loadLocalRunChildDialogIds(args: {
  env?: EnvLike;
  homedir?: () => string;
} = {}): Set<string> {
  const ids = new Set<string>();
  const runsDir = resolveRunsDir(args.env, args.homedir);
  let entries: string[];
  try {
    entries = readdirSync(runsDir);
  } catch {
    return ids;
  }
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    try {
      const record = JSON.parse(readFileSync(join(runsDir, name), "utf8"));
      const dialogId = record?.dialogId;
      if (typeof dialogId === "string" && dialogId.trim()) {
        ids.add(dialogId.trim());
      }
    } catch {
      // 损坏或无权限的单个 run 记录：跳过，不影响其余记录。
    }
  }
  return ids;
}
