import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "esbuild.config.js"), "utf8");
const repoRoot = join(import.meta.dir, "../..");
const runtimeCompatPath = join(repoRoot, "packages/agent-runtime/runtimeCompat.ts");
const runtimeCompatStubPath = join(
  repoRoot,
  "packages/agent-runtime/runtimeCompat.browser.stub.ts",
);
const skillDiscoveryPath = join(repoRoot, "packages/agent-runtime/skillDiscovery.ts");
const skillDiscoveryStubPath = join(
  repoRoot,
  "packages/agent-runtime/skillDiscovery.browser.stub.ts",
);

function getNamedExports(path: string) {
  // Was classic AST via typescript-compiler-api (typescript 5.x alias).
  // Now we use a lightweight regex scan. Restore AST walk when TS 7.1 API exists if needed.
  const content = readFileSync(path, "utf8");
  const exports = new Set<string>();

  const regex = /^export\s+(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z0-9_]+)/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      exports.add(match[1]);
    }
  }

  // Also catch `export { a, b, c }` lines in a naive way if needed, but our files mostly use inline exports.
  const multiRegex = /^export\s+\{([^}]+)\}/gm;
  let multiMatch;
  while ((multiMatch = multiRegex.exec(content)) !== null) {
    const names = multiMatch[1].split(',').map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      exports.add(name);
    }
  }

  return Array.from(exports).sort();
}

describe("esbuild config source contract", () => {
  it("allows desktop packaging builds to disable production metafile generation explicitly", () => {
    expect(source).toContain('process.env.NOLO_WEB_SKIP_METAFILE === "1"');
  });

  it("allows desktop packaging builds to disable production minification explicitly", () => {
    expect(source).toContain('process.env.NOLO_WEB_SKIP_MINIFY === "1"');
  });

  it("stubs agent-runtime runtimeCompat for browser bundles", () => {
    expect(source).toContain("agent-runtime-browser-compat-stub");
    expect(source).toContain("runtimeCompat.browser.stub.ts");
  });

  it("keeps the browser runtimeCompat stub named exports aligned with the real module", () => {
    expect(getNamedExports(runtimeCompatStubPath)).toEqual(getNamedExports(runtimeCompatPath));
  });

  it("stubs agent-runtime skillDiscovery for browser bundles", () => {
    expect(source).toContain("skillDiscovery.browser.stub.ts");
  });

  it("keeps the browser skillDiscovery stub named exports aligned with the real module", () => {
    expect(getNamedExports(skillDiscoveryStubPath)).toEqual(getNamedExports(skillDiscoveryPath));
  });

  it("bundles agent-runtime nolo workspace tools for browsers without node runtimeCompat builtins", async () => {
    const code = `
      import { build } from "esbuild";
      import { join } from "node:path";
      import { config } from "./scripts/dev/esbuild.config.js";

      const result = await build({
        bundle: true,
        conditions: config.conditions,
        define: config.define,
        format: "esm",
        loader: config.loader,
        logLevel: "silent",
        outdir: join(process.cwd(), ".tmp-esbuild-smoke"),
        platform: "browser",
        plugins: config.plugins,
        resolveExtensions: config.resolveExtensions,
        stdin: {
          contents: 'import "./packages/agent-runtime/noloWorkspaceTools.ts";',
          resolveDir: process.cwd(),
          sourcefile: "runtimeCompat-browser-smoke.ts",
        },
        target: ["es2020"],
        treeShaking: true,
        write: false,
      });

      if (result.outputFiles.length !== 1) {
        throw new Error("Expected one browser bundle output");
      }
      if (result.outputFiles[0].text.includes("node:fs")) {
        throw new Error("Browser bundle still contains node:fs");
      }
    `;
    const proc = Bun.spawn([process.execPath, "-e", code], {
      cwd: repoRoot,
      stderr: "pipe",
      stdout: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(stderr).not.toContain('Could not resolve "node:fs"');
    expect({ stdout, stderr, exitCode }).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });
});
