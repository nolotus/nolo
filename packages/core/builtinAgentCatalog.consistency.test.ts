import { describe, expect, it } from "bun:test";
import {
  BUILTIN_AGENT_CATALOG,
  builtinAgentCatalogEntryById,
  builtinPlatformEntries,
  builtinRuntimeFallbackEntries,
  type BuiltinAgentCatalogEntry,
} from "./builtinAgentCatalog";

describe("BUILTIN_AGENT_CATALOG static contract", () => {
  it("contains unique valid IDs for all entries", () => {
    const seenIds = new Set<string>();
    for (const entry of BUILTIN_AGENT_CATALOG) {
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThanOrEqual(20);
      expect(entry.id.startsWith("01")).toBe(true);
      expect(seenIds.has(entry.id), `Duplicate catalog id found: ${entry.id}`).toBe(false);
      seenIds.add(entry.id);
    }
  });

  it("has valid groups and non-empty names/models/providers", () => {
    const validGroups = new Set(["builtin", "public", "internal"]);
    for (const entry of BUILTIN_AGENT_CATALOG) {
      expect(validGroups.has(entry.group), `Invalid group '${entry.group}' on ${entry.id}`).toBe(true);
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.model.trim().length).toBeGreaterThan(0);
      expect(entry.provider.trim().length).toBeGreaterThan(0);
    }
  });

  it("ensures lookup by ID works accurately", () => {
    for (const entry of BUILTIN_AGENT_CATALOG) {
      const found = builtinAgentCatalogEntryById(entry.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(entry.id);
      expect(found?.name).toBe(entry.name);
      expect(found?.model).toBe(entry.model);
    }
    expect(builtinAgentCatalogEntryById("non-existent-id")).toBeUndefined();
    expect(builtinAgentCatalogEntryById(undefined)).toBeUndefined();
  });

  it("ensures platform builtin entries exactly match the platform 6 keys", () => {
    const platformEntries = builtinPlatformEntries();
    expect(platformEntries.length).toBe(6);
    const platformIds = platformEntries.map((e) => e.id);
    expect(platformIds).toContain("01NOLOAPPBLD000000019KCKT0"); // nolo
    expect(platformIds).toContain("01APPBUILDER00000001YAII3I"); // 应用构建助手
    expect(platformIds).toContain("01ECOMMERCEAG00000001PYQ2J"); // 电商商品参数助手
    expect(platformIds).toContain("01NOLOAGENTCRT000000000001"); // AI 创建助手
    expect(platformIds).toContain("01NOLOFEEDBACKA000000000R2"); // 反馈入口
    expect(platformIds).toContain("01CHROMEOPR000000000001"); // Chrome 操作员
  });

  it("ensures all image workflow presets declare valid image fields", () => {
    const imageEntries = BUILTIN_AGENT_CATALOG.filter((e) => e.hasImageOutput);
    expect(imageEntries.length).toBeGreaterThanOrEqual(4);
    for (const entry of imageEntries) {
      expect(entry.hasImageOutput).toBe(true);
      if (entry.imageWorkflow) {
        expect(["generate", "edit", "continuous"]).toContain(entry.imageWorkflow);
      }
    }
  });

  it("keeps the nolo default entry self-consistent (preventing Kimi divergence recurrence)", () => {
    // 断言「身份」而不是具体型号：这条测试本来就是为了防止 nolo 的模型悄悄
    // 漂回 Kimi，结果它自己硬编码了 "deepseek-v4-flash"，catalog 换代到
    // vision-exp 之后反倒是它先挂——防回归的测试成了第一个过期的东西。
    //
    // 换代应该只改 catalog 一处。这里只锁三件不随型号变化的事：
    // 条目存在、名字是 nolo、provider 是平台托管、需要运行时兜底。
    const noloDefault = builtinAgentCatalogEntryById("01NOLOAPPBLD000000019KCKT0");
    expect(noloDefault).toBeDefined();
    expect(noloDefault?.name).toBe("nolo");
    expect(noloDefault?.provider).toBe("nolo");
    expect(noloDefault?.runtimeFallback).toBe(true);
    // 型号本身只要求非空且不是那个引发分叉的旧值。
    expect(noloDefault?.model.length).toBeGreaterThan(0);
    expect(noloDefault?.model).not.toBe("kimi-k2.6");
  });

  it("ensures all public pure text model entries reference non-empty models and providers", () => {
    const publicTextEntries = BUILTIN_AGENT_CATALOG.filter(
      (e) => e.group === "public" && !e.hasImageOutput,
    );
    expect(publicTextEntries.length).toBeGreaterThanOrEqual(10);
    for (const entry of publicTextEntries) {
      expect(entry.model).toBeDefined();
      expect(entry.model.length).toBeGreaterThan(0);
      expect(entry.provider).toBeDefined();
      expect(entry.provider.length).toBeGreaterThan(0);
    }
  });
});
