import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "esBuild.js"), "utf8");

describe("esBuild dev asset contract", () => {
  it("writes public/latest-assets.json so SSR can resolve entry assets", () => {
    expect(source).toContain("public/latest-assets.json");
    expect(source).toContain("publishDevWebBuildSignal");
    expect(source).toContain("buildInfo");
    expect(source).toContain("buildTime");
  });

  it("publishes the artifact runtime entry in latest-assets.json", () => {
    expect(source).toContain("artifactRuntimeJs: assets.artifactRuntimeJs");
    expect(source).toContain("artifactRuntimePreloads: assets.artifactRuntimePreloads");
    expect(source).toContain("buildSha: process.env.NOLO_BUILD_SHA || process.env.GITHUB_SHA || null");
    expect(source).toContain('item.kind !== "import-statement"');
  });

  it("gates production precompression behind NOLO_WEB_PRECOMPRESS", () => {
    expect(source).toContain("shouldPrecompressWebAssets({ timestamp })");
    expect(source).toContain("NOLO_WEB_PRECOMPRESS=1");
  });

  it("copies the PDF worker after asset cleanup so the static worker survives keepRecentAssetBuilds", () => {
    const cleanupIdx = source.indexOf("keepRecentAssetBuilds");
    const pdfIdx = source.lastIndexOf("copyPdfWorker");
    expect(cleanupIdx).toBeGreaterThan(-1);
    expect(pdfIdx).toBeGreaterThan(cleanupIdx);
  });

  it("overlaps route-style and locale prep with the main esbuild wall clock", () => {
    expect(source).toContain("Promise.all([");
    expect(source).toContain('measureTime("esbuild 构建"');
    expect(source).toContain('measureTime("复制路由级样式"');
    expect(source).toContain('measureTime("写入客户端语言包"');
  });

  it("supports skipping meta.json for desktop packaging builds that only need latest-assets.json", () => {
    expect(source).toContain('process.env.NOLO_WEB_SKIP_META === "1"');
    expect(source).toContain('console.log("跳过写入 meta.json');
  });

  it("can derive entry files from emitted assets when production metafile generation is disabled", () => {
    expect(source).toContain("resolveEntryFilesFromOutputDir");
    expect(source).toContain('entry.name.startsWith("entry-")');
    expect(source).toContain('entry.name.startsWith("artifactRuntime-")');
  });

  it("uses shared devAssetManifest publish in dev builds", () => {
    expect(source).toContain("devAssetManifest");
    expect(source).toContain("publishDevWebBuildSignal");
  });
});
