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

/**
 * Ollama Cloud 订阅凭据的**出站白名单**。
 *
 * 与 `isOllamaEndpoint` 的安全语义不同：那个函数是**兼容性识别**（任意主机的
 * 11434 端口、没有协议的裸主机名、明文 http 都算「像 Ollama」），用它当凭据门
 * 会把订阅 key 送给 `https://third-party.example:11434/v1` 这类第三方主机，或者
 * 经 `http://ollama.com/v1` 明文发出。凭据只发给官方域名 + 显式 https。
 */
export function isOllamaCredentialTarget(endpoint?: string | null): boolean {
  if (!endpoint || typeof endpoint !== "string") return false;
  const trimmed = endpoint.trim();
  if (!trimmed) return false;
  let url: URL;
  try {
    // 不接受裸主机名：凭据出站必须由记录显式声明 https 协议。
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return host === "ollama.com" || host.endsWith(".ollama.com");
}
