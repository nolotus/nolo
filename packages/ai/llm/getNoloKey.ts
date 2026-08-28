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
) => {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "google":
      return firstConfiguredKey(
        process.env.GOOGLE_API_KEY,
        process.env.GEMINI_API_KEY
      );
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "fireworks":
      return process.env.FIREWORKS_API_KEY;
    case "openai":
      return firstConfiguredKey(
        process.env.OPENAI_KEY,
        process.env.OPENAI_API_KEY
      );
    case "deepinfra":
      return process.env.DEEPINFRA_API_KEY;
    case "upstream-k3":
      return process.env.UPSTREAM_K3_API_KEY;
    case "runinfra":
      return process.env.RUNINFRA_API_KEY;
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
