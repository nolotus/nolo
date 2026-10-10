/**
 * Markdown 导出：标题 → 大纲（嵌套列表带时间）→ 重点 → 术语表 → 双语对照 → 全文。
 * 纯字符串拼接，无 DOM / fs 依赖。真值文档见 ./common.ts 头部注释。
 */
import type { ExportOptions, LectureResult } from "../types";
import {
  bilingualRows,
  documentTitle,
  excludedSegmentCount,
  flattenOutline,
  formatHms,
  formatStamp,
  fulltextLines,
  languagePair,
  partEnabled,
  resolveOptions,
  selectedSegments,
  type ResolvedExportOptions,
} from "./common";

/** md 表格单元格转义：竖线转义、换行折成空格。 */
function cell(text: string): string {
  const collapsed = text.replace(/\r?\n/g, " ").trim();
  return collapsed.length > 0 ? collapsed.replace(/\|/g, "\\|") : "";
}

function outlineBlock(result: LectureResult, options: ResolvedExportOptions): string {
  const rows = flattenOutline(result.outline);
  if (rows.length === 0) return options.explicitParts ? "## 大纲\n\n（无）" : "";
  const lines = rows.map(({ depth, node }) => {
    const indent = "  ".repeat(depth);
    const stamp = options.timestamps ? `${formatStamp(node.startSec)} ` : "";
    return `${indent}- ${stamp}${node.title}`;
  });
  return ["## 大纲", "", ...lines].join("\n");
}

function keyPointsBlock(result: LectureResult): string {
  if (result.keyPoints.length === 0) return "";
  const lines = result.keyPoints.map((point) => `- ${point.text}`);
  return ["## 重点", "", ...lines].join("\n");
}

function glossaryBlock(result: LectureResult): string {
  if (result.glossary.length === 0) return "";
  const rows = result.glossary.map(
    (entry) => `| ${cell(entry.source)} | ${cell(entry.target)} | ${cell(entry.note ?? "")} |`,
  );
  return [
    "## 术语表",
    "",
    "| 原文 | 译文 | 备注 |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function bilingualBlock(result: LectureResult, options: ResolvedExportOptions): string {
  const rows = bilingualRows(result, options.includeExcluded);
  if (rows.length === 0) return "";
  if (options.lang === "both" && options.layout === "table") {
    const header = options.timestamps
      ? "| 时间 | 原文 | 译文 |"
      : "| 原文 | 译文 |";
    const separator = options.timestamps ? "| --- | --- | --- |" : "| --- | --- |";
    const body = rows.map((row) =>
      options.timestamps
        ? `| ${formatStamp(row.startSec)} | ${cell(row.src)} | ${cell(row.tgt)} |`
        : `| ${cell(row.src)} | ${cell(row.tgt)} |`,
    );
    return ["## 双语对照", "", header, separator, ...body].join("\n");
  }
  // interleave：原文行 + 译文引用行；单语时退化为普通行
  const lines: string[] = [];
  for (const row of rows) {
    const stamp = options.timestamps ? `${formatStamp(row.startSec)} ` : "";
    if (options.lang === "tgt") {
      lines.push(`${stamp}${row.tgt.length > 0 ? row.tgt : row.src}`);
      continue;
    }
    lines.push(`${stamp}${row.src}`);
    if (options.lang === "both" && row.tgt.length > 0) lines.push(`> ${row.tgt}`);
  }
  return ["## 双语对照", "", ...lines].join("\n");
}

function fulltextBlock(result: LectureResult, options: ResolvedExportOptions): string {
  const lines = fulltextLines(result, options);
  if (lines.length === 0) return "";
  return ["## 全文", "", ...lines].join("\n");
}

function metaBlock(result: LectureResult, options: ResolvedExportOptions): string {
  const lines = [
    `- 时长：${formatHms(result.source.durationSec)}`,
    `- 语言：${languagePair(result)}`,
    `- 段落：${selectedSegments(result, options.includeExcluded).length}`,
  ];
  const hidden = excludedSegmentCount(result);
  if (hidden > 0) {
    lines.push(
      `- 已排除：${hidden} 段（includeExcluded 可一并导出）`,
    );
  }
  return lines.join("\n");
}

export function exportMarkdown(result: LectureResult, options: ExportOptions): string {
  const resolved = resolveOptions(result, options);
  const blocks: string[] = [`# ${documentTitle(result)}`, metaBlock(result, resolved)];
  if (partEnabled(resolved.parts, "outline")) {
    blocks.push(outlineBlock(result, resolved));
  }
  if (partEnabled(resolved.parts, "keyPoints")) {
    blocks.push(keyPointsBlock(result));
  }
  if (partEnabled(resolved.parts, "glossary")) {
    blocks.push(glossaryBlock(result));
  }
  if (partEnabled(resolved.parts, "bilingual")) {
    blocks.push(bilingualBlock(result, resolved));
  }
  if (partEnabled(resolved.parts, "fulltext")) {
    blocks.push(fulltextBlock(result, resolved));
  }
  return `${blocks.filter((block) => block.length > 0).join("\n\n")}\n`;
}
