import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";

export type DialogPageRenderMode =
  | "hydration-loading"
  | "guest-guide"
  | "loading"
  | "inline-error"
  | "error-view"
  | "chat-area"
  | "empty";

const BASE_APP_TITLE = "Nolo";
const STREAMING_TITLE_PREFIX = "●";

export type QuickChatRouteState = {
  isNew?: unknown;
  quickChatFirstMessage?: {
    text?: unknown;
  };
} | null | undefined;

export const getQuickChatFirstMessageText = (
  routeState: QuickChatRouteState
) => {
  const text = routeState?.quickChatFirstMessage?.text;
  return asTrimmedString(text);
};

export const shouldRenderQuickChatNewDialogShell = ({
  isNew,
  dialogId,
  hasPersistedDialogConfig,
  quickChatFirstMessageText,
}: {
  isNew: unknown;
  dialogId: string | null;
  hasPersistedDialogConfig?: boolean;
  quickChatFirstMessageText: string;
}) =>
  !!isNew &&
  !!dialogId &&
  (!!quickChatFirstMessageText || !!hasPersistedDialogConfig);

export const resolveDialogPageLoadState = ({
  dialogId,
  pageKey,
  isLoggedIn,
  isDeviceLocalDialog = false,
  hasStartedDialogLoadForCurrentRoute,
  hasFinishedDialogLoadForCurrentRoute,
  error,
  currentDialogKey,
  currentDialogConfig,
}: {
  dialogId: string | null;
  pageKey: string;
  isLoggedIn: boolean;
  /** Device-local dialogs may bootstrap while logged out (M3). */
  isDeviceLocalDialog?: boolean;
  hasStartedDialogLoadForCurrentRoute: boolean;
  hasFinishedDialogLoadForCurrentRoute: boolean;
  error: Error | null;
  currentDialogKey: string | null;
  currentDialogConfig: unknown;
}) => {
  const configStillMissing =
    (!currentDialogKey && !currentDialogConfig) ||
    (currentDialogKey === pageKey && !currentDialogConfig);
  const bootstrapStillRunning =
    !hasStartedDialogLoadForCurrentRoute ||
    !hasFinishedDialogLoadForCurrentRoute;
  const mayBootstrap = isLoggedIn || isDeviceLocalDialog;

  return {
    isBootstrappingSelectedDialog:
      !!dialogId &&
      !!pageKey &&
      mayBootstrap &&
      !hasStartedDialogLoadForCurrentRoute,
    isResolvingSelectedDialog:
      !!dialogId &&
      !!pageKey &&
      !error &&
      configStillMissing &&
      bootstrapStillRunning,
  };
};

export const getDialogPageRenderMode = ({
  currentDialogConfig,
  dialogId,
  error,
  hasMounted,
  isBootstrappingSelectedDialog,
  /**
   * @deprecated OPT-FE-09: initial message load no longer blocks chat-area /
   * time-to-first-input. Kept optional for call-site compatibility; ignored.
   */
  isLoadingInitial: _isLoadingInitial,
  isLoggedIn,
  isDeviceLocalDialog = false,
  isResolvingSelectedDialog,
  canRenderNewDialogShell,
}: {
  currentDialogConfig: unknown;
  dialogId: string | null;
  error: Error | null;
  hasMounted: boolean;
  isBootstrappingSelectedDialog: boolean;
  /** Ignored for render gating (FE-09). Messages load under ChatArea. */
  isLoadingInitial?: boolean;
  isLoggedIn: boolean;
  /**
   * When true, logged-out clients may enter chat-area for device-local
   * dialogs. Account-private dialogs stay on guest-guide (M3).
   */
  isDeviceLocalDialog?: boolean;
  isResolvingSelectedDialog: boolean;
  canRenderNewDialogShell: boolean;
}): DialogPageRenderMode => {
  void _isLoadingInitial;
  if (!hasMounted && dialogId) {
    return "hydration-loading";
  }
  // Account-private dialogs still require login; device-local dialogs unlock.
  if (!isLoggedIn && !isDeviceLocalDialog) return "guest-guide";
  // OPT-FE-09: only wait for dialog *config* bootstrap/resolve. Do not block
  // the input shell on initMsgs / isLoadingInitial — MessageList can populate
  // under ChatArea while the user can already focus the composer.
  if (
    !canRenderNewDialogShell &&
    (isBootstrappingSelectedDialog || isResolvingSelectedDialog)
  ) {
    return "loading";
  }
  if (error && currentDialogConfig && dialogId) return "inline-error";
  if (error) return "error-view";
  if (currentDialogConfig && dialogId) return "chat-area";
  if (canRenderNewDialogShell) return "chat-area";
  // Logged-out device-local routes with a dialog id should not collapse to
  // empty while config is still loading — bootstrap handles that path.
  if (!isLoggedIn && isDeviceLocalDialog && dialogId) return "loading";
  return "empty";
};

/** Modes where ChatArea (and thus the composer) is mounted. */
export const isDialogPageInputInteractive = (
  mode: DialogPageRenderMode,
): boolean => mode === "chat-area" || mode === "inline-error";

export const getDialogPageTitle = ({
  dialogTitle,
  hasStreamingMessage,
}: {
  dialogTitle: string | null | undefined;
  hasStreamingMessage: boolean;
}) => {
  const trimmedDialogTitle = dialogTitle?.trim();
  const baseTitle = trimmedDialogTitle || BASE_APP_TITLE;
  return hasStreamingMessage
    ? `${STREAMING_TITLE_PREFIX} ${baseTitle}`
    : baseTitle;
};

export const resolveDialogNotificationState = ({
  lastAssistantMessageId,
  hasNotificationApi,
  permission,
  isDocumentVisible,
  lastNotifiedMessageId,
  dialogTitle,
}: {
  lastAssistantMessageId: string | null | undefined;
  hasNotificationApi: boolean;
  permission: NotificationPermission | "unsupported";
  isDocumentVisible: boolean;
  lastNotifiedMessageId: string | null;
  dialogTitle: string | null | undefined;
}) => {
  if (!lastAssistantMessageId) {
    return { shouldNotify: false, reason: "missing-message" } as const;
  }
  if (!hasNotificationApi) {
    return { shouldNotify: false, reason: "api-unavailable" } as const;
  }
  if (permission !== "granted") {
    return { shouldNotify: false, reason: "permission-denied" } as const;
  }
  if (isDocumentVisible) {
    return { shouldNotify: false, reason: "document-visible" } as const;
  }
  if (lastNotifiedMessageId === lastAssistantMessageId) {
    return { shouldNotify: false, reason: "already-notified" } as const;
  }

  return {
    shouldNotify: true,
    reason: "ready",
    title:
      asOptionalTrimmedString(dialogTitle) ?? (BASE_APP_TITLE || "新回复"),
  } as const;
};

export const resolveInheritedContextBanner = ({
  inheritedFromDialogKey,
  inheritedFromDialogTitle,
}: {
  inheritedFromDialogKey: string | null | undefined;
  inheritedFromDialogTitle: string | null | undefined;
}) => {
  if (!inheritedFromDialogKey) return null;
  const trimmedTitle = inheritedFromDialogTitle?.trim();
  if (trimmedTitle) {
    return {
      sourceDialogKey: inheritedFromDialogKey,
      translationKey: "inheritedContextNoticeWithTitle",
      fallback: "此对话继承自“{{title}}”的上下文",
      params: { title: trimmedTitle },
    } as const;
  }
  return {
    sourceDialogKey: inheritedFromDialogKey,
    translationKey: "inheritedContextNotice",
    fallback: "此对话继承自上一段对话的上下文",
    params: undefined,
  } as const;
};
