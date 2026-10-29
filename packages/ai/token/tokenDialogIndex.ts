// ai/token/tokenDialogIndex.ts
//
// 「按 dialogId 查 token 明细」的二级索引：写入侧 + 一次性回填。
//
// 索引键：`idx-token-dialog-<userId>-<dialogId>-<callId>`
//   - 前缀固定 → 同一对话的索引项在字典序里连续聚簇，范围扫描 = O(匹配数)；
//   - callId 放后缀 → 每次写入是独立原子 Put，没有读-改-写竞争；
//   - 主记录键放在 value 里 → 读取时不必从键反解 callId。
//
// 索引项必须与主记录在**同一次 batchWrite** 里落库（主键 + 索引键原子打包），
// 否则会出现「主记录在、索引不在」→ 读取路径漏数据。

import {
  createKey,
  createTokenDialogBackfillKey,
  createTokenDialogIndexKey,
  createTokenKey,
  TOKEN_DIALOG_INDEX_FORMAT,
  type TokenDialogIndexValue,
} from "database/keys";

export type TokenDialogIndexOp = {
  type: "put";
  key: string;
  value: TokenDialogIndexValue;
};

/**
 * 构造某条 token 明细对应的索引写入操作。
 *
 * - `dialogId` 必须与主记录里存的 `dialogId` **逐字一致**（可能是裸 id，也可能是
 *   `dialog-<userId>-<id>` 完整键）——读取路径按主记录里的这个值做匹配；
 * - 缺 dialogId 的记录不写索引：它本来就无法按对话检索（旧的全量扫描同样匹配不到）。
 */
export function buildTokenDialogIndexOps(args: {
  userId: string;
  dialogId: string;
  callId: string;
  recordKey: string;
}): TokenDialogIndexOp[] {
  const userId = (args.userId ?? "").trim();
  const dialogId = (args.dialogId ?? "").trim();
  const callId = (args.callId ?? "").trim();
  const recordKey = (args.recordKey ?? "").trim();
  if (!userId || !dialogId || !callId || !recordKey) return [];
  return [
    {
      type: "put",
      key: createTokenDialogIndexKey(userId, dialogId, callId),
      value: { userId, dialogId, callId, recordKey },
    },
  ];
}

/**
 * 从主记录键反推「索引后缀用的 callId」。
 *
 * - `token-<userId>-call-<encCallId>` → encCallId（与写入侧 `callId` 一致）；
 * - 其它形态（时间戳式旧键、`failed-call-…`）→ 整段后缀（天然唯一，可当 id 用）。
 */
export function deriveCallIdFromTokenRecordKey(userId: string, recordKey: string): string {
  const prefix = createKey("token", userId) + "-";
  const rest = recordKey.startsWith(prefix) ? recordKey.slice(prefix.length) : recordKey;
  if (rest.startsWith("call-")) {
    try {
      return decodeURIComponent(rest.slice("call-".length));
    } catch {
      return rest.slice("call-".length);
    }
  }
  return rest;
}

/**
 * 旧版（v1）索引键布局：`idx-token-dialog-<userId>-<dialogId>-<encodeURIComponent(callId)>`。
 *
 * v1 的段里可能含 `-`（userId / dialogId / callId 都可能带连字符）→ 键空间会
 * 前缀重叠（`chat` 的扫描范围罩住 `chat-feature`）。v2 改成段内转义（见
 * encodeTokenIndexSegment）后重叠消失。
 *
 * 回填时用它算出「同一条记录的旧键」并删掉：否则旧键会留在新扫描范围里，
 * 变成扫得到但用不上的脏条目（数据不会错——回表后按 dialogId 过滤——但白扫）。
 */
export const legacyTokenDialogIndexKey = (userId: string, dialogId: string, callId: string): string =>
  createKey("idx-token-dialog", userId, dialogId, encodeURIComponent(callId));

/** 回填/读取所需的最小存储能力（真实 broker 客户端与测试假实现都满足）。 */
export type TokenDialogIndexStore = {
  get(key: string): Promise<unknown>;
  iterator(options: { gte: string; lte?: string; lt?: string }): AsyncIterable<[string, any]>;
  batchWrite(ops: Array<{ type: "put" | "del"; key: string; value?: unknown }>): Promise<void>;
};

export type BackfillProgress = {
  scanned: number;
  indexed: number;
  skipped: number;
};

/**
 * 一次性回填：把某个用户已有的 token 明细补上二级索引，并写回填完成标记。
 *
 * - **幂等**：索引键由 (userId, dialogId, callId) 决定，重跑写的是同一批键；
 *   中断后重跑（或带 `after` 从某个主记录键继续）都能收敛到同一状态。
 * - **标记最后写**：只有整段扫描完成后才写 `idx-tokendlg-backfill-<userId>`，
 *   读取路径据此判断「可以只走索引」；中途崩溃不会留下半截标记。
 * - **标记带格式版本**（TOKEN_DIALOG_INDEX_FORMAT）：索引键格式变了但用户还没
 *   重新回填时，旧标记不被信任 → 读取路径退回全量扫描（慢但不会静默查不到）。
 */
export async function backfillTokenDialogIndex(args: {
  store: TokenDialogIndexStore;
  userId: string;
  /** 每批写入的索引项条数（默认 500）。 */
  batchSize?: number;
  /** 最多处理多少条主记录（测试/试跑用）。 */
  limit?: number;
  /** 续跑：只处理主记录键 >= after 的部分。 */
  after?: string;
  /**
   * 重建：先删掉「回填完成标记」，并把同一条记录的**旧格式索引键**一并删掉，
   * 再写新格式索引键。索引键格式变更（v1 → v2）时必须用这个模式，否则旧键会
   * 留在新扫描范围里变成脏条目。
   */
  rebuild?: boolean;
  onProgress?: (progress: BackfillProgress) => void;
}): Promise<{ scanned: number; indexed: number; skipped: number; markerKey: string; markerWritten: boolean }> {
  const userId = (args.userId ?? "").trim();
  if (!userId) throw new Error("backfillTokenDialogIndex: 缺少 userId");
  const batchSize = Math.max(1, args.batchSize ?? 500);
  const limit = args.limit && args.limit > 0 ? args.limit : Number.POSITIVE_INFINITY;
  const range = createTokenKey.rangeOfUser(userId);
  const start = args.after && args.after > range.start ? args.after : range.start;
  const userPrefix = createKey("token", userId) + "-";
  const markerKey = createTokenDialogBackfillKey(userId);

  // 重建模式：先把「索引可信」标记删掉 —— 重建过程中索引是不完整的，
  // 留着旧标记会让读取路径只走索引而漏数据。
  if (args.rebuild) {
    await args.store.batchWrite([{ type: "del", key: markerKey }]);
  }

  let scanned = 0;
  let indexed = 0;
  let skipped = 0;
  let batch: Array<{ type: "put" | "del"; key: string; value?: unknown }> = [];
  const flush = async () => {
    if (batch.length === 0) return;
    const ops = batch;
    batch = [];
    await args.store.batchWrite(ops);
  };

  for await (const [recordKey, value] of args.store.iterator({ gte: start, lte: range.end })) {
    if (scanned >= limit) break;
    scanned += 1;
    const raw = value as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      continue;
    }
    // 只处理本用户的明细记录（统计键 / 幂等标记 / 别的用户的记录都跳过）。
    if (!recordKey.startsWith(userPrefix)) {
      skipped += 1;
      continue;
    }
    if (raw.type !== undefined && raw.type !== "token") {
      skipped += 1;
      continue;
    }
    if (typeof raw.userId === "string" && raw.userId !== userId) {
      skipped += 1;
      continue;
    }
    const dialogId = typeof raw.dialogId === "string" ? raw.dialogId.trim() : "";
    if (!dialogId) {
      skipped += 1;
      continue;
    }
    const callId = deriveCallIdFromTokenRecordKey(userId, recordKey);
    const indexOps = buildTokenDialogIndexOps({ userId, dialogId, callId, recordKey });
    batch.push(...indexOps);
    if (args.rebuild) {
      // 同一条记录的旧格式键：v1 的段里可能带 '-'，会落进别人的扫描范围。
      const legacyKey = legacyTokenDialogIndexKey(userId, dialogId, callId);
      const currentKey = indexOps[0]?.key;
      if (legacyKey !== currentKey) batch.push({ type: "del", key: legacyKey });
    }
    indexed += 1;
    if (batch.length >= batchSize) {
      await flush();
      args.onProgress?.({ scanned, indexed, skipped });
    }
  }
  await flush();
  args.onProgress?.({ scanned, indexed, skipped });

  // 部分回填（limit / after 续跑的中途）**不写标记**：标记的含义是「该用户的明细
  // 已全部带索引」，写了会让读取路径只走索引而漏掉还没回填的老记录。
  const partial = Number.isFinite(limit) || Boolean(args.after);
  if (!partial) {
    await args.store.batchWrite([
      {
        type: "put",
        key: markerKey,
        value: {
          userId,
          at: Date.now(),
          indexed,
          scanned,
          format: TOKEN_DIALOG_INDEX_FORMAT,
        },
      },
    ]);
  }
  return { scanned, indexed, skipped, markerKey, markerWritten: !partial };
}
