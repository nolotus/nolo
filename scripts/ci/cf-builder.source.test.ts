import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  artifactRelPaths,
  isPathContained,
  isSafeRelativePath,
  readAssetBasePath,
  sanitizeBasePath,
} from "./cf-builder/paths.ts";

const srcDir = join(import.meta.dir, "cf-builder");
const workerSource = readFileSync(join(srcDir, "worker.ts"), "utf8");
const builderSource = readFileSync(join(srcDir, "builder-server.ts"), "utf8");
const template = readFileSync(join(srcDir, "wrangler.jsonc.template"), "utf8");
const ciScript = readFileSync(join(import.meta.dir, "runAlphaServerCi.sh"), "utf8");

describe("cf-builder source contract", () => {
  it("worker /build enforces X-Builder-Token against env.BUILDER_TOKEN, else 403", () => {
    expect(workerSource).toContain("X-Builder-Token");
    expect(workerSource).toContain("env.BUILDER_TOKEN");
    expect(workerSource).toContain("status: 403");
    // token 校验在转发到容器之前执行，绝不裸奔到容器
    expect(workerSource.indexOf("X-Builder-Token")).toBeLessThan(workerSource.indexOf("container.fetch"));
  });

  it("builder-server build command matches CI build_web (NOLO_WEB_PRECOMPRESS=1 + NOLO_BUILD_SHA)", () => {
    // CI build_web 同参
    expect(ciScript).toContain("NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA");
    expect(builderSource).toContain("NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA");
    // 容器内以 clone 出来的 HEAD 作为 NOLO_BUILD_SHA，与 CI 在干净 checkout 上计算 SHA 等价
    expect(builderSource).toContain("NOLO_BUILD_SHA=${head}");
  });

  it("builder-server /build returns CI-consistent artifact paths (repo-root public/), not guessed dist paths", () => {
    // 真实产物在仓库根 public/ 下，与 package_web_artifact 打包清单一致
    expect(builderSource).toContain("public/latest-assets.json");
    expect(builderSource).toContain("public/meta.json");
    expect(builderSource).toContain("public/locales");
    expect(builderSource).toContain("public/route-styles");
    expect(builderSource).not.toContain("packages/web/dist");
    expect(builderSource).not.toContain("apps/web/dist");
  });

  it("builder-server exposes GET /artifact streaming download of the CI-aligned tar.gz", () => {
    expect(builderSource).toContain('url.pathname === "/artifact"');
    expect(builderSource).toContain("tar -czf");
    expect(builderSource).toContain("file.stream()");
    expect(builderSource).toContain('"application/gzip"');
  });

  it("HIGH-1: artifactRelPaths uses node:fs sync API (no un-awaited arrayBuffer promise)", () => {
    // 同步函数内不得出现 Bun.file(...).arrayBuffer() 这类未 await 的 Promise 误用。
    // 注释里对历史缺陷的说明允许保留，故断言针对「可执行代码」（剔除 // 注释行）而非裸子串。
    const codeLines = builderSource
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(codeLines).not.toMatch(/Bun\.file\([^)]*\)\.arrayBuffer\(\)/);
    // 应改为 node:fs 同步读取 manifest。
    expect(builderSource).toContain("readFileSync(manifest");
    // 打包完成后 steps 必须包含 pack 成功记录。
    expect(builderSource).toContain('name: "pack artifact"');
  });

  it("HIGH-2: parsed basePath is never spliced raw into a bash -c string", () => {
    // 审计 builder-server.ts 中的 sh(...) 调用：
    // basePath / assetDir 绝不能裸拼进命令字符串（必须走 paths.ts 的白名单校验，
    // 仅作为相对路径参与 tar -C 打包或 node:fs 存在性判断）。
    const shCalls = [...builderSource.matchAll(/sh\(`([^`]+)`/g)];
    expect(shCalls.length).toBeGreaterThan(0);
    const shBodies = shCalls.map((m) => m[1]);
    for (const line of shBodies) {
      expect(line).not.toMatch(/\$\{(assetDir|basePath)\}/);
    }
  });

  it("HIGH-2: sanitizeBasePath rejects path traversal & shell metachars, keeps safe subdirs", () => {
    // 正常资产子目录放行（含首尾斜杠与前后空格归一化）
    expect(sanitizeBasePath("assets")).toBe("assets");
    expect(sanitizeBasePath("/assets/")).toBe("assets");
    expect(sanitizeBasePath("/public/assets/")).toBe("public/assets");
    expect(sanitizeBasePath(" /public/assets/ ")).toBe("public/assets");
    expect(sanitizeBasePath("dist/v1")).toBe("dist/v1");
    // 路径逃逸拒绝
    expect(sanitizeBasePath("../assets")).toBeNull();
    expect(sanitizeBasePath("../../etc")).toBeNull();
    expect(sanitizeBasePath("assets/../secret")).toBeNull();
    // shell 元字符 / 引号 / 空白 拒绝
    expect(sanitizeBasePath("assets; rm -rf /")).toBeNull();
    expect(sanitizeBasePath("$(id)")).toBeNull();
    expect(sanitizeBasePath("a b")).toBeNull();
    expect(sanitizeBasePath("a'quote")).toBeNull();
    // 空 / 非字符串拒绝
    expect(sanitizeBasePath("")).toBeNull();
    expect(sanitizeBasePath(null)).toBeNull();
    expect(sanitizeBasePath(42)).toBeNull();
  });

  it("MEDIUM: real manifest basePath='/public/assets/' outputs artifactRelPaths identical to CI package_web_artifact list", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cf-builder-manifest-test-"));
    try {
      mkdirSync(join(tmp, "public/assets"), { recursive: true });
      mkdirSync(join(tmp, "public/locales"), { recursive: true });
      mkdirSync(join(tmp, "public/route-styles"), { recursive: true });
      writeFileSync(
        join(tmp, "public/latest-assets.json"),
        JSON.stringify({
          basePath: "/public/assets/",
          js: "/public/assets/entry.js",
          css: "/public/assets/entry.css",
        }),
      );
      writeFileSync(join(tmp, "public/meta.json"), JSON.stringify({ version: "1.0.0" }));

      // 提取 assetDir 与 readAssetBasePath
      const assetDir = readAssetBasePath(tmp);
      expect(assetDir).toBe("public/assets");

      // artifactRelPaths 相对路径必须与 CI package_web_artifact 清单逐项严格一致
      const expectedCiList = [
        "public/latest-assets.json",
        "public/meta.json",
        "public/assets",
        "public/locales",
        "public/route-styles",
      ];
      const paths = artifactRelPaths(tmp);
      expect(paths).toEqual(expectedCiList);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("MEDIUM: URL-encoded paths are sanitized or rejected on traversal/escape", () => {
    // 隐藏 .. 逃逸编码
    expect(sanitizeBasePath("%2e%2e%2fassets")).toBeNull();
    expect(sanitizeBasePath("assets%2f%2e%2e%2fsecret")).toBeNull();
    expect(sanitizeBasePath("/public/assets/%2e%2e/secret")).toBeNull();
    expect(sanitizeBasePath("..%2foutside")).toBeNull();
    // 空字节注入
    expect(sanitizeBasePath("public/%00assets")).toBeNull();
    // 非法 percent 编码
    expect(sanitizeBasePath("public/%ZZ/assets")).toBeNull();
    // 安全的合法编码路径被正常解码并归一化
    expect(sanitizeBasePath("%2fpublic%2fassets%2f")).toBe("public/assets");
  });

  it("MEDIUM: symlinks pointing outside repo are rejected (realpath containment)", () => {
    const repoDir = mkdtempSync(join(tmpdir(), "cf-builder-repo-symlink-test-"));
    const outsideDir = mkdtempSync(join(tmpdir(), "cf-builder-outside-symlink-test-"));
    try {
      mkdirSync(join(repoDir, "public/locales"), { recursive: true });
      mkdirSync(join(repoDir, "public/route-styles"), { recursive: true });
      writeFileSync(
        join(repoDir, "public/latest-assets.json"),
        JSON.stringify({ basePath: "/public/assets/" }),
      );
      writeFileSync(join(repoDir, "public/meta.json"), "{}");

      // 将 public/assets 指向外部目录 outsideDir
      symlinkSync(outsideDir, join(repoDir, "public/assets"));

      // realpath 逃逸检测必须拒绝
      expect(readAssetBasePath(repoDir)).toBeNull();
      expect(artifactRelPaths(repoDir)).toBeNull();
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("MEDIUM: realpath containment verifies paths stay strictly inside repoRoot", () => {
    const repoDir = mkdtempSync(join(tmpdir(), "cf-builder-containment-test-"));
    const outsideDir = mkdtempSync(join(tmpdir(), "cf-builder-containment-outside-"));
    try {
      const insideSubdir = join(repoDir, "public/assets");
      mkdirSync(insideSubdir, { recursive: true });

      // 内部普通目录
      expect(isPathContained(repoDir, insideSubdir)).toBe(true);
      expect(isPathContained(repoDir, join(repoDir, "public"))).toBe(true);
      expect(isPathContained(repoDir, repoDir)).toBe(true);

      // 外部目录或穿越路径
      expect(isPathContained(repoDir, outsideDir)).toBe(false);
      expect(isPathContained(repoDir, join(repoDir, "../outside"))).toBe(false);

      // 符号链接逃逸到外部
      const symlinkOutside = join(repoDir, "public/leak");
      symlinkSync(outsideDir, symlinkOutside);
      expect(isPathContained(repoDir, symlinkOutside)).toBe(false);

      // 内部合法符号链接（指向内部子目录）
      const symlinkInside = join(repoDir, "public/safe-link");
      symlinkSync(insideSubdir, symlinkInside);
      expect(isPathContained(repoDir, symlinkInside)).toBe(true);

      // 不存在的路径
      expect(isPathContained(repoDir, join(repoDir, "non-existent-path"))).toBe(false);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("wrangler template declares containers, durable_objects and migrations sections", () => {
    expect(template).toContain('"containers"');
    expect(template).toContain('"durable_objects"');
    expect(template).toContain('"migrations"');
    expect(template).toContain('"instance_type"');
    expect(template).toContain('"standard-4"');
    expect(template).toContain('"new_sqlite_classes"');
  });
});
