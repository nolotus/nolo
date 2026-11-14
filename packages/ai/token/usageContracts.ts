/**
 * `/api/v1/usage/*` 的**公开响应契约**（HTTP 契约，不是 server 内部类型）。
 *
 * 为什么放 public 层：`ai/token/usageApi.ts` 是纯 fetch 访问层（web / cli / desktop 都直接消费），
 * 它必须按服务端返回的形状解析 JSON。此前这三个类型定义在 `packages/server/handlers/*` 里，
 * 于是公开集包反向依赖了硬拒绝包 `server`（`arch:check` 的 hard-deny-package:server 命中）。
 * 契约本身不依赖任何 server 私有实现——`ModelStats` 就来自 `ai/token/applyTokenUsageToDayStats`
 * （server handler 本来就在用它），`TokenRecord` 来自 `ai/token/types`。所以这里是**类型下沉**，
 * 不是「在公开层另造一份结构子集」：字段与 server 侧逐字一致，唯一真源就是本文件，
 * server handler 改为从这里 import（server 可以依赖公开层，反向不行）。
 */

import type { ModelStats } from "./applyTokenUsageToDayStats";
import type { TokenRecord } from "./types";

/** stats 接口按日聚合的最小单元（UTC 日）。 */
export interface UsageStatsDayItem {
  date: string;
  total: ModelStats;
  models: Record<string, ModelStats>;
  providers: Record<string, ModelStats>;
  agents: Record<string, ModelStats>;
  entryPaths: Record<string, ModelStats>;
  categories: Record<string, ModelStats>;
  modelCategories: Record<string, ModelStats>;
}

/** GET /api/v1/usage/stats 的响应体（UTC 日期区间按日聚合）。 */
export interface UsageStatsResponse {
  success: true;
  period: "day";
  startDate: string;
  endDate: string;
  days: UsageStatsDayItem[];
}

/** GET /api/v1/usage/records 的响应体（UTC 毫秒窗口 + 不透明 cursor 分页）。 */
export interface UsageRecordsResponse {
  success: true;
  records: TokenRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}
