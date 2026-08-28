import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "Button.tsx"), "utf-8");
const css = readFileSync(join(import.meta.dir, "../ui.css"), "utf-8");

describe("Button loading state", () => {
  it("renders only the centered spinner while loading", () => {
    expect(source).toContain("const shouldRenderText = hasText && !loading;");
    expect(source).toContain("{loading ? (");
    expect(source).toContain("<span className=\"btn-spinner-wrap\" aria-hidden=\"true\" />");
    expect(source).toContain("{shouldRenderText && <span className=\"btn-text\">{children}</span>}");
    expect(source).not.toContain("{hasText && <span className=\"btn-text\">{children}</span>}");
    expect(source).not.toContain("{(icon || loading) && (");
    expect(source).not.toContain("LoadingSpinner");
    expect(source).not.toContain("{loading ? (\n                <LoadingSpinner");
    expect(css).toContain(".loading-spinner {\n      display: inline-block;\n      box-sizing: border-box;");
    expect(css).toContain(".btn-content--loading { position: absolute; inset: 0; transform: none; gap: 0; }");
    expect(css).toContain(".btn-spinner-wrap::before");
    expect(css).toContain("position: absolute;\n      inset: 0;");
    expect(css).toContain("border: 2px solid color-mix(in srgb, currentColor 36%, transparent);");
    expect(css).toContain("border-left-color: currentColor;");
    expect(css).toContain("border-right-color: currentColor;");
  });
});
