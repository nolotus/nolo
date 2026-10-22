import { callToolApi } from "./toolApiClient";

export const exaSearchSchema = {
    name: "exa_search",
    description: "使用 Exa 智能搜索引擎查找信息。可选地按检索意图、内容类目、时间范围与域名做收窄。",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "要搜索的自然语言查询字符串。",
            },
            numResults: {
                type: "number",
                description: "返回的结果数量；不填则按服务端定档取值。",
            },
            intent: {
                type: "string",
                enum: ["quick", "research", "exhaustive"],
                description:
                    "检索意图档位：quick＝快速扫一眼（默认档，够用即可）；research＝深入调研，需要更完整的结果与更长的摘要；exhaustive＝穷尽式检索，结果最多、开销也最大。绝大多数情况请省略本项——省略即由服务端按场景自动定档，不要为了填它而猜测。",
            },
            category: {
                type: "string",
                description:
                    "内容类目筛选。常见取值：publication（论文/出版物）、company（公司信息）、people（人物）、news（新闻资讯）。不确定类目就别填，留空即可。",
            },
            timeRange: {
                type: "string",
                enum: ["day", "week", "month", "year"],
                description:
                    "只保留该时间范围内发布的结果（day＝24 小时内，week＝一周内，month＝一月内，year＝一年内）。不填则不限时间。",
            },
            includeDomains: {
                type: "array",
                items: { type: "string" },
                description: "只保留这些域名下的结果（例如 [\"arxiv.org\"]）。不填则不限。",
            },
            excludeDomains: {
                type: "array",
                items: { type: "string" },
                description: "排除这些域名下的结果（例如 [\"pinterest.com\"]）。不填则不排除。",
            },
        },
        required: ["query"],
    },
};

/**
 * 定档信号（可选）——契约见 docs/plans/2026-10-21-exa-3-0-sync.md §3/§10。
 *
 * 三个信号都**只在能拿到时才发**：服务端对缺失字段自动跳过对应规则，
 * 绝不猜、绝不补默认值。拿不到就当作「没有这个信号」，行为等价于接线前。
 */
export type ExaSearchPlanSignals = {
  /** 本 dialog 内已发生的 exa_search 调用次数（不含本次）。 */
  priorSearches?: number;
  /** 上一次 exa_search 的返回条数（空结果升档规则需要它）。 */
  lastResultCount?: number;
  /** 调用来源：chat（前台对话）/ agent / automation。 */
  origin?: "chat" | "agent" | "automation";
  /** 当前对话 id：用于从 Redux 里数历史搜索次数。 */
  dialogId?: string;
  /** 当前这批 tool_call 所属的 assistant 消息 id。 */
  parentMessageId?: string;
};

const EXA_SEARCH_TOOL_NAME = "exa_search";
/** 这些状态说明该行只是占位/进行中，不算「已发生」。 */
const NON_COMPLETED_TOOL_STATUS = new Set(["running", "pending"]);

/** 从 Redux message slice（`state.message[dialogId].msgs`，EntityAdapter 形状）取消息列表。 */
const collectDialogMessages = (
  state: any,
  dialogId: string | undefined
): any[] => {
  if (!dialogId) return [];
  const slice = state?.message ?? state?.messages;
  const dialogState = slice?.[dialogId];
  const msgs = dialogState?.msgs ?? dialogState;
  if (!msgs || typeof msgs !== "object") return [];
  const entities = (msgs as any).entities ?? {};
  const ids: string[] = Array.isArray((msgs as any).ids)
    ? (msgs as any).ids
    : Object.keys(entities);
  const out: any[] = [];
  for (const id of ids) {
    const m = entities[id];
    if (m && typeof m === "object") out.push(m);
  }
  return out;
};

const isExaSearchRow = (m: any): boolean => {
  if (!m || typeof m !== "object") return false;
  const payload = m.toolPayload;
  const name = m.toolName ?? payload?.toolName;
  const status = payload?.status;
  if (typeof status === "string" && NON_COMPLETED_TOOL_STATUS.has(status)) {
    return false;
  }
  return name === EXA_SEARCH_TOOL_NAME;
};

/** 从 tool 消息里尽力读出返回条数（results 数组长度）。 */
const readResultCount = (m: any): number | undefined => {
  const candidates = [
    m?.content,
    m?.toolPayload?.rawData,
    m?.toolPayload?.output,
    m?.toolPayload?.result,
  ];
  for (const candidate of candidates) {
    let value = candidate;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        continue;
      }
    }
    if (!value || typeof value !== "object") continue;
    const inner = (value as any).rawData ?? value;
    const results = (inner as any)?.results;
    if (Array.isArray(results)) return results.length;
  }
  return undefined;
};

/** 由调用点显式给出 > 从对话历史推导；都没有就是 undefined（不发这个键）。 */
const resolvePlanSignals = (
  thunkApi: any,
  context?: ExaSearchPlanSignals
): { priorSearches?: number; lastResultCount?: number; origin?: string } => {
  let priorSearches = context?.priorSearches;
  let lastResultCount = context?.lastResultCount;

  if (priorSearches === undefined) {
    let rows: any[] = [];
    try {
      rows = collectDialogMessages(
        thunkApi?.getState?.(),
        context?.dialogId
      );
    } catch {
      rows = [];
    }
    if (rows.length > 0) {
      // 同批（同一 parent assistant 消息）的调用还没「发生完」，不计入。
      const history = rows.filter(
        (m) =>
          isExaSearchRow(m) &&
          (!context?.parentMessageId ||
            m.parentMessageId !== context.parentMessageId)
      );
      priorSearches = history.length;
      const last = history[history.length - 1];
      if (last) lastResultCount = readResultCount(last);
    }
  }

  return {
    ...(typeof priorSearches === "number" && Number.isFinite(priorSearches)
      ? { priorSearches: Math.max(0, Math.trunc(priorSearches)) }
      : {}),
    ...(typeof lastResultCount === "number" && Number.isFinite(lastResultCount)
      ? { lastResultCount: Math.max(0, Math.trunc(lastResultCount)) }
      : {}),
    ...(context?.origin ? { origin: context.origin } : {}),
  };
};

export const exaSearchFunc = async (
    input: any,
    thunkApi: any,
    context?: ExaSearchPlanSignals
): Promise<any> => {
    const {
        query,
        numResults,
        intent,
        category,
        timeRange,
        includeDomains,
        excludeDomains,
        includeContent,
    } = input;

    // 契约见 docs/plans/2026-10-21-exa-3-0-sync.md 第 3 节：
    // 只发服务端认的键；intent 原样转发，没给就不带这个键（由服务端定档）。
    // useAutoprompt 已废弃，绝不转发；type/detail 不在模型 schema 内。
    const body: Record<string, any> = { query };
    if (numResults !== undefined) body.numResults = numResults;
    if (typeof intent === "string" && intent) body.intent = intent;
    if (typeof category === "string" && category) body.category = category;
    if (typeof timeRange === "string" && timeRange) body.timeRange = timeRange;
    if (Array.isArray(includeDomains) && includeDomains.length > 0) {
        body.includeDomains = includeDomains;
    }
    if (Array.isArray(excludeDomains) && excludeDomains.length > 0) {
        body.excludeDomains = excludeDomains;
    }
    // legacy 兼容：includeContent 只在调用方显式给出时透传，服务端把它映射为 detail；
    // 模型侧已不再暴露该字段，这里不会主动补默认值。
    if (typeof includeContent === "boolean") body.includeContent = includeContent;

    // 定档信号：只发拿得到的键（服务端按缺失跳过规则，见契约 §3/§10）。
    const signals = resolvePlanSignals(thunkApi, context);
    if (signals.priorSearches !== undefined) body.priorSearches = signals.priorSearches;
    if (signals.lastResultCount !== undefined) body.lastResultCount = signals.lastResultCount;
    if (signals.origin) body.origin = signals.origin;

    const data = await callToolApi(thunkApi, "/api/exa-search", body, { withAuth: true });

    const results = (data.results || []).map((item: any) => {
        const raw =
            item.text ??
            (Array.isArray(item.highlights) ? item.highlights.join("\n") : undefined);
        return {
            title: item.title,
            url: item.url,
            publishedDate: item.publishedDate,
            author: item.author,
            content: typeof raw === "string" ? raw.slice(0, 2500) : undefined,
        };
    });

    const warnings = Array.isArray(data.warnings) ? data.warnings : undefined;

    return {
        summary: `Found ${results.length} results for "${query}"`,
        results,
        queryUsed: data.queryUsed || data.autopromptString || query,
        ...(warnings && warnings.length > 0 ? { warnings } : {}),
        // plan.ruleId 让调用方能判断服务端这次命中的定档规则是否合预期。
        ...(data.plan && typeof data.plan === "object" ? { plan: data.plan } : {}),
    };
};
