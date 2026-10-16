export type SecretFinding = {
  label: string;
  line: number;
  /**
   * 脱敏定位串（`<redacted:规则[ len=长度]>`）。
   *
   * **绝不含明文候选值**：这条预览会进 pre-commit 失败日志、docCreate 报错与
   * 记忆写入报错，回显明文等于给扫描器又开一条泄露面（终端回滚、CI 日志、
   * 把报错粘给别人求助）。只留规则名与候选长度：够定位，不够泄密。
   */
  preview: string;
  /** 该行被同行受限标记放行时为 true（只有 `allowInlineWaiver` 调用会产出）。 */
  waived?: boolean;
  /** 放行理由（`waived` 为 true 时存在，已去空白）。 */
  waiverReason?: string;
};

export type SecretScanOptions = {
  /** 被扫内容的仓库相对路径。只在 `allowInlineWaiver` 为 true 时参与判定。 */
  filePath?: string;
  /**
   * 是否接受同行「受限豁免标记」。**默认 false**。
   *
   * docCreate / docUpdate / askTextSanitize 等调用方不传它 ⇒ 不认注释豁免，
   * 行为与引入本选项之前逐字相同（文档里写示例、粘贴配置常带 `token: "…"`，
   * 让那里的调用方能靠注释自证清白，等于把护栏拆掉）。
   */
  allowInlineWaiver?: boolean;
};

/**
 * 受限豁免标记的常量引用。代码、失败提示、测试都从这里取，避免提示文案与
 * 实现漂移成两套说法。
 */
export const INLINE_WAIVER_MARKER = "secret-scan:allow";

/** 理由去空白后的最短长度：`ok` / `allow` 这类无信息量的理由不算理由。 */
const INLINE_WAIVER_MIN_REASON_CHARS = 3;

/**
 * 赋值形态的密钥扫描。
 *
 * 两类错判都真实吃过亏，判据必须同时对它们留空间：
 *
 * - **误报**：`token: runtime?.currentToken`、`apiKey: process.env.OPENAI_API_KEY`
 *   是**代码表达式**，不是密钥。这条误报会拦住无关的提交（pre-commit 扫的是
 *   整个暂存文件），也会让 docCreate / 记忆写入拒绝包含示例代码的正常内容。
 * - **漏报**：真实密钥粘进文档、记忆或暂存区时**通常没有引号**（sk-…、hex、
 *   base64、订阅配置里的 psk=…）。
 *
 * 所以不能只拿长度当判据：引号本身已经是足够信号；不带引号时还要排除
 * 「表达式 / 常量名 / 驼峰标识符」这三种**名字**形态，见 looksLikeBareSecret。
 */
const ASSIGNMENT_KEYS: Array<{ label: string; keys: string; min: number }> = [
  { label: "password", keys: "password|passwd", min: 8 },
  { label: "psk", keys: "psk", min: 8 },
  { label: "api key", keys: "api[_-]?key|apikey", min: 12 },
  { label: "token", keys: "token|secret", min: 12 },
];

type AssignmentPattern = {
  label: string;
  /** 带引号的字面量：引号成对是必要条件，值里允许空格/逗号。 */
  quoted: RegExp;
  /** 不带引号的候选：只吃一个「词」，再交给 looksLikeBareSecret 判断是不是值。 */
  bare: RegExp;
};

const ASSIGNMENT_PATTERNS: AssignmentPattern[] = ASSIGNMENT_KEYS.map(
  ({ label, keys, min }) => ({
    label,
    // 反向引用 \1 让引号成对成为必要条件：半截引号不算。值里允许空格与逗号——
    // 写成带空格的口令是常见形态，旧的字符类会把这种值截成半截从而整条漏掉。
    quoted: new RegExp(
      `\\b(?:${keys})\\s*[:=]\\s*(["'])([^"']{${min},})\\1`,
      "i",
    ),
    // 不带引号时只取到分隔符为止，是否算密钥交给 looksLikeBareSecret 判。
    bare: new RegExp(
      `\\b(?:${keys})\\s*[:=]\\s*([^\\s"',#]{${min},})`,
      "i",
    ),
  }),
);

const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;

/** 表达式字符：可选链、调用、模板插值、shell 变量与命令替换。 */
const EXPRESSION_CHARS = /[?(){};|&<>$]/;
/** `OPENAI_API_KEY`——带下划线的常量名是名字，不是值。 */
const CONSTANT_CASE = /^[A-Z][A-Z0-9_]*$/;
/** `currentToken`——驼峰标识符同样是名字。整串校验，避免只看开头。 */
const CAMEL_CASE = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)+$/;
/** 点分路径的单段：合法标识符。 */
const PROPERTY_SEGMENT = /^[A-Za-z_$][\w$]*$/;

/**
 * 「名字」判据里的两个长度阈值。
 *
 * 它们处理的是**两件事**，别合并：
 * - `NAME_FORM_MAX_CHARS`：整串超过它之后，形状判据不再可信——点分 JWT 长得像
 *   属性路径、长 base64 长得像 camelCase，都要按「值」处理；
 * - `PROPERTY_SEGMENT_MAX_CHARS`：点分路径里单段的长度上限。`process.env.X` 的段
 *   都很短，而 JWT 的段（20–40 字符、大小写混杂）远超它——这是把两者分开的关键。
 */
const NAME_FORM_MAX_CHARS = 48;
const PROPERTY_SEGMENT_MAX_CHARS = 24;

/**
 * 点分路径（`runtime.currentToken`、`process.env.NEXT_PUBLIC_…_KEY`）。
 *
 * 只要所有分段都是标识符，且每段要么短、要么是 env 风格常量名。**不受整串长度
 * 上限约束**：49 字符的 env 读取依然是个名字，不该因为长就当成密钥。
 */
function looksLikeDottedName(value: string): boolean {
  const segments = value.split(".");
  if (segments.length < 2) return false;
  return segments.every(
    (segment) =>
      PROPERTY_SEGMENT.test(segment) &&
      (segment.length <= PROPERTY_SEGMENT_MAX_CHARS ||
        (CONSTANT_CASE.test(segment) && segment.includes("_"))),
  );
}

/**
 * markdown 行内代码的收尾反引号不是值的一部分。
 *
 * 文档里内联引用示例代码时，结尾的那个反引号会被并进候选值，于是「反引号里的长
 * 属性链」认不出自己是名字（示例代码被误报）。去掉尾巴再判：示例恢复豁免，而
 * 代码块里真正的裸密钥仍会被抓到——反引号只影响结尾，不改变值本身的形状。
 */
function stripTrailingMarkdownFence(value: string): string {
  return value.replace(/`+$/, "");
}

/**
 * 不带引号的右侧是否真的像密钥，而不是一个名字。
 *
 * 逐条判据都有具体反例支撑，宁可放过一个可疑的**名字**，也不要把
 * 「引用了某变量」当成泄漏：误报会拦住与密钥无关的正常提交与文档。
 *
 * 已知边界（存量，非本轮引入）：带引号且值里含撇号的口令（`password: "it's …"`）
 * 会止于撇号，quoted 分支因此判不出来。
 */
function looksLikeBareSecret(rawValue: string): boolean {
  const value = stripTrailingMarkdownFence(rawValue);

  // 名字与表达式先判，且**不看长度**：它们无论多长都不是值。
  if (EXPRESSION_CHARS.test(value)) return false;
  if (CONSTANT_CASE.test(value) && value.includes("_")) return false;
  if (looksLikeDottedName(value)) return false;

  if (value.length > NAME_FORM_MAX_CHARS) {
    // 超长之后形状判据不再可信。含数字按值处理（JWT、长 base64 几乎必然含数字），
    // 纯字母的长标识符仍当名字，避免把 54 字符的驼峰名误报成泄漏。
    return /\d/.test(value);
  }

  if (CAMEL_CASE.test(value)) return false;
  return true;
}

/** `<redacted:规则 len=长度>`：不含明文，仍可定位到规则与候选规模。 */
function redactedPreview(label: string, valueLength: number | null): string {
  return valueLength === null
    ? `<redacted:${label}>`
    : `<redacted:${label} len=${valueLength}>`;
}

/** 一行里的候选命中（含明文值，只在本函数与下方判定内存在，绝不进返回值）。 */
type LineCandidate = {
  label: string;
  preview: string;
  /** 命中在行内的结束下标：用来要求豁免标记必须写在候选值**之后**。 */
  endIndex: number;
  isPrivateKey: boolean;
};

/**
 * 收集一行的全部候选命中。顺序必须与历史实现一致（逐 key 组：先引号后裸值，
 * 最后私钥块），否则默认调用方的命中顺序会变。
 */
function collectLineCandidates(line: string): LineCandidate[] {
  const candidates: LineCandidate[] = [];

  for (const { label, quoted, bare } of ASSIGNMENT_PATTERNS) {
    const quotedMatch = quoted.exec(line);
    if (quotedMatch) {
      candidates.push({
        label,
        preview: redactedPreview(label, quotedMatch[2].length),
        endIndex: quotedMatch.index + quotedMatch[0].length,
        isPrivateKey: false,
      });
      continue;
    }
    const bareMatch = bare.exec(line);
    if (bareMatch && looksLikeBareSecret(bareMatch[1])) {
      candidates.push({
        label,
        preview: redactedPreview(
          label,
          stripTrailingMarkdownFence(bareMatch[1]).length,
        ),
        endIndex: bareMatch.index + bareMatch[0].length,
        isPrivateKey: false,
      });
    }
  }

  const privateKeyMatch = PRIVATE_KEY_PATTERN.exec(line);
  if (privateKeyMatch) {
    candidates.push({
      label: "private key",
      preview: redactedPreview("private key", null),
      endIndex: privateKeyMatch.index + privateKeyMatch[0].length,
      isPrivateKey: true,
    });
  }

  return candidates;
}

/* ------------------------------------------------------------------ *
 * 受限豁免：只有 staged 扫描器会打开（allowInlineWaiver）。
 *
 * 设计取舍，逐条都能指出被它挡住的绕过：
 *   · 只认同行行尾单行注释，不认跨行、不认 ignore-next-line —— 「下一行豁免」
 *     等于把豁免与内容解耦，标记可以留在原地，被扫的行随便换。
 *   · 理由去空白后 ≥3 字符 —— 没有理由的豁免等于没有豁免。
 *   · 一行多处候选命中一律拒绝 —— 强制拆行，避免「一行塞十个密钥、末尾盖个章」。
 *   · 私钥块永不豁免 —— 私钥是完整凭据，落到哪都该拦。
 *   · 路径不匹配（生产源码/配置/scripts/）时整行拦截 —— 标记只对测试与夹具
 *     源码有效，生产代码请改成常量引用。
 * ------------------------------------------------------------------ */

/** 标记必须是行尾单行注释：`// secret-scan:allow -- <理由>`（`--` 后至少一个空白）。 */
const INLINE_WAIVER_PATTERN = new RegExp(
  `//\\s*${INLINE_WAIVER_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+--[ \\t]+(.*)$`,
  "g",
);

/**
 * 硬拦扩展名：数据/配置/产物文件。它们要么根本不该带行注释（`.json`/`.yaml`）、
 * 要么是输出而不是源（`.snap`），要么本身就是凭据载体（`.env*`/`.pem`/`.key`）。
 */
const NEVER_WAIVABLE_EXTENSION =
  /\.(?:json|json5|ya?ml|snap|lock|pem|key|crt|cer|txt|csv|md|markdown|example|sample)$/i;

/** `.env` / `.env.local` / `prod.env` 这类环境文件。 */
const NEVER_WAIVABLE_ENV_FILE = /\.env(\.[^/]*)?$/i;

/** 硬拦顶层目录：`scripts/` 是扫描器自己的家，不许自证清白。 */
const NEVER_WAIVABLE_TOP_DIRS = new Set(["scripts"]);

/** 可注释的源码扩展名：`[cm]?[jt]sx?`。 */
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/i;
/** 测试文件名：`*.test.*` / `*.spec.*`。 */
const TEST_FILE_NAME = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
/** 测试/夹具路径段。 */
const TEST_PATH_SEGMENTS = new Set([
  "__tests__",
  "__mocks__",
  "__fixtures__",
  "e2e",
  "test",
  "tests",
  "fixtures",
]);

/**
 * 解开 git 的 C 引号（`"a/\346\265\213.ts"`）。
 *
 * hook 用 `-c core.quotePath=false` 让非 ASCII 路径保持原文，这里是兜底：人工
 * 把 `git diff --cached` 管进扫描器时路径会被转义，解不开就会把测试路径误判成
 * 生产路径（fail-closed，不漏但会误拦）。非 ASCII 是逐字节转义的，所以按字节
 * 累积再交给 TextDecoder，而不是逐字符 fromCharCode（那会得到乱码）。
 */
function decodeGitCQuoting(text: string): string | null {
  if (!text.startsWith('"')) return text;

  const body = text.endsWith('"') ? text.slice(1, -1) : text.slice(1);
  const bytes: number[] = [];

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char !== "\\") {
      bytes.push(char.charCodeAt(0));
      continue;
    }

    const next = body[index + 1] ?? "";
    if (next >= "0" && next <= "7") {
      let octal = "";
      while (octal.length < 3 && /[0-7]/.test(body[index + 1 + octal.length] ?? "")) {
        octal += body[index + 1 + octal.length];
      }
      const byte = Number.parseInt(octal, 8);
      if (!Number.isFinite(byte) || byte > 0xff) return null;
      bytes.push(byte);
      index += octal.length;
      continue;
    }

    index += 1;
    if (next === "n") bytes.push(0x0a);
    else if (next === "t") bytes.push(0x09);
    else if (next === "r") bytes.push(0x0d);
    else bytes.push(next.charCodeAt(0));
  }

  return new TextDecoder().decode(Uint8Array.from(bytes));
}

/**
 * 从 `+++ ` 头取出新路径的仓库相对路径。
 *
 * 两种形态都要认：`+++ b/<path>`，以及非 ASCII/含特殊字符时 git 的引号形态
 * `+++ "b/<path>"`（**引号包住 `b/` 前缀**，所以要先解引号再去前缀）。
 * `+++ /dev/null`（删除）等取不到的情况返回 null。
 */
export function parseDiffNewPath(headerLine: string): string | null {
  if (!headerLine.startsWith("+++ ")) return null;
  const token = headerLine.slice(4);
  // 路径含空白时 git 会补一个行尾制表符/空格终止符。
  const unquoted = decodeGitCQuoting(token.replace(/[\t ]+$/, ""));
  if (unquoted === null) return null;
  return unquoted.startsWith("b/") ? unquoted.slice(2) : null;
}

/**
 * 归一化成仓库相对路径。任何不确定的输入都返回 null（不豁免）：
 * 空、绝对路径、含 `..`、含控制字符。
 */
function normalizeRepoPath(rawPath: string): string | null {
  const unquoted = decodeGitCQuoting(rawPath.replace(/[\t ]+$/, ""));
  if (unquoted === null) return null;

  const normalized = unquoted
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "");
  if (!normalized) return null;
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) return null;
  // 含 `..` 一律拒绝（宁可误拦 `a..b.ts` 这种怪名）。
  if (normalized.includes("..")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(normalized)) return null;

  return normalized;
}

/**
 * 路径是否属于「可豁免的测试/夹具源码」。
 *
 * 判定顺序是 fail-closed 的：先硬拦（scripts/、配置与数据扩展名），要求是能写
 * 行注释的源码扩展名，再看是否落在测试文件名/测试路径段里。因此
 * `__tests__/x.test.ts.snap`、`__fixtures__/data.json` 这类不算测试源码。
 */
function isWaivableTestPath(rawPath: string | undefined): boolean {
  if (!rawPath) return false;
  const path = normalizeRepoPath(rawPath);
  if (path === null) return false;

  const lower = path.toLowerCase();
  const segments = lower.split("/");
  const topDir = segments[0] ?? "";
  if (NEVER_WAIVABLE_TOP_DIRS.has(topDir)) return false;
  if (NEVER_WAIVABLE_EXTENSION.test(lower)) return false;
  if (NEVER_WAIVABLE_ENV_FILE.test(lower)) return false;
  if (!SOURCE_EXTENSION.test(lower)) return false;

  const baseName = segments[segments.length - 1] ?? "";
  if (TEST_FILE_NAME.test(baseName)) return true;
  return segments.some((segment) => TEST_PATH_SEGMENTS.has(segment));
}

/**
 * 逐行解析同行豁免标记，返回理由；不满足任一条件返回 null（照常拦截）。
 */
function resolveInlineWaiver(
  line: string,
  candidates: LineCandidate[],
): string | null {
  // 一行多处候选命中：拒绝豁免，强制拆行。
  if (candidates.length !== 1) return null;

  const candidate = candidates[0];
  // 私钥块永不豁免。
  if (candidate.isPrivateKey) return null;

  let reason: string | null = null;
  let markerIndex = -1;
  INLINE_WAIVER_PATTERN.lastIndex = 0;
  for (
    let match = INLINE_WAIVER_PATTERN.exec(line);
    match !== null;
    match = INLINE_WAIVER_PATTERN.exec(line)
  ) {
    reason = match[1].trim();
    markerIndex = match.index;
  }

  if (markerIndex < 0 || reason === null) return null;
  // 标记必须在候选值之后：行尾注释，不是候选值内部的字符串。
  if (markerIndex <= candidate.endIndex) return null;
  if (reason.length < INLINE_WAIVER_MIN_REASON_CHARS) return null;

  return reason;
}

export function findPotentialSecrets(
  text: string,
  options: SecretScanOptions = {},
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const mayWaive =
    options.allowInlineWaiver === true && isWaivableTestPath(options.filePath);

  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const candidates = collectLineCandidates(line);
    if (candidates.length === 0) return;

    if (mayWaive) {
      const reason = resolveInlineWaiver(line, candidates);
      if (reason !== null) {
        findings.push({
          label: candidates[0].label,
          line: lineNumber,
          preview: candidates[0].preview,
          waived: true,
          waiverReason: reason,
        });
        return;
      }
    }

    for (const candidate of candidates) {
      findings.push({
        label: candidate.label,
        line: lineNumber,
        preview: candidate.preview,
      });
    }
  });

  return findings;
}

export function formatSecretFindings(findings: SecretFinding[]) {
  return findings
    .map((finding) => {
      const waivedTag = finding.waived
        ? ` [waived: ${finding.waiverReason}]`
        : "";
      return `  line ${finding.line} (${finding.label}): ${finding.preview}${waivedTag}`;
    })
    .join("\n");
}
