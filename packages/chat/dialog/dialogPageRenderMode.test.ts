import { describe, expect, it } from "bun:test";

import {
  getDialogPageRenderMode,
  getDialogPageTitle,
  getQuickChatFirstMessageText,
  isDialogPageInputInteractive,
  resolveDialogNotificationState,
  resolveDialogPageLoadState,
  resolveInheritedContextBanner,
  shouldRenderQuickChatNewDialogShell,
} from "./dialogPageRenderMode";

describe("dialogPageRenderMode", () => {
  it("extracts quick-chat first message text only from the supported route state shape", () => {
    expect(
      getQuickChatFirstMessageText({
        isNew: true,
        quickChatFirstMessage: { text: "  hello  " },
      })
    ).toBe("hello");
    expect(getQuickChatFirstMessageText({ isNew: true })).toBe("");
    expect(getQuickChatFirstMessageText(null)).toBe("");
  });

  it("allows a new quick-chat dialog shell to render during bootstrap", () => {
    expect(
      shouldRenderQuickChatNewDialogShell({
        isNew: true,
        dialogId: "1",
        quickChatFirstMessageText: "hello",
      })
    ).toBe(true);
    expect(
      shouldRenderQuickChatNewDialogShell({
        isNew: true,
        dialogId: "1",
        quickChatFirstMessageText: "",
      })
    ).toBe(false);
  });

  it("allows a persisted new empty dialog shell to render after createDialog navigation", () => {
    expect(
      shouldRenderQuickChatNewDialogShell({
        isNew: true,
        dialogId: "1",
        hasPersistedDialogConfig: true,
        quickChatFirstMessageText: "",
      })
    ).toBe(true);
  });

  it("keeps ordinary dialogs loading while letting quick-chat fast path render chat-area", () => {
    const loadingInputs = {
      currentDialogConfig: null,
      dialogId: "1",
      error: null,
      hasMounted: true,
      isBootstrappingSelectedDialog: true,
      isLoadingInitial: true,
      isLoggedIn: true,
      isResolvingSelectedDialog: true,
    };

    expect(
      getDialogPageRenderMode({
        ...loadingInputs,
        canRenderNewDialogShell: false,
      })
    ).toBe("loading");
    expect(
      getDialogPageRenderMode({
        ...loadingInputs,
        canRenderNewDialogShell: true,
      })
    ).toBe("chat-area");
  });

  it("does not block chat-area on isLoadingInitial once dialog config is ready (FE-09 TTFI)", () => {
    expect(
      getDialogPageRenderMode({
        currentDialogConfig: { dbKey: "dialog-user-1" },
        dialogId: "1",
        error: null,
        hasMounted: true,
        isBootstrappingSelectedDialog: false,
        isLoadingInitial: true,
        isLoggedIn: true,
        isResolvingSelectedDialog: false,
        canRenderNewDialogShell: false,
      }),
    ).toBe("chat-area");
    expect(
      isDialogPageInputInteractive(
        getDialogPageRenderMode({
          currentDialogConfig: { dbKey: "dialog-user-1" },
          dialogId: "1",
          error: null,
          hasMounted: true,
          isBootstrappingSelectedDialog: false,
          isLoadingInitial: true,
          isLoggedIn: true,
          isResolvingSelectedDialog: false,
          canRenderNewDialogShell: false,
        }),
      ),
    ).toBe(true);
  });

  it("still shows loading while config is resolving even if messages already idle", () => {
    expect(
      getDialogPageRenderMode({
        currentDialogConfig: null,
        dialogId: "1",
        error: null,
        hasMounted: true,
        isBootstrappingSelectedDialog: false,
        isLoadingInitial: false,
        isLoggedIn: true,
        isResolvingSelectedDialog: true,
        canRenderNewDialogShell: false,
      }),
    ).toBe("loading");
  });

  it("derives bootstrap and resolve flags from the current dialog selection state", () => {
    expect(
      resolveDialogPageLoadState({
        dialogId: "1",
        pageKey: "dialog-1",
        isLoggedIn: true,
        hasStartedDialogLoadForCurrentRoute: false,
        hasFinishedDialogLoadForCurrentRoute: false,
        error: null,
        currentDialogKey: null,
        currentDialogConfig: null,
      })
    ).toEqual({
      isBootstrappingSelectedDialog: true,
      isResolvingSelectedDialog: true,
    });

    expect(
      resolveDialogPageLoadState({
        dialogId: "1",
        pageKey: "dialog-user-1",
        isLoggedIn: true,
        hasStartedDialogLoadForCurrentRoute: true,
        hasFinishedDialogLoadForCurrentRoute: true,
        error: null,
        currentDialogKey: "dialog-user-1",
        currentDialogConfig: null,
      })
    ).toEqual({
      isBootstrappingSelectedDialog: false,
      isResolvingSelectedDialog: false,
    });
  });

  it("builds the document title from dialog title and streaming state", () => {
    expect(
      getDialogPageTitle({
        dialogTitle: " Demo ",
        hasStreamingMessage: false,
      })
    ).toBe("Demo");
    expect(
      getDialogPageTitle({
        dialogTitle: "Demo",
        hasStreamingMessage: true,
      })
    ).toBe("● Demo");
  });

  it("classifies notification eligibility without mixing it into the effect", () => {
    expect(
      resolveDialogNotificationState({
        lastAssistantMessageId: "msg-1",
        hasNotificationApi: true,
        permission: "granted",
        isDocumentVisible: false,
        lastNotifiedMessageId: null,
        dialogTitle: " Demo ",
      })
    ).toEqual({
      shouldNotify: true,
      reason: "ready",
      title: "Demo",
    });

    expect(
      resolveDialogNotificationState({
        lastAssistantMessageId: "msg-1",
        hasNotificationApi: true,
        permission: "granted",
        isDocumentVisible: true,
        lastNotifiedMessageId: null,
        dialogTitle: "Demo",
      })
    ).toEqual({
      shouldNotify: false,
      reason: "document-visible",
    });
  });

  it("describes inherited-context banners without embedding translation branching in the component", () => {
    expect(
      resolveInheritedContextBanner({
        inheritedFromDialogKey: "dialog-1",
        inheritedFromDialogTitle: "Source",
      })
    ).toEqual({
      sourceDialogKey: "dialog-1",
      translationKey: "inheritedContextNoticeWithTitle",
      fallback: "此对话继承自“{{title}}”的上下文",
      params: { title: "Source" },
    });

    expect(
      resolveInheritedContextBanner({
        inheritedFromDialogKey: null,
        inheritedFromDialogTitle: "Source",
      })
    ).toBeNull();
  });

  it("keeps account-private dialogs on guest-guide when logged out", () => {
    expect(
      getDialogPageRenderMode({
        currentDialogConfig: { dbKey: "dialog-user-1-01X" },
        dialogId: "01X",
        error: null,
        hasMounted: true,
        isBootstrappingSelectedDialog: false,
        isLoadingInitial: false,
        isLoggedIn: false,
        isDeviceLocalDialog: false,
        isResolvingSelectedDialog: false,
        canRenderNewDialogShell: false,
      })
    ).toBe("guest-guide");
  });

  it("unlocks chat-area for device-local dialogs when logged out", () => {
    expect(
      getDialogPageRenderMode({
        currentDialogConfig: {
          dbKey: "dialog-local-01DIALOG",
          userId: "local",
        },
        dialogId: "01DIALOG",
        error: null,
        hasMounted: true,
        isBootstrappingSelectedDialog: false,
        isLoadingInitial: false,
        isLoggedIn: false,
        isDeviceLocalDialog: true,
        isResolvingSelectedDialog: false,
        canRenderNewDialogShell: false,
      })
    ).toBe("chat-area");
  });

  it("bootstraps device-local dialogs while logged out", () => {
    expect(
      resolveDialogPageLoadState({
        dialogId: "01DIALOG",
        pageKey: "dialog-local-01DIALOG",
        isLoggedIn: false,
        isDeviceLocalDialog: true,
        hasStartedDialogLoadForCurrentRoute: false,
        hasFinishedDialogLoadForCurrentRoute: false,
        error: null,
        currentDialogKey: null,
        currentDialogConfig: null,
      })
    ).toEqual({
      isBootstrappingSelectedDialog: true,
      isResolvingSelectedDialog: true,
    });
  });
});
