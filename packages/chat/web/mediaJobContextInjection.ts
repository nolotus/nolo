// File: chat/web/mediaJobContextInjection.ts
// W15：把媒体笔记「挂进对话」。从 URL（?mediaJobId=…）读到任务 id → 取
// GET /api/media-jobs/:id/result → 以「页面引用」pendingFile 形式挂入当前对话，
// 使用户的首条消息即可就笔记追问。
//
// 关键取舍：
// - 引用而非全文：消息体只带 { type:"page", name, pageKey }（见
//   pendingAttachmentParts 的 buildReferencePart），绝不把整份长笔记塞进 prompt。
//   随附的 pendingRawData 只存「标题 + ≤8 要点 + ≤MEDIA_NOTE_PREVIEW_CHARS 预览 +
//   jobId + 笔记地址」；预览按需截断——完整内容始终留在后端（打开 /media-jobs/:id
//   或再请求 /result 读取），prompt 大小与笔记长短解耦。
// - 越权/缺失/异常一律静默：403（非本人，越权检查依赖后端）/404（不存在/未完成）/
//   网络/解析失败都只返回状态码，不挂引用、不抛错、不崩；调用方据此给一句可读提示。
// - 与媒体卡片隔离一致：只有拿到 200 才挂引用；他人 jobId 会被后端 403 拦下，
//   绝不凭 URL 参数凭空捏造或恢复他人的引用。

import { useEffect, useRef } from "react";
import {
  GLOBAL_DIALOG_RUNTIME_KEY,
  type PendingFile,
  type PendingRawData,
} from "../dialog/dialogRuntimeTypes";
import {
  addPageReferenceToRuntime,
  getMediaJobRuntimeActor,
  MEDIA_NOTE_PAGE_KEY_PREFIX,
  getPendingFiles,
} from "../dialog/dialogRuntimeStore";

/** 预览截断上限：只把开头这么多字符带入本地引用快照。 */
export const MEDIA_NOTE_PREVIEW_CHARS = 600;
/** 要点条数上限。 */
export const MEDIA_NOTE_KEY_POINTS_MAX = 8;

/** 媒体笔记在本地引用里的稳定 pageKey（按 jobId 归一 → 重复进入去重/幂等）。 */
export const mediaNotePageKey = (jobId: string): string =>
  `${MEDIA_NOTE_PAGE_KEY_PREFIX}${jobId}`;

export interface MediaJobResultLite {
  source?: { name?: string };
  segments?: Array<{ id?: string; text?: string; translation?: string }>;
  summary?: { keyPoints?: string[] };
}

/**
 * 由 /result 结果构造「页面引用」pendingFile + 截断后的 rawData 快照。
 * 纯函数，便于单测：断言引用带上了 pageKey/jobId，且快照已截断、不含全文。
 */
export function buildMediaNoteReference(
  jobId: string,
  result: MediaJobResultLite,
  dialogKey?: string | null,
): { reference: PendingFile; rawData: PendingRawData; preview: string } {
  const title = (result.source?.name ?? "").trim() || "媒体笔记";
  const body = (result.segments ?? [])
    .map((s) => (s.translation ?? s.text ?? "").trim())
    .filter(Boolean)
    .join("\n");
  const truncated = body.length > MEDIA_NOTE_PREVIEW_CHARS;
  const preview = truncated
    ? `${body.slice(0, MEDIA_NOTE_PREVIEW_CHARS)}…`
    : body;
  const keyPoints = (result.summary?.keyPoints ?? []).slice(
    0,
    MEDIA_NOTE_KEY_POINTS_MAX,
  );
  const pageKey = mediaNotePageKey(jobId);
  const reference: PendingFile = {
    id: pageKey,
    name: title,
    type: "page",
    pageKey,
    dialogKey: dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY,
  };
  const rawData: PendingRawData = {
    pageKey,
    jsonData: [
      {
        jobId,
        title,
        preview,
        keyPoints,
        noteUrl: `/media-jobs/${jobId}`,
        truncated,
      },
    ],
  };
  return { reference, rawData, preview };
}

export type MediaJobInjectionStatus =
  | "attached"
  | "already"
  | "skipped"
  | "forbidden"
  | "missing"
  | "error"
  /** 发起注入后账号已切换/登出：晚到响应直接丢弃，绝不跨账号挂引用（复审 HIGH-2 ②）。 */
  | "stale";

/**
 * 执行注入：取 /result → 200 才挂引用；403/404/异常静默返回状态。
 * 幂等：同一 runtime 已有该 pageKey 引用时不重复挂。
 * actor 复核（复审 HIGH-2 ②）：以「发起时的 actor」为准（args.actorId 显式
 * 传入，缺省取注入入口时刻的当前 actor）；/result 响应回来后若当前 actor
 * 已变（切号/登出/切回来都不一致），判定晚到响应、丢弃不挂——旧账号私有的
 * 笔记不得注入新账号。
 */
export async function injectMediaJobContext(args: {
  jobId: string | null | undefined;
  dialogKey?: string | null;
  /** 发起注入时的 actor（当前 userId）；缺省 = 调用入口时刻的当前 actor。 */
  actorId?: string | null;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}): Promise<MediaJobInjectionStatus> {
  const jobId = (args.jobId ?? "").trim();
  if (!jobId) return "skipped";
  const runtimeKey = args.dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY;
  const pageKey = mediaNotePageKey(jobId);
  if (getPendingFiles(runtimeKey).some((f) => f.id === pageKey)) {
    return "already";
  }
  const actorAtStart =
    args.actorId !== undefined ? args.actorId : getMediaJobRuntimeActor();
  const doFetch = args.fetchImpl ?? ((url, init) => fetch(url, init));
  let response: Response;
  try {
    response = await doFetch(`/api/media-jobs/${jobId}/result`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return "error";
  }
  if (response.status === 403) return "forbidden";
  if (response.status === 404) return "missing";
  if (!response.ok) return "error";
  let result: MediaJobResultLite;
  try {
    result = (await response.json()) as MediaJobResultLite;
  } catch {
    return "error";
  }
  // 晚到响应复核：账号在请求在飞期间发生过切换/登出（当前 actor ≠ 发起时
  // actor）→ 丢弃，不把旧账号的笔记挂进新账号的 composer。
  if (getMediaJobRuntimeActor() !== actorAtStart) return "stale";
  const { reference, rawData } = buildMediaNoteReference(
    jobId,
    result,
    runtimeKey,
  );
  addPageReferenceToRuntime({ reference, rawData, dialogKey: runtimeKey });
  return "attached";
}

/**
 * React 入口：读到 mediaJobId 且当前 dialogKey 就绪后注入一次。
 * onNotice 以 ref 持有，避免父组件每次渲染传新回调导致 effect 反复触发。
 */
export function useMediaJobContextInjection(args: {
  mediaJobId?: string | null;
  dialogKey?: string | null;
  onNotice?: (status: MediaJobInjectionStatus) => void;
}): void {
  const { mediaJobId, dialogKey } = args;
  const onNoticeRef = useRef(args.onNotice);
  onNoticeRef.current = args.onNotice;
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    const id = (mediaJobId ?? "").trim();
    if (!id || !dialogKey) return;
    const token = `${dialogKey}::${id}`;
    if (handledRef.current === token) return;
    handledRef.current = token;
    let active = true;
    // 记录发起注入时的 actor：响应晚到时与当前 actor 复核，不一致即丢弃
    // （复审 HIGH-2 ②，切号/登出后旧账号的私有笔记不得注入新账号）。
    const actorAtStart = getMediaJobRuntimeActor();
    void injectMediaJobContext({
      jobId: id,
      dialogKey,
      actorId: actorAtStart,
    }).then((status) => {
      if (
        active &&
        status !== "attached" &&
        status !== "already" &&
        status !== "skipped" &&
        status !== "stale"
      ) {
        onNoticeRef.current?.(status);
      }
    });
    return () => {
      active = false;
    };
  }, [mediaJobId, dialogKey]);
}
