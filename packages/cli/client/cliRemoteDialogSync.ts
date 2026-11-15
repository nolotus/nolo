// packages/cli/client/cliRemoteDialogSync.ts
//
// Remote dialog 同步链——从 localRuntimeAdapter.ts 提取。
//
// 本地 CLI agent 运行后需要把对话记录同步到远程服务器，以及在子对话完成时
// 唤醒父对话。这组函数负责：
// - prepareRemoteDialogEvidenceRecord：消息记录标准化
// - postRemoteRecord / readRemoteRecord：远程 db read/write
// - syncLocalDialogEvidenceToRemote：批量同步本地写入 ops 到远程
// - maybeWakeParentDialogAfterLocalSync：子对话 terminal → 唤醒父对话
//
// 外部依赖：resolveRuntimeServerUrl / resolveRuntimeAuthToken / remoteDialogSyncTimeout /
// parseUserIdFromAuthToken / clipCompactText

import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { toErrorMessage } from "core/errorMessage";
import type { CliFetchImpl } from "../cliFetch";
import type { HybridRecordStore } from "./hybridRecordStore";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";
import {
  resolveRuntimeServerUrl,
  resolveRuntimeAuthToken,
  remoteDialogSyncTimeout,
  type EnvLike,
} from "./localRuntimeHelpers";
import { fetchWithTransientRetry } from "./localRuntimeFetchRetry";
import { clipCompactText } from "core/clipCompactText";
import { formatDuration } from "../../ai/tools/agent/agentRunDisplayHelpers";
import { buildCliNoticeText } from "../tui/completionNoticeDisplay";
import type { AgentRuntimeSaveTurnInput } from "../../agent-runtime";

// ── helpers ──────────────────────────────────────────────────────────────

const RESERVED_AUTHORITY_FIELDS = [
  "userBatchOwner",
  "userBatchPhase",
  "userBatchReceipt",
  "acceptedUserBatchId",
] as const;

function hasReservedBatchAuthority(metadata: unknown): boolean {
  if (!isRecord(metadata)) return false;
  return Object.keys(metadata).some(key => RESERVED_AUTHORITY_FIELDS.some(field =>
    key === field || key.startsWith(`${field}.`) ||
    key === `metadata.${field}` || key.startsWith(`metadata.${field}.`),
  ));
}

export function prepareRemoteDialogEvidenceRecord(
  key: string,
  value: any,
  options?: { isAcceptedBatchMember?: boolean },
) {
  const record = isRecord(value) ? { ...value } : {};
  if (key.includes("-msg-") && typeof record.type !== "string") {
    record.type = "msg";
  }
  // CLI admission is local, not a server-minted user-batch claim. Keep the
  // durable local queue untouched and upload only its evidence. Records carrying
  // server authority fields still go through the server's replication guard.
  const metadata = record.metadata;
  if (key.includes("-msg-") && record.role === "user" && isRecord(metadata) &&
      metadata.queueState === "accepted" &&
      (metadata.cliBatchPhase === "requested" || metadata.cliBatchPhase === "completed" ||
       (typeof metadata.cliBatchId === "string" && metadata.cliBatchId.length > 0) ||
       options?.isAcceptedBatchMember === true) &&
      !hasReservedBatchAuthority(metadata)) {
    const { queueState: _localQueueState, ...evidenceMetadata } = metadata;
    record.metadata = evidenceMetadata;
  }
  return record;
}

async function collectAcceptedUserBatchMessageKeys(
  ops: ReadonlyArray<{ type: string; key: string; value: any }>,
  localStore?: Pick<HybridRecordStore, "iterator">,
): Promise<Set<string>> {
  const memberKeys = new Set<string>();
  const collectReceipt = (op: { type: string; key: string; value: any }) => {
    if (op.type !== "put" || !op.key.includes("-msg-")) return;
    const record = op.value;
    if (!isRecord(record) || record.role !== "user" || !isRecord(record.metadata)) return;
    const metadata = record.metadata;
    if (
      metadata.cliBatchPhase !== "requested" &&
      metadata.cliBatchPhase !== "completed"
    ) {
      return;
    }
    if (hasReservedBatchAuthority(record) || hasReservedBatchAuthority(metadata)) return;
    if (!Array.isArray(metadata.acceptedUserMessageIds)) return;
    const match = /^((?:dialog-[^]+?)-msg-)[^]+$/.exec(op.key);
    if (!match) return;
    const prefix = match[1];
    for (const memberId of metadata.acceptedUserMessageIds) {
      if (typeof memberId === "string" && memberId.length > 0) {
        memberKeys.add(`${prefix}${memberId}`);
      }
    }
  };
  for (const op of ops) collectReceipt(op);
  // saveTurn/replay may select only one legacy member. Its receipt is durable
  // local context, not necessarily part of the current upload. Resolve that
  // context without expanding the upload/capture selection or rewriting history.
  const prefixes = new Set<string>();
  for (const op of ops) {
    const record = op.value;
    if (op.type !== "put" || memberKeys.has(op.key) || record?.role !== "user" ||
        record?.metadata?.queueState !== "accepted" || hasReservedBatchAuthority(record.metadata) ||
        record.metadata.cliBatchPhase === "requested" || record.metadata.cliBatchPhase === "completed" ||
        (typeof record.metadata.cliBatchId === "string" && record.metadata.cliBatchId.length > 0)) continue;
    const prefix = typeof record.dialogId === "string"
      ? `dialog-${record.dialogId}-msg-`
      : /^((?:dialog-[^]+?)-msg-)[^]+$/.exec(op.key)?.[1];
    if (prefix && op.key.startsWith(prefix)) prefixes.add(prefix);
  }
  if (localStore) {
    for (const prefix of prefixes) {
      for await (const [key, value] of localStore.iterator({ gte: prefix, lt: `${prefix}\uffff` })) {
        // Do not trust an iterator implementation to enforce its requested range.
        if (key.startsWith(prefix)) collectReceipt({ type: "put", key, value });
      }
    }
  }
  return memberKeys;
}

function normalizeRemoteSubjectRef(value: unknown) {
  if (!isRecord(value)) return null;
  const kind = asOptionalTrimmedString(value.kind);
  const id = asOptionalTrimmedString(value.id);
  if (!kind || !id) return null;
  const role = asOptionalTrimmedString(value.role);
  return { kind, id, ...(role ? { role } : {}) };
}

function mergeRemoteSubjectRefs(...groups: unknown[]) {
  const refs: Array<{ kind: string; id: string; role?: string }> = [];
  const seen = new Set<string>();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const ref = normalizeRemoteSubjectRef(item);
      if (!ref) continue;
      const key = `${ref.kind}\0${ref.id}\0${ref.role ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

function resolveParentAgentKeyFromDialog(parentDialog: Record<string, any>) {
  const primaryKey = asOptionalTrimmedString(parentDialog.primaryAgentKey);
  if (primaryKey) return primaryKey;
  const agentKey = asOptionalTrimmedString(parentDialog.agentKey);
  if (agentKey) return agentKey;
  if (Array.isArray(parentDialog.cybots)) {
    for (const item of parentDialog.cybots) {
      const normalized = asOptionalTrimmedString(item);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

function clipLocalWakeEvidence(value: unknown, max = 1200) {
  if (typeof value !== "string") return undefined;
  const compact = clipCompactText(value, max);
  return compact || undefined;
}

export function buildLocalWakeDisplayText(args: {
  label?: string;
  terminalStatus: string;
  durationMs?: number;
}) {
  const title = typeof args.label === "string" ? args.label.trim() : "";
  const duration =
    typeof args.durationMs === "number" && args.durationMs >= 0
      ? formatDuration(args.durationMs)
      : "";
  // 展示措辞与本地 run 终态唤醒同源（共享展示模型 + CLI 后台任务通知），
  // 屏幕上不再出现 run / [done] 这类机器词。
  return buildCliNoticeText([
    { title, status: args.terminalStatus, duration },
  ]);
}

function buildLocalParentWakeMessage(args: {
  childAgentKey: string;
  childDialogId: string;
  childDialogKey: string;
  childEvidenceSummary?: string;
}) {
  return [
    "A child agent dialog you started has reached a terminal status.",
    "",
    `childDialogId: ${args.childDialogId}`,
    `childDialogKey: ${args.childDialogKey}`,
    `childAgentKey: ${args.childAgentKey}`,
    "status: done",
    ...(args.childEvidenceSummary
      ? ["", "childEvidenceSummary:", args.childEvidenceSummary]
      : []),
    "",
    "Read the childEvidenceSummary and decide the next step yourself. This wake came from a local CLI run, so completion evidence is the synced child dialog, subjectRefs, commits, artifacts, and test output rather than a server-side child process.",
  ].join("\n");
}

// ── throttled batch helpers ──────────────────────────────────────────────
//
// 服务端 db write 限流 120 次/分/IP；补同步大差集突发会直接打满。
// 写循环按批执行：每批最多 `EVIDENCE_WRITE_BATCH_SIZE` 条并发，批间 sleep
// `EVIDENCE_WRITE_BATCH_GAP_MS`。批间 fail-fast：某批任一写失败即抛出，
// 后续批不再派发（此前无界 Promise.all 失败时其余写已在途）。失败由调用方
// 的 try/catch 兜底，这里只做节流。
const EVIDENCE_WRITE_BATCH_SIZE = 4;
const EVIDENCE_WRITE_BATCH_GAP_MS = 300;

async function defaultEvidenceSleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 按批并发执行写入任务，批间节流。保持输入顺序语义（前一批全部完成后
 * 才开始下一批），避免乱序覆盖。
 */
async function runThrottledBatches<T>(
  items: readonly T[],
  run: (item: T) => Promise<void>,
  options: { batchSize?: number; batchGapMs?: number; sleep?: (ms: number) => Promise<void> } = {},
) {
  const batchSize = options.batchSize ?? EVIDENCE_WRITE_BATCH_SIZE;
  const batchGapMs = options.batchGapMs ?? EVIDENCE_WRITE_BATCH_GAP_MS;
  const sleep = options.sleep ?? defaultEvidenceSleep;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => run(item)));
    if (i + batchSize < items.length) {
      await sleep(batchGapMs);
    }
  }
}

// ── remote record I/O ────────────────────────────────────────────────────

export async function postRemoteRecord(args: {
  authToken: string;
  data: any;
  fetchImpl: CliFetchImpl;
  isAcceptedBatchMember?: boolean;
  key: string;
  serverUrl: string;
  userId: string;
}) {
  const response = await fetchWithTransientRetry(
    args.fetchImpl,
    `${args.serverUrl}/api/v1/db/write/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.authToken}`,
      },
      body: JSON.stringify({
        customKey: args.key,
        userId: args.userId,
        data: prepareRemoteDialogEvidenceRecord(args.key, args.data, {
          isAcceptedBatchMember: args.isAcceptedBatchMember,
        }),
      }),
      signal: AbortSignal.timeout(remoteDialogSyncTimeout()),
    },
    // evidence 写是 customKey 幂等覆盖写（同 key 重写结果相同），
    // 因此 502 重试安全：即便前一次已被服务端处理，重写结果不变。
    // 402（ledger append conflict）同样幂等可重试：token 记录同 key
    // 覆盖写 + 扣费幂等键（token:<key>）在 prepare 阶段短路 duplicate，
    // 重试不会双扣。服务端 chargeTokenUsageWithLedger 内部已带 conflict
    // 重试，走到 402 说明多重冲突，客户端再退避重试一轮兜底。
    // Effect v4 迁移锚点：白名单重试 ≈ Effect.retry({ while: res =>
    // retryableStatuses.has(res.status), schedule: Schedule.exponential })，
    // 退避/抖动由 Schedule 组合表达，测试用 TestClock 免真实 sleep。
    { retryableStatuses: new Set([402, 429, 502, 503]) },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `remote dialog evidence write failed: HTTP ${response.status} ${text.slice(0, 500)}`,
    );
  }
}

async function readRemoteRecord(args: {
  authToken: string;
  fetchImpl: CliFetchImpl;
  key: string;
  serverUrl: string;
}) {
  const response = await args.fetchImpl(
    `${args.serverUrl}/api/v1/db/read/${encodeURIComponent(args.key)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${args.authToken}`,
      },
      signal: AbortSignal.timeout(remoteDialogSyncTimeout()),
    },
  );
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  return payload?.data && typeof payload.data === "object"
    ? payload.data
    : null;
}

// ── parent dialog wake ───────────────────────────────────────────────────

async function maybeWakeParentDialogAfterLocalSync(args: {
  authToken: string;
  childDialogKey: string;
  childDialogRecord: Record<string, any>;
  fetchImpl: CliFetchImpl;
  input: AgentRuntimeSaveTurnInput;
  serverUrl: string;
  userId: string;
}) {
  if (args.input.runtimeContext?.parentWakeOnTerminal !== true) return;
  if (args.childDialogRecord.parentWake?.terminalNotifiedAt) return;
  const parentDialogId = asOptionalTrimmedString(
    args.childDialogRecord.parentDialogId,
  );
  if (!parentDialogId) return;

  const parentDialogKey = `dialog-${args.userId}-${parentDialogId}`;
  const parentDialog = await readRemoteRecord({
    authToken: args.authToken,
    fetchImpl: args.fetchImpl,
    key: parentDialogKey,
    serverUrl: args.serverUrl,
  });
  if (!parentDialog) return;
  const parentAgentKey = resolveParentAgentKeyFromDialog(parentDialog);
  if (!parentAgentKey) return;

  const childDialogId = asOptionalTrimmedString(args.childDialogRecord.id);
  if (!childDialogId) return;
  const subjectRefs = mergeRemoteSubjectRefs(
    args.childDialogRecord.subjectRefs,
    [{ kind: "dialog", id: childDialogId, role: "completed-child-dialog" }],
  );
  const wakeResponse = await args.fetchImpl(`${args.serverUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.authToken}`,
    },
    body: JSON.stringify({
      agentKey: parentAgentKey,
      userInput: buildLocalParentWakeMessage({
        childAgentKey:
          args.childDialogRecord.primaryAgentKey ?? args.input.agentKey,
        childDialogId,
        childDialogKey: args.childDialogKey,
        childEvidenceSummary: clipLocalWakeEvidence(args.input.result.content),
      }),
      background: true,
      continueDialogId: parentDialogId,
      runtimeContext: {
        surface: "cli",
        host: "terminal",
        runtime: "bun",
        entrypoint: "agent-runtime:parent-child-terminal-wake",
        wakeChildDialogKey: args.childDialogKey,
        wakeTerminalStatus: "done",
        wakeDisplayText: buildLocalWakeDisplayText({
          label: args.childDialogRecord.taskLabel ?? args.childDialogRecord.title,
          terminalStatus: "done",
        }),
        subjectRefs,
      },
    }),
  });
  if (!wakeResponse.ok) {
    const text = await wakeResponse.text().catch(() => "");
    throw new Error(
      `parent dialog wake failed: HTTP ${wakeResponse.status} ${text.slice(0, 500)}`,
    );
  }

  const notifiedAt = Date.now();
  await postRemoteRecord({
    authToken: args.authToken,
    data: {
      ...args.childDialogRecord,
      parentWake: {
        terminalNotifiedAt: notifiedAt,
        terminalStatus: "done",
        parentDialogId,
        childDialogId,
      },
      updatedAt: new Date(notifiedAt).toISOString(),
    },
    fetchImpl: args.fetchImpl,
    key: args.childDialogKey,
    serverUrl: args.serverUrl,
    userId: args.userId,
  });
}

// ── sync local dialog evidence to remote ─────────────────────────────────

export async function syncLocalDialogEvidenceToRemote(args: {
  env: EnvLike;
  fetchImpl: CliFetchImpl;
  input: AgentRuntimeSaveTurnInput;
  ops: Array<{ type: "put"; key: string; value: any }>;
  output?: { write(chunk: string): unknown };
  userId: string;
  /** Local-only batch context for legacy member-only save/replay. Never remote fallback. */
  localStore?: Pick<HybridRecordStore, "iterator">;
  /** 可注入 sleep，测试用于断言批间节流；生产路径用默认 setTimeout。 */
  sleep?: (ms: number) => Promise<void>;
}) {
  const serverUrl = resolveRuntimeServerUrl(args.env);
  const authToken = resolveRuntimeAuthToken(args.env);
  if (!serverUrl || !authToken) {
    return { attempted: false as const };
  }

  // Single pass: partition into msg ops (front) and non-msg ops (back)
  const orderedOps: Array<{ type: "put"; key: string; value: any }> = [];
  const nonMsgOps: Array<{ type: "put"; key: string; value: any }> = [];
  for (const op of args.ops) {
    if (op.type !== "put") continue;
    if (op.key.includes("-msg-")) {
      orderedOps.push(op);
    } else {
      nonMsgOps.push(op);
    }
  }
  orderedOps.push(...nonMsgOps);

  // Remote post requests are independent — but unbounded Promise.all can
  // burst past the server's 120/min/IP db-write limit on a large backlog.
  // Bounded concurrency (4) preserves the msg-then-nonMsg ordering while
  // keeping the write rate within the throttle budget. 某批失败即中止后续
  // 批次（fail-fast），由调用方 try/catch 兜底。
  const acceptedBatchKeys = await collectAcceptedUserBatchMessageKeys(orderedOps, args.localStore);
  await runThrottledBatches(
    orderedOps.filter((op) => op.type === "put"),
    (op) =>
      postRemoteRecord({
        authToken,
        data: op.value,
        fetchImpl: args.fetchImpl,
        isAcceptedBatchMember: acceptedBatchKeys.has(op.key),
        key: op.key,
        serverUrl,
        userId: args.userId,
      }),
    args.sleep ? { sleep: args.sleep } : {},
  );

  const childDialogOp = args.ops.find(
    (op) => op.type === "put" && !op.key.includes("-msg-"),
  );
  const childDialogRecord =
    childDialogOp?.value && typeof childDialogOp.value === "object"
      ? childDialogOp.value
      : null;
  if (childDialogOp && childDialogRecord) {
    try {
      await maybeWakeParentDialogAfterLocalSync({
        authToken,
        childDialogKey: childDialogOp.key,
        childDialogRecord,
        fetchImpl: args.fetchImpl,
        input: args.input,
        serverUrl,
        userId: args.userId,
      });
    } catch (error) {
      args.output?.write(
        `[nolo] Parent dialog wake failed; synced local child evidence remains queryable: ${toErrorMessage(
          error,
        )}\n`,
      );
    }
  }

  return { attempted: true as const };
}

// ── push local dialog to remote (fallback) ───────────────────────────────
// Removed: pushLocalDialogToRemote, pushLocalMessagesMissingFromRemote,
// ensureDialogSyncedForServerFallback — auto runtime no longer falls back
// to server when local fails (see agentRun.ts).