import { getModelContextWindow } from "ai/llm/getModelContextWindow";
import {
  isFireworksKimiModel,
  isNoloHostedProvider,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
} from "ai/llm/kimi";
import {
  requiresBareImageUrl,
  toBareImageUrlMessages,
} from "core/chat/bareImageUrlShape";
import { isOllamaEndpoint } from "core/ollamaEndpoint";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

type NormalizeChatCompletionsBodyArgs = {
  body: Record<string, any>;
  provider: string;
  model: string;
  endpoint?: string;
};

/** Moonshot 开放平台旗舰模型 id（api.moonshot.cn OpenAI 兼容模式）。 */
const MOONSHOT_KIMI_K3_MODEL = "kimi-k3";

/**
 * K3 body quirk 的触发判据（server 与本地 runtime 两条出口共用）：
 * - 用户自带 key 的 moonshot 直连；
 * 平台托管路径传进来的 provider 是 "nolo" 而非上游 id，只认 "moonshot" 会让
 * quirk 完全不触发（server 主路径与本地直连路径同样受影响）。
 */
const isKimiK3ProviderModel = (provider: string, model: string): boolean => {
  const normalizedModel = asTrimmedLowercaseString(model);
  if (asTrimmedLowercaseString(provider) === "moonshot") {
    return normalizedModel === MOONSHOT_KIMI_K3_MODEL;
  }
  return (
    isNoloHostedProvider(provider) &&
    normalizedModel === PLATFORM_HOSTED_KIMI_K3_MODEL
  );
};

const isOllamaProviderOrEndpoint = (provider: string, endpoint?: string): boolean => {
  const p = asTrimmedLowercaseString(provider);
  if (p === "ollama" || p === "ollama-cloud") return true;
  return isOllamaEndpoint(endpoint);
};

export const normalizeChatCompletionsBodyForProvider = ({
  body,
  provider,
  model,
  endpoint,
}: NormalizeChatCompletionsBodyArgs): Record<string, any> => {
  const nextBody: Record<string, any> = { ...body, model };
  const normalizedProvider = asTrimmedLowercaseString(provider);

  if (normalizedProvider === "fireworks" && isFireworksKimiModel(model)) {
    delete nextBody.reasoning;
    delete nextBody.reasoning_effort;
  }

  if (isKimiK3ProviderModel(provider, model)) {
    // Kimi K3 官方要求固定采样参数，不应被通用 Agent 默认值覆盖。
    delete nextBody.temperature;
    delete nextBody.top_p;
    delete nextBody.frequency_penalty;
    delete nextBody.presence_penalty;
    // 通用 max_tokens 安全映射成 Kimi 兼容的 max_completion_tokens，
    // 不同时发送两个字段。
    if (typeof nextBody.max_tokens === "number") {
      nextBody.max_completion_tokens = nextBody.max_tokens;
      delete nextBody.max_tokens;
    }
  }

  // Ollama 默认 num_ctx 仅为 2048，导致长对话和工具定义被静默截断。
  // 注入 options.num_ctx 确保 Ollama 为模型分配正确的上下文缓冲区。
  // 对未知模型（fallback 到 256k）使用安全的 32k 默认，避免本地显存 OOM。
  if (isOllamaProviderOrEndpoint(provider, endpoint)) {
    const existingNumCtx = nextBody.options?.num_ctx ?? nextBody.num_ctx;
    if (existingNumCtx === undefined) {
      const cw = getModelContextWindow(model);
      const safeNumCtx =
        typeof cw === "number" && cw > 0
          ? cw === 256_000
            ? 32_768
            : Math.min(cw, 131_072)
          : 32_768;
      nextBody.options = {
        ...nextBody.options,
        num_ctx: safeNumCtx,
      };
    }
  }

  // 载荷形状类的 quirk 住在 core/chat（依赖无关，两条出口共用同一份判定）；
  // 本文件只留 provider→字段增删这类 body 级 quirk。agent-runtime 本地直连
  // 路径直接复用本模块（纯 TS，无 Node 专属依赖），保证与 server 出口一致。
  // 注：Nemotron 3.5 Lightning（RunInfra 上游）的强制 thinking 无法用 body 参数
  // 关闭（/no_think、reasoning:{enabled:false}、chat_template_kwargs、
  // reasoning_effort 全部实测无效），调用方必须给足 max_tokens 预算（标题路径 3072）。
  if (Array.isArray(nextBody.messages) && requiresBareImageUrl({ provider, model })) {
    nextBody.messages = toBareImageUrlMessages(nextBody.messages);
  }

  return nextBody;
};
