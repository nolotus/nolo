// packages/agent-runtime/runArtifactExport.ts
//
// 块ART2：run 终态自动导出 —— docker 本地通道的 run 结束后，把沙盒工作区的
// 改动导成一份 patch 存进 ArtifactStore，ref 写回审计/run 结果。
//
// 契约（「导出是审计增强，不是 run 结果的成立条件」）：
//   - 本模块**永不抛错**：任何一步失败（execShell 异常、git 非 0、写库失败、
//     审计写失败）都只走 `warn`，返回 null；
//   - 空 diff 不产出空 patch（宁可「没有产物」也不要一份会被误读成
//     「无改动」的证据文件）；
//   - 只导出一次（调用方在 run 收尾处调用），命令固定为
//     `git add -A && git diff --cached --binary`：`-A` 保证新文件也被纳入，
//     `--cached` 保证输出是「相对 HEAD 的完整改动」而不是「工作树 vs 索引」。
//
// 与 ArtifactStore 的分工：本模块只决定「导什么、key 叫什么、失败了怎么办」，
// 字节落哪里由注入的 store 决定（本地目录 / R2）。

import type { ArtifactRef, ArtifactStore } from "./artifactStore";

/** run 终态导出命令：一条 execShell 调用里完成「暂存全部改动 + 取 diff」。 */
export const RUN_DIFF_COMMAND = "git add -A && git diff --cached --binary";
export const RUN_DIFF_CONTENT_TYPE = "text/x-patch";

/** runId 会进 key：只接受文件系统与 URL 都安全的字符集。 */
const SAFE_RUN_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function runDiffArtifactKey(runId: string): string {
  return `runs/${runId}/diff.patch`;
}

/** 单个 worktree 导出的 patch 条目（审计里只留 ref，字节在产物层）。 */
export type RunWorktreeAuditEntry = {
  name: string;
  key: string;
  ref: ArtifactRef;
};

export type RunArtifactAuditRecord = {
  runId: string;
  kind: "diff";
  /** 根工作区 patch 的 key；根工作区无改动时为 null（改动可能只在 worktree 里）。 */
  key: string | null;
  ref: ArtifactRef | null;
  /**
   * `gitignore` 下的 `.worktrees/<name>` 改动：根工作区的 `git add -A` 永远不会
   * 纳入它们，必须按 worktree 单独导出（见 `exportRunWorktreeDiffArtifacts`）。
   */
  worktrees?: RunWorktreeAuditEntry[];
};

/**
 * 枚举沙盒里的 worktree。为什么必须单独导：agent 按仓库规则把改动落在
 * `.worktrees/<name>/`，而 `.gitignore` 忽略该目录 → 根工作区的 `git add -A`
 * 看不见它们，diff 恒为空。实测代价：一次 16 分钟的 run 因此零产物，沙盒
 * 释放后改动彻底消失（导出被设计成「失败只 warn」，所以完全静默）。
 */
export const RUN_WORKTREE_LIST_COMMAND = "git worktree list --porcelain";

/** porcelain 单个 block 的解析结果（`bare` / `prunable` 不能拿去 `git -C`）。 */
export type WorktreeEntry = {
  path: string;
  bare: boolean;
  prunable: boolean;
};

/**
 * 按行状态机解析 porcelain：`worktree <path>` 开新条目，`bare` / `prunable`
 * 作为该条目的标记。不用「按空行切块」——那个假设对多余空行与将来的 `-z`
 * 形态都太脆。
 *
 * **路径不做 trim**：末尾空格是路径的一部分，这里只剥 CR。
 */
export function parseWorktreeEntries(stdout: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  let current: WorktreeEntry | null = null;
  for (const rawLine of String(stdout ?? "").split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length), bare: false, prunable: false };
      continue;
    }
    if (!current) continue;
    if (line === "bare") current.bare = true;
    else if (line.startsWith("prunable")) current.prunable = true;
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * 可逐个导出的 worktree 路径。
 *
 * - **跳过第一个 block**：git 文档保证 `worktree list` 的 main worktree 恒列首位，
 *   而它的 diff 由根导出（`RUN_DIFF_COMMAND`）负责。不跳过就会把同一份 patch
 *   以 `worktrees/<repo>.patch` 再存一遍，并在审计里多一条误导记录。
 * - 跳过 `bare`（没有工作区，`git -C` 必失败）与 `prunable`（目录已不在）。
 */
export function parseWorktreePaths(stdout: string): string[] {
  return parseWorktreeEntries(stdout)
    .slice(1)
    .filter((entry) => !entry.bare && !entry.prunable)
    .map((entry) => entry.path);
}

/** `git -C` 只接受真实目录路径；拒绝空串与 `-` 开头的形态（避免被当成 git flag）。 */
export function isSafeWorktreePath(path: string): boolean {
  if (!path) return false;
  if (path.startsWith("-")) return false;
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\");
}

const UNSAFE_WORKTREE_NAME = /[^A-Za-z0-9._-]+/g;

/** worktree 目录名 → 产物 key 片段（key 只接受文件系统与 URL 都安全的字符集）。 */
export function worktreeArtifactName(path: string): string {
  const trimmed = String(path ?? "").replace(/[/\\]+$/, "");
  const base = trimmed.split(/[/\\]/).pop() ?? "";
  const safe = base.replace(UNSAFE_WORKTREE_NAME, "-").replace(/^[-.]+|[-.]+$/g, "");
  return safe || "worktree";
}

export function worktreeDiffArtifactKey(runId: string, name: string): string {
  return `runs/${runId}/worktrees/${name}.patch`;
}

/** 单个 worktree 的 diff 命令；用 `-C` 而不是 `cd`，避免影响同一通道的后续调用。 */
export function worktreeDiffCommand(path: string): string {
  const quoted = `'${String(path).replace(/'/g, `'\\''`)}'`;
  return `git -C ${quoted} add -A && git -C ${quoted} diff --cached --binary`;
}

export type ExecShellChannelOutput = {
  stdout: string;
  /** backend 输出截断时 fail closed，绝不能把残缺 patch 当完整审计。 */
  truncated?: boolean;
  /** null = 通道没给退出码（此时按 stdout 有无内容判断），非 null = 通道明确报了。 */
  exitCode: number | null;
};

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") return value;
  }
  return null;
}

/**
 * docker 工具通道的 `execShell` 返回的是**字符串**（通常是 JSON 载荷，也可能
 * 是裸文本）。这里做保守解析：解不开就整段当 stdout；解开了但 `ok:false` /
 * 带 `error` 且没有 stdout → 视为非 0 退出（不假装成功地把错误文本当 diff 存）。
 */
export function parseExecShellChannelOutput(raw: string): ExecShellChannelOutput {
  const text = typeof raw === "string" ? raw : "";
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return { stdout: text, exitCode: 0, ...(isTruncated(text) ? { truncated: true } : {}) };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { stdout: text, exitCode: 0, ...(isTruncated(text) ? { truncated: true } : {}) };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { stdout: text, exitCode: 0, ...(isTruncated(text) ? { truncated: true } : {}) };
  }
  const record = parsed as Record<string, unknown>;
  const output = record.output && typeof record.output === "object"
    ? record.output as Record<string, unknown>
    : undefined;
  // dockerSandboxExecutionBackend returns { output: { stdout, stderr } }.
  const stdout = firstString(output?.stdout, record.stdout, record.output, record.content) ?? "";
  const truncated = record.truncated === true || output?.truncated === true ||
    isTruncated(stdout) || isTruncated(firstString(output?.stderr, record.stderr) ?? "");
  const explicitFailure = record.ok === false || typeof record.error === "string";
  const rawExit = record.exitCode ?? record.exit_code;
  const exitCode =
    typeof rawExit === "number" ? rawExit : explicitFailure ? 1 : 0;
  if (explicitFailure && stdout.trim() === "") return { stdout: "", exitCode: exitCode === 0 ? 1 : exitCode, ...(truncated ? { truncated: true } : {}) };
  return { stdout, exitCode, ...(truncated ? { truncated: true } : {}) };
}

/** Matches truncateOutput in dockerSandboxExecutionBackend (default limit: 8,000).
 * We deliberately reject even a literal marker in a patch: a false rejection is
 * safer than recording a partial audit. No command is re-run to bypass the cap.
 */
function isTruncated(text: string): boolean {
  return /…\[truncated \d+ chars\]/u.test(text);
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

export type ExportRunDiffArgs = {
  runId: string;
  store: ArtifactStore;
  /** docker 工具通道：`(toolName, args) => Promise<string>` 的 execShell 绑定。 */
  exec: (command: string) => Promise<string>;
  /** ref 写回审计 / run 结果的落点（CLI 写 `<runsDir>/<runId>.artifacts.json`）。 */
  writeAudit?: (record: RunArtifactAuditRecord) => Promise<void> | void;
  warn?: (message: string) => void;
};

/**
 * 导出 run 终态 diff。返回 ref 表示真的存进产物层；null 表示「本次没有产物」
 * （无改动 / 失败），失败原因只经 `warn` 暴露，调用方不必也无法据此改变 run 结果。
 */
export async function exportRunDiffArtifact(
  args: ExportRunDiffArgs,
): Promise<ArtifactRef | null> {
  const warn = args.warn ?? (() => {});
  if (!SAFE_RUN_ID.test(args.runId)) {
    warn(`run 终态导出跳过（不影响 run 结果）：runId 非法（${args.runId.slice(0, 64)}）`);
    return null;
  }
  const key = runDiffArtifactKey(args.runId);

  let raw: string;
  try {
    raw = await args.exec(RUN_DIFF_COMMAND);
  } catch (error) {
    warn(`run 终态导出失败（不影响 run 结果）：execShell 调用异常：${describeError(error)}`);
    return null;
  }

  const { stdout, exitCode, truncated } = parseExecShellChannelOutput(raw);
  if (truncated) {
    warn("run 终态导出失败（不影响 run 结果）：execShell 输出已截断（truncated），拒绝保存不完整 patch 或写入成功审计");
    return null;
  }
  if (exitCode !== 0) {
    warn(`run 终态导出失败（不影响 run 结果）：${RUN_DIFF_COMMAND} 退出码 ${exitCode}`);
    return null;
  }
  if (stdout.trim() === "") {
    warn("run 终态导出跳过：沙盒工作区无改动，diff 为空");
    return null;
  }

  let ref: ArtifactRef;
  try {
    ref = await args.store.put(key, stdout, { contentType: RUN_DIFF_CONTENT_TYPE });
  } catch (error) {
    warn(`run 终态导出失败（不影响 run 结果）：产物写入失败：${describeError(error)}`);
    return null;
  }

  if (args.writeAudit) {
    const record: RunArtifactAuditRecord = { runId: args.runId, kind: "diff", key, ref };
    try {
      await args.writeAudit(record);
    } catch (error) {
      warn(`run 终态导出审计写入失败（不影响 run 结果）：${describeError(error)}`);
    }
  }

  return ref;
}

export type ExportRunWorktreeDiffsArgs = {
  runId: string;
  store: ArtifactStore;
  exec: (command: string) => Promise<string>;
  warn?: (message: string) => void;
};

export type RunWorktreeDiffSummary = {
  /**
   * 参与导出的 linked worktree 数（**不含主工作区**：它的 diff 由根导出
   * `RUN_DIFF_COMMAND` 负责，见 `parseWorktreePaths` 的 slice(1)）。
   */
  worktrees: number;
  artifacts: RunWorktreeAuditEntry[];
  /** 取到了 diff 但为空（无改动）的 worktree 数。 */
  empty: number;
  /** 取 diff 或写产物失败的 worktree 数。 */
  failed: number;
};

/**
 * 逐个 worktree 导出 diff。与 `exportRunDiffArtifact` 一样永不抛错：任何一步失败
 * 只 `warn`，返回的计数就是可观测证据（调用方据此决定是否告警「有 worktree 但零产物」）。
 */
export async function exportRunWorktreeDiffArtifacts(
  args: ExportRunWorktreeDiffsArgs,
): Promise<RunWorktreeDiffSummary> {
  const warn = args.warn ?? (() => {});
  const summary: RunWorktreeDiffSummary = { worktrees: 0, artifacts: [], empty: 0, failed: 0 };
  if (!SAFE_RUN_ID.test(args.runId)) return summary;

  let listing: string;
  try {
    listing = await args.exec(RUN_WORKTREE_LIST_COMMAND);
  } catch (error) {
    warn(`run 终态导出：枚举 worktree 失败：${describeError(error)}`);
    return summary;
  }
  const parsed = parseExecShellChannelOutput(listing);
  if (parsed.truncated || parsed.exitCode !== 0) {
    warn("run 终态导出：worktree 枚举不可用（输出截断或非 0 退出），跳过 worktree 导出");
    return summary;
  }

  const paths = parseWorktreePaths(parsed.stdout);
  const exportable = paths.filter((path) => isSafeWorktreePath(path));
  if (exportable.length !== paths.length) {
    warn(`run 终态导出：跳过 ${paths.length - exportable.length} 个路径形态不可信的 worktree`);
  }
  summary.worktrees = exportable.length;

  const usedNames = new Map<string, number>();
  for (const path of exportable) {
    const baseName = worktreeArtifactName(path);
    const seen = (usedNames.get(baseName) ?? 0) + 1;
    usedNames.set(baseName, seen);
    const name = seen === 1 ? baseName : `${baseName}-${seen}`;

    let raw: string;
    try {
      raw = await args.exec(worktreeDiffCommand(path));
    } catch (error) {
      summary.failed += 1;
      warn(`run 终态导出：worktree ${name} 取 diff 失败：${describeError(error)}`);
      continue;
    }
    const out = parseExecShellChannelOutput(raw);
    if (out.truncated) {
      summary.failed += 1;
      warn(
        `run 终态导出：worktree ${name} 的 diff 超过 execShell 输出上限被截断，已丢弃` +
          "（不保存不完整 patch；需分段导出或提高通道上限后重跑）",
      );
      continue;
    }
    if (out.exitCode !== 0) {
      summary.failed += 1;
      warn(`run 终态导出：worktree ${name} 的 diff 不可用（非 0 退出），未保存`);
      continue;
    }
    if (out.stdout.trim() === "") {
      summary.empty += 1;
      continue;
    }
    const key = worktreeDiffArtifactKey(args.runId, name);
    try {
      const ref = await args.store.put(key, out.stdout, { contentType: RUN_DIFF_CONTENT_TYPE });
      summary.artifacts.push({ name, key, ref });
    } catch (error) {
      summary.failed += 1;
      warn(`run 终态导出：worktree ${name} 产物写入失败：${describeError(error)}`);
    }
  }

  if (summary.worktrees > 0 && summary.artifacts.length === 0) {
    warn(
      `run 终态导出：${summary.worktrees} 个 worktree 未导出任何 patch（empty=${summary.empty}, failed=${summary.failed}）` +
        (summary.failed > 0 ? " —— 沙盒产出可能随释放丢失" : ""),
    );
  }
  return summary;
}

/** 审计记录的序列化口径（CLI 落盘与测试共用同一份，避免两处各写一遍）。 */
export function serializeRunArtifactAudit(record: RunArtifactAuditRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}
