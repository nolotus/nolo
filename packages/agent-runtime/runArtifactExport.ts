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

export type RunArtifactAuditRecord = {
  runId: string;
  kind: "diff";
  key: string;
  ref: ArtifactRef;
};

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

/** 审计记录的序列化口径（CLI 落盘与测试共用同一份，避免两处各写一遍）。 */
export function serializeRunArtifactAudit(record: RunArtifactAuditRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}
