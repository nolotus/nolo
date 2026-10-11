import { callToolApi } from "./toolApiClient";

export const transcribeSchema = {
  name: "transcribe",
  description:
    "长音频/视频转写工具。支持传入已有媒体文件 fileId 或已有媒体任务 jobId，按需转写指定时间范围（转写引擎由服务端默认策略决定）。长任务会在后台运行并在完成后唤醒 agent；调用前会校验费用授权，未授权需确认。",
  parameters: {
    type: "object",
    properties: {
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
    },
  },
};

export type TranscribeToolInput = {
  fileId?: string;
  jobId?: string;
  fromSec?: number;
  toSec?: number;
  sourceLang?: string;
};

export async function transcribeFunc(
  input: TranscribeToolInput,
  thunkApi: any,
): Promise<any> {
  const { fileId, jobId, fromSec, toSec, sourceLang } = input ?? {};
  let resolvedJobId = jobId;

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
      return {
        status: "requires_confirmation",
        reason: "unauthorized",
        jobId: resolvedJobId,
        step: "transcribe",
        upperCredits,
        summary: "需要用户确认后才能执行，请用 ask_user 呈现计划与费用（推荐项在前）并等待确认，或提示用户先在设置中开额度",
      };
    }
    throw err;
  }

  const stepResult = data?.stepResult ?? data;
  const status = stepResult?.status ?? "unknown";

  if (status === "awaiting_confirmation") {
    const upperCredits = stepResult?.overrunCredits ?? data?.error?.upperCredits;
    return {
      status: "requires_confirmation",
      reason: "budget_overrun",
      jobId: resolvedJobId,
      step: "transcribe",
      upperCredits,
      summary: `转写预算超额，需要用户确认追加预算（还需 ${upperCredits ?? "若干"} 积分）。请使用 ask_user 说明已花费与还需积分并等待确认。`,
      rawData: data,
    };
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
