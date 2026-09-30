export type SecretFinding = {
  label: string;
  line: number;
  preview: string;
};

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

function toPreview(line: string): string {
  return line.length > 120 ? `${line.slice(0, 117)}...` : line;
}

export function findPotentialSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const preview = toPreview(line);

    for (const { label, quoted, bare } of ASSIGNMENT_PATTERNS) {
      if (quoted.test(line)) {
        findings.push({ label, line: lineNumber, preview });
        continue;
      }
      const bareMatch = bare.exec(line);
      if (bareMatch && looksLikeBareSecret(bareMatch[1])) {
        findings.push({ label, line: lineNumber, preview });
      }
    }

    if (PRIVATE_KEY_PATTERN.test(line)) {
      findings.push({ label: "private key", line: lineNumber, preview });
    }
  });

  return findings;
}

export function formatSecretFindings(findings: SecretFinding[]) {
  return findings
    .map((finding) => `  line ${finding.line} (${finding.label}): ${finding.preview}`)
    .join("\n");
}
