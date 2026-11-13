/**
 * Shared review-result gate for CLI consumers and checkVerdict.
 * New reviewers return schemaVersion:1 completion + findings; the program derives
 * APPROVE/BLOCK. This verifies structure, not the truth of evidence or severity.
 * Host callers separately bind author/reviewer identity, result hash and revision.
 * Legacy Markdown remains strict for compatibility with historical results.
 * Historical reason: 2026-10-09 reports contradicted their own verdict/sections.
 * Do not rewrite old reports into JSON to make them pass.
 */

export type Verdict = "APPROVE" | "BLOCK";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface VerdictCheck {
  status: "OK APPROVE" | "OK BLOCK" | "INVALID";
  reason?: string;
  exitCode: 0 | 2;
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const BLOCKERS: Severity[] = ["CRITICAL", "HIGH"];

// 首行：结论后允许跟一句分隔说明（破折号 / 连字符 / 冒号）
const FIRST_LINE_RE = /^VERDICT: (APPROVE|BLOCK)(?:\s*[—–\-:：]\s*.*)?$/;
// 行首 VERDICT 声明（矛盾扫描用；与 FIRST_LINE_RE 同源，排除 `APPROVE|BLOCK` 候选集写法）
const VERDICT_DECL_RE = /^VERDICT\s*[:：]/i;
const CONFLICT_RE = /VERDICT\s*[:：]\s*`{0,2}\*{0,2}(APPROVE|BLOCK)\b(?!\s*[|/])/gi;
// 段边界：一级 / 二级标题（`### ` 及更深属于段内）
const HEADING_RE = /^(#{1,2})\s+(.*)$/;
// 级别段标题：`## CRITICAL`、`## **HIGH**（0）`、`## LOW / nit`
const HEADING_SEV_RE = /^[*`_\s]*(CRITICAL|HIGH|MEDIUM|LOW)\b/i;
const TABLE_ROW_RE = /^\s*\|(.*)\|\s*$/;
const FENCE_RE = /^\s*```/;
// 级别段内的空声明：整段只有这一行，且精确为 无 / 无。 / None / 0
const EMPTY_SECTION_RE = /^(?:无。?|None|0)$/i;

function invalid(reason: string): VerdictCheck {
  return { status: "INVALID", reason, exitCode: 2 };
}

/** 去掉列表标记与强调符号，用于「行首 VERDICT 声明」的识别。 */
function stripDecoration(line: string): string {
  return line
    .replace(/^\s*(?:[-*+>]|\d+[.)])\s*/, "")
    .replace(/[*_`]/g, "")
    .trim();
}

/** 去掉 `**` 包裹与首尾空白：`**无。**` → `无。` */
function unwrap(line: string): string {
  return line
    .trim()
    .replace(/^\*\*(.*)\*\*$/, "$1")
    .trim();
}

/** 段内去掉空行后只有一行且精确为 `无`/`无。`/`None`/`0` → 该级计 0；其余一律非空。 */
function isEmptySection(body: string[]): boolean {
  const content = body.filter((line) => line.trim() !== "");
  return content.length === 1 && EMPTY_SECTION_RE.test(unwrap(content[0]));
}

function stripFrontmatter(markdown: string): string {
  // 匹配开头的 YAML frontmatter 块（以 `---` 开头并以 `---` 结尾）
  return markdown.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---(?:\r?\n|$)/, "");
}

export interface StructuredReview {
  schemaVersion: 1;
  revision: string;
  status: "completed" | "incomplete";
  reason?: string;
  findings: Array<{ id: string; severity: Severity; file: string; line: number; evidence: string; impact: string }>;
}

/** One machine-readable source; do not infer findings from a second prose report. */
export function parseStructuredReview(text: string):
  | { kind: "legacy" }
  | { kind: "invalid"; reason: string }
  | { kind: "structured"; review: StructuredReview } {
  const body = stripFrontmatter(text).trim();
  if (!body.startsWith("{")) return { kind: "legacy" };
  const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
  try {
    const value = JSON.parse(body);
    const keys = ["schemaVersion", "revision", "status", "reason", "findings"];
    if (!value || value.schemaVersion !== 1 || Object.keys(value).some(k => !keys.includes(k)) ||
        !["completed", "incomplete"].includes(value.status) || !nonempty(value.revision) ||
        !Array.isArray(value.findings) ||
        (value.reason !== undefined && (value.status !== "incomplete" || !nonempty(value.reason))) ||
        (value.status === "incomplete" && !nonempty(value.reason)))
      return { kind: "invalid", reason: "结构化审查字段无效或未完成原因缺失" };
    const ids = new Set<string>();
    const findingKeys = ["id", "severity", "file", "line", "evidence", "impact"];
    for (const f of value.findings) {
      if (!f || Object.keys(f).some(k => !findingKeys.includes(k)) ||
          !nonempty(f.id) || ids.has(f.id.trim()) || !SEVERITIES.includes(f.severity) ||
          !nonempty(f.file) || !Number.isSafeInteger(f.line) || f.line < 1 ||
          !nonempty(f.evidence) || !nonempty(f.impact))
        return { kind: "invalid", reason: "结构化 finding 无效或 id 重复" };
      ids.add(f.id.trim());
    }
    return { kind: "structured", review: value as StructuredReview };
  } catch { return { kind: "invalid", reason: "结构化审查 JSON 无效" }; }
}

export function structuredReviewVerdict(review: StructuredReview): Verdict {
  return review.status === "completed" && !review.findings.some(f => BLOCKERS.includes(f.severity))
    ? "APPROVE" : "BLOCK";
}

export function evaluateVerdict(markdown: string, expectedRevision?: string): VerdictCheck {
  const parsed = parseStructuredReview(markdown);
  if (parsed.kind === "invalid") return invalid(parsed.reason);
  if (parsed.kind === "structured") {
    if (expectedRevision !== undefined && parsed.review.revision !== expectedRevision)
      return invalid("结构化审查版本与宿主受检版本不匹配");
    return { status: structuredReviewVerdict(parsed.review) === "APPROVE" ? "OK APPROVE" : "OK BLOCK", exitCode: 0 };
  }
  const stripped = stripFrontmatter(markdown);
  const lines = stripped.split(/\r?\n/);

  const firstIdx = lines.findIndex((line) => line.trim() !== "");
  if (firstIdx < 0) return invalid("文件为空：找不到首行 VERDICT");

  const head = lines[firstIdx].trim();
  const matched = FIRST_LINE_RE.exec(head);
  if (!matched) {
    return invalid(
      `首行未精确匹配 ^VERDICT: (APPROVE|BLOCK)$（实际：${head.slice(0, 80)}）`,
    );
  }
  const verdict = matched[1].toUpperCase() as Verdict;

  // Reject another decision declaration, not paths containing the word verdict.
  const suffix = head.replace(/^VERDICT\s*[:：]\s*(?:APPROVE|BLOCK)\b/i, "");
  if (/\bVERDICT\s*[:：]/i.test(suffix)) return invalid("首行后缀不得包含第二个 VERDICT 声明");

  const declared = {} as Record<Severity, boolean>;
  const nonEmpty = {} as Record<Severity, boolean>;
  for (const sev of SEVERITIES) {
    declared[sev] = false;
    nonEmpty[sev] = false;
  }

  // 1) 矛盾结论：首行以外的行首 VERDICT 声明
  let inFence = false;
  for (let i = firstIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (FENCE_RE.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !VERDICT_DECL_RE.test(stripDecoration(raw))) continue;
    for (const hit of raw.matchAll(CONFLICT_RE)) {
      const other = hit[1].toUpperCase() as Verdict;
      if (other !== verdict) {
        return invalid(
          `第 ${i + 1} 行出现与首行矛盾的结论（首行 ${verdict}，此处 ${other}）：${raw.trim().slice(0, 80)}`,
        );
      }
    }
  }

  // 2) 级别段 + 汇总表格行
  const record = (sev: Severity | null, body: string[]) => {
    if (!sev) return;
    declared[sev] = true;
    if (!isEmptySection(body)) nonEmpty[sev] = true;
  };

  let current: Severity | null = null;
  let body: string[] = [];
  inFence = false;
  for (let i = firstIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (FENCE_RE.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = HEADING_RE.exec(raw);
    if (heading) {
      record(current, body);
      const sev = HEADING_SEV_RE.exec(heading[2]);
      current = sev ? (sev[1].toUpperCase() as Severity) : null;
      body = [];
      continue;
    }

    const row = TABLE_ROW_RE.exec(raw);
    if (row) {
      const cells = row[1].split("|");
      const severity = SEVERITIES.find(
        (s) => unwrap(cells[0] ?? "").toUpperCase() === s,
      );
      if (!severity) continue;
      const rawCount = cells[1] ?? "";
      const count = unwrap(rawCount);
      if (!/^\d+$/.test(count)) {
        return invalid(
          `表格 ${severity} 的 Count 必须为纯数字（实际：${rawCount.trim() || "(空)"}）`,
        );
      }
      declared[severity] = true;
      if (Number(count) !== 0) nonEmpty[severity] = true;
      continue;
    }

    if (current) body.push(raw);
  }
  record(current, body);

  // 3) 两个阻断级别都必须有明确声明
  const missing = BLOCKERS.filter((sev) => !declared[sev]);
  if (missing.length > 0) {
    return invalid(
      `缺少 ${missing.join("、")} 级别声明（需 "## CRITICAL"/"## HIGH" 段或 "| CRITICAL | 0 |" 表格行）`,
    );
  }

  const blockers = BLOCKERS.filter((sev) => nonEmpty[sev]);
  if (verdict === "APPROVE") {
    if (blockers.length > 0) {
      return invalid(
        `APPROVE 但 ${blockers.join("、")} 非空（APPROVE 要求这两段各只写一行「无。」）`,
      );
    }
    return { status: "OK APPROVE", exitCode: 0 };
  }
  if (blockers.length === 0) {
    return invalid(
      "BLOCK 但 CRITICAL 与 HIGH 均为空：结论缺少阻断依据（若实际应放行，首行请写 APPROVE）",
    );
  }
  return { status: "OK BLOCK", exitCode: 0 };
}
