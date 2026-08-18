import { describe, expect, it } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  copyRouteStyles,
  ROUTE_STYLE_FILES,
  ROUTE_STYLE_OUTPUT_NAMES,
  verifyRouteStyles,
} from "./routeStyles.js";

describe("copyRouteStyles behavior", () => {
  it("uses the authoritative route-style file map for production sources", () => {
    // The exported map is the single source of truth: one table + settings + home + share + agent-form.
    expect(ROUTE_STYLE_FILES.length).toBe(5);
    const outputNames = ROUTE_STYLE_FILES.map(([, name]) => name).sort();
    expect(outputNames).toEqual(
      ["agent-form.css", "home.css", "settings.css", "share.css", "table.css"]
    );
  });

  it("concatenates and transforms source files into the output dir via injected options", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "route-styles-"));
    const outputDir = join(tmpRoot, "route-styles");
    const srcA = join(tmpRoot, "a.css");
    const srcB = join(tmpRoot, "b.css");
    writeFileSync(srcA, ".a { color: red; }\n");
    writeFileSync(srcB, ".b { color: blue; }\n");

    try {
      await copyRouteStyles({
        files: [[srcA, "single.css"], [[srcA, srcB], "merged.css"]],
        outputDir,
      });

      const single = readFileSync(join(outputDir, "single.css"), "utf8");
      expect(single).toContain(".a");
      expect(single).not.toContain(".b");

      const merged = readFileSync(join(outputDir, "merged.css"), "utf8");
      expect(merged).toContain(".a");
      expect(merged).toContain(".b");
      // Sources are joined with a newline separator.
      expect(merged).toMatch(/\.a[\s\S]*\.b/);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("skips rewriting unchanged outputs in dev-watch mode", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "route-styles-cache-"));
    const outputDir = join(tmpRoot, "route-styles");
    const source = join(tmpRoot, "source.css");
    const output = join(outputDir, "cached.css");
    writeFileSync(source, ".cached { color: red; }\n");

    try {
      const options = {
        files: [[source, "cached.css"]],
        outputDir,
        skipUnchanged: true,
      };
      await copyRouteStyles(options);
      const firstMtime = statSync(output).mtimeMs;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await copyRouteStyles(options);
      expect(statSync(output).mtimeMs).toBe(firstMtime);

      unlinkSync(output);
      await copyRouteStyles(options);
      expect(readFileSync(output, "utf8")).toContain("red");

      writeFileSync(source, ".cached { color: blue; }\n");
      await copyRouteStyles(options);
      expect(readFileSync(output, "utf8")).toContain("blue");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

describe("verifyRouteStyles", () => {
  it("exposes the derived output name list for deploy probes and contract tests", () => {
    expect(ROUTE_STYLE_OUTPUT_NAMES).toEqual(
      ROUTE_STYLE_FILES.map(([, name]) => name)
    );
  });

  it("passes on freshly generated outputs and fails when one is missing", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "route-styles-verify-"));
    const outputDir = join(tmpRoot, "route-styles");
    const srcA = join(tmpRoot, "a.css");
    const srcB = join(tmpRoot, "b.css");
    writeFileSync(srcA, ".a { color: red; }\n");
    writeFileSync(srcB, ".b { color: blue; }\n");
    const files = [[srcA, "a.css"], [srcB, "b.css"]];

    try {
      await copyRouteStyles({ files, outputDir });
      await expect(verifyRouteStyles({ files, outputDir })).resolves.toBeUndefined();

      unlinkSync(join(outputDir, "b.css"));
      await expect(verifyRouteStyles({ files, outputDir })).rejects.toThrow(
        /b\.css/
      );
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("rejects hand-written or stale outputs without the GENERATED banner", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "route-styles-banner-"));
    const outputDir = join(tmpRoot, "route-styles");
    const src = join(tmpRoot, "a.css");
    writeFileSync(src, ".a { color: red; }\n");
    const files = [[src, "a.css"]];

    try {
      await copyRouteStyles({ files, outputDir });
      // Simulate a stale tracked checkout / hand-placed file overwriting the generated one.
      writeFileSync(join(outputDir, "a.css"), ".hand { color: black; }\n");
      await expect(verifyRouteStyles({ files, outputDir })).rejects.toThrow(
        /GENERATED banner/
      );
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
