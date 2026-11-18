// ai/llm/getModelContextWindow.ts

/**
 * 获取指定模型的 Context Window 大小。
 *
 * 数据真值源是 providers.ts 的全量 `MODEL_LOOKUP_MAP`（覆盖 anthropic / xai /
 * cloudflare / gmi / zai / qwen / moonshot 全部 provider 的模型，含 DashScope
 * 按量表与 Qwen Token Plan 订阅表）。这里按 `name` 与 `displayName` 双键建索引，
 * 因此无论传入的是模型 id（如 "qwen3.8-max"）还是显示名
 * （如 "Qwen3.8 Max"）都能精确命中数据表里的 contextWindow。
 *
 * 早先本函数只查 `ALL_MODELS`，而 ALL_MODELS 不含 qwen / moonshot / anthropic，
 * 导致这些模型的显示名/id 全部落到兜底默认值（256k），状态栏 context 显示失真。
 * 改用全量表后，数据文件成为唯一权威源；下面的 fuzzy 仅用于数据表外的自定义
 * 模型名 / 命名变体兜底。
 *
 * 注意：`getModelInfo` 故意仍用 `ALL_MODELS`（见下文），以保持图像生成能力判定
 * （supportsImageGeneration）等下游行为不变——扩大 getModelInfo 的覆盖会改变
 * 那些「靠 getModelInfo 返回 null 走兜底分支」的模型的判定结果，属于越界副作用。
 */
import { MODEL_LOOKUP_MAP } from "./providers";
import { isPlatformManagedProvider } from "./kimi";
import { resolvePlatformEffectiveModel } from "./platformHostedRoutingTable";
import { ALL_MODELS, type ModelWithProvider } from "./models";
import type { Model } from "./types";

// 默认 Context Window（用于数据表外的未知模型）
export const DEFAULT_CONTEXT_WINDOW = 256_000;

// 以下常量被 fuzzyContextWindow 使用（非死代码）。modelRegistry.test 以 readFileSync 读源码，
// 用 toContain 锁定「常量定义字面量」与「fuzzy 规则字符串」确在本文件出现，故常量名/数值/
// fuzzy 字符串勿删勿改名，否则该源码断言失败。注意：测试并未 import 这两个具名常量。
const QWEN_3_6_CONTEXT_WINDOW = 262_144;
const GLM_5_2_CONTEXT_WINDOW = 1_000_000;
// GPT-6.1 Sol：**兜底基线**，不是真值。Codex OAuth 通道的窗口真值按账号从上游
// 目录取（GET /backend-api/codex/models，见 agent-runtime/codexOAuthModelCatalog.ts）；
// 这里留 500000 的用途只有两处：目录不可用（离线 / 401 / 坏 JSON）时兜底，以及
// 进程启动后**第一轮**——目录播种发生在真正发请求的那一刻，那一轮的窗口解析
// 仍落在 pin 上，随后按目录。2026-11-03 实测（client 0.162.1，plan=prolite）：
// gpt-6.1-sol / gpt-6.1-terra context_window = 500000，max_context_window = 872000，
// effective_context_window_percent = 95。max_context_window 只作证据：
// nolo 没实现 experimental context 的请求侧开关，按 872000 算窗口会被上游拒。
const GPT_6_1_SOL_CONTEXT_WINDOW = 500_000;
// 边界匹配：允许 provider 前缀（如 openai/gpt-6.1-sol）、effort 后缀（如 -medium）与显示名
// 空格分隔（"GPT-6.1 Sol" 小写后为 "gpt-6.1 sol"）；拒绝 gpt-6.1-solar 等无关前缀；
// 不得改成裸 includes("gpt-6.1")，以免误伤 astra / luna。
const GPT_6_1_SOL_PATTERN = /(^|\/)gpt-6\.1[- ]sol(?![a-z])/;

// GPT-6.1 / 6.2 家族（Sol / Terra / Astra）：目录不可用 / 尚未播种时的兜底基线 = 500000
// （2026-11-03 实测，plan=prolite；目录优先，见 codexOAuthModelCatalog.ts）。
const GPT_6_1_PINNED_PATTERN = /(^|\/)gpt-(?:6\.1[- ](sol|terra)|6\.2[- ](sol|astra))(?![a-z0-9])/;

// GPT-6 / GPT-5.6 家族（Astra / Luna / Sol / Terra）：兜底基线 = 272000
// （2026-11-03 实测，plan=prolite；目录优先）。
// 必须精确覆盖各代成员，不得用裸 includes("gpt-6")（避免误伤 gpt-6.1 / solar 等）或裸 includes("gpt-5")（避免误伤 5.6 之外）。
const GPT_272K_PINNED_PATTERN =
  /(^|\/)(gpt-6[- ](astra|luna|sol)|gpt-5\.6[- ](sol|terra|luna))(?![a-z0-9])/;
const GPT_272K_CONTEXT_WINDOW = 272_000;

/**
 * 通道专属窗口（**兜底基线**）：同一个 id 在不同通道上窗口不同，这是通道事实而非
 * 厂商能力；而这些数值本身还会随**账号档位**变——所以它们只是「问不到上游目录时」
 * 的基线，不是真值。
 *
 * 真值链路：Codex OAuth agent 的窗口解析在
 * devin/devinChannelWindows.ts:resolveAgentContextWindow 里先查
 * codexOAuthCatalogWindow(model)（上游目录，按 accountId 分桶、1h TTL，
 * 见 agent-runtime/codexOAuthModelCatalog.ts），只在目录不可用 / 进程启动后尚未
 * 播种时回落到本文件的 pin。因此「启动后第一轮走 pin，随后按目录」是刻意保守：
 * 目录播种发生在真正发请求的那一刻，早于它的解析不猜。
 *
 * 2026-11-03 实测（client 0.162.1，plan=prolite）：
 *   gpt-6.1-sol / gpt-6.1-terra —— Codex OAuth 订阅通道 500,000
 *     （目录 context_window，见 GPT_6_1_SOL_CONTEXT_WINDOW）；
 *   gpt-6-astra / gpt-6-luna / gpt-6-sol / gpt-5.6-sol / gpt-5.6-terra / gpt-5.6-luna
 *     —— Codex OAuth 订阅通道 272,000；
 *   全部 max_context_window = 872000、effective_context_window_percent = 95——只作证据，
 *   **不自动启用**：nolo 没有实现 experimental context 的请求侧开关，按 872000 填窗口
 *   会被上游按真实窗口拒。
 *   CF 平台托管通道 1,050,000（CF 官方模型页，见 platformHosted 的目录条目）。
 * 裸名 / 未知通道取通道真值；显式声明平台通道（provider 命中平台托管）时取平台
 * 目录值。既不全局取大、也不为了「保守」给平台通道设上限。
 */
function channelPinnedContextWindow(normalizedName: string): number | undefined {
  if (GPT_6_1_PINNED_PATTERN.test(normalizedName)) return GPT_6_1_SOL_CONTEXT_WINDOW;
  if (GPT_272K_PINNED_PATTERN.test(normalizedName)) return GPT_272K_CONTEXT_WINDOW;
  return undefined;
}

const ANTIGRAVITY_EFFORT_SUFFIXES = [
  "-tiered",
  "-extra-low",
  "-low",
  "-medium",
  "-high",
] as const;

function stripEffortSuffix(model: string): string {
  for (const suffix of ANTIGRAVITY_EFFORT_SUFFIXES) {
    if (model.endsWith(suffix) && model.length > suffix.length) {
      return model.slice(0, -suffix.length);
    }
  }
  return model;
}

function stripPreviewSuffix(model: string): string {
  const suffix = "-preview";
  if (model.endsWith(suffix) && model.length > suffix.length) {
    return model.slice(0, -suffix.length);
  }
  return model;
}

function stripModelTag(model: string): string {
  const colonIndex = model.indexOf(":");
  if (colonIndex > 0) {
    return model.slice(0, colonIndex);
  }
  return model;
}

// 全量模型映射表（context window 解析用）：name + displayName 双键，值带 provider。
let fullModelMap: Map<string, ModelWithProvider> | null = null;

const getFullModelMap = (): Map<string, ModelWithProvider> => {
  if (!fullModelMap) {
    fullModelMap = new Map();
    for (const [provider, models] of Object.entries(MODEL_LOOKUP_MAP)) {
      for (const model of models as readonly Model[]) {
        const entry: ModelWithProvider = { ...model, provider };
        fullModelMap.set(model.name, entry);
        // 也按 displayName 索引（如果有），统一小写以匹配 TUI 传入的显示名
        if (model.displayName) {
          fullModelMap.set(model.displayName.toLowerCase(), entry);
        }
      }
    }
  }
  return fullModelMap;
};

// 旧映射表（仅 ALL_MODELS）：getModelInfo 专用，保持下游能力判定行为不变。
let legacyModelMap: Map<string, ModelWithProvider> | null = null;

const getLegacyModelMap = (): Map<string, ModelWithProvider> => {
  if (!legacyModelMap) {
    legacyModelMap = new Map();
    for (const model of ALL_MODELS) {
      legacyModelMap.set(model.name, model);
      if (model.displayName) {
        legacyModelMap.set(model.displayName.toLowerCase(), model);
      }
    }
  }
  return legacyModelMap;
};

/**
 * 数据表外的命名变体兜底。顺序敏感：更具体的模式在前。
 * 多数标准名已被 getFullModelMap 精确命中，本函数只在 map miss 时触发。
 */
function fuzzyContextWindow(normalizedName: string): number | undefined {
  // 带传输前缀的 id（如 mistralai/mistral-medium-3 / xiaomi/mimo-v2.6-pro）按最后一段比较。
  const bareModelName = (
    normalizedName.includes("/")
      ? normalizedName.slice(normalizedName.lastIndexOf("/") + 1)
      : normalizedName
  ).replace(/:.*$/, "");

  // 超长上下文 / 编程系列（具体模式优先，避免被下面的版本号规则吞掉）
  if (normalizedName.includes("qwen-long") || normalizedName.includes("qwen3-long")) return 10_485_760;
  if (normalizedName.includes("qwen-coder") || normalizedName.includes("qwen3-coder")) return 1_048_576;
  // 1M 档
  if (normalizedName.includes("qwen3.8") || normalizedName.includes("qwen3p8")) return 1_000_000;
  if (normalizedName.includes("minimax-m3") || normalizedName.includes("minimax_m3")) return 1_000_000;
  // MiMo V2.6 Pro = 1M 上下文（官方目录口径 1048576；CommandCode 清单条目已带
  // contextWindow，经模型表精确命中，属真值源）。本规则只兜底裸 id / 展示名变体，
  // 刻意不用 includes("mimo-v2.6") 泛匹配：那会把窗口未公布的其它 mimo-v2.6 变体
  // （*-flash / *-ultraspeed / 参数后缀等，可能来自自定义通道）一起放宽到 1M，
  // 属无证据放大。
  if (bareModelName === "mimo-v2.6-pro" || normalizedName === "mimo v2.6 pro") return 1_048_576;
  if (normalizedName.includes("glm-5.3") || normalizedName.includes("glm5.3")) return 1_050_000;
  if (normalizedName.includes("glm-5.2") || normalizedName.includes("glm5.2")) return GLM_5_2_CONTEXT_WINDOW;
  if (normalizedName.includes("deepseek")) return 1_000_000;
  if (GPT_6_1_SOL_PATTERN.test(normalizedName)) return GPT_6_1_SOL_CONTEXT_WINDOW;
  const channelPinned = channelPinnedContextWindow(normalizedName);
  if (channelPinned !== undefined) return channelPinned;
  if (normalizedName.includes("gpt-5") || normalizedName.includes("gpt-4.1")) return 1_047_576;
  // Cursor OAuth 模型（providerRegistry cursor-oauth preset，id 以 Cursor GetUsableModels 为准）。
  // Grok 4.5 / Claude 4.6 / Gemini 3.1 Pro 在 Cursor 内均为 1M 级上下文；claude-4.6-* 必须先于
  // 下方通用 "claude" → 200k 规则，否则会落 200k。Composer 2.5 未公布固定窗口，不在此显式返回
  // （保持默认 256k）。gpt-5.3-codex / gpt-5.4-medium 已命中上方 gpt-5 规则，无需重复。
  if (normalizedName.startsWith("cursor-grok-4.5")) return 1_000_000;
  if (normalizedName.includes("claude-4.6")) return 1_000_000;
  if (normalizedName.includes("gemini-3.1")) return 1_000_000;
  if (normalizedName.includes("gemini")) return 1_048_576;
  // 256k 档
  if (normalizedName.includes("qwen3.6") || normalizedName.includes("qwen3p6")) return QWEN_3_6_CONTEXT_WINDOW;
  if (normalizedName.includes("qwen3.7") || normalizedName.includes("qwen3p7")) return 262_144;
  // 必须按 token 边界匹配：`includes("minimax_m2")` 会把 minimax_m2.7 / m2.5 一类
  // 新版本按前缀吞进 262k，而它们的真实窗口不同（实测 "minimax m2.7" 走精确表得
  // 204800）。下划线形态由 :466 的回退归一化处理。
  //
  // `_` 仍保留在字符类里：回退归一化带大小写闸门，全大写裸拼法（`MINIMAX_M2`）
  // 不会被归一化，少了它就会从 HEAD 的 262144 掉到默认 256k。仅影响大写拼法，
  // 方向是缩小，但没必要平白制造差异。
  if (/minimax[-_ ]m2(?![\d.])/.test(normalizedName)) return 262_144;
  // Mistral 现任家族（依据：GET api.mistral.ai/v1/models 的 max_context_length，
  // 2026-10-07 实测全量读取）。必须置于下方通用 "mistral" → 32k 规则之前；
  // 历史小模型（mistral:7b / mistral-nemo）不在此列，仍落 32k / 128k 档。
  //
  // 连字符 / 空格 / 下划线三种书写都必须认：TUI / agent 显示名走的是空格形态
  // （"Mistral Large 4"、"Ollama Mistral Large 4"），自定义通道也可能写下划线。
  // 这条规则原先只写连字符，于是显示名掉到下面通用的 includes("mistral") → 32k，
  // 把 512k 的模型显示成 32k（与 "ollama" 被 llama 规则吞掉同源）。
  // 两处分隔符都要放宽：mistral↔large、large↔4。只放宽第一处不够
  // （"Mistral Large 4" 小写后是 mistral large 4，两处都是空格）。
  // 下划线同样接受：下划线是显示变体而非独立命名（精确表里 0 条带下划线）。
  const MISTRAL_LARGE_4 = /mistral[-_ ]large[-_ ]4/;
  const large4 = MISTRAL_LARGE_4.exec(normalizedName);
  if (large4) {
    // mistral-large-4 / mistral-large-4-0 / "Mistral Large 4" = 524288；
    // 要求 token 边界，避免命中假想的 -40b / 4.1 之类。
    // 边界字符刻意不含 "."：mistral-large-4.1 这类尚未存在的版本宁可落通用兜底
    // （同"表外不扩"口径）。
    const rest = normalizedName.slice(large4.index + large4[0].length);
    if (rest === "" || /^[-:_@/\s]/.test(rest)) return 524_288;
  }
  if (
    normalizedName.includes("mistral-vibe-cli") ||
    normalizedName.includes("mistral-medium-3.5") ||
    normalizedName.includes("mistral-medium-3-5") ||
    normalizedName.includes("mistral-medium-latest") ||
    normalizedName.includes("mistral-medium-2604") ||
    normalizedName.includes("mistral-large-latest") ||
    normalizedName.includes("mistral-large-2512") ||
    normalizedName.includes("mistral-small-latest") ||
    normalizedName.includes("mistral-small-2603") ||
    normalizedName.includes("magistral-medium-latest") ||
    normalizedName.includes("magistral-small-latest") ||
    // 展示名（TUI 传 displayName 的路径；Mistral 不在 MODEL_LOOKUP_MAP，无法走精确表）：
    normalizedName.includes("mistral vibe cli") ||
    normalizedName.includes("mistral medium 3.5") ||
    normalizedName.includes("mistral large (latest)")
  ) {
    return 262_144;
  }
  // 裸 id（刻意不写 includes("mistral-medium-3")，避免误伤 -3.1 / -2508 等历史档）
  if (bareModelName === "mistral-medium" || bareModelName === "mistral-medium-3") return 262_144;
  // 非 chat 家族与 code 家族：家族级外推（非逐 id 实测），取该家族共同的实测窗口
  if (normalizedName.includes("mistral-embed") || normalizedName.includes("codestral-embed")) return 8_192;
  if (normalizedName.includes("mistral-ocr")) return 16_384;
  if (normalizedName.includes("mistral-moderation")) return 131_072;
  if (normalizedName.includes("codestral") || normalizedName.includes("mistral-code")) return 256_000;
  // 200k 档
  if (normalizedName.includes("claude")) return 200_000;
  // 128k 档 (常见开源与 Ollama 本地模型)
  if (
    normalizedName.includes("llama3.1") ||
    normalizedName.includes("llama-3.1") ||
    normalizedName.includes("llama3.2") ||
    normalizedName.includes("llama-3.2") ||
    normalizedName.includes("llama3.3") ||
    normalizedName.includes("llama-3.3") ||
    normalizedName.includes("qwen2.5") ||
    normalizedName.includes("qwen-2.5") ||
    normalizedName.includes("mistral-nemo") ||
    normalizedName.includes("phi3.5") ||
    normalizedName.includes("phi-3.5") ||
    normalizedName.includes("phi4") ||
    normalizedName.includes("phi-4")
  ) {
    return 131_072;
  }
  // 32k 档
  if (
    normalizedName.includes("qwen2") ||
    normalizedName.includes("qwen-2") ||
    normalizedName.includes("mistral") ||
    normalizedName.includes("mixtral")
  ) {
    return 32_768;
  }
  // 16k 档
  if (
    normalizedName.includes("codellama") ||
    normalizedName.includes("starcoder") ||
    normalizedName.includes("phi3") ||
    normalizedName.includes("phi-3")
  ) {
    return 16_384;
  }
  // 8k 档
  if (
    normalizedName.includes("llama3") ||
    normalizedName.includes("llama-3") ||
    normalizedName.includes("gemma2") ||
    normalizedName.includes("gemma-2") ||
    normalizedName.includes("gemma")
  ) {
    return 8_192;
  }
  // 4k 档（首代 llama / llama:7b 这类裸名 + "Meta Llama 2" 这类展示名变体）。
  //
  // 必须按**词边界**匹配，不能用 `includes("llama")`：那会把 provider 名
  // "ollama" 里的 `-llama` 当成模型族命中（"Ollama V4.1 Flash" / "Ollama
  // Cloud" / 裸 "ollama" 全部落 4K），TUI 状态栏于是把 1M 窗口的模型显示成
  // `ctx 100% · 658k/4k`。同理 "codellama" 要留给上面的 16K 档，不能被这条
  // 4K 规则吞掉（它同样只在前一个字母边界内包含 llama）。
  if (/(^|[^a-z])llama/.test(normalizedName)) {
    return 4_096;
  }
  return undefined;
}

/**
 * Codex OAuth 通道的 pin 值（只对通道专属窗口表覆盖的 gpt 家族命中）。
 *
 * 供**拿不到 provider** 的调用点使用：同一个 id 在 OAuth 与平台托管通道上的窗口
 * 不同（gpt-6-astra：OAuth 272k / 平台 1.05M），CLI 状态栏这类只有模型名的调用点
 * 若直接查公共目录，会把平台值当成真实余量显示（高估 4 倍）。
 *
 * 命中返回 pin；未命中返回 undefined，调用方继续走原解析链。
 * 语义刻意保守：只按通道 pin 取，不取平台目录值——平台托管 agent 在 CLI 侧会因此
 * 显示偏小的余量，比把 272k 显示成 1.05M 安全。
 */
export const findCodexOAuthPinnedContextWindow = (
  modelName: string,
  provider?: string | null,
): number | undefined => {
  if (!modelName) return undefined;
  if (isPlatformManagedProvider(provider, modelName)) return undefined;
  return channelPinnedContextWindow(modelName.toLowerCase());
};

/**
 * 解析模型名称的 Context Window，**不套 DEFAULT 兜底**。
 *
 * 与 `getModelContextWindow` 共用同一条解析链（精确索引 → 通道 pin → fuzzy），
 * 唯一差别是 miss 返回 `undefined` 而不是 256k。需要区分「查到了」与「不知道」
 * 的调用方用这个——把 256k 当成真值去算百分比，会把 1M 的模型显示成虚高 4 倍。
 *
 * @param modelName 模型名称或显示名（如 "qwen3.8-max" / "Qwen3.8 Max"）
 * @param provider 可选：已知的通道 / provider。平台托管通道（provider 命中平台
 *   托管）下，通道专属 id 返回平台目录真值；缺省时按 id 的通道真值解析。
 * @returns Context Window 大小（tokens）；解析不出时 undefined
 */
export const findModelContextWindow = (
  modelName: string,
  provider?: string | null,
): number | undefined => findModelContextWindowImpl(modelName, provider, false);

/**
 * `allowHyphenRetry` 只允许由本函数的回退分支自己置位一次，防递归。
 *
 * 回退必须**重入完整解析链**而不是只再调一次 fuzzy：fuzzy 跳过精确表与通道
 * pin，而精确表的窗口值是数据真值源、通常比家族模糊规则更准（实测
 * "accounts/fireworks/models/minimax m3" 连字符形态在表内是 512000，只跑
 * fuzzy 会按家族规则给到 1000000 —— 近 2 倍高估，正是本文件
 * mimo-v2.6-pro 那段刻意避免的「无证据放大」）。
 */
const findModelContextWindowImpl = (
  modelName: string,
  provider: string | null | undefined,
  allowHyphenRetry: boolean,
): number | undefined => {
  if (!modelName) return undefined;

  // 显式平台通道：允许用平台目录（CF）真值；否则一律按 id 的通道真值解析。
  const onPlatformChannel = isPlatformManagedProvider(provider, modelName);
  const normalizedName = modelName.toLowerCase();
  const map = getFullModelMap();

  const rawCandidates = [modelName, normalizedName];
  const strippedTag = stripModelTag(modelName);
  if (strippedTag !== modelName) {
    rawCandidates.push(strippedTag, strippedTag.toLowerCase());
  }

  const candidates: string[] = [];
  for (const base of rawCandidates) {
    candidates.push(base);
    const strippedEffort = stripEffortSuffix(base);
    if (strippedEffort !== base) {
      candidates.push(strippedEffort, strippedEffort.toLowerCase());
    }
    const strippedPreview = stripPreviewSuffix(base);
    if (strippedPreview !== base) {
      candidates.push(strippedPreview, strippedPreview.toLowerCase());
    }
    if (strippedEffort !== base) {
      const strippedBoth = stripPreviewSuffix(strippedEffort);
      if (strippedBoth !== strippedEffort) {
        candidates.push(strippedBoth, strippedBoth.toLowerCase());
      }
    }
  }

  for (const candidate of candidates) {
    const model = map.get(candidate);
    if (model?.contextWindow) {
      // 通道碰撞：目录条目对「通道专属 id」可能含平台通道真值，裸名 / 其它通道
      // 不得使用（否则 Codex OAuth 侧被放大到 1.05M）；继续往下取通道真值。
      if (
        !onPlatformChannel &&
        (channelPinnedContextWindow(model.name.toLowerCase()) !== undefined ||
          channelPinnedContextWindow(candidate.toLowerCase()) !== undefined)
      ) {
        continue;
      }
      return typeof model.contextWindow === "number"
        ? model.contextWindow
        : undefined;
    }
  }

  // 平台通道：旧代 id（别名）本身没有目录条目，但它的**别名目标**有——按目标模型的
  // 平台真值取窗口（如 gpt-6-sol → gpt-6.1-sol → 1,050,000）。
  // 不做这一步会落到 OAuth 的 pinned 值（272k），造成平台侧窗口低估、提前裁剪。
  if (onPlatformChannel) {
    const effective = resolvePlatformEffectiveModel(normalizedName);
    if (effective && effective !== normalizedName) {
      const aliased = map.get(effective);
      if (aliased?.contextWindow) {
        return typeof aliased.contextWindow === "number"
          ? aliased.contextWindow
          : undefined;
      }
    }
  }

  if (!onPlatformChannel) {
    for (const candidate of candidates) {
      const pinned = channelPinnedContextWindow(candidate.toLowerCase());
      if (pinned !== undefined) return pinned;
    }
  }

  const fuzzy = fuzzyContextWindow(normalizedName);
  if (fuzzy !== undefined) return fuzzy;

  // 空格形态的**最后一道**回退：显示名用空格分隔（"Mistral Large 4"、
  // "Phi 3"），而本文件里若干具体规则写的是连字符。
  //
  // 生效范围要说准（否则会误导下一个维护者）：它只在**整条解析链没有任何规则
  // 命中**时兜底。像 "Mistral Large 4" 那种「通用规则 includes("mistral") 已
  // 命中、只是给出 32k 错值」的情形，B 不会介入——那类缺口只能逐条放宽规则
  // （本 diff 的 A 就是），B 兜不住。
  //
  // 重入的是**完整解析链**，连同精确表与通道 pin：只重跑 fuzzy 会跳过数据真值
  // 源，按更粗的家族规则放大窗口（实测近 2 倍高估）。
  //
  // 归一化同时处理空白与下划线——两者都是**显示变体**，不是独立命名：精确表里
  // 没有任何一条带下划线的 name/displayName（实测 0 条），而仓库多处既有规则
  // 也早就把 `minimax_m3` / `qwen3p8` 当别名。所以下划线不该有自己的语义。
  //
  // 但不能无条件替换：
  //  1) `claude_4.6` 直接落 200000 是对的（Claude 系真实窗口），若先归一化成
  //     `claude-4.6` 会命中 Cursor OAuth 的 1M 规则，属错误放大。
  //  2) 全大写枚举 selector（`MODEL_GPT_5_2_MEDIUM`，devin 通道专用）归一化后会
  //     撞上 `includes("gpt-5")` → 1.05M，把一个「表外不猜」的 id 放大 4 倍。
  //     它的下划线是命名结构而非分隔符，故只把**在原始大小写里两侧都是小写或
  //     数字**的下划线视作分隔符。判断必须用 modelName 而非 normalizedName——
  //     后者已 toLowerCase，`MODEL_GPT_5_2_MEDIUM` 会变成 model_gpt_5_2_medium，
  //     两侧看着都"小写"，判据就失效了。
  //
  // 生效范围要如实说（否则会高估它）：这是**落空填充**，不是「下划线等价于空格」。
  // 宽家族规则在上面就先截住了，比如 `Claude_Opus_5.5` 被 includes("claude") 判成
  // 200000（精确表真值 1M），回退根本不会触发。那属于「宽规则错命中」，只能逐条
  // 收紧规则，本回退兜不住——别指望它统一下划线/空格/连字符三种拼法。
  //
  // 另外：调用方必须传**原始大小写**的 id。下游若先 toLowerCase 再传进来，枚举
  // 保护会失效（MODEL_GPT_5_2_MEDIUM 会退化成可被 gpt-5 家族命中的形态）。
  //
  // 只在整链落空后回退，这条「不覆写已有判定」的性质按构造成真。
  if (!allowHyphenRetry) {
    const canonical = normalizeSeparators(modelName);
    if (canonical.toLowerCase() !== normalizedName) {
      return findModelContextWindowImpl(canonical, provider, true);
    }
  }

  return undefined;
};

/**
 * 把「显示变体」的分隔符统一成连字符：空白一律，下划线仅在**原始大小写**里两侧
 * 都是小写字母或数字时（`phi_4` / `glm_5.3` 是变体，`MODEL_GPT_5_2_MEDIUM` 是标识符）。
 *
 * 刻意不动大写：`MODEL_GPT_5_2_MEDIUM` 的下划线是命名结构，改掉会让它在非 devin
 * 通道上撞进 `includes("gpt-5")` 家族规则，把「表外不猜」的 id 放大到 1.05M。
 */
function normalizeSeparators(raw: string): string {
  return raw
    .replace(/\s+/g, "-")
    .replace(/(?<=[a-z0-9])_(?=[a-z0-9])/g, "-");
}

/**
 * 根据模型名称获取 Context Window 大小（精确表与 fuzzy 都 miss 时落 256k）。
 *
 * 语义 = `findModelContextWindow(...) ?? DEFAULT_CONTEXT_WINDOW`，与本函数历史行为
 * 逐字一致；只是把「查到了」和「查不到」的区分能力留在 `findModelContextWindow` 里。
 */
export const getModelContextWindow = (
  modelName: string,
  provider?: string | null,
): number => findModelContextWindow(modelName, provider) ?? DEFAULT_CONTEXT_WINDOW;

/**
 * 获取模型的完整信息。
 *
 * 仍基于 `ALL_MODELS`（不含 qwen / moonshot / anthropic），与历史行为一致：
 * 扩大覆盖会改变 supportsImageGeneration 等「依赖 getModelInfo 返回 null 走兜底」
 * 的下游判定，故此处刻意不切全量表。
 */
export const getModelInfo = (modelName: string): ModelWithProvider | null => {
  if (!modelName) return null;
  const map = getLegacyModelMap();
  return map.get(modelName) || map.get(modelName.toLowerCase()) || null;
};

// getModelMaxOutputTokens 已删除（零引用死函数）。
//
// 它按 ALL_MODELS 的 maxOutputTokens 返回"模型输出上限"、缺失时兜底 4096，看起来可以
// 用来给请求填 max_tokens——不要这么做。那份数据从未被任何真实请求验证过，实测已知至少
// 两处失真：deepseek-v4-pro 标 384000（是 contextWindow 抄进了 output 字段，实际约 4K 就
// 被截断），deepinfra 的 Claude 系标 4092（远低于这些模型的真实输出能力）。
//
// 输出上限的真值在 provider 手里。agent 没显式配 max_tokens 时就不要发这个参数，让 provider
// 用自己的默认；需要控制的场景走 agent 高级设置里的显式 max_tokens。
// 截断本身由 finish_reason === "length" 上报（见 packages/agent-runtime/types.ts）。

/**
 * 获取模型是否支持视觉
 */
export const getModelHasVision = (modelName: string): boolean => {
  const model = getModelInfo(modelName);
  return model?.hasVision ?? false;
};
