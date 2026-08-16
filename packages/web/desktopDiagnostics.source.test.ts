import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "entry.tsx"), "utf8");

describe("desktop renderer diagnostics", () => {
  it("bridges fatal renderer errors to the desktop host", () => {
    expect(source).toContain("sendDesktopDiagnostic");
    expect(source).toContain('window.addEventListener("error"');
    expect(source).toContain('window.addEventListener("unhandledrejection"');
    expect(source).toContain("nolo-desktop-diagnostic");
    expect(source).toContain("renderer-error");
    expect(source).toContain("renderer-unhandledrejection");
  });

  it("records privacy-safe typing breadcrumbs without sending typed content", () => {
    expect(source).toContain("installDesktopInputDiagnostics");
    expect(source).toContain('document.addEventListener("beforeinput"');
    expect(source).toContain('document.addEventListener("compositionstart"');
    expect(source).toContain('document.addEventListener("compositionend"');
    expect(source).toContain("inputValueLength");
    expect(source).toContain("activeElementTag");
    expect(source).not.toContain("inputValue:");
    expect(source).not.toContain("textContent:");
  });
});
