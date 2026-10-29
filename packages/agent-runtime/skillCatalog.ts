/**
 * 技能目录契约（host-neutral）—— 技能「有哪些、叫什么、从哪来、当前可不可用」
 * 的唯一真相形状。
 *
 * 背景：历史上 skill 只有一条来源——用 `node:fs` 扫工作区的
 * `.agents/skills/<name>/SKILL.md`（见 `skillDiscovery.ts`）。把仓库 skill 迁到
 * 平台之后，同一份菜单会同时来自三处：本地工作区文件、代码内置注册表
 * （`ai/skills/builtinSkillRegistry`）、平台/agent 配置。如果每个宿主各自拼装，
 * 「同名谁遮谁」「预算怎么裁」「哪些不可用」就会按宿主分叉。
 *
 * 因此把这三件事固定在本文件（纯函数、零 node 依赖，RN/web 可安全引用）：
 *   1. 条目契约 `SkillCatalogEntry`（stable id + 来源 + 可用性标记）；
 *   2. 合并规则 `mergeSkillCatalog`（来源优先级、同名遮蔽显式记录、上限 + 描述预算）；
 *   3. 可注入的来源接口 `SkillCatalogSourceProvider`（宿主只提供条目，不负责合并）。
 *
 * 本文件**不**读文件、不读 DB、不 import 任何 `node:` 模块：Node 宿主的
 * 文件扫描适配器在 `skillDiscovery.ts`，非 Node 宿主注入自己的来源实现即可
 * （浏览器侧见 `skillDiscovery.browser.stub.ts` 的 TODO 与
 * `buildSkillDiscoveryCatalogLayer` 这条 host-neutral 渲染路径）。
 */

/** 条目来源。顺序即优先级（见 `SKILL_CATALOG_PRIORITY`）。 */
export type SkillCatalogSourceId = "local-workspace" | "builtin" | "platform";

/**
 * 同名冲突时靠前者遮蔽靠后者：用户自己工作区里的文件优先于代码内置版本，
 * 内置版本优先于平台下发的版本（迁到平台期间的过渡语义，与既有
 * `noloWorkspaceTools` 的「文件优先、builtinSkillRegistry 兜底」一致）。
 *
 * 迁移完成后顺序本身不用改——把 `local-workspace` 来源去掉，优先级自然落到
 * `builtin` / `platform`。
 */
export const SKILL_CATALOG_PRIORITY: readonly SkillCatalogSourceId[] = Object.freeze([
  "local-workspace",
  "builtin",
  "platform",
] as const);

/**
 * 目录规模与描述预算。与 `skillDiscovery.ts` 既有语义完全一致（那里现在从这里
 * 取值，不再自己维护一份常量）：
 * - 最多 50 项（超出的进 `droppedEntries`，不静默丢）；
 * - 全部 description 合计 4000 字符；超预算时按比例缩短，保留每条开头
 *   （作者应把触发词前置）；
 * - 缩短后每条不低于 80 字符，保证仍是一句有意义的摘要。
 */
export interface SkillCatalogBudget {
  maxEntries: number;
  descriptionBudget: number;
  minDescriptionLength: number;
}

export const DEFAULT_SKILL_CATALOG_BUDGET: SkillCatalogBudget = Object.freeze({
  maxEntries: 50,
  descriptionBudget: 4000,
  minDescriptionLength: 80,
});

/**
 * `applySkillDescriptionBudget` 迭代到不动点的上限。收敛通常 1~3 轮（每次
 * 按比例裁剪后总量大幅下降），此上限只是防呆：真撞到上限说明预算/下限配置
 * 自相矛盾，此时不无限循环也不假装达标。
 */
const MAX_DESCRIPTION_BUDGET_PASSES = 200;

/**
 * 单一来源上报的条目（未合并）。`available` 缺省为 true；不可用的条目必须带
 * `unavailableReason`，上层据此提示模型「这个名字存在但当前用不了」，而不是
 * 让名字凭空消失。
 */
export interface SkillCatalogEntryInput {
  /** 稳定 id：建议 `<source>:<name>`（`local-workspace:deployment`）。跨会话不变。 */
  id: string;
  source: SkillCatalogSourceId;
  name: string;
  description?: string;
  available?: boolean;
  unavailableReason?: string;
  /** 仅本地文件来源：相对工作区根的 SKILL.md 路径。 */
  relativePath?: string;
  /** 正文定位（平台页面 dbKey / 内置 slug 等），非文件宿主用它加载正文。 */
  contentRef?: string;
}

/** 合并后的条目：`shadowedSources` 非空表示它遮蔽了同名条目（显式可见）。 */
export interface SkillCatalogEntry {
  id: string;
  source: SkillCatalogSourceId;
  name: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  relativePath?: string;
  contentRef?: string;
  /** 被本条目遮蔽的同名条目来源（按优先级排序，去重）。空数组 = 无冲突。 */
  shadowedSources: SkillCatalogSourceId[];
}

/** 一处同名冲突：胜出者 + 被遮蔽者。上层可据此提示「你本地覆盖了平台版」。 */
export interface SkillNameConflict {
  /** 归一化（trim + 小写）后的匹配名。 */
  key: string;
  /** 展示用名字（胜出条目的 name）。 */
  name: string;
  winner: { id: string; source: SkillCatalogSourceId };
  shadowed: Array<{ id: string; source: SkillCatalogSourceId }>;
}

export interface SkillCatalog {
  /** 已按来源优先级排序、已裁剪预算的条目。 */
  entries: SkillCatalogEntry[];
  /** 同名遮蔽记录。`entries` 里不含被遮蔽的条目——它们只在这里可见。 */
  conflicts: SkillNameConflict[];
  /** 超出条数上限被裁掉者（保留证据，便于上层解释「为什么没列出来」）。 */
  droppedEntries: SkillCatalogEntry[];
  /** 实际生效的预算（便于日志/测试对齐）。 */
  budget: SkillCatalogBudget;
}

/** 来源探测上下文。宿主可自行扩展字段（平台来源通常需要 agentId/userId）。 */
export interface SkillCatalogQuery {
  /** 工作区根目录；文件型来源用它扫描，纯平台来源可忽略。 */
  cwd?: string;
  userId?: string;
  agentId?: string;
}

/**
 * 可注入的目录来源。宿主实现它、宿主决定有哪些来源，合并语义统一在这里。
 *
 * `list` 允许返回 Promise：平台来源常需要一次 DB/HTTP 读取；同步宿主用
 * `resolveSkillCatalogSync`，遇到异步来源会明确报错而不是静默丢条目。
 */
export interface SkillCatalogSourceProvider {
  /** 诊断用标识（`local-workspace` / `builtin-registry` / `platform:agent-config`）。 */
  id: string;
  list(
    query: SkillCatalogQuery,
  ):
    | readonly SkillCatalogEntryInput[]
    | Promise<readonly SkillCatalogEntryInput[]>;
}

const normalizeKey = (name: string): string => name.trim().toLowerCase();

/** 单条技能文本（name / description）的长度上限，与既有文件扫描口径一致。 */
export const SKILL_TEXT_MAX_LENGTH = 200;

/**
 * 完整清洗，与 `skillDiscovery.parseSkillFrontmatter` 的既有口径逐字一致：
 * trim → 去掉首尾引号 → 折叠换行 → 截到 200 字符。
 *
 * 这是**来源适配器**的职责（文件扫描 / 内置注册表 / 平台下发各过一遍）：
 * 它不幂等（先 trim 再截断，截断点可能落在空格上），所以不要在合并阶段
 * 对已清洗文本再跑一次——那正是真实工作区里描述尾部空格被吃掉的原因。
 */
export const sanitizeSkillText = (value: string | undefined): string =>
  (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\n\r]+/g, " ")
    .slice(0, SKILL_TEXT_MAX_LENGTH);

/**
 * 合并阶段（`mergeSkillCatalog`）的提示注入加固：只折叠换行 + 截断，
 * **不** trim 尾部。
 *
 * 为什么不能直接用 `sanitizeSkillText`：既有实现是「先 trim 再截到 200」，
 * 一条 >200 字符的描述被截断后可能正好以空格结尾（真实工作区的
 * `design-taste-frontend` 就是），合并阶段再 trim 一次就把那个空格吃掉了，
 * 违反「现有行为完全不变」。对已清洗文本本函数是恒等的，对任意文本是幂等的
 * （折叠后不再有换行、截断到 ≤200 后长度不再变化），因此既保住既有字节，
 * 又拦住「用换行伪造菜单条目」这条注入路径。
 */
export const hardenSkillText = (value: string | undefined): string =>
  (value ?? "").replace(/[\n\r]+/g, " ").slice(0, SKILL_TEXT_MAX_LENGTH);

/** 空白名条目的内部查找键前缀：唯一、且不可能与真实技能名相撞。 */
const BLANK_NAME_LOOKUP_PREFIX = "\u0000blank-name:";

const sourceRank = (source: SkillCatalogSourceId): number => {
  const index = SKILL_CATALOG_PRIORITY.indexOf(source);
  // 未知来源排在已知来源之后，但仍然参与合并（不静默丢弃）。
  return index === -1 ? SKILL_CATALOG_PRIORITY.length : index;
};

/**
 * 按描述总量裁剪：只在总量超预算时按比例缩短（保留开头），每条不低于下限。
 *
 * 幂等（MEDIUM-1）：一次按比例裁剪可能仍超预算——低于下限的短条目不再缩短，
 * 长条目就得承担更多——因此迭代到不动点。每轮总量严格下降且以
 * `minDescriptionLength × 条数` 为下界，所以必然收敛；对已裁剪过的条目再调用
 * 是恒等操作（总量已 ≤ 预算或所有条目都到底线 → 立即返回）。
 */
export function applySkillDescriptionBudget<T extends { description: string }>(
  entries: readonly T[],
  budget: SkillCatalogBudget = DEFAULT_SKILL_CATALOG_BUDGET,
): T[] {
  if (entries.length === 0) return [...entries];
  let current = [...entries];
  for (let pass = 0; pass < MAX_DESCRIPTION_BUDGET_PASSES; pass += 1) {
    const totalDescLen = current.reduce((sum, entry) => sum + entry.description.length, 0);
    if (totalDescLen <= budget.descriptionBudget) break;
    const scale = budget.descriptionBudget / totalDescLen;
    let changed = false;
    current = current.map((entry) => {
      const targetLen = Math.max(
        budget.minDescriptionLength,
        Math.floor(entry.description.length * scale),
      );
      if (entry.description.length <= targetLen) return entry;
      changed = true;
      return { ...entry, description: entry.description.slice(0, targetLen).trimEnd() };
    });
    // 所有条目都撞到下限：预算在「条数 × 下限」之下，缩不动了（不是 bug，
    // 是 maxEntries × minDescriptionLength > descriptionBudget 的配置）。
    if (!changed) break;
  }
  return current;
}

/**
 * 合并多来源条目。
 *
 * 规则（顺序即契约）：
 * 1. **按名归一化**（trim + 小写）分组；组内按（来源优先级、声明顺序）取第一条为胜出者。
 * 2. **跨来源同名 → 遮蔽**：胜出者 `shadowedSources` 记录被遮蔽来源，`conflicts`
 *    里留一条记录；被遮蔽条目不进 `entries`（避免同名两份菜单）。绝不静默覆盖。
 * 3. **同来源同名 → 两者都保留**（既有行为：两个目录 head 里写了同一个 frontmatter
 *    name 时，扫描结果本来就是两条；这里不改变它）。
 * 4. **输出顺序**：按（优先级、组内声明顺序）稳定排序——本地在工作区列表里在前。
 * 5. **可用性**：胜出者不可用就如实标不可用，不自动提拔低优先级同名条目
 *    （自动提拔会让「本地坏副本挡住平台好版本」这种运维事实消失）。
 * 6. **上限 50 项**后再做描述预算裁剪；超上限者进 `droppedEntries`。
 */
export function mergeSkillCatalog(
  inputs: readonly SkillCatalogEntryInput[],
  budget: SkillCatalogBudget = DEFAULT_SKILL_CATALOG_BUDGET,
): SkillCatalog {
  const candidates = inputs.map((input, index) => {
    const key = normalizeKey(input.name);
    // 空白名（缺 name / 全空格）：既不能参与同名遮蔽（否则一堆无名条目会互相
    // 吞掉），也不能被静默丢弃。给它一个不可能与真实名字相撞的唯一查找键，
    // 条目照常进目录、渲染成「不可用」（MEDIUM-3）。
    const blank = key === "";
    return {
      input,
      index,
      rank: sourceRank(input.source),
      blank,
      key: blank ? `${BLANK_NAME_LOOKUP_PREFIX}${index}` : key,
    };
  });

  const blankNameEntries = candidates.filter((candidate) => candidate.blank);
  if (blankNameEntries.length > 0) {
    console.warn(
      `[skillCatalog] ${blankNameEntries.length} 个技能条目缺少可用 name，` +
        `已保留但标记为不可用：${blankNameEntries
          .map((candidate) => candidate.input.id)
          .join(", ")}`,
    );
  }

  const ordered = [...candidates].sort(
    (a, b) => a.rank - b.rank || a.index - b.index,
  );

  const winnerByKey = new Map<string, (typeof ordered)[number]>();
  for (const candidate of ordered) {
    if (!winnerByKey.has(candidate.key)) winnerByKey.set(candidate.key, candidate);
  }

  const conflictByKey = new Map<string, SkillNameConflict>();
  for (const candidate of ordered) {
    const winner = winnerByKey.get(candidate.key);
    if (!winner || winner === candidate) continue;
    // 同来源同名：既有扫描行为就是两条都列出，不算跨来源遮蔽。
    if (winner.input.source === candidate.input.source) continue;
    let conflict = conflictByKey.get(candidate.key);
    if (!conflict) {
      conflict = {
        key: candidate.key,
        name: winner.input.name,
        winner: { id: winner.input.id, source: winner.input.source },
        shadowed: [],
      };
      conflictByKey.set(candidate.key, conflict);
    }
    conflict.shadowed.push({ id: candidate.input.id, source: candidate.input.source });
  }

  // 胜出者 + 同来源同名者都保留（同来源同名不计遮蔽，见规则 3）。
  const winners = ordered.filter((candidate) => {
    const winner = winnerByKey.get(candidate.key);
    if (!winner) return false;
    return winner === candidate || winner.input.source === candidate.input.source;
  });

  // 同来源同名会保留两条（见规则 3），此时来源上报的 id 自然重复；契约里的
  // id 必须是唯一引用，所以重名的第二条起追加 `#2`、`#3`（LOW-1）。
  const idOccurrences = new Map<string, number>();
  const uniqueId = (baseId: string): string => {
    const seen = (idOccurrences.get(baseId) ?? 0) + 1;
    idOccurrences.set(baseId, seen);
    return seen === 1 ? baseId : `${baseId}#${seen}`;
  };

  const toEntry = (candidate: (typeof ordered)[number]): SkillCatalogEntry => {
    const input = candidate.input;
    const shadowedSources = (conflictByKey.get(candidate.key)?.shadowed ?? [])
      .map((shadowed) => shadowed.source)
      .filter((source, index, all) => all.indexOf(source) === index)
      .sort((a, b) => sourceRank(a) - sourceRank(b));
    const available = input.available !== false && !candidate.blank;
    const unavailableReason = candidate.blank
      ? "empty-name"
      : hardenSkillText(input.unavailableReason).trim() || "unknown";
    return {
      id: uniqueId(input.id),
      source: input.source,
      // name 走完整清洗（MEDIUM-4）：换行若能进契约，就能在提示里伪造一条
      // 不存在的技能条目。name 是短标识符、已清洗路径下与既有输出逐字相同。
      name: sanitizeSkillText(input.name),
      // description 只做换行折叠 + 截断，不 trim 尾部——见 `hardenSkillText`
      // 的说明（保真实工作区逐字一致，MEDIUM-2）。
      description: hardenSkillText(input.description),
      available,
      ...(available ? {} : { unavailableReason }),
      ...(input.relativePath ? { relativePath: input.relativePath } : {}),
      ...(input.contentRef ? { contentRef: input.contentRef } : {}),
      shadowedSources,
    };
  };

  const kept = winners.slice(0, Math.max(0, budget.maxEntries)).map(toEntry);
  const droppedEntries = winners.slice(Math.max(0, budget.maxEntries)).map(toEntry);

  return {
    entries: applySkillDescriptionBudget(kept, budget),
    conflicts: [...conflictByKey.values()],
    droppedEntries,
    budget,
  };
}

/**
 * 固定条目来源（测试与「平台下发了静态清单」两种场景用）。
 */
export function createStaticSkillCatalogSource(
  id: string,
  entries: readonly SkillCatalogEntryInput[],
): SkillCatalogSourceProvider {
  return { id, list: () => entries };
}

/**
 * 内置注册表来源适配器——注册表本身在 `ai/skills`，不在 agent-runtime，
 * 所以这里只接收一个 `list` 函数（依赖倒置），由 Node 宿主在接线处传
 * `listBuiltinSkills`（避免 agent-runtime 静态依赖 `ai/*`）。
 */
export interface BuiltinSkillCatalogEntryLike {
  slug: string;
  title: string;
  config?: { description?: string };
}

export function createBuiltinSkillCatalogSource(
  list: () => readonly BuiltinSkillCatalogEntryLike[],
): SkillCatalogSourceProvider {
  return {
    id: "builtin-registry",
    list: () =>
      list().map((entry) => ({
        id: `builtin:${entry.slug}`,
        source: "builtin" as const,
        name: entry.title,
        description: entry.config?.description ?? "",
        available: true,
        contentRef: entry.slug,
      })),
  };
}

/** 文件扫描结果 → 契约条目（Node 适配器与会话层共用，纯映射不改语义）。 */
export interface DiscoveredSkillLike {
  name: string;
  description?: string;
  relativePath?: string;
}

export function mapDiscoveredSkillsToCatalogEntries(
  discovered: readonly DiscoveredSkillLike[],
): SkillCatalogEntryInput[] {
  return discovered.map((skill) => ({
    id: `local-workspace:${skill.name}`,
    source: "local-workspace" as const,
    name: skill.name,
    description: skill.description ?? "",
    available: true,
    ...(skill.relativePath ? { relativePath: skill.relativePath } : {}),
    ...(skill.relativePath ? { contentRef: skill.relativePath } : {}),
  }));
}

const warnSourceFailure = (id: string, error: unknown): void => {
  // 单个来源失败不能拖垮整份菜单，但也不能装作没发生：留下可诊断的痕迹。
  console.warn(
    `[skillCatalog] source "${id}" failed to list skills: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
};

/** 合并所有来源（异步）。来源抛错 → 该来源按空清单处理，其余来源照常合并。 */
export async function resolveSkillCatalog(
  sources: readonly SkillCatalogSourceProvider[],
  query: SkillCatalogQuery = {},
  budget: SkillCatalogBudget = DEFAULT_SKILL_CATALOG_BUDGET,
): Promise<SkillCatalog> {
  const lists = await Promise.all(
    sources.map(async (source) => {
      try {
        return await source.list(query);
      } catch (error) {
        warnSourceFailure(source.id, error);
        return [];
      }
    }),
  );
  return mergeSkillCatalog(lists.flat(), budget);
}

/**
 * 同步路径遇到异步来源时的策略（HIGH-1）：
 * - `"throw"`（默认）：接错了就报出来，别让「平台版本没出现」变成查不出的现象；
 * - `"skip"`：best-effort 入口（会话装配）用。跳过这个来源、保留已经收集到的
 *   其余来源条目，并打一条含来源 id 的 warn —— 绝不静默返回「没有任何技能」。
 */
export interface ResolveSkillCatalogSyncOptions {
  onAsyncSource?: "throw" | "skip";
}

/**
 * 同步合并所有来源。异步宿主（平台 DB/HTTP 读取）请用 `resolveSkillCatalog`；
 * 这里遇到返回 Promise 的来源默认抛错。
 *
 * `options.onAsyncSource: "skip"` 是给会话装配这种 best-effort 入口的降级开关：
 * 单个来源接错不该让本地文件技能一起消失，但必须留下可观测信号。
 */
export function resolveSkillCatalogSync(
  sources: readonly SkillCatalogSourceProvider[],
  query: SkillCatalogQuery = {},
  budget: SkillCatalogBudget = DEFAULT_SKILL_CATALOG_BUDGET,
  options: ResolveSkillCatalogSyncOptions = {},
): SkillCatalog {
  const collected: SkillCatalogEntryInput[] = [];
  for (const source of sources) {
    let listed: readonly SkillCatalogEntryInput[] | Promise<readonly SkillCatalogEntryInput[]>;
    try {
      listed = source.list(query);
    } catch (error) {
      warnSourceFailure(source.id, error);
      continue;
    }
    if (typeof (listed as Promise<unknown>)?.then === "function") {
      if (options.onAsyncSource !== "skip") {
        throw new Error(
          `[skillCatalog] source "${source.id}" is async; use resolveSkillCatalog() instead of the sync path`,
        );
      }
      // 不 await，但仍要挂上 rejection handler，否则 Node/bun 会打未处理的
      // unhandled rejection（等于把一次降级变成一次崩溃）。
      void (listed as Promise<unknown>).then(
        () => {},
        () => {},
      );
      console.warn(
        `[skillCatalog] source "${source.id}" is async and was skipped on the sync path; ` +
          `its skills are NOT in this turn's index (kept the ${collected.length} entries collected so far)`,
      );
      continue;
    }
    collected.push(...(listed as readonly SkillCatalogEntryInput[]));
  }
  return mergeSkillCatalog(collected, budget);
}
