import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const toolIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const toolSource = readFileSync(new URL("./openaiImageTool.ts", import.meta.url), "utf8");

describe("openaiImageTool registry source contract", () => {
  it("registers GPT Image 2 generate and edit tool definitions", () => {
    expect(toolIndexSource).toContain("openAIGptImageGenerateFunctionSchema");
    expect(toolIndexSource).toContain("openAIGptImageEditFunctionSchema");
    expect(toolIndexSource).toContain('id: "openAIGptImageGenerate"');
    expect(toolIndexSource).toContain('id: "openAIGptImageEdit"');
    expect(toolIndexSource).toContain("executor: openAIGptImageGenerateFunc");
    expect(toolIndexSource).toContain("executor: openAIGptImageEditFunc");
  });

  it("documents opaque backgrounds for GPT Image 2 generate/edit flows", () => {
    expect(toolSource).toContain("GPT Image 2 当前不支持 transparent background");
    expect(toolSource).toMatch(/默认传 background: \\"opaque\\"/);
    expect(toolSource).toContain("如果 outputFormat 是 png");
    expect(toolSource).toContain("不要传 outputCompression");
  });
});
