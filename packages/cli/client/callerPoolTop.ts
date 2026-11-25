/**
 * CLI 池姿态投影（纯函数，零 I/O）。
 *
 * CLI/TUI 手里只有 `AgentCatalogEntry` 投影（key/model/kind/apiSource/cliProvider），
 * 没有完整记录；「谁出钱」仍走唯一判据 `isPlatformPaidAgentCall`，把能证明的
 * 归属证据如实喂进去：
 * - `privateKey`（= 目录条目的 key）按 `agent-<userId>-…` 形状承载 owner，配合
 *   调用者 userId，`isOwnedAgentRecord` 能真判自有/非自有；
 * - platform 条目没有自有证据 → 判 platform_credits（= 需付费授权），宁可少判
 *   池顶，也不把可能扣费的档当免费升档。
 *
 * 拿不到调用者 userId 时归属无从证明 → 直接返回 undefined（池未知），
 * 不拿「全部需要付费」的假证据去宣告池顶。
 */
import { isCallerAtFreePoolTop, type FreePoolCandidate } from "../../ai/agent/agentDiscovery";
import { isPlatformPaidAgentCall } from "../../ai/agent/platformPaidCall";

/** 池姿态所需的目录条目最小形状（TUI AgentCatalogEntry 的结构子集）。 */
export interface CallerPoolCatalogEntry {
  key: string;
  model: string;
  kind: "platform" | "private";
  apiSource?: string;
  cliProvider?: string;
}

/**
 * 目录条目 → 池候选：requiresPaidApproval 由 isPlatformPaidAgentCall 唯一判据派生
 * （不在这里自写 billingSource 比较，否则与 199 门槛/计费口径分叉）。
 */
export function catalogEntryToPoolCandidate(
  entry: CallerPoolCatalogEntry,
  userId?: string | null,
): FreePoolCandidate {
  return {
    agentKey: entry.key,
    model: entry.model,
    requiresPaidApproval: isPlatformPaidAgentCall({
      agentConfig: {
        key: entry.key,
        // 自有 agent 的私有 key 形如 agent-<userId>-<id>：归属判据认这个形状。
        privateKey: entry.kind === "private" ? entry.key : undefined,
        model: entry.model,
        apiSource: entry.apiSource,
        cliProvider: entry.cliProvider,
      },
      callerUserId: userId ?? undefined,
    }),
  };
}

/**
 * 由目录条目池推出 callerIsPoolTop。
 * entries 缺失（目录未加载 / 缓存空）或 userId 缺失 = 池未知 → undefined
 * （prompt 逐字不变）。
 */
export function resolveCallerPoolTopFromCatalog(args: {
  entries: ReadonlyArray<CallerPoolCatalogEntry> | null | undefined;
  model?: string | null;
  agentKey?: string | null;
  userId?: string | null;
}): boolean | undefined {
  const entries = args.entries;
  const userId = typeof args.userId === "string" ? args.userId.trim() : "";
  if (!entries || entries.length === 0 || !userId) return undefined;
  return isCallerAtFreePoolTop(
    { model: args.model ?? null, agentKey: args.agentKey ?? null },
    entries.map((entry) => catalogEntryToPoolCandidate(entry, userId)),
  );
}

/**
 * CLI 入口的调用者身份：私有/自建 Agent 的真实模型只存在于已加载的
 * `agentConfig`（与本地 prompt 装配同源），内置目录里查不到它。
 * 只用 `resolveAgentModelIdentity`（只认内置目录）会让 `agent-user1-self`
 * （model: glm-5.3-flash）拿到 model: null → 池姿态恒 undefined。
 *
 * 取值顺序：agentConfig.model → 显式 --model 覆盖 → null（由调用方继续回退解析器）。
 * agentKey 取 agentConfig.key（规范 key = 加载记录用的 dbKey），回退显式 key。
 */
export function pickCallerPoolIdentityFromAgentConfig(args: {
  agentConfig?: { model?: unknown; key?: unknown } | null;
  agentKey?: string | null;
  modelOverride?: string | null;
}): { agentKey: string | null; model: string | null } {
  const asPart = (value: unknown): string | null => {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length > 0 ? text : null;
  };
  const config = args.agentConfig ?? null;
  return {
    agentKey: asPart(config?.key) ?? asPart(args.agentKey),
    model: asPart(config?.model) ?? asPart(args.modelOverride),
  };
}

/** 会话锁存表上限：防止长驻进程里 dialog 累积导致无界增长（FIFO 淘汰最旧）。 */
export const CLI_CALLER_POOL_TOP_LATCH_LIMIT = 64;

/**
 * 会话级锁存表：dialogId + agentKey + callerModel → 首次算出的三态
 * （`undefined` 也锁住：那是「会话内姿态未知」，同样不能因后台目录刷新翻转）。
 */
const cliCallerPoolTopLatch = new Map<string, boolean | undefined>();

const asLatchPart = (value: unknown): string => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : "-";
};

/**
 * 锁存键。缺 dialogId → null（不锁存）：没有会话维度就用一个共享桶会让不同
 * dialog 互相串台，那比「每轮重算」更糟。
 */
export function buildCliCallerPoolTopLatchKey(args: {
  dialogId?: string | null;
  agentKey?: string | null;
  model?: string | null;
}): string | null {
  const dialogId = typeof args.dialogId === "string" ? args.dialogId.trim() : "";
  if (!dialogId) return null;
  return [dialogId, asLatchPart(args.agentKey), asLatchPart(args.model)].join("\u0000");
}

/**
 * 会话级（同一 dialog，跨轮）单调锁存的池姿态。
 *
 * 首轮按当前目录缓存算一次并锁住；同一 dialogId 后续轮次直接复用锁存值——
 * 后台目录刷新（新增更高免付费档）**绝不**翻转已写进系统前缀的协作段文本，
 * 因此不会击穿前缀缓存。无 dialogId 时退化为一次性计算（不锁存、不串台）。
 *
 * 锁存键（`latchAgentKey` / `latchModel`）必须只由**调用入口每轮恒定不变**的
 * 身份构成：`agentConfig` 派生的 model 只在目录预热后读得到（冷启动为空），
 * 一旦拼进锁存键，同一会话首轮锁 `undefined`、次轮锁 `glm-…`，两次命中不同
 * 键 → 返回 `true` → 系统前缀从轻姿态翻成池顶姿态、击穿前缀缓存。
 * 因此调用方用入口原值（agentKey + `--model` 覆盖）作键，`agentKey`/`model`
 * 仍只是「本次算出什么」的输入。未提供时回退到 `agentKey`/`model`（纯函数直调场景）。
 */
export function resolveLatchedCliCallerIsPoolTop(args: {
  dialogId?: string | null;
  entries: ReadonlyArray<CallerPoolCatalogEntry> | null | undefined;
  model?: string | null;
  agentKey?: string | null;
  userId?: string | null;
  latchAgentKey?: string | null;
  latchModel?: string | null;
}): boolean | undefined {
  // 「显式提供了就用它」：`null` 是有效值（= 没有 --model 覆盖 / 无 agentKey），
  // 所以必须按属性存在性判断，不能用 `??`（否则 null 会回退到 config 派生的 model，
  // 恰好把上面要避免的「预热后才读得到的值」重新拼回锁存键）。
  const latchAgentKey = "latchAgentKey" in args ? args.latchAgentKey : args.agentKey;
  const latchModel = "latchModel" in args ? args.latchModel : args.model;
  const latchKey = buildCliCallerPoolTopLatchKey({
    dialogId: args.dialogId,
    agentKey: latchAgentKey,
    model: latchModel,
  });
  if (!latchKey) return resolveCallerPoolTopFromCatalog(args);
  if (cliCallerPoolTopLatch.has(latchKey)) return cliCallerPoolTopLatch.get(latchKey);
  const resolved = resolveCallerPoolTopFromCatalog(args);
  cliCallerPoolTopLatch.set(latchKey, resolved);
  // 有界：超上限淘汰最早插入的键（Map 保序）。
  while (cliCallerPoolTopLatch.size > CLI_CALLER_POOL_TOP_LATCH_LIMIT) {
    const oldest = cliCallerPoolTopLatch.keys().next();
    if (oldest.done) break;
    cliCallerPoolTopLatch.delete(oldest.value);
  }
  return resolved;
}

/** 清理锁存（不传 dialogId 清空全部）：供测试与显式会话重置使用。 */
export function clearCliCallerPoolTopLatch(dialogId?: string | null): void {
  if (dialogId === undefined) {
    cliCallerPoolTopLatch.clear();
    return;
  }
  const prefix = `${typeof dialogId === "string" ? dialogId.trim() : ""}\u0000`;
  for (const key of [...cliCallerPoolTopLatch.keys()]) {
    if (key.startsWith(prefix)) cliCallerPoolTopLatch.delete(key);
  }
}

/** 锁存表当前条目数（诊断/单测用，只读语义）。 */
export function cliCallerPoolTopLatchSize(): number {
  return cliCallerPoolTopLatch.size;
}
