/**
 * 高风险凭据形态的保守打码。
 *
 * 背景（2026-09-01）：run/tool 失败详情改为 normal 模式直接上屏（owner 定调
 * 「失败要知道具体的，不要一吞了之」），但 provider/CLI 的错误文本经常内嵌
 * API key（401 回显、--token 参数、Authorization 头）。错误行上屏前过一遍
 * 这里，只打码高置信形态，其余错误内容（类型、路径、errno、行号）原样保留，
 * 保证「知道具体的」与「密钥不上屏」同时成立。
 *
 * 保守取舍：只匹配可自然语言描述的凭据形态（sk-/pk- 系 key、Bearer 值、
 * token/key/secret/password 键值对、CLI flag 值）。高熵裸字符串不做启发式
 * 打码——误伤会把错误原因打得不可读，违背本次改动的初衷。
 */
const REDACTED = "⟨redacted⟩";

export function redactSecrets(text: string): string {
  return (
    text
      // sk- / pk- 前缀 key（OpenAI / Anthropic / Stripe 等主流 provider 形态）
      .replace(/\b(?:sk|pk)-[A-Za-z0-9_-]{10,}/g, REDACTED)
      // Authorization: Bearer <token>（保留 Bearer，值打码）
      .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, `$1${REDACTED}`)
      // token=… / api_key: … / password: … 键值对（键保留可读，值打码）
      .replace(
        /\b((?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|token|secret|password|passwd|credential)s?\s*[=:]\s*["']?)[^\s"',;]{8,}/gi,
        `$1${REDACTED}`,
      )
      // CLI flag 形态：--api-token <value> / --password <value>
      .replace(
        /\b((?:--[a-z-]*(?:token|key|secret|password|credential)[a-z-]*)\s+)[^\s"']{8,}/gi,
        `$1${REDACTED}`,
      )
  );
}
