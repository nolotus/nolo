import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";

import { selectAllMsgs } from "chat/messages/messageSlice";
import {
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
} from "chat/dialog/dialogRuntimeStore";

// Value-copy snapshot — Bun mock.restore() does not clear mock.module; empty
// getPricing overrides would poison platform catalog prices in later suites.
const realGetPricing = { ...(await import("ai/llm/getPricing")) };

let mockUserId = "user-1";
let mockAgentHookResult: {
  agentConfig: Record<string, unknown> | null;
  isLoading: boolean;
  loadState?: string;
} = {
  agentConfig: null,
  isLoading: false,
  loadState: "idle",
};
let mockCurrentDialogKey: string | null = "dialog-user-1-1";
// Real getPrimaryDialogAgentId reads cybots/primaryAgentKey — keep these in sync
// with what the hook should resolve. Do not mock chat/dialog/dialogAgents:
// mock.module + live bindings leak into later suite files as agent-1 forever.
let mockCurrentDialogConfig: Record<string, unknown> | null = {
  dbKey: "dialog-user-1-1",
  cybots: ["agent-1"],
};
let mockMessages: any[] = [];

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("ai/llm/getPricing", () => realGetPricing);
};

const loadHook = async () => {
  mock.module("app/store", () => ({
    useAppSelector: (selector: Function) => {
      if (selector === selectAllMsgs || selector.toString().includes("selectAllMsgs")) {
        return mockMessages;
      }
      try {
        return selector({
          auth: { userId: mockUserId },
          dialog: {},
        });
      } catch (_) {
        return null;
      }
    },
  }));

  mock.module("identity", () => ({
    useUserId: () => mockUserId,
  }));

  // Do not mock dialogSlice re-exports of dialogRuntimeStore (Bun live-binding
  // poison). Drive the real key via setActiveDialogKey in beforeEach.
  mock.module("chat/dialog/useCurrentDialogConfig", () => ({
    useCurrentDialogConfig: () => mockCurrentDialogConfig,
  }));

  mock.module("react-i18next", () => ({
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }));

  mock.module("ai/agent/hooks/useAgentConfig", () => ({
    default: () => mockAgentHookResult,
  }));

  mock.module("ai/llm/getPricing", () => ({
    ...realGetPricing,
    getModelPricing: () => null,
    getPrices: () => ({}),
    getFinalPrice: () => 0,
    hasExplicitAgentPricing: (config: any) =>
      [config?.inputPrice, config?.outputPrice].some(
        (value) =>
          typeof value === "number" && Number.isFinite(value) && value > 0
      ),
  }));

  const mod = await import(`./useSendPermission.ts?test=${moduleVersion++}`);
  return mod.useSendPermission;
};

const HookProbe = ({
  useSendPermission,
  balance,
}: {
  useSendPermission: (balance?: number) => {
    sendPermission: {
      allowed: boolean;
      reason?: string;
      pricing?: {
        modelName: string;
        pricePerMessage: number;
      };
    };
    getErrorMessage: (reason?: string, pricing?: { modelName: string; pricePerMessage: number }) => string;
    isLoading: boolean;
  };
  balance: number;
}) => {
  const { sendPermission, getErrorMessage, isLoading } = useSendPermission(balance);

  return (
    <pre data-testid="result">
      {JSON.stringify({
        isLoading,
        allowed: sendPermission.allowed,
        reason: sendPermission.reason,
        message: getErrorMessage(sendPermission.reason, sendPermission.pricing),
      })}
    </pre>
  );
};

describe("useSendPermission", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;

  beforeEach(() => {
    mockUserId = "user-1";
    mockCurrentDialogKey = "dialog-user-1-1";
    mockCurrentDialogConfig = {
      dbKey: "dialog-user-1-1",
      cybots: ["agent-1"],
    };
    mockMessages = [];
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
      loadState: "idle",
    };
    resetDialogRuntimeStoreForTests();
    setActiveDialogKey(mockCurrentDialogKey);

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("exposes loading while agent config is still resolving", async () => {
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: true,
      loadState: "loading",
    };
    const useSendPermission = await loadHook();

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    expect(container.textContent).toContain('"isLoading":true');
    expect(container.textContent).not.toContain('"reason":"NO_CONFIG"');
  });

  it("maps missing config to the existing agent locale key", async () => {
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
    };
    const useSendPermission = await loadHook();

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    expect(container.textContent).toContain('"message":"agentConfigMissing"');
  });

  it("surfaces agent load failures without mislabeling them as missing config", async () => {
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
      loadState: "error",
    };
    const useSendPermission = await loadHook();

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    expect(container.textContent).toContain('"reason":"AGENT_LOAD_FAILED"');
    expect(container.textContent).toContain('"message":"agentConfigLoadFailed"');
  });

  it("does not treat auto-mode dialogs as missing agent config", async () => {
    // 首页直接开聊产生的对话是 auto 模式：没有固定 Agent 实体，执行真相来自
    // 代码内置 execution profile。此前会判成 NO_CONFIG，composer 直接消失。
    mockCurrentDialogConfig = {
      dbKey: "dialog-user-1-1",
      agentMode: "auto",
    };
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
      loadState: "idle",
    };
    const useSendPermission = await loadHook();

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    expect(container.textContent).not.toContain('"reason":"NO_CONFIG"');
  });

  it("allows platform agents with explicit prices when the model registry has no entry", async () => {
    mockAgentHookResult = {
      isLoading: false,
      agentConfig: {
        userId: "builtin",
        provider: "openai",
        model: "gpt-4o-mini",
        apiSource: "platform",
        inputPrice: 1,
        outputPrice: 2,
      },
    };
    const useSendPermission = await loadHook();

    act(() => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={10} />);
    });

    const result = JSON.parse(
      container.querySelector('[data-testid="result"]')?.textContent || "{}"
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("downgrades agent load failures to allowed in inline handoff flows", async () => {
    // Case 1: threadKind is inline, agent config load fails
    mockCurrentDialogConfig = {
      dbKey: "dialog-user-1-1",
      cybots: ["agent-1"],
      threadKind: "inline",
    };
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
      loadState: "error",
    };
    const useSendPermission = await loadHook();

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    let result = JSON.parse(
      container.querySelector('[data-testid="result"]')?.textContent || "{}"
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();

    // Case 2: old persisted dialogs can still be recognized by the generic handoff tool result
    mockCurrentDialogConfig = {
      dbKey: "dialog-user-1-1",
      cybots: ["agent-1"],
    };
    mockMessages = [
      {
        toolName: "runStreamingAgent",
        content: JSON.stringify({ inline: true, switchToAgentKey: "agent-2" }),
      },
    ];
    mockAgentHookResult = {
      agentConfig: null,
      isLoading: false,
      loadState: "idle",
    };

    await act(async () => {
      root.render(<HookProbe useSendPermission={useSendPermission} balance={0} />);
    });

    result = JSON.parse(
      container.querySelector('[data-testid="result"]')?.textContent || "{}"
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
