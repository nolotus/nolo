import { describe, expect, it } from "bun:test";

import {
  filterImageFiles,
  formatFileSize,
  getCompactFileMetaLabel,
  isBrowserFile,
  isDocumentMimeType,
  isImageFile,
  isImageFileName,
  isImageMimeType,
  isPdfMimeType,
  isImageResourceLike,
  resolveFileCategory,
  resolveFileFormatLabel,
} from "./fileUtils";

describe("fileUtils browser file helpers", () => {
  it("recognizes browser File instances", () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    expect(isBrowserFile(file)).toBe(true);
    expect(isBrowserFile({ name: "fake.txt", type: "text/plain" })).toBe(false);
  });

  it("keeps only image files when filtering", () => {
    const image = new File(["img"], "photo.png", { type: "image/png" });
    const text = new File(["note"], "note.txt", { type: "text/plain" });

    expect(isImageFile(image)).toBe(true);
    expect(isImageFile(text)).toBe(false);
    expect(filterImageFiles([image, text, "not-a-file"])).toEqual([image]);
  });

  it("matches image mime types case-insensitively", () => {
    expect(isImageMimeType("image/webp")).toBe(true);
    expect(isImageMimeType("IMAGE/PNG")).toBe(true);
    expect(isImageMimeType("audio/mpeg")).toBe(false);
  });

  it("matches image file names by extension", () => {
    expect(isImageFileName("photo.png")).toBe(true);
    expect(isImageFileName("cover.JPG")).toBe(true);
    expect(isImageFileName("report.pdf")).toBe(false);
  });

  it("recognizes image resources from content kind, mime type, or file name", () => {
    expect(isImageResourceLike({ kind: "image" })).toBe(true);
    expect(isImageResourceLike({ kind: "image/png" })).toBe(true);
    expect(isImageResourceLike({ mimeType: "image/webp" })).toBe(true);
    expect(isImageResourceLike({ fileCategory: "image" })).toBe(true);
    expect(isImageResourceLike({ fileName: "legacy-upload.png" })).toBe(true);
    expect(isImageResourceLike({ kind: "file", fileName: "notes.txt" })).toBe(false);
  });

  it("classifies file categories from mime type or file name", () => {
    expect(resolveFileCategory({ mimeType: "image/png", fileName: "cover.png" })).toBe("image");
    expect(resolveFileCategory({ mimeType: "video/mp4", fileName: "clip.mp4" })).toBe("video");
    expect(resolveFileCategory({ mimeType: "audio/mpeg", fileName: "voice.mp3" })).toBe("audio");
    expect(resolveFileCategory({ mimeType: "application/pdf", fileName: "brief.pdf" })).toBe("document");
    expect(resolveFileCategory({ mimeType: "application/msword", fileName: "legacy.doc" })).toBe("document");
    expect(resolveFileCategory({ mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", fileName: "deck.pptx" })).toBe("document");
    expect(resolveFileCategory({ mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName: "sheet.xlsx" })).toBe("document");
    expect(resolveFileCategory({ fileName: "report.docx" })).toBe("document");
    expect(resolveFileCategory({ fileName: "archive.zip" })).toBe("other");
  });

  it("recognizes document mime types", () => {
    expect(isDocumentMimeType("application/pdf")).toBe(true);
    expect(isDocumentMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(isDocumentMimeType("video/mp4")).toBe(false);
  });

  it("matches pdf mime types exactly", () => {
    expect(isPdfMimeType("application/pdf")).toBe(true);
    expect(isPdfMimeType("APPLICATION/PDF")).toBe(true);
    expect(isPdfMimeType("application/msword")).toBe(false);
  });

  it("builds compact metadata labels for file cards", () => {
    expect(resolveFileFormatLabel({ fileName: "brief.final.pdf" })).toBe("PDF");
    expect(resolveFileFormatLabel({ fileName: "legacy.doc" })).toBe("DOC");
    expect(resolveFileFormatLabel({ fileName: "deck.pptx" })).toBe("PPTX");
    expect(resolveFileFormatLabel({ fileName: "sheet.xlsx" })).toBe("XLSX");
    expect(resolveFileFormatLabel({ fileName: "clip.webm" })).toBe("WEBM");
    expect(resolveFileFormatLabel({ fileName: "voice.m4a" })).toBe("M4A");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(
      getCompactFileMetaLabel({
        fileName: "brief.final.pdf",
        mimeType: "application/pdf",
        fileSize: 1536,
      })
    ).toBe("PDF · 1.5 KB");
  });
});
