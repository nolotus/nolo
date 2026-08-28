/**
 * pdfOcrProcessor.ts
 *
 * 混合模式 PDF 处理（逐页判定，每页只 getTextContent 一次）：
 * - 文字页：复用 probe 的 textContent，按 Y 坐标聚类成段，不渲染 canvas
 * - 扫描页：渲染为图片调用 OCR API
 *
 * 判定改进（借鉴 pdf-inspector 思路，零依赖）：
 * - 不再仅靠「整页字符数 < 50」单阈值判扫描页
 * - 改为「非空 text item 数 + 字符数」双判据，逐页判定，减少误判与漏判
 */

import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/public/assets/pdf.worker.mjs";

/** 单页非空 text item 数低于此值，且字符数也低于阈值，才判为扫描页 */
const TEXT_ITEM_THRESHOLD = 3;
/** 单页字符数低于此值视为稀疏（与 item 数联合判定） */
const TEXT_THRESHOLD = 50;
/** Y 坐标差小于此值视为同一行 */
const LINE_Y_TOLERANCE = 2;
/** 段落间 Y 跳变大于此值视为新段 */
const PARAGRAPH_Y_GAP = 12;

const OCR_ENDPOINT_MAP: Record<string, string> = {
  google_document_ocr: "/api/google-document-ocr",
  olm_ocr: "/api/olm-ocr",
};

interface SlateNode {
  type: string;
  children: Array<{ text: string }>;
}

interface OcrRequestContext {
  serverOrigin?: string;
  accessToken?: string;
  dialogId?: string;
}

/** 单页文本探测结果：textContent（供成段复用）+ 非空 item 数 + 拍平文本长度 */
interface PageTextProbe {
  textContent: any;
  nonEmptyItems: number;
  textLength: number;
}

/**
 * 探测单页文本：调用一次 getTextContent，统计非空 item 数与拍平长度，供判定使用。
 * 返回的 textContent 同时供文字页成段复用，避免同一页二次消费。
 */
async function probePageText(
  page: pdfjsLib.PDFPageProxy
): Promise<PageTextProbe> {
  const textContent = await page.getTextContent();
  let nonEmptyItems = 0;
  let textLength = 0;
  for (const item of textContent.items as any[]) {
    if ("str" in item && item.str.length > 0) {
      nonEmptyItems += 1;
      textLength += item.str.length;
    }
  }
  return { textContent, nonEmptyItems, textLength };
}

/** 将 textContent 拍平为单串（兜底用，不作为常规输出路径） */
function textContentToFlatString(textContent: any): string {
  return textContent.items
    .map((item: any) => ("str" in item ? item.str : ""))
    .join(" ")
    .trim();
}

/**
 * 判定单页是否为扫描页（需要 OCR）。
 * 双判据：非空 item 数过少 且 原始字符数过少 → 扫描页。
 */
function isScannedPage(probe: PageTextProbe): boolean {
  return (
    probe.nonEmptyItems < TEXT_ITEM_THRESHOLD && probe.textLength < TEXT_THRESHOLD
  );
}

/**
 * 将单页 textContent 按 Y 坐标聚类成行/段，输出 Slate 段落节点。
 * 替代原先失效的 split(/\n+/) —— pdf.js 的 item.str 之间没有真正的换行符。
 */
function textContentToSlateParagraphs(textContent: any): SlateNode[] {
  type Row = { y: number; parts: string[] };
  const rows: Row[] = [];
  for (const item of textContent.items as any[]) {
    if (!("str" in item) || !item.transform) continue;
    const s = item.str ?? "";
    if (s.length === 0) continue;
    const y = item.transform[5] as number;
    // 找到 Y 容差内的现有行，否则新建一行
    let row = rows.find((r) => Math.abs(r.y - y) <= LINE_Y_TOLERANCE);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push(s);
  }
  if (rows.length === 0) return [];

  // 按 Y 从上到下排序（PDF 坐标系 Y 向上，故降序）
  rows.sort((a, b) => b.y - a.y);

  // 相邻行 Y 差 > PARAGRAPH_Y_GAP 视为段落分隔
  const paragraphs: string[] = [];
  let current: string[] = [];
  let prevY = rows[0].y;
  for (const row of rows) {
    if (prevY - row.y > PARAGRAPH_Y_GAP && current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
    current.push(row.parts.join(""));
    prevY = row.y;
  }
  if (current.length > 0) paragraphs.push(current.join(" "));

  return paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => ({ type: "paragraph", children: [{ text: p }] }));
}

/**
 * 将纯文字页转为 Slate 节点（无 OCR）。复用 probe 已拿到的 textContent。
 */
function textPageToSlateNodes(textContent: any): SlateNode[] {
  const nodes = textContentToSlateParagraphs(textContent);
  if (nodes.length > 0) return nodes;
  // 兜底：聚类失败时退回单段全文
  const flat = textContentToFlatString(textContent);
  return flat.length > 0
    ? [{ type: "paragraph", children: [{ text: flat }] }]
    : [];
}

/**
 * 将 PDF 文件用混合方式转为 Slate 节点数组。
 * - 逐页判定：每页只 getTextContent 一次，文字页按 Y 坐标聚类成段（不渲染 canvas）
 * - 扫描页（非空 item 数过少且字符数过少）渲染为图片调用 OCR API
 */
export async function processPdfWithOcr(
  file: File,
  ocrModel: string,
  ocrRequest: OcrRequestContext
): Promise<SlateNode[]> {
  const endpoint = OCR_ENDPOINT_MAP[ocrModel];
  if (!endpoint) throw new Error(`未知 OCR 模型: ${ocrModel}`);
  const { serverOrigin, accessToken, dialogId } = ocrRequest;
  if (!serverOrigin || !accessToken) {
    throw new Error("OCR 请求缺少 server 或 token");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const nodes: SlateNode[] = [];

  // ── 逐页处理：每页只 getTextContent 一次，按判定结果分流 ──
  // 文字页直接用 probe 的 textContent 按 Y 坐标聚类成段（不渲染 canvas）；
  // 扫描页才渲染为图片调用 OCR。这样既保留纯文字 PDF 的快路径收益，
  // 又不会因采样预分类漏掉未采样页的 OCR 需求。
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const probe = await probePageText(page);

    let pageNodes: SlateNode[];

    if (!isScannedPage(probe)) {
      // ── 有文字层：复用 probe.textContent 按 Y 坐标聚类成段，无需 OCR ──
      pageNodes = textPageToSlateNodes(probe.textContent);
    } else {
      // ── 扫描页：渲染为 JPEG 图片，调用 OCR API ──
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const base64 = canvas.toDataURL("image/jpeg", 0.92);

      const res = await fetch(`${serverOrigin}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageUrl: base64,
          prompt: "识别图片中的所有文字，保留原始格式和排版",
          ...(dialogId ? { dialogId } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OCR 第 ${pageNum} 页失败: ${errText}`);
      }

      const data = await res.json();
      const ocrText: string =
        data.choices?.[0]?.message?.content || `（第 ${pageNum} 页无内容）`;

      pageNodes = ocrText.split("\n").flatMap((line: string) => {
        const trimmed = line.trim();
        return trimmed.length > 0
          ? [{ type: "paragraph", children: [{ text: trimmed }] }]
          : [];
      });

      if (pageNodes.length === 0) {
        pageNodes = [{ type: "paragraph", children: [{ text: ocrText }] }];
      }
    }

    nodes.push(...pageNodes);

    // 页间分隔
    if (pageNum < numPages) {
      nodes.push({ type: "thematic-break", children: [{ text: "" }] });
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: "paragraph", children: [{ text: "（未识别到内容）" }] });
  }

  return nodes;
}