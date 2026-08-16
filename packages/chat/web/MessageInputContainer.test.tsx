import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const actualDialogSlice = await import("chat/dialog/dialogSlice");
const realDialogSlice = { ...actualDialogSlice };
const {
  addActiveController,
  addPendingFile,
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
} = await import("chat/dialog/dialogRuntimeStore");
const actualMessageSlice = await import("chat/messages/messageSlice");
const actualToolRunStore = await import("ai/tools/toolRunStore");
const actualStoreNs = await import("app/store");
const realStore = { ...actualStoreNs };
const actualIdentityNs = await import("identity");
const realIdentity = { ...actualIdentityNs };
// Snapshot named exports before mock.module (module namespace objects are live-bound).
// Copy values — not live namespace refs — so afterAll restore reinstalls real surfaces.
const actualAuthSliceNs = await import("auth/authSlice");
const realAuthSlice = { ...actualAuthSliceNs };
const actualDbSliceNs = await import("database/dbSlice");
const realDbSlice = { ...actualDbSliceNs };
const actualAddAgentDialog = await import("chat/dialog/AddAgentDialog");
const realAddAgentDialog = {
  default: actualAddAgentDialog.default,
  matchesAgentSearch: actualAddAgentDialog.matchesAgentSearch,
};
const actualCanvasEditContext = await import("render/canvas/canvasEditContext");
const realCanvasEditContext = {
  buildCanvasNodeEditingTarget: actualCanvasEditContext.buildCanvasNodeEditingTarget,
  consumePendingCanvasEditSelection:
    actualCanvasEditContext.consumePendingCanvasEditSelection,
  markPendingCanvasEditSelection: actualCanvasEditContext.markPendingCanvasEditSelection,
  publishCanvasEditSelection: actualCanvasEditContext.publishCanvasEditSelection,
  publishCanvasMessagePatch: actualCanvasEditContext.publishCanvasMessagePatch,
  subscribeCanvasEditSelection: actualCanvasEditContext.subscribeCanvasEditSelection,
  subscribeCanvasMessagePatches: actualCanvasEditContext.subscribeCanvasMessagePatches,
  useCanvasEditSelection: actualCanvasEditContext.useCanvasEditSelection,
};
const realAgentPickerCandidates = {
  ...(await import("chat/hooks/useAgentPickerCandidates")),
};
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const messageInputContainerSource = readFileSync(
  join(import.meta.dir, "MessageInputContainer.tsx"),
  "utf-8"
);

const restoreLeakedModuleMocks = () => {
  mock.module("chat/dialog/AddAgentDialog", () => realAddAgentDialog);
  mock.module("render/canvas/canvasEditContext", () => realCanvasEditContext);
  // Bun mock.restore() does not clear mock.module; reinstall real auth/db so
  // guest/local and selectById-dependent sibling suites stay hermetic.
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("../dialog/dialogSlice", () => realDialogSlice);
  mock.module("app/store", () => realStore);
  mock.module("identity", () => realIdentity);
  mock.module(
    "chat/hooks/useAgentPickerCandidates",
    () => realAgentPickerCandidates,
  );
};

const dispatchCalls: unknown[] = [];
const navigateCalls: Array<{ path: string; state?: unknown }> = [];
const toastSuccesses: string[] = [];
const toastErrors: string[] = [];
const emptyFavoriteAgentIds: string[] = [];
let mockToolRuns: any[] = [];
const executeToolRunCalls: unknown[] = [];
let sendFirstMessagePromise:
  | Promise<unknown>
  | { unwrap: () => Promise<unknown> }
  | null = null;
let compactActionResult = {
  dbKey: "dialog-user-fork-1",
  spaceId: "space-1",
};
let compactActionError: Error | null = null;
const runtimeSnapshot = {
  currentServer: "http://127.0.0.1:38123",
  currentToken: "token-1",
};
let resolvedAttachmentParts: any[] = [];
const resolvePendingAttachmentCalls: unknown[] = [];
let dbReadAgentRecord: Record<string, unknown> = {
  dbKey: "agent-1",
  userId: "user-1",
  provider: "openai",
  model: "gpt-4.1",
};
const dispatchMock = (action: { type?: string; payload?: any }) => {
  dispatchCalls.push(action);
  if (action.type === "dialog/createDialog") {
    return {
      unwrap: async () => ({
        dbKey: "dialog-user-fresh-1",
        spaceId: "space-1",
      }),
    };
  }
  if (action.type === "db/read") {
    return {
      unwrap: async () => dbReadAgentRecord,
    };
  }
  if (action.type === "chat/sendFirstMessage") {
    return sendFirstMessagePromise ?? {
      unwrap: async () => action,
    };
  }
  if (action.type === "dialog/setPrimaryDialogAgent") {
    return {
      unwrap: async () => undefined,
    };
  }
  if (action.type === "dialog/compactDialogAndFork") {
    return {
      unwrap: async () => {
        if (compactActionError) {
          throw compactActionError;
        }
        return compactActionResult;
      },
    };
  }
  return action;
};

let moduleVersion = 0;
let MessageInputContainer: React.ComponentType;
let mockState: any;
let setMockText: ((value: string) => void) | null = null;
let mockImageFiles = new Map<string, File>();
let mockImagePreviews: Array<{ id: string; url: string }> = [];

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const loadMessageInputContainer = async () => {
  const actualReact = await import("react");
  const actualReactRouterDom = await import("app/routing");
  const actualReactI18Next = await import("react-i18next");
  const actualStore = await import("app/store");

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => (path: string, options?: { state?: unknown }) => {
      navigateCalls.push({ path, state: options?.state });
    },
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string, fallbackOrOptions?: unknown) => {
        if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
        if (key === "messageOrFileHere") return "Message here";
        if (key === "waitForProcessing") return "Wait";
        if (key === "uploading") return "Uploading...";
        if (key === "compressingImagesMessage") {
          return "Compressing images, please wait...";
        }
        return key;
      },
    }),
  }));

  mock.module("app/utils/toast", () => ({
    default: {
      success: (message: string) => toastSuccesses.push(message),
      error: (message: string) => toastErrors.push(message),
    },
    toast: {
      success: (message: string) => toastSuccesses.push(message),
      error: (message: string) => toastErrors.push(message),
    },
  }));

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => dispatchMock,
    useAppSelector: (selector: (state: any) => unknown) => selector(mockState),
  }));

  // Identity hooks read react-redux useSelector directly (not useAppSelector).
  mock.module("identity", () => ({
    ...realIdentity,
    useUserId: () => "user-1",
    useCurrentUser: () => ({ userId: "user-1" }),
  }));

  // Only stub slice-owned thunks/actions. Keep dialogRuntimeStore re-exports
  // real — overriding them via mock.module poisons the store for later suites.
  const dialogSliceTestDoubles = {
    ...actualDialogSlice,
    createDialog: (payload: unknown) => ({ type: "dialog/createDialog", payload }),
    handleSendMessage: (payload: unknown) => ({ type: "dialog/handleSendMessage", payload }),
    setPrimaryDialogAgent: (payload: unknown) => ({
      type: "dialog/setPrimaryDialogAgent",
      payload,
    }),
    selectCurrentDialogConfig: () => mockState.dialog.currentDialogConfig,
  };
  mock.module("../dialog/dialogSlice", () => dialogSliceTestDoubles);
  mock.module("chat/dialog/dialogSlice", () => dialogSliceTestDoubles);

  mock.module("../dialog/useCurrentDialogConfig", () => ({
    useCurrentDialogConfig: () => mockState.dialog?.currentDialogConfig ?? null,
  }));
  mock.module("chat/dialog/useCurrentDialogConfig", () => ({
    useCurrentDialogConfig: () => mockState.dialog?.currentDialogConfig ?? null,
  }));

  mock.module("../messages/messageSlice", () => ({
    selectHasStreamingMessage: () => false,
    useHasStreamingMessage: () => false,
    selectAllMsgs: (state: any, dialogId: string) => {
      const dialogState = state?.message?.dialogStateById?.[dialogId];
      if (!dialogState?.msgs?.ids) return [];
      return dialogState.msgs.ids
        .map((id: string) => dialogState.msgs.entities[id])
        .filter(Boolean);
    },
    updateToolMessage: (payload: unknown) => ({
      type: "message/updateToolMessage",
      payload,
    }),
    editUserMessageAndReplay: (payload: unknown) => ({
      type: "message/editUserMessageAndReplay",
      payload,
      unwrap: async () => payload,
    }),
  }));

  mock.module("chat/messages/messageSlice", () => ({
    ...actualMessageSlice,
    selectHasStreamingMessage: () => false,
    useHasStreamingMessage: () => false,
    selectAllMsgs: (state: any, dialogId: string) => {
      const dialogState = state?.message?.dialogStateById?.[dialogId];
      if (!dialogState?.msgs?.ids) return [];
      return dialogState.msgs.ids
        .map((id: string) => dialogState.msgs.entities[id])
        .filter(Boolean);
    },
    updateToolMessage: (payload: unknown) => ({
      type: "message/updateToolMessage",
      payload,
    }),
    editUserMessageAndReplay: (payload: unknown) => ({
      type: "message/editUserMessageAndReplay",
      payload,
      unwrap: async () => payload,
    }),
  }));

  mock.module("chat/messages/sendFirstMessage", () => ({
    sendFirstMessage: (payload: unknown) => ({
      type: "chat/sendFirstMessage",
      payload,
    }),
  }));

  mock.module("ai/tools/toolRunStore", () => ({
    ...actualToolRunStore,
    useAllToolRuns: () => mockToolRuns,
    executeToolRun: (payload: unknown) => {
      executeToolRunCalls.push(payload);
      return {
        type: "toolRun/executeToolRun",
        payload,
        unwrap: async () => ({
          rawData: { deletedDialogIds: ["dialog-1"] },
          displayData: "已删除 1 个对话：dialog-1。",
        }),
      };
    },
  }));

  mock.module("ai/agent/agentSlice", () => ({
    streamAgentChatTurn: (payload: unknown) => ({
      type: "agent/streamAgentChatTurn",
      payload,
    }),
  }));

  mock.module("chat/dialog/actions/compactDialogAndForkAction", () => ({
    compactDialogAndForkAction: (payload: unknown) => ({
      type: "dialog/compactDialogAndFork",
      payload,
    }),
  }));

  mock.module("chat/messages/pendingAttachmentParts", () => ({
    resolvePendingAttachmentsToMessageParts: async (...args: unknown[]) => {
      resolvePendingAttachmentCalls.push(args);
      return resolvedAttachmentParts;
    },
  }));

  mock.module("chat/messages/browserImageUrl", () => ({
    resolveBrowserModelImageUrl: (url: string) => url,
  }));

  mock.module("chat/hooks/useChatInput", () => ({
    useChatInput: () => {
      const [text, setText] = actualReact.useState("");
      const [imageFiles, setImageFiles] = actualReact.useState(
        () => new Map(mockImageFiles),
      );
      const [imgPreviews, setImgPreviews] = actualReact.useState(
        () => [...mockImagePreviews],
      );
      setMockText = setText;
      return {
        text,
        setText,
        imageFiles,
        imgPreviews,
        processImages: () => undefined,
        removeImage: () => undefined,
        clear: () => {
          setText("");
          setImageFiles(new Map());
          setImgPreviews([]);
        },
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

  mock.module("app/hooks/useClipboardFiles", () => ({
    useClipboardFiles: () => ({
      handlePaste: () => undefined,
    }),
  }));

  mock.module("app/hooks/useAutoResizeTextarea", () => ({
    useAutoResizeTextarea: ({
      onTextChange,
    }: {
      onTextChange: (value: string) => void;
    }) => ({
      handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onTextChange(event.target.value);
      },
    }),
  }));

  mock.module("app/hooks/useElementSizeVar", () => ({
    useElementSizeVar: () => undefined,
  }));

  mock.module("app/hooks/useIsMobile", () => ({
    useIsMobile: () => false,
  }));

  mock.module("../hooks/useSendPermission", () => ({
    useSendPermission: () => ({
      sendPermission: { allowed: true },
      getErrorMessage: () => "",
      isLoading: false,
    }),
  }));

  // Spread real exports; hard-coded selectUserId poisons guest/local suites.
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentUserBalance: () => 100,
    fetchUserProfile: () => ({ type: "auth/fetchUserProfile" }),
    selectUserId: (state: any) =>
      state?.auth?.currentUser?.userId ?? realAuthSlice.selectUserId(state),
    selectCurrentUser: (state: any) => state?.auth?.currentUser ?? null,
  }));

  mock.module("app/appInspector/appInspectorStore", () => ({
    useAppSelectedNode: () => null,
    clearSelectedNode: () => {},
  }));

  mock.module("app/favorite/favoriteStore", () => ({
    useFavoriteAgentIds: () => emptyFavoriteAgentIds,
  }));

  // Default agent picker pulls public/owned catalogs; keep this suite hermetic.
  mock.module("chat/hooks/useAgentPickerCandidates", () => ({
    ...realAgentPickerCandidates,
    useAgentPickerCandidates: () => ({ candidates: [], loading: false }),
  }));

  mock.module("render/canvas/canvasEditContext", () => ({
    ...realCanvasEditContext,
    useCanvasEditSelection: () => null,
    publishCanvasEditSelection: () => undefined,
    markPendingCanvasEditSelection: () => undefined,
    buildCanvasNodeEditingTarget: () => null,
  }));

  mock.module("./ActivityProgressPanel", () => ({
    default: () => null,
  }));

  mock.module("./DialogUsageTrigger", () => ({
    DialogUsageTrigger: () => null,
  }));

  mock.module("render/web/ui/Popover", () => ({
    Popover: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }));

  mock.module("render/web/ui/StreamingIndicator", () => ({
    default: () => null,
  }));

  mock.module("app/settings/settingSlice", () => ({
    selectOcrModel: () => "ocr-model",
  }));

  mock.module("app/stateViews/runtime", () => ({
    selectRuntimeSnapshot: () => runtimeSnapshot,
  }));

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    upload: () => ({ type: "db/upload" }),
    read: (payload: unknown) => ({ type: "db/read", payload }),
    readAndWait: (payload: unknown) => ({ type: "db/readAndWait", payload }),
    // Local only — afterAll reinstalls real selectById for sibling suites.
    selectById: () => undefined,
  }));

  mock.module("./AttachmentsPreview", () => ({
    default: () => <div data-testid="attachments-preview" />,
  }));

  mock.module("./ImageConfigRow", () => ({
    default: () => <div data-testid="image-config-row" />,
  }));

  mock.module("./FileUploadButton", () => ({
    default: ({ disabled }: { disabled?: boolean }) => (
      <button type="button" disabled={disabled}>
        upload
      </button>
    ),
  }));

  mock.module("./SendButton", () => ({
    default: ({
      onClick,
      disabled,
    }: {
      onClick: () => void;
      disabled?: boolean;
    }) => (
      <button
        type="button"
        aria-label="Send"
        disabled={disabled}
        onClick={() => onClick()}
      >
        send
      </button>
    ),
  }));

  mock.module("./VoiceInputButton", () => ({
    default: () => <button type="button" aria-label="Voice">voice</button>,
  }));

  mock.module("./AgentMentionMenu", () => ({
    default: () => null,
  }));

  mock.module("./fileProcessor", () => ({
    processDocumentFile: async () => undefined,
  }));

  mock.module("chat/dialog/AddAgentDialog", () => ({
    ...realAddAgentDialog,
    default: () => null,
  }));

  mock.module("chat/hooks/useChatInputSeed", () => ({
    useChatInputSeed: () => null,
    publishChatInputSeed: () => undefined,
  }));

  const module = await import(`./MessageInputContainer.tsx?test=${moduleVersion++}`);
  return module.default;
};

describe("MessageInputContainer", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousElement: typeof globalThis.Element | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
  let previousSVGElement: typeof globalThis.SVGElement | undefined;
  let previousLocalStorageDesc: PropertyDescriptor | undefined;
  let previousActEnvironment: boolean | undefined;
  let previousAttachEvent: ((type: string, listener: EventListener) => void) | undefined;
  let previousDetachEvent: ((type: string, listener: EventListener) => void) | undefined;
  let previousTextareaAttachEvent:
    | ((type: string, listener: EventListener) => void)
    | undefined;
  let previousTextareaDetachEvent:
    | ((type: string, listener: EventListener) => void)
    | undefined;
  let previousButtonAttachEvent:
    | ((type: string, listener: EventListener) => void)
    | undefined;
  let previousButtonDetachEvent:
    | ((type: string, listener: EventListener) => void)
    | undefined;
  let previousHTMLElementFocus: (() => void) | undefined;

  beforeEach(async () => {
    dispatchCalls.length = 0;
    navigateCalls.length = 0;
    toastSuccesses.length = 0;
    toastErrors.length = 0;
    executeToolRunCalls.length = 0;
    resolvePendingAttachmentCalls.length = 0;
    resolvedAttachmentParts = [];
    dbReadAgentRecord = {
      dbKey: "agent-1",
      userId: "user-1",
      provider: "openai",
      model: "gpt-4.1",
    };
    mockState = {
      auth: {
        currentUser: null,
      },
      dialog: {
        pendingFiles: [],
        currentDialogKey: "dialog-user-old-1",
        currentDialogConfig: {
          dbKey: "dialog-user-old-1",
          cybots: ["agent-1"],
        },
        activeControllers: {},
      },
      favorite: {
        agentIds: emptyFavoriteAgentIds,
      },
      message: {
        dialogStateById: {},
      },
    };
    resetDialogRuntimeStoreForTests();
    setActiveDialogKey("dialog-user-old-1");
    compactActionResult = {
      dbKey: "dialog-user-fork-1",
      spaceId: "space-1",
    };
    compactActionError = null;
    setMockText = null;
    sendFirstMessagePromise = null;
    mockToolRuns = [];
    mockImageFiles = new Map();
    mockImagePreviews = [];
    MessageInputContainer = await loadMessageInputContainer();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousElement = globalThis.Element;
    previousHTMLElement = globalThis.HTMLElement;
    previousSVGElement = globalThis.SVGElement;
    previousLocalStorageDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      Element: dom.window.Element,
      HTMLElement: dom.window.HTMLElement,
      // Prior tests may delete SVGElement; React 19 needs it during act/unmount.
      SVGElement: dom.window.SVGElement,
      // Bare localStorage for module-level debug gates (useUserData etc.).
      localStorage: dom.window.localStorage,
    });
    previousAttachEvent = (dom.window.HTMLElement.prototype as any).attachEvent;
    previousDetachEvent = (dom.window.HTMLElement.prototype as any).detachEvent;
    previousTextareaAttachEvent = (dom.window.HTMLTextAreaElement.prototype as any).attachEvent;
    previousTextareaDetachEvent = (dom.window.HTMLTextAreaElement.prototype as any).detachEvent;
    previousButtonAttachEvent = (dom.window.HTMLButtonElement.prototype as any).attachEvent;
    previousButtonDetachEvent = (dom.window.HTMLButtonElement.prototype as any).detachEvent;
    previousHTMLElementFocus = dom.window.HTMLElement.prototype.focus;
    (dom.window.HTMLElement.prototype as any).attachEvent = () => undefined;
    (dom.window.HTMLElement.prototype as any).detachEvent = () => undefined;
    dom.window.HTMLElement.prototype.focus = function () {};
    (dom.window.HTMLTextAreaElement.prototype as any).attachEvent = () => undefined;
    (dom.window.HTMLTextAreaElement.prototype as any).detachEvent = () => undefined;
    (dom.window.HTMLButtonElement.prototype as any).attachEvent = () => undefined;
    (dom.window.HTMLButtonElement.prototype as any).detachEvent = () => undefined;
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
      Element: previousElement,
      HTMLElement: previousHTMLElement,
      SVGElement: previousSVGElement,
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
    if (dom?.window?.HTMLElement?.prototype) {
      (dom.window.HTMLElement.prototype as any).attachEvent = previousAttachEvent;
      (dom.window.HTMLElement.prototype as any).detachEvent = previousDetachEvent;
    }
    if (dom?.window?.HTMLTextAreaElement?.prototype) {
      (dom.window.HTMLTextAreaElement.prototype as any).attachEvent =
        previousTextareaAttachEvent;
      (dom.window.HTMLTextAreaElement.prototype as any).detachEvent =
        previousTextareaDetachEvent;
    }
    if (dom?.window?.HTMLButtonElement?.prototype) {
      (dom.window.HTMLButtonElement.prototype as any).attachEvent =
        previousButtonAttachEvent;
      (dom.window.HTMLButtonElement.prototype as any).detachEvent =
        previousButtonDetachEvent;
    }
    if (dom?.window?.HTMLElement?.prototype && previousHTMLElementFocus) {
      dom.window.HTMLElement.prototype.focus = previousHTMLElementFocus;
    }
    mock.restore();
    restoreLeakedModuleMocks();
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    root = null;
  });

  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  it("keeps image controls wired through loaded active agent config", () => {
    const contextPanelsSource = readFileSync(
      join(import.meta.dir, "MessageInputContextPanels.tsx"),
      "utf-8"
    );
    const coreSource = readFileSync(
      join(import.meta.dir, "MessageInputCore.tsx"),
      "utf-8"
    );
    expect(messageInputContainerSource).toContain(
      "const resolvedActiveAgent = activeAgent ?? loadedActiveAgent"
    );
    expect(messageInputContainerSource).toContain(
      "read({ dbKey: activeAgentId })"
    );
    expect(messageInputContainerSource).toContain(".unwrap()");
    expect(coreSource).toContain("const showImageConfigRow =");
    expect(coreSource).toContain("visible={showImageConfigRow}");
    expect(contextPanelsSource).toContain("<ImageConfigRow");
  });

  it("enqueues text input when loop is running instead of blocking", async () => {
    mockState.dialog.activeControllers = { "loop:1": {} };
    addActiveController({
      messageId: "loop:1",
      controller: new AbortController(),
      dialogKey: "dialog-user-old-1",
    });

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    // Directly drive the mocked useChatInput text state so sendMessage sees content
    await act(async () => {
      setMockText!("follow-up while streaming");
    });

    const sendBtn = container.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    await act(async () => {
      sendBtn!.click();
    });

    const enqueued = dispatchCalls.find(
      (a: any) =>
        a.type === "dialogRuntime/enqueueUserInput" ||
        a.type === "dialog/enqueueUserInput"
    );
    expect(enqueued).toBeDefined();
    expect((enqueued as any)?.payload).toEqual({ text: "follow-up while streaming", dialogKey: "dialog-user-old-1" });
  });

  it("sends dialog text through the shared first-message path", async () => {
    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    await act(async () => {
      setMockText!("hello from dialog");
    });

    const sendBtn = container.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    await act(async () => {
      sendBtn!.click();
      await flush();
    });

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as { payload?: any } | undefined;
    expect(sendAction?.payload).toMatchObject({
      text: "hello from dialog",
      dialogKey: "dialog-user-old-1",
      imageFiles: [],
      extraParts: [],
    });
  });

  it("sends dialog images as imageFiles", async () => {
    mockImageFiles = new Map([
      [
        "img-1",
        new File(["image-bytes"], "photo.png", {
          type: "image/png",
        }),
      ],
    ]);
    mockImagePreviews = [{ id: "img-1", url: "blob:preview-1" }];
    MessageInputContainer = await loadMessageInputContainer();

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    const sendBtn = container.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    await act(async () => {
      sendBtn!.click();
      await flush();
    });

    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as { payload?: any } | undefined;
    expect(sendAction?.payload?.imageFiles).toHaveLength(1);
    expect(sendAction?.payload?.imageFiles?.[0]?.name).toBe("photo.png");
  });

  it("sends dialog uploaded files through pending attachment parts", async () => {
    mockState.dialog.pendingFiles = [
      {
        id: "pending-file-1",
        name: "notes.txt",
        pageKey: "page-user-notes",
        type: "txt",
      },
    ];
    addPendingFile({
      id: "pending-file-1",
      name: "notes.txt",
      pageKey: "page-user-notes",
      type: "txt",
      dialogKey: "dialog-user-old-1",
    });
    resolvedAttachmentParts = [
      {
        type: "txt",
        name: "notes.txt",
        pageKey: "page-user-notes",
      },
    ];

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    await act(async () => {
      setMockText!("read this file");
    });

    const sendBtn = container.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    await act(async () => {
      sendBtn!.click();
      await flush();
    });

    expect(resolvePendingAttachmentCalls[0]).toEqual([
      [
        {
          id: "pending-file-1",
          name: "notes.txt",
          pageKey: "page-user-notes",
          type: "txt",
          dialogKey: "dialog-user-old-1",
        },
      ],
      {
        currentServer: runtimeSnapshot.currentServer,
        resolveImageUrl: expect.any(Function),
      },
    ]);
    const sendAction = dispatchCalls.find(
      (action: any) => action.type === "chat/sendFirstMessage"
    ) as { payload?: any } | undefined;
    expect(sendAction?.payload?.extraParts).toEqual(resolvedAttachmentParts);
  });

  it("shows delete dialog confirmation above the composer for pending deleteDialogs tool runs", async () => {
    mockToolRuns = [
      {
        id: "tool-run-delete-dialogs",
        messageId: "assistant-1",
        toolName: "deleteDialogs",
        interaction: "confirm",
        status: "pending",
        input: { query: "中医评测" },
        startedAt: Date.now(),
      },
    ];
    mockState.dialog.currentDialogConfig.id = "old-1";
    mockState.message = {
      dialogStateById: {
        "old-1": {
          msgs: {
            ids: ["assistant-1", "tool-message-1"],
            entities: {
              "assistant-1": {
                id: "assistant-1",
                role: "assistant",
                cybotKey: "agent-1",
              },
              "tool-message-1": {
                id: "tool-message-1",
                role: "tool",
                content: JSON.stringify({
                  requiresConfirmation: true,
                  deletable: [
                    {
                      dialogId: "01DIALOGA0000000000000001",
                      dbKey: "dialog-user-1-01DIALOGA0000000000000001",
                      title: "请作为中医评测被试回答。不要输出思维过程",
                    },
                  ],
                  skipped: [],
                }),
                toolName: "deleteDialogs",
                toolPayload: {
                  toolRunId: "tool-run-delete-dialogs",
                  summary: "找到 1 个可删除对话",
                },
              },
            },
          },
          firstStreamProcessed: true,
          isLoadingInitial: false,
          isLoadingOlder: false,
          hasMoreOlder: false,
          error: null,
          lastStreamTimestamp: 0,
        },
      },
    };

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    expect(container.textContent).toContain("是否删除");
    expect(container.textContent).toContain("请作为中医评测被试回答");
    expect(container.textContent).toContain("确认删除");

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("确认删除")
    ) as HTMLButtonElement | undefined;
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.click();
      await flush();
    });

    expect(executeToolRunCalls[0]).toEqual({
      id: "tool-run-delete-dialogs",
      inputOverride: {
        query: "中医评测",
        confirmedDialogIds: ["01DIALOGA0000000000000001"],
      },
    });
  });

  it("shows delete space confirmation above the composer for pending deleteSpaces tool runs", async () => {
    mockToolRuns = [
      {
        id: "tool-run-delete-spaces",
        messageId: "assistant-1",
        toolName: "deleteSpaces",
        interaction: "confirm",
        status: "pending",
        input: { query: "测试空间" },
        startedAt: Date.now(),
      },
    ];
    mockState.dialog.currentDialogConfig.id = "old-1";
    mockState.message = {
      dialogStateById: {
        "old-1": {
          msgs: {
            ids: ["assistant-1", "tool-message-1"],
            entities: {
              "assistant-1": {
                id: "assistant-1",
                role: "assistant",
                cybotKey: "agent-1",
              },
              "tool-message-1": {
                id: "tool-message-1",
                role: "tool",
                content: JSON.stringify({
                  requiresConfirmation: true,
                  deletable: [
                    {
                      spaceId: "space-a",
                      name: "测试空间",
                    },
                  ],
                  skipped: [],
                }),
                toolName: "deleteSpaces",
                toolPayload: {
                  toolRunId: "tool-run-delete-spaces",
                  summary: "找到 1 个可删除空间",
                },
              },
            },
          },
          firstStreamProcessed: true,
          isLoadingInitial: false,
          isLoadingOlder: false,
          hasMoreOlder: false,
          error: null,
          lastStreamTimestamp: 0,
        },
      },
    };

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    expect(container.textContent).toContain("是否删除");
    expect(container.textContent).toContain("测试空间");
    expect(container.textContent).toContain("确认删除");

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("确认删除")
    ) as HTMLButtonElement | undefined;
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.click();
      await flush();
    });

    expect(executeToolRunCalls[0]).toEqual({
      id: "tool-run-delete-spaces",
      inputOverride: {
        query: "测试空间",
        confirmedSpaceIds: ["space-a"],
      },
    });
  });

  it("shows a visible pending indicator while image send preparation is still in flight", async () => {
    let resolveSend: (() => void) | null = null;
    sendFirstMessagePromise = new Promise<void>((resolve) => {
      resolveSend = resolve;
    });
    mockImageFiles = new Map([
      [
        "img-1",
        new File(["image-bytes"], "photo.png", {
          type: "image/png",
        }),
      ],
    ]);
    mockImagePreviews = [{ id: "img-1", url: "blob:preview-1" }];

    MessageInputContainer = await loadMessageInputContainer();

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    const sendBtn = container.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    await act(async () => {
      sendBtn!.click();
      await flush();
    });

    expect(container.textContent).toContain("Compressing images, please wait...");

    await act(async () => {
      resolveSend?.();
      await flush();
    });
  });

  it("synchronous ref guard prevents double dispatch on rapid send", async () => {
    // After fix: sendingGuardRef prevents re-entry even when React
    // state hasn't flushed yet.
    const { promise: sendGate, resolve: releaseSend } =
      Promise.withResolvers<void>();
    sendFirstMessagePromise = (async () => {
      await sendGate;
    })();

    MessageInputContainer = await loadMessageInputContainer();

    await act(async () => {
      root!.render(<MessageInputContainer />);
      await flush();
    });

    await act(async () => {
      setMockText!("hello");
    });

    const sendBtn = container.querySelector(
      'button[aria-label="Send"]',
    ) as HTMLButtonElement | null;
    expect(sendBtn).not.toBeNull();

    // First click blocks on sendFirstMessagePromise
    await act(async () => {
      sendBtn!.click();
    });

    // Second click — sendingGuardRef prevents re-entry
    await act(async () => {
      sendBtn!.click();
      await flush();
    });

    releaseSend();
    await act(async () => {
      await flush();
    });

    const sendCalls = dispatchCalls.filter(
      (a: unknown) =>
        typeof a === "object" && a !== null && (a as Record<string, unknown>).type === "chat/sendFirstMessage",
    );

    // Ref guard + React 18 batching: exactly one sendFirstMessage dispatch
    expect(sendCalls.length).toBe(1);
  });
});
