// packages/ai/llm/modelAvatar.ts
// Maps provider/model name → @lobehub/icons Avatar component.

import { createElement, type CSSProperties, type ComponentType } from "react";

export type LobehubAvatarProps = {
  size?: number | string;
  style?: CSSProperties;
  className?: string;
};
type AvatarCtor = ComponentType<LobehubAvatarProps>;
type MonoModule = { default?: ComponentType<{ size?: number | string; style?: CSSProperties }> };
type AvatarModule = { default?: AvatarCtor };
type StyleModule = {
  AVATAR_BACKGROUND?: string;
  AVATAR_COLOR?: string;
  AVATAR_ICON_MULTIPLE?: number;
};

type AvatarLoader = () => Promise<{ avatar?: AvatarModule; mono?: MonoModule; style?: StyleModule }>;

const scaleSize = (size: number | string, multiple: number) =>
  typeof size === "number" ? size * multiple : `calc(${size} * ${multiple})`;

const createAvatarComponent = (
  Mono: ComponentType<{ size?: number | string; style?: CSSProperties }>,
  styleModule: StyleModule
): AvatarCtor => {
  const background = styleModule.AVATAR_BACKGROUND ?? "#111";
  const color = styleModule.AVATAR_COLOR ?? "#fff";
  const iconMultiple = styleModule.AVATAR_ICON_MULTIPLE ?? 0.75;

  const AvatarComponent: AvatarCtor = (rawProps) => {
    const { size = 40, style, className } = rawProps ?? {};

    return createElement(
      "div",
      {
        "aria-hidden": "true",
        className,
        style: {
          alignItems: "center",
          background,
          borderRadius: "50%",
          color,
          display: "inline-flex",
          flex: "none",
          height: size,
          justifyContent: "center",
          lineHeight: 1,
          overflow: "hidden",
          width: size,
          ...style,
        },
      },
      createElement(Mono, { size: scaleSize(size, iconMultiple), style: { flex: "none" } })
    );
  };

  return AvatarComponent;
};

// key → lazy import factory
const MAP: Record<string, AvatarLoader> = {
  // ── 国际大厂 ─────────────────────────────────────
  openai: () =>
    Promise.all([
      import("@lobehub/icons/es/OpenAI/components/Mono"),
      import("@lobehub/icons/es/OpenAI/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  claude: () =>
    Promise.all([
      import("@lobehub/icons/es/Claude/components/Mono"),
      import("@lobehub/icons/es/Claude/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  anthropic: () =>
    Promise.all([
      import("@lobehub/icons/es/Anthropic/components/Mono"),
      import("@lobehub/icons/es/Anthropic/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  gemini: () =>
    Promise.all([
      import("@lobehub/icons/es/Gemini/components/Color"),
      import("@lobehub/icons/es/Gemini/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  google: () =>
    Promise.all([
      import("@lobehub/icons/es/Google/components/Mono"),
      import("@lobehub/icons/es/Google/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  grok: () =>
    Promise.all([
      import("@lobehub/icons/es/Grok/components/Mono"),
      import("@lobehub/icons/es/Grok/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  xai: () =>
    Promise.all([
      import("@lobehub/icons/es/XAI/components/Mono"),
      import("@lobehub/icons/es/XAI/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  mistral: () =>
    Promise.all([
      import("@lobehub/icons/es/Mistral/components/Mono"),
      import("@lobehub/icons/es/Mistral/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  llama: () =>
    Promise.all([
      import("@lobehub/icons/es/Meta/components/Mono"),
      import("@lobehub/icons/es/Meta/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  meta: () =>
    Promise.all([
      import("@lobehub/icons/es/Meta/components/Mono"),
      import("@lobehub/icons/es/Meta/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  perplexity: () =>
    Promise.all([
      import("@lobehub/icons/es/Perplexity/components/Mono"),
      import("@lobehub/icons/es/Perplexity/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  cohere: () =>
    Promise.all([
      import("@lobehub/icons/es/Cohere/components/Mono"),
      import("@lobehub/icons/es/Cohere/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  gemma: () =>
    Promise.all([
      import("@lobehub/icons/es/Gemma/components/Mono"),
      import("@lobehub/icons/es/Gemma/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  copilot: () =>
    Promise.all([
      import("@lobehub/icons/es/Copilot/components/Mono"),
      import("@lobehub/icons/es/Copilot/style"),
    ]).then(([mono, style]) => ({ mono, style })),

  // ── 中国模型 ─────────────────────────────────────
  glm: () =>
    Promise.all([
      import("@lobehub/icons/es/ChatGLM/components/Mono"),
      import("@lobehub/icons/es/ChatGLM/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  chatglm: () =>
    Promise.all([
      import("@lobehub/icons/es/ChatGLM/components/Mono"),
      import("@lobehub/icons/es/ChatGLM/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  zhipu: () =>
    Promise.all([
      import("@lobehub/icons/es/Zhipu/components/Mono"),
      import("@lobehub/icons/es/Zhipu/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  kimi: () =>
    Promise.all([
      import("@lobehub/icons/es/Kimi/components/Mono"),
      import("@lobehub/icons/es/Kimi/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  moonshot: () =>
    Promise.all([
      import("@lobehub/icons/es/Moonshot/components/Mono"),
      import("@lobehub/icons/es/Moonshot/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  minimax: () =>
    Promise.all([
      import("@lobehub/icons/es/Minimax/components/Mono"),
      import("@lobehub/icons/es/Minimax/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  hailuo: () =>
    Promise.all([
      import("@lobehub/icons/es/Hailuo/components/Mono"),
      import("@lobehub/icons/es/Hailuo/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  doubao: () =>
    Promise.all([
      import("@lobehub/icons/es/Doubao/components/Mono"),
      import("@lobehub/icons/es/Doubao/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  hunyuan: () =>
    Promise.all([
      import("@lobehub/icons/es/Hunyuan/components/Mono"),
      import("@lobehub/icons/es/Hunyuan/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  deepseek: () =>
    Promise.all([
      import("@lobehub/icons/es/DeepSeek/components/Mono"),
      import("@lobehub/icons/es/DeepSeek/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  qwen: () =>
    Promise.all([
      import("@lobehub/icons/es/Qwen/components/Mono"),
      import("@lobehub/icons/es/Qwen/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  wenxin: () =>
    Promise.all([
      import("@lobehub/icons/es/Wenxin/components/Mono"),
      import("@lobehub/icons/es/Wenxin/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  ernie: () =>
    Promise.all([
      import("@lobehub/icons/es/Wenxin/components/Mono"),
      import("@lobehub/icons/es/Wenxin/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  baichuan: () =>
    Promise.all([
      import("@lobehub/icons/es/Baichuan/components/Mono"),
      import("@lobehub/icons/es/Baichuan/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  yi: () =>
    Promise.all([
      import("@lobehub/icons/es/Yi/components/Mono"),
      import("@lobehub/icons/es/Yi/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  zeroone: () =>
    Promise.all([
      import("@lobehub/icons/es/ZeroOne/components/Mono"),
      import("@lobehub/icons/es/ZeroOne/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  internlm: () =>
    Promise.all([
      import("@lobehub/icons/es/InternLM/components/Mono"),
      import("@lobehub/icons/es/InternLM/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  spark: () =>
    Promise.all([
      import("@lobehub/icons/es/Spark/components/Mono"),
      import("@lobehub/icons/es/Spark/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  iflyt: () =>
    Promise.all([
      import("@lobehub/icons/es/Spark/components/Mono"),
      import("@lobehub/icons/es/Spark/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  stepfun: () =>
    Promise.all([
      import("@lobehub/icons/es/Stepfun/components/Mono"),
      import("@lobehub/icons/es/Stepfun/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  step: () =>
    Promise.all([
      import("@lobehub/icons/es/Stepfun/components/Mono"),
      import("@lobehub/icons/es/Stepfun/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  sensenova: () =>
    Promise.all([
      import("@lobehub/icons/es/SenseNova/components/Mono"),
      import("@lobehub/icons/es/SenseNova/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  sensetime: () =>
    Promise.all([
      import("@lobehub/icons/es/SenseNova/components/Mono"),
      import("@lobehub/icons/es/SenseNova/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  qingyan: () =>
    Promise.all([
      import("@lobehub/icons/es/Qingyan/components/Mono"),
      import("@lobehub/icons/es/Qingyan/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  coze: () =>
    Promise.all([
      import("@lobehub/icons/es/Coze/components/Mono"),
      import("@lobehub/icons/es/Coze/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  yuanbao: () =>
    Promise.all([
      import("@lobehub/icons/es/Yuanbao/components/Mono"),
      import("@lobehub/icons/es/Yuanbao/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  tiangong: () =>
    Promise.all([
      import("@lobehub/icons/es/Tiangong/components/Mono"),
      import("@lobehub/icons/es/Tiangong/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  skywork: () =>
    Promise.all([
      import("@lobehub/icons/es/Skywork/components/Mono"),
      import("@lobehub/icons/es/Skywork/style"),
    ]).then(([mono, style]) => ({ mono, style })),

  // ── 推理/托管平台 ─────────────────────────────────
  groq: () =>
    Promise.all([
      import("@lobehub/icons/es/Groq/components/Mono"),
      import("@lobehub/icons/es/Groq/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  together: () =>
    Promise.all([
      import("@lobehub/icons/es/Together/components/Mono"),
      import("@lobehub/icons/es/Together/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  deepinfra: () =>
    Promise.all([
      import("@lobehub/icons/es/DeepInfra/components/Mono"),
      import("@lobehub/icons/es/DeepInfra/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  fireworks: () =>
    Promise.all([
      import("@lobehub/icons/es/Fireworks/components/Mono"),
      import("@lobehub/icons/es/Fireworks/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  openrouter: () =>
    Promise.all([
      import("@lobehub/icons/es/OpenRouter/components/Mono"),
      import("@lobehub/icons/es/OpenRouter/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  novita: () =>
    Promise.all([
      import("@lobehub/icons/es/Novita/components/Mono"),
      import("@lobehub/icons/es/Novita/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  sambanova: () =>
    Promise.all([
      import("@lobehub/icons/es/SambaNova/components/Mono"),
      import("@lobehub/icons/es/SambaNova/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  cerebras: () =>
    Promise.all([
      import("@lobehub/icons/es/Cerebras/components/Mono"),
      import("@lobehub/icons/es/Cerebras/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  siliconcloud: () =>
    Promise.all([
      import("@lobehub/icons/es/SiliconCloud/components/Mono"),
      import("@lobehub/icons/es/SiliconCloud/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  ollama: () =>
    Promise.all([
      import("@lobehub/icons/es/Ollama/components/Mono"),
      import("@lobehub/icons/es/Ollama/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  lmstudio: () =>
    Promise.all([
      import("@lobehub/icons/es/LmStudio/components/Mono"),
      import("@lobehub/icons/es/LmStudio/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  huggingface: () =>
    Promise.all([
      import("@lobehub/icons/es/HuggingFace/components/Mono"),
      import("@lobehub/icons/es/HuggingFace/style"),
    ]).then(([mono, style]) => ({ mono, style })),
  replicate: () =>
    Promise.all([
      import("@lobehub/icons/es/Replicate/components/Mono"),
      import("@lobehub/icons/es/Replicate/style"),
    ]).then(([mono, style]) => ({ mono, style })),
};

const _cache: Record<string, AvatarCtor | null> = {};
const _pending: Record<string, Promise<AvatarCtor | null>> = {};

async function get(key: string): Promise<AvatarCtor | null> {
  if (key in _cache) return _cache[key] ?? null;
  if (key in _pending) return _pending[key];
  const factory = MAP[key];
  if (!factory) return null;
  _pending[key] = factory()
    .then(({ avatar, mono, style }) => {
      const builtInAvatar = avatar?.default;
      if (builtInAvatar) {
        _cache[key] = builtInAvatar;
        return builtInAvatar;
      }

      const Mono = mono?.default;
      const comp = Mono && style ? createAvatarComponent(Mono, style) : null;
      _cache[key] = comp;
      return comp;
    })
    .catch(() => {
      _cache[key] = null;
      return null;
    })
    .finally(() => {
      delete _pending[key];
    });
  return _pending[key];
}

/**
 * Returns a lobehub Avatar React component for the model/provider, or null.
 * Caller should fall back to default bot icon when null is returned.
 */
export async function getModelAvatarComponent(
  provider?: string,
  model?: string,
  cliProvider?: string
): Promise<AvatarCtor | null> {
  const m = (model || "").toLowerCase();
  const p = (provider || "").toLowerCase();
  const cliProviderKey = (cliProvider || "").toLowerCase();

  if (cliProviderKey === "gemini") return get("gemini");
  if (cliProviderKey === "copilot") return get("copilot");
  if (cliProviderKey === "codex") return get("openai");
  if (cliProviderKey === "claude") return get("claude");
  if (cliProviderKey === "agy") return get("gemini");
  if (cliProviderKey === "qoder") return get("openai");
  if (cliProviderKey === "opencode") return get("openai");
  if (cliProviderKey === "grok") return get("grok");

  if (m.includes("claude")) return get("claude");
  if (m.includes("gpt") || /\bo\d[-/]/.test(m)) return get("openai");
  if (m.includes("gemini") || m.includes("gemma")) return get("gemini");
  if (m.includes("deepseek")) return get("deepseek");
  if (m.includes("qwen")) return get("qwen");
  if (m.includes("grok")) return get("grok");
  if (m.includes("mistral") || m.includes("mixtral")) return get("mistral");
  if (m.includes("llama") || m.includes("meta/")) return get("llama");
  if (m.includes("kimi")) return get("kimi");
  if (m.includes("moonshot")) return get("moonshot");
  if (m.includes("minimax") || m.includes("abab")) return get("minimax");
  if (m.includes("glm") || m.includes("chatglm")) return get("glm");
  if (m.includes("doubao")) return get("doubao");
  if (m.includes("hunyuan")) return get("hunyuan");
  if (m.includes("ernie") || m.includes("wenxin")) return get("wenxin");
  if (m.includes("baichuan")) return get("baichuan");
  if (m.includes("yi-") || /^yi\d/.test(m)) return get("yi");
  if (m.includes("internlm")) return get("internlm");
  if (m.includes("spark")) return get("spark");
  if (m.includes("step-") || m.startsWith("step")) return get("stepfun");
  if (m.includes("sensenova") || m.includes("nova-")) return get("sensenova");
  if (m.includes("tiangong")) return get("tiangong");
  if (m.includes("skywork")) return get("skywork");
  if (m.includes("perplexity")) return get("perplexity");
  if (m.includes("command")) return get("cohere");

  // ── 按 provider 匹配 ──────────────────────────────
  // Never surface third-party host branding for ollama-cloud models.
  if (p === "nolo" || p === "ollama-cloud" || p === "ollamacloud") {
    return null;
  }
  const providerKey = p.replace(/[-_\s]/g, "").toLowerCase();
  return (await get(providerKey)) ?? (await get(p)) ?? null;
}
