import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("pdfToSlate worker loading", () => {
  test("uses a static worker asset instead of bundling pdf.worker into the app graph", () => {
    const source = readFileSync(join(import.meta.dir, "pdfToSlate.ts"), "utf8");

    expect(source).not.toContain('pdfjs-dist/build/pdf.worker.mjs');
    expect(source).toContain('pdfjsLib.GlobalWorkerOptions.workerSrc = "/public/assets/pdf.worker.mjs"');
  });
});
