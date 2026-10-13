import { callToolApi } from "./toolApiClient";
import { buildMediaToolConfirmation } from "ai/lecture/mediaToolConfirm";

export const transcribeSchema = {
  name: "transcribe",
  description:
    "长音频/视频转写工具。纯转写直接使用本工具，不要改走旧课程 quote/整套档位流程；默认启动/续办转写会校验费用授权，未授权时需用户确认后按原参数重放。使用 action=status 和已有 jobId 可只读查询进度（只读，不执行）；询问任务进度时使用此模式。",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["transcribe", "status"], description: "status 只读查询已有任务进度；用户询问进度时使用 status。" },
      fileId: {
        type: "string",
        description: "媒体文件 ID（与 jobId 二选一）。若无 jobId，需传 fileId 启动转写。",
      },
      jobId: {
        type: "string",
        description: "已有媒体任务 ID（与 fileId 二选一）。",
      },
      fromSec: {
        type: "number",
        description: "起始秒数（可选），不传默认从开头开始。",
      },
      toSec: {
        type: "number",
        description: "结束秒数（可选），不传默认到媒体结束。",
      },
      sourceLang: {
        type: "string",
        description: "源语言代码（可选，如 en、zh、ja）。不传则自动识别。",
      },
      sttProvider: {
        type: "string",
        enum: ["nolo", "modal", "groq", "together", "deepinfra", "grok", "local"],
        description:
          "STT 供应商（可选，仅 action=transcribe 的单步执行有效）。仅当用户明确指定时才填写；不传由服务端按已配置的默认链决定，不要替用户默认选某一家。local 是 nolo 的兼容别名。",
      },
    },
  },
};

export type TranscribeToolInput = {
  action?: "transcribe" | "status";
  fileId?: string;
  jobId?: string;
  fromSec?: number;
  toSec?: number;
  sourceLang?: string;
  sttProvider?: string;
  confirmationToken?: string;
};

export async function transcribeFunc(
  input: TranscribeToolInput,
  thunkApi: any,
): Promise<any> {
  const { action = "transcribe", fileId, jobId, fromSec, toSec, sourceLang, sttProvider, confirmationToken } = input ?? {};
  if (action === "status" && !jobId) throw new Error("status 模式必须提供已有 jobId");
  if (action === "status" && (fileId || fromSec !== undefined || toSec !== undefined || sourceLang)) throw new Error("status 模式仅接受 jobId");
  let resolvedJobId = jobId;
  if (resolvedJobId) {
    const lookup = await callToolApi(thunkApi, `/api/media-jobs/${encodeURIComponent(resolvedJobId)}`, {}, { withAuth: true, method: "GET" });
    const job = assertMediaJob(lookup?.job ?? lookup);
    if (action === "status") return formatJobStatus(job, resolvedJobId);
    if ((fromSec !== undefined && fromSec !== job.scope?.fromSec) || (toSec !== undefined && toSec !== job.scope?.toSec))
      throw new Error("已有 jobId 的 scope 与请求不匹配；拒绝复用/执行");
    if (sourceLang && sourceLang !== job.sourceLang)
      throw new Error("已有 jobId 的 sourceLang 与请求不匹配；拒绝复用/执行");
    if (job.stageArtifacts?.transcribe) return formatJobStatus(job, resolvedJobId);
    if (job.status === "running") return formatJobStatus(job, resolvedJobId);
  }
  if (action === "status") throw new Error("status 模式必须提供已有 jobId");
  if (!resolvedJobId) {
    if (!fileId) {
      throw new Error("transcribe 工具必须提供 fileId 或 jobId");
    }
    const createBody: Record<string, unknown> = { fileId };
    if (fromSec !== undefined || toSec !== undefined) {
      createBody.scope = {
        ...(fromSec !== undefined ? { fromSec } : {}),
        ...(toSec !== undefined ? { toSec } : {}),
      };
    }
    if (sourceLang) createBody.sourceLang = sourceLang;

    const created = await callToolApi(thunkApi, "/api/media-jobs", createBody, {
      withAuth: true,
    });
    resolvedJobId = created?.job?.id;
    if (!resolvedJobId) throw new Error("创建媒体任务失败：服务端未返回 jobId");
  }

  const stepBody: Record<string, unknown> = {
    step: "transcribe",
    waitMs: 60_000,
    // 仅显式指定时透传；未指定保持服务端既有默认行为（不静默选供应商、不改全局默认）。
    ...(typeof sttProvider === "string" ? { sttProvider } : {}),
    ...(confirmationToken ? { confirmationToken } : {}),
  };

  let data: any;
  try {
    data = await callToolApi(
      thunkApi,
      `/api/media-jobs/${encodeURIComponent(resolvedJobId)}/step`,
      stepBody,
      { withAuth: true },
    );
  } catch (err: any) {
    if (err?.status === 409 && err?.code === "CONFIRMATION_REQUIRED") {
      const upperCredits = err?.upperCredits ?? (err?.details as any)?.upperCredits;
      return buildMediaToolConfirmation({
        reason: "unauthorized",
        jobId: resolvedJobId,
        step: "transcribe",
        upperCredits,
      });
    }
    throw err;
  }

  const stepResult = data?.stepResult ?? data;
  const status = stepResult?.status ?? "unknown";

  if (status === "awaiting_confirmation") {
    const upperCredits = stepResult?.overrunCredits ?? data?.error?.upperCredits;
    return buildMediaToolConfirmation({
      reason: "budget_overrun",
      jobId: resolvedJobId,
      step: "transcribe",
      upperCredits,
    });
  }

  if (status === "running") {
    return {
      status: "running",
      jobId: resolvedJobId,
      stepId: stepResult?.stepId,
      wakeRegistered: true,
      summary: `转写任务已在后台执行（jobId=${resolvedJobId}），完成后将自动唤醒你。醒来后请核对状态并决定下一步。`,
      rawData: data,
    };
  }

  if (status === "done") {
    const segmentCount = stepResult?.artifacts?.transcribe?.segments?.length ?? 0;
    return {
      status: "done",
      jobId: resolvedJobId,
      step: "transcribe",
      segmentCount,
      summary: `转写完成（jobId=${resolvedJobId}，共 ${segmentCount} 个片段）。你可以调用 readArtifact 读取内容，或调用 translate 翻译，或 exportDocument 导出。`,
      rawData: data,
    };
  }

  if (status === "failed") {
    return {
      status: "failed",
      jobId: resolvedJobId,
      step: "transcribe",
      error: stepResult?.error ?? data?.error?.message ?? "转写执行失败",
      rawData: data,
    };
  }

  return {
    status,
    jobId: resolvedJobId,
    rawData: data,
  };
}

function assertMediaJob(value: any): any {
  if (!value || typeof value !== "object" || typeof value.status !== "string" || typeof value.id !== "string") {
    throw new Error("媒体任务响应结构无效");
  }
  return value;
}

function formatJobStatus(job: any, jobId: string): any {
  const hasTranscribeArtifact = Boolean(job.stageArtifacts?.transcribe);
  const done = hasTranscribeArtifact;
  const total = job.progress?.total;
  const completed = job.progress?.done;
  const progress = Number.isInteger(total) && total > 0 && Number.isInteger(completed) && completed >= 0 && completed <= total
    ? { completed, total, scope: "job" as const } : undefined;
  const result: any = {
    status: done ? "done" : job.status,
    jobId,
    ...(job.stage ? { stage: job.stage } : {}),
    ...(progress ? { progress } : {}),
    ...(hasTranscribeArtifact ? { reused: true } : {}),
    rawData: job,
  };
  if (hasTranscribeArtifact) {
    result.summary = `转写产物已就绪（jobId=${jobId}）。请调用 readArtifact 读取内容。`;
  } else if (job.status === "done") {
    result.summary = `媒体任务已结束但没有转写产物（jobId=${jobId}），请核查任务状态。`;
  } else {
    result.summary = `媒体任务状态：${job.status}${job.stage ? `，当前阶段：${job.stage}` : ""}（jobId=${jobId}）。`;
  }
  return result;
}
