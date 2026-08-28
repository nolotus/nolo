import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fileProcessorSource = readFileSync(
  join(import.meta.dir, "fileProcessor.ts"),
  "utf-8"
);
const pdfOcrProcessorSource = readFileSync(
  join(import.meta.dir, "pdfOcrProcessor.ts"),
  "utf-8"
);
const useMessageInputFilesSource = readFileSync(
  join(import.meta.dir, "useMessageInputFiles.ts"),
  "utf-8"
);
const attachmentsPreviewSource = readFileSync(
  join(import.meta.dir, "AttachmentsPreview.tsx"),
  "utf-8"
);
const settingInitialStateSource = readFileSync(
  join(import.meta.dir, "../../app/settings/settingInitialState.ts"),
  "utf-8"
);
const fieldSelectorsSource = readFileSync(
  join(import.meta.dir, "../../app/settings/fieldSelectors.ts"),
  "utf-8"
);

describe("file processor source contract", () => {
  it("passes OCR runtime context as a single object", () => {
    expect(fileProcessorSource).toContain("ocrRequest?: {");
    expect(fileProcessorSource).toContain("ocrRequest?.serverOrigin");
    expect(fileProcessorSource).toContain("ocrRequest?.accessToken");
    expect(fileProcessorSource).toContain(
      "slateData = await processPdfWithOcr(file, ocrModel, ocrRequest);"
    );
  });

  it("falls back to pdf.js when Google OCR is not configured", () => {
    expect(fileProcessorSource).toContain("isOcrConfigurationError");
    expect(fileProcessorSource).toContain("Server missing Google Document AI configuration");
    expect(fileProcessorSource).toContain("slateData = await convertPdfToSlate(file);");
  });

  it("keeps OCR transport behind the shared request context", () => {
    expect(pdfOcrProcessorSource).toContain("interface OcrRequestContext");
    expect(pdfOcrProcessorSource).toContain("const { serverOrigin, accessToken, dialogId } = ocrRequest;");
    expect(pdfOcrProcessorSource).toContain('throw new Error("OCR 请求缺少 server 或 token")');
    expect(pdfOcrProcessorSource).toContain('pdfjsLib.GlobalWorkerOptions.workerSrc = "/public/assets/pdf.worker.mjs"');
    expect(pdfOcrProcessorSource).not.toContain("currentServer: string");
    expect(pdfOcrProcessorSource).not.toContain("token: string");
  });

  it("uses Google Document AI as the default OCR endpoint while keeping olmOCR fallback", () => {
    expect(pdfOcrProcessorSource).toContain('google_document_ocr: "/api/google-document-ocr"');
    expect(pdfOcrProcessorSource).toContain('olm_ocr: "/api/olm-ocr"');
    expect(settingInitialStateSource).toContain('ocrModel: "google_document_ocr"');
    expect(fieldSelectorsSource).toContain('state.settings.ocrModel === "olm_ocr"');
  });

  it("keeps multi-reference files connected to input processing state", () => {
    expect(fileProcessorSource).toContain("trackingId: fileId");
    expect(useMessageInputFilesSource).toContain("file.trackingId ?? file.id");
    expect(attachmentsPreviewSource).toContain("file.trackingId ?? file.id");
  });

  it("pins pending files to the global runtime when no dialog is active", () => {
    expect(useMessageInputFilesSource).toContain(
      "GLOBAL_DIALOG_RUNTIME_KEY"
    );
    expect(useMessageInputFilesSource).toContain("effectiveDialogKey");
    expect(fileProcessorSource).toContain(
      "dialogKey: dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY"
    );
  });
});
