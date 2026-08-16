import { describe, expect, it } from "bun:test";
import { buildContextLayerContractBlock } from "./contextLayerContract";

describe("contextLayerContract", () => {
  it("defines clear boundaries between memory knowledge and docs", () => {
    const block = buildContextLayerContractBlock();

    expect(block).toContain("--- 知识存储约定 ---");
    expect(block).toContain("1. memory layer");
    expect(block).toContain("2. knowledge layer");
    expect(block).toContain("3. doc layer");
    expect(block).toContain("临时步骤、原始长日志");
  });

  it("encourages rememberMemory and docs when those tools exist", () => {
    const block = buildContextLayerContractBlock({
      hasRememberMemoryTool: true,
      hasDocTools: true,
    });

    expect(block).toContain("rememberMemory");
    expect(block).toContain("space memory");
    expect(block).toContain("mission / runbook / incident / checkpoint / idea backlog / experiment log");
  });
});
