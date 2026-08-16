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
    | "crof"
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
    case "crof":
      return process.env.CROFAI_API_KEY;
    case "nolo":
    case "ollama-cloud": // legacy agent records
      return process.env.OLLAMA_API_KEY;
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
