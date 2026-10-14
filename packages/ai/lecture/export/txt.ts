/**
 * 纯文本导出：按 lang 输出。默认只有 fulltext；调用方显式指定 parts 时，
 * 大纲/重点/术语表/对照按纯文本线性渲染（字幕格式则只支持 fulltext）。
 */
import type { ExportOptions, LectureResult } from "../types";
import {
  bilingualRows,
  flattenOutline,
  formatStamp,
  fulltextLines,
  partEnabled,
  resolveOptions,
  selectedSegments,
  type ResolvedExportOptions,
} from "./common";

function outlineLines(result: LectureResult, options: ResolvedExportOptions): string[] {
  return flattenOutline(result.outline).map(({ depth, node }) => {
    const indent = "  ".repeat(depth);
    const stamp = options.timestamps ? `${formatStamp(node.startSec)} ` : "";
    return `${indent}${stamp}${node.title}`;
  });
}

function keyPointLines(result: LectureResult): string[] {
  return result.keyPoints.map((point) => `- ${point.text}`);
}

function glossaryLines(result: LectureResult): string[] {
  return result.glossary.map((entry) => {
    const note = entry.note ? ` — ${entry.note}` : "";
    return `${entry.source} = ${entry.target}${note}`;
  });
}

function bilingualLines(result: LectureResult, options: ResolvedExportOptions): string[] {
  const lines: string[] = [];
  for (const row of bilingualRows(result, options.includeExcluded)) {
    const stamp = options.timestamps ? `${formatStamp(row.startSec)} ` : "";
    if (options.lang === "tgt") {
      lines.push(`${stamp}${row.tgt.length > 0 ? row.tgt : row.src}`);
      continue;
    }
    lines.push(`${stamp}${row.src}`);
    if (options.lang === "both" && row.tgt.length > 0) lines.push(`  ${row.tgt}`);
  }
  return lines;
}

export function exportTxt(result: LectureResult, options: ExportOptions): string {
  const resolved = resolveOptions(result, options);
  if (!resolved.explicitParts) {
    // 缺省：只有全文，不加任何小节标题
    const lines = fulltextLines(result, resolved);
    return lines.length > 0 ? `${lines.join("\n")}\n` : "";
  }

  const sections: Array<{ title: string; lines: string[] }> = [];
  if (partEnabled(resolved.parts, "outline")) {
    sections.push({ title: "【大纲】", lines: outlineLines(result, resolved) });
  }
  if (partEnabled(resolved.parts, "keyPoints")) {
    sections.push({ title: "【重点】", lines: keyPointLines(result) });
  }
  if (partEnabled(resolved.parts, "glossary")) {
    sections.push({ title: "【术语表】", lines: glossaryLines(result) });
  }
  if (partEnabled(resolved.parts, "bilingual")) {
    sections.push({ title: "【双语对照】", lines: bilingualLines(result, resolved) });
  }
  if (partEnabled(resolved.parts, "fulltext")) {
    sections.push({ title: "【全文】", lines: fulltextLines(result, resolved) });
  }

  const blocks = sections
    .filter((section) => section.lines.length > 0)
    .map((section) => [section.title, ...section.lines].join("\n"));
  const footer = `（${selectedSegments(result, resolved.includeExcluded).length} 段）`;
  return blocks.length > 0 ? `${blocks.join("\n\n")}\n${footer}\n` : "";
}
