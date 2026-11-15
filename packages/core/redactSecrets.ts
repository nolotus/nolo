/**
 * packages/core/redactSecrets.ts
 *
 * 高风险凭据形态的保守打码（CLI/TUI/Web 共享单一真值实现）。
 *
 * 背景：
 * 错误行、工具调用详情（shell command/args/env/headers）等上屏前过一遍
 * 这里，只打码高置信凭据形态，其余内容（路径、errno、行号）原样保留。
 *
 * 保守取舍：只匹配可自然语言描述的凭据形态：
 * 1. sk- / pk- 系 key
 * 2. Authorization: Basic <base64> 与 Authorization: Bearer <token>
 * 3. CLI flags（--token、--api-key、--secret 等）
 * 4. 大写 shell 环境变量赋值（OPENAI_API_KEY=, GITHUB_TOKEN=, MY_SECRET=, TOKEN=, SECRET=, PASSWORD= 等）
 * 5. 通用键值对（HEAD 契约：token=, api_key:, X-Api-Key:, Access_Token: 等，不带跨下划线词缀避免误伤 prompt_tokens/secretary/tokenizer）
 */
export const REDACTED = "⟨redacted⟩";

export function redactSecrets(text: string): string {
  return (
    text
      // sk- / pk- 前缀 key（OpenAI / Anthropic / Stripe 等主流 provider 形态）
      .replace(/\b(?:sk|pk)-[A-Za-z0-9_-]{10,}/g, REDACTED)
      // Authorization: Basic <base64>（保留 Authorization: Basic，值打码）
      .replace(
        /\b(Authorization:\s*Basic\s+)[A-Za-z0-9._~+/=-]{8,}/gi,
        `$1${REDACTED}`,
      )
      // Authorization: Bearer <token>（保留 Bearer，值打码）
      .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, `$1${REDACTED}`)
      // CLI flags start at line/whitespace boundaries, not a word boundary before --.
      // Consume quoted values before key-value redaction can split them at spaces.
      // Truncated quotes end at the current line; never consume later diagnostics.
      .replace(
        /(^|\s)((?:--[a-z0-9-]*(?:token|key|secret|password|credential)[a-z0-9-]*)(?:[^\S\r\n]*=[^\S\r\n]*|[^\S\r\n]+))(?:"(?:\\[^\r\n]|[^"\\\r\n]){8,}(?:"|(?=[\r\n]|$))|'(?:\\[^\r\n]|[^'\\\r\n]){8,}(?:'|(?=[\r\n]|$))|[^\s"']{8,})/gi,
        `$1$2${REDACTED}`,
      )
      // Shell 大写环境变量赋值（OPENAI_API_KEY=, GITHUB_TOKEN=, export MY_SECRET=, AWS_SECRET_ACCESS_KEY=, TOKEN=, SECRET=, PASSWORD=）
      // 注意：无 /i 标志，严格匹配大写，绝不误伤 prompt_tokens、total_tokens、completion_tokens
      .replace(
        /(^|[^\w-])((?:[A-Z0-9]+_)*(?:API[_-]?KEY|APIKEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIALS?|KEY)\s*[=:]\s*)(?:"(?:\\[^\r\n]|[^"\\\r\n]){8,}(?:"|(?=[\r\n]|$))|'(?:\\[^\r\n]|[^'\\\r\n]){8,}(?:'|(?=[\r\n]|$))|[^\s"',;]{8,})/g,
        `$1$2${REDACTED}`,
      )
      // HEAD 兼容键值对（带 /gi 标志，匹配 X-Api-Key:, Access_Token:, token=, password: 等常规键值）
      // 使用精确单词前导边界，不带任意前缀，避免误伤 secretary、tokenizer 等单词
      .replace(
        /\b((?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|token|secret|password|passwd|credential)s?\s*[=:]\s*)(?:"(?:\\[^\r\n]|[^"\\\r\n]){8,}(?:"|(?=[\r\n]|$))|'(?:\\[^\r\n]|[^'\\\r\n]){8,}(?:'|(?=[\r\n]|$))|[^\s"',;]{8,})/gi,
        `$1${REDACTED}`,
      )
  );
}
