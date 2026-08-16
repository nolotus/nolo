import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildArtifactRuntimeCode } from "./IframeArtifactBlock";

describe("buildArtifactRuntimeCode", () => {
  it("compiles TSX artifact code for the iframe runtime", () => {
    const result = buildArtifactRuntimeCode(`
function Example() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>点 {count}</button>;
}
`);

    expect(result.error).toBeNull();
    expect(result.code).toContain("function Example()");
    expect(result.code).toContain("React.createElement('button'");
    expect(result.code).not.toContain("window.__noloArtifactRender");
  });

  it("adds fallback bindings for direct lucide icon references", () => {
    const result = buildArtifactRuntimeCode(`
function Example() {
  const Icon = LuNotARealIcon;
  return <main><Icon size={18} /></main>;
}
`);

    expect(result.error).toBeNull();
    expect(result.code).toContain('__noloArtifactPreloadIcons(["LuNotARealIcon"]);');
    expect(result.code).toContain(
      "const LuNotARealIcon = Icons.LuNotARealIcon || Icons.LuSparkles;"
    );
  });

  it("rejects snippets without the Example component contract", () => {
    const result = buildArtifactRuntimeCode("const value = 1;");

    expect(result.code).toBeNull();
    expect(result.error).toContain("function Example");
  });
});

describe("iframe artifact interaction contract", () => {
  const blockSource = readFileSync(
    join(import.meta.dir, "IframeArtifactBlock.tsx"),
    "utf8"
  );
  const runtimeSource = readFileSync(
    join(import.meta.dir, "ArtifactRuntimePage.tsx"),
    "utf8"
  );
  const preloadSource = readFileSync(
    join(import.meta.dir, "artifactRuntimePreload.ts"),
    "utf8"
  );
  const cssSource = readFileSync(join(import.meta.dir, "../elements.css"), "utf8");

  it("keeps inline previews bounded while fullscreen fills the modal", () => {
    expect(blockSource).toContain("const INLINE_MAX_HEIGHT = 720");
    expect(blockSource).toContain('height: fullscreen ? "100%" : height');
    expect(cssSource).toContain(".preview-content-fullscreen");
    expect(cssSource).toContain("height: 100%");
  });

  it("uses the srcDoc fast path only in local dev", () => {
    expect(preloadSource).toContain('const ARTIFACT_RUNTIME_SCRIPT_URL = "/artifact-runtime-script"');
    expect(preloadSource).toContain("window.__NOLO_ASSETS__?.artifactRuntimeJs");
    expect(blockSource).toContain("function shouldUseSrcDocRuntime()");
    expect(blockSource).toContain("(window as any).__IS_PRODUCTION_BUILD__ === false");
    expect(blockSource).toContain("function buildRuntimeSrcDoc(");
    expect(blockSource).toContain("src={runtimeSrcDoc ? undefined : runtimeUrl}");
    expect(blockSource).toContain("srcDoc={runtimeSrcDoc}");
  });

  it("caches compiled artifact code across remounts", () => {
    expect(blockSource).toContain("const runtimeCodeCache = new Map");
    expect(blockSource).toContain("runtimeCodeCache.get(rawCode)");
    expect(blockSource).toContain("MAX_RUNTIME_CODE_CACHE_SIZE");
  });

  it("preloads the artifact runtime before the iframe competes with app chunks", () => {
    expect(preloadSource).toContain("function preloadArtifactRuntimeResources()");
    expect(preloadSource).toContain("artifactRuntimePreloads");
    expect(preloadSource).toContain('fetchPriority?: string }).fetchPriority = "high"');
    expect(blockSource).toContain("useInsertionEffect(preloadArtifactRuntimeResources");
    expect(blockSource).toContain('fetchPriority: "high"');
  });

  it("allows long generated reports to scroll inside the iframe runtime", () => {
    expect(runtimeSource).toContain("function markArtifactReady()");
    expect(runtimeSource).toContain("useLayoutEffect");
    expect(runtimeSource).not.toContain("window.setTimeout");
    expect(runtimeSource).toContain("overflow: auto");
    expect(runtimeSource).toContain("overscroll-behavior: contain");
  });

  it("keeps chart rendering out of the artifact runtime startup path", () => {
    expect(runtimeSource).not.toContain('import ReactECharts from "echarts-for-react"');
    expect(runtimeSource).toContain('await import("echarts-for-react")');
    expect(runtimeSource).toContain("<React.Suspense");
  });

  it("does not import the complete lucide icon pack into artifact startup", () => {
    expect(runtimeSource).not.toContain('import * as Icons from "react-icons/lu"');
    expect(runtimeSource).not.toContain('from "react-icons/lu"');
    expect(runtimeSource).toContain("/artifact-icons?names=");
    expect(runtimeSource).toContain("createDeferredIcon");
  });
});
