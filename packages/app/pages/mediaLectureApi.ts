import type { LectureResult, MediaJob, MediaJobDepth, MediaQuote } from "ai/lecture/types";

/** 笔记页请求层：所有非 2xx / 网络异常都变成 ApiError（绝不把错误响应当数据）。 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly body?: unknown) {
    super(message);
  }
}

export type LectureView = LectureResult & { rev?: string };
export type ExportLang = "both" | "tgt" | "src";
export type SubtitleFormat = "srt" | "vtt";

const BASE = "/api/media-jobs";

export function messageForStatus(status: number, serverMessage?: string): string {
  if (status === 401) return "登录已失效，请重新登录后重试";
  if (status === 403) return "无权访问这份课程笔记";
  if (status === 404) return "课程笔记不存在或已被删除";
  if (status === 402) return serverMessage || "余额不足";
  if (status === 503) return serverMessage || "服务暂不可用，请稍后重试";
  return serverMessage ? `${serverMessage}（${status}）` : `请求失败（${status}），请重试`;
}

async function request(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<Response> {
  let r: Response;
  try {
    r = await fetchImpl(url, init);
  } catch {
    throw new ApiError("网络异常，请检查网络后重试", 0, "NETWORK");
  }
  if (r.ok) return r;
  let body: any;
  try { body = await r.json(); } catch { body = undefined; }
  throw new ApiError(messageForStatus(r.status, body?.error?.message), r.status, body?.error?.code, body);
}

async function jsonOf<T>(r: Response): Promise<T> {
  try { return (await r.json()) as T; } catch { throw new ApiError("响应格式无效，请重试", r.status, "BAD_JSON"); }
}

export function isValidResult(data: any): data is LectureView {
  return !!data?.source && typeof data.source.name === "string" &&
    typeof data.source.fileId === "string" && ["audio", "video"].includes(data.source.kind) &&
    Array.isArray(data.segments) && Array.isArray(data.glossary);
}

/** W9：done，或 cancelled/failed 但已有阶段产物（至少转写过）的任务都能打开笔记。 */
export function canOpenNotes(job: Pick<MediaJob, "status" | "stageArtifacts">): boolean {
  if (job.status === "done") return true;
  return ["cancelled", "failed"].includes(job.status) && Boolean(job.stageArtifacts?.transcribe);
}

export async function fetchJob(id: string, fetchImpl: typeof fetch = fetch): Promise<MediaJob> {
  const data = await jsonOf<{ job?: MediaJob }>(await request(fetchImpl, `${BASE}/${encodeURIComponent(id)}`));
  if (!data?.job || typeof data.job.status !== "string") throw new ApiError("任务数据格式无效，请重试", 200, "BAD_SHAPE");
  return data.job;
}

export async function fetchResult(id: string, fetchImpl: typeof fetch = fetch): Promise<LectureView> {
  const data = await jsonOf<unknown>(await request(fetchImpl, `${BASE}/${encodeURIComponent(id)}/result`));
  if (!isValidResult(data)) throw new ApiError("课程笔记数据格式无效，请重试", 200, "BAD_SHAPE");
  return data;
}

export interface ExtendBody {
  segmentIds?: string[];
  depth?: MediaJobDepth;
  scope?: { fromSec: number; toSec: number };
}

/** 先报价（不扣费）：与 extend 同一入参。 */
export async function quoteExtend(id: string, body: ExtendBody, fetchImpl: typeof fetch = fetch): Promise<MediaQuote> {
  const r = await request(fetchImpl, `${BASE}/${encodeURIComponent(id)}/quote`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await jsonOf<{ quote?: MediaQuote }>(r);
  if (!data?.quote || !Array.isArray(data.quote.totalCredits)) throw new ApiError("报价数据格式无效", 200, "BAD_SHAPE");
  return data.quote;
}

export async function startExtend(id: string, body: ExtendBody, fetchImpl: typeof fetch = fetch): Promise<MediaJob> {
  const r = await request(fetchImpl, `${BASE}/${encodeURIComponent(id)}/extend`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await jsonOf<{ job?: MediaJob }>(r);
  if (!data?.job) throw new ApiError("任务数据格式无效", 200, "BAD_SHAPE");
  return data.job;
}

export function formatQuote(q: MediaQuote): string {
  const [lo, hi] = q.totalCredits;
  const cost = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `预计消耗 ${cost} 积分（当前余额 ${q.balanceCredits}），确认后开始扣费`;
}

/** W14：格式与语言都进入导出参数。 */
/** lang 省略时由服务端按任务是否真有译文决定（有译文 docx/md 默认双语，否则原文）。 */
export function exportUrl(id: string, format: string, lang?: ExportLang): string {
  const q = new URLSearchParams({ format });
  if (lang) q.set("lang", lang);
  return `${BASE}/${encodeURIComponent(id)}/export?${q.toString()}`;
}

/** 导出：任何失败都抛错，只有成功拿到非空、非 JSON 错误体的文件才返回 blob（调用方据此才触发下载）。 */
export async function fetchExport(id: string, format: string, lang?: ExportLang, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<{ blob: Blob; filename: string }> {
  const r = await request(fetchImpl, exportUrl(id, format, lang), signal ? { signal } : undefined);
  const blob = await r.blob();
  if (blob.size === 0 || (blob.type || r.headers.get("content-type") || "").includes("json")) {
    throw new ApiError("导出内容无效，请重试", r.status, "BAD_EXPORT");
  }
  const cd = r.headers.get("content-disposition") ?? "";
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  return { blob, filename: m ? decodeURIComponent(m[1]) : `lecture.${format}` };
}

/** 导出整段（含读 blob）的超时上限；超时即 abort，避免请求挂死让调用方按钮永久禁用。 */
export const EXPORT_TIMEOUT_MS = 60_000;

/** 导出并触发浏览器下载（笔记页与卡片共用）；失败或超时只抛错，不触发下载。 */
export async function downloadExport(id: string, format: string, lang?: ExportLang, fetchImpl: typeof fetch = fetch): Promise<void> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, EXPORT_TIMEOUT_MS);
  try {
    const { blob, filename } = await fetchExport(id, format, lang, fetchImpl, controller.signal);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    if (timedOut) throw new ApiError("导出超时，请稍后重试", 0, "TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 时间戳跳转：定位并 play()；被拒绝（自动播放策略等）时返回提示文案而非静默失败。 */
export async function seekAndPlay(el: HTMLMediaElement | null, sec: number): Promise<string> {
  if (!el) return "播放器尚未就绪，请稍后再试";
  try { el.currentTime = sec; } catch { return "无法定位到该时间，媒体可能尚未加载"; }
  try {
    await el.play();
    return "";
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "NotAllowedError") return "已定位到该时间，浏览器阻止了自动播放，请点击播放按钮";
    return "已定位到该时间，但媒体无法播放（可能文件不可用），请稍后重试";
  }
}
