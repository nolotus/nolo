import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { noloAgentId } from "core/init";

// Snapshot named exports before mock.module (namespace objects are live-bound).
// Bun mock.restore() does not clear mock.module — reinstall real surfaces after.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realStore = { ...(await import("app/store")) };
const realToast = { ...(await import("app/utils/toast")) };

const realDialogRuntimeStore = { ...(await import("chat/dialog/dialogRuntimeStore")) };
const realIdentity = { ...(await import("identity")) };

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/dialog/dialogRuntimeStore", () => realDialogRuntimeStore);
  mock.module("identity", () => realIdentity);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("app/store", () => realStore);
  mock.module("app/utils/toast", () => realToast);
};

const dispatchCalls: unknown[] = [];
const navigateCalls: Array<{ path: string; state?: unknown; replace?: boolean }> = [];
const toastErrors: string[] = [];
let sendActionError: Error | null = null;
let profileFetchError: Error | null = null;
let createDialogBlocker: Promise<void> | null = null;
let mockedImageFiles: Map<string, File> = new Map();
let mockedPendingFiles: any[] = [];
let mockedAutoOverrideAgent: Record<string, unknown> | null = null;

let moduleVersion = 0;
let QuickChatRuntime: React.ComponentType<{
  initialText?: string;
  initialAgentId?: string | null;
  quickChatMode: { mode: string };
  onModeChange: () => void;
}>;
let selectedDefaultAgentId = "agent-1";
// 四档 agent 已改为写死常量(QUICK_CHAT_DEFAULT_TIER_AGENTS),不再走用户设置;
// 这里保留对默认公共 agent 的引用供断言复用。
let selectedUserId = "user-1";
let selectedBalance: number | undefined = 100;

const flush = async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  await promise;
};

const loadQuickChatRuntime = async () => {
  const actualReact = await import("react");
  const actualReactRouterDom = await import("app/routing");
  const actualReactI18Next = await import("react-i18next");
  const actualDialogSlice = await import("chat/dialog/dialogSlice");
  const actualSettingSlice = await import("app/settings/settingSlice");
  const actualAuthSlice = await import("auth/authSlice");
  const actualStore = await import("app/store");

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => (path: string, options?: { state?: unknown; replace?: boolean }) => {
      navigateCalls.push({
        path,
        state: options?.state,
        replace: options?.replace,
      });
    },
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string, fallbackOrOptions?: unknown) => {
        if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
        if (key === "unknown") return "unknown";
        if (key === "quickChat.placeholder") return "Ask nolo";
        if (key === "quickChat.createDialogFailed") return "Create failed";
        if (key === "quickChat.sendMessageFailed") return "Send failed";
        if (key === "send") return "Send";
        return key;
      },
    }),
  }));

  mock.module("app/utils/toast", () => ({
    toast: {
      error: (message: string) => {
        toastErrors.push(message);
      },
    },
  }));

  const actualDialogRuntimeStore = await import("chat/dialog/dialogRuntimeStore");
  mock.module("chat/dialog/dialogRuntimeStore", () => ({
    ...actualDialogRuntimeStore,
    usePendingFiles: () => mockedPendingFiles,
  }));

  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    createDialog: (payload: unknown) => ({ type: "dialog/createDialog", payload }),
    clearPendingAttachments: () => ({ type: "dialog/clearPendingAttachments" }),
    selectPendingFiles: (state: any) => state.dialog.pendingFiles,
    usePendingFiles: () => mockedPendingFiles,
  }));

  mock.module("chat/messages/sendFirstMessage", () => ({
    sendFirstMessage: (payload: unknown) => ({
      type: "chat/sendFirstMessage",
      payload,
    }),
  }));

  mock.module("database/dbSlice", () => ({
    // 保留真实 reducer 与全部选择器（selectEntities/selectById 等被 spaceSlice 等
    // 以命名导入引用）：reducer.ts 以 default 导入，spaceSlice 以命名导入 selectEntities。
    // 若 mock 只给 read，store 的 db reducer 变 { read } 对象、selectEntities 变 undefined，
    // 导致 redux-toolkit selectEntities(state.db) 因 state.entities undefined 崩溃
    // （16 个既有失败根因）。
    ...realDbSlice,
    read: (payload: unknown) => ({
      type: "db/read",
      payload,
    }),
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...actualSettingSlice,
    selectDefaultAgentId: (state: any) => state.settings.defaultAgentId,
  }));

  mock.module("auth/authSlice", () => ({
    ...actualAuthSlice,
    selectCurrentUserBalance: () => selectedBalance,
    selectUserId: () => selectedUserId,
    fetchUserProfile: () => ({ type: "auth/fetchUserProfile" }),
  }));

  mock.module("app/hooks", () => ({
    useFetchData: () => ({
      data: mockedAutoOverrideAgent,
    }),
  }));

  const actualIdentity = await import("identity");
  // useUserId reads react-redux useSelector directly (not useAppSelector).
  mock.module("identity", () => ({
    ...actualIdentity,
    useUserId: () => selectedUserId,
  }));

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: { type?: string; payload?: any }) => {
      dispatchCalls.push(action);
      if (action.type === "auth/fetchUserProfile") {
        return {
          unwrap: async () => {
            if (profileFetchError) {
              throw profileFetchError;
            }
            selectedBalance = 42;
            return {
              userId: selectedUserId,
              balance: selectedBalance,
            };
          },
        };
      }
      if (action.type === "dialog/createDialog") {
        return {
          unwrap: async () => {
            if (createDialogBlocker) {
              await createDialogBlocker;
            }
            return {
              dbKey: "dialog-user-quick-1",
              // Echo request spaceId so navigation stays under the explicit Space.
              spaceId: action.payload?.spaceId ?? "space-1",
            };
          },
        };
      }
      if (action.type === "chat/sendFirstMessage") {
        return sendActionError
          ? Promise.reject(sendActionError)
          : Promise.resolve(action);
      }
      return action;
    },
    useAppSelector: (selector: (state: any) => unknown) =>
      selector({
        // db 初始 state：selectSpaceById → selectEntities(state) 读 state.db.entities，
        // 缺 db 字段会因 state.db undefined 崩溃（16 个既有失败根因）。
        db: { ids: [], entities: {} },
        settings: {
          defaultAgentId: selectedDefaultAgentId,
          quickChatAutoAgentId: mockedAutoOverrideAgent ? "agent-user-override" : "",
        },
        space: { viewMode: "all", currentSpaceId: null },
        dialog: { pendingFiles: mockedPendingFiles },
        auth: {
          currentUser: selectedUserId
            ? {
                userId: selectedUserId,
                balance: selectedBalance,
              }
            : null,
        },
      }),
  }));

  mock.module("chat/hooks/useChatInput", () => ({
    useChatInput: () => {
      const [text, setText] = actualReact.useState("");
      return {
        text,
        setText,
        imageFiles: mockedImageFiles,
        imgPreviews: [],
        processImages: () => undefined,
        removeImage: () => undefined,
        clear: () => setText(""),
      };
    },
  }));

  mock.module("app/hooks/useFileDropZone", () => ({
    useFileDropZone: () => ({
      isDragOver: false,
      handleDragOver: () => undefined,
      handleDragLeave: () => undefined,
      handleDrop: () => undefined,
    }),
  }));

  mock.module("chat/web/AttachmentsPreview", () => ({
    default: () => <div data-testid="attachments-preview" />,
  }));

  mock.module("chat/web/FileUploadButton", () => ({
    default: () => <button type="button" aria-label="Upload">upload</button>,
  }));

  mock.module("chat/web/SendButton", () => ({
    default: ({
      onClick,
      disabled,
      loading,
      testId,
    }: {
      onClick: () => void;
      disabled?: boolean;
      loading?: boolean;
      testId?: string;
    }) => (
      <button
        type="button"
        aria-label="Send"
        aria-busy={loading || undefined}
        data-testid={testId}
        data-loading={loading ? "true" : undefined}
        disabled={disabled}
        onClick={() => onClick()}
      >
        send
      </button>
    ),
  }));

  mock.module("chat/web/VoiceInputButton", () => ({
    default: () => <button type="button" aria-label="Voice">voice</button>,
  }));

  mock.module("./QuickChatModeSelector", () => ({
    default: () => <div data-testid="quick-chat-mode-selector" />,
  }));

  const module = await import(`./QuickChatRuntime.tsx?test=${moduleVersion++}`);
  // mock.restore() does not clear mock.module; leave hermetic restore to afterEach.
  mock.restore();
  return module.default;
};

describe("QuickChatRuntime", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousLocalStorageDesc: PropertyDescriptor | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(async () => {
    dispatchCalls.length = 0;
    navigateCalls.length = 0;
    toastErrors.length = 0;
    sendActionError = null;
    profileFetchError = null;
    mockedImageFiles = new Map();
    mockedPendingFiles = [];
    mockedAutoOverrideAgent = null;
    selectedDefaultAgentId = "agent-1";
    selectedUserId = "user-1";
    selectedBalance = 100;
    createDialogBlocker = null;
    QuickChatRuntime = await loadQuickChatRuntime();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousLocalStorageDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      localStorage: dom.window.localStorage,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
    }
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    if (previousLocalStorageDesc) {
      Object.defineProperty(globalThis, "localStorage", previousLocalStorageDesc);
    } else {
      try {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      } catch {
        Object.defineProperty(globalThis, "localStorage", {
          value: undefined,
          configurable: true,
          writable: true,
        });
      }
    }
    mock.restore();
    restoreLeakedModuleMocks();
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  const modeProps = { quickChatMode: { mode: "auto" }, onModeChange: () => {} } as any;

  it("creates and sends a quick chat", async () => {
    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    expect(container.querySelector('[data-testid="quick-chat-runtime"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="quick-chat-input"]')).not.toBeNull();
    const sendButton = container.querySelector('[data-testid="quick-chat-send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
      await flush();
    });

    expect(dispatchCalls.some((action: any) => action.type === "dialog/createDialog")).toBe(true);
    expect(dispatchCalls.some((action: any) => action.type === "dialog/clearPendingAttachments")).toBe(true);

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as {
      payload?: {
        dialogKey?: string;
        text?: string;
        runtimeOptions?: { quickChatReasoningEffort?: "max" };
      };
    } | undefined;
    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as {
      payload?: {
        cybots?: string[];
        skipGreeting?: boolean;
        skipAgentConfigRead?: boolean;
        optimisticReturnBeforeWrite?: boolean;
        title?: string;
      };
    } | undefined;

    expect(sendAction?.payload?.dialogKey).toBe("dialog-user-quick-1");
    expect(sendAction?.payload?.text).toBe("hello");
    expect(sendAction?.payload?.runtimeOptions).toEqual({
      quickChatReasoningEffort: "max",
    });
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
    expect(createDialogAction?.payload?.skipGreeting).toBe(true);
    expect(createDialogAction?.payload?.skipAgentConfigRead).toBe(true);
    expect(createDialogAction?.payload?.optimisticReturnBeforeWrite).toBe(true);
    expect(createDialogAction?.payload?.title).toBe("DeepSeek V4 Flash");
    expect(navigateCalls).toEqual([
      {
        path: "/space/1/dialog-user-quick-1",
        replace: true,
        state: {
          isNew: true,
          quickChatFirstMessage: {
            text: "hello",
          },
        },
      },
    ]);
    expect(toastErrors).toEqual([]);
  });

  it("uses explicit route spaceId for createDialog even when Redux space is unset", async () => {
    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText="scoped hello"
          spaceId="space-route-xyz"
          surface="space-home-compact"
          {...modeProps}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('[data-testid="quick-chat-send"]');
    expect(sendButton).not.toBeNull();
    expect(container.querySelector('[data-surface="space-home-compact"]')).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { spaceId?: string } } | undefined;

    expect(createDialogAction?.payload?.spaceId).toBe("space-route-xyz");
    // buildDialogUrl / normalizeSpaceId strips the "space-" prefix in the path segment.
    expect(navigateCalls).toEqual([
      {
        path: "/space/route-xyz/dialog-user-quick-1",
        replace: true,
        state: {
          isNew: true,
          quickChatFirstMessage: {
            text: "scoped hello",
          },
        },
      },
    ]);
    expect(toastErrors).toEqual([]);
  });

  it("loads the current balance before sending the first quick-chat message", async () => {
    selectedBalance = undefined;

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('[data-testid="quick-chat-send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
      await flush();
    });

    const importantActionTypes = dispatchCalls
      .map((action: any) => action?.type)
      .filter((type) => type !== undefined && type !== "db/read");
    expect(importantActionTypes).toEqual([
      "auth/fetchUserProfile",
      "dialog/createDialog",
      "chat/sendFirstMessage",
      "dialog/clearPendingAttachments",
    ]);
    expect(toastErrors).toEqual([]);
  });

  it("targets the resolved quick-chat agent when the default agent is the system default", async () => {
    selectedDefaultAgentId = noloAgentId;

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
  });

  it("targets the resolved quick-chat public agent instead of the default agent", async () => {
    selectedDefaultAgentId = "agent-user-minimax";

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
  });

  it("routes a simple message to the flash-tier agent", async () => {
    selectedDefaultAgentId = "agent-user-minimax";
    // 四档 agent 已改为写死常量;简短消息命中「快速」档,
    // 始终用内置 flash 常量(QUICK_CHAT_DEFAULT_TIER_AGENTS.flash),与用户设置无关。

    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText="hello"
          quickChatMode={{ mode: "auto" }}
          onModeChange={() => {}}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
  });

  it("routes medium text to the flash tier agent (no tier-up for medium)", async () => {
    // LLM 分类已砍：无图一律 flash 档（不再有 balanced 档位）。
    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText="请帮我分析一下这个方案的优缺点"
          quickChatMode={{ mode: "auto" }}
          onModeChange={() => {}}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as {
      payload?: { runtimeOptions?: { quickChatReasoningEffort?: "max" } };
    } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
    // balanced 档当前即 flash（临时降配），flash 档默认强制 max 推理。
    expect(sendAction?.payload?.runtimeOptions?.quickChatReasoningEffort).toBe("max");
  });

  it("does not force max when the flash tier has a model override", async () => {
    mockedAutoOverrideAgent = { provider: "openai", model: "gpt-5.5" };

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as {
      payload?: { runtimeOptions?: { quickChatReasoningEffort?: "max" } };
    } | undefined;
    expect(sendAction?.payload?.runtimeOptions?.quickChatReasoningEffort).toBeUndefined();
  });

  it("does not force max for an explicitly selected Flash agent", async () => {
    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText="hello"
          initialAgentId="agent-pub-01DSV4FLASHPB00000000JFPFD"
          {...modeProps}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as {
      payload?: { runtimeOptions?: { quickChatReasoningEffort?: "max" } };
    } | undefined;
    expect(sendAction?.payload?.runtimeOptions).toBeUndefined();
  });

  it("routes complex text to the flash tier agent (complexity tiers removed)", async () => {
    // LLM 分类与复杂度兜底已砍：复杂文本同样走 flash 档。
    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText={`请帮我设计一个新架构\n\`\`\`ts\n${"x".repeat(20)}\n\`\`\``}
          quickChatMode={{ mode: "auto" }}
          onModeChange={() => {}}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
  });


  it("prefers initialAgentId over auto mode and does not force workspaceToolsHint", async () => {
    await act(async () => {
      root!.render(
        <QuickChatRuntime
          initialText="hello"
          initialAgentId="agent-pub-01NOLOAGENTCRT000000000001"
          quickChatMode={{ mode: "auto" }}
          onModeChange={() => {}}
        />
      );
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[] } } | undefined;
    expect(createDialogAction?.payload?.cybots).toEqual([
      "agent-pub-01NOLOAGENTCRT000000000001",
    ]);

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as {
      payload?: { runtimeOptions?: { workspaceToolsHint?: boolean } };
    } | undefined;
    expect(sendAction?.payload?.runtimeOptions).toBeUndefined();
  });

  it("sends image quick-chat turns without a model override", async () => {
    selectedDefaultAgentId = "agent-user-default";
    mockedImageFiles = new Map([
      ["image-1", new File(["image"], "image.png", { type: "image/png" })],
    ]);

    await act(async () => {
      root!.render(<QuickChatRuntime {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const createDialogAction = dispatchCalls.find(
      (action: any) => action.type === "dialog/createDialog"
    ) as { payload?: { cybots?: string[]; title?: string } } | undefined;
    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as { payload?: { runtimeOptions?: any; imageFiles?: File[]; text?: string } } | undefined;

    expect(createDialogAction?.payload?.cybots).toEqual([]);
    expect((createDialogAction?.payload as any)?.agentMode).toBe("auto");
    // 图片档已移除：有图时不再设置 autoRoute.stickyTier
    expect((createDialogAction?.payload as any)?.autoRoute).toBeUndefined();
    expect(sendAction?.payload?.imageFiles?.length).toBe(1);
    expect(sendAction?.payload?.text).toBe("请描述这张图片。");
    // 图片档已移除：有图走 flash 档（通用档），模型层覆盖生效（与非图一致）
    expect(sendAction?.payload?.runtimeOptions?.quickChatReasoningEffort).toBe("max");
  });

  it("sends uploaded quick-chat files as first-message extra parts", async () => {
    mockedPendingFiles = [
      {
        id: "pending-file-1",
        name: "resume.pdf",
        pageKey: "page-user-resume",
        dialogKey: "dialog-user-source",
        type: "pdf",
      },
    ];

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="summarize this" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('[data-testid="quick-chat-send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as { payload?: { text?: string; extraParts?: any[] } } | undefined;

    expect(sendAction?.payload?.text).toBe("summarize this");
    expect(sendAction?.payload?.extraParts).toEqual([
      {
        type: "pdf",
        name: "resume.pdf",
        pageKey: "page-user-resume",
        dialogKey: "dialog-user-source",
      },
    ]);
  });

  it("does not toast when the first-message send aborts after navigation", async () => {
    sendActionError = new DOMException("The operation was aborted.", "AbortError");

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
      await flush();
    });

    expect(dispatchCalls.some((action: any) => action.type === "dialog/createDialog")).toBe(true);
    expect(navigateCalls).toEqual([
      {
        path: "/space/1/dialog-user-quick-1",
        replace: true,
        state: {
          isNew: true,
          quickChatFirstMessage: {
            text: "hello",
          },
        },
      },
    ]);
    expect(toastErrors).toEqual([]);
  });

  it("shows a send error when loading the current balance fails", async () => {
    selectedBalance = undefined;
    profileFetchError = new Error("profile unavailable");

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButton = container.querySelector('button[aria-label="Send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
      await flush();
    });

    const importantActionTypes = dispatchCalls
      .map((action: any) => action?.type)
      .filter((type) => type !== undefined && type !== "db/read");
    expect(importantActionTypes).toEqual([
      "auth/fetchUserProfile",
    ]);
    expect(toastErrors.length).toBeGreaterThan(0);
  });

  // 「按下发送的瞬间就要有反馈」：在 await 链路（意图分类 + createDialog）
  // 任何一步完成之前，发送按钮必须进入 loading/禁用态，防止用户重复点击、
  // 防止界面「卡住没反应」被误以为没按到。
  it("flips the send button into a loading/disabled state immediately on press", async () => {
    // 让 createDialog 在测试控制下挂起，便于稳定观察「按下 → loading」中间态
    // 而不需要靠定时器竞速。
    let releaseCreateDialog!: () => void;
    createDialogBlocker = new Promise<void>((resolve) => {
      releaseCreateDialog = resolve;
    });

    await act(async () => {
      root!.render(<QuickChatRuntime initialText="hello" {...modeProps} />);
      await flush();
    });

    const sendButtonBefore = container.querySelector(
      '[data-testid="quick-chat-send"]'
    ) as HTMLButtonElement | null;
    expect(sendButtonBefore).not.toBeNull();
    expect(sendButtonBefore!.disabled).toBe(false);
    expect(sendButtonBefore!.getAttribute("data-loading")).toBeNull();
    expect(sendButtonBefore!.getAttribute("aria-busy")).toBeNull();
    const chatBoxBefore = container.querySelector(
      '[data-testid="quick-chat-runtime"] > .quick-chat-box'
    );
    expect(chatBoxBefore?.getAttribute("data-sending")).toBeNull();

    // 点击一次后等 React 把 setIsSending(true) 落地，但 createDialog 仍在挂起，
    // 因此我们能稳定抓到「中间态」而不是已经被 finally 复位后的状态。
    await act(async () => {
      sendButtonBefore!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      // 多个 flush 让 microtasks 跑完，但 createDialog 仍被 blocker 锁住。
      await flush();
      await flush();
      await flush();
    });

    const sendButtonDuring = container.querySelector(
      '[data-testid="quick-chat-send"]'
    ) as HTMLButtonElement | null;
    expect(sendButtonDuring).not.toBeNull();
    // 1) 按钮视觉上立刻进入 loading 形态。
    expect(sendButtonDuring!.getAttribute("data-loading")).toBe("true");
    expect(sendButtonDuring!.getAttribute("aria-busy")).toBe("true");
    // 2) 按钮被禁用，重复 Enter / 连点都不会再触发 startQuickChat。
    expect(sendButtonDuring!.disabled).toBe(true);
    // 3) 整 box 也带上 data-sending 标记，便于后续样式/测试复用。
    const chatBoxDuring = container.querySelector(
      '[data-testid="quick-chat-runtime"] > .quick-chat-box'
    );
    expect(chatBoxDuring?.getAttribute("data-sending")).toBe("true");

    const textarea = container.querySelector(
      '[data-testid="quick-chat-input"]'
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    // 4) 输入框在 isSending 期间被禁用，防止用户继续输入。
    expect(textarea!.disabled).toBe(true);

    // 5) 重入守卫：再点一次不会重复发出 createDialog。
    const createDialogCountBefore =
      dispatchCalls.filter((a: any) => a?.type === "dialog/createDialog").length;
    await act(async () => {
      sendButtonDuring!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await flush();
    });
    const createDialogCountAfter =
      dispatchCalls.filter((a: any) => a?.type === "dialog/createDialog").length;
    expect(createDialogCountAfter).toBe(createDialogCountBefore);

    // 释放 createDialog，让 finally 跑完，再断言 loading 态正确复位。
    await act(async () => {
      releaseCreateDialog();
      await flush();
      await flush();
      await flush();
    });

    // 链路跑完就离开页面（mock useNavigate 不会真正跳转，组件也不会被卸载）。
    // 因此这里断言 sendButton 仍然是 mounted（仍然属于该会话），但 loading 已复位。
    const sendButtonAfter = container.querySelector(
      '[data-testid="quick-chat-send"]'
    ) as HTMLButtonElement | null;
    expect(sendButtonAfter).not.toBeNull();
    expect(sendButtonAfter!.getAttribute("data-loading")).toBeNull();
    expect(sendButtonAfter!.getAttribute("aria-busy")).toBeNull();
    expect(sendButtonAfter!.disabled).toBe(false);

    const chatBoxAfter = container.querySelector(
      '[data-testid="quick-chat-runtime"] > .quick-chat-box'
    );
    expect(chatBoxAfter?.getAttribute("data-sending")).toBeNull();
  });
});
