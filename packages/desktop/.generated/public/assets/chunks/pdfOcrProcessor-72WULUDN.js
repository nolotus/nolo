import {
  GlobalWorkerOptions,
  getDocument
} from "/public/assets/chunks/chunk-X4BPF27F.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/pdfOcrProcessor.ts
GlobalWorkerOptions.workerSrc = "/public/assets/pdf.worker.mjs";
var TEXT_ITEM_THRESHOLD = 3;
var TEXT_THRESHOLD = 50;
var LINE_Y_TOLERANCE = 2;
var PARAGRAPH_Y_GAP = 12;
var OCR_ENDPOINT_MAP = {
  google_document_ocr: "/api/google-document-ocr",
  olm_ocr: "/api/olm-ocr"
};
async function probePageText(page) {
  const textContent = await page.getTextContent();
  let nonEmptyItems = 0;
  let textLength = 0;
  for (const item of textContent.items) {
    if ("str" in item && item.str.length > 0) {
      nonEmptyItems += 1;
      textLength += item.str.length;
    }
  }
  return { textContent, nonEmptyItems, textLength };
}
function textContentToFlatString(textContent) {
  return textContent.items.map((item) => "str" in item ? item.str : "").join(" ").trim();
}
function isScannedPage(probe) {
  return probe.nonEmptyItems < TEXT_ITEM_THRESHOLD && probe.textLength < TEXT_THRESHOLD;
}
function textContentToSlateParagraphs(textContent) {
  const rows = [];
  for (const item of textContent.items) {
    if (!("str" in item) || !item.transform) continue;
    const s = item.str ?? "";
    if (s.length === 0) continue;
    const y = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= LINE_Y_TOLERANCE);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push(s);
  }
  if (rows.length === 0) return [];
  rows.sort((a, b) => b.y - a.y);
  const paragraphs = [];
  let current = [];
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
  return paragraphs.map((p) => p.trim()).filter((p) => p.length > 0).map((p) => ({ type: "paragraph", children: [{ text: p }] }));
}
function textPageToSlateNodes(textContent) {
  const nodes = textContentToSlateParagraphs(textContent);
  if (nodes.length > 0) return nodes;
  const flat = textContentToFlatString(textContent);
  return flat.length > 0 ? [{ type: "paragraph", children: [{ text: flat }] }] : [];
}
async function processPdfWithOcr(file, ocrModel, ocrRequest) {
  const endpoint = OCR_ENDPOINT_MAP[ocrModel];
  if (!endpoint) throw new Error(`\u672A\u77E5 OCR \u6A21\u578B: ${ocrModel}`);
  const { serverOrigin, accessToken, dialogId } = ocrRequest;
  if (!serverOrigin || !accessToken) {
    throw new Error("OCR \u8BF7\u6C42\u7F3A\u5C11 server \u6216 token");
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const nodes = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const probe = await probePageText(page);
    let pageNodes;
    if (!isScannedPage(probe)) {
      pageNodes = textPageToSlateNodes(probe.textContent);
    } else {
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const base64 = canvas.toDataURL("image/jpeg", 0.92);
      const res = await fetch(`${serverOrigin}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          imageUrl: base64,
          prompt: "\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u6240\u6709\u6587\u5B57\uFF0C\u4FDD\u7559\u539F\u59CB\u683C\u5F0F\u548C\u6392\u7248",
          ...dialogId ? { dialogId } : {}
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OCR \u7B2C ${pageNum} \u9875\u5931\u8D25: ${errText}`);
      }
      const data = await res.json();
      const ocrText = data.choices?.[0]?.message?.content || `\uFF08\u7B2C ${pageNum} \u9875\u65E0\u5185\u5BB9\uFF09`;
      pageNodes = ocrText.split("\n").flatMap((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 ? [{ type: "paragraph", children: [{ text: trimmed }] }] : [];
      });
      if (pageNodes.length === 0) {
        pageNodes = [{ type: "paragraph", children: [{ text: ocrText }] }];
      }
    }
    nodes.push(...pageNodes);
    if (pageNum < numPages) {
      nodes.push({ type: "thematic-break", children: [{ text: "" }] });
    }
  }
  if (nodes.length === 0) {
    nodes.push({ type: "paragraph", children: [{ text: "\uFF08\u672A\u8BC6\u522B\u5230\u5185\u5BB9\uFF09" }] });
  }
  return nodes;
}
export {
  processPdfWithOcr
};
