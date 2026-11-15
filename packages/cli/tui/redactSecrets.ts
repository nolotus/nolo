/**
 * packages/cli/tui/redactSecrets.ts
 *
 * 兼容 re-export：核心脱敏逻辑已下沉至 packages/core/redactSecrets.ts，
 * 供 CLI/TUI 与 Web 模块共享单一真值实现。
 */
import { findPotentialSecrets } from "../secretScan";

const NORMAL_GIST_SECRET_PATTERNS: RegExp[] = [
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-(?:ant-)?(?:api)?[0-9a-zA-Z-]{10,}/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{10,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
];

export function withholdIfSecretLike(gist: string): string {
  if (!gist) return "";
  if (findPotentialSecrets(gist).length > 0) return "";
  if (NORMAL_GIST_SECRET_PATTERNS.some((pattern) => pattern.test(gist))) return "";
  return gist;
}

export { redactSecrets, REDACTED } from "../../core/redactSecrets";
