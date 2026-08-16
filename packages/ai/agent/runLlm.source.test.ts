import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (fileName: string) =>
  readFileSync(join(import.meta.dir, fileName), "utf-8");

describe("runLlm source contract", () => {
  it("supports llmConfig as a first-class input for single-turn model execution", () => {
    const agentSliceSource = readSource("agentSlice.ts");
    const executeModelSource = readSource("_executeModel.ts");

    expect(agentSliceSource).toContain("llmConfig?: Partial<Agent> & Pick<Agent, \"provider\" | \"model\">;");
    expect(executeModelSource).toContain("if (args.llmConfig) {");
    expect(executeModelSource).toContain("agentConfig = args.llmConfig;");
    expect(executeModelSource).toContain("No llmConfig, agentConfig, or agentKey provided.");
  });
});
