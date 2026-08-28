// Usage 数据源的纯 async 访问层（无 redux、无 dispatch）。
//
// Wave 剥离：原 tokenThunks 用 createAsyncThunk 绑 redux store 取 server/token，
// 这里改为「API 依赖注入」（UsageApiDeps），调用方（hook/组件）自己从合适的位置
// 解析 server/token。fetch 逻辑本身无副作用、可独立测试，之后 settings/auth 也
// 脱离 redux 时只需改调用方解析方式，本文件零改动。
//
// 契约：见 packages/server/handlers/usageStatsHandler.ts 与 usageRecordsHandler.ts
// （stats：UTC 日期区间聚合；records：UTC 毫秒窗口 + 不透明 cursor 分页，
// 服务端每次请求全扫+排序，cursor 仅位置标记防 offset 漂移）。

import type { TokenRecord } from "./types";
import type { QueryResult } from "./queryUserTokens";
import type { UsageStatsResponse, UsageStatsDayItem } from "server/handlers/usageStatsHandler";
import type { UsageRecordsResponse } from "server/handlers/usageRecordsHandler";
import { ALL_MODELS } from "./usageConstants";

export interface UsageApiDeps {
  /** 服务端 base URL（可带尾部斜杠） */
  server: string;
  /** Bearer token；无账号/本地模式为 null（不附加 Authorization） */
  token: string | null;
}

/** stats 响应 day 附上 timeKey（= date），与图表 series 构建对齐。 */
export interface TokenStatsItem extends UsageStatsDayItem {
  timeKey: string;
}

/** stats 查询参数：UTC 日期区间。userId 不需要——服务端从鉴权 token 取。 */
export interface TokenStatsParams {
  startDate: string;
  endDate: string;
  period?: "day";
}

const normalizeServer = (server: string): string => server.replace(/\/+$/, "");

const authHeaders = (token: string | null): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/** GET /api/v1/usage/stats：UTC 日期区间 [startDate, endDate] 的按日聚合。 */
export async function fetchTokenStats(
  deps: UsageApiDeps,
  params: TokenStatsParams
): Promise<TokenStatsItem[]> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    period: params.period || "day",
  });

  const response = await fetch(
    `${normalizeServer(deps.server)}/api/v1/usage/stats?${query.toString()}`,
    { method: "GET", headers: authHeaders(deps.token) }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ||
        `Failed to fetch token stats: HTTP ${response.status}`
    );
  }

  const data: UsageStatsResponse = await response.json();
  return (data.days || []).map((day) => ({ ...day, timeKey: day.date }));
}

export interface UsageRecordsPageParams {
  startTime?: number;
  endTime?: number;
  model?: string;
  /** 服务端上限 200 */
  pageSize?: number;
  /** 不透明游标；null/缺省 = 从最新开始 */
  cursor?: string | null;
}

export interface UsageRecordsPageResult {
  records: TokenRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** GET /api/v1/usage/records 单页：UTC 毫秒窗口 + cursor。 */
export async function fetchUsageRecordsPage(
  deps: UsageApiDeps,
  params: UsageRecordsPageParams
): Promise<UsageRecordsPageResult> {
  const { startTime, endTime, model, pageSize = 50, cursor } = params;

  const query = new URLSearchParams();
  if (typeof startTime === "number" && Number.isFinite(startTime)) {
    query.set("startTime", String(startTime));
  }
  if (typeof endTime === "number" && Number.isFinite(endTime)) {
    query.set("endTime", String(endTime));
  }
  query.set("limit", String(pageSize));
  if (model && model !== ALL_MODELS) {
    query.set("model", model);
  }
  if (cursor) {
    query.set("cursor", cursor);
  }

  const response = await fetch(
    `${normalizeServer(deps.server)}/api/v1/usage/records?${query.toString()}`,
    { method: "GET", headers: authHeaders(deps.token) }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ||
        `Failed to fetch usage records: HTTP ${response.status}`
    );
  }

  const data: UsageRecordsResponse = await response.json();
  return {
    records: data.records || [],
    nextCursor: data.nextCursor,
    hasMore: Boolean(data.hasMore),
  };
}

/**
 * 全量拉取（等价旧 queryUserTokensThunk 语义）：循环 cursor 直到结束，
 * 上限 1 万条。仅用于「整段汇总」类场景；列表展示请用单页 + loadMore。
 */
export interface FetchAllUsageRecordsResult extends QueryResult {
  /** 命中 1 万条上限被截断（调用方应提示用户导出不完整） */
  truncated: boolean;
}

export async function fetchAllUsageRecords(
  deps: UsageApiDeps,
  params: Pick<UsageRecordsPageParams, "startTime" | "endTime" | "model">,
  pageSize = 200
): Promise<FetchAllUsageRecordsResult> {
  let allRecords: TokenRecord[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let truncated = false;

  while (hasMore) {
    const page = await fetchUsageRecordsPage(deps, { ...params, pageSize, cursor });
    allRecords = allRecords.concat(page.records);
    cursor = page.nextCursor;
    hasMore = Boolean(page.hasMore && cursor);
    if (allRecords.length >= 10000) {
      truncated = true;
      break;
    }
  }

  return { records: allRecords, total: allRecords.length, truncated };
}

/** 月度预算（US-4.2）：读当前阈值。 */
export interface MonthlyBudgetDto {
  threshold: number;
  period: "month";
  notifiedPeriod?: string;
}

export async function fetchBudget(
  deps: UsageApiDeps
): Promise<MonthlyBudgetDto | null> {
  const response = await fetch(
    `${normalizeServer(deps.server)}/api/v1/usage/budget`,
    { method: "GET", headers: authHeaders(deps.token) }
  );
  if (!response.ok) throw new Error(`Failed to fetch budget: HTTP ${response.status}`);
  const data = await response.json();
  return data?.budget ?? null;
}

export async function saveBudget(
  deps: UsageApiDeps,
  threshold: number
): Promise<MonthlyBudgetDto> {
  const response = await fetch(
    `${normalizeServer(deps.server)}/api/v1/usage/budget`,
    {
      method: "PUT",
      headers: { ...authHeaders(deps.token), "Content-Type": "application/json" },
      body: JSON.stringify({ threshold }),
    }
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Failed to save budget: HTTP ${response.status}`
    );
  }
  const data = await response.json();
  return data?.budget ?? { threshold, period: "month" };
}
