import { TokenRecord } from "./types";
import { createTokenKey } from "database/keys";

export interface QueryParams {
  userId: string;
  startTime?: number; // 不传则查询当天
  endTime?: number;
  model?: string;
  pageSize?: number;
  offset?: number;
}

export interface QueryResult {
  records: TokenRecord[];
  total: number;
}

/**
 * 查询用户token使用记录
 * @param db 数据库实例
 * @param params 查询参数，包含用户ID、起始时间（默认当天）、模型、分页参数
 * @returns 包含记录列表和总数的结果
 */
export const queryUserTokens = async (
  db: any,
  params: QueryParams
): Promise<QueryResult> => {
  const { userId, startTime, endTime, model, pageSize = 100, offset = 0 } = params;
  const queryStart = startTime || Date.now();
  const queryEnd = endTime || (queryStart + 86_400_000);
  // Stable call-id keys are not timestamp-sortable, so scan the user prefix
  // and filter/sort by the payload timestamp.
  const { start, end } = createTokenKey.rangeOfUser(userId);
  const matching: TokenRecord[] = [];

  try {
    for await (const [_, value] of db.iterator({
      gte: start,
      lte: end,
      reverse: true,
    })) {
      const eventTime = typeof value.timestamp === "number"
        ? value.timestamp
        : value.createdAt;
      if (typeof eventTime !== "number" || eventTime < queryStart || eventTime > queryEnd) continue;
      if (model && value.model !== model) continue;
      matching.push({ ...value, createdAt: eventTime });
    }
    matching.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
    return {
      records: matching.slice(offset, offset + pageSize),
      total: matching.length,
    };
  } catch (err) {
    throw err;
  }
};
