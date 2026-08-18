import { describe, expect, test } from "bun:test";
import {
  pendingAttachmentToMessageParts,
  pendingAttachmentsToMessageParts,
  resolvePendingAttachmentToMessageParts,
} from "./pendingAttachmentParts";

describe("pending attachment message parts", () => {
  test("keeps OCR attachments as inline text", () => {
    expect(
      pendingAttachmentToMessageParts(
        {
          type: "ocr_text",
          name: "receipt.png",
          ocrText: "total 42",
        },
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "text",
        text: "[图片 OCR：receipt.png]\ntotal 42",
      },
    ]);
  });

  test("turns sidebar image references into model-visible image_url parts", () => {
    expect(
      pendingAttachmentToMessageParts(
        {
          type: "image",
          name: "mockup.png",
          pageKey: "file-user-01IMAGE",
        },
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "text",
        text: "[Image attachment: mockup.png]\nSource file: file-user-01IMAGE",
      },
      {
        type: "image_url",
        image_url: {
          url: "https://nolo.chat/api/v1/db/file/content/file-user-01IMAGE",
        },
      },
    ]);
  });

  test("preserves non-image references as pageKey attachments", () => {
    expect(
      pendingAttachmentsToMessageParts(
        [
          {
            type: "page",
            name: "Spec",
            pageKey: "page-user-01SPEC",
          },
          {
            type: "dialog",
            name: "Old discussion",
            pageKey: "dialog-user-01OLD",
            sourceDialogKey: "dialog-user-01OLD",
          },
        ],
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "page",
        name: "Spec",
        pageKey: "page-user-01SPEC",
        dialogKey: undefined,
      },
      {
        type: "dialog",
        name: "Old discussion",
        pageKey: "dialog-user-01OLD",
        dialogKey: "dialog-user-01OLD",
      },
    ]);
  });

  test("deduplicates repeated references before model submission", () => {
    expect(
      pendingAttachmentsToMessageParts(
        [
          {
            type: "page",
            name: "Spec",
            pageKey: "page-user-01SPEC",
          },
          {
            type: "page",
            name: "Spec duplicate",
            pageKey: "page-user-01SPEC",
          },
        ],
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "page",
        name: "Spec",
        pageKey: "page-user-01SPEC",
        dialogKey: undefined,
      },
    ]);
  });

  test("keeps similarly named files when their stable keys differ", () => {
    expect(
      pendingAttachmentsToMessageParts(
        [
          {
            type: "page",
            name: "POE 问卷.docx",
            pageKey: "page-user-01VERSIONA",
          },
          {
            type: "page",
            name: "POE 问卷.docx",
            pageKey: "page-user-01VERSIONB",
          },
        ],
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "page",
        name: "POE 问卷.docx",
        pageKey: "page-user-01VERSIONA",
        dialogKey: undefined,
      },
      {
        type: "page",
        name: "POE 问卷.docx",
        pageKey: "page-user-01VERSIONB",
        dialogKey: undefined,
      },
    ]);
  });

  test("does not deduplicate attachments that lack a stable key", () => {
    expect(
      pendingAttachmentsToMessageParts(
        [
          {
            type: "page",
            name: "untitled.docx",
          },
          {
            type: "page",
            name: "untitled.docx",
          },
        ],
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([]);

    expect(
      pendingAttachmentsToMessageParts(
        [
          {
            type: "ocr_text",
            name: "scan.png",
            ocrText: "same OCR",
          },
          {
            type: "ocr_text",
            name: "scan.png",
            ocrText: "same OCR",
          },
        ],
        { currentServer: "https://nolo.chat" }
      )
    ).toEqual([
      {
        type: "text",
        text: "[图片 OCR：scan.png]\nsame OCR",
      },
      {
        type: "text",
        text: "[图片 OCR：scan.png]\nsame OCR",
      },
    ]);
  });

  test("falls back to a reference part when image URL cannot be built", () => {
    expect(
      pendingAttachmentToMessageParts(
        {
          type: "image",
          name: "local-only.png",
          pageKey: "file-user-01LOCAL",
        },
        { currentServer: "" }
      )
    ).toEqual([
      {
        type: "image",
        name: "local-only.png",
        pageKey: "file-user-01LOCAL",
        dialogKey: undefined,
      },
    ]);
  });

  test("allows callers to rewrite image URLs before model submission", async () => {
    await expect(
      resolvePendingAttachmentToMessageParts(
        {
          type: "image",
          name: "local.png",
          pageKey: "file-user-01LOCAL",
        },
        {
          currentServer: "http://127.0.0.1:38123",
          resolveImageUrl: (url) =>
            url.includes("127.0.0.1")
              ? "data:image/png;base64,QUJD"
              : url,
        }
      )
    ).resolves.toEqual([
      {
        type: "text",
        text: "[Image attachment: local.png]\nSource file: file-user-01LOCAL",
      },
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,QUJD",
        },
      },
    ]);
  });
});
