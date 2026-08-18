import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
} from "./dialogRuntimeStore";

const dispatchCalls: unknown[] = [];
const navigateCalls: unknown[] = [];
const startDialogMock = mock();

async function installModuleMocks() {
  const actualDialogSlice = await import("chat/dialog/dialogSlice");

  mock.module("app/store", () => ({
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return { unwrap: async () => action };
    },
    useAppSelector: (selector: (state: unknown) => unknown) =>
      selector({ dialog: {} }),
  }));

  // Only stub slice-owned actions. Never replace dialogRuntimeStore re-exports
  // (useCurrentDialogKey / enqueueUserInput / …) — Bun mock.module live
  // bindings poison the store module for later suites.
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    handleSendMessage: (payload: unknown) => ({
      type: "dialog/handleSendMessage",
      payload,
    }),
  }));

  mock.module("ai/agent/hooks/useAgentDialog", () => ({
    useAgentDialog: () => ({
      isStarting: false,
      startDialog: startDialogMock,
    }),
  }));

  mock.module("app/routing", () => ({
    Link: ({ children, to, ...props }: any) => (
      <a href={String(to ?? "#")} {...props}>
        {children}
      </a>
    ),
    NavLink: ({ children, to, ...props }: any) => (
      <a href={String(to ?? "#")} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({
      hash: "",
      pathname: "/dialog-user-1",
      search: "",
    }),
    useNavigate: () => (...args: unknown[]) => {
      navigateCalls.push(args);
    },
  }));

  return { actualDialogSlice };
}

import React from "react";
import { renderInDom } from "../../testing/domRender";

let moduleVersion = 0;

async function loadPanel() {
  dispatchCalls.length = 0;
  navigateCalls.length = 0;
  startDialogMock.mockClear();
  setActiveDialogKey("dialog-user-1");
  const { actualDialogSlice } = await installModuleMocks();
  const mod = await import(`./AgentDraftPanel.tsx?test=${moduleVersion++}`);
  mock.module("chat/dialog/dialogSlice", () => actualDialogSlice);
  return mod.AgentDraftPanel;
}

const draft = {
  name: "阅读复盘教练",
  introduction: "整理阅读书划线。",
  prompt: "输出主题聚类和复盘问题。",
  promptSummary: "",
  provider: "openai",
  model: "gpt-5-mini",
  isPublic: false,
  capabilityIds: ["docs"],
  toolIds: ["read"],
  references: [
    {
      dbKey: "page-reading-guide",
      title: "阅读复盘方法",
      type: "instruction",
      selected: true,
    },
  ],
  tags: [],
  unresolved: [],
  assemblyNotes: ["Agent = prompt + knowledge + tools + skills/workflows + eval 的可运行封装。"],
  suggestedSkillIdeas: ["划线聚类 skill：把摘录归并为主题。"],
  suggestedWorkflowIdeas: ["阅读复盘 workflow：读取资料 -> 聚类主题 -> 生成追问。"],
  suggestedEvalCases: ["输入零散摘录时，应输出主题聚类和复盘问题。"],
};

describe("AgentDraftPanel", () => {
  beforeEach(() => {
    resetDialogRuntimeStoreForTests();
  });
  afterEach(() => {
    resetDialogRuntimeStoreForTests();
  });

  it("shows created state instead of another confirm action after createAgent succeeds", async () => {
    const AgentDraftPanel = await loadPanel();
    const view = await renderInDom(
      <AgentDraftPanel
        initialDraft={draft as any}
        version={2}
        createdAgent={{
          dbKey: "agent-user-1-created",
          id: "created",
          userId: "user-1",
          name: "阅读复盘教练",
          model: "gpt-5-mini",
          provider: "openai",
          prompt: "输出主题聚类和复盘问题。",
          introduction: "整理阅读书划线。",
          isPublic: false,
        } as any}
        onClose={() => undefined}
      />,
    );

    try {
      expect(view.container.textContent).toContain("Agent 已创建");
      expect(view.container.textContent).toContain("可以开始使用");
      expect(view.container.textContent).toContain("开始和它对话");
      expect(view.container.textContent).toContain("直接开始用；我会根据这个 Agent 自动处理需要的能力。");
      expect(view.container.textContent).not.toContain("生成评估用例");
      expect(view.container.textContent).not.toContain("沉淀 skill/workflow");
      expect(view.container.textContent).toContain("读写文档");
      expect(view.container.textContent).not.toContain("能力 ID");
      expect(view.container.textContent).toContain("高级技术标识");
      expect(view.container.textContent).not.toContain("确认创建");

      const startButton = view.getByRole("button", { name: /开始/ });
      await view.click(startButton);
      expect(startDialogMock).toHaveBeenCalledTimes(1);
      expect(dispatchCalls).toEqual([]);
    } finally {
      await view.cleanup();
    }
  });

  it("shows image compression created state as upload-and-use instead of shell configuration", async () => {
    const AgentDraftPanel = await loadPanel();
    const imageDraft = {
      ...draft,
      name: "图片压缩助手",
      introduction: "上传图片后自动压缩并返回结果。",
      prompt: "收到图片后使用脚本压缩。",
      capabilityIds: ["imageProcessing"],
      toolIds: ["execShell"],
      assemblyNotes: ["这个 Agent 会用可执行脚本处理图片压缩。"],
      suggestedEvalCases: ["上传一张大图，应返回更小且可打开的图片。"],
    };
    const view = await renderInDom(
      <AgentDraftPanel
        initialDraft={imageDraft as any}
        createdAgent={{
          dbKey: "agent-user-1-image-compress",
          id: "image-compress",
          userId: "user-1",
          name: "图片压缩助手",
          model: "gpt-5-mini",
          provider: "openai",
          prompt: imageDraft.prompt,
          introduction: imageDraft.introduction,
          tools: ["execShell"],
          isPublic: false,
        } as any}
        onClose={() => undefined}
      />,
    );

    try {
      expect(view.container.textContent).toContain("上传图片后，它会自动压缩并返回结果。");
      expect(view.container.textContent).toContain("开始和它对话");
      expect(view.container.textContent).not.toContain("runtimeToolPolicy");
      expect(view.container.textContent).not.toContain("sharp");
    } finally {
      await view.cleanup();
    }
  });

  it("shows a lightweight ability assembly view without making suggestions persistent", async () => {
    const AgentDraftPanel = await loadPanel();
    const view = await renderInDom(
      <AgentDraftPanel initialDraft={draft as any} version={1} onClose={() => undefined} />,
    );

    try {
      expect(view.container.textContent).toContain("能力装配");
      expect(view.container.textContent).toContain("指令");
      expect(view.container.textContent).toContain("知识");
      expect(view.container.textContent).toContain("工具");
      expect(view.container.textContent).toContain("可沉淀能力");
      expect(view.container.textContent).toContain("评估");
      expect(view.container.textContent).toContain("阅读复盘方法");
      expect(view.container.textContent).toContain("划线聚类 skill");
      expect(view.container.textContent).toContain("阅读复盘 workflow");
      expect(view.container.textContent).toContain("输入零散摘录时");

      const confirmButton = view.getByRole("button", { name: /确认创建/ });
      await view.click(confirmButton);
      const sentAction = dispatchCalls.find(
        (entry: any) => entry?.type === "dialog/handleSendMessage",
      ) as any;
      const userInput = sentAction?.payload?.userInput ?? "";
      expect(userInput).toContain("suggestedSkillIdeas");
      expect(userInput).toContain("只服务创建 UI 和下一步建议");
    } finally {
      await view.cleanup();
    }
  });
});
