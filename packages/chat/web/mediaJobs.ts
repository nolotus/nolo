import type {
  MediaJob,
  MediaJobDepth,
  MediaQuote,
  MediaScope,
} from "ai/lecture/types";

const API = "/api/media-jobs";

export async function mediaJobRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  // 网关/代理故障（如 502 HTML）时 body 不是 JSON，解析失败不能让原始 HTTP 错误被 SyntaxError 掩盖。
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = body?.error;
    throw Object.assign(
      new Error(error?.message ?? `Media request failed (HTTP ${response.status})`),
      error,
    );
  }
  return body as T;
}

export const createMediaJob = (payload: {
  fileId: string;
  dialogId?: string;
  sourceLang?: string;
  targetLang?: string;
}) =>
  mediaJobRequest<{ job: MediaJob }>("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMediaQuote = (
  id: string,
  scope: MediaScope,
  depth: MediaJobDepth,
  sourceLang?: string,
  targetLang?: string,
) =>
  mediaJobRequest<{ job: MediaJob; quote: MediaQuote }>(`/${id}/quote`, {
    method: "POST",
    body: JSON.stringify({ scope, depth, sourceLang, targetLang }),
  });

export const startMediaJob = (
  id: string,
  scope: MediaScope,
  depth: MediaJobDepth,
  sourceLang?: string,
  targetLang?: string,
  dialogId?: string,
  confirmationToken?: string,
) =>
  mediaJobRequest<{ job: MediaJob }>(`/${id}/start`, {
    method: "POST",
    body: JSON.stringify({ scope, depth, sourceLang, targetLang, dialogId, confirmationToken }),
  });

/**
 * 归一化 GET /:id 的响应。远端真实 body 是**裸 MediaJob**（顶层 id/status/stageArtifacts/execution），
 * 本地 handler 版本包装为 `{ job }`。两种都接受，统一返回 `{ job }`；无法识别则返回 job:null（不编造）。
 */
export function normalizeMediaJobResponse(body: unknown): { job: MediaJob | null } {
  if (!body || typeof body !== "object") return { job: null };
  const b = body as Record<string, unknown>;
  if (b.job && typeof b.job === "object") return { job: b.job as MediaJob };
  if (typeof b.id === "string" && typeof b.status === "string") return { job: b as unknown as MediaJob };
  return { job: null };
}

export const getMediaJob = async (id: string): Promise<{ job: MediaJob | null }> =>
  normalizeMediaJobResponse(await mediaJobRequest<unknown>(`/${id}`));

export const mediaJobAction = (id: string, action: string, payload?: unknown) =>
  mediaJobRequest<{ job: MediaJob }>(`/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });

/**
 * POST /:id/step 的真实结果（server: packages/server/handlers/mediaJobs/pipeline.ts `MediaStepResult`）。
 * 注意：成功响应是 `{ stepResult, jobId }`，**没有** `job` 字段。
 */
export type MediaStepOutcome =
  | { status: "done"; artifacts?: { transcribe?: { segments?: TranscriptSegment[] } } }
  | { status: "running"; stepId: string; wakeRegistered: true }
  | { status: "awaiting_confirmation"; overrunCredits: number }
  | { status: "failed"; error: string }
  | { status: "confirmation_required" };

export interface TranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
}

/**
 * 按单步真值推导某一步的阶段（不看 job.status，因为 job 的其他步骤可能已 done）：
 * - done：该步所有 stage 的产物 KV 都已存在（stageArtifacts）；
 * - running：job.status=running 且 execution 为本步 step 模式（execution.step === step）；
 * - failed：job.status=failed 且 job.error 存在、且本步未完成；
 * - awaiting：job.status=awaiting_confirmation 且 execution 为本步（需追加授权）；
 * - 其余返回 unknown（调用方须视为「无真值」，不得确认/不得推断成功）。
 */
export type MediaStepPhase = "done" | "running" | "failed" | "awaiting" | "unknown";

const STEP_STAGE_KEYS: Record<"transcribe" | "translate", string[]> = {
  transcribe: ["preprocess", "transcribe"],
  translate: ["translate"],
};

export function deriveMediaStepPhase(
  job: Pick<MediaJob, "status" | "stageArtifacts" | "execution" | "error"> | null | undefined,
  step: "transcribe" | "translate",
): MediaStepPhase {
  if (!job) return "unknown";
  const stages = STEP_STAGE_KEYS[step];
  const artifacts = (job.stageArtifacts ?? {}) as Record<string, unknown>;
  const stepDone = stages.every((s) => Boolean(artifacts[s]));
  if (stepDone) return "done";
  const owns = job.execution?.mode === "step" && job.execution.step === step;
  if (job.status === "running" && owns) return "running";
  if (job.status === "awaiting_confirmation" && owns) return "awaiting";
  if (job.status === "failed" && owns && job.error) return "failed";
  return "unknown";
}

export const mediaJobStep = (
  id: string,
  payload: { step: "transcribe" | "translate"; targetLang?: string; confirmationToken?: string },
) =>
  mediaJobRequest<{ stepResult: MediaStepOutcome; jobId: string }>(`/${id}/step`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * 读取已生成的转写片段（GET artifacts，server: handler.ts `GET artifacts`）。
 * 分页完整性由服务端字段决定：hasMore / nextOffset / truncated（truncated 表示 maxChars 截断，需续读）。
 */
export interface TranscriptPage {
  segments: TranscriptSegment[];
  totalSegments: number;
  hasMore: boolean;
  nextOffset: number | null;
  truncated: boolean;
}

export const getMediaTranscript = (id: string, offset = 0) =>
  mediaJobRequest<TranscriptPage>(
    `/${id}/artifacts?type=transcribe&offset=${offset}&limit=200`,
  );

/** Called only from confirmation-card event handlers, never from model tools. */
export const authorizeMediaJob = (
  id: string,
  action: "start" | "extend" | "confirm-overrun" | "step",
  payload: Record<string, unknown>,
  autoApproveCredits?: number,
) =>
  mediaJobRequest<{ confirmationToken: string; upperCredits: number }>(`/${id}/authorize`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Media-User-Confirmation": "1" },
    body: JSON.stringify({ ...payload, action, ...(autoApproveCredits === undefined ? {} : { autoApproveCredits }) }),
  });

export const authorizeMediaStep = (
  id: string,
  payload: { step: "transcribe" | "translate"; targetLang?: string },
  autoApproveCredits?: number,
) =>
  authorizeMediaJob(id, "step", payload, autoApproveCredits);

export function roundUpToFriendlyCredits(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 1;
  const friendlyTiers = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const tier of friendlyTiers) {
    if (credits <= tier) return tier;
  }
  return Math.ceil(credits / 100) * 100;
}

