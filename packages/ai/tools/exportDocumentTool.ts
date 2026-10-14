import { callToolApi } from "./toolApiClient";

export const exportDocumentSchema = {
  name: "exportDocument",
  description:
    "将媒体任务的转写/译文产物导出为可下载的文档文件。默认格式为 docx，双语对照使用 lang=both。返回 fileId、downloadUrl 和 sizeBytes，不返回全文。",
  parameters: {
    type: "object",
    properties: {
      jobId: {
        type: "string",
        description: "媒体任务 ID。",
      },
      format: {
        type: "string",
        enum: ["docx", "md", "txt", "srt"],
        description: "导出文件格式，默认 docx。",
      },
      lang: {
        type: "string",
        enum: ["both", "src", "tgt"],
        description: "输出语言选择：both（双语对照，默认）、src（仅原文）、tgt（仅译文）。",
      },
      layout: {
        type: "string",
        description: "可选排版样式（如 bilingual-table、parallel-blocks 等）。",
      },
    },
    required: ["jobId"],
  },
};

export type ExportDocumentToolInput = {
  jobId: string;
  format?: "docx" | "md" | "txt" | "srt";
  lang?: "both" | "src" | "tgt";
  layout?: string;
};

export async function exportDocumentFunc(
  input: ExportDocumentToolInput,
  thunkApi: any,
): Promise<any> {
  const { jobId, format = "docx", lang = "both", layout } = input ?? {};
  if (!jobId) throw new Error("exportDocument 工具必须提供 jobId");

  const body: Record<string, unknown> = {
    format,
    lang,
  };
  if (layout) body.layout = layout;

  const data = await callToolApi(
    thunkApi,
    `/api/media-jobs/${encodeURIComponent(jobId)}/export`,
    body,
    { withAuth: true },
  );

  const llmContext = JSON.stringify({
    jobId, fileId: data?.fileId ?? null, downloadUrl: data?.downloadUrl ?? null,
    filename: data?.filename ?? null, sizeBytes: data?.sizeBytes ?? null,
    format: data?.format ?? format, lang: data?.lang ?? lang,
  });
  return {
    llmContext,
    fileId: data?.fileId,
    downloadUrl: data?.downloadUrl,
    sizeBytes: data?.sizeBytes,
    filename: data?.filename,
    format: data?.format ?? format,
    lang: data?.lang ?? lang,
    summary: `文档已成功导出为 ${data?.filename ?? format}（大小: ${data?.sizeBytes ?? 0} 字节）。下载链接：${data?.downloadUrl ?? ""}`,
    rawData: data,
  };
}
