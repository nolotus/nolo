import { callToolApi } from "./toolApiClient";
import { buildMediaToolConfirmation } from "ai/lecture/mediaToolConfirm";

export const translateSchema = {
  name: "translate",
  description:
    "媒体译文翻译工具。基于已完成转写的 jobId 将原文翻译为指定目标语言 targetLang（翻译模型由服务端默认策略决定）。调用前会校验费用授权，未授权需确认。",
  parameters: {
    type: "object",
    properties: {
      jobId: {
        type: "string",
        description: "媒体任务 ID（需已完成转写）。",
      },
      targetLang: {
        type: "string",
        description: "目标语言代码（如 zh、en、ja、ko、es、fr、de 等），必填。",
      },
    },
    required: ["jobId", "targetLang"],
  },
};

export type TranslateToolInput = {
  jobId: string;
  targetLang: string;
};

export async function translateFunc(
  input: TranslateToolInput,
  thunkApi: any,
): Promise<any> {
  const { jobId, targetLang } = input ?? {};
  if (!jobId) throw new Error("translate 工具必须提供 jobId");
  if (!targetLang) throw new Error("translate 工具必须指定 targetLang（目标语言）");

  const stepBody: Record<string, unknown> = {
    step: "translate",
    targetLang,
    waitMs: 60_000,
  };

  let data: any;
  try {
    data = await callToolApi(
      thunkApi,
      `/api/media-jobs/${encodeURIComponent(jobId)}/step`,
      stepBody,
      { withAuth: true },
    );
  } catch (err: any) {
    if (err?.status === 409 && err?.code === "CONFIRMATION_REQUIRED") {
      const upperCredits = err?.upperCredits ?? (err?.details as any)?.upperCredits;
      return buildMediaToolConfirmation({
        reason: "unauthorized",
        jobId,
        step: "translate",
        targetLang,
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
      jobId,
      step: "translate",
      targetLang,
      upperCredits,
    });
  }

  if (status === "running") {
    return {
      status: "running",
      jobId,
      stepId: stepResult?.stepId,
      wakeRegistered: true,
      summary: `翻译任务已在后台执行（jobId=${jobId}，目标语言=${targetLang}），完成后将自动唤醒你。`,
      rawData: data,
    };
  }

  if (status === "done") {
    return {
      status: "done",
      jobId,
      step: "translate",
      targetLang,
      summary: `翻译完成（jobId=${jobId}，语言=${targetLang}）。你可以调用 exportDocument 导出双语文档，或 readArtifact 查看产物。`,
      rawData: data,
    };
  }

  if (status === "failed") {
    return {
      status: "failed",
      jobId,
      step: "translate",
      error: stepResult?.error ?? data?.error?.message ?? "翻译执行失败",
      rawData: data,
    };
  }

  return {
    status,
    jobId,
    rawData: data,
  };
}
