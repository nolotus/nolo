import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("growth report tool catalog source contract", () => {
  it("registers queryUserGrowthReport as a server-only utility tool", () => {
    // schema 定义注册在 index.ts（executor 是 serverOnlyResult 占位）
    const indexSource = readFileSync(join(import.meta.dir, "index.ts"), "utf8");
    expect(indexSource).toContain('id: "queryUserGrowthReport"');
    expect(indexSource).toContain("queryUserGrowthReportFunctionSchema");

    // 真实执行注册在 server 端 utilityServerTools（utility tool surface）
    const serverSource = readFileSync(
      join(import.meta.dir, "../../server/handlers/agentRun/utilityServerTools.ts"),
      "utf8",
    );
    expect(serverSource).toContain('"queryUserGrowthReport"');
    expect(serverSource).toContain("queryUserGrowthReport: runQueryUserGrowthReportTool");

    // 不再随 CORE 常驻（server-only，靠 agent 显式配置挂载）
    const packsSource = readFileSync(join(import.meta.dir, "toolPacks.ts"), "utf8");
    const coreBlock = packsSource.slice(
      packsSource.indexOf("CORE: ["),
      packsSource.indexOf("CORE: [") + 300,
    );
    expect(coreBlock).not.toContain("queryUserGrowthReport");
  });
});
