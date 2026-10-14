/**
 * 导出器公共层：选项归一化、段落筛选、时间码、文件名。
 *
 * 真值文档：docs/plans/2026-10-08-media-lecture-pipeline.md（§2 W14、§3 数据契约）。
 * 本目录全部为纯函数，不依赖 DOM / node:fs，服务端路由与 TUI 可复用同一套实现。
 */
import type {
  ExportFormat,
  ExportOptions,
  ExportPart,
  LectureResult,
  LectureSegment,
  OutlineNode,
} from "../types";

export type ExportLang = "src" | "tgt" | "both";

export interface ResolvedExportOptions {
  format: ExportFormat;
  /** 归一化后的部分清单（缺省 = 该格式全部适用部分） */
  parts: ExportPart[];
  lang: ExportLang;
  layout: "table" | "interleave";
  timestamps: boolean;
  includeExcluded: boolean;
  /** options.parts 是否由调用方显式指定（为空输出提供差异化降级） */
  explicitParts: boolean;
}

export const ALL_PARTS: readonly ExportPart[] = [
  "outline",
  "keyPoints",
  "glossary",
  "bilingual",
  "fulltext",
];

/** 每种格式默认包含的部分：md/docx 五部分全出；字幕与纯文本只有 fulltext 有含义。 */
const DEFAULT_PARTS: Record<ExportFormat, readonly ExportPart[]> = {
  docx: ALL_PARTS,
  md: ALL_PARTS,
  srt: ["fulltext"],
  vtt: ["fulltext"],
  txt: ["fulltext"],
};

export const FILE_EXTENSION: Record<ExportFormat, string> = {
  docx: "docx",
  md: "md",
  srt: "srt",
  vtt: "vtt",
  txt: "txt",
};

export const MIME_TYPE: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown; charset=utf-8",
  srt: "application/x-subrip; charset=utf-8",
  vtt: "text/vtt; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

/** 文件名里在 Windows/macOS/Linux 上非法的字符（含控制字符）。 */
const ILLEGAL_FILE_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function partEnabled(parts: readonly ExportPart[], part: ExportPart): boolean {
  return parts.includes(part);
}

export function hasTranslation(result: LectureResult): boolean {
  return (
    Boolean(result.targetLang) &&
    result.segments.some((segment) => (segment.translation ?? "").trim().length > 0)
  );
}

/**
 * lang 缺省值：md/docx（富文档，双语是主场景）默认 both；srt/vtt/txt（单流）默认 src。
 * 无译文时一律回退 src，避免导出空文件。
 */
export function defaultLang(format: ExportFormat, result: LectureResult): ExportLang {
  if (!hasTranslation(result)) return "src";
  return format === "md" || format === "docx" ? "both" : "src";
}

function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function resolveOptions(
  result: LectureResult,
  options: ExportOptions,
): ResolvedExportOptions {
  const explicitParts = Array.isArray(options.parts) && options.parts.length > 0;
  const requested = explicitParts
    ? options.parts!.filter((part) => ALL_PARTS.includes(part))
    : [];
  return {
    format: options.format,
    parts: dedupe(explicitParts ? requested : DEFAULT_PARTS[options.format]),
    lang: options.lang ?? defaultLang(options.format, result),
    layout: options.layout ?? "table",
    timestamps: options.timestamps ?? true,
    includeExcluded: options.includeExcluded ?? false,
    explicitParts,
  };
}

/** 默认排除 excluded=true 段（含空文本段）；includeExcluded 可开启。 */
export function selectedSegments(
  result: LectureResult,
  includeExcluded: boolean,
): LectureSegment[] {
  return result.segments.filter(
    (segment) => (includeExcluded || !segment.excluded) && segment.text.trim().length > 0,
  );
}

export function excludedSegmentCount(result: LectureResult): number {
  return result.segments.filter((segment) => segment.excluded).length;
}

/** 按 lang 取一个段落的文本行：both=原文+译文，src=原文，tgt=译文（缺译文回退原文）。 */
export function segmentTextLines(segment: LectureSegment, lang: ExportLang): string[] {
  const src = segment.text.trim();
  const tgt = (segment.translation ?? "").trim();
  if (lang === "tgt") return [tgt.length > 0 ? tgt : src];
  const lines = src.length > 0 ? [src] : [];
  if (lang === "both" && tgt.length > 0) lines.push(tgt);
  return lines;
}

/** 全文/纯文本行：首行带 `[hh:mm:ss] ` 前缀（timestamps 开），译文行不带前缀避免重复。 */
export function fulltextLines(
  result: LectureResult,
  options: ResolvedExportOptions,
): string[] {
  const lines: string[] = [];
  for (const segment of selectedSegments(result, options.includeExcluded)) {
    const texts = segmentTextLines(segment, options.lang);
    texts.forEach((text, index) => {
      const prefix =
        index === 0 && options.timestamps ? `${formatStamp(segment.startSec)} ` : "";
      lines.push(`${prefix}${text}`);
    });
  }
  return lines;
}

export interface BilingualRow {
  startSec: number;
  src: string;
  tgt: string;
  /** 显示组的原始段 ID；笔记页用于播放高亮与恢复操作，不改写产物。 */
  segmentIds: string[];
  excluded: boolean;
}

/** 最多合并 8 个 STT 碎段，防止无句末标点时整节课挤成一行。 */
export const BILINGUAL_MAX_SEGMENTS = 8;
/** 源文/译文各最多 600 个 UTF-16 单位，限制双语表格的阅读负担；单个超长原段不拆。 */
export const BILINGUAL_MAX_CHARS = 600;
/** 相邻段停顿超过 3 秒通常已切换话题，不跨停顿合并。 */
export const BILINGUAL_MAX_GAP_SEC = 3;

/** 中文边界直接连；西文词之间补空格，标点前/开括号后不补。 */
function joinDisplayText(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  const noSpace = /\p{Script=Han}$/u.test(left) || /^\p{Script=Han}/u.test(right)
    || /^[,.;:!?，。！？、；：…）\])}»”’]/u.test(right)
    || /[（\[({«“‘]$/u.test(left);
  return `${left}${noSpace ? "" : " "}${right}`;
}

/**
 * 对照显示按源文本句末合并，时间取首段，译文仅拼接既有文本。
 * 跳过的空段/excluded 段是边界；纳入 excluded 时单独显示以保留恢复操作。
 * 全文与字幕不调用此函数，仍保留原始段/cue。
 */
export function bilingualRows(
  result: Pick<LectureResult, "segments">,
  includeExcluded: boolean,
): BilingualRow[] {
  const rows: BilingualRow[] = [];
  let pending: BilingualRow | undefined;
  let previousEndSec = 0;
  for (const segment of result.segments) {
    const src = segment.text.trim();
    if (!src || (segment.excluded && !includeExcluded)) {
      pending = undefined;
      continue;
    }
    const tgt = (segment.translation ?? "").trim();
    const joinedSrc = pending ? joinDisplayText(pending.src, src) : src;
    const joinedTgt = pending ? joinDisplayText(pending.tgt, tgt) : tgt;
    // 任一上限先到先断；在追加前检查，包含拼接补入的空格。
    if (pending && !segment.excluded
      && pending.segmentIds.length < BILINGUAL_MAX_SEGMENTS
      && joinedSrc.length <= BILINGUAL_MAX_CHARS
      && joinedTgt.length <= BILINGUAL_MAX_CHARS
      && segment.startSec - previousEndSec <= BILINGUAL_MAX_GAP_SEC) {
      pending.src = joinedSrc;
      pending.tgt = joinedTgt;
      pending.segmentIds.push(segment.id);
    } else {
      pending = { startSec: segment.startSec, src, tgt, segmentIds: [segment.id], excluded: segment.excluded };
      rows.push(pending);
    }
    previousEndSec = segment.endSec;
    // 允许句末标点后跟闭引号/括号；逗号、冒号不作为句末。
    if (segment.excluded || /[.!?…。！？]["'»”’）\])}」』】》〉]*$/u.test(src)) pending = undefined;
  }
  return rows;
}

export interface OutlineRow {
  depth: number;
  node: OutlineNode;
}
/** 大纲拍平成带层级的行，供 md 嵌套列表 / docx 标题层级复用。 */
export function flattenOutline(
  nodes: readonly OutlineNode[],
  depth = 0,
): OutlineRow[] {
  const rows: OutlineRow[] = [];
  for (const node of nodes) {
    rows.push({ depth, node });
    if (node.children && node.children.length > 0) {
      rows.push(...flattenOutline(node.children, depth + 1));
    }
  }
  return rows;
}

function pad(value: number, width = 2): string {
  return String(Math.floor(Math.abs(value))).padStart(width, "0");
}

/** hh:mm:ss；小时不截断（>99h 自然增位）。 */
export function formatHms(sec: number): string {
  const safe = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** `[hh:mm:ss]` */
export function formatStamp(sec: number): string {
  return `[${formatHms(sec)}]`;
}

/** 字幕时间码：srt 用逗号毫秒（00:00:12,000），vtt 用点毫秒（00:00:12.000）。 */
export function formatSubtitleTime(sec: number, msSeparator: "," | "."): string {
  const clamped = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const whole = Math.floor(clamped);
  let ms = Math.round((clamped - whole) * 1000);
  let total = whole;
  if (ms === 1000) {
    // 999.9996 之类四舍五入进位到下一秒
    total += 1;
    ms = 0;
  }
  return `${formatHms(total)}${msSeparator}${pad(ms, 3)}`;
}

/** 字幕 cue 起止时间对；endSec<=startSec 的退化数据补 1s，避免零长 cue。 */
export function cueRange(
  segment: LectureSegment,
  msSeparator: "," | ".",
): { start: string; end: string } {
  const startSec = Number.isFinite(segment.startSec) ? Math.max(0, segment.startSec) : 0;
  const endSec = Math.max(segment.endSec, startSec + 1);
  return {
    start: formatSubtitleTime(startSec, msSeparator),
    end: formatSubtitleTime(endSec, msSeparator),
  };
}

/** 源文件名去掉扩展名并清洗非法字符；样本名如 "Лекция 5.m4a" -> "Лекция 5"。 */
export function sanitizeFileNamePart(raw: string): string {
  const cleaned = raw
    .replace(ILLEGAL_FILE_CHARS, "_")
    .replace(/[\s.]+$/, "")
    .replace(/^\.+/, "")
    .trim();
  const trimmed = cleaned.slice(0, 120);
  return trimmed.length > 0 ? trimmed : "lecture";
}

export function sourceBaseName(result: LectureResult): string {
  const name = result.source?.name ?? result.jobId ?? "lecture";
  const withoutExtension = name.replace(/\.[^./\\]{1,12}$/, "");
  return sanitizeFileNamePart(withoutExtension);
}

/** `<源文件名去扩展>-<lang>.<ext>` */
export function buildFileName(
  result: LectureResult,
  format: ExportFormat,
  lang: ExportLang,
): string {
  return `${sourceBaseName(result)}-${lang}.${FILE_EXTENSION[format]}`;
}

export function documentTitle(result: LectureResult): string {
  return sourceBaseName(result);
}

export function languagePair(result: LectureResult): string {
  return result.targetLang ? `${result.sourceLang} → ${result.targetLang}` : result.sourceLang;
}

/**
 * Subtitle mapping: explicit segmentId is authoritative (unknown IDs are ignored,
 * never reassigned by time). Legacy ID-less cues use enclosing segment times.
 * Source AND target come from the composed segment, not stale STT cue text.
 * Split Unicode code points proportionally to positive cue duration. This is a
 * deterministic timing approximation, not word alignment. If durations are
 * invalid or text has fewer code points than cues, first cue carries the whole
 * text and the others carry none. Empty cues are omitted. Missing target uses
 * source in tgt mode. Orphan edits are ignored and warned by exportLecture.
 */
export function subtitleRows(result: LectureResult, includeExcluded: boolean, lang: ExportLang) {
  const segments = selectedSegments(result, includeExcluded);
  const byId = new Map(segments.map(s => [s.id, s]));
  const cues = result.subtitleCues?.length ? result.subtitleCues : segments.map(s => ({
    segmentId: s.id, startSec: s.startSec, endSec: s.endSec, text: s.text,
  }));
  const owners = cues.map(c => c.segmentId ? byId.get(c.segmentId)
    : segments.find(s => s.startSec <= c.startSec && s.endSec >= c.endSec));
  const groups = new Map<string, number[]>();
  owners.forEach((s, i) => { if (s) groups.set(s.id, [...(groups.get(s.id) ?? []), i]); });
  const lines = new Map<number, string[]>();
  for (const [id, indices] of groups) {
    const segment = byId.get(id)!;
    const weights = indices.map(i => cues[i]!.endSec - cues[i]!.startSec);
    const split = (text: string) => {
      const chars = Array.from(text);
      if (chars.length < indices.length || weights.some(w => !Number.isFinite(w) || w <= 0)) {
        return indices.map((_, i) => i === 0 ? text : "");
      }
      const total = weights.reduce((a, b) => a + b, 0);
      let cumulative = 0, start = 0;
      return weights.map((w, i) => {
        cumulative += w;
        const end = i === weights.length - 1 ? chars.length : Math.round(chars.length * cumulative / total);
        const part = chars.slice(start, end).join("");
        start = end;
        return part;
      });
    };
    const src = split(segment.text);
    const tgt = split(segment.translation ?? segment.text);
    indices.forEach((index, i) => lines.set(index,
      (lang === "src" ? [src[i]!] : lang === "tgt" ? [tgt[i]!] :
        [src[i]!, ...(segment.translation ? [tgt[i]!] : [])]).filter(Boolean)));
  }
  return cues.flatMap((c, i) => {
    const owner = owners[i], text = lines.get(i);
    return owner && text?.length ? [{ segment: { ...owner, startSec: c.startSec, endSec: c.endSec }, lines: text }] : [];
  });
}
