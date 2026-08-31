import { describe, expect, it } from "bun:test";
import {
  alignBuiltinObjectAssistantRecord,
  buildBuiltinObjectAssistantAgentFromKey,
  buildObjectAssistantSidebarId,
  buildBuiltinObjectAssistantAgent,
  buildObjectAssistantRuntimeOptions,
  getPreferredObjectAssistantKey,
  isObjectAssistantSidebarId,
  resolveBuiltinObjectAssistantKindByKey,
} from "./objectAssistantRegistry";

describe("objectAssistantRegistry", () => {
  it("returns deterministic preferred keys for builtin object assistants", () => {
    expect(getPreferredObjectAssistantKey("page", "user-1")[0]).toContain(
      "agent-user-1-builtin-doc-assistant-v1",
    );
    expect(getPreferredObjectAssistantKey("table", "user-1")[0]).toContain(
      "agent-user-1-builtin-table-assistant-v1",
    );
  });

  it("repairs legacy builtin object assistant prices while preserving the record", () => {
    const agent = buildBuiltinObjectAssistantAgent("page", "user-1");
    const legacy = { ...agent, inputPrice: 3.6, outputPrice: 10.8 };
    const repaired = alignBuiltinObjectAssistantRecord(legacy);

    expect(repaired).toEqual({ ...legacy, inputPrice: 0, outputPrice: 0 });
  });

  it("does not repair builtin records whose model was changed by the user", () => {
    const agent = buildBuiltinObjectAssistantAgent("page", "user-1");
    expect(
      alignBuiltinObjectAssistantRecord({ ...agent, model: "user-selected-model", inputPrice: 3.6 })
    ).toBeNull();
  });

  it("does not repair already aligned builtin records", () => {
    expect(
      alignBuiltinObjectAssistantRecord(buildBuiltinObjectAssistantAgent("page", "user-1"))
    ).toBeNull();
  });

  it("does not repair non-builtin agents", () => {
    const agent = buildBuiltinObjectAssistantAgent("page", "user-1");
    expect(
      alignBuiltinObjectAssistantRecord({ ...agent, id: "custom-agent", inputPrice: 3.6 })
    ).toBeNull();
  });

  it("builds builtin page assistant agent with guided greeting and skill reference", () => {
    const agent = buildBuiltinObjectAssistantAgent("page", "user-1");
    expect(agent.name).toBe("文档助手");
    // 工具不再挂在 agent.tools 上，改为 references 指向内置 skill page
    expect(agent.tools).toBeUndefined();
    expect(agent.references).toEqual([
      {
        dbKey: "page-user-1-builtin-doc-skill-v1",
        title: "文档编辑技能",
        type: "instruction",
      },
    ]);
    expect(String(agent.greeting)).toContain("[object Object]");
    expect((agent.greeting as any).text).toContain("文档助手");
  });

  it("builds builtin table assistant agent with references instead of tools", () => {
    const agent = buildBuiltinObjectAssistantAgent("table", "user-1");
    expect(agent.tools).toBeUndefined();
    expect(agent.references).toEqual([
      {
        dbKey: "page-user-1-builtin-table-skill-v1",
        title: "表格编辑技能",
        type: "instruction",
      },
    ]);
  });

  it("builds builtin image assistant agent with references instead of tools", () => {
    const agent = buildBuiltinObjectAssistantAgent("image", "user-1");
    expect(agent.tools).toBeUndefined();
    expect(agent.references).toEqual([
      {
        dbKey: "page-user-1-builtin-image-skill-v1",
        title: "图片分析技能",
        type: "instruction",
      },
    ]);
    expect(agent.name).toBe("图片助手");
  });

  it("builds builtin file assistant agent with references instead of tools", () => {
    const agent = buildBuiltinObjectAssistantAgent("file", "user-1");
    expect(agent.tools).toBeUndefined();
    expect(agent.references).toEqual([
      {
        dbKey: "page-user-1-builtin-file-skill-v1",
        title: "文件处理技能",
        type: "instruction",
      },
    ]);
    expect(agent.name).toBe("文件助手");
  });

  it("builds runtime options for table and file objects", () => {
    const appOptions = buildObjectAssistantRuntimeOptions({
      kind: "app",
      contentKey: "app-123",
      title: "Landing Builder",
    });

    expect(appOptions.editingTarget?.kind).toBe("app");
    expect(appOptions.extraTools).toEqual(
      expect.arrayContaining(["appRead", "appPreflight", "appDeploy", "openAIGptImage"]),
    );

    const tableOptions = buildObjectAssistantRuntimeOptions({
      kind: "table",
      contentKey: "meta-tenant-1-table-1",
      title: "销售表",
      metadata: {
        rowCount: 12,
        columnNames: ["name", "status"],
      },
    });

    expect(tableOptions.editingTarget?.kind).toBe("table");
    // page/table 的工具挂载已迁移到 skill references，runtimeOptions 不再注入 extraTools
    expect(tableOptions.extraTools).toBeUndefined();

    const fileOptions = buildObjectAssistantRuntimeOptions({
      kind: "file",
      contentKey: "file-123",
      title: "报价单.pdf",
    });

    expect(fileOptions.editingTarget?.kind).toBe("file");
    expect(fileOptions.editingTarget?.title).toBe("报价单.pdf");
  });

  it("uses unified sidebar ids for every object assistant", () => {
    expect(buildObjectAssistantSidebarId("app", "app-123")).toBe(
      "objectAssistant:app:app-123",
    );
    expect(buildObjectAssistantSidebarId("page")).toBe(
      "objectAssistant:page:current",
    );
    expect(isObjectAssistantSidebarId("objectAssistant:image:file-1")).toBe(true);
    expect(isObjectAssistantSidebarId("pageAssistant:image:file-1")).toBe(false);
  });

  it("resolves builtin assistant kinds and agents from deterministic keys", () => {
    const pageKey = getPreferredObjectAssistantKey("page", "user-1")[0];

    expect(resolveBuiltinObjectAssistantKindByKey(pageKey, "user-1")).toBe("page");
    expect(resolveBuiltinObjectAssistantKindByKey(pageKey, "user-2")).toBeNull();

    const agent = buildBuiltinObjectAssistantAgentFromKey(pageKey, "user-1");
    expect(agent?.dbKey).toBe(pageKey);
    expect(agent?.name).toBe("文档助手");
  });
});
