import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "customCodingAgentFlow.ts"),
  "utf-8"
);

describe("customCodingAgentFlow source contract", () => {
  it("guides custom coding agents to inspect runtime context before shell usage", () => {
    expect(source).toContain("checkEnv({check:'context'})");
    expect(source).toContain("Windows 默认使用 PowerShell 语法");
    expect(source).toContain("Linux/macOS 默认使用 bash 语法");
  });

  it("keeps long-term memory available for custom coding agents", () => {
    expect(source).toContain("rememberMemory");
    expect(source).toContain("enabledPacks");
  });
});
