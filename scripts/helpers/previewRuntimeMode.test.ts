import { describe, expect, test } from "bun:test";

import { resolvePreviewRuntimeMode } from "./previewRuntimeMode";

describe("previewRuntimeMode", () => {
  test("defaults preview commands to shared data mode", () => {
    expect(resolvePreviewRuntimeMode({ args: new Map(), env: {} })).toBe("shared-data-preview");
  });

  test("defaults non-alpha branch previews to overlay mode", () => {
    expect(
      resolvePreviewRuntimeMode({
        args: new Map(),
        env: {},
        branch: "codex/preview-auth-tool",
      })
    ).toBe("overlay-preview");
  });

  test("keeps alpha branch previews in shared data mode", () => {
    expect(
      resolvePreviewRuntimeMode({
        args: new Map(),
        env: {},
        branch: "alpha",
      })
    ).toBe("shared-data-preview");
  });

  test("uses overlay preview mode for --no-core", () => {
    expect(resolvePreviewRuntimeMode({ args: new Map([["--no-core", ""]]), env: {} })).toBe("overlay-preview");
  });

  test("keeps the existing env escape hatch for overlay previews", () => {
    expect(resolvePreviewRuntimeMode({ args: new Map(), env: { NOLO_PREVIEW_DISABLE_CORE: "1" } })).toBe(
      "overlay-preview"
    );
  });

  test("supports explicit runtime mode values", () => {
    expect(resolvePreviewRuntimeMode({ args: new Map([["--runtime-mode", "overlay-preview"]]), env: {} })).toBe(
      "overlay-preview"
    );
    expect(resolvePreviewRuntimeMode({ args: new Map(), env: { NOLO_PREVIEW_RUNTIME_MODE: "shared-data-preview" } })).toBe(
      "shared-data-preview"
    );
  });

  test("rejects modes that preview commands cannot run", () => {
    expect(() => resolvePreviewRuntimeMode({ args: new Map([["--runtime-mode", "core-owner"]]), env: {} })).toThrow(
      "Unsupported preview runtime mode"
    );
  });
});
