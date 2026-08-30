import { homedir } from "node:os";
import path from "node:path";

type EnvLike = Record<string, string | undefined>;

export type ResolveServerDbPathOptions = {
  env?: EnvLike;
  homeDir?: string;
  cwd?: string;
};

export function resolveServerDbPath(options: ResolveServerDbPathOptions = {}) {
  const env = options.env ?? process.env;
  return env.NOLO_SERVER_DB_PATH?.trim() || path.join(options.cwd ?? process.cwd(), "data", "leveldb");
}

export function resolveNoloHome(options: ResolveServerDbPathOptions = {}) {
  const env = options.env ?? process.env;
  return env.NOLO_HOME?.trim() || path.join(options.homeDir ?? homedir(), ".nolo");
}

/**
 * 本地 dialog 读取的数据目录回退链（按优先级）：
 * 1. `<cwd>/data/leveldb`（或显式 NOLO_SERVER_DB_PATH）——存储方对应当前环境的既有语义，保持不变；
 * 2. `NOLO_HOME/data/leveldb`（默认 `~/.nolo/data/leveldb`）——宿主 fork 出去的 agent run 把
 *    dialog 写进 NOLO_HOME，而 CLI 在仓库目录里读不到它的缺陷修复（读不到 key 时回退再查一次）。
 *
 * 相同路径去重（例如 cwd 恰为 NOLO_HOME 时只有一项）。调用方负责逐个尝试并区分
 * 「库不存在 / 被锁打不开 / key 不存在」。
 */
export function resolveLocalDialogDbCandidates(
  options: ResolveServerDbPathOptions = {}
): string[] {
  const candidates = [resolveServerDbPath(options)];
  const noloHomeDb = path.join(resolveNoloHome(options), "data", "leveldb");
  if (!candidates.includes(noloHomeDb)) candidates.push(noloHomeDb);
  return candidates;
}
