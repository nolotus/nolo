export const DEFAULT_CLAUDE_CODE_VERSION = "2.1.294";

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

let adoptedClaudeCodeVersion: string | null = null;

function parseSemver(v: string): { major: number; minor: number; patch: number; prerelease?: string } | null {
  const match = v.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

/**
 * 比较两个 semver 字符串。
 * 返回 >0 (a > b), <0 (a < b), 或 0 (a === b)。
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    return a.localeCompare(b);
  }
  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch;

  // 没有 prerelease 的版本大于有 prerelease 的版本 (例如 2.1.0 > 2.1.0-alpha)
  if (!parsedA.prerelease && parsedB.prerelease) return 1;
  if (parsedA.prerelease && !parsedB.prerelease) return -1;
  if (!parsedA.prerelease && !parsedB.prerelease) return 0;

  // 两者都有 prerelease，按 '.' 拆分比较
  const partsA = parsedA.prerelease!.split(".");
  const partsB = parsedB.prerelease!.split(".");
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const pA = partsA[i];
    const pB = partsB[i];
    if (pA === undefined) return -1;
    if (pB === undefined) return 1;
    if (pA === pB) continue;
    const numA = Number(pA);
    const numB = Number(pB);
    const aIsNum = Number.isInteger(numA) && String(numA) === pA;
    const bIsNum = Number.isInteger(numB) && String(numB) === pB;
    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    return pA.localeCompare(pB);
  }
  return 0;
}

function getEnvPinnedVersion(rawEnv?: string): string | undefined {
  const envVal = rawEnv !== undefined
    ? rawEnv
    : (process.env.NOLO_CLAUDE_CODE_VERSION ?? process.env.CLAUDE_CODE_VERSION);
  if (envVal === undefined) return undefined;
  const trimmed = envVal.trim();
  if (!trimmed) return undefined;
  // 非法值的处理必须与 adoptRequiredClaudeCodeVersion 的「是否已 pin」判定一致：
  // 这里返回 undefined（= 没有生效的 pin，继续走 adopted → 默认），而不是返回
  // DEFAULT 冒充 pin——否则 resolve 用默认值、adopt 却以为用户已 pin，版本自愈
  // 会被一个拼错的环境变量永久关掉。
  return SEMVER_REGEX.test(trimmed) ? trimmed : undefined;
}

/**
 * 是否有一个**生效的** env pin（非法值不算）。adopt 用它判断能不能自愈，
 * 与 {@link resolveClaudeCodeVersion} 共用同一条判定，避免两处对「非法 env」
 * 的理解分叉。
 */
export function isClaudeCodeVersionEnvPinned(): boolean {
  return getEnvPinnedVersion() !== undefined;
}

/**
 * 解析当前生效的 Claude Code 版本：
 * NOLO_CLAUDE_CODE_VERSION ?? CLAUDE_CODE_VERSION env → 进程内 adopted 版本 → DEFAULT。
 * env 值必须匹配 ^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$，不匹配回落默认。
 */
export function resolveClaudeCodeVersion(rawEnv?: string): string {
  const envPinned = getEnvPinnedVersion(rawEnv);
  if (envPinned !== undefined) {
    return envPinned;
  }
  return adoptedClaudeCodeVersion ?? DEFAULT_CLAUDE_CODE_VERSION;
}

/**
 * 当前生效的 Claude Code 版本（env pin → 进程内 adopted → 默认）。
 * 与 {@link resolveClaudeCodeVersion} 同一取值链，单独导出这个名字是为了让调用点
 * 读起来是「取当前版本」而不是「解析某个入参」。
 */
export function getClaudeCodeVersion(): string {
  return resolveClaudeCodeVersion();
}

/**
 * 返回当前 Claude Code User-Agent 字符串：
 * claude-cli/<version> (external, local-agent, agent-sdk/0.1.0)
 */
export function getClaudeCodeUserAgent(): string {
  const version = resolveClaudeCodeVersion();
  return `claude-cli/${version} (external, local-agent, agent-sdk/0.1.0)`;
}

function extractErrorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error) return "";
  if (error instanceof Error) {
    let s = `${error.name}: ${error.message}`;
    const extra = error as unknown as Record<string, unknown>;
    if (typeof extra.body === "string") s += " " + extra.body;
    else if (extra.body && typeof extra.body === "object") {
      try { s += " " + JSON.stringify(extra.body); } catch {}
    }
    return s;
  }
  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/**
 * 从错误信息中提取所需 Claude Code 最小版本并在其高于当前版本时写入进程内 adopted 版本。
 * - 从错误消息匹配 /version (\d+\.\d+\.\d+) or newer is required/i（亦兼容 payload 中的 claude_code_version_too_old）；
 * - 比较 semver，只在 required 严格大于当前版本时更新并返回 true；
 * - env 显式 pin 时恒返回 false。
 */
export function adoptRequiredClaudeCodeVersion(error: unknown): boolean {
  if (isClaudeCodeVersionEnvPinned()) {
    return false;
  }

  const text = extractErrorText(error);
  if (!text) return false;

  let requiredVersion: string | null = null;
  // 1) 结构化字段最可靠（若上游给了）。
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    const nested = errObj.error && typeof errObj.error === "object"
      ? (errObj.error as Record<string, unknown>)
      : errObj;
    // `version` 是旧代码就接受的形态，保留但它歧义更大（可能是当前版本），
    // 只在报文里出现 claude_code_version_too_old 错误码时才采纳。
    const hasTooOldCode = /claude_code_version_too_old/i.test(text);
    const direct =
      nested.required_version ??
      nested.requiredVersion ??
      nested.minimum_version ??
      nested.minVersion ??
      (hasTooOldCode ? nested.version : undefined);
    if (typeof direct === "string" && SEMVER_REGEX.test(direct.trim())) {
      requiredVersion = direct.trim();
    }
  }
  // 2) 真实报文形如
  //    "Claude Code 2.1.220 does not support this model; version 2.1.280 or newer is required."
  //    这类文案里没有稳定的错误码，靠的是短语锚定，不是裸 semver。
  if (!requiredVersion) {
    const phrase =
      text.match(/version\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s+or\s+(?:newer|above|higher)\s+is\s+required/i) ??
      text.match(/(?:minimum|required)\s+version\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/i);
    if (phrase) requiredVersion = phrase[1];
  }
  // 故意不保留「抓文案里第一个 semver」的兜底：那条路会把报文里提到的当前版本
  // （如 "your client 2.1.294 is too old; minimum 2.1.300"）当成目标版本，等于
  // 不 adopt 却返回 true。宁可这次不 adopt，也不按错版本重试。

  if (!requiredVersion) return false;

  const currentVersion = resolveClaudeCodeVersion();
  if (compareSemver(requiredVersion, currentVersion) > 0) {
    adoptedClaudeCodeVersion = requiredVersion;
    return true;
  }

  return false;
}

/**
 * 重置进程内 adopted 版本（仅供单测隔离使用）。
 */
export function resetAdoptedClaudeCodeVersionForTesting(): void {
  adoptedClaudeCodeVersion = null;
}
