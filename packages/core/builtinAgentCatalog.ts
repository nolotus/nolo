/**
 * Platform builtin agent catalog — 单一真相源（运行时字段）。
 *
 * 覆盖所有代码层创建的「平台内置 / 公开」agent 的运行时字段：
 * id、name、provider、model、apiSource、useServerProxy 与图片工作流字段。
 *
 * 派生关系（手抄全部消失）：
 * - `packages/core/builtinAgents.ts` 的 key/id 常量 → 从本目录派生
 * - `packages/agent-runtime/builtinPlatformAgentConfigs.ts` 的运行时兜底表 → 从
 *   `runtimeFallback: true` 条目派生（2026-09-10 兜底最小化后仅 nolo + quick-chat 档位 + Kimi K2.6 兼容，记录缺失时合成配置）
 * - `scripts/updatePlazaModels.ts` 的 TARGETS → 从本目录派生
 *
 * 内容字段（introduction / greeting / prompt / tools / tags / 价格）留在
 * `scripts/createSpaceAgents.ts` 的 seed 定义（写库用，运行时不需要）；
 * seed 与目录的一致性由 `createSpaceAgents.source.test.ts` 的断言锁住。
 *
 * 模型换代流程（如 GLM 5.2 → 5.3）：只改本目录对应条目的 `model`（id 保持
 * 稳定，用户收藏不失效）→ 兜底表 / 常量 / sync TARGETS 自动跟随 → 跑
 * `bun scripts/updatePlazaModels.ts` 批量升级生产记录。注意 seed 内容层
 * （scripts/createSpaceAgents.ts）的 provider/model 需同步改，一致性测试会
 * 提示（见 createSpaceAgents.source.test.ts）。
 *
 * 三个维度：`group` 表达「builtin 平台内置 6 个 / public 广场公开（需 seed）/
 * internal 内部管线基础设施（不上架、不需 seed）」，`lifecycle` 表达
 * 「active 在架 / retired 已退场」（internal 兼容条目一律 retired：只保留运行时
 * 路由，广场列表必须过滤其存量 DB 记录，否则 /explore 会泄漏已下架 agent），
 * `runtimeFallback` 表达「运行时兜底需要与否」——正交，可独立取值（如 @nolo 是
 * builtin 组但需要兜底）。agent key 前缀构造/解析统一走 `core/prefix.ts`
 * （publicAgentKey / parsePublicAgentId）。
 */

export type BuiltinAgentCatalogEntry = {
  /** 稳定 id（不随模型版本变化） */
  id: string;
  name: string;
  provider: string;
  model: string;
  apiSource?: string;
  useServerProxy?: boolean;
  /**
   * builtin = 平台内置 6 个（BUILTIN_PLATFORM_AGENT_KEYS）；public = 广场公开；
   * internal = 仅供内部管线调用的基础设施 agent（如图片预处理器），需要运行时
   * 兜底配置，但不上架广场、不写库、不需要 createSpaceAgents seed。注意其请求
   * 仍走平台托管路由并照常按用量计费，只是不作为独立广场商品定价/售卖。
   */
  group: "builtin" | "public" | "internal";
  /**
   * active = 在架（缺省）；retired = 已退场。retired 条目只保留条目本身
   * （运行时路由 / 存量记录兼容），广场列表（fetchPublicAgents 的 DB+catalog
   * overlay）必须过滤同 ID 的存量 DB 记录、也不得合成上架——否则已下架的
   * agent 会以 DB 旧记录的形式继续出现在 /explore（2026-09-23 GPT-5.5 Pro
   * 线上泄漏即此形态）。internal 兼容条目一律 retired。
   * 注意：换代只改model（id 稳定）不算 retired——retired 是「商品退场」，
   * 该 ID 不再作为广场商品存在（如 GLM 5.2 的 ID 已原地换代为 GLM 5.3，
   * 那条是 active）。
   */
  lifecycle?: "active" | "retired";
  /**
   * true = 需要运行时兜底（@nolo 引导 / quick-chat 档位 / Kimi K2.6 兼容）。
   * 记录在本地/远端缺失时，runtime 用目录合成配置，保证进站即用。
   * 2026-09-10 兜底最小化：广场档与图片助手不再兜底（记录缺失时明确 404）。
   */
  runtimeFallback?: boolean;
  // 图片工作流字段（与 createSpaceAgents 的 imageWorkflow/imageConfig 对齐）
  hasImageOutput?: boolean;
  imageModel?: string;
  imageWorkflow?: "generate" | "edit" | "continuous";
  imageConfig?: { enabled: boolean };
};

export const BUILTIN_AGENT_CATALOG: BuiltinAgentCatalogEntry[] = [
  // ── 平台内置 6 个（builtinAgents BUILTIN_*）──
  {
    id: "01NOLOAPPBLD000000019KCKT0",
    group: "builtin",
    name: "nolo",
    provider: "nolo",
    model: "deepseek-flash",
    runtimeFallback: true,
  },
  {
    id: "01APPBUILDER00000001YAII3I",
    group: "builtin",
    name: "应用构建助手",
    provider: "nolo",
    model: "deepseek-flash",
  },
  {
    id: "01ECOMMERCEAG00000001PYQ2J",
    group: "builtin",
    name: "电商商品参数助手",
    provider: "openai",
    model: "gpt-6-luna",
  },
  {
    id: "01NOLOAGENTCRT000000000001",
    group: "builtin",
    name: "AI 创建助手",
    provider: "nolo",
    model: "deepseek-flash",
  },
  {
    id: "01NOLOFEEDBACKA000000000R2",
    group: "builtin",
    name: "反馈入口",
    provider: "nolo",
    model: "deepseek-flash",
  },
  {
    id: "01CHROMEOPR000000000001",
    group: "builtin",
    name: "Chrome 操作员",
    provider: "nolo",
    model: "deepseek-flash",
  },
  // ── quick-chat 档位 public（图片助手已无 runtimeFallback，见下方图片档段） ──
  // 2026-09-10 兜底最小化：runtimeFallback 只保留产品代码显式引用的条目
  // （nolo 默认档、PLATFORM_TIER_AGENT_KEYS 的 flash/image-compat、
  // SYSTEM_BUILTIN_TRUSTED 的 flash/pro/glm-flash）。广场档与图片助手不再
  // 兜底——记录缺失时明确报 Agent not found，而不是合成无 prompt 的裸配置。
  {
    id: "01DSV4FLASHPB00000000JFPFD",
    group: "public",
    name: "DeepSeek Flash",
    provider: "nolo",
    model: "deepseek-flash",
    runtimeFallback: true,
  },
  {
    id: "01DSV4PRONPB00000001VIR3EK",
    group: "public",
    name: "DeepSeek V4 Pro",
    provider: "nolo",
    model: "deepseek-v4-pro",
    runtimeFallback: true,
  },
  {
    id: "01GLM52DIPB00000000I3E2MY",
    group: "public",
    name: "GLM 5.3",
    provider: "nolo",
    model: "glm-5.3",
  },
  {
    id: "01GLMFLASHPB00000000BT20BC",
    group: "public",
    name: "GLM 5.3 Flash",
    provider: "nolo",
    model: "glm-5-3-flash",
    runtimeFallback: true,
  },
  {
    id: "01KIMIK26OLLAMA0000000001",
    // 已下架的公共入口：保留 internal catalog entry 仅用于旧 Agent 记录的运行时兼容。
    group: "internal",
    lifecycle: "retired",
    name: "Kimi K2.6（兼容）",
    provider: "nolo",
    model: "kimi-k2.6",
    runtimeFallback: true,
  },
  // ── 广场公开聊天档（从 createSpaceAgents PUBLIC_AGENT_DEFS 收编，2026-08-19）──
  // ID 与 createSpaceAgents 的 deterministicId 结果一致；provider 按 agentSeedBuilder
  // 默认规则：显式 provider 用显式值，未写则 openai。
  // 2026-09-10 预设收敛：GPT-5.6 Sol/Terra、GPT-5.5 Pro 从广场退场转 internal 兼容，
  // 公开聊天档只保留 Luna + nolo 托管组 + 图片档（图片档仍在广场，但不再 runtimeFallback）。
  {
    id: "01GPT56SOLPB00000000VXMGCW",
    // 已从广场/预设退场（2026-09-10）：保留 internal 兼容条目，仅为存量 agent
    // 记录提供运行时路由；不再出现在广场与 createSpaceAgents 播种清单。
    group: "internal",
    lifecycle: "retired",
    name: "GPT-5.6 Sol（兼容）",
    provider: "openai",
    model: "gpt-5.6-sol",
  },
  {
    id: "01GPT56TERPB00000001UX7RKW",
    // 已从广场/预设退场（2026-09-10）：同 Sol，internal 兼容。
    group: "internal",
    lifecycle: "retired",
    name: "GPT-5.6 Terra（兼容）",
    provider: "openai",
    model: "gpt-5.6-terra",
  },
  {
    id: "01GPT56LUNPB00000001VVVZHS",
    // 2026-09-23 换代：同一稳定 ID（用户收藏 / 别名 / Space 内容键不失效）升级为
    // 平台托管 GPT-6 Luna。注意与 retired 的区别：Luna 是在架商品原地换代，
    // 存量记录由 scripts/updatePlazaModels.ts 收敛到 catalog 当前 model。
    //
    // provider 必须是 "nolo"（平台托管命名空间），不能写上游名 "openai"：
    // ① 计费按 calculatePrice(provider, model) 查价，平台价只注册在 nolo 下，
    //    写 openai 会落零价虚拟模型（2026-09-24 实测 openai/gpt-6-luna → cost 0）；
    // ② agent-run 的托管路由门 isPlatformManagedProvider 只认 nolo/deepseek/
    //    kimi 系，provider 非 nolo 时读不到 hosted routing table，直连 key 也拿不到。
    // 平台 agent 统一收敛到 nolo provider 是既定方向（见 modelUpgradeTable 的
    // 「尽量迁移到 nolo 平台托管」原则），其余上游名 provider 逐步退场。
    group: "public",
    lifecycle: "active",
    name: "GPT-6 Luna",
    provider: "nolo",
    model: "gpt-6-luna",
  },
  {
    id: "01GPT55PROPUB00000000IV47M",
    // 已从广场/预设退场（2026-09-10 retired，2026-09-23 起 overlay 强制过滤
    // 存量 DB 记录）：internal 兼容，理由同 Sol。
    group: "internal",
    lifecycle: "retired",
    name: "GPT-5.5 Pro（兼容）",
    provider: "openai",
    model: "gpt-5.5-pro",
  },
  {
    id: "01CLSO50DIPB00000000A1DVVU",
    // 旧代 Claude 广场入口（2026-09-01 下架时随条目删除，只剩线上孤儿记录，
    // 2026-09-24 重新收编）：internal + retired 保留运行时兼容，广场由 overlay
    // 按 retiredCatalogIds 过滤其存量 agent-pub-* 记录（退场 ≠ 删除——Space
    // contentKey / dialog primaryAgentKey 硬引用不断链）。model 沿用 2026-09-15
    // 恢复的真实 DeepInfra 官方名（与平台模型名同名）。
    group: "internal",
    lifecycle: "retired",
    name: "Claude Sonnet 5（兼容）",
    provider: "nolo",
    model: "anthropic/claude-sonnet-5",
  },
  {
    id: "01FABLE5DIPB00000001VJBKM4",
    // 同 Sonnet 5：旧代 Claude 广场入口转 internal + retired 兼容条目。
    group: "internal",
    lifecycle: "retired",
    name: "Claude Fable 5（兼容）",
    provider: "nolo",
    model: "anthropic/claude-fable-5",
  },
  {
    id: "01CLOP48DIPB0000000001OI1W",
    // 同 Sonnet 5 / Fable 5。这条尤其重要：线上同时存在
    // agent-system-01CLOP48DIPB...（userId=system）与 owner 副本。catalog 若无该
    // 条目，overlay 的「DB 有、catalog 无 → 用户自建」规则会把 system 名下记录当成
    // 用户自建保留——正是 2026-09-24 设计会商点名的「事故复活通道」实例。
    group: "internal",
    lifecycle: "retired",
    name: "Claude Opus 5（兼容）",
    provider: "nolo",
    model: "anthropic/claude-opus-5",
  },
  // Claude 系 2026-09-24 广场重新上架：只上架最新一代（Fable 5.1 / Opus 5.5）。
  // 平台托管通道 2026-09-15 起已是真实 DeepInfra 模型（nolo 目录），provider
  // 收敛到 nolo 命名空间；旧代 Sonnet 5 / Fable 5 只保留上面的 retired 兼容条目。
  // Gemini 文本档只上架最新一代：旧版留在广场只会分散选择、拉长列表，而
  // 用户想要的是「最新的那个 Gemini」。旧版模型仍可保留用于兼容历史请求，
  // （modelAbility / 定价表照旧），下架的只是广场入口。
  {
    id: "01CLDFBL51PB000000013N70D7",
    group: "public",
    lifecycle: "active",
    name: "Claude Fable 5.1",
    provider: "nolo",
    model: "anthropic/claude-fable-5-1",
  },
  {
    id: "01CLDOPU55PB00000001MQHSW0",
    group: "public",
    lifecycle: "active",
    name: "Claude Opus 5.5",
    provider: "nolo",
    model: "anthropic/claude-opus-5-5",
  },
  {
    id: "01GEM37FLPB00000000FJCRNC",
    group: "public",
    name: "Gemini 3.8 Flash",
    provider: "nolo",
    model: "gemini-3.8-flash",
  },
  {
    id: "01GROK46PLAZ00000001PTJZ3K",
    group: "public",
    name: "Grok 4.6",
    provider: "xai",
    model: "grok-4.6",
  },
  {
    id: "01GPTIMG2GEN00000000SSEBOS",
    group: "public",
    name: "GPT Image 2 图片生成器",
    provider: "nolo",
    model: "gpt-6-luna",
    hasImageOutput: true,
    imageModel: "gpt-image-2",
    imageWorkflow: "generate",
    imageConfig: { enabled: true },
  },
  {
    id: "01GPTIMG2EDT00000001R4R4H4",
    group: "public",
    name: "GPT Image 2 图片编辑器",
    provider: "nolo",
    model: "gpt-6-luna",
    hasImageOutput: true,
    imageModel: "gpt-image-2",
    imageWorkflow: "edit",
    imageConfig: { enabled: true },
  },
  {
    id: "01GPTIMG2CNT00000000USKZFO",
    group: "public",
    name: "GPT Image 2 连续创作助手",
    provider: "nolo",
    model: "gpt-6-luna",
    hasImageOutput: true,
    imageModel: "gpt-image-2",
    imageWorkflow: "continuous",
    imageConfig: { enabled: true },
  },
  {
    id: "01NB2LITEGEN00000001XE1MNO",
    group: "public",
    name: "Nano Banana 2 Lite 文生图",
    provider: "nolo",
    model: "gemini-3.1-flash-lite-image",
    hasImageOutput: true,
  },
];

const CATALOG_BY_ID = new Map(BUILTIN_AGENT_CATALOG.map((e) => [e.id, e]));

export function builtinAgentCatalogEntryById(
  id: string | undefined | null,
): BuiltinAgentCatalogEntry | undefined {
  if (!id) return undefined;
  return CATALOG_BY_ID.get(id);
}

/** 所有需要运行时兜底的目录条目（nolo + quick-chat 档位 + Kimi K2.6 兼容） */
export function builtinRuntimeFallbackEntries(): BuiltinAgentCatalogEntry[] {
  return BUILTIN_AGENT_CATALOG.filter((e) => e.runtimeFallback === true);
}

/** 平台内置 6 个（BUILTIN_PLATFORM_AGENT_KEYS 的真相源） */
export function builtinPlatformEntries(): BuiltinAgentCatalogEntry[] {
  return BUILTIN_AGENT_CATALOG.filter((e) => e.group === "builtin");
}

/** 条目是否已退场（retired = 不上面板/广场，仅保留运行时兼容） */
export function isRetiredCatalogEntry(
  entry: BuiltinAgentCatalogEntry | undefined | null,
): boolean {
  return entry?.lifecycle === "retired";
}

/**
 * 全部 retired catalog ID（广场 overlay 的 stale DB 过滤集）。
 * 这些 ID 的存量 DB 记录不得再出现在 /explore；内部兼容与运行时路由不受影响
 * （chatHandler 直读 DB，不走 overlay）。
 */
export function retiredCatalogIds(): readonly string[] {
  return BUILTIN_AGENT_CATALOG.filter((e) => isRetiredCatalogEntry(e)).map(
    (e) => e.id,
  );
}
