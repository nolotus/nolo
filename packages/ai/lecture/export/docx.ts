/**
 * DOCX 导出（npm `docx`，服务端 / TUI 复用，不碰 DOM）。
 * 版式：标题+元信息 → 大纲（标题层级）→ 重点（项目符号）→ 术语表（表格）
 *       → 双语对照（三列表格，表头跨页重复）→ 全文。
 */
import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { IParagraphOptions, IRunOptions, ITableOptions } from "docx";
import type { ExportOptions, LectureResult, OutlineNode } from "../types";
import {
  bilingualRows,
  buildFileName,
  documentTitle,
  excludedSegmentCount,
  flattenOutline,
  formatHms,
  formatStamp,
  fulltextLines,
  languagePair,
  MIME_TYPE,
  partEnabled,
  resolveOptions,
  selectedSegments,
  type ResolvedExportOptions,
} from "./common";

/** 中文/俄文正文用东亚字体，西文与数字用 Calibri（Word 内分别取 ascii/eastAsia 槽位）。 */
const FONT: IRunOptions["font"] = {
  ascii: "Calibri",
  cs: "Calibri",
  eastAsia: "Microsoft YaHei",
  hAnsi: "Calibri",
};

const OUTLINE_HEADINGS = [
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

const TABLE_BORDERS: NonNullable<ITableOptions["borders"]> = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
};

/**
 * 可用宽度：docx 默认页宽 12240 twips − 左右 1 英寸页边距(1440×2) = 9360 twips。
 * 列宽用 DXA + columnWidths + 固定布局：Word 与 LibreOffice 都按 tblGrid 分列，
 * 不会像 pct 单元格宽度那样把「时间」列撑成等宽三分之一。
 */
const USABLE_WIDTH_DXA = 9360;

/** 对照表：时间 14% / 原文 43% / 译文 43%（时间戳列窄、正文列宽）。 */
const BILINGUAL_COLUMNS_WITH_TIME = [14, 43, 43];
/** 无时间戳的对照表：原文 43% / 译文 57%。 */
const BILINGUAL_COLUMNS_NO_TIME = [43, 57];
/** 术语表：原文 35% / 译文 30% / 备注 35%。 */
const GLOSSARY_COLUMNS = [35, 30, 35];

/** 百分比 → DXA 列宽，尾列吸收舍入误差，保证总和 = USABLE_WIDTH_DXA。 */
function dxaColumns(percentages: readonly number[]): number[] {
  const columns = percentages.map((percent) => Math.round((USABLE_WIDTH_DXA * percent) / 100));
  const drift = USABLE_WIDTH_DXA - columns.reduce((total, value) => total + value, 0);
  columns[columns.length - 1] += drift;
  return columns;
}

type RunStyle = Pick<IRunOptions, "bold" | "italics" | "size" | "color">;

function textRun(text: string, style: RunStyle = {}): TextRun {
  return new TextRun({ text, font: FONT, ...style });
}

function paragraph(options: IParagraphOptions): Paragraph {
  return new Paragraph(options);
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return paragraph({ heading: level, children: [textRun(text, { bold: true })] });
}

function bullet(text: string): Paragraph {
  return paragraph({ children: [textRun(text)], bullet: { level: 0 } });
}

function cell(text: string, widthDxa?: number, bold = false): TableCell {
  return new TableCell({
    width: widthDxa === undefined ? undefined : { size: widthDxa, type: WidthType.DXA },
    children: [paragraph({ children: [textRun(text, { bold })] })],
  });
}

function table(headers: string[], percentages: readonly number[], rows: string[][]): Table {
  const columns = dxaColumns(percentages);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((label, index) => cell(label, columns[index], true)),
  });
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((value, index) => cell(value, columns[index])),
      }),
  );
  return new Table({
    width: { size: USABLE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: columns,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function outlineHeading(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  return OUTLINE_HEADINGS[Math.min(depth, OUTLINE_HEADINGS.length - 1)];
}

function pushOutline(children: Array<Paragraph | Table>, result: LectureResult, options: ResolvedExportOptions): void {
  const rows: Array<{ depth: number; node: OutlineNode }> = flattenOutline(result.outline);
  if (rows.length === 0) return;
  children.push(heading("大纲", HeadingLevel.HEADING_1));
  for (const { depth, node } of rows) {
    const stamp = options.timestamps ? `${formatStamp(node.startSec)} ` : "";
    children.push(paragraph({ heading: outlineHeading(depth), children: [textRun(`${stamp}${node.title}`)] }));
  }
}

function pushKeyPoints(children: Array<Paragraph | Table>, result: LectureResult): void {
  if (result.keyPoints.length === 0) return;
  children.push(heading("重点", HeadingLevel.HEADING_1));
  for (const point of result.keyPoints) children.push(bullet(point.text));
}

function pushGlossary(children: Array<Paragraph | Table>, result: LectureResult): void {
  if (result.glossary.length === 0) return;
  children.push(heading("术语表", HeadingLevel.HEADING_1));
  children.push(
    table(
      ["原文", "译文", "备注"],
      GLOSSARY_COLUMNS,
      result.glossary.map((entry) => [entry.source, entry.target, entry.note ?? ""]),
    ),
  );
}

function pushBilingual(children: Array<Paragraph | Table>, result: LectureResult, options: ResolvedExportOptions): void {
  const rows = bilingualRows(result, options.includeExcluded);
  if (rows.length === 0) return;
  children.push(heading("双语对照", HeadingLevel.HEADING_1));
  if (options.lang === "both" && options.layout === "table") {
    children.push(
      options.timestamps
        ? table(
            ["时间", "原文", "译文"],
            BILINGUAL_COLUMNS_WITH_TIME,
            rows.map((row) => [formatStamp(row.startSec), row.src, row.tgt]),
          )
        : table(
            ["原文", "译文"],
            BILINGUAL_COLUMNS_NO_TIME,
            rows.map((row) => [row.src, row.tgt]),
          ),
    );
    return;
  }
  // interleave：原文段 + 缩进斜体译文段
  for (const row of rows) {
    const stamp = options.timestamps ? `${formatStamp(row.startSec)} ` : "";
    if (options.lang === "tgt") {
      children.push(paragraph({ children: [textRun(`${stamp}${row.tgt.length > 0 ? row.tgt : row.src}`)] }));
      continue;
    }
    children.push(paragraph({ children: [textRun(`${stamp}${row.src}`)] }));
    if (options.lang === "both" && row.tgt.length > 0) {
      children.push(
        paragraph({
          indent: { left: 360 },
          children: [textRun(row.tgt, { italics: true, color: "595959" })],
        }),
      );
    }
  }
}

function pushFulltext(children: Array<Paragraph | Table>, result: LectureResult, options: ResolvedExportOptions): void {
  const lines = fulltextLines(result, options);
  if (lines.length === 0) return;
  children.push(heading("全文", HeadingLevel.HEADING_1));
  for (const line of lines) children.push(paragraph({ children: [textRun(line)] }));
}

export interface DocxExportPayload {
  filename: string;
  mimeType: string;
  body: Uint8Array;
}

export async function exportDocx(
  result: LectureResult,
  options: ExportOptions,
): Promise<DocxExportPayload> {
  const resolved = resolveOptions(result, options);
  const parts = resolved.parts;
  const children: Array<Paragraph | Table> = [];

  children.push(heading(documentTitle(result), HeadingLevel.TITLE));
  const hidden = excludedSegmentCount(result);
  const meta = [
    `时长 ${formatHms(result.source.durationSec)}`,
    `语言 ${languagePair(result)}`,
    `段落 ${selectedSegments(result, resolved.includeExcluded).length}`,
  ];
  if (hidden > 0) meta.push(`已排除 ${hidden} 段`);
  children.push(
    paragraph({
      spacing: { after: 240 },
      children: [textRun(meta.join(" · "), { size: 18, color: "595959" })],
    }),
  );

  if (partEnabled(parts, "outline")) pushOutline(children, result, resolved);
  if (partEnabled(parts, "keyPoints")) pushKeyPoints(children, result);
  if (partEnabled(parts, "glossary")) pushGlossary(children, result);
  if (partEnabled(parts, "bilingual")) pushBilingual(children, result, resolved);
  if (partEnabled(parts, "fulltext")) pushFulltext(children, result, resolved);

  const doc = new Document({
    creator: "nolo lecture exporter",
    title: documentTitle(result),
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return {
    filename: buildFileName(result, "docx", resolved.lang),
    mimeType: MIME_TYPE.docx,
    body: new Uint8Array(buffer),
  };
}
