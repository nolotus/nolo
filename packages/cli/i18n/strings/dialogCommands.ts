/**
 * `nolo dialog ...` command surface diagnostics (read failures + next steps).
 *
 * Separate from `docCommands.ts`, which holds the `nolo doc ...` surface. These
 * messages fire on the dialog read path, where an operator needs the exact
 * local-db-vs-server fallback chain to tell a real IO error from a not-found.
 *
 * `next-step:` stays verbatim in both locales: it is a grep keyword operators
 * and the tests key off, not prose. Same for the LevelDB / NOLO_SERVER names.
 */
export const dialogCommandStrings = {
  "dialogCmd.localDbFallbackChain": {
    en: "    - databases tried (fallback chain: <cwd>/data/leveldb → NOLO_HOME/data/leveldb):",
    zh: "    - 已尝试的数据库（回退链: <cwd>/data/leveldb → NOLO_HOME/data/leveldb）:",
  },
  "dialogCmd.localDbLockedAdvice": {
    en: "    - the local DB is under an exclusive LevelDB lock held by some process (often the current TUI host process itself; local read-only access is unavailable while the lock is held); read this dialog through the server endpoint instead.",
    zh: "    - 本地库正被某个进程持有 LevelDB 排他锁（常常就是当前 TUI 宿主进程自己，本地只读在持锁期间不可用）；请通过 server 端点读取该 dialog。",
  },
  // {0} = optional " (tried: <path> → <path>)" suffix; empty when paths are unknown.
  "dialogCmd.notFoundTriedPaths": {
    en: " (tried: {0})",
    zh: "（已尝试：{0}）",
  },
  "dialogCmd.notFoundNextStep": {
    en: "  next-step: the target dialog may not live on these servers; dialogs of local runs are looked up with the <cwd>/data/leveldb → NOLO_HOME/data/leveldb (default ~/.nolo) fallback chain{0}, so read it through the environment/service that owns that store — a running run can be summarised with `nolo agent status <runId|pid>` or dialog status mode.",
    zh: "  next-step: 目标 dialog 可能不在这些 server 上；本地 run 的对话按 <cwd>/data/leveldb → NOLO_HOME/data/leveldb（默认 ~/.nolo）回退查找{0}，请用存储方对应环境/服务读取，运行中 run 可用 `nolo agent status <runId|pid>` 或 dialog 的 status 模式查摘要。",
  },
  "dialogCmd.connectivityNextStep": {
    en: "  next-step: connection refused / timeout — check that the server NOLO_SERVER/--server points at is reachable and running.",
    zh: "  next-step: 存在连接拒绝/超时，请检查 NOLO_SERVER/--server 指向的 server 是否可达、是否在运行。",
  },
} as const;
