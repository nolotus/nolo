import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "modelAvatar.ts"), "utf-8");

describe("modelAvatar source contract", () => {
  it("guards generated avatar components against null props before destructuring", () => {
    expect(source).toContain("const { size = 40, style, className } = rawProps ?? {};");
    expect(source).not.toContain("const AvatarComponent: AvatarCtor = ({");
  });

  it("supports CLI provider avatar fallbacks for published agents", () => {
    expect(source).toContain('if (cliProviderKey === "gemini") return get("gemini");');
    expect(source).toContain('if (cliProviderKey === "copilot") return get("copilot");');
    expect(source).toContain('if (cliProviderKey === "codex") return get("openai");');
    expect(source).toContain('if (cliProviderKey === "claude") return get("claude");');
    expect(source).toContain('if (cliProviderKey === "agy") return get("gemini");');
    expect(source).toContain('if (cliProviderKey === "qoder") return get("openai");');
    expect(source).toContain('if (cliProviderKey === "opencode") return get("openai");');
    expect(source).toContain('if (cliProviderKey === "grok") return get("grok");');
  });

  it("keeps Gemini avatar lightweight by avoiding the @lobehub/ui-backed Avatar component", () => {
    expect(source).not.toContain('import("@lobehub/icons/es/Gemini/components/Avatar")');
    expect(source).toContain('import("@lobehub/icons/es/Gemini/components/Color")');
    expect(source).toContain("const builtInAvatar = avatar?.default;");
  });
});
