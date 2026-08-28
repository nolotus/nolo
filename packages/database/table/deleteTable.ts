// 文件: database/table/deleteTable.ts

import {
  idxKey,
  isTableMetaKey,
  rowKey,
  SEPARATOR,
  createKey,
} from "database/keys";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { buildTombstoneRecord } from "database/tombstones";

export interface KeyValueDB {
  iterator: (opts: {
    gte?: string;
    lte?: string;
    keys?: boolean;
    values?: boolean;
  }) => AsyncIterable<[string, unknown]>;
  get?: (key: string) => Promise<unknown>;
  put?: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<void>;
  batch?: (
    ops: Array<
      | { type: "del"; key: string }
      | { type: "put"; key: string; value: unknown }
    >
  ) => Promise<void>;
}

export interface DeleteTableResult {
  processingIds: string[];
}

/**
 * 从 meta key 中解析 tenantId / tableId
 * 约定：meta-{tenantId}-{tableId}
 */
const parseMetaKey = (metaDbKey: string) => {
  if (!isTableMetaKey(metaDbKey)) {
    throw new Error(
      `deleteTable 预期传入的是表 meta key（meta-{tenantId}-{tableId}），收到: ${metaDbKey}`
    );
  }

  const parts = metaDbKey.split(SEPARATOR);
  const tenantId = parts[1];
  const tableId = parts.slice(2).join(SEPARATOR);
  return { tenantId, tableId };
};

const collectEntriesInRange = async (
  db: KeyValueDB,
  range: { gte: string; lte: string }
): Promise<Array<[string, unknown]>> => {
  const entries: Array<[string, unknown]> = [];

  let iterator = (db as any).iterator({
    gte: range.gte,
    lte: range.lte,
  });

  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }

  for await (const [key, value] of iterator) {
    entries.push([key as string, value]);
  }

  return entries;
};

const belongsToTable = (
  value: unknown,
  tenantId: string,
  tableId: string
): value is Record<string, any> =>
  Boolean(
    value &&
      typeof value === "object" &&
      (value as any).tenantId === tenantId &&
      (value as any).tableId === tableId
  );

const indexValueReferencesRows = (
  value: unknown,
  rowDbKeys: Set<string>,
  rowIds: Set<string>
): boolean => {
  if (typeof value === "string") {
    return rowDbKeys.has(value) || rowIds.has(value);
  }
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, any>;
  return (
    (typeof candidate.dbKey === "string" && rowDbKeys.has(candidate.dbKey)) ||
    (typeof candidate.rowDbKey === "string" &&
      rowDbKeys.has(candidate.rowDbKey)) ||
    (typeof candidate.rowId === "string" && rowIds.has(candidate.rowId))
  );
};

/**
 * 删除一整张表：
 * - 入参是表的 meta key：meta-{tenantId}-{tableId}
 * - meta 和 row 写 tombstone，避免多服务器合并时旧活记录回流。
 * - idx/view 是派生索引，直接物理删除。
 */
export const deleteTable = async (
  db: KeyValueDB,
  metaDbKey: string
): Promise<DeleteTableResult> => {
  const { tenantId, tableId } = parseMetaKey(metaDbKey);
  const nowIso = new Date().toISOString();

  const putOps: Array<{ type: "put"; key: string; value: unknown }> = [];
  const deleteKeys = new Set<string>();
  const processingIds = new Set<string>();

  const metaRecord =
    typeof db.get === "function"
      ? await db.get(metaDbKey).catch(() => null)
      : null;
  if (metaRecord && typeof metaRecord === "object") {
    putOps.push({
      type: "put",
      key: metaDbKey,
      value: buildTombstoneRecord(metaRecord as Record<string, unknown>, nowIso),
    });
    processingIds.add(metaDbKey);
  } else {
    deleteKeys.add(metaDbKey);
    processingIds.add(metaDbKey);
  }

  // 1) 收集所有行 key
  const rowRange = rowKey.range(tenantId, tableId);
  const rowEntries = (await collectEntriesInRange(db, rowRange)).filter(
    ([, value]) => belongsToTable(value, tenantId, tableId)
  );
  const rowDbKeys = new Set(rowEntries.map(([key]) => key));
  const rowIds = new Set(
    rowEntries
      .map(([, value]) =>
        value !== null && typeof value === "object"
          ? (value as { rowId?: unknown }).rowId
          : undefined
      )
      .filter((rowId): rowId is string => typeof rowId === "string")
  );
  rowEntries.forEach(([key, value]) => {
    const record = asRecordOrEmpty(value);
    putOps.push({
      type: "put",
      key,
      value: buildTombstoneRecord(record, nowIso),
    });
    processingIds.add(key);
  });

  // 2) 收集所有索引 key
  const indexRange = idxKey.prefix(tenantId, tableId);
  const indexEntries = await collectEntriesInRange(db, indexRange);
  indexEntries.forEach(([key, value]) => {
    if (
      !belongsToTable(value, tenantId, tableId) &&
      !indexValueReferencesRows(value, rowDbKeys, rowIds)
    ) {
      return;
    }
    deleteKeys.add(key);
    processingIds.add(key);
  });

  // 3) 收集所有视图 key：view-{tenantId}-{tableId}-{viewId}
  const viewPrefix = createKey("view", tenantId, tableId, "");
  const viewEntries = await collectEntriesInRange(db, {
    gte: viewPrefix,
    lte: viewPrefix + "\uffff",
  });
  viewEntries.forEach(([key, value]) => {
    if (!belongsToTable(value, tenantId, tableId)) return;
    deleteKeys.add(key);
    processingIds.add(key);
  });

  if (typeof db.batch === "function") {
    await db.batch(
      [
        ...putOps,
        ...Array.from(deleteKeys).map((key) => ({
          type: "del" as const,
          key,
        })),
      ]
    );
  } else {
    if (putOps.length > 0 && typeof db.put !== "function") {
      throw new Error("deleteTable tombstone writes require db.put or db.batch");
    }
    await Promise.all([
      ...putOps.map((op) => db.put!(op.key, op.value)),
      ...Array.from(deleteKeys).map((key) => db.del(key)),
    ]);
  }

  return { processingIds: Array.from(processingIds) };
};
