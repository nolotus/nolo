import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "generateOpenAIRequestBody.ts"), "utf8");

describe("generateOpenAIRequestBody source contract", () => {
  it("does not load the full provider registry for reasoning-effort checks", () => {
    expect(source).not.toContain('from "ai/llm/providers"');
    expect(source).toContain('from "ai/llm/reasoningModels"');
  });
});
