import { describe, expect, it } from "bun:test";
import { validateDroppedFiles } from "./FileDropZone";

describe("validateDroppedFiles", () => {
  it("rejects oversized files even when their type is allowed", () => {
    const smallFile = new File(["ok"], "small.pdf", {
      type: "application/pdf",
    });
    const largeFile = new File(["too-big"], "large.pdf", {
      type: "application/pdf",
    });

    Object.defineProperty(largeFile, "size", {
      value: 10,
      configurable: true,
    });

    const result = validateDroppedFiles(
      [smallFile, largeFile],
      [".pdf"],
      5
    );

    expect(result.validFiles.map((file) => file.name)).toEqual(["small.pdf"]);
    expect(result.oversizedFiles).toEqual(["large.pdf"]);
    expect(result.invalidTypes).toEqual([]);
  });

  it("keeps invalid type and oversized buckets separate", () => {
    const invalidFile = new File(["x"], "archive.zip", {
      type: "application/zip",
    });
    const largeImage = new File(["image"], "poster.png", {
      type: "image/png",
    });

    Object.defineProperty(largeImage, "size", {
      value: 20,
      configurable: true,
    });

    const result = validateDroppedFiles(
      [invalidFile, largeImage],
      [".png"],
      10
    );

    expect(result.validFiles).toEqual([]);
    expect(result.invalidTypes).toEqual(["archive.zip"]);
    expect(result.oversizedFiles).toEqual(["poster.png"]);
  });
});
