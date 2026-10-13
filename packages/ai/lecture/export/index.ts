/**
 * 纯函数导出器（W14 / T6）：`exportLecture(result, options)` → { filename, mimeType, body }。
 * 不依赖 DOM / node:fs，服务端 media job 路由与 TUI 复用同一实现。
 * 真值文档：docs/plans/2026-10-08-media-lecture-pipeline.md（§2 W14、§3 数据契约）。
 */
import type { ExportFormat, ExportOptions, ExportPart, LectureResult } from "../types";
import {
  buildFileName,
  MIME_TYPE,
  resolveOptions,
} from "./common";
import { exportDocx } from "./docx";
import { exportMarkdown } from "./md";
import { exportSrt } from "./srt";
import { exportTxt } from "./txt";
import { exportVtt } from "./vtt";

export interface ExportPayload {
  filename: string;
  mimeType: string;
  body: Uint8Array | string;
}

function textPayload(
  result: LectureResult,
  format: Exclude<ExportFormat, "docx">,
  body: string,
): ExportPayload {
  const resolved = resolveOptions(result, { format });
  return {
    filename: buildFileName(result, format, resolved.lang),
    mimeType: MIME_TYPE[format],
    body,
  };
}

export async function exportLecture(
  result: LectureResult,
  options: ExportOptions,
): Promise<ExportPayload> {
  const orphaned = (result as LectureResult & { orphanedEdits?: Record<string, unknown> }).orphanedEdits;
  if (orphaned && Object.keys(orphaned).length) {
    console.warn("Lecture export ignored orphaned edits:", Object.keys(orphaned));
  }
  switch (options.format) {
    case "docx":
      return exportDocx(result, options);
    case "md":
      return textPayload(result, "md", exportMarkdown(result, options));
    case "srt":
      return textPayload(result, "srt", exportSrt(result, options));
    case "vtt":
      return textPayload(result, "vtt", exportVtt(result, options));
    case "txt":
      return textPayload(result, "txt", exportTxt(result, options));
    default:
      throw new Error(`unsupported export format: ${String(options.format)}`);
  }
}

export { exportDocx } from "./docx";
export { exportMarkdown } from "./md";
export { exportSrt } from "./srt";
export { exportTxt } from "./txt";
export { exportVtt } from "./vtt";
export {
  ALL_PARTS,
  FILE_EXTENSION,
  MIME_TYPE,
  buildFileName,
  flattenOutline,
  formatHms,
  formatStamp,
  formatSubtitleTime,
  resolveOptions,
  selectedSegments,
} from "./common";
export type { BilingualRow, ExportLang, ResolvedExportOptions } from "./common";
export type { ExportFormat, ExportPart };
