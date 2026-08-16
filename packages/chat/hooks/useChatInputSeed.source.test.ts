import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "useChatInputSeed.ts"),
  "utf-8"
);

describe("useChatInputSeed source contract", () => {
  it("exports seed publishing and subscription API", () => {
    expect(source).toContain("export function publishChatInputSeed");
    expect(source).toContain("export function subscribeChatInputSeed");
    expect(source).toContain("export function useChatInputSeed");
  });

  it("supports both append and replace modes", () => {
    expect(source).toContain('mode: "append" | "replace"');
  });
});
