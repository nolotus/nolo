import { describe, expect, it } from "bun:test";

import { CAPABILITY_PACK_BY_ID, applyDisabledTools } from "./toolPacks";

describe("CapabilityPackSelector – skills ensure 联动", () => {
  it("取消 skills 后 disabledTools 含 loadSkill/readSkillDoc，applyDisabledTools 后模型面不含二者", async () => {
    // 1. skills 包定义包含 loadSkill / readSkillDoc
    const skillsPack = CAPABILITY_PACK_BY_ID["skills"];
    expect(skillsPack).toBeDefined();
    expect(skillsPack.tools).toContain("loadSkill");
    expect(skillsPack.tools).toContain("readSkillDoc");

    // 2. selector 源码将 skills 列入 RUNTIME_ENSURED_PACK_IDS（取消勾选→写 disabledTools）
    const source = await Bun.file(
      new URL("./CapabilityPackSelector.tsx", import.meta.url),
    ).text();
    expect(source).toMatch(/RUNTIME_ENSURED_PACK_IDS\s*=\s*\[.*"skills"/);

    // 3. applyDisabledTools 在 ensure 之后执行，移除包工具
    const modelTools = ["loadSkill", "readSkillDoc", "readFile", "exa_search"];
    const result = applyDisabledTools(modelTools, ["loadSkill", "readSkillDoc"]);
    expect(result).not.toContain("loadSkill");
    expect(result).not.toContain("readSkillDoc");
    expect(result).toContain("readFile");
    expect(result).toContain("exa_search");
  });
});
