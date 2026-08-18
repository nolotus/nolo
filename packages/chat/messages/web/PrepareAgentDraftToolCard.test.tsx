import { describe, expect, it, mock } from "bun:test";

const navigateCalls: unknown[] = [];
const dispatchCalls: unknown[] = [];

async function installModuleMocks() {
  const actualDialogSlice = await import("chat/dialog/dialogSlice");
  const actualMessageSlice = await import("chat/messages/messageSlice");

  mock.module("app/store", () => ({
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return { unwrap: async () => action };
    },
    useAppSelector: (selector: (state: unknown) => unknown) =>
      selector({ dialog: { currentDialogKey: "dialog-user-1" } }),
  }));

  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    abortAllMessages: () => ({
      type: "dialog/abortAllMessages",
    }),
    addActiveController: (payload: unknown) => ({
      type: "dialog/addActiveController",
      payload,
    }),
    addDialogAgent: (payload: unknown) => ({
      type: "dialog/addDialogAgent",
      payload,
    }),
    addPendingFile: (payload: unknown) => ({
      type: "dialog/addPendingFile",
      payload,
    }),
    clearActiveControllers: () => ({
      type: "dialog/clearActiveControllers",
    }),
    clearDialogState: () => ({
      type: "dialog/clearDialogState",
    }),
    clearDialogRuntimeState: () => ({
      type: "dialog/clearDialogRuntimeState",
    }),
    clearPendingAttachments: () => ({
      type: "dialog/clearPendingAttachments",
    }),
    clearPendingUserInputQueue: () => ({
      type: "dialog/clearPendingUserInputQueue",
    }),

    createPageAndAddReference: (payload: unknown) => ({
      type: "dialog/createPageAndAddReference",
      payload,
    }),
    createAgentAutomation: (payload: unknown) => ({
      type: "dialog/createAgentAutomation",
      payload,
    }),
    dequeueUserInput: (payload: unknown) => ({
      type: "dialog/dequeueUserInput",
      payload,
    }),
    deleteDialog: (dialogKey: string) => ({
      type: "dialog/deleteDialog",
      payload: dialogKey,
    }),
    enqueueUserInput: (payload: unknown) => ({
      type: "dialog/enqueueUserInput",
      payload,
    }),
    handleSendMessage: (payload: unknown) => ({
      type: "dialog/handleSendMessage",
      payload,
    }),
    initDialog: (payload: unknown) => ({
      type: "dialog/initDialog",
      payload,
    }),
    removePendingFile: (payload: unknown) => ({
      type: "dialog/removePendingFile",
      payload,
    }),
    removeActiveController: (payload: unknown) => ({
      type: "dialog/removeActiveController",
      payload,
    }),
    removeDialogAgent: (payload: unknown) => ({
      type: "dialog/removeDialogAgent",
      payload,
    }),

    selectActiveControllers: () => ({}),
    selectCurrentDialogConfig: (state: any) => state.dialog.currentDialogConfig ?? null,
    selectCurrentDialogKey: (state: any) => state.dialog.currentDialogKey,
    selectDialogRuntimeByKey: () => ({}),

    selectCurrentDialogTokens: () => ({ inputTokens: 0, outputTokens: 0, totalCost: 0 }),
    selectIsUpdatingMode: () => false,
    selectLoopStopReason: () => null,
    selectPendingFiles: () => [],
    selectPendingRawData: () => ({}),
    selectPendingRawDataByPageKey: () => null,
    selectPendingUserInputQueue: () => [],
    setLoopStopReason: (payload: unknown) => ({
      type: "dialog/setLoopStopReason",
      payload,
    }),
    setPrimaryDialogAgent: (payload: unknown) => ({
      type: "dialog/setPrimaryDialogAgent",
      payload,
    }),
    tokenUsageLiveUpdate: (payload: unknown) => ({
      type: "dialog/tokenUsageLiveUpdate",
      payload,
    }),
    updateDialogTitle: (payload: unknown) => ({
      type: "dialog/updateDialogTitle",
      payload,
    }),
    updateTokens: (payload: unknown) => ({
      type: "dialog/updateTokens",
      payload,
    }),
  }));

  mock.module("chat/messages/messageSlice", () => ({
    ...actualMessageSlice,
    selectAllMsgs: () => [],
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

  mock.module("react-i18next", () => ({
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? "",
    }),
  }));
}

import React from "react";
import { renderInDom } from "../../../testing/domRender";

let moduleVersion = 0;

async function loadCard() {
  navigateCalls.length = 0;
  dispatchCalls.length = 0;
  await installModuleMocks();
  const mod = await import(`./PrepareAgentDraftToolCard.tsx?test=${moduleVersion++}`);
  return mod.default;
}

const draft = {
  name: "英文精读助手",
  introduction: "帮助阅读英文书籍，解释单词、句子和语法。",
  prompt: "你是英文精读助手。",
  promptSummary: "翻译生词生句并分析语法。",
  provider: "fireworks",
  model: "kimi-latest",
  isPublic: false,
  capabilityIds: ["docs"],
  toolIds: ["read"],
  references: [],
  tags: ["英语"],
  unresolved: [],
};

describe("PrepareAgentDraftToolCard", () => {
  it("opens the draft panel as the primary action and keeps advanced edit secondary", async () => {
    const PrepareAgentDraftToolCard = await loadCard();
    const view = await renderInDom(
      <PrepareAgentDraftToolCard
        rawData={{
          draft,
          primaryAction: {
            kind: "confirmInChat",
            label: "确认后在对话中创建",
          },
          secondaryAction: {
            kind: "advancedEdit",
            label: "高级编辑",
            url: "/create/agent",
          },
        }}
        isError={false}
      />
    );

    try {
      expect(view.container.textContent).toContain("继续在对话里要求修改");
      expect(view.container.textContent).toContain("读写文档");
      expect(view.container.textContent).not.toContain("能力 ID");
      expect(view.container.textContent).not.toContain("确认后在对话中创建");

      const panelButton = view.getByRole("button", { name: /预览与修改/ });
      expect(panelButton).toBeTruthy();
      await view.click(panelButton);
      expect(navigateCalls).toEqual([["/dialog-user-1?draftPanel=true"]]);
      expect(dispatchCalls).toEqual([]);
      navigateCalls.length = 0;

      const advancedButton = view.getByRole("button", { name: /高级编辑/ });
      expect(advancedButton).toBeTruthy();
      expect(view.container.textContent).not.toContain("预览并创建");

      await view.click(advancedButton);

      expect(navigateCalls).toEqual([
        [
          "/create/agent",
          {
            state: {
              initialDraft: draft,
            },
          },
        ],
      ]);
    } finally {
      await view.cleanup();
    }
  });
});
