// packages/agent-runtime/devinOAuthPure.ts

/**
 * 纯字符串判定函数，不依赖 Node.js 模块（fs/os/path/crypto），
 * 可安全被 Web Bundle / 浏览器端代码引用。
 */
export function isDevinOAuthAgent(agent: {
  apiKeyRef?: string | null;
  provider?: string | null;
}): boolean {
  const ref = agent.apiKeyRef?.trim().toLowerCase();
  const prov = agent.provider?.trim().toLowerCase();
  return ref === "devin" || prov === "devin";
}
