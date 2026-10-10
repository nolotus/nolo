import type { MediaQuote } from "ai/lecture/types";
import {
  TIER_LABELS,
  MEDIA_JOB_QUOTE_TIMEOUT_MS,
} from "ai/lecture/constants";
import { callToolApi } from "./toolApiClient";
import { ToolResultError } from "./toolResultError";

export { MEDIA_JOB_QUOTE_TIMEOUT_MS };

/**
 * 外层兜底（withTimeout）相对 abort 预算的宽裕量（毫秒）。
 *
 * 两个预算职责不同，必须错开：`createQuoteAbort` 负责在 `MEDIA_JOB_QUOTE_TIMEOUT_MS`
 * 触发 abort、真正掐断 fetch；`withTimeout` 只是「等不到任何结果就别再等」的最后一道网。
 * 外层必须**严格更宽**（预算 > abort 预算）。若两者同值，谁先触发就取决于定时器注册
 * 顺序：`withTimeout` 一旦先 reject，`finally { quoteAbort.cleanup(); }` 会在 abort 之前
 * 清掉 abort 定时器，底层请求的 signal 永不 abort，超时取消静默失效（且这种依赖顺序的
 * 隐含约束一旦被重构调换就会被无声破坏）。
 */
export const MEDIA_JOB_QUOTE_FALLBACK_MARGIN_MS = 500;

/**
 * 给一个 promise 挂超时预算（兜底）。晚到的成功/失败已被挂上处理器，
 * 不会变成 unhandled rejection；请求的真正取消由调用方通过 AbortSignal
 * 完成（见 createQuoteAbort），这里只保证闸门不被挂住的请求拖死。
 *
 * 调用方传入的预算必须是 `resolveQuoteTimeoutMs(context) + MEDIA_JOB_QUOTE_FALLBACK_MARGIN_MS`
 * 而不是裸的 abort 预算——理由见上方 margin 常量的注释（外层必须晚于 abort 触发）。
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/**
 * 给闸门内报价造一个「会被 abort」的 signal，附带清理钩子。
 * 优先用 AbortSignal.timeout（运行环境支持时由平台管理定时器），
 * 否则退回 AbortController + setTimeout。两者都没有时返回 undefined，
 * 此时只剩 withTimeout 兜底（行为同以前：放弃等待，不取消请求）。
 */
const createQuoteAbort = (
  timeoutMs: number,
): { signal: AbortSignal | undefined; cleanup: () => void } => {
  const AbortSignalCtor: any = (globalThis as any).AbortSignal;
  const signalTimeout = AbortSignalCtor?.timeout;
  if (typeof signalTimeout === "function") {
    return {
      signal: signalTimeout.call(AbortSignalCtor, timeoutMs),
      cleanup: () => {},
    };
  }
  const AbortControllerCtor: any = (globalThis as any).AbortController;
  if (typeof AbortControllerCtor === "function") {
    const controller = new AbortControllerCtor();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
  }
  return { signal: undefined, cleanup: () => {} };
};

export const mediaJobSchema = {
  name: "mediaJobTool",
  description:
    "管理长音频/视频处理任务。quote 预估费用，start 启动处理，status 查询任务进度和结果。需先提供已有媒体 fileId；可限定秒数范围、处理深度 outline（大纲）、translate（翻译）、full（完整处理）。translate 档必须指定目标语言 targetLang（用户明确表达要翻译成的语言时才传，不要擅自猜语言），缺目标语言的 translate start 会被服务端拒绝。用户已在文字中表达目标语言（如「翻译为中文」）时，quote 也必须传 targetLang，使报价含翻译，不要等到 start 才传；未表达时不要猜，报价不带 targetLang，卡片会让用户自行选择译文语言。启动流程：先 quote，对话里会显示档位卡，告诉用户在卡片上点选档位即可直接启动（点击即确认），你无需再调用 start。调用 start 前必须先 quote；即使用户直接说了档位，也先 quote，让卡片显示价格。只有用户用文字明确指定了档位时才调用 start；start 会被确认闸门拦下并在卡片上显示「确认启动」按钮——被拦一次后不要重试 start，也不要因用户回复「确认」「好的」等文字再次调用（文字不构成确认），而是提示用户点击卡片上的按钮。",
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
          "目标语言代码（如 zh、en、ja）。depth=translate 时必填、depth=full 时传了才会翻译；不要替用户猜语言，只有用户明确表达了要翻译成的语言时才传。用户已表达目标语言时，quote 也要传（否则报价不含翻译，与实际启动的费用不一致）。",
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

/**
 * 模型调 start 被确认闸门拦下时写入 rawData 的载荷：卡片据此渲染「待确认启动」
 * 与「确认启动」按钮（不再是红色失败）。不含 error 字段，避免被通用 isError 判红。
 */
export type MediaJobPendingStart = {
  jobId?: string;
  fileId?: string;
  depth: "outline" | "translate" | "full";
  label: string;
  targetLang?: string;
  scope?: { fromSec?: number; toSec?: number };
  /**
   * 该档的服务端报价（积分/耗时），让用户在点「确认启动」前就看到价格。
   * 报价失败或超时则缺失，卡片按无报价渲染。
   */
  quote?: MediaQuote;
  /** 同一次 tool call 的 toolRunId：卡片优先走 executeToolRun 推进同一个 run。 */
  toolRunId?: string;
};

export type MediaJobToolContext = {
  toolRunId?: string;
  /** 覆盖闸门内报价的超时预算（毫秒）：测试注入极短值用，生产不传。 */
  quoteTimeoutMs?: number;
};

const resolveQuoteTimeoutMs = (context?: MediaJobToolContext): number => {
  const override = context?.quoteTimeoutMs;
  return typeof override === "number" && Number.isFinite(override) && override > 0
    ? override
    : MEDIA_JOB_QUOTE_TIMEOUT_MS;
};

export async function mediaJobFunc(
  input: MediaJobToolInput,
  thunkApi: any,
  context?: MediaJobToolContext,
): Promise<any> {
  const { action, fileId, jobId, fromSec, toSec, depth, targetLang } =
    input ?? {};
  if (action === "start" && !depth) {
    throw new Error(
      "start 必须指定 depth（outline/translate/full），对应用户确认的档位",
    );
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
  if (
    action === "start" &&
    depth &&
    (input as any)?.__confirmedMediaJobStart !== true
  ) {
    // 闸门前会发一次 quote：让确认卡在用户点「确认启动」前就能显示该档的
    // 积分/耗时。仍处于 quoted 的 job 会写回该档报价，与主动 quote 相同；
    // 不建 job、不启动、不计费；失败/超时一律
    // 静默（不填 quote，仍照常抛确认错误），闸门结论不变。
    let quote: MediaQuote | undefined;
    if (jobId) {
      const quoteTimeoutMs = resolveQuoteTimeoutMs(context);
      // 超时既放弃等待（withTimeout 兜底），也真正取消请求：signal 透传到
      // callToolApi 的 fetch，超时后连接被中止，不再挂到服务端自行结束。
      // 外层兜底预算严格大于 abort 预算（+MARGIN），保证 abort 永远先于兜底 reject
      // 触发、两处定时器不再依赖注册顺序（见 MEDIA_JOB_QUOTE_FALLBACK_MARGIN_MS）。
      const quoteAbort = createQuoteAbort(quoteTimeoutMs);
      try {
        const quoted = await withTimeout(
          callToolApi(
            thunkApi,
            `/api/media-jobs/${encodeURIComponent(jobId)}/quote`,
            body,
            {
              withAuth: true,
              ...(quoteAbort.signal ? { signal: quoteAbort.signal } : {}),
            },
          ),
          quoteTimeoutMs + MEDIA_JOB_QUOTE_FALLBACK_MARGIN_MS,
          "媒体任务报价超时",
        );
        quote = quoted?.quote ?? quoted?.job?.quote;
      } catch {
        // 超时 / abort / 服务端报错一律静默：不填 quote，闸门照常拦下
        quote = undefined;
      } finally {
        quoteAbort.cleanup();
      }
    }
    const label = TIER_LABELS[depth];
    const pendingStart: MediaJobPendingStart = {
      ...(jobId ? { jobId } : {}),
      ...(fileId ? { fileId } : {}),
      depth,
      label,
      ...(targetLang ? { targetLang } : {}),
      ...(body.scope ? { scope: body.scope as MediaJobPendingStart["scope"] } : {}),
      ...(quote ? { quote } : {}),
      ...(context?.toolRunId ? { toolRunId: context.toolRunId } : {}),
    };
    throw new ToolResultError("启动媒体任务前需要用户在卡片上确认所选处理档位。", {
      code: "media_job_start_requires_confirmation",
      rawData: { ...(jobId ? { jobId } : {}), pendingStart },
      displayData: `等待用户点击卡片上的「确认启动」（${label}）；不要再次调用 start，用户文字「确认」不构成确认，请提示用户点按钮。`,
    });
  }

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
        "已显示档位卡：请告诉用户在卡片上点选档位即可直接启动（点击即确认），无需你再调用 start。",
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
