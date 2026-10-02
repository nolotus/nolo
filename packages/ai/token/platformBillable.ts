// 平台计费口径的纯函数真值（2026-10-02 usage display 口径修复）。
//
// 一条调用记录对「平台消费」有贡献，当且仅当：
//   billable !== false  且  status !== "failed"
// 两条兼容规则：
// - 旧记录没有 billable 字段：按可计费兼容（与 dialogUsage.ts、
//   chatProxyBilling.ts 的 `billable !== false` 判据一致）。
// - status 缺省视为 success（ai/token/types.ts US-3.3）；failed 调用未向
//   用户计费，其 cost 只是目录价估值，不计入平台消费。
//
// 注意：这里的「平台消费」是按记录的 billable/status 推断的展示口径，
// 不等于账本实扣；账本实扣以 ledger 为准。

export interface PlatformBillableRecordLike {
  /** 唯一计费标志：true 才扣费，false 只统计；旧记录缺省按可计费兼容 */
  billable?: boolean;
  /** 调用终态：缺省 success；failed = 调用失败（未向用户计费） */
  status?: string;
}

export const isPlatformBillableRecord = (
  record: PlatformBillableRecordLike | null | undefined
): boolean => {
  if (!record) return false;
  return record.billable !== false && record.status !== "failed";
};

/** 带 cost 的记录形态（TokenRecord 的子集），供 sumPlatformBillableCost 使用。 */
export interface PlatformBillableCostRecordLike extends PlatformBillableRecordLike {
  cost?: number;
}

/**
 * 汇总一组记录里计入平台消费的 cost。读法与报表的 toFiniteNumber 一致：
 * 非有限数（缺省/NaN）按 0 计。空集返回 0。
 */
export const sumPlatformBillableCost = (
  records: readonly PlatformBillableCostRecordLike[] | null | undefined
): number => {
  let total = 0;
  for (const record of records ?? []) {
    if (!isPlatformBillableRecord(record)) continue;
    const cost = Number(record.cost);
    if (Number.isFinite(cost)) total += cost;
  }
  return total;
};
