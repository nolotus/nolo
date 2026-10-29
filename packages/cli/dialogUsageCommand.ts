import { readFileSync } from "node:fs";
import { extractCustomId } from "core/prefix";
import { resolveObservedSpeed } from "ai/token/observedSpeedResolver";
import { normalizeTimingMs } from "ai/token/providerCallTiming";
import { fetchUsageRecordsPage } from "ai/token/usageApi";
import type { TokenRecord } from "ai/token/types";
import { parseDialogKey } from "database/dialogKey";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
  resolveServerUrl,
  type EnvLike,
} from "./cliEnvHelpers";

/**
 * 本机 token 明细扫描的页大小。
 *
 * 本机 authority broker 的 iterator 会把整个 range 物化成数组再分页返回，
 * 因此页越小 → 请求次数越多 → 服务端重复全量扫描的次数越多。这里用大页
 * 把「扫全量」压到一次请求（默认 200 会退化成上千次全量扫描）。
 *
 * 实测：本机 27.7 万条 token 明细全量扫描一次 ≈ 2.3s（客户端峰值内存
 * 约 700MB）——这是 fallback 路径才付的代价。
 */
const LOCAL_TOKEN_SCAN_PAGE_SIZE = 300_000;

/** 单次 broker 请求的超时：全量扫描 + 传输远大于普通 get。 */
const LOCAL_TOKEN_SCAN_TIMEOUT_MS = 120_000;

/**
 * 本地回退的扫描硬上限。实测 27.7 万条已占约 700MB 峰值内存；再往上会 OOM，
 * 所以到顶就明确失败，而不是把 CLI 拖死。远端同类路径有 MAX_SCANNED_RECORDS
 * 兜底，本地此前没有（2026-10-29 审查指出）。
 */
const LOCAL_TOKEN_SCAN_MAX_RECORDS = 400_000;

/**
 * 索引范围扫描的**原始键数**上限（脏索引 / 脏数据的兜底）。
 *
 * 与「有效匹配数」上限（LOCAL_TOKEN_SCAN_MAX_RECORDS）分开：判定「索引异常」看
 * 的是有效匹配数，扫描键数只是防止一个坏掉的 range 把整个库拖进来。
 */
const LOCAL_TOKEN_INDEX_MAX_SCANNED_KEYS = 4_000_000;

/** 用量记录的来源：远端仓库 / 本机 LevelDB。 */
export type UsageRecordSource = "remote" | "local";

/** 本地用量回退的查询参数。 */
export interface LocalUsageRecordQuery {
  /** 用户给的完整 dialog key（如 `dialog-<user>-<id>`）或裸 id。 */
  dialogKey: string;
  /** 裸 dialog id（远端 usage/records 就是按这个字段精确匹配的）。 */
  dialogId: string;
  /**
   * 扫描范围所属的用户。给定则只扫该用户的 token 前缀；缺省表示扫全量
   * token 前缀（慢，仅在无法判定归属时使用）。
   */
  userId?: string;
  /** 运行环境（本机 broker / NOLO_HOME 的定位依据）。 */
  env?: EnvLike;
}

/** 本地用量仓储（测试可注入假的实现）。 */
export type LocalUsageRecordReader = (
  query: LocalUsageRecordQuery,
) => Promise<TokenRecord[]>;

/** One usage record is one recorded call, not necessarily every attempted request. */
export function formatDialogUsage(
  dialogKey: string,
  records: TokenRecord[],
  source: UsageRecordSource = "remote",
): string {
  if (records.length === 0) return `${dialogKey}: 无用量记录（对话不存在或尚无记录）。\n`;
  const input = records.reduce((sum, record) => sum + record.input_tokens, 0);
  const output = records.reduce((sum, record) => sum + record.output_tokens, 0);
  const durations = records.flatMap((record) => {
    const ms = normalizeTimingMs(record.callDurationMs);
    return ms === undefined ? [] : [ms];
  });
  const lines = [
    `Dialog: ${dialogKey}`,
    `调用次数（用量记录）: ${records.length}`,
    `Tokens: input=${input}, output=${output}`,
  ];
  if (source === "local") {
    lines.push("来源: local（本机用量记录；远端仓库暂无该对话的用量记录）");
  }
  if (durations.length === 0) {
    lines.push("无耗时数据");
  } else {
    lines.push(`总耗时（已记录调用之和，非对话墙钟时长）: ${durations.reduce((a, b) => a + b, 0)} ms（覆盖 ${durations.length}/${records.length}）`);
    if (durations.length < records.length) lines.push(`无耗时数据: ${records.length - durations.length} 条（仅计 tokens）`);
    const speed = resolveObservedSpeed(records, { limit: records.length });
    for (const group of speed.throughputGroups) {
      lines.push(`${group.basis}: median=${group.medianOutputTokensPerSecond} tokens/s, n=${group.throughputSampleCount}${group.throughputSampleCount === 1 ? "（单样本，不可靠）" : ""}`);
    }
    if (speed.throughputGroups.length === 0) lines.push("无有效速度样本");
  }
  return `${lines.join("\n")}\n`;
}

/** 本地明细 → 远端同构的 TokenRecord（口径字段一一对应，单位不变）。 */
function toUsageTokenRecord(value: unknown): TokenRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const inputTokens = Number(record.input_tokens);
  const outputTokens = Number(record.output_tokens);
  const timestamp = Number(record.timestamp);
  const createdAt = Number.isFinite(timestamp)
    ? timestamp
    : Number(record.createdAt) || 0;
  return {
    ...(record as object),
    id: typeof record.id === "string" ? record.id : "",
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    createdAt,
  } as TokenRecord;
}

/** 读取本机 authority broker 的实际 endpoint（metadata 里记的是活着的那个）。 */
function readLiveBrokerEndpoint(metadataPath: string): string | undefined {
  try {
    const raw = JSON.parse(readFileSync(metadataPath, "utf8")) as { endpoint?: unknown };
    return typeof raw.endpoint === "string" && raw.endpoint.trim() ? raw.endpoint.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 打开一个用于「一次性全量扫描」的 broker 客户端。
 *
 * 与普通 `get` 不同：扫描要把整段 range 物化 + 传输，默认 200 条/页 + 5s
 * 超时会让一次扫描退化成上千次请求。因此这里显式放大页大小与超时。
 */
export async function openLocalTokenScanClient(env: EnvLike) {
  const [{ getDefaultCliLocalRuntimeAuthority }, driver, broker] = await Promise.all([
    import("./localRuntimeAuthority"),
    import("../database-engine/cliAuthorityStoreDriver"),
    import("../database-engine/cliAuthorityBrokerClient"),
  ]);
  // 先确保本机 broker 已就绪（与 dialog read / dialog status 同一通道）。
  await getDefaultCliLocalRuntimeAuthority({ env });
  const metadataPath = driver.resolveCliAuthorityBrokerMetadataPath({ transport: "tcp", env });
  const endpoint =
    readLiveBrokerEndpoint(metadataPath) ??
    driver.resolveCliAuthorityBrokerEndpoint({ transport: "tcp", env });
  const invoke = broker.createCliAuthorityBrokerSocketInvoker({
    endpoint,
    timeoutMs: LOCAL_TOKEN_SCAN_TIMEOUT_MS,
  });
  return broker.createCliAuthorityBrokerClient({
    endpoint,
    invoke,
    iteratorPageSize: LOCAL_TOKEN_SCAN_PAGE_SIZE,
  });
}

/**
 * 从本机 LevelDB 读取某条对话的 token 明细。
 *
 * 与远端 usage/records 同一口径：按 `dialogId` 精确匹配，字段（input/output
 * tokens、callDurationMs、firstOutputMs）都是各调用点写盘时的原值，单位一致，
 * 不做任何换算。远端扫用户 token 前缀，本地同样只扫该用户的前缀
 * （`token-<userId>-…`），统计类 key（token-stats-*）不在该范围内。
 */
/**
 * 本机 LevelDB 读取用到的最小 broker 能力（测试可注入假的实现）。
 */
export type LocalTokenScanClient = {
  get(key: string): Promise<unknown>;
  iterator(options: {
    gte: string;
    lte?: string;
    lt?: string;
    reverse?: boolean;
    limit?: number;
  }): AsyncIterable<[string, any]>;
};

/**
 * 从本机 LevelDB 读取某条对话的 token 明细。
 *
 * 优先走**二级索引** `idx-token-dialog-<userId>-<dialogId>-<callId>`：范围扫描的
 * 代价 = O(该对话的调用数)，与该用户的总记录数无关（本机 27.7 万条的全量扫描是
 * 2.3s / 峰值 700MB）。
 *
 * 索引未回填（回填标记 `idx-tokendlg-backfill-<userId>` 缺失）时退回全量扫描
 * （带 40 万条上限兜底）——绝不因为「索引里没有」就回答「没有用量记录」，那是
 * 静默的数据缺失。索引条目结构异常时同样退回全量扫描。
 */
export async function readLocalDialogTokenRecords(
  query: LocalUsageRecordQuery,
  deps: {
    /** 打开 broker 客户端（测试注入假的实现）。 */
    openClient?: (env: EnvLike) => Promise<LocalTokenScanClient>;
    /** 强制走旧的全量扫描路径（对比/兜底用）。 */
    forceScan?: boolean;
  } = {},
): Promise<TokenRecord[]> {
  const [{ createTokenKey, createKey, createTokenDialogIndexKey, createTokenDialogBackfillKey, TOKEN_DIALOG_INDEX_FORMAT }] =
    await Promise.all([import("database/keys")]);
  const env = query.env ?? process.env;
  const client = await (deps.openClient ?? openLocalTokenScanClient)(env);
  const candidates = new Set(
    [query.dialogKey, query.dialogId].filter((value): value is string => Boolean(value)),
  );
  if (query.userId && !deps.forceScan) {
    const indexed = await readLocalDialogTokenRecordsByIndex({
      client,
      userId: query.userId,
      candidates,
      rangeOfDialog: createTokenDialogIndexKey.rangeOfDialog,
      backfillKey: createTokenDialogBackfillKey(query.userId),
      indexFormat: TOKEN_DIALOG_INDEX_FORMAT,
    });
    if (indexed) return indexed;
  }
  return readLocalDialogTokenRecordsByScan({ client, query, candidates, createTokenKey, createKey });
}

/**
 * 走二级索引读取；返回 null = 「不能只靠索引回答」，调用方退回全量扫描。
 */
async function readLocalDialogTokenRecordsByIndex(args: {
  client: LocalTokenScanClient;
  userId: string;
  candidates: Set<string>;
  rangeOfDialog: (userId: string, dialogId: string) => { start: string; end: string };
  backfillKey: string;
  /** 当前索引键格式版本：标记里的版本对不上 → 索引不可信 → 退回全量扫描。 */
  indexFormat: string;
}): Promise<TokenRecord[] | null> {
  const { client, userId, candidates } = args;
  const marker = await client.get(args.backfillKey).catch(() => null);
  const markerRecord = marker && typeof marker === "object" ? (marker as Record<string, unknown>) : null;
  // 标记不存在 / 标记是旧格式 → 这个用户的索引**不可信**（没回填，或回填用的是
  // 旧键格式）→ 退回全量扫描。绝不能因为「索引里没有」就答「没有用量记录」。
  if (!markerRecord || markerRecord.format !== args.indexFormat) return null;

  const recordKeys: string[] = [];
  const seen = new Set<string>();
  let scannedKeys = 0;
  for (const dialogId of candidates) {
    const range = args.rangeOfDialog(userId, dialogId);
    for await (const [, value] of client.iterator({ gte: range.start, lte: range.end })) {
      scannedKeys += 1;
      // 原始扫描键数只作「脏索引把 range 撑爆」的兜底（比有效匹配数宽松一个量级）；
      // 判定「索引异常」用的是**有效匹配数**，不是扫描键数——否则别的对话的条目
      // （前缀重叠 / 脏数据）会把计数抬高，把正常查询误判成异常并退回全量扫描。
      if (scannedKeys > LOCAL_TOKEN_INDEX_MAX_SCANNED_KEYS) return null;
      const recordKey =
        value && typeof value === "object" && typeof value.recordKey === "string"
          ? value.recordKey
          : "";
      // 索引项缺 recordKey = 索引结构坏了（不是「这个对话没有记录」）→ 退回全量。
      if (!recordKey) return null;
      if (seen.has(recordKey)) continue;
      seen.add(recordKey);
      recordKeys.push(recordKey);
    }
  }

  // 索引可信（标记是当前格式）→ 这里「一条都没有」就是**真的没有记录**，
  // 直接返回空，不再白扫一遍全量前缀。
  const records: TokenRecord[] = [];
  for (const recordKey of recordKeys) {
    const raw = (await client.get(recordKey).catch(() => null)) as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") continue;
    if (raw.type !== undefined && raw.type !== "token") continue;
    // 索引前缀与用户 id 段之间没有边界编码（`user-1` / `user-1-extra`），逐条核验归属。
    if (typeof raw.userId === "string" && raw.userId !== userId) continue;
    const recordDialogId = typeof raw.dialogId === "string" ? raw.dialogId : "";
    if (!recordDialogId || !candidates.has(recordDialogId)) continue;
    const record = toUsageTokenRecord(raw);
    if (record) records.push(record);
  }
  // 上限判定看的是**实际匹配到的记录数**，不是扫到的索引键数：别的对话的条目
  // （前缀重叠 / 脏数据）只会抬高扫描键数，不会让这条查询被误判成异常。
  if (records.length > LOCAL_TOKEN_SCAN_MAX_RECORDS) return null;
  return records;
}

/**
 * 旧路径：全量扫该用户的 token 前缀再在内存里按 dialogId 过滤。
 *
 * 只在「索引未回填 / 索引异常 / 拿不到 userId」时走；40 万条上限是 OOM 兜底。
 */
async function readLocalDialogTokenRecordsByScan(args: {
  client: LocalTokenScanClient;
  query: LocalUsageRecordQuery;
  candidates: Set<string>;
  createTokenKey: typeof import("database/keys").createTokenKey;
  createKey: typeof import("database/keys").createKey;
}): Promise<TokenRecord[]> {
  const { client, query, candidates } = args;
  const range = query.userId
    ? args.createTokenKey.rangeOfUser(query.userId)
    : { start: args.createKey("token", ""), end: args.createKey("token", "\uffff") };
  const records: TokenRecord[] = [];
  let scanned = 0;
  for await (const [, value] of client.iterator({ gte: range.start, lte: range.end })) {
    scanned += 1;
    if (scanned > LOCAL_TOKEN_SCAN_MAX_RECORDS) {
      throw new Error(
        `本地用量记录超过 ${LOCAL_TOKEN_SCAN_MAX_RECORDS} 条，已中止扫描（避免 OOM）。` +
          `可加 --server-url 走远端，或等按 dialogId 的索引落地。`,
      );
    }
    const raw = value as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") continue;
    if (raw.type !== undefined && raw.type !== "token") continue;
    // 前缀可能在 `user-1` / `user-1-extra` 这类连字符用户上重叠：逐条核验归属，
    // 否则会把别的用户的记录算进来（审查指出）。
    if (query.userId && typeof raw.userId === "string" && raw.userId !== query.userId) continue;
    const recordDialogId = typeof raw.dialogId === "string" ? raw.dialogId : "";
    if (!recordDialogId || !candidates.has(recordDialogId)) continue;
    const record = toUsageTokenRecord(raw);
    if (record) records.push(record);
  }
  return records;
}

/**
 * 远端空 → 本机回退。远端拿不到（抛错）或返回空记录时读本机 LevelDB；
 * 本机也没有则维持既有语义（抛远端错误 / 输出「无用量记录」）。
 */
export async function runDialogUsageCommand(
  args: string[],
  deps: {
    env?: EnvLike;
    output?: { write(text: string): unknown };
    fetchPage?: typeof fetchUsageRecordsPage;
    /** 本地用量仓储（测试注入假的实现）。 */
    readLocalRecords?: LocalUsageRecordReader;
  } = {},
): Promise<number> {
  const output = deps.output ?? process.stdout;
  if (args.includes("--help") || args.includes("-h")) {
    output.write("Usage: nolo dialog usage <dialogKey> [--server-url <url>]\n");
    return 0;
  }
  const dialogKey = args[0]?.trim();
  if (!dialogKey || dialogKey.startsWith("--")) {
    output.write("Usage: nolo dialog usage <dialogKey> [--server-url <url>]\n");
    return 1;
  }
  const env = deps.env ?? process.env;
  const token = resolveAuthToken(args, env);
  if (!token) {
    output.write("[nolo] dialog usage requires login. Run `nolo login`.\n");
    return 1;
  }
  const dialogId = dialogKey.startsWith("dialog-") ? extractCustomId(dialogKey) : dialogKey;
  const api = { server: resolveServerUrl(args, env), token };
  const fetchPage = deps.fetchPage ?? fetchUsageRecordsPage;
  const records: TokenRecord[] = [];
  const endTime = Date.now();
  let cursor: string | null = null;
  const cursors = new Set<string>();
  let remoteError: unknown = null;
  try {
    do {
      const page = await fetchPage(api, { dialogId, startTime: 0, endTime, pageSize: 200, cursor });
      records.push(...page.records);
      if (!page.hasMore) break;
      if (!page.nextCursor || cursors.has(page.nextCursor)) throw new Error("Usage pagination did not advance; refusing a partial total.");
      cursor = page.nextCursor;
      cursors.add(cursor);
    } while (true);
  } catch (error) {
    // 分页守卫是「远端总数不可信」的有意停手，不是「远端拿不到」：不能被本地
    // 回退掩盖，直接上抛。
    if (error instanceof Error && error.message.includes("Usage pagination did not advance")) throw error;
    remoteError = error;
  }

  let source: UsageRecordSource = "remote";
  if (records.length === 0) {
    const readLocal = deps.readLocalRecords ?? readLocalDialogTokenRecords;
    // 只信认证 token 解析出的用户：dialogKey 里带的 userId 是**调用方输入**，
    // 用它当扫描前缀等于允许 A 读 B 的用量（审查 BLOCK）。参数用户与认证用户
    // 不一致时直接不做本地回退。
    // 注意：解析失败返回的是空字符串而不是 undefined，用 ?? 会让 "" 通过。
    const authedUserId = parseUserIdFromAuthToken(token) || undefined;
    const dialogUserId = parseDialogKey(dialogKey)?.userId;
    if (authedUserId && dialogUserId && authedUserId !== dialogUserId) {
      throw new Error(`对话 ${dialogKey} 不属于当前登录用户，拒绝读取本地用量记录`);
    }
    // 拿不到认证用户时**不做**本地回退：readLocalDialogTokenRecords 在 userId 缺失
    // 时会退化成扫整个 `token-` 前缀，等于把所有人的用量混在一起。
    if (authedUserId) {
      const localRecords = await readLocal({ dialogKey, dialogId, userId: authedUserId, env }).catch(
        (error: unknown) => {
          // 「扫不动」不等于「没有数据」：超限/超时要让用户看到，不能静默变成空结果。
          if (error instanceof Error && error.message.includes("已中止扫描")) throw error;
          return [] as TokenRecord[];
        },
      );
      if (localRecords.length > 0) {
        records.push(...localRecords);
        source = "local";
      }
    }
  }
  if (records.length === 0 && remoteError) throw remoteError;
  records.sort((a, b) => b.createdAt - a.createdAt);
  output.write(formatDialogUsage(dialogKey, records, source));
  return 0;
}
