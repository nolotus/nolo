// packages/agent-runtime/codexOAuthModelAliases.ts
//
// ChatGPT OAuth (Codex Responses) 通道旧代模型 → 同家族最新模型重定向单一真值表。
//
// 语义：存量 agent 记录里的旧代模型 id 在通过 Codex OAuth 通道发往
// https://chatgpt.com/backend-api/codex/responses 时，透明重定向到同家族最新版本。
// 映射是严格在家族内进行的，禁止跨家族折叠（如禁止把 luna 映射到 terra，禁止把 astra 映射到 sol）。
//
// 作用域：仅在 Codex OAuth Responses 通道生效（fetchCodexResponsesCompletion / buildCodexRequestBody）。
// 以及 Codex CLI 本机通道（codex exec）。

import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export type CodexOAuthModelAlias = {
  /** 实际执行使用的 Codex OAuth 模型 id。 */
  readonly aliasOf: string;
  readonly since: string;
  readonly reason: string;
};

export const CODEX_OAUTH_MODEL_ALIASES: Readonly<
  Record<string, CodexOAuthModelAlias>
> = {
  // sol 家族最新：gpt-6.1-sol
  "gpt-6-sol": {
    aliasOf: "gpt-6.1-sol",
    since: "2026-11-01",
    reason:
      "同家族换代，owner 决定透明重定向（sol 家族最新为 gpt-6.1-sol）。",
  },
  "gpt-5.6-sol": {
    aliasOf: "gpt-6.1-sol",
    since: "2026-11-01",
    reason:
      "同家族换代，owner 决定透明重定向（sol 家族最新为 gpt-6.1-sol）。",
  },
  // terra 家族最新：gpt-6.1-terra
  "gpt-5.6-terra": {
    aliasOf: "gpt-6.1-terra",
    since: "2026-11-01",
    reason:
      "同家族换代，owner 决定透明重定向（terra 家族最新为 gpt-6.1-terra）。",
  },
  // luna 家族最新：gpt-6-luna（上游无 6.1-luna，luna 家族最新即为 gpt-6-luna）
  "gpt-5.6-luna": {
    aliasOf: "gpt-6-luna",
    since: "2026-11-01",
    reason:
      "同家族换代，owner 决定透明重定向（luna 家族最新为 gpt-6-luna）。",
  },
};

/** 查询 OAuth 通道别名声明（无别名 / 未知 id 返回 undefined）。 */
export function resolveCodexOAuthModelAlias(
  model?: string | null,
): CodexOAuthModelAlias | undefined {
  const normalized = asTrimmedLowercaseString(model);
  if (!normalized) return undefined;
  return CODEX_OAUTH_MODEL_ALIASES[normalized];
}

/** 实际执行使用的模型 id（命中别名返回映射后 id；未命中返回原 id；空值返回 undefined）。 */
export function resolveCodexOAuthEffectiveModel(
  model?: string | null,
): string | undefined {
  const raw = asOptionalTrimmedString(model);
  if (!raw) return undefined;
  const normalized = raw.toLowerCase();
  return CODEX_OAUTH_MODEL_ALIASES[normalized]?.aliasOf ?? raw;
}
