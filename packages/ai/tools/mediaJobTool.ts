import type { MediaQuote } from "ai/lecture/types";
import { callToolApi } from "./toolApiClient";
import { ToolResultError } from "./toolResultError";

/** 档位文案单一真相源（quote 三档与后续渲染共用同一份措辞）。 */
const TIER_LABELS: Record<"outline" | "translate" | "full", string> = {
  outline: "只要大纲重点",
  translate: "原文+译文对照",
  full: "全套（对照+大纲+重点+术语，可导出文档）",
};

export const mediaJobSchema = {
  name: "mediaJobTool",
  description:
    "管理长音频/视频处理任务。quote 预估费用，start 启动处理，status 查询任务进度和结果。需先提供已有媒体 fileId；可限定秒数范围、处理深度 outline（大纲）、translate（翻译）、full（完整处理）。translate 档必须指定目标语言 targetLang（用户明确表达要翻译成的语言时才传，不要擅自猜语言），缺目标语言的 translate start 会被服务端拒绝。启动前建议先 quote。",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["quote", "start", "status"],
        description: "操作：quote 估价、start 启动、status 查询进度/结果。",
      },
      fileId: {
        type: "string",
        description:
          "媒体文件 ID（创建任务时必填）；status 时可省略，改传 jobId。",
      },
      jobId: {
        type: "string",
        description:
          "已有媒体任务 ID；status 必填，quote/start 可与 fileId 同时提供以继续已创建任务。",
      },
      fromSec: {
        type: "number",
        description: "处理起始秒数（可选，默认 0）。",
      },
      toSec: {
        type: "number",
        description: "处理结束秒数（可选，默认媒体结尾）。",
      },
      depth: {
        type: "string",
        enum: ["outline", "translate", "full"],
        description:
          "处理深度：outline 仅大纲（无需目标语言）；translate 翻译（必须同时传 targetLang，否则 start 返回 400 missing_target_language）；full 完整处理（传 targetLang 才含翻译，不传则只做原文转写+大纲/重点，不含译文）。action=start 时必须显式传用户已确认的档位（服务端按最贵档扣费，缺省会按 job 上已落库的最高档启动）。",
      },
      targetLang: {
        type: "string",
        description:
          "目标语言代码（如 zh、en、ja）。depth=translate 时必填、depth=full 时传了才会翻译；不要替用户猜语言，只有用户明确表达了要翻译成的语言时才传。",
      },
    },
    required: ["action"],
  },
};

export type MediaJobToolInput = {
  action: "quote" | "start" | "status";
  fileId?: string;
  jobId?: string;
  fromSec?: number;
  toSec?: number;
  depth?: "outline" | "translate" | "full";
  targetLang?: string;
};

export async function mediaJobFunc(
  input: MediaJobToolInput,
  thunkApi: any,
): Promise<any> {
  const { action, fileId, jobId, fromSec, toSec, depth, targetLang } =
    input ?? {};
  if (action === "start" && !depth) {
    throw new Error(
      "start 必须指定 depth（outline/translate/full），对应用户确认的档位",
    );
  }
  if (
    action === "start" &&
    (input as any)?.__confirmedMediaJobStart !== true
  ) {
    throw new ToolResultError("启动媒体任务前需要用户确认所选处理档位。", {
      code: "media_job_start_requires_confirmation",
      displayData: "请先向用户说明并确认处理档位后再启动。",
    });
  }
  const body: Record<string, unknown> = {};
  if (fromSec !== undefined || toSec !== undefined) {
    body.scope = {
      ...(fromSec !== undefined ? { fromSec } : {}),
      ...(toSec !== undefined ? { toSec } : {}),
    };
  }
  if (depth !== undefined) body.depth = depth;
  if (targetLang !== undefined) body.targetLang = targetLang;

  let path: string;
  let data: any;
  let tiers:
    | Array<{ depth: "outline" | "translate" | "full"; label: string; quote: MediaQuote }>
    | undefined;
  if (action === "status") {
    if (!jobId) throw new Error("status 操作必须提供 jobId");
    data = await callToolApi(
      thunkApi,
      `/api/media-jobs/${encodeURIComponent(jobId)}`,
      {},
      { withAuth: true, method: "GET" },
    );
    path = "status";
  } else if (action === "quote" || action === "start") {
    let id = jobId;
    if (!id) {
      if (!fileId) throw new Error(`${action} 操作必须提供 fileId 或 jobId`);
      const created = await callToolApi(
        thunkApi,
        "/api/media-jobs",
        { fileId, ...body },
        { withAuth: true },
      );
      id = created?.job?.id;
      if (!id) throw new Error("创建媒体任务失败：服务端未返回 job id");
    }
    path = `/api/media-jobs/${encodeURIComponent(id)}/${action}`;
    if (action === "quote") {
      const requestedDepths: Array<"outline" | "translate" | "full"> = depth
        ? [depth]
        : (["outline", "translate", "full"] as const);
      tiers = [];
      for (const tierDepth of requestedDepths) {
        data = await callToolApi(
          thunkApi,
          path,
          { ...body, depth: tierDepth },
          { withAuth: true },
        );
        tiers.push({
          depth: tierDepth,
          label: TIER_LABELS[tierDepth],
          quote: data?.quote ?? data?.job?.quote,
        });
      }
    } else {
      data = await callToolApi(thunkApi, path, body, { withAuth: true });
    }
  } else {
    throw new Error("action 必须是 quote、start 或 status");
  }
  const resolvedJobId: string | undefined = data?.job?.id ?? jobId;
  const resolvedQuote: MediaQuote | undefined =
    data?.quote ?? data?.job?.quote;
  const balanceCredits =
    resolvedQuote?.balanceCredits ?? data?.job?.quote?.balanceCredits;
  const requestText = [
    body.scope
      ? `范围 ${(body.scope as any).fromSec ?? 0}~${(body.scope as any).toSec ?? "end"}s`
      : "",
    depth ? `档位 ${depth}` : "",
    targetLang ? `目标语言 ${targetLang}` : "",
  ]
    .filter(Boolean)
    .join("，");
  // 模型可读的 bounded 上下文（走既有 toolPayload.llmContext → 上游
  // filterAndCleanMessages 优先投影），替代 generic「执行完成」摘要。
  // 只暴露 jobId / 状态 / 档位报价 / 请求范围；不带 userId、fileId 等内部字段。
  const llmContext: string | undefined = (() => {
    if (action === "quote" && tiers && resolvedJobId) {
      return [
        `媒体任务报价完成 jobId=${resolvedJobId}`,
        requestText ? `请求：${requestText}` : "",
        ...tiers.map(
          (tier) =>
            `${tier.label}（${tier.depth}）：${tier.quote?.totalCredits?.[0] ?? "?"} ~ ${tier.quote?.totalCredits?.[1] ?? "?"} 积分`,
        ),
        typeof balanceCredits === "number"
          ? `当前余额 ${balanceCredits} 积分（低于档位报价不可启动）`
          : "",
        "等待用户选择档位后调用 action=start（带 depth）。",
      ]
        .filter(Boolean)
        .join("；");
    }
    if (action === "start" && resolvedJobId) {
      return [
        `媒体任务已启动 jobId=${resolvedJobId}`,
        data?.job?.status ? `状态 ${data.job.status}` : "",
        requestText ? `请求：${requestText}` : "",
        "可用 action=status 查询进度与产物。",
      ]
        .filter(Boolean)
        .join("；");
    }
    if (action === "status" && resolvedJobId) {
      const progress = data?.job?.progress;
      return [
        `媒体任务状态 jobId=${resolvedJobId}`,
        data?.job?.status ? `状态 ${data.job.status}` : "",
        progress && typeof progress.total === "number"
          ? `进度 ${progress.done ?? 0}/${progress.total}`
          : "",
        Array.isArray(data?.job?.notes) && data.job.notes.length > 0
          ? `已生成 ${data.job.notes.length} 项产物`
          : "",
      ]
        .filter(Boolean)
        .join("；");
    }
    return undefined;
  })();

  return {
    summary:
      action === "quote"
        ? "媒体任务估价完成"
        : action === "start"
          ? "媒体任务已启动"
          : "媒体任务状态已获取",
    jobId: resolvedJobId,
    job: data?.job,
    quote: resolvedQuote,
    ...(tiers ? { tiers } : {}),
    ...(llmContext ? { llmContext } : {}),
    // 持久化 / 卡片消费的载荷：并入 tiers 与 jobId，否则通用投影
    // （toolThunks: toolResult.rawData ?? toolResult）只落最后一档原始响应，
    // 卡片只能单档回退渲染。
    rawData: {
      jobId: resolvedJobId,
      job: data?.job,
      quote: resolvedQuote,
      ...(tiers ? { tiers } : {}),
    },
  };
}
