/**
 * Ollama 端点判定。
 *
 * 识别本地 Ollama（默认端口 11434）以及官方/私有 Ollama 域名（ollama.com / ollama.ai 及其子域），
 * 避免对路径中包含 "ollama" 的非 Ollama 兼容网关发生误判。
 */
export function isOllamaEndpoint(endpoint?: string | null): boolean {
  if (!endpoint || typeof endpoint !== "string") return false;
  try {
    const url = new URL(endpoint.includes("://") ? endpoint : `http://${endpoint}`);
    if (url.port === "11434") return true;
    const host = url.hostname.toLowerCase();
    return (
      host === "ollama.com" ||
      host.endsWith(".ollama.com") ||
      host === "ollama.ai" ||
      host.endsWith(".ollama.ai")
    );
  } catch {
    return false;
  }
}
