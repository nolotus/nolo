// 文件路径: chat/dialog/DialogPage.tsx

import React, { useEffect, Suspense, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { useHasMounted } from "app/hooks/useHasMounted";
import { useIdentity } from "identity";
import { useTranslation } from "react-i18next";
import { markDialogRead } from "create/space/spaceSlice";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { normalizeSpaceId } from "create/space/spaceKeys";

import {
  clearDialogState,
  initDialog,
  useCurrentDialogKey,
  useDialogConfigError,
} from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { ChatArea } from "chat/web/ChatArea";
import { LiveVoicePanel } from "chat/web/LiveVoicePanel";
import { isLiveAudioOnlyAgent } from "ai/agent/isLiveAudioOnlyAgent";
import type { Agent } from "app/types";
import {
  initMsgs,
  resetMsgs,
  useIsLoadingInitial,
  useMessageSessionError,
  useLastAbortTimestamp,
  useHasStreamingMessage,
  selectLastAssistantMessage,
  selectAllMsgs,
} from "chat/messages/messageSlice";
import { asOptionalTrimmedString } from "core/optionalString";
import { extractCustomId } from "core/prefix";
import PageLoading from "render/web/ui/PageLoading";
import { ensureDialogSpaceAction } from "./ensureDialogSpaceAction";
import { buildDialogUrl } from "./dialogUrl";
import {
  getDialogPageRenderMode,
  getDialogPageTitle,
  getQuickChatFirstMessageText,
  resolveDialogNotificationState,
  resolveDialogPageLoadState,
  resolveInheritedContextBanner,
  shouldRenderQuickChatNewDialogShell,
} from "./dialogPageRenderMode";
import { canChatDeviceLocalWithoutLogin } from "database/authority/deviceLocal";
import {
  getDialogAttentionTitle,
  resolveDialogCompletionOutcome,
  shouldNotifyDialogCompletion,
} from "./dialogAttention";

// 懒加载组件
const GuestGuide = React.lazy(() => import("render/web/ui/GuestGuide"));
const ErrorView = React.lazy(() => import("render/web/ui/ErrorView"));

// Full history on open — tool-heavy coding turns exceed any small window and
// blind multi-turn desktop agents if we only keep the last 30–50 rows.

import * as stylex from "@stylexjs/stylex";
import { dialogPageStyles } from "./dialogPageStyles";
import "./dialogStylexEscapeHatch.css";

// `.DialogPage__messages` 类名保留在 DOM：运行时 scrollContainerSelector 与
// dialogStylexEscapeHatch.css 的滚动条/后代覆盖规则依赖该类名；
// StyleX 原子类经组件 className prop 通道手动拼接（ChatArea 内部合并）。
const DIALOG_PAGE_MESSAGES_CLASS = `DialogPage__messages has-scroll-mask ${
  stylex.props(dialogPageStyles.messages).className ?? ""
}`.trim();
import { AgentDraftPanel } from "./AgentDraftPanel";
import { ChildRunObserverPanel } from "./ChildRunObserverPanel";
import { resolveLatestAgentDraftSidePanelState } from "./agentDraftPanelState";

type DialogBootstrapDispatchResult = {
  unwrap: () => Promise<unknown>;
  abort?: () => void;
};

const toBootstrapDispatchResult = (
  value: unknown,
): DialogBootstrapDispatchResult | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    unwrap?: unknown;
    abort?: unknown;
  };
  if (typeof candidate.unwrap !== "function") return null;
  return {
    unwrap: () => (candidate.unwrap as () => Promise<unknown>)(),
    ...(typeof candidate.abort === "function"
      ? { abort: candidate.abort as () => void }
      : {}),
  };
};

const DIALOG_PAGE_DEBUG = false;
const logDialogPage = (message: string, details?: Record<string, unknown>) => {
  if (!DIALOG_PAGE_DEBUG) return;
  if (details) {
    console.info(`[DialogPage] ${message}`, details);
    return;
  }
  console.info(`[DialogPage] ${message}`);
};

const perfNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const markDialogTtfi = (name: string, detail?: Record<string, unknown>) => {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") {
    return;
  }
  try {
    performance.mark(name, detail ? { detail } : undefined);
  } catch {
    try {
      performance.mark(name);
    } catch {
      // performance.mark may throw if the name is reserved; ignore.
    }
  }
};

const DialogPage = ({
  pageKey,
  routeSpaceId = null,
}: {
  pageKey: string;
  routeSpaceId?: string | null;
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const { currentUser: user, isLoggedIn } = useIdentity();
  const hasMounted = useHasMounted();
  const navigate = useNavigate();
  const location = useLocation();
  const dialogId = pageKey ? extractCustomId(pageKey) : null;
  const isNew = (location.state as any)?.isNew;
  const quickChatFirstMessageText = getQuickChatFirstMessageText(
    location.state as any,
  );
  const currentDialogKey = useCurrentDialogKey();
  const configError = useDialogConfigError();
  const currentDialogConfig = useCurrentDialogConfig();
  const isDeviceLocalDialog = useMemo(() => {
    const config = currentDialogConfig as
      | {
          dbKey?: string;
          userId?: string;
          cybots?: string[];
          primaryAgentKey?: string;
        }
      | null
      | undefined;
    return canChatDeviceLocalWithoutLogin({
      dbKey: pageKey || config?.dbKey || null,
      userId: config?.userId ?? null,
      cybots: config?.cybots ?? null,
      primaryAgentKey: config?.primaryAgentKey ?? null,
    });
  }, [currentDialogConfig, pageKey]);
  const canRenderNewDialogShell = shouldRenderQuickChatNewDialogShell({
    isNew,
    dialogId,
    hasPersistedDialogConfig: !!currentDialogConfig,
    quickChatFirstMessageText,
  });
  const isLoadingInitial = useIsLoadingInitial(dialogId);
  const error = useMessageSessionError(dialogId);
  const memberSpaces = useAllMemberSpaces();

  const hasStreamingMessage = useHasStreamingMessage(dialogId);
  const lastAssistantMessage = useAppSelector((state) =>
    dialogId ? selectLastAssistantMessage(state, dialogId) : undefined,
  );
  const messages = useAppSelector((state) =>
    dialogId ? selectAllMsgs(state, dialogId) : [],
  );
  const latestAgentDraftState = useMemo(
    () => resolveLatestAgentDraftSidePanelState(messages),
    [messages],
  );
  const latestAgentDraft = latestAgentDraftState?.draft ?? null;
  const shouldShowDraftPanel =
    new URLSearchParams(location.search).get("draftPanel") === "true" &&
    !!latestAgentDraft;

  const mountAtRef = useRef(perfNow());
  const lastNotifiedIdRef = useRef<string | null>(null);
  const previousStreamingRef = useRef(false);
  const turnStartedAtRef = useRef(0);
  const [attentionPending, setAttentionPending] = useState(false);
  const startedDialogLoadPageKeyRef = useRef<string | null>(null);
  // Finished once initDialog settles (config path). initMsgs may still run.
  const finishedDialogLoadPageKeyRef = useRef<string | null>(null);
  const inputReadyMarkedPageKeyRef = useRef<string | null>(null);
  const [finishedDialogLoadTick, setFinishedDialogLoadTick] = useState(0);
  const hasStartedDialogLoadForCurrentRoute =
    !!pageKey && startedDialogLoadPageKeyRef.current === pageKey;
  const hasFinishedDialogLoadForCurrentRoute =
    !!pageKey && finishedDialogLoadPageKeyRef.current === pageKey;
  void finishedDialogLoadTick;
  useEffect(() => {
    mountAtRef.current = perfNow();
    inputReadyMarkedPageKeyRef.current = null;
    markDialogTtfi("dialog-ttfi:mount", { pageKey, dialogId });
    logDialogPage("Mounted", {
      pageKey,
      dialogId,
      mountAt: Math.round(mountAtRef.current),
    });
  }, [pageKey, dialogId]);
  const { isBootstrappingSelectedDialog, isResolvingSelectedDialog } =
    resolveDialogPageLoadState({
      dialogId,
      pageKey,
      isLoggedIn,
      isDeviceLocalDialog,
      hasStartedDialogLoadForCurrentRoute,
      hasFinishedDialogLoadForCurrentRoute,
      error,
      currentDialogKey,
      currentDialogConfig,
    });

  const inheritedFromDialogKey = currentDialogConfig?.inheritedFromDialogKey;
  const inheritedFromDialogTitle =
    currentDialogConfig?.inheritedFromDialogTitle?.trim();
  const inheritedContextBanner = useMemo(
    () =>
      resolveInheritedContextBanner({
        inheritedFromDialogKey,
        inheritedFromDialogTitle,
      }),
    [inheritedFromDialogKey, inheritedFromDialogTitle],
  );
  const memberSpaceIdsSignature = useMemo(
    () => memberSpaces.map((space) => space.spaceId).join("|"),
    [memberSpaces],
  );
  const normalizedRouteSpaceId = useMemo(
    () => (routeSpaceId ? normalizeSpaceId(routeSpaceId) : null),
    [routeSpaceId],
  );
  const ensureDialogSpaceDependency =
    normalizedRouteSpaceId ?? memberSpaceIdsSignature;
  const renderMode = useMemo(
    () =>
      getDialogPageRenderMode({
        currentDialogConfig,
        dialogId: pageKey ? dialogId : null,
        error,
        hasMounted,
        isBootstrappingSelectedDialog,
        // FE-09: messages loading no longer gates ChatArea / composer.
        isLoadingInitial: false,
        isLoggedIn,
        isDeviceLocalDialog,
        isResolvingSelectedDialog,
        canRenderNewDialogShell,
      }),
    [
      canRenderNewDialogShell,
      currentDialogConfig,
      dialogId,
      error,
      hasMounted,
      isBootstrappingSelectedDialog,
      isDeviceLocalDialog,
      isLoggedIn,
      isResolvingSelectedDialog,
      pageKey,
    ],
  );

  // Time-to-first-input: first time ChatArea shell is eligible to mount.
  useEffect(() => {
    if (!pageKey || !dialogId) return;
    if (renderMode !== "chat-area" && renderMode !== "inline-error") return;
    if (inputReadyMarkedPageKeyRef.current === pageKey) return;
    inputReadyMarkedPageKeyRef.current = pageKey;
    const inputReadyAt = perfNow();
    const sinceMountMs = Math.round(inputReadyAt - mountAtRef.current);
    markDialogTtfi("dialog-ttfi:input-ready", {
      pageKey,
      dialogId,
      sinceMountMs,
      renderMode,
      isLoadingInitial,
    });
    logDialogPage("Input ready", {
      pageKey,
      dialogId,
      sinceMountMs,
      renderMode,
      isLoadingInitial,
    });
  }, [dialogId, isLoadingInitial, pageKey, renderMode]);

  const liveAudioAgentKey = useMemo(() => {
    const config = currentDialogConfig as
      | { primaryAgentKey?: string; cybots?: string[] }
      | null
      | undefined;
    if (!config) return null;
    const primary = asOptionalTrimmedString(config.primaryAgentKey);
    if (primary) return primary;
    const firstAgent = Array.isArray(config.cybots) ? config.cybots[0] : null;
    return asOptionalTrimmedString(firstAgent) ?? null;
  }, [currentDialogConfig]);

  const { data: liveAudioAgent } = useFetchData<Agent>(liveAudioAgentKey);
  const isLiveAudioOnlyAgentDialog = useMemo(
    () => (liveAudioAgent ? isLiveAudioOnlyAgent(liveAudioAgent) : false),
    [liveAudioAgent],
  );

  const [isLiveVoicePanelOpen, setIsLiveVoicePanelOpen] = useState(false);
  const liveAudioAutoOpenedDialogKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const dialogKey = currentDialogConfig?.dbKey ?? null;
    if (!isLiveAudioOnlyAgentDialog || !dialogKey) {
      liveAudioAutoOpenedDialogKeyRef.current = null;
      return;
    }
    if (liveAudioAutoOpenedDialogKeyRef.current === dialogKey) return;
    liveAudioAutoOpenedDialogKeyRef.current = dialogKey;
    setIsLiveVoicePanelOpen(true);
  }, [currentDialogConfig?.dbKey, isLiveAudioOnlyAgentDialog]);

  const liveVoiceDialogId =
    currentDialogConfig?.dbKey ??
    (pageKey && pageKey.startsWith("dialog-") ? pageKey : null);

  useEffect(() => {
    logDialogPage("State snapshot", {
      pageKey,
      dialogId,
      isLoggedIn,
      userId: user?.userId ?? null,
      currentDialogKey,
      currentDialogConfigKey: currentDialogConfig?.dbKey ?? null,
      currentDialogTitle: currentDialogConfig?.title ?? null,
      hasMounted,
      isLoadingInitial,
      hasStreamingMessage,
      hasError: !!error,
      errorMessage: error?.message ?? null,
      isNew: !!isNew,
      hasQuickChatFirstMessage: !!quickChatFirstMessageText,
      memberSpaceCount: memberSpaces.length,
      memberSpaceIdsSignature,
      routeSpaceId: normalizedRouteSpaceId,
      inheritedFromDialogKey: inheritedFromDialogKey ?? null,
      renderMode,
    });
  }, [
    currentDialogConfig?.dbKey,
    currentDialogConfig?.title,
    currentDialogKey,
    dialogId,
    error,
    error?.message,
    hasMounted,
    hasStreamingMessage,
    inheritedFromDialogKey,
    isLoadingInitial,
    isLoggedIn,
    isNew,
    quickChatFirstMessageText,
    memberSpaceIdsSignature,
    memberSpaces.length,
    pageKey,
    normalizedRouteSpaceId,
    renderMode,
    user?.userId,
  ]);

  // 初始化对话 & 消息（支持 Abort，防止旧请求覆盖新对话）
  // M3: device-local dialogs may bootstrap while logged out (no user).
  useEffect(() => {
    if (!pageKey || !dialogId) {
      logDialogPage("Skipping bootstrap: missing route context", {
        pageKey,
        dialogId,
        userId: user?.userId ?? null,
      });
      return;
    }
    if (!user && !isDeviceLocalDialog) {
      logDialogPage("Skipping bootstrap: guest on non-local dialog", {
        pageKey,
        dialogId,
      });
      return;
    }

    startedDialogLoadPageKeyRef.current = pageKey;
    finishedDialogLoadPageKeyRef.current = null;
    setFinishedDialogLoadTick((tick) => tick + 1);
    const bootstrapStartedAt = perfNow();
    markDialogTtfi("dialog-ttfi:bootstrap-start", {
      pageKey,
      dialogId,
      sinceMountMs: Math.round(bootstrapStartedAt - mountAtRef.current),
    });
    logDialogPage("Starting bootstrap", {
      pageKey,
      dialogId,
      userId: user?.userId ?? (isDeviceLocalDialog ? "local" : null),
      isDeviceLocalDialog,
      isNew: !!isNew,
      memberSpaceCount: memberSpaces.length,
      routeSpaceId: normalizedRouteSpaceId,
      bootstrapStartedAt,
    });

    // 进入对话即清零持久化未读（dialog 记录 unreadAt），侧边栏未读点据此消失。
    dispatch(markDialogRead({ dialogId, dialogKey: pageKey }));

    let cancelled = false;
    const initDialogDispatchResult = toBootstrapDispatchResult(
      dispatch(initDialog(pageKey)),
    );
    const initMsgsDispatchResult = toBootstrapDispatchResult(
      dispatch(
        initMsgs({
          dialogId,
          dialogKey: pageKey,
          isNew,
        }),
      ),
    );

    void (async () => {
      const initDialogTask =
        initDialogDispatchResult?.unwrap() ?? Promise.resolve(null);
      const initMsgsTask =
        initMsgsDispatchResult?.unwrap() ?? Promise.resolve(null);
      let initDialogSettledAt: number | null = null;
      let initMsgsSettledAt: number | null = null;
      // FE-09: config path finishes when initDialog settles so isResolving
      // clears without waiting on initMsgs (messages load under ChatArea).
      const initDialogTimingTask = initDialogTask.then((value) => {
        initDialogSettledAt = perfNow();
        markDialogTtfi("dialog-ttfi:init-dialog-settled", {
          pageKey,
          dialogId,
          durationMs: Math.round(initDialogSettledAt - bootstrapStartedAt),
        });
        if (!cancelled && finishedDialogLoadPageKeyRef.current !== pageKey) {
          finishedDialogLoadPageKeyRef.current = pageKey;
          setFinishedDialogLoadTick((tick) => tick + 1);
        }
        return value;
      });
      const initMsgsTimingTask = initMsgsTask.then((value) => {
        initMsgsSettledAt = perfNow();
        markDialogTtfi("dialog-ttfi:init-msgs-settled", {
          pageKey,
          dialogId,
          durationMs: Math.round(initMsgsSettledAt - bootstrapStartedAt),
        });
        return value;
      });
      try {
        const [dialogResult, msgsResult] = await Promise.allSettled([
          initDialogTimingTask,
          initMsgsTimingTask,
        ]);

        const settledAt = perfNow();
        logDialogPage("Bootstrap settled", {
          pageKey,
          dialogId,
          cancelled,
          initDialogStatus: dialogResult.status,
          initMsgsStatus: msgsResult.status,
          initDialogError:
            dialogResult.status === "rejected"
              ? String(dialogResult.reason)
              : null,
          initMsgsError:
            msgsResult.status === "rejected" ? String(msgsResult.reason) : null,
          loadedMessageCount:
            msgsResult.status === "fulfilled" && Array.isArray(msgsResult.value)
              ? msgsResult.value.length
              : null,
          initDialogDurationMs:
            initDialogSettledAt !== null
              ? Math.round(initDialogSettledAt - bootstrapStartedAt)
              : null,
          initMsgsDurationMs:
            initMsgsSettledAt !== null
              ? Math.round(initMsgsSettledAt - bootstrapStartedAt)
              : null,
          bootstrapTotalMs: Math.round(settledAt - bootstrapStartedAt),
          // TTFI path uses initDialogDurationMs; msgs may finish later.
          inputGate: "init-dialog",
        });
      } finally {
        if (cancelled) {
          logDialogPage("Bootstrap finished after cancellation", {
            pageKey,
            dialogId,
          });
        } else if (finishedDialogLoadPageKeyRef.current !== pageKey) {
          // Safety net if initDialog never attached a thenable.
          finishedDialogLoadPageKeyRef.current = pageKey;
          setFinishedDialogLoadTick((tick) => tick + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
      logDialogPage("Cleaning bootstrap effect", {
        pageKey,
        dialogId,
      });
      initDialogDispatchResult?.abort?.();
      initMsgsDispatchResult?.abort?.();
    };
  }, [pageKey, user?.userId, dialogId, dispatch, isNew, isDeviceLocalDialog]);

  useEffect(() => {
    if (!pageKey || !dialogId) return;
    if (!user && !isDeviceLocalDialog) return;

    let cancelled = false;
    void (async () => {
      try {
        const ensureSpaceOutcome: unknown = dispatch(
          ensureDialogSpaceAction(pageKey, normalizedRouteSpaceId),
        );
        const ensureSpaceDispatchResult =
          toBootstrapDispatchResult(ensureSpaceOutcome);
        const resolvedSpaceId = ensureSpaceDispatchResult
          ? await ensureSpaceDispatchResult.unwrap()
          : ensureSpaceOutcome instanceof Promise
            ? await ensureSpaceOutcome
            : null;
        if (cancelled) return;
        logDialogPage("ensureDialogSpaceAction resolved", {
          pageKey,
          dialogId,
          routeSpaceId: normalizedRouteSpaceId,
          resolvedSpaceId: resolvedSpaceId ?? null,
        });
      } catch (error) {
        if (cancelled) return;
        console.warn("[DialogPage] Failed to restore dialog space:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    dialogId,
    ensureDialogSpaceDependency,
    isDeviceLocalDialog,
    normalizedRouteSpaceId,
    pageKey,
    user?.userId,
  ]);

  // 卸载时清理当前对话状态；流式进行中保留消息 bucket，避免 remount/StrictMode 抹掉终态前内容
  const preserveMessagesOnUnmountRef = useRef(false);
  useEffect(() => {
    preserveMessagesOnUnmountRef.current = Boolean(hasStreamingMessage);
  }, [hasStreamingMessage]);

  useEffect(() => {
    return () => {
      logDialogPage("Clearing dialog state on unmount", {
        pageKey,
        dialogId,
        preserveMessages: preserveMessagesOnUnmountRef.current,
      });
      dispatch(clearDialogState());
      if (preserveMessagesOnUnmountRef.current) {
        return;
      }
      dispatch(resetMsgs(dialogId ? { dialogId } : undefined));
    };
  }, [dialogId, dispatch, pageKey]);

  const pageTitle = useMemo(() => {
    const baseTitle = getDialogPageTitle({
      dialogTitle: currentDialogConfig?.title,
      hasStreamingMessage,
    });
    return getDialogAttentionTitle(baseTitle, attentionPending && !hasStreamingMessage);
  }, [attentionPending, currentDialogConfig?.title, hasStreamingMessage]);

  // A route switch starts a new observation window; an active turn in the
  // previous dialog must not look like a completion in the newly selected one.
  useEffect(() => {
    previousStreamingRef.current = hasStreamingMessage;
    turnStartedAtRef.current = 0;
    setAttentionPending(false);
  }, [dialogId, pageKey]);

  // Detect the actual streaming -> completed transition. Initial history load,
  // failed turns, a page that remains visible, and user aborts must not create
  // attention. The abort signal lives in the session store (clearAllStreaming
  // writes lastAbortTimestamp synchronously) so async message persistence can
  // never race it.
  const lastAbortTimestamp = useLastAbortTimestamp(dialogId);
  useEffect(() => {
    // Remember when the current turn started streaming; an abort timestamp
    // newer than that means the user stopped this turn.
    if (!previousStreamingRef.current && hasStreamingMessage) {
      turnStartedAtRef.current = Date.now();
    }
    const wasAborted =
      turnStartedAtRef.current !== 0 &&
      lastAbortTimestamp > turnStartedAtRef.current;
    const isDocumentVisible =
      typeof document === "undefined" || document.visibilityState === "visible";
    const completedWhileAway = shouldNotifyDialogCompletion({
      previousStreaming: previousStreamingRef.current,
      nextStreaming: hasStreamingMessage,
      hasAssistantMessage: !!lastAssistantMessage,
      completionOutcome: resolveDialogCompletionOutcome(
        lastAssistantMessage?.metadata,
        wasAborted,
      ),
      isDocumentVisible,
    });
    previousStreamingRef.current = hasStreamingMessage;

    if (!completedWhileAway) return;
    setAttentionPending(true);
    try {
      const AudioContextCtor =
        typeof window !== "undefined" &&
        ((window as any).AudioContext || (window as any).webkitAudioContext);
      if (AudioContextCtor) {
        const context = new AudioContextCtor();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
        const closeContext = () => void context.close().catch(() => undefined);
        oscillator.addEventListener("ended", closeContext, { once: true });
        window.setTimeout(closeContext, 500);
        void context.resume().catch(() => undefined);
      }
    } catch {
      // Browser autoplay policy or an unavailable audio API must not affect chat.
    }
  }, [hasStreamingMessage, lastAbortTimestamp, lastAssistantMessage]);

  useEffect(() => {
    if (typeof document === "undefined" || !attentionPending) return;
    const clearAttention = () => setAttentionPending(false);
    document.addEventListener("visibilitychange", clearAttention);
    window.addEventListener("focus", clearAttention);
    return () => {
      document.removeEventListener("visibilitychange", clearAttention);
      window.removeEventListener("focus", clearAttention);
    };
  }, [attentionPending]);

  // 同步浏览器 tab 标题
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!pageTitle) return;
    document.title = pageTitle;
    logDialogPage("Updated document title", {
      pageKey,
      dialogId,
      pageTitle,
    });
  }, [dialogId, pageKey, pageTitle]);

  // 浏览器通知：页面不在前台且有新的助手消息时，简单提示
  useEffect(() => {
    const notificationState = resolveDialogNotificationState({
      lastAssistantMessageId: lastAssistantMessage?.id,
      hasNotificationApi:
        typeof window !== "undefined" && typeof Notification !== "undefined",
      permission:
        typeof Notification === "undefined"
          ? "unsupported"
          : Notification.permission,
      isDocumentVisible:
        typeof document !== "undefined" &&
        document.visibilityState === "visible",
      lastNotifiedMessageId: lastNotifiedIdRef.current,
      dialogTitle: currentDialogConfig?.title,
    });

    if (!notificationState.shouldNotify) {
      logDialogPage("Skipping notification", {
        pageKey,
        dialogId,
        messageId: lastAssistantMessage?.id ?? null,
        reason: notificationState.reason,
        permission:
          typeof Notification === "undefined"
            ? "unsupported"
            : Notification.permission,
      });
      return;
    }

    lastNotifiedIdRef.current = lastAssistantMessage?.id ?? null;

    try {
      new Notification(notificationState.title, {
        body: "有新的回复",
        tag: lastAssistantMessage?.id,
      });
      logDialogPage("Notification sent", {
        pageKey,
        dialogId,
        messageId: lastAssistantMessage?.id ?? null,
        title: notificationState.title,
      });
    } catch (notificationError) {
      // 部分环境可能抛错，这里直接吞掉即可
      console.warn("[DialogPage] Notification failed:", notificationError);
    }
  }, [currentDialogConfig?.title, dialogId, lastAssistantMessage, pageKey]);

  const renderInheritedContextBanner = () => {
    if (!inheritedContextBanner) return null;

    const description = t(
      inheritedContextBanner.translationKey,
      inheritedContextBanner.fallback,
      inheritedContextBanner.params,
    );

    return (
      <div
        {...stylex.props(dialogPageStyles.contextBanner)}
        role="status"
        aria-live="polite"
      >
        <div {...stylex.props(dialogPageStyles.contextBannerInner)}>
          <span {...stylex.props(dialogPageStyles.contextBannerText)}>{description}</span>
          <button
            type="button"
            data-hook="dialog-esc-dp-banner-link"
            {...stylex.props(dialogPageStyles.contextBannerLink)}
            onClick={() => {
              logDialogPage("Navigating to inherited source dialog", {
                pageKey,
                dialogId,
                inheritedFromDialogKey: inheritedContextBanner.sourceDialogKey,
              });
              navigate(buildDialogUrl(inheritedContextBanner.sourceDialogKey));
            }}
          >
            {t("openSourceDialog", "查看原对话")}
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!hasMounted && pageKey && dialogId) {
      return <PageLoading message="加载对话数据" />;
    }

    // 未登录：账号私有对话仍走访客引导；设备本地对话解锁 chat-area（M3）
    if (!isLoggedIn && !isDeviceLocalDialog) {
      logDialogPage("Guest hit private dialog route", {
        pageKey,
        dialogId,
      });
      return (
        <Suspense fallback={<PageLoading message="检查权限" />}>
          <div style={{ flex: 1 }}>
            <GuestGuide
              title={t("privateDialogGuestTitle", "这是私有对话链接")}
              description={t(
                "privateDialogGuestHint",
                "当前 /dialog-… 路由只对登录且有权限的账号可见。若要把这段对话发给别人，请改用 /share/<token> 链接。",
              )}
            />
          </div>
        </Suspense>
      );
    }

    // 初次加载：只等 dialog config bootstrap/resolve。
    // FE-09: 不因 isLoadingInitial（initMsgs）阻塞输入壳挂载。
    if (
      !canRenderNewDialogShell &&
      (isBootstrappingSelectedDialog || isResolvingSelectedDialog)
    ) {
      return <PageLoading message="加载对话数据" />;
    }

    // 错误态：对话配置已加载时，保留对话视图，仅显示内联错误提示
    if (error && currentDialogConfig && dialogId) {
      return (
        <>
          {renderInheritedContextBanner()}
          <div
            style={{
              padding: "8px 16px",
              background: "var(--errorBg, #fff0f0)",
              color: "var(--errorText, #c00)",
              fontSize: "var(--fontSize-sm)",
              borderBottom: "1px solid var(--errorBorder, #fcc)",
              flexShrink: 0,
            }}
          >
            ⚠️ {error.message || t("loadError", "加载出错，部分消息可能不完整")}
          </div>
          <ChatArea
            dialogId={dialogId}
            scrollContainerSelector=".DialogPage__messages"
            messagesClassName={DIALOG_PAGE_MESSAGES_CLASS}
          />
        </>
      );
    }

    // 严重错误：对话配置无法加载且不是新对话的外壳时，显示错误页
    if (error && !canRenderNewDialogShell) {
      return (
        <Suspense fallback={<PageLoading />}>
          <div style={{ flex: 1 }}>
            <ErrorView error={error} />
          </div>
        </Suspense>
      );
    }

    // 正常对话
    if (currentDialogConfig && dialogId) {
      return (
        <>
          {renderInheritedContextBanner()}
          <ChatArea
            dialogId={dialogId}
            scrollContainerSelector=".DialogPage__messages"
            messagesClassName={DIALOG_PAGE_MESSAGES_CLASS}
          />
        </>
      );
    }

    if (canRenderNewDialogShell && dialogId) {
      return (
        <>
          {error && (
            <div
              style={{
                padding: "8px 16px",
                background: "var(--errorBg, #fff0f0)",
                color: "var(--errorText, #c00)",
                fontSize: "var(--fontSize-sm)",
                borderBottom: "1px solid var(--errorBorder, #fcc)",
                flexShrink: 0,
              }}
            >
              ⚠️{" "}
              {error.message || t("loadError", "加载出错，部分消息可能不完整")}
            </div>
          )}
          <ChatArea
            dialogId={dialogId}
            scrollContainerSelector=".DialogPage__messages"
            messagesClassName={DIALOG_PAGE_MESSAGES_CLASS}
          />
        </>
      );
    }
    // Dialog config 加载失败（如对话已删除）
    if (configError && dialogId && !currentDialogConfig) {
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-5)",
            color: "var(--textSecondary)",
            gap: "var(--space-3)",
          }}
        >
          <div style={{ fontSize: "var(--fontSize-lg)", fontWeight: 500 }}>
            {t("dialogNotFound", "对话不存在或已被删除")}
          </div>
          <div style={{ fontSize: "var(--fontSize-sm)", color: "var(--textTertiary)" }}>
            {configError}
          </div>
        </div>
      );
    }

    // 未选择对话
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-5)",
          color: "var(--textSecondary)",
        }}
      >
        {t("selectADialog")}
      </div>
    );
  };

  const shouldShowChildRunObserver =
    isLoggedIn &&
    !!dialogId &&
    (renderMode === "chat-area" || renderMode === "inline-error");

  return (
    <>
      {/* 聊天页根容器：负责整页宽度 / 左右安全区 / 垂直布局 */}
      <div {...stylex.props(dialogPageStyles.shell)}>
        <div
          data-hook="dialog-esc-dp-root"
          {...stylex.props(
            dialogPageStyles.root,
            (shouldShowDraftPanel || shouldShowChildRunObserver) &&
              dialogPageStyles.rootWithSidePanel,
          )}
        >
          {renderContent()}
        </div>
        {shouldShowDraftPanel && latestAgentDraft && (
          <AgentDraftPanel
            initialDraft={latestAgentDraft}
            version={latestAgentDraftState?.version ?? null}
            createdAgent={
              latestAgentDraftState?.kind === "created"
                ? latestAgentDraftState.createdAgent
                : null
            }
            onClose={() => {
              const next = new URLSearchParams(location.search);
              next.delete("draftPanel");
              const query = next.toString();
              navigate(
                `${location.pathname}${query ? `?${query}` : ""}${location.hash || ""}`,
              );
            }}
          />
        )}
        {shouldShowChildRunObserver && dialogId ? (
          <ChildRunObserverPanel parentThreadId={dialogId} />
        ) : null}
        {isLiveVoicePanelOpen && liveAudioAgentKey && liveVoiceDialogId && (
          <LiveVoicePanel
            agentId={liveAudioAgentKey}
            dialogId={liveVoiceDialogId}
            onClose={() => setIsLiveVoicePanelOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default DialogPage;
