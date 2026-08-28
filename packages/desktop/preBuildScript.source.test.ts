import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "scripts/pre-build.ts"), "utf8");

describe("desktop pre-build script", () => {
  it("builds web assets through the repo dev esbuild entry", () => {
    expect(source).toContain("validateWorkspacePackageLinks");
    expect(source).toContain("sourceAssetsDir");
    expect(source).toContain("sourceAssetBuildManifestDir");
    expect(source).toContain("await rm(sourceAssetsDir, { recursive: true, force: true });");
    expect(source).toContain("await rm(latestAssetsPath, { force: true });");
    expect(source).toContain('"./scripts/dev/esBuild.js"');
    expect(source).toContain('NOLO_WEB_SKIP_META: "1"');
    // StyleX 启用后构建必须携带 metafile，SKIP_METAFILE 开关已被移除（见 pre-build.ts 注释）
    expect(source).not.toContain('NOLO_WEB_SKIP_METAFILE: "1"');
    expect(source).not.toContain('"./scripts/esBuild.js"');
  });

  it("copies runtime public directories required after the app bundle loads", () => {
    expect(source).toContain('import { existsSync } from "node:fs";');
    expect(source).toContain('for (const dirName of ["locales", "route-styles"])');
    expect(source).toContain("await copyPublicRuntimeDirectories();");
  });
});
