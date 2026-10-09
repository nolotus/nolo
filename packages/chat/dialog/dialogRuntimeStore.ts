// File: chat/dialog/dialogRuntimeStore.ts
// Module store for per-dialog session runtime — peeled out of Redux (Wave9/13).
// Holds tokens / pendingFiles / controllers / pendingRawData / loopStopReason /
// pendingUserInputQueue + activeDialogKey / configError. dialogSlice keeps
// CRUD/send thunks on an empty reducer shell.
//
// Sync mutators return a lightweight action object so existing
// `dispatch(addPendingFile(...))` call sites keep working (mutator runs on
// invoke; Redux ignores the no-op type). React UI must use the hooks below
// (useAppSelector on select* wrappers will NOT re-render).

import { useSyncExternalStore } from "react";

import {
  GLOBAL_DIALOG_RUNTIME_KEY,
  type DialogTurnPhase,
  type LoopStopReason,
  type PendingFile,
  type PendingRawData,
  type TokenStats,
} from "./dialogRuntimeTypes";
import {
  clearMediaJobPendingEntries,
  getMediaJobPendingActor,
  MEDIA_JOB_PENDING_KEEP_PER_DIALOG,
  pruneMediaJobPendingEntries,
  readMediaJobPendingMap,
  removeMediaJobPendingEntryById,
  setMediaJobPendingActor,
  upsertMediaJobPendingEntry,
} from "./mediaJobPendingPersistence";

export type { DialogTurnPhase, LoopStopReason, PendingFile, PendingRawData, TokenStats };
export { GLOBAL_DIALOG_RUNTIME_KEY };

export interface DialogRuntimeState {
  tokens: TokenStats;
  pendingFiles: PendingFile[];
  activeControllers: Record<string, AbortController>;
  pendingRawData: Record<string, PendingRawData>;
  loopStopReason: LoopStopReason | null;
  turnPhase: DialogTurnPhase | null;
  /**
   * turn-scoped owner of `turnPhase` (review 修复 5). A late status frame from
   * an older turn (or that turn's `finally` cleanup) must not overwrite the
   * phase of the turn that owns the dialog now.
   */
  turnPhaseTurnId: string | null;
  pendingUserInputQueue: string[];
  recoveredForegroundTurn: "running" | null;
}

type LiveTokenUsagePayload = {
  input_tokens: number;
  output_tokens: number;
  cost?: number;
  dialogKey?: string;
};

const createEmptyTokenStats = (): TokenStats => ({
  inputTokens: 0,
  outputTokens: 0,
  totalCost: 0,
});

const createEmptyDialogRuntimeState = (): DialogRuntimeState => ({
  tokens: createEmptyTokenStats(),
  pendingFiles: [],
  activeControllers: {},
  pendingRawData: {},
  loopStopReason: null,
  turnPhase: null,
  turnPhaseTurnId: null,
  pendingUserInputQueue: [],
  recoveredForegroundTurn: null,
});

let activeDialogKey: string | null = null;
// Wave13: dialog session flash (active key + configError) moved here from
// Redux `dialogSlice` state so React UI re-renders via useSyncExternalStore
// and non-React callers read a single source of truth. Cleared together
// with the active key on setActiveDialogKey / clear paths (matches the old
// initDialog.pending write of currentDialogKey + configError=null).
let configError: string | null = null;
const runtimeByKey: Record<string, DialogRuntimeState> = {
  [GLOBAL_DIALOG_RUNTIME_KEY]: createEmptyDialogRuntimeState(),
};

const listeners = new Set<() => void>();
let version = 0;

const notify = (): void => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

const action = <T,>(type: string, payload?: T) =>
  ({ type, payload }) as { type: string; payload?: T };

export function setActiveDialogKey(key: string | null): void {
  activeDialogKey = key;
  // Mirror the legacy initDialog.pending contract: writing a key clears the
  // previous load error so a re-init never surfaces a stale configError.
  configError = null;
  notify();
}

export function getActiveDialogKey(): string | null {
  return activeDialogKey;
}

export function setDialogConfigError(error: string | null): void {
  configError = error;
  notify();
}

export function clearDialogConfigError(): void {
  configError = null;
  notify();
}

export function getDialogConfigError(): string | null {
  return configError;
}

const resolveDialogRuntimeKey = (dialogKey?: string | null): string =>
  dialogKey ?? activeDialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY;

const ensureDialogRuntimeState = (
  dialogKey?: string | null
): DialogRuntimeState => {
  const runtimeKey = resolveDialogRuntimeKey(dialogKey);
  if (!runtimeByKey[runtimeKey]) {
    runtimeByKey[runtimeKey] = createEmptyDialogRuntimeState();
  }
  return runtimeByKey[runtimeKey];
};

/**
 * Reset per-session runtime state when a dialog is (re)initialized.
 * Resets: tokens, loopStopReason, pendingUserInputQueue.
 * Preserves: activeControllers, pendingFiles, pendingRawData.
 */
export function resetDialogRuntimeSessionState(dialogKey?: string | null): void {
  const runtime = ensureDialogRuntimeState(dialogKey);
  runtime.tokens = createEmptyTokenStats();
  runtime.loopStopReason = null;
  runtime.turnPhase = null;
  runtime.turnPhaseTurnId = null;
  runtime.pendingUserInputQueue = [];
  notify();
}

export function addPendingFile(payload: PendingFile) {
  const targetRuntimeKey =
    payload.targetDialogKey ??
    payload.runtimeDialogKey ??
    (payload.type === "dialog" ? activeDialogKey : payload.dialogKey);
  const runtime = ensureDialogRuntimeState(targetRuntimeKey);
  if (!runtime.pendingFiles.some((f) => f.id === payload.id)) {
    // 必须换新数组引用：store 的 pendingFiles 被 useMemo(…, [pendingFiles]) 等
    // 按引用消费，原地 push 不会让恢复/新增的条目重算出来（刷新恢复踩过）。
    runtime.pendingFiles = [...runtime.pendingFiles, payload];
    // 媒体任务卡片要能在刷新后找回：把引用镜像到 localStorage（见
    // mediaJobPendingPersistence）。任务状态仍由卡片轮询后端实时获取。
    if (payload.type === "media_job") {
      upsertMediaJobPendingEntry({
        id: payload.id,
        name: payload.name,
        fileKey: payload.fileKey,
        mimeType: payload.mimeType,
        size: payload.size,
        durationSec: payload.durationSec,
        // 与写入侧 bucket 推导严格同源：`dialogKey || GLOBAL_DIALOG_RUNTIME_KEY`
        // （useMessageInputFiles 的 effectiveDialogKey 同规则）。不依赖
        // activeDialogKey 隐式回退，保证恢复时读到的就是当初写入的 bucket。
        dialogKey: payload.dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY,
      });
    }
    notify();
  }
  return action("dialogRuntime/addPendingFile", payload);
}

export function removePendingFile(fileId: string) {
  const runtime = ensureDialogRuntimeState();
  let fileToRemove = runtime.pendingFiles.find((f) => f.id === fileId);
  let runtimeHoldingFile = runtime;
  if (!fileToRemove) {
    // 兜底：当前 runtime 里没有时，按 id 扫其它 dialog runtime（quick chat 的
    // GLOBAL bucket 与 activeDialogKey  stale 时会出现这种错位）。id 全局唯一，
    // 扫描不会误删别的条目。
    for (const candidate of Object.values(runtimeByKey)) {
      const found = candidate.pendingFiles.find((f) => f.id === fileId);
      if (found) {
        fileToRemove = found;
        runtimeHoldingFile = candidate;
        break;
      }
    }
  }
  if (fileToRemove) {
    if (fileToRemove.pageKey) {
      delete runtimeHoldingFile.pendingRawData[fileToRemove.pageKey];
    }
    runtimeHoldingFile.pendingFiles = runtimeHoldingFile.pendingFiles.filter(
      (file) => file.id !== fileId
    );
    if (fileToRemove.type === "media_job") {
      removeMediaJobPendingEntryById(fileToRemove.id);
    }
    notify();
  }
  return action("dialogRuntime/removePendingFile", fileId);
}

export function clearPendingAttachments(
  payload?: { dialogKey?: string; all?: boolean }
) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime) => {
      runtime.pendingFiles = [];
      runtime.pendingRawData = {};
    });
    clearMediaJobPendingEntries({ all: true });
    notify();
    return action("dialogRuntime/clearPendingAttachments", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingFiles.forEach((file) => {
    if (file.type === "media_job") removeMediaJobPendingEntryById(file.id);
  });
  runtime.pendingFiles = [];
  runtime.pendingRawData = {};
  notify();
  return action("dialogRuntime/clearPendingAttachments", payload);
}

export function setLoopStopReason(payload: {
  reason: LoopStopReason | null;
  dialogKey?: string;
}) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.loopStopReason = payload.reason;
  notify();
  return action("dialogRuntime/setLoopStopReason", payload);
}

export function setRecoveredForegroundTurn(payload: {
  dialogKey?: string | null;
  status: "running" | null;
}) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.recoveredForegroundTurn = payload.status;
  notify();
  return action("dialogRuntime/setRecoveredForegroundTurn", payload);
}

/**
 * Claim ownership of the dialog's pre-delta turn phase for a new turn
 * (review 修复 5). Unconditional on purpose: a new turn must evict a stale
 * owner (e.g. the previous turn died before its `finally`), otherwise its own
 * status frames would be rejected forever and the dialog would lose pre-delta
 * feedback. After claiming, only this turn's writes/clears are accepted.
 */
export function claimDialogTurnPhase(payload: { dialogKey?: string; turnId: string }) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.turnPhaseTurnId = payload.turnId;
  // 上一 turn 残留的相位标签不留：新 turn 会立刻推自己的 status 帧。
  runtime.turnPhase = null;
  notify();
  return action("dialogRuntime/claimDialogTurnPhase", payload);
}

/**
 * Pre-delta turn phase (validating / compacting / waiting-provider). Written by
 * streamTurn from the desktop SSE `status` frame. Passing `null` clears it.
 *
 * Turn-scoped (review 修复 5)：调用方带 `turnId`（turn 级 token），store 只接受
 * 当前 owner turn 的写入。迟到的旧 turn status 帧不能覆盖新 turn 的 phase，
 * 旧 turn 的 finally 清理也不能把新 turn 的 phase 清掉。不带 turnId 时保持旧的
 * 宽松行为（向后兼容现有调用方）。
 */
export function setDialogTurnPhase(payload: {
  phase: DialogTurnPhase | null;
  dialogKey?: string;
  turnId?: string;
}) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  if (
    typeof payload.turnId === "string" &&
    runtime.turnPhaseTurnId !== null &&
    runtime.turnPhaseTurnId !== payload.turnId
  ) {
    // 跨 turn 写入：拒绝（不 notify——没有状态变化，UI 不该重渲染）。
    return action("dialogRuntime/setDialogTurnPhase:rejected", payload);
  }
  runtime.turnPhase = payload.phase;
  runtime.turnPhaseTurnId = payload.phase === null ? null : payload.turnId ?? null;
  notify();
  return action("dialogRuntime/setDialogTurnPhase", payload);
}

/** Convenience: clear the current dialog's turn phase (turn end / pre-start). */
export function clearDialogTurnPhase(payload: { dialogKey?: string; turnId?: string } = {}) {
  return setDialogTurnPhase({ phase: null, dialogKey: payload.dialogKey, turnId: payload.turnId });
}

export function clearDialogRuntimeState(payload: { dialogKey: string }) {
  const runtime = runtimeByKey[payload.dialogKey];
  runtime?.pendingFiles.forEach((file) => {
    if (file.type === "media_job") removeMediaJobPendingEntryById(file.id);
  });
  delete runtimeByKey[payload.dialogKey];
  notify();
  return action("dialogRuntime/clearDialogRuntimeState", payload);
}

/**
 * 从 localStorage 镜像恢复媒体任务卡片引用到 pendingFiles（刷新页面 / 重新
 * 进入对话时调用）。恢复的条目沿用现有轮询逻辑：卡片自己向
 * `/api/media-jobs/<id>` 取状态——quoted/running 显示进度，done 显示「打开
 * 笔记」，failed/cancelled 显示续跑；jobId 已不存在（404）时由卡片回调
 * removePendingFile 静默摘除。返回恢复的条目数。
 */
export function restoreMediaJobPendingFiles(dialogKey?: string | null): number {
  const runtimeKey = resolveDialogRuntimeKey(dialogKey);
  // 收敛：每个 dialog 最多只恢复最近 N 条，更早的历史卡片不再复活。
  const entries = (
    readMediaJobPendingMap()[runtimeKey] ?? []
  ).slice(-MEDIA_JOB_PENDING_KEEP_PER_DIALOG);
  if (!entries.length) return 0;
  const runtime = ensureDialogRuntimeState(runtimeKey);
  const existingIds = new Set(runtime.pendingFiles.map((file) => file.id));
  let restored = 0;
  for (const entry of entries) {
    if (existingIds.has(entry.id)) continue;
    addPendingFile({
      id: entry.id,
      name: entry.name,
      type: "media_job",
      fileKey: entry.fileKey,
      mimeType: entry.mimeType,
      size: entry.size,
      durationSec: entry.durationSec,
      trackingId: entry.id,
      dialogKey: runtimeKey,
    });
    restored += 1;
  }
  // 恢复即刷新 savedAt（addPendingFile → upsert），顺势收敛旧条目。
  pruneMediaJobPendingEntries(runtimeKey);
  return restored;
}

/**
 * W15 媒体笔记引用的 pageKey 前缀（与 web/mediaJobContextInjection 的
 * mediaNotePageKey 同源，单一定义处）。账号切换/登出清理时据此识别。
 */
export const MEDIA_NOTE_PAGE_KEY_PREFIX = "media-note:";
/** 判断一个 pendingFile/pageKey 是否为 W15 媒体笔记引用（page 类型）。 */
export const isMediaNotePageReference = (pageKey?: string | null): boolean =>
  typeof pageKey === "string" &&
  pageKey.startsWith(MEDIA_NOTE_PAGE_KEY_PREFIX);

export const getMediaJobRuntimeActor = (): string | null =>
  getMediaJobPendingActor();

/**
 * 设置媒体任务引用的 actor（当前 userId）。账号切换时调用：
 * - 切换 persistence 的 actor 分桶，此后读写只碰「当前账号」那一份；
 * - 丢弃内存里旧账号的媒体引用（它们指向他人 / 已无权访问的 job），新账号的引用
 *   由随后的 restoreMediaJobPendingFiles 从其独立分桶重建。相同 actor 幂等。
 */
export function setMediaJobRuntimeActor(actorId: string | null): void {
  const next = actorId && actorId.length ? actorId : null;
  if (getMediaJobPendingActor() === next) return;
  setMediaJobPendingActor(next);
  for (const key of Object.keys(runtimeByKey)) {
    const runtime = runtimeByKey[key];
    // 账号切换/登出：丢弃旧账号的全部媒体引用——media_job 卡片附件 +
    // W15 媒体笔记的 page 引用与 pendingRawData 快照（复审 HIGH-2 ①）：
    // 它们指向他人 / 已无权访问的 job，绝不留给新账号。
    const kept = runtime.pendingFiles.filter(
      (f) => f.type !== "media_job" && !isMediaNotePageReference(f.pageKey),
    );
    if (kept.length !== runtime.pendingFiles.length) {
      runtime.pendingFiles = kept;
    }
    for (const pageKey of Object.keys(runtime.pendingRawData)) {
      if (isMediaNotePageReference(pageKey)) {
        delete runtime.pendingRawData[pageKey];
      }
    }
  }
  notify();
}

export function addActiveController(payload: {
  messageId: string;
  controller: AbortController;
  dialogKey?: string;
}) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.activeControllers[payload.messageId] = payload.controller;
  notify();
  return action("dialogRuntime/addActiveController", payload);
}

export function removeActiveController(
  payload: { messageId: string; dialogKey?: string } | string
) {
  const normalized =
    typeof payload === "string" ? { messageId: payload } : payload;
  const runtime = ensureDialogRuntimeState(normalized.dialogKey);
  delete runtime.activeControllers[normalized.messageId];
  notify();
  return action("dialogRuntime/removeActiveController", normalized);
}

export function clearActiveControllers(
  payload?: { dialogKey?: string; all?: boolean }
) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime) => {
      runtime.activeControllers = {};
    });
    notify();
    return action("dialogRuntime/clearActiveControllers", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.activeControllers = {};
  notify();
  return action("dialogRuntime/clearActiveControllers", payload);
}

export function enqueueUserInput(
  payload: string | { text: string; dialogKey?: string }
) {
  const normalized =
    typeof payload === "string" ? { text: payload } : payload;
  const runtime = ensureDialogRuntimeState(normalized.dialogKey);
  runtime.pendingUserInputQueue.push(normalized.text);
  notify();
  return action("dialogRuntime/enqueueUserInput", normalized);
}

export function dequeueUserInput(payload?: { dialogKey?: string }) {
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingUserInputQueue.shift();
  notify();
  return action("dialogRuntime/dequeueUserInput", payload);
}

export function clearPendingUserInputQueue(
  payload?: { dialogKey?: string; all?: boolean }
) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime) => {
      runtime.pendingUserInputQueue = [];
    });
    notify();
    return action("dialogRuntime/clearPendingUserInputQueue", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingUserInputQueue = [];
  notify();
  return action("dialogRuntime/clearPendingUserInputQueue", payload);
}

export function tokenUsageLiveUpdate(payload: LiveTokenUsagePayload) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.tokens.inputTokens += payload.input_tokens;
  runtime.tokens.outputTokens += payload.output_tokens;
  runtime.tokens.totalCost += payload.cost ?? 0;
  notify();
  return action("dialogRuntime/tokenUsageLiveUpdate", payload);
}

/** createPageAndAddReference fulfilled side-effect */
export function addPageReferenceToRuntime(payload: {
  reference: PendingFile;
  rawData: PendingRawData | null;
  dialogKey?: string;
}): void {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  // 同 addPendingFile：换新数组引用，避免按引用消费方（useMemo/memo）不更新。
  runtime.pendingFiles = [...runtime.pendingFiles, payload.reference];
  if (payload.rawData?.pageKey) {
    runtime.pendingRawData[payload.rawData.pageKey] = payload.rawData;
  }
  notify();
}

/** updateTokens fulfilled — subtract billed tokens from live counters */
export function applyUpdateTokensFulfilled(payload: {
  dialogKey: string;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
}): void {
  const runtime = runtimeByKey[payload.dialogKey];
  if (!runtime) return;
  runtime.tokens.inputTokens = Math.max(
    0,
    runtime.tokens.inputTokens - (payload.input_tokens ?? 0)
  );
  runtime.tokens.outputTokens = Math.max(
    0,
    runtime.tokens.outputTokens - (payload.output_tokens ?? 0)
  );
  runtime.tokens.totalCost = Math.max(
    0,
    runtime.tokens.totalCost - (payload.cost ?? 0)
  );
  notify();
}

/**
 * Leaving a dialog: move pending files to global runtime, clear queues/raw.
 * Does not change Redux currentDialogKey — caller clears that separately.
 */
export function applyClearDialogStateRuntime(): void {
  const previousDialogKey = activeDialogKey;
  const previousRuntime = previousDialogKey
    ? runtimeByKey[previousDialogKey]
    : null;
  const globalRuntime = ensureDialogRuntimeState(GLOBAL_DIALOG_RUNTIME_KEY);

  if (previousRuntime) {
    if (previousRuntime.pendingFiles.length > 0) {
      globalRuntime.pendingFiles = previousRuntime.pendingFiles;
      previousRuntime.pendingFiles = [];
    }
    previousRuntime.pendingRawData = {};
    previousRuntime.pendingUserInputQueue = [];
  }
  activeDialogKey = null;
  configError = null;
  globalRuntime.pendingRawData = {};
  globalRuntime.pendingUserInputQueue = [];
  notify();
}

export function deleteDialogRuntime(dialogKey: string): void {
  delete runtimeByKey[dialogKey];
  notify();
}

export function abortActiveControllers(args?: {
  dialogKey?: string;
  all?: boolean;
}): void {
  const runtimes: DialogRuntimeState[] = args?.all
    ? Object.values(runtimeByKey)
    : [ensureDialogRuntimeState(args?.dialogKey)];
  runtimes.forEach((runtime) => {
    Object.values(runtime.activeControllers).forEach((controller) =>
      controller.abort()
    );
  });
}

// ===== getters (select* ignore Redux state — for non-React callers) =====

export function getDialogRuntimeState(
  dialogKey?: string | null
): DialogRuntimeState {
  return (
    runtimeByKey[resolveDialogRuntimeKey(dialogKey)] ??
    createEmptyDialogRuntimeState()
  );
}

export function getPendingFiles(dialogKey?: string | null): PendingFile[] {
  return getDialogRuntimeState(dialogKey).pendingFiles;
}

export function getActiveControllers(
  dialogKey?: string | null
): Record<string, AbortController> {
  return getDialogRuntimeState(dialogKey).activeControllers;
}

export function getPendingRawData(
  dialogKey?: string | null
): Record<string, PendingRawData> {
  return getDialogRuntimeState(dialogKey).pendingRawData;
}

export function getDialogRuntimeTokens(dialogKey?: string | null): TokenStats {
  return getDialogRuntimeState(dialogKey).tokens;
}

export function getPendingRawDataByPageKey(
  pageKey: string
): PendingRawData | undefined {
  return getDialogRuntimeState().pendingRawData[pageKey];
}

export function getPendingUserInputQueue(
  dialogKey?: string | null
): string[] {
  return getDialogRuntimeState(dialogKey).pendingUserInputQueue;
}

export function getLoopStopReason(
  dialogKey?: string | null
): LoopStopReason | null {
  return getDialogRuntimeState(dialogKey).loopStopReason;
}

export function getDialogTurnPhase(
  dialogKey?: string | null
): DialogTurnPhase | null {
  return getDialogRuntimeState(dialogKey).turnPhase;
}

export function getRecoveredForegroundTurn(
  dialogKey?: string | null
): "running" | null {
  return getDialogRuntimeState(dialogKey).recoveredForegroundTurn;
}

/** @deprecated Prefer getters/hooks; kept for stream/non-React call sites. */
export const selectDialogRuntimeByKey = (
  _state: any,
  dialogKey?: string
) => getDialogRuntimeState(dialogKey);
export const selectPendingFiles = (_state: any, dialogKey?: string) =>
  getPendingFiles(dialogKey);
export const selectActiveControllers = (_state: any, dialogKey?: string) =>
  getActiveControllers(dialogKey);
export const selectPendingRawData = (_state: any, dialogKey?: string) =>
  getPendingRawData(dialogKey);
export const selectDialogRuntimeTokens = (_state: any, dialogKey?: string) =>
  getDialogRuntimeTokens(dialogKey);
export const selectPendingRawDataByPageKey = (_state: any, pageKey: string) =>
  getPendingRawDataByPageKey(pageKey);
export const selectPendingUserInputQueue = (
  _state: any,
  dialogKey?: string
) => getPendingUserInputQueue(dialogKey);
export const selectLoopStopReason = (_state: any, dialogKey?: string) =>
  getLoopStopReason(dialogKey);

// ===== Wave13: dialog session flash (active key + configError) =====
// Selectors ignore Redux state and read the module store so non-React
// call sites (thunks, tools) keep a single source of truth. Hooks below
// re-render React components on key/error changes.
/** Non-React / thunks: reads the module store. Prefer `useCurrentDialogKey()` in React. */
export const selectCurrentDialogKey = (_state?: any): string | null =>
  getActiveDialogKey();
/** Non-React / thunks: reads the module store. Prefer `useDialogConfigError()` in React. */
export const selectConfigError = (_state?: any): string | null =>
  getDialogConfigError();

// ===== useSyncExternalStore =====

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): number {
  return version;
}

export function usePendingFiles(dialogKey?: string | null): PendingFile[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getPendingFiles(dialogKey);
}

export function useActiveControllers(
  dialogKey?: string | null
): Record<string, AbortController> {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getActiveControllers(dialogKey);
}

export function usePendingUserInputQueue(
  dialogKey?: string | null
): string[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getPendingUserInputQueue(dialogKey);
}

export function useLoopStopReason(
  dialogKey?: string | null
): LoopStopReason | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getLoopStopReason(dialogKey);
}

export function useDialogTurnPhase(
  dialogKey?: string | null
): DialogTurnPhase | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getDialogTurnPhase(dialogKey);
}

export function useRecoveredForegroundTurn(
  dialogKey?: string | null
): "running" | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getRecoveredForegroundTurn(dialogKey);
}

export function useDialogRuntimeTokens(
  dialogKey?: string | null
): TokenStats {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getDialogRuntimeTokens(dialogKey);
}

export function useCurrentDialogKey(): string | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getActiveDialogKey();
}

export function useDialogConfigError(): string | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getDialogConfigError();
}

export function resetDialogRuntimeStoreForTests(): void {
  activeDialogKey = null;
  configError = null;
  setMediaJobPendingActor(null);
  for (const key of Object.keys(runtimeByKey)) {
    delete runtimeByKey[key];
  }
  runtimeByKey[GLOBAL_DIALOG_RUNTIME_KEY] = createEmptyDialogRuntimeState();
  clearMediaJobPendingEntries({ all: true });
  notify();
}
