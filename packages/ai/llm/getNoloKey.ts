import { availableProviderOptions } from "./providers";

const firstConfiguredKey = (...keys: Array<string | undefined>) =>
  keys.find((key) => key?.trim())?.trim();

export const getNoloKey = (
  provider:
    | (typeof availableProviderOptions)[number]
    | "deepseek"
    | "xai"
    | "deepinfra"
    | "anthropic"
    | "ollama-cloud"
    | "upstream-k3"
    | "runinfra"
    | "baseten",
  env: Record<string, string | undefined> = process.env
) => {
  switch (provider) {
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "google":
      return firstConfiguredKey(
        env.GOOGLE_API_KEY,
        env.GEMINI_API_KEY
      );
    case "deepseek":
      return env.DEEPSEEK_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
    case "fireworks":
      return env.FIREWORKS_API_KEY;
    case "openai":
      return firstConfiguredKey(
        env.OPENAI_KEY,
        env.OPENAI_API_KEY
      );
    case "deepinfra":
      return env.DEEPINFRA_API_KEY;
    case "upstream-k3":
      return env.UPSTREAM_K3_API_KEY;
    case "runinfra":
      return env.RUNINFRA_API_KEY;
    case "baseten":
      return env.BASETEN_API_KEY;
    // provider "nolo" / "ollama-cloud" 没有自己的 key。
    //
    // 兜底返回 OLLAMA_API_KEY，制造过两次 401：拿 ollama 的 key 去打
    // id，兜底就会把请求送到别家门口，报错还长得像「key 失效」。
    //
    // 端点侧早已改成「未识别模型返回 undefined，让上层显式报错」
    // （platformProviderEndpoints.ts），key 侧现在与之对齐：宁可没有 key，
    // 也不要一把打不开正确的门、却能被送出去的钥匙。
    case "cloudflare":
      return process.env.CLOUDFLARE_API_TOKEN;
    case "gmi":
      return process.env.GMI_API_KEY;

    case "xai":
      return process.env.XAI_API_KEY;
    default:
      return null;
  }
};
