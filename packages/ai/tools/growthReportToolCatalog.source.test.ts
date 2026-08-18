import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("growth report tool catalog source contract", () => {
  it("registers queryUserGrowthReport in the utility tool surface", () => {
    const indexSource = readFileSync(join(import.meta.dir, "index.ts"), "utf8");
    const packsSource = readFileSync(join(import.meta.dir, "toolPacks.ts"), "utf8");

    expect(indexSource).toContain('id: "queryUserGrowthReport"');
    expect(indexSource).toContain("queryUserGrowthReportFunctionSchema");
    expect(packsSource).toContain('"queryUserGrowthReport"');
  });
});
