import { describe, expect, test } from "bun:test";

import {
  BUILTIN_OBJECT_SKILL_IDS,
  buildBuiltinObjectSkillDbKey,
  buildBuiltinObjectSkillPageContent,
  buildBuiltinObjectSkillReference,
} from "./builtinObjectSkills";
import { resolvePageSkillMetadata } from "./skillDocProtocol";

describe("builtinObjectSkills", () => {
  test("dbKey 使用确定性格式 page-{userId}-{skillId}", () => {
    expect(buildBuiltinObjectSkillDbKey("table", "user1")).toBe(
      "page-user1-builtin-table-skill-v1",
    );
    expect(buildBuiltinObjectSkillDbKey("doc", "user1")).toBe(
      "page-user1-builtin-doc-skill-v1",
    );
    expect(buildBuiltinObjectSkillDbKey("code-style", "user1")).toBe(
      "page-user1-builtin-code-skill-v1",
    );
    expect(buildBuiltinObjectSkillDbKey("pagebuilder", "user1")).toBe(
      "page-user1-builtin-pagebuilder-skill-v1",
    );
  });

  test("表格 skill page content 解析出完整工具集与操作指南", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("table"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS.table);
    expect(meta?.skillConfig?.toolNames).toEqual([
      "createTable",
      "addTableRow",
      "addTableRows",
      "queryTableRows",
      "updateTableRow",
      "deleteTableRow",
    ]);
    expect(meta?.skillConfig?.promptPatch).toContain("addTableRow");
    expect(meta?.skillConfig?.promptPatch).toContain("绝不要传空对象");
    expect(meta?.skillConfig?.description).toContain("建表");
  });

  test("文档 skill page content 解析出 readDoc/updateDoc 与编辑指南", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("doc"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS.doc);
    expect(meta?.skillConfig?.toolNames).toEqual(["readDoc", "updateDoc"]);
    expect(meta?.skillConfig?.promptPatch).toContain("readDoc");
    expect(meta?.skillConfig?.promptPatch).toContain("定点增量编辑");
  });

  test("代码 skill page content 解析出编码规范与 PromptPatch", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("code-style"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS["code-style"]);
    expect(meta?.skillConfig?.name).toBe("编码风格技能");
    expect(meta?.skillConfig?.toolNames).toBeUndefined();
    expect(meta?.skillConfig?.promptPatch).toContain("MANY SMALL FILES");
    expect(meta?.skillConfig?.promptPatch).toContain("200-400");
    expect(meta?.skillConfig?.promptPatch).toContain("800");
    expect(meta?.skillConfig?.promptPatch).toContain("<50 lines");
    expect(meta?.skillConfig?.promptPatch).toContain("nesting ≤4");
    expect(meta?.skillConfig?.promptPatch).toContain("early returns");
    expect(meta?.skillConfig?.promptPatch).toContain("immutability");
    expect(meta?.skillConfig?.promptPatch).toContain("explicit error handling");
    expect(meta?.skillConfig?.promptPatch).toContain("validate at boundaries");
    expect(meta?.skillConfig?.promptPatch).toContain("Checklist");
  });

  test("ReferenceItem 指向确定性 dbKey 且类型为 instruction", () => {
    const tableRef = buildBuiltinObjectSkillReference("table", "user1");
    expect(tableRef).toEqual({
      dbKey: "page-user1-builtin-table-skill-v1",
      title: "表格编辑技能",
      type: "instruction",
    });
    const codeRef = buildBuiltinObjectSkillReference("code-style", "user1");
    expect(codeRef).toEqual({
      dbKey: "page-user1-builtin-code-skill-v1",
      title: "编码风格技能",
      type: "instruction",
    });
    const imageRef = buildBuiltinObjectSkillReference("image", "user1");
    expect(imageRef).toEqual({
      dbKey: "page-user1-builtin-image-skill-v1",
      title: "图片分析技能",
      type: "instruction",
    });
    const fileRef = buildBuiltinObjectSkillReference("file", "user1");
    expect(fileRef).toEqual({
      dbKey: "page-user1-builtin-file-skill-v1",
      title: "文件处理技能",
      type: "instruction",
    });
    const pagebuilderRef = buildBuiltinObjectSkillReference("pagebuilder", "user1");
    expect(pagebuilderRef).toEqual({
      dbKey: "page-user1-builtin-pagebuilder-skill-v1",
      title: "动态交互组件生成技能",
      type: "instruction",
    });
  });

  test("图片 skill page content 解析出图片分析指南（无工具）", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("image"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS.image);
    expect(meta?.skillConfig?.name).toBe("图片分析技能");
    expect(meta?.skillConfig?.toolNames).toBeUndefined();
    expect(meta?.skillConfig?.promptPatch).toContain("图片分析指南");
    expect(meta?.skillConfig?.promptPatch).toContain("不要假装已经具备复杂图片编辑能力");
    expect(meta?.skillConfig?.description).toContain("图片");
  });

  test("文件 skill page content 解析出文件处理指南（无工具）", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("file"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS.file);
    expect(meta?.skillConfig?.name).toBe("文件处理技能");
    expect(meta?.skillConfig?.toolNames).toBeUndefined();
    expect(meta?.skillConfig?.promptPatch).toContain("文件处理指南");
    expect(meta?.skillConfig?.promptPatch).toContain("占位型工作流入口");
    expect(meta?.skillConfig?.description).toContain("文件");
  });

  test("pagebuilder skill page content 解析出交互组件生成规则", () => {
    const meta = resolvePageSkillMetadata({
      content: buildBuiltinObjectSkillPageContent("pagebuilder"),
    });
    expect(meta?.skillConfig?.id).toBe(BUILTIN_OBJECT_SKILL_IDS.pagebuilder);
    expect(meta?.skillConfig?.name).toBe("动态交互组件生成技能");
    expect(meta?.skillConfig?.toolNames).toBeUndefined();
    expect(meta?.skillConfig?.promptPatch).toContain("tsx preview");
    expect(meta?.skillConfig?.promptPatch).toContain("function Example()");
    expect(meta?.skillConfig?.promptPatch).toContain("data-artifact-section");
    expect(meta?.skillConfig?.promptPatch).toContain("不要写 import");
    expect(meta?.skillConfig?.promptPatch).toContain("ReactECharts");
    expect(meta?.skillConfig?.promptPatch).toContain("150-260 行");
    expect(meta?.skillConfig?.description).toContain("看板");
    expect(meta?.skillConfig?.description).toContain("日报");
  });
});
