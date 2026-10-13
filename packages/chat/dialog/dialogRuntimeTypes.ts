import type { Descendant } from "slate";

export const GLOBAL_DIALOG_RUNTIME_KEY = "__global__";

export interface PendingFile {
  id: string;
  name: string;
  /** Source content key included in the message attachment. */
  pageKey?: string;
  /** Source dialog key included in the message attachment. Prefer sourceDialogKey in new code. */
  dialogKey?: string;
  sourceDialogKey?: string;
  /** Target dialog runtime that should receive this pending attachment. */
  targetDialogKey?: string;
  /** @deprecated Use targetDialogKey. Kept for older pending attachment payloads. */
  runtimeDialogKey?: string;
  type:
    | "excel"
    | "docx"
    | "pdf"
    | "page"
    | "txt"
    | "dialog"
    | "table"
    | "image"
    | "file"
    | "agent"
    | "app"
    | "ocr_text"
    | "media_job";
  groupId?: string;
  ocrText?: string;
  /** 音视频上传原件不可变数据库 file key；media_job 的 id 仍然是 jobId。 */
  /** Optional rollout gate. Defaults off until attachment readers are deployed. */
  fileKey?: string;
  mimeType?: string;
  size?: number;
  durationSec?: number;
  /** 关联到文件处理状态（如 useMessageInputFiles 的 fileStatus）的跟踪 id。 */
  trackingId?: string;
}

export interface CreatePagePayload {
  slateData: Descendant[];
  jsonData?: Record<string, any>[];
  title: string;
  type: "excel" | "docx" | "pdf" | "txt" | "table";
  fileId: string;
  size: number;
  groupId?: string;
  dialogKey?: string;
}

export interface PendingRawData {
  pageKey: string;
  jsonData: Record<string, any>[];
}

export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export type LoopStopReason =
  | "done"
  | "handoff"
  | "pending"
  | "timeout"
  | "error";

/**
 * Pre-delta turn phase surfaced while the agent runtime is working but has not
 * yet produced any visible content. Written by streamTurn when the desktop SSE
 * delivers a `{type:"status"}` frame; consumed by the message list to render
 * validating / compacting / waiting-provider labels. Dialog-scoped (see
 * dialogRuntimeStore) — never a global "is streaming" boolean, so one dialog's
 * long compaction never mislabels another.
 */
export type DialogTurnPhase = "validating" | "compacting" | "waiting-provider";
