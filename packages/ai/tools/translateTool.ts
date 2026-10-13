import { callToolApi } from "./toolApiClient";
import {
  buildMediaToolConfirmation,
  normalizeMediaConfirmExecutionRevision,
} from "ai/lecture/mediaToolConfirm";

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
  /**
   * 内部字段，**不开放给模型**（不在 translateSchema.parameters 里）：只由受信任的
   * UI 确认路径（executeToolRun 的 inputOverride）注入，模型入口由 stripModelToolArgs 剥掉。
   * 执行时必须与 /authorize 同值透传给 /step —— 服务端把票据绑定在
   * {step, sttProvider, targetLang, expectedExecutionRevision} 的 selection 上，
   * 任一字段不同即核销失败（历史事故：重放丢弃票据/代次，用户确认后仍返回 CONFIRMATION_REQUIRED）。
   */
  confirmationToken?: string;
  expectedExecutionRevision?: number;
};

export async function translateFunc(
  input: TranslateToolInput,
  thunkApi: any,
): Promise<any> {
  const { jobId, targetLang, confirmationToken, expectedExecutionRevision } = input ?? {};
  if (!jobId) throw new Error("translate 工具必须提供 jobId");
  if (!targetLang) throw new Error("translate 工具必须指定 targetLang（目标语言）");

  // 代次：与共享 normalizer 同一判据（有限非负整数，0 有效）。非法/缺失一律整体缺席，
  // 绝不回落成 0 —— 0 是「尚未执行过」的合法代次，替调用方编造它会绑定到错的 selection；
  // 缺席时服务端 binding 与已签发票据不相等 → 核销失败（fail-closed），不会错跑别的代次。
  const revision = normalizeMediaConfirmExecutionRevision(expectedExecutionRevision);
  const stepBody: Record<string, unknown> = {
    step: "translate",
    // 目标语言原样透传：票据 selection 与执行参数必须同源（不回落 job.targetLang，不二次规范化）。
    targetLang,
    waitMs: 60_000,
    ...(confirmationToken ? { confirmationToken } : {}),
    ...(revision !== undefined ? { expectedExecutionRevision: revision } : {}),
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
      // 代次只转述服务端 409 里的值（服务端在锁内捕获的那一代）；这里绝不另发 GET 去补，
      // 否则会把「这次失败所属的代次」错绑到 GET 时的另一代执行上。
      const executionRevision = err?.executionRevision ?? (err?.details as any)?.executionRevision;
      return buildMediaToolConfirmation({
        reason: "unauthorized",
        jobId,
        step: "translate",
        targetLang,
        upperCredits,
        executionRevision,
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
