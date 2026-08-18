import { describe, expect, test } from "bun:test";

import {
  buildStaticUserPolicyContext,
  inferAgentSpaceNeed,
  inferCaptureIntent,
  resolveRuntimePolicy,
} from "./runtimePolicy";

describe("inferCaptureIntent", () => {
  test("treats skill import confirmations as strong capture intent", () => {
    expect(inferCaptureIntent("确认导入，并继续完成全部 3 步：导入 skill、doctorSkill、evalSkill。")).toBe("strong");
    expect(inferCaptureIntent("请导入这个 skill 文档。")).toBe("strong");
    expect(inferCaptureIntent("confirm import this skill and continue")).toBe("strong");
  });

  test("treats natural table creation phrasing as strong capture intent", () => {
    expect(inferCaptureIntent("请把这些指标建立成一张表")).toBe("strong");
    expect(inferCaptureIntent("帮我整理成表然后分享")).toBe("strong");
    expect(inferCaptureIntent("做一张表给我看")).toBe("strong");
    expect(inferCaptureIntent("采集这个用户并写入 table")).toBe("strong");
    expect(inferCaptureIntent("然后 createTable 并 addTableRow 写入一行。")).toBe("strong");
    expect(inferCaptureIntent("把结果记录下来，保存到 table")).toBe("strong");
    expect(inferCaptureIntent("做成数据集方便后续分析")).toBe("strong");
  });
});

describe("inferAgentSpaceNeed", () => {
  test("keeps agents without references at no automatic space need", () => {
    expect(inferAgentSpaceNeed({ prompt: "Just chat." })).toBe("none");
  });

  test("treats referenced agents as light workspace readers by default", () => {
    expect(
      inferAgentSpaceNeed({
        references: [{ dbKey: "page-user-general", title: "General Notes" }],
      }),
    ).toBe("light");
  });

  test("treats doc-index knowledge agents as deep workspace readers", () => {
    expect(
      inferAgentSpaceNeed({
        prompt: "先读取总索引，再读取对应 doc；不要编造出处。",
        references: [
          {
            dbKey: "page-user-doc-index",
            title: "Course Docs Index",
            type: "knowledge",
          },
        ],
      }),
    ).toBe("deep");
  });
});

describe("resolveRuntimePolicy space context", () => {
  test("does not increase read budget for ordinary agents", () => {
    const policy = resolveRuntimePolicy({
      agentConfig: { prompt: "Just chat." },
      userInput: "你好",
    });

    expect(policy.spaceContext).toMatchObject({
      need: "none",
      maxReadCallsPerTurn: 1,
      maxReadCallsPerDialog: 2,
    });
  });

  test("raises referenced knowledge agents to deep read budget without changing user preference", () => {
    const policy = resolveRuntimePolicy({
      agentConfig: {
        prompt: "先读取总索引，再读取对应 doc。",
        references: [
          {
            dbKey: "page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001",
            title: "倪海厦 TCM Agent Pack Docs Index",
            type: "knowledge",
          },
        ],
      },
      userInput: "没有汗，怕冷重，麻黄汤和葛根汤怎么分？",
    });

    expect(policy.spaceContext).toMatchObject({
      level: 3,
      explicitRequest: false,
      need: "deep",
      maxReadCallsPerTurn: 6,
      maxReadCallsPerDialog: 16,
    });
  });

  test("gives multi-turn doc-index agents enough dialog read budget after an initial research turn", () => {
    const policy = resolveRuntimePolicy({
      agentConfig: {
        prompt: "先读取总索引，再读取对应 doc；课程资料学习助手。",
        references: [
          {
            dbKey: "page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001",
            title: "倪海厦 TCM Agent Pack Docs Index",
            type: "knowledge",
          },
        ],
      },
      userInput: "继续上轮，麻黄汤和葛根汤怎么分？",
      dialogPolicyState: {
        autoSpaceReadCount: 6,
      },
    });

    expect(policy.spaceContext).toMatchObject({
      need: "deep",
      currentAutoReads: 6,
      maxReadCallsPerTurn: 6,
      maxReadCallsPerDialog: 16,
    });
  });
});

describe("buildStaticUserPolicyContext", () => {
  test("explains numeric preference levels in the prompt", () => {
    const context = buildStaticUserPolicyContext({
      settingsRecord: {
        knowledgeCaptureLevel: 2,
        spaceContextLevel: 3,
      },
    });

    expect(context).toContain("知识沉淀级别：2（先问再创建）");
    expect(context).toContain("空间上下文级别：3（轻量读取）");
  });
});
