import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "CodeBlock.tsx"), "utf8");

describe("CodeBlock inline artifact runtime", () => {
  it("uses the iframe artifact runtime for explicit React preview artifacts", () => {
    expect(source).toContain('const IframeArtifactBlock = lazy(() => import("./IframeArtifactBlock"))');
    expect(source).toContain("if (isReactPreviewArtifact)");
    expect(source).toContain("preloadArtifactRuntimeResources");
    expect(source).toContain("useInsertionEffect");
    expect(source).toContain("<IframeArtifactBlock");
    expect(source).not.toContain("ReactLiveBlock");
    expect(source).not.toContain("useLazyScope");
  });

  it("matches toolbar a11y: explicit button type and decorative maximize icon", () => {
    expect(source).toContain(
      [
        '<button',
        'type="button"',
        'className="fullscreen-close-button"',
      ].join("\n              ")
    );
    expect(source).toContain('<LuMaximize2 size={16} aria-hidden="true" />');
  });
});
