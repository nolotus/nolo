/**
 * run 终态唤醒观察器——「run 干完后对话自动继续」的检测半边。
 *
 * 它解决的问题：编排 agent 派发后台 run 后，run 到达终态的那一刻模型通常
 * 不在 turn 里，没有任何机制把「它干完了」送进对话——用户只能干等，或者
 * 模型在派发后反复查状态等结果（每次查状态在 transcript 印一张状态卡片，刷屏）。
 *
 * runRegistryPoller 每秒都在读 `~/.nolo/runs/<runId>.json` 喂 dock 面板，
 * 记录里就有终态。这个模块挂在 poller 的 `onRecordsPolled` 出口上，对每
 * tick 读到的记录做「活跃→终态」转变检测，把同一次 tick 里的所有转变合并
 * 成一条结构化 child completion 内部事件（批量派 10 个 review 同时结束不该刷 10 条），
 * 交给调用方/调度器投递。
 *
 * 取舍与规则：
 * - 每个 runId 至多唤醒一次（once-per-run）。
 * - 已经被 wait:true 消费或 marked ack 的 runId 绝不重复唤醒。
 * - 首次见到即终态的 run，只有 startedAt >= watcher 创建时刻才唤醒。
 * - dialog 切换时跳过并不污染状态，恢复当前 dialog 后可正确 drain 唤醒。
 * - ephemeral 或结果缺失的 run 提供 fallback 说明，防止 readDialog 坍塌。
 */

import {
  isRunRecordClaimed,
  readRunRecord,
  type AgentRunControlDeps,
  type RunRecord,
} from "../agentRunControl";
import { readTimestamp } from "../client/agentRunSnapshot";
import {
  clipText,
  formatRunAge,
  isAgentRunTerminalStatus,
  resolveRunLabel,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import {
  normalizeRunCompletionShape,
  type AgentRunCompletionShape,
  type ChildRunCompletedTurnEvent,
  type InternalTurnEvent,
} from "core/chat/internalTurnEvent";

/** 每条 run 的 note 摘要在唤醒消息里的截断长度。 */
const WAKE_NOTE_MAX_CHARS = 300;

export function runDuration(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number = Date.now()
): string {
  return (
    formatRunAge(
      {
        startedAt: readTimestamp(record.startedAt as any),
        finishedAt: readTimestamp((record as any).endedAt ?? (record as any).finishedAt),
      },
      nowMs
    ) ?? ""
  );
}

export function isFailureStatus(status: unknown): boolean {
  return typeof status === "string" && status !== "done";
}

export function describeRun(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number = Date.now()
): string[] {
  const lines = [
    `runId: ${record.runId}`,
    `agent: ${resolveRunLabel(record as any)}`,
    `status: ${record.status}`,
  ];
  // 正常完成的 run 不报 exitCode / 活动计数：那是诊断信息，成功时模型要
  // 的只是「谁干完了、结果去哪取」。「结果去哪取」（childDialogId /
  // ephemeral）任何状态都要给，否则模型会去 readDialog 一个不存在的对话。
  const verbose = isFailureStatus(record.status);
  if (verbose && typeof record.exitCode === "number") {
    lines.push(`exitCode: ${record.exitCode}`);
  }
  if (record.ephemeral) {
    lines.push(`ephemeral: true (no persisted child dialog)`);
  } else if (record.dialogId) {
    lines.push(`childDialogId: ${record.dialogId}`);
  } else {
    lines.push(`childDialogId: missing (result unpersisted)`);
  }
  const duration = runDuration(record, nowMs);
  if (duration) lines.push(`duration: ${duration}`);
  const recordError =
    "error" in record && typeof record.error === "string" ? record.error : undefined;
  const note =
    typeof record.note === "string"
      ? clipText(record.note, WAKE_NOTE_MAX_CHARS)
      : typeof recordError === "string"
      ? clipText(recordError, WAKE_NOTE_MAX_CHARS)
      : "";
  if (note) lines.push(`note: ${note}`);
  const counters = verbose ? record.activity?.counters : undefined;
  if (
    counters &&
    typeof counters.toolCalls === "number" &&
    typeof counters.llmCalls === "number" &&
    typeof counters.fileEdits === "number"
  ) {
    lines.push(
      `activity: ${counters.toolCalls} tool calls · ${counters.llmCalls} llm calls · ${counters.fileEdits} edits`
    );
  }
  return lines;
}

/** 失败 run 错误负载的单条 token 预算（plan：500 token 近似）。 */
export const WAKE_ERROR_PAYLOAD_TOKEN_BUDGET = 500;
/** 整条唤醒消息的 token 上限：多条失败时均摊，防失控日志刷爆上下文。 */
export const WAKE_TOTAL_TOKEN_BUDGET = 2000;

/** XML 属性转义（agent 名/runId 理论上可能带引号或尖括号）。 */
const escapeXmlAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * 按中文感知 token 估算把文本截断到预算内（二分前缀长度）。
 * 估算沿用 estimateContextTokens 的唯一实现 ai/context/tokenUtils。
 */
export function clipTextToTokenBudget(
  text: string,
  budgetTokens: number
): string {
  if (!text || budgetTokens <= 0) return "";
  if (estimateTokenCount(text) <= budgetTokens) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokenCount(text.slice(0, mid)) <= budgetTokens) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo);
}

/** 失败 run 的错误/备注负载，截断到给定 token 预算。 */
function failureErrorPayload(
  record: RunRecord | AgentRunCompletionShape,
  budgetTokens: number
): string {
  if (budgetTokens <= 0) return "";
  const recordError =
    "error" in record && typeof record.error === "string" ? record.error : undefined;
  const raw =
    typeof record.note === "string" && record.note.trim()
      ? record.note
      : typeof recordError === "string" && recordError.trim()
        ? recordError
        : "";
  // 先按字符粗剪封顶，避免超长输入拖慢二分。
  return clipTextToTokenBudget(clipText(raw, 2000), budgetTokens);
}

function buildRunElement(
  record: RunRecord | AgentRunCompletionShape,
  nowMs: number,
  errorBudgetTokens: number
): string {
  const attrs = [
    `runId="${escapeXmlAttribute(String(record.runId))}"`,
    `agent="${escapeXmlAttribute(resolveRunLabel(record as any))}"`,
    `status="${escapeXmlAttribute(String(record.status))}"`,
  ];
  const verbose = isFailureStatus(record.status);
  if (verbose && typeof record.exitCode === "number") {
    attrs.push(`exitCode="${record.exitCode}"`);
  }
  // 「结果去哪取」（ephemeral / childDialogId）任何状态都要给，否则模型会
  // 去 readDialog 一个不存在的对话（同 describeRun 的取舍）。
  if (record.ephemeral) {
    attrs.push(`ephemeral="true"`);
  } else if (record.dialogId) {
    attrs.push(`childDialogId="${escapeXmlAttribute(record.dialogId)}"`);
  } else {
    attrs.push(`childDialogId="missing"`);
  }
  const duration = runDuration(record, nowMs);
  if (duration) attrs.push(`duration="${escapeXmlAttribute(duration)}"`);
  if (!verbose) {
    // 成功 run 不报 exitCode / 活动计数；note 保留为属性（结果指针）。
    const note =
      typeof record.note === "string" && record.note.trim()
        ? clipText(record.note, WAKE_NOTE_MAX_CHARS)
        : "";
    if (note) attrs.push(`note="${escapeXmlAttribute(note)}"`);
    return `<run ${attrs.join(" ")} />`;
  }
  const body: string[] = [];
  const errorText = failureErrorPayload(record, errorBudgetTokens);
  if (errorText) body.push(`error: ${errorText}`);
  const counters = record.activity?.counters;
  if (
    counters &&
    typeof counters.toolCalls === "number" &&
    typeof counters.llmCalls === "number" &&
    typeof counters.fileEdits === "number"
  ) {
    body.push(
      `activity: ${counters.toolCalls} tool calls · ${counters.llmCalls} llm calls · ${counters.fileEdits} edits`
    );
  }
  if (body.length === 0) return `<run ${attrs.join(" ")} />`;
  return `<run ${attrs.join(" ")}>\n${body.join("\n")}\n</run>`;
}

function renderWakeMessage(elements: string[], count: number): string {
  return [
    `<background_run_completion count="${count}">`,
    ...elements,
    `需要完整输出/失败详情时: controlAgentRun(action: "status", runId, tailLines: 30)`,
    `</background_run_completion>`,
  ].join("\n");
}

/**
 * 送进模型的 wake 摘要：ContextualFragment 标记格式（识别契约见
 * chat/messages/contextualFragment.ts）。旧版尾部那段自辩教学文案已删——
 * 处理纪律在 system prompt「多 Agent 编排」段，标记内只留一行取日志提示。
 */
export function buildWakeMessage(
  finished: (RunRecord | AgentRunCompletionShape)[],
  nowMs: number = Date.now()
): string {
  const failedCount = finished.filter((r) => isFailureStatus(r.status)).length;
  // 先量骨架（零错误负载），总预算扣除骨架后按失败条数均摊，单条不超过
  // 500 token；每条再预留余量给 error: 前缀与换行等结构开销。
  const skeleton = renderWakeMessage(
    finished.map((r) => buildRunElement(r, nowMs, 0)),
    finished.length
  );
  const perErrorBudget =
    failedCount > 0
      ? Math.min(
          WAKE_ERROR_PAYLOAD_TOKEN_BUDGET,
          Math.max(
            0,
            Math.floor(
              (WAKE_TOTAL_TOKEN_BUDGET - estimateTokenCount(skeleton)) /
                failedCount -
                8
            ),
          )
        )
      : 0;
  return renderWakeMessage(
    finished.map((r) =>
      buildRunElement(r, nowMs, isFailureStatus(r.status) ? perErrorBudget : 0)
    ),
    finished.length
  );
}

/**
 * 屏幕上那一行。
 *
 * 终态唤醒不是用户说的话，却一直被当成 user message 整段印进 transcript
 * （runId/exitCode/childDialogId/activity 全文），还得在文案里自辩「这是系
 * 统内部事件」——那句自辩本身就是渲染漏了一层的证据。这里给 UI 一行紧凑
 * 摘要，详情留在 dock 面板和子 dialog。
 */
export function buildWakeDisplayText(
  finished: (RunRecord | AgentRunCompletionShape)[],
  nowMs: number = Date.now()
): string {
  const parts = finished.map((record) => {
    const mark = isFailureStatus(record.status) ? "✗" : "✓";
    const duration = runDuration(record, nowMs);
    const label = resolveRunLabel(record as any);
    const status = isFailureStatus(record.status) ? ` ${record.status}` : "";
    return `${mark} ${label}${status}${duration ? ` · ${duration}` : ""}`;
  });
  return `${finished.length} 条后台 run 已完成 · ${parts.join(" · ")}`;
}

/**
 * 投递时刻唤醒事件 ack 复核。
 *
 * 唤醒事件在 watcher observe 时入队，到 readlineWorkspace 真正消费成 turn 之间，
 * 编排者可能已经通过 wait 同步消费了其中的 run（并落盘 ack:true 或持有有效租约）。
 * 此函数在 turn 真正开始前重读磁盘记录，剔除所有已被 claim/ack 的 run。
 */
export function filterUnclaimedChildRuns(
  runs: (RunRecord | AgentRunCompletionShape)[],
  deps: Omit<AgentRunControlDeps, "now"> & { now?: () => number | Date } = {}
): {
  remainingRuns: AgentRunCompletionShape[];
  claimedRunIds: string[];
} {
  const rawNow = deps.now ? deps.now() : Date.now();
  const nowMs = typeof rawNow === "number" ? rawNow : rawNow.getTime();
  const remainingRuns: AgentRunCompletionShape[] = [];
  const claimedRunIds: string[] = [];

  for (const r of runs) {
    const record = readRunRecord(r.runId, deps as AgentRunControlDeps);
    const target = record ?? (r as any);
    if (isRunRecordClaimed(target, nowMs)) {
      claimedRunIds.push(r.runId);
    } else {
      remainingRuns.push(normalizeRunCompletionShape(r));
    }
  }

  return { remainingRuns, claimedRunIds };
}

export type RunCompletionWatcherDeps = {
  /** 当前打开的 dialogId；只有属于当前对话的 run 才唤醒（用户切走了就跳过）。 */
  getCurrentDialogId: () => string | null;
  /** 投递唤醒事件。支持结构化 InternalTurnEvent 或文本 fallback。 */
  onWake: (event: InternalTurnEvent | string) => void;
  now?: () => number;
};

export type RunCompletionWatcher = {
  /** 喂入本 tick 读到的全部记录；对任何单条坏记录免疫。 */
  observe(records: (RunRecord | AgentRunCompletionShape | Record<string, any>)[]): void;
  /** 标记 runId 已被消费（如 wait:true），防重复唤醒。 */
  markAcknowledged(runId: string): void;
  /** 查询 runId 是否已 ack。 */
  isAcknowledged(runId: string): boolean;
  /** 清空观测与已通知状态。 */
  dispose(): void;
};

export function createRunCompletionWatcher(
  deps: RunCompletionWatcherDeps
): RunCompletionWatcher {
  const now = deps.now ?? (() => Date.now());
  const createdAt = now();
  const lastStatusByRunId = new Map<string, string>();
  const notifiedRunIds = new Set<string>();

  return {
    observe(records: (RunRecord | AgentRunCompletionShape | Record<string, any>)[]): void {
      const finished: (RunRecord | AgentRunCompletionShape)[] = [];
      const currentDialogId = deps.getCurrentDialogId();
      for (const rawRecord of records) {
        try {
          if (!rawRecord || typeof rawRecord.runId !== "string" || !rawRecord.runId) continue;
          const record = rawRecord as RunRecord;
          if (notifiedRunIds.has(record.runId)) continue;
          const status = record.status;
          if (typeof status !== "string") continue;
          if (!(record.parentDialogId === currentDialogId || !record.parentDialogId)) continue;
          if (isRunRecordClaimed(record, now())) {
            // claim 生效中：有同步消费者（wait）盯着这条 run，唤醒通道让路。
            // 「有效」很关键——过期的租约（持有者进程已被杀）不算数，否则这
            // 条 run 的完成永远没人来收。
            //
            // 关键：已终态 + 仍在租约期内【不得】提前写入 notifiedRunIds，
            // 且【不得】把 status 记录为终态。
            //
            // 为什么不能记录为终态：若在此处把 lastStatus 记为 "done"，租约
            // 释放后的下一次 tick 读到的 previous 也是 "done"（即终态→终态），
            // 下方 `isAgentRunTerminalStatus(previous)` 会判定「已处理过」并
            // 直接 continue 跳过——结果仍然是永久静默！
            //
            // 只有当这次观察真正进入下方消费流程时，lastStatus 才能被推进到
            // 终态。在租约生效期间，lastStatus 最多停留在它进入租约之前的状
            // 态（或未定义）。
            if (!isAgentRunTerminalStatus(status)) {
              lastStatusByRunId.set(record.runId, status);
            }
            continue;
          }
          const previous = lastStatusByRunId.get(record.runId);
          lastStatusByRunId.set(record.runId, status);
          if (!isAgentRunTerminalStatus(status)) continue;
          if (previous === undefined) {
            const startedMs = readTimestamp(record.startedAt as any);
            if (startedMs === undefined || startedMs < createdAt) continue;
          } else if (isAgentRunTerminalStatus(previous)) {
            continue;
          }
          notifiedRunIds.add(record.runId);
          finished.push(record);
        } catch {
          continue;
        }
      }
      if (finished.length === 0) return;

      const shapes = finished.map((r) => normalizeRunCompletionShape(r));
      const summaryText = buildWakeMessage(finished, now());
      const event: ChildRunCompletedTurnEvent = {
        kind: "child-run-completed",
        runs: shapes,
        text: summaryText,
        displayText: buildWakeDisplayText(finished, now()),
      };

      deps.onWake(event);
    },
    markAcknowledged(runId: string): void {
      if (runId) notifiedRunIds.add(runId);
    },
    isAcknowledged(runId: string): boolean {
      return Boolean(runId && notifiedRunIds.has(runId));
    },
    dispose(): void {
      lastStatusByRunId.clear();
      notifiedRunIds.clear();
    },
  };
}
