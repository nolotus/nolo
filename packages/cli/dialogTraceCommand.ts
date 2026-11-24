/**
 * `nolo dialog trace <dialogKey> [--json]` 的 CLI 外壳。
 *
 * 只做三件「接线」的事，聚合逻辑全在纯模块 `dialogTrace.ts` 里：
 * 1. 读 dialog 消息（复用 `dialog read` 的本地优先 + 远端回退通道）；
 * 2. 读逐次调用 token 明细（复用 `dialog usage` 的 `collectDialogUsageRecords`，
 *    并且**必须**用目标解析出的同一个 `target.base`，与消息快照同源）；
 * 3. 读 `~/.nolo/runs` 的 run 记录（复用 `listRunRecords`）。
 *
 * 输出契约：
 * - 可选数据源（用量 / run 记录）失败**不中断**：记进 `dataNotes` 后继续产出，
 *   退出码 0 —— 回溯工具在数据不全时仍然有用，但必须诚实标注缺口。
 * - 目标对话本身没读到（消息快照与用量**两者皆失败**且没有任何数据）时，
 *   退出码 1；`--json` 下输出错误 JSON，绝不静默返回 0 假装回溯成功。
 * - `--json` 下所有错误路径（未登录 / 缺参 / 目标解析失败 / 目标读取失败）
 *   都输出 `{ ok: false, error: { code, message } }`，不混普通文本，保证 jq 可解析。
 */
import { toErrorMessage } from "core/errorMessage";
import type { AgentCommandDeps } from "./agentCommandSupport";
import { listRunRecords } from "./agentRunControl";
import { readDialogSnapshot, resolveDialogReadTarget } from "./dialogCommands";
import {
  collectDialogUsageRecords,
  type DialogUsageCollection,
} from "./dialogUsageCommand";
import {
  buildDialogTraceReport,
  formatDialogTraceReport,
  scrubTextForTrace,
  type DialogTraceRunLike,
} from "./dialogTrace";
import { resolveAuthToken } from "./cliEnvHelpers";

const TRACE_USAGE =
  "Usage: nolo dialog trace <dialogKey|dialogId> [--json] [--server-url <url>]\n" +
  "  --json   Print the full DialogTraceReport as JSON (pipe into jq).\n";

/** `--json` 错误对象的稳定错误码（消费方据此分支，不靠 message 文案）。 */
export type DialogTraceErrorCode =
  | "unauthorized"
  | "missing_argument"
  | "invalid_target"
  | "dialog_unreadable";

export type DialogTraceCommandDeps = AgentCommandDeps & {
  /** 注入 dialog 快照读取（测试用；缺省走真实本地/远端通道）。 */
  readSnapshot?: typeof readDialogSnapshot;
  /** 注入 token 明细读取（测试用；缺省与 `dialog usage` 同源）。 */
  collectUsage?: typeof collectDialogUsageRecords;
  /** 注入 run 记录读取（测试用；缺省读 `~/.nolo/runs`）。 */
  listRuns?: (env: NodeJS.ProcessEnv) => readonly DialogTraceRunLike[];
};

export async function runDialogTraceCommand(
  args: string[],
  deps: DialogTraceCommandDeps = {},
): Promise<number> {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  if (args.includes("--help") || args.includes("-h")) {
    output.write(TRACE_USAGE);
    return 0;
  }
  const json = args.includes("--json");
  // 错误通道：`--json` 下只吐合法 JSON（否则普通文本会破坏 jq 解析）。
  const fail = (code: DialogTraceErrorCode, message: string): number => {
    if (json) {
      output.write(
        `${JSON.stringify({ ok: false, error: { code, message } })}\n`,
      );
    } else if (code === "missing_argument") {
      output.write(TRACE_USAGE);
    } else {
      output.write(`[nolo] dialog trace failed: ${message}\n`);
    }
    return 1;
  };

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    return fail(
      "unauthorized",
      "dialog trace requires an auth token. Run `nolo login` or set AUTH_TOKEN.",
    );
  }

  let target: ReturnType<typeof resolveDialogReadTarget>;
  try {
    target = resolveDialogReadTarget(args, env, authToken);
  } catch (error) {
    return fail(
      "invalid_target",
      `dialog trace failed: ${scrubTextForTrace(toErrorMessage(error))}`,
    );
  }
  if (!target) {
    return fail(
      "missing_argument",
      "dialog trace requires a <dialogKey|dialogId> argument.",
    );
  }

  const notes: string[] = [];

  let messages: unknown[] = [];
  let snapshotFailure: string | undefined;
  // 是否真的取得了可用快照（有 msgs 数组）：只靠 `snapshotFailure` 判断会把
  // 「返回了对象但没有 msgs」误当成读取成功，于是既报成功又没有任何数据。
  let hasValidSnapshot = false;
  // 用量查询必须命中与消息快照同一台服务器：快照走 HTTP 且实际成功的候选
  // 地址（`resolvedBase`，见 dialogCommands 的 tryHttpDialogCandidates）优先，
  // 本地存储命中或快照失败时回退到首选地址 target.base。
  let usageServerBase = target.base;
  try {
    const snapshot = (await (deps.readSnapshot ?? readDialogSnapshot)({
      authToken,
      base: target.base,
      dialogId: target.dialogId,
      dialogKey: target.dialogKey,
      fetchImpl: deps.fetchImpl ?? fetch,
      limit: 0,
      readLocalDialog: deps.readLocalDialog,
      readLocalDialogAtDbPath: deps.readLocalDialogAtDbPath,
    })) as
      | {
          msgs?: unknown;
          messages?: unknown;
          source?: unknown;
          resolvedBase?: unknown;
        }
      | undefined;
    const resolvedBase =
      typeof snapshot?.resolvedBase === "string" ? snapshot.resolvedBase.trim() : "";
    if (snapshot?.source === "http" && resolvedBase) usageServerBase = resolvedBase;
    hasValidSnapshot = Boolean(snapshot && Array.isArray(snapshot.msgs));
    // 与 `dialog read` 同一数据形状：快照的消息字段是 `msgs`，且顺序是
    // 「从新到旧」（fetchMessages 契约）；trace 需要时间正序，故翻转一次。
    // `messages` 只是兜底形态（注入的假快照 / 未来结构）。
    const rawMessages = Array.isArray(snapshot?.msgs)
      ? [...(snapshot!.msgs as unknown[])].reverse()
      : snapshot?.messages;
    if (Array.isArray(rawMessages)) {
      messages = rawMessages;
    } else {
      notes.push("dialog 快照未包含消息数组（msgs）：消息统计按空处理");
    }
  } catch (error) {
    // 异常文案可能带凭据（URL / header / 服务端回显）：进 dataNotes 与错误 JSON
    // 之前一律走同一条脱敏链，绝不因为「只是一条错误消息」就明文流出。
    snapshotFailure = scrubTextForTrace(toErrorMessage(error));
    notes.push(`读取 dialog 消息失败：${snapshotFailure}`);
  }

  let usage: DialogUsageCollection = {
    dialogKey: target.dialogKey,
    dialogId: target.dialogId,
    records: [],
    source: "remote",
  };
  let usageFailure: string | undefined;
  try {
    // 显式传已解析的服务器地址：消息快照与用量查询必须命中同一台服务器。
    usage = await (deps.collectUsage ?? collectDialogUsageRecords)(
      args,
      deps,
      {
        dialogKey: target.dialogKey,
        dialogId: target.dialogId,
      },
      usageServerBase,
    );
    if (usage.source === "local") {
      notes.push(
        "远端未返回 usage records：token 明细取自本机 LevelDB（与远端同源同口径）",
      );
    }
  } catch (error) {
    usageFailure = scrubTextForTrace(toErrorMessage(error));
    notes.push(
      `读取 token 明细失败（root.usage 按「无记录」处理）：${usageFailure}`,
    );
  }

  let runs: readonly DialogTraceRunLike[] = [];
  try {
    runs = deps.listRuns
      ? deps.listRuns(env)
      : listRunRecords({ env });
  } catch (error) {
    notes.push(
      `读取 ~/.nolo/runs 失败（子 run 列表按空处理）：${scrubTextForTrace(toErrorMessage(error))}`,
    );
  }

  const report = buildDialogTraceReport({
    dialogKey: target.dialogKey,
    dialogId: target.dialogId,
    messages,
    usageRecords: usage.records,
    runs,
    notes,
  });

  // 目标读取失败判定：未取得有效快照（无 msgs 数组，含「返回对象但缺 msgs」）**且**
  // 没有任何正向数据证明该对话存在（无 usage 记录、无归属该对话的子 run）。此时既
  // 不能像回溯成功一样退 0，也不能把「读不到」说成「读到了但没有明细」。
  if (
    !hasValidSnapshot &&
    usage.records.length === 0 &&
    report.subagents.length === 0
  ) {
    return fail(
      "dialog_unreadable",
      `dialog trace failed: 目标对话 ${target.dialogKey} 完全未读到` +
        `（消息快照：${snapshotFailure ?? "未返回 msgs 数组"}；用量：${usageFailure ?? "无记录"}；子 run：无匹配）`,
    );
  }

  output.write(
    json
      ? `${JSON.stringify(report, null, 2)}\n`
      : formatDialogTraceReport(report),
  );
  return 0;
}
