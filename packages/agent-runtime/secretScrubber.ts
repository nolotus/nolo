/**
 * 敏感信息与高危凭证脱敏清洗器（Secret Scrubber & Redactor）。
 *
 * 核心目标：
 * 阻断 API Key、私钥、密码和 Bearer Token 通过网络响应、本地文件或工具输出
 * 泄露到 Agent 上下文（Context）、Prompt 或持久化历史中。
 *
 * 设计纪律：
 * - 纯函数、无状态、微秒级执行，不引入额外依赖。
 * - 幂等性：对已脱敏文本二次清洗结果不变。
 * - 安全降级：非字符串/非可辨识对象安全原样透传。
 */

export type SecretPattern = {
  kind: string;
  placeholder: string;
  regex: RegExp;
};

export const SECRET_PATTERNS: SecretPattern[] = [
  // 1. PEM 私钥块（高危硬拦截）
  {
    kind: "PRIVATE_KEY",
    placeholder: "[REDACTED:PRIVATE_KEY]",
    regex: /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----[\s\S]+?-----END (?:[A-Z0-9 ]+)?PRIVATE KEY-----/g,
  },
  // 2. Anthropic API Key (sk-ant-...)
  {
    kind: "ANTHROPIC_KEY",
    placeholder: "[REDACTED:ANTHROPIC_KEY]",
    regex: /\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g,
  },
  // 3. OpenAI / DeepSeek / 通用 API Key (sk-...)
  {
    kind: "API_KEY",
    placeholder: "[REDACTED:API_KEY]",
    regex: /\bsk-[a-zA-Z0-9_\-]{24,}\b/g,
  },
  // 4. GitHub 访问令牌 (ghp_..., gho_..., github_pat_...)
  {
    kind: "GITHUB_TOKEN",
    placeholder: "[REDACTED:GITHUB_TOKEN]",
    regex: /\b(?:gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,})\b/g,
  },
  // 5. Bearer Token (JWT / Authorization Bearer)
  {
    kind: "BEARER_TOKEN",
    placeholder: "Bearer [REDACTED:BEARER_TOKEN]",
    regex: /\bBearer\s+[a-zA-Z0-9_\-\.]{25,}\b/gi,
  },
  // 6. 常见环境变量或配置中的密码赋值 (PASSWORD=..., PASSWD=...)
  {
    kind: "PASSWORD",
    placeholder: "$1=[REDACTED:PASSWORD]",
    regex: /\b((?:DB_|DATABASE_|ADMIN_|ROOT_|MYSQL_|POSTGRES_)?(?:PASSWORD|PASSWD|SECRET_KEY))\s*=\s*['"]?([^\s'"]{4,})['"]?/gi,
  },
];

// 快速预检关键词，绝大部分普通文本不含这些子串，快速跳过完整正则流水线
const QUICK_PROBE_SUBSTRINGS = [
  "sk-",
  "ghp_",
  "gho_",
  "ghu_",
  "ghs_",
  "ghr_",
  "github_pat_",
  "PRIVATE KEY",
  "Bearer ",
  "bearer ",
  "PASSWORD",
  "password",
  "PASSWD",
  "SECRET_KEY",
];

/**
 * 快速判断文本是否可能包含敏感信息。
 */
export function hasPotentialSecrets(text: string): boolean {
  if (typeof text !== "string" || text.length === 0) return false;
  return QUICK_PROBE_SUBSTRINGS.some((probe) => text.includes(probe));
}

/**
 * 清洗单段文本中的所有已知敏感凭证。
 */
export function scrubSecrets(text: string): {
  cleaned: string;
  redactedCount: number;
  matchedKinds: string[];
} {
  if (typeof text !== "string" || text.length === 0) {
    return { cleaned: text, redactedCount: 0, matchedKinds: [] };
  }

  if (!hasPotentialSecrets(text)) {
    return { cleaned: text, redactedCount: 0, matchedKinds: [] };
  }

  let cleaned = text;
  let redactedCount = 0;
  const matchedKinds: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    // 重置 lastIndex（带有 g 标志的正则）
    pattern.regex.lastIndex = 0;
    const matches = cleaned.match(pattern.regex);
    if (matches && matches.length > 0) {
      redactedCount += matches.length;
      if (!matchedKinds.includes(pattern.kind)) {
        matchedKinds.push(pattern.kind);
      }
      cleaned = cleaned.replace(pattern.regex, pattern.placeholder);
    }
  }

  return { cleaned, redactedCount, matchedKinds };
}

/**
 * 递归清洗任意结构（如 Tool Metadata、JSON 字典、嵌套列表）中的敏感信息。
 */
export function scrubObjectSecrets<T>(val: T): T {
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    return scrubSecrets(val).cleaned as unknown as T;
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubObjectSecrets(item)) as unknown as T;
  }

  if (typeof val === "object") {
    // 不清洗 Blob、Buffer、Date 等特殊实例
    if (val instanceof Date || val instanceof RegExp) return val;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      result[k] = scrubObjectSecrets(v);
    }
    return result as unknown as T;
  }

  return val;
}
