// packages/core/clientVersionGate.ts
//
// 客户端版本闸门的共享底座（纯函数，无任何 IO / 依赖）。
//
// 为什么住在 core：server（拒绝路径）、agent-runtime（本地 self-check）、
// cli（注入版本头）三侧都要用同一份比较语义。任何一侧自己写一个"差不多"的
// 比较器，都会在 `-alpha.N` 预发布号上产生方向相反的判断（0.38.0-alpha.4
// 与 0.38.0 的先后关系是 semver 里最容易写错的一格），最终表现为「该拦的
// 放行了」或「不该拦的拦了」。
//
// 仓库没有 semver 依赖（grep 全仓 package.json 无命中），所以这里实现一个
// 严守 semver 2.0.0 precedence 规则的最小比较器，并配单测钉住边界。

/** 客户端在请求里声明自身版本用的头名（全小写，HTTP 头大小写不敏感）。 */
export const NOLO_CLIENT_VERSION_HEADER = "x-nolo-client-version";

/** 版本过低被拒绝时的结构化错误 code（三层贯通用，参照 PLATFORM_LLM_BUSY）。 */
export const CLIENT_VERSION_TOO_OLD_CODE = "CLIENT_VERSION_TOO_OLD";

export type ParsedSemver = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** 预发布标识符序列；空数组表示正式版（precedence 高于任何预发布）。 */
  readonly prerelease: ReadonlyArray<string | number>;
};

const NUMERIC_ONLY = /^[0-9]+$/;

/**
 * 解析 semver 字符串。宽容点：允许前导 `v`、允许两段式（`0.38` → 0.38.0）、
 * 忽略 build metadata（`+sha`，semver 规定不参与 precedence）。
 * 解析不出来返回 null —— 调用方一律 fail-open，不要猜。
 */
export function parseSemver(raw?: string | null): ParsedSemver | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;
  if (text.startsWith("v") || text.startsWith("V")) text = text.slice(1);
  // build metadata 不参与 precedence，直接丢
  const plusAt = text.indexOf("+");
  if (plusAt >= 0) text = text.slice(0, plusAt);
  const dashAt = text.indexOf("-");
  const core = dashAt >= 0 ? text.slice(0, dashAt) : text;
  const preRaw = dashAt >= 0 ? text.slice(dashAt + 1) : "";

  const parts = core.split(".");
  if (parts.length < 1 || parts.length > 3) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!NUMERIC_ONLY.test(part)) return null;
    const value = Number(part);
    if (!Number.isSafeInteger(value)) return null;
    nums.push(value);
  }
  const [major, minor = 0, patch = 0] = nums;

  if (dashAt >= 0 && !preRaw) return null; // 尾随裸 `-` 不是合法版本
  const prerelease: Array<string | number> = [];
  if (preRaw) {
    for (const id of preRaw.split(".")) {
      if (!id) return null; // 空标识符（`1.0.0-alpha..1`）非法
      if (NUMERIC_ONLY.test(id)) {
        const value = Number(id);
        if (!Number.isSafeInteger(value)) return null;
        prerelease.push(value);
      } else {
        prerelease.push(id);
      }
    }
  }
  return { major, minor, patch, prerelease };
}

const comparePrerelease = (
  a: ReadonlyArray<string | number>,
  b: ReadonlyArray<string | number>,
): number => {
  // semver 11.3: 有预发布号的版本 precedence 低于 core 相同的正式版。
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const left = a[i];
    const right = b[i];
    const leftNumeric = typeof left === "number";
    const rightNumeric = typeof right === "number";
    if (leftNumeric && rightNumeric) {
      if (left !== right) return (left as number) < (right as number) ? -1 : 1;
      continue;
    }
    // 数字标识符 precedence 低于字母/连字符标识符
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    const l = String(left);
    const r = String(right);
    if (l !== r) return l < r ? -1 : 1;
  }
  // 前缀全等时，标识符更少的一方 precedence 更低
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
};

/**
 * 比较两个已解析版本：a < b → -1，a === b → 0，a > b → 1。
 */
export function compareParsedSemver(a: ParsedSemver, b: ParsedSemver): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return comparePrerelease(a.prerelease, b.prerelease);
}

/**
 * 比较两个版本字符串。任一侧解析失败返回 null（调用方 fail-open）。
 */
export function compareSemver(
  a?: string | null,
  b?: string | null,
): number | null {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (!left || !right) return null;
  return compareParsedSemver(left, right);
}

/**
 * 客户端版本是否低于要求的最低版本。
 *
 * fail-open 契约（宿主已认可的取舍）：
 * - clientVersion 缺失（旧客户端不发版本头）→ false（放行）
 * - 任一侧解析失败 → false（放行）
 * 拦不住不发版本头的旧客户端是已知局限；它们受保护的方式是目录层标注 +
 * 升级后客户端自带的 self-check。在这里 fail-closed 会误伤 web / server
 * 内部调用（它们同样不带版本头）。
 */
export function isClientVersionBelow(
  clientVersion: string | null | undefined,
  minClientVersion: string | null | undefined,
): boolean {
  if (!minClientVersion) return false;
  const cmp = compareSemver(clientVersion, minClientVersion);
  if (cmp === null) return false;
  return cmp < 0;
}

/** 从任意 headers 容器里取版本头（Request.headers / Headers / 普通对象都行）。 */
export function readClientVersionHeader(
  headers:
    | { get(name: string): string | null | undefined }
    | Record<string, string | undefined>
    | null
    | undefined,
): string | undefined {
  if (!headers) return undefined;
  const raw =
    typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get(name: string): string | null | undefined }).get(
          NOLO_CLIENT_VERSION_HEADER,
        )
      : (headers as Record<string, string | undefined>)[
          NOLO_CLIENT_VERSION_HEADER
        ] ??
        (headers as Record<string, string | undefined>)[
          "X-Nolo-Client-Version"
        ];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  // 头过长直接当没带（防日志污染 / 防构造超长字符串打比较器）
  if (!trimmed || trimmed.length > 64) return undefined;
  return trimmed;
}

/**
 * 版本过低时给用户看的文案。必须点名「需要哪个版本」和「怎么升」，
 * 否则用户只会看到又一条无从下手的报错。
 */
export function buildClientVersionUpgradeMessage(args: {
  model: string;
  minClientVersion: string;
  clientVersion?: string | null;
}): string {
  const current = args.clientVersion?.trim();
  const currentText = current ? `当前 ${current}` : "当前版本过旧";
  return (
    `模型「${args.model}」需要 nolo-cli ≥ ${args.minClientVersion}（${currentText}）。` +
    `请升级客户端（npx nolo-cli@latest，或桌面端应用内更新）后重试；` +
    `也可以先换用其他模型。`
  );
}
