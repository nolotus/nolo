import type {
  MediaJob,
  MediaJobConfirmation,
  MediaJobNotificationKey,
  MediaJobNotificationStage,
  MediaJobStage,
} from "./types";

export interface MediaJobStagePart {
  type: "media_job_stage";
  version: 1;
  jobId: string;
  stage: MediaJobNotificationStage;
  artifacts?: { stage: MediaJobStage; key: string }[];
}

const notificationStages = ["started", "transcribe", "done"] satisfies readonly MediaJobNotificationStage[];
const artifactStages = ["preprocess", "transcribe", "label", "translate", "summarize"] satisfies readonly MediaJobStage[];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** 只接受 v1；旧 media_job / 报价载荷交由旧 reader，不猜测、不升级。 */
export function normalizeMediaJobStagePart(value: unknown): MediaJobStagePart | null {
  if (!isRecord(value) || value.type !== "media_job_stage" || value.version !== 1 ||
      !isNonemptyString(value.jobId) || typeof value.stage !== "string" ||
      !(notificationStages as readonly string[]).includes(value.stage)) return null;

  const part: MediaJobStagePart = {
    type: "media_job_stage", version: 1, jobId: value.jobId,
    stage: value.stage as MediaJobNotificationStage,
  };
  if (value.artifacts !== undefined) {
    if (!Array.isArray(value.artifacts)) return null;
    const artifacts: NonNullable<MediaJobStagePart["artifacts"]> = [];
    for (const artifact of value.artifacts) {
      if (!isRecord(artifact) || typeof artifact.stage !== "string" ||
          !(artifactStages as readonly string[]).includes(artifact.stage) || !isNonemptyString(artifact.key)) return null;
      artifacts.push({ stage: artifact.stage as MediaJobStage, key: artifact.key });
    }
    part.artifacts = artifacts;
  }
  return part;
}

/** 模型只得到阶段和引用，绝不序列化输入里的正文或其他扩展字段。 */
export function serializeMediaJobStagePartForModel(value: unknown): string | null {
  const part = normalizeMediaJobStagePart(value);
  if (!part) return null;
  return JSON.stringify({
    stage: part.stage,
    jobId: part.jobId,
    ...(part.artifacts === undefined ? {} : { artifacts: part.artifacts }),
  });
}

/** 同一次执行的同阶段得到同一键；调用方须在原子事务内查重/保存固定 messageId。 */
export function mediaJobNotificationKey(
  revision: number, stage: MediaJobNotificationStage,
): MediaJobNotificationKey {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new RangeError("Invalid execution revision");
  if (!(notificationStages as readonly string[]).includes(stage)) throw new TypeError("Invalid notification stage");
  return `${revision}:${stage}`;
}

/** 旧任务缺省为 0；只在成功 start/resume 的状态提交中应用，不用于通知重试。 */
export function nextMediaJobExecutionRevision(revision?: number): number {
  const current = revision ?? 0;
  if (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Invalid execution revision");
  }
  return current + 1;
}

/** 返回独立快照（包括报价元组），不与后续 quote 编辑共享引用。 */
export function createMediaJobConfirmation(
  job: Pick<MediaJob, "depth" | "sourceLang" | "targetLang" | "quote">,
  confirmedAt: number,
): MediaJobConfirmation {
  return {
    depth: job.depth,
    ...(job.sourceLang === undefined ? {} : { sourceLang: job.sourceLang }),
    ...(job.targetLang === undefined ? {} : { targetLang: job.targetLang }),
    totalCredits: [job.quote.totalCredits[0], job.quote.totalCredits[1]],
    confirmedAt,
  };
}
