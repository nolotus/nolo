import { callToolApi } from "./toolApiClient";
import {
  buildMediaToolConfirmation,
  normalizeMediaConfirmExecutionRevision,
} from "ai/lecture/mediaToolConfirm";

export const transcribeSchema = {
  name: "transcribe",
  description:
    "长音频/视频转写工具。纯转写直接使用本工具，不要改走旧课程 quote/整套档位流程；默认启动/续办转写会校验费用授权，未授权时返回 requires_confirmation。费用授权由现有步骤确认卡承接：拿到 requires_confirmation 就结束本轮、等用户在界面上点卡确认，不要另调 ask_user 求授权，也不要把用户的文字回复当作已完成授权（文字回复不会授权任何扣费）。已给出 jobId 时必须复用 jobId：消息或上下文里出现 jobId（例如「[媒体附件] … jobId=…」）时，action=transcribe 与 action=status 都必须带上同一个 jobId；fileId 只在没有任何可复用 job 时才使用——不要为同一个附件再建任务。使用 action=status 和已有 jobId 可只读查询进度（只读，不执行）；询问任务进度时使用此模式。",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["transcribe", "status"],
        description:
          "status 只读查询已有任务进度；用户询问进度时使用 status。只要消息或上下文里已经给出 jobId，action=transcribe 与 action=status 都复用该 jobId，不要改用 fileId 去建新任务。",
      },
      fileId: {
        type: "string",
        description:
          "媒体文件 ID。仅当消息与上下文里都没有可复用的 jobId 时才传（此时才会新建转写任务）；已有 jobId 时不要传 fileId——不要为同一个附件再建任务，应先复用该 jobId。",
      },
      jobId: {
        type: "string",
        description:
          "已有媒体任务 ID。消息或上下文里给出过 jobId（例如「[媒体附件] … jobId=…」）时必须复用它：续办/执行转写传 action=transcribe + jobId，查进度传 action=status + jobId。",
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
  /**
   * 内部字段，**不开放给模型**（不在 transcribeSchema.parameters 里）：只由受信任的
   * UI 确认路径（executeToolRun 的 inputOverride）注入，模型入口由 stripModelToolArgs 剥掉。
   */
  confirmationToken?: string;
  /** 同 confirmationToken：执行时与 /authorize 同值透传，供服务端锁内绑定校验（0 是合法代次）。 */
  expectedExecutionRevision?: number;
};

async function transcribeInternal(
  input: TranscribeToolInput,
  thunkApi: any,
): Promise<any> {
  const { action = "transcribe", fileId, jobId, fromSec, toSec, sourceLang, sttProvider, confirmationToken, expectedExecutionRevision } = input ?? {};
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

  // 代次：与 translateTool / 共享 normalizer 同一判据（有限非负整数，0 有效）。
  // 非法/缺失一律整体缺席、绝不回落成 0；缺席时票据 binding 不等 → 服务端拒绝核销（fail-closed）。
  const revision = normalizeMediaConfirmExecutionRevision(expectedExecutionRevision);
  const stepBody: Record<string, unknown> = {
    step: "transcribe",
    waitMs: 60_000,
    // 仅显式指定时透传；未指定保持服务端既有默认行为（不静默选供应商、不改全局默认）。
    ...(typeof sttProvider === "string" ? { sttProvider } : {}),
    // 授权票据与声明的执行代次：只能由受信任的 UI 确认路径注入，执行时原样带上（绝不进 summary/日志）。
    ...(confirmationToken ? { confirmationToken } : {}),
    ...(revision !== undefined ? { expectedExecutionRevision: revision } : {}),
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
      // 与 translateTool 同款、同字段：只转述服务端 409 锁内捕获的代次，不额外 GET 补齐。
      const executionRevision = err?.executionRevision ?? (err?.details as any)?.executionRevision;
      return buildMediaToolConfirmation({
        reason: "unauthorized",
        jobId: resolvedJobId,
        step: "transcribe",
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

/** Model context is independent of the UI summary; never expose authorization tickets. */
export async function transcribeFunc(input: TranscribeToolInput, thunkApi: any): Promise<any> {
  const result = await transcribeInternal(input, thunkApi);
  const stepResult = result.rawData?.stepResult ?? result.rawData;
  const artifact = stepResult?.artifacts?.transcribe;
  const fileId = artifact?.fileId ?? stepResult?.fileId;
  const downloadUrl = artifact?.downloadUrl ?? stepResult?.downloadUrl;
  return {
    ...result,
    llmContext: JSON.stringify({
      status: result.status, jobId: result.jobId, step: "transcribe",
      ...(result.targetLang ? { targetLang: result.targetLang } : {}),
      artifact: { jobId: result.jobId, type: "transcribe",
        ...(fileId ? { fileId, downloadUrl: downloadUrl ?? null } : {}) },
      ...(result.error ? { error: result.error } : {}),
      nextTool: result.status === "done" ? "readArtifact" : result.status === "running" ? "transcribe" : null,
      instruction: result.status === "done"
        ? "Call readArtifact({ jobId }) for segment ids and text; then writeTranslations or exportDocument."
        : result.status === "running"
          ? "Wait for completion wake; use transcribe({ jobId, action: 'status' }) to inspect status. Reuse this jobId, never fileId. Do not restart paid work."
          : result.status === "requires_confirmation"
            ? "费用授权由现有步骤确认卡承接：拿到 requires_confirmation 即结束本轮、等用户点卡确认；不要调用 ask_user 求授权，也不要把用户文字回复当作已完成授权。需要时用 transcribe({ jobId, action: 'status' }) 查进度，不要用 fileId 重建任务。"
            : "Await user confirmation when required; do not retry paid work automatically. Inspect transcribe({ jobId, action: 'status' }) if needed. Reuse the existing jobId; never start a second job with fileId.",
    }),
  };
}
