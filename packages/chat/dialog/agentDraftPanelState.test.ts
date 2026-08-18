import { describe, expect, it } from "bun:test";

import { resolveLatestAgentDraftSidePanelState } from "./agentDraftPanelState";

const buildDraft = (name: string) => ({
  name,
  introduction: `${name} intro`,
  prompt: `${name} prompt`,
  promptSummary: `${name} summary`,
  provider: "openai",
  model: "gpt-5-mini",
  isPublic: false,
  capabilityIds: ["docs"],
  toolIds: ["read"],
  references: [],
  tags: [],
  unresolved: [],
});

describe("resolveLatestAgentDraftSidePanelState", () => {
  it("shows the latest draft while creation has not completed", () => {
    const state = resolveLatestAgentDraftSidePanelState([
      {
        toolName: "prepareAgentDraft",
        content: JSON.stringify({ version: 1, draft: buildDraft("摘要助手") }),
      },
      {
        toolName: "prepareAgentDraft",
        content: JSON.stringify({ version: 2, draft: buildDraft("复盘教练") }),
      },
    ]);

    expect(state).toMatchObject({
      kind: "draft",
      version: 2,
      draft: {
        name: "复盘教练",
      },
    });
  });

  it("shows created state when createAgent is newer than the latest draft", () => {
    const state = resolveLatestAgentDraftSidePanelState([
      {
        toolName: "prepareAgentDraft",
        content: JSON.stringify({ version: 1, draft: buildDraft("摘要助手") }),
      },
      {
        toolName: "prepareAgentDraft",
        content: JSON.stringify({ version: 2, draft: buildDraft("复盘教练") }),
      },
      {
        toolName: "createAgent",
        content: JSON.stringify({
          dbKey: "agent-user-1-created",
          id: "created",
          userId: "user-1",
          name: "阅读复盘教练",
          introduction: "整理阅读书划线。",
          prompt: "输出主题聚类和复盘问题。",
          provider: "openai",
          model: "gpt-5-mini",
          tools: ["workspace-read", "dialog-continuation"],
          isPublic: false,
        }),
      },
    ]);

    expect(state).toMatchObject({
      kind: "created",
      version: 2,
      draft: {
        name: "阅读复盘教练",
        capabilityIds: ["workspace-read", "dialog-continuation"],
      },
      createdAgent: {
        dbKey: "agent-user-1-created",
      },
    });
  });
});
