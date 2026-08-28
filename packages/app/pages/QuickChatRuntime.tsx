// file: packages/app/pages/QuickChat.tsx
import React, { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { TextField, TextArea } from "react-aria-components";
import { useNavigate } from "app/routing";
import {
  enableNextRouteViewTransition,
  viewTransitionStyle,
  QUICK_CHAT_COMPOSER_VT_NAME,
} from "app/viewTransitions";
import { toast } from "app/utils/toast"
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  createDialog, type PendingFile, clearPendingAttachments, usePendingFiles, } from "chat/dialog/dialogSlice";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { markRecentlyCreated } from "chat/web/sidebar/recentlyCreatedStore";
import { sendFirstMessage } from "chat/messages/sendFirstMessage";
import { selectDefaultAgentId } from "app/settings/settingSlice";
import { useFetchData } from "app/hooks";
import { isAbortError } from "core/abortError";
import { getIsDesktopApp } from "app/utils/env";
import { noloAgentId } from "core/init";
import { asTrimmedString } from "core/trimmedString";
import type { Agent } from "app/types";
import { useChatInput } from "chat/hooks/useChatInput";
import { useFileDropZone } from "app/hooks/useFileDropZone";
import { shouldDeferEnterForIme } from "app/utils/ime";
import { compactWorkspacePath } from "app/utils/compactWorkspacePath";
import { read, selectEntities } from "database/dbSlice";
import { fetchUserProfile } from "identity/actions";
import { selectSpaceById } from "create/space/spaceSlice";
import { selectIdentityUserBalance } from "identity/selectors";
import { useUserId } from "identity";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { selectOcrModel } from "app/settings/settingSlice";
import AttachmentsPreview from "chat/web/AttachmentsPreview";
import { BrowseContextIndicator } from "chat/web/BrowseContextIndicator";
import FileUploadButton from "chat/web/FileUploadButton";
import SendButton from "chat/web/SendButton";
import VoiceInputButton from "chat/web/VoiceInputButton";
import { useAutoResizeTextarea } from "app/hooks/useAutoResizeTextarea";
import { useMessageInputFiles } from "chat/web/useMessageInputFiles";
import {
  buildQuickChatExtraParts,
  buildQuickChatFirstMessageText,
  buildQuickChatRouteState,
  formatQuickChatDialogTitle,
  getQuickChatPerfNow,
  logQuickChatPerf,
  resolveQuickChatAgentKey,
  QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY,
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
  allowsQuickChatModelOverride,
} from "./quickChatFlow";
import { buildQuickChatModelOverride } from "ai/agent/quickChatModelOverride";
import type { AgentRuntimeOptions } from "ai/agent/types";
import {
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_NOLO_AGENT_NAME,
} from "core/builtinAgents";

import {
  resolveQuickChatPlaceholderMeta,
  type QuickChatMode,
  type QuickChatTier,
} from "./quickChatFlow";
import { LiveVoicePanel } from "chat/web/LiveVoicePanel";
import { isLiveAudioOnlyAgent } from "ai/agent/isLiveAudioOnlyAgent";
import { LuSettings2 } from "react-icons/lu";
import QuickChatModeSelector from "./QuickChatModeSelector";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
// 默认档路由出来的对话统一叫 nolo（而不是具体型号名），型号换代不改标题。
const QUICK_CHAT_AGENT_TITLES: Record<string, string> = {
  [BUILTIN_NOLO_AGENT_KEY]: BUILTIN_NOLO_AGENT_NAME,
};


type QuickChatErrorKey =
  | "createDialogFailed"
  | "sendMessageFailed";

const isAbortLikeError = (error: unknown) => {
  if (typeof error === "string") {
    return /aborted/i.test(error);
  }

  // Shared AbortError name detection; still accept aborted-message shapes.
  if (isAbortError(error)) return true;

  if (error instanceof Error) {
    return /aborted/i.test(error.message);
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && /aborted/i.test(message);
  }

  return false;
};

export type QuickChatRuntimeSurface = "default" | "home-primary" | "space-home-compact";

export interface QuickChatRuntimeProps {
  initialText?: string;
  initialAgentId?: string | null;
  surface?: QuickChatRuntimeSurface;
  /** Route-authoritative Space context; when set, wins over Redux for createDialog. */
  spaceId?: string;
  autoSend?: boolean;
  isEmptyState?: boolean;
  onPersonalizationClick?: () => void;
  quickChatMode: QuickChatMode;
  onModeChange: (mode: QuickChatMode) => void;
}

const QUICK_CHAT_DEBUG = false;
const QuickChatRuntime: React.FC<QuickChatRuntimeProps> = ({
  initialText = "",
  initialAgentId = null,
  surface = "default",
  spaceId: spaceIdProp,
  autoSend = false,
  isEmptyState = false,
  onPersonalizationClick,
  quickChatMode,
  onModeChange: handleModeChange,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const dialogKeyRef = useRef<string | null>(null);
  // 发送时解析出的实际 agent，供 live-audio 面板回退使用。
  const dialogAgentIdRef = useRef<string | null>(null);
  const defaultAgentId = useAppSelector(selectDefaultAgentId);
  // 自动模式「模型层覆盖」agent：用户选择的收藏 agent，路由落到通用档时
  // 替换档位 agent 的 model 层并合并其技能；空字符串 = 不覆盖。
  const autoAgentId =
    useAppSelector(
      (state) => state.settings?.quickChatAutoAgentId as string | undefined,
    ) || "";
  const { data: autoOverrideAgent } = useFetchData<Agent>(autoAgentId || null);
  const allDbEntities = useAppSelector((state) => state.db?.entities ?? {});
  // 默认档已改为写死常量(QUICK_CHAT_DEFAULT_TIER_AGENTS,现指向 nolo 本体),
  // 不再走用户设置;有图无图都走同一个默认档（纯文本模型收到图片时仅剥离为占位文本）。
  const resolveTierAgent = useCallback(
    (tier: Exclude<QuickChatTier, "image">) => QUICK_CHAT_DEFAULT_TIER_AGENTS[tier],
    [],
  );
  // 发送前档位未定，用默认 agent（nolo）承载 live-audio 检测与语音面板回退。
  const currentModeAgentId = defaultAgentId;
  const shouldReadCurrentAgent =
    currentModeAgentId !== noloAgentId && !!currentModeAgentId;
  const { data: agent } = useFetchData<Agent>(
    shouldReadCurrentAgent ? currentModeAgentId : null
  );
  const storeSpaceId = useCurrentSpaceId() || undefined;
  // Explicit route spaceId wins so first-render Redux lag cannot create an unscoped dialog.
  const currentSpaceId = spaceIdProp ?? storeSpaceId;
  const currentSpace = useAppSelector((state) => selectSpaceById(state, currentSpaceId));
  const agentName =
    agent?.name || (currentModeAgentId === noloAgentId ? "nolo" : t("unknown"));
  const pendingFiles = usePendingFiles() as PendingFile[];
  const currentUserId = useUserId();
  const currentUserBalance = useAppSelector(selectIdentityUserBalance);
  const { currentServer, currentToken: token } =
    useAppSelector(selectRuntimeSnapshot);
  const ocrModel = useAppSelector(selectOcrModel);
  const isComposingRef = useRef(false);
  const lastCompositionEndAtRef = useRef(0);
  const isStartingRef = useRef(false);
  const autoSendStartedRef = useRef(false);
  const currentUserBalanceRef = useRef(currentUserBalance);
  const balanceLoadPromiseRef = useRef<Promise<number> | null>(null);
  const initialAgentIdRef = useRef(initialAgentId);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    initialAgentIdRef.current = initialAgentId;
  }, [initialAgentId]);

  React.useEffect(() => {
    currentUserBalanceRef.current = currentUserBalance;
  }, [currentUserBalance]);


  const {
    text,
    setText,
    imageFiles,
    imgPreviews,
    processImages,
    removeImage,
    clear: clearInput,
  } = useChatInput();

  const {
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus,
  } = useMessageInputFiles(processImages, {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    pendingFiles,
  });

  React.useEffect(() => {
    if (initialText && !text) {
      setText(initialText);
    }
  }, [initialText, setText, text]);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as any).__NOLO_DESKTOP__ ||
      (window as any).__NOLO_DESKTOP_E2E__ !== true
    ) return;
    const handleDesktopE2eQuickChat = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: unknown }>).detail;
      const nextText = asTrimmedString(detail?.text);
      if (!nextText) return;
      void startQuickChatRef.current(nextText);
    };
    window.addEventListener("nolo-desktop-e2e-quick-chat", handleDesktopE2eQuickChat);
    return () => {
      window.removeEventListener("nolo-desktop-e2e-quick-chat", handleDesktopE2eQuickChat);
    };
  }, []);

  React.useEffect(() => {
    if (agent && "defaultInteractionMode" in agent && agent.defaultInteractionMode === "live_audio") {
      setIsVoicePanelOpen(true);
    }
  }, [agent]);

  React.useEffect(() => {
    if (
      autoSend &&
      text &&
      !autoSendStartedRef.current &&
      !isStartingRef.current &&
      !isSending
    ) {
      autoSendStartedRef.current = true;
      void startQuickChatRef.current();
    }
  }, [autoSend, text, isSending]);

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileDropZone(processFiles);

  const startQuickChatRef = useRef<
    (overrideText?: string) => Promise<void>
  >(async () => {});

  const getErrorReason = useCallback(
    (error: unknown) => {
      const reason = (() => {
        if (typeof error === "string" && error.trim()) {
          return error;
        }
        if (error instanceof Error && error.message.trim()) {
          return error.message;
        }
        if (error && typeof error === "object") {
          const message = (error as { message?: unknown }).message;
          if (typeof message === "string" && message.trim()) {
            return message;
          }
        }
        return t("unknown");
      })();
      return reason === "Rejected" ? t("sendFailMessage", "发送失败，请重试") : reason;
    },
    [t]
  );

  const notifyStartupError = useCallback(
    (errorKey: QuickChatErrorKey, error: unknown) => {
      console.error("[QuickChat] start failed", { stage: errorKey, error });
      toast.error(`${t(`quickChat.${errorKey}`)}: ${getErrorReason(error)}`);
    },
    [getErrorReason, t]
  );

  const ensureCurrentBalanceLoaded = useCallback(async () => {
    if (typeof currentUserBalanceRef.current === "number") {
      return currentUserBalanceRef.current;
    }

    if (!currentUserId) {
      throw new Error("请先登录后再试。");
    }

    if (!balanceLoadPromiseRef.current) {
      balanceLoadPromiseRef.current = Promise.resolve(
        dispatch(fetchUserProfile()).unwrap()
      )
        .then((profile) => {
          const nextBalance =
            typeof profile?.balance === "number"
              ? profile.balance
              : currentUserBalanceRef.current;
          if (typeof nextBalance !== "number") {
            throw new Error("正在获取用户余额，请稍候...");
          }
          currentUserBalanceRef.current = nextBalance;
          return nextBalance;
        })
        .finally(() => {
          balanceLoadPromiseRef.current = null;
        });
    }

    return balanceLoadPromiseRef.current;
  }, [currentUserId, dispatch]);

  const startQuickChat = useCallback(async (overrideText?: string) => {
    const startedAt = getQuickChatPerfNow();
    const trimmedText = (overrideText ?? text).trim();
    if (
      isStartingRef.current ||
      isSending ||
      (!trimmedText && !imageFiles.size && !pendingFiles.length)
    )
      return;

    isStartingRef.current = true;
    setIsSending(true);
    logQuickChatPerf("start", startedAt, {
      hasText: !!trimmedText,
      imageCount: imageFiles.size,
      pendingFileCount: pendingFiles.length,
    });
    QUICK_CHAT_DEBUG && console.group("[QuickChatTrace] startQuickChat enter");
    QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] startQuickChat input", {
      trimmedTextLength: trimmedText.length,
      imageFilesSize: imageFiles.size,
      pendingFilesLength: pendingFiles.length,
      hasImages: imageFiles.size > 0 || pendingFiles.length > 0,
      quickChatMode,
    });

    try {
      try {
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] ensureCurrentBalanceLoaded ...");
        await ensureCurrentBalanceLoaded();
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] ensureCurrentBalanceLoaded done");
      } catch (error) {
        QUICK_CHAT_DEBUG && console.warn("[QuickChatTrace] ensureCurrentBalanceLoaded failed", error);
        notifyStartupError("sendMessageFailed", error);
        QUICK_CHAT_DEBUG && console.groupEnd();
        return;
      }
      const filesArray = Array.from(imageFiles.values());
      const hasImages = filesArray.length > 0 || pendingFiles.length > 0;
      const firstMessageText = buildQuickChatFirstMessageText(trimmedText, hasImages);
      const specialistAgentId = initialAgentIdRef.current;
      // resolveQuickChatAgentKey：有图无图都走 flash 档（预处理管道处理图片）；专职 agent 不走自动路由。
      const resolvedAgent = specialistAgentId
        ? { agentKey: specialistAgentId }
        : await resolveQuickChatAgentKey({
            hasImages,
            resolveTierAgent,
          });
      const effectiveAgentId = resolvedAgent.agentKey || defaultAgentId;
      // 仅当路由落在通用档（自动选 model 的结果）时应用模型层覆盖；
      // 专职 agent / image 档 / 手动指定 agent 保持原样。
      const quickChatModelOverride =
        autoOverrideAgent && allowsQuickChatModelOverride(effectiveAgentId)
          ? buildQuickChatModelOverride(autoOverrideAgent)
          : null;
      const dialogTitle =
        QUICK_CHAT_AGENT_TITLES[effectiveAgentId] ?? formatQuickChatDialogTitle(agentName);
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] routing", {
        hasImages,
        effectiveAgentId,
        dialogTitle,
        defaultAgentId,
      });
      dialogAgentIdRef.current = effectiveAgentId;

      let dialogKey = "";
      let dialogSpaceId: string | null = null;

      try {
        const dialogAgentMode = specialistAgentId ? "fixed" : "auto";
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] createDialog dispatch", {
          agentMode: dialogAgentMode,
          cybots: specialistAgentId ? [effectiveAgentId] : [],
          spaceId: currentSpaceId,
          title: dialogTitle,
        });
        const result = await dispatch(
          createDialog({
            agentMode: dialogAgentMode,
            cybots: specialistAgentId ? [effectiveAgentId] : [],
            skipGreeting: true,
            skipAgentConfigRead: true,
            optimisticReturnBeforeWrite: true,
            spaceId: currentSpaceId,
            title: dialogTitle,
          })
        ).unwrap();
        dialogKey = (result as { dbKey?: string } | undefined)?.dbKey ?? "";
        dialogKeyRef.current = dialogKey;
        dialogSpaceId = (result as { spaceId?: string } | undefined)?.spaceId ?? null;
        initialAgentIdRef.current = null;
        if (!dialogKey) {
          throw new Error("Dialog key is missing.");
        }
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] createDialog resolved", {
          dialogKey,
          dialogSpaceId,
        });
        logQuickChatPerf("dialog-created", startedAt, {
          dialogKey,
          dialogSpaceId,
        });
      } catch (error) {
        QUICK_CHAT_DEBUG && console.error("[QuickChatTrace] createDialog failed", error);
        notifyStartupError("createDialogFailed", error);
        QUICK_CHAT_DEBUG && console.groupEnd();
        return;
      }

      // Jump to the dialog immediately after create succeeds. Sending continues
      // in the background; staying on /chat after create is a broken UX
      // (dialog appears in sidebar but the shell never leaves QuickChat).
      markRecentlyCreated(dialogKey);
      const routeState = buildQuickChatRouteState(trimmedText);
      const dialogUrl = buildDialogUrl(dialogKey, dialogSpaceId);
      logQuickChatPerf("navigate-started", startedAt, {
        dialogKey,
        dialogSpaceId,
        dialogUrl,
      });
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] navigate", {
        dialogUrl,
        routeState,
      });
      // replace: drop the empty /chat shell so Back does not return to a blank composer.
      enableNextRouteViewTransition();
      navigate(dialogUrl, {
        replace: true,
        state: routeState,
      });
      logQuickChatPerf("navigated", startedAt, {
        dialogKey,
      });

      logQuickChatPerf("prepare-first-message-started", startedAt, {
        dialogKey,
        imageCount: imageFiles.size,
        pendingFileCount: pendingFiles.length,
      });
      const extraParts = buildQuickChatExtraParts(pendingFiles);
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] prepare sendFirstMessage", {
        dialogKey,
        textLength: trimmedText.length,
        imageCount: filesArray.length,
        imageFileSummaries: filesArray.map((f) => ({
          name: f.name,
          type: f.type,
          sizeBytes: f.size,
        })),
        extraPartCount: extraParts.length,
      });

      const desktopCwd =
        typeof window !== "undefined" ? window.__NOLO_DESKTOP_CWD__?.trim() : undefined;
      const runtimeOptions: AgentRuntimeOptions = {
        ...(getIsDesktopApp() ? { workspaceToolsHint: true } : {}),
        ...(getIsDesktopApp() && desktopCwd ? { cwd: desktopCwd } : {}),
        ...(quickChatModelOverride
          ? { quickChatModelOverride }
          : {}),
        // 跟随「默认档」语义而不是某个具体 agent key：默认档换指向时
        // （广场档 → nolo 本体）这段不会悄悄失效。
        ...(!specialistAgentId &&
          effectiveAgentId === QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY &&
          !quickChatModelOverride
          ? { quickChatReasoningEffort: "max" as const }
          : {}),
      };
      const sendPromise = Promise.resolve(
        dispatch(
          sendFirstMessage({
            dialogKey,
            text: firstMessageText,
            imageFiles: filesArray,
            extraParts: extraParts as any,
            quickChatPerfStartedAt: startedAt,
            // Auto dialogs do not persist the routed Agent key; pass the
            // resolved target only for this turn.
            targetAgentKey: effectiveAgentId,
            ...(Object.keys(runtimeOptions).length > 0
              ? { runtimeOptions }
              : {}),
          })
        )
      );
      logQuickChatPerf("send-first-message-dispatched", startedAt, {
        dialogKey,
        extraPartCount: extraParts.length,
        imageCount: filesArray.length,
      });
      logQuickChatPerf("first-message-dispatched", startedAt, {
        dialogKey,
      });

      clearInput();
      clearFileStatus();
      dispatch(clearPendingAttachments());
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] cleared local imageFiles and pendingFiles");
      QUICK_CHAT_DEBUG && console.groupEnd();

      void sendPromise.catch((error) => {
        if (isAbortLikeError(error)) {
          console.info("[QuickChat] ignored aborted first-message send", {
            dialogKey,
            error,
          });
          return;
        }
        // 错误已由 handleSendMessageAction 写入对话流（含可点击链接），
        // 不再弹 toast，用户可直接在对话里操作。
        if (error && typeof error === "object" && (error as any).__errorInDialog === true) {
          console.info("[QuickChat] send error written into dialog", {
            dialogKey,
            message: (error as any).message,
          });
          return;
        }
        QUICK_CHAT_DEBUG && console.error("[QuickChatTrace] sendFirstMessage rejected", error);
        notifyStartupError("sendMessageFailed", error);
      });
    } finally {
      isStartingRef.current = false;
      setIsSending(false);
    }
  }, [
    isSending,
    text,
    imageFiles,
    pendingFiles,
    dispatch,
    navigate,
    defaultAgentId,
    currentSpaceId,
    resolveTierAgent,
    clearInput,
    clearFileStatus,
    agentName,
    ensureCurrentBalanceLoaded,
    notifyStartupError,
    quickChatMode,
    autoOverrideAgent,
  ]);
  useEffect(() => {
    startQuickChatRef.current = startQuickChat;
  }, [startQuickChat]);

  const isLiveAudioOnly = useMemo(() => {
    if (!agent) return false;
    return isLiveAudioOnlyAgent(agent as any);
  }, [agent]);

  const isSendDisabled = useMemo(() => {
    if (isLiveAudioOnly) return true;
    return (
      (!text.trim() && !imageFiles.size && !pendingFiles.length) || isSending
    );
  }, [text, imageFiles.size, pendingFiles.length, isSending, isLiveAudioOnly]);
  const showVoiceInput = useMemo(
    () => !text.trim() && !imageFiles.size && !pendingFiles.length && !isSending,
    [text, imageFiles.size, pendingFiles.length, isSending]
  );

  const handleQuickChatFileSelection = useCallback(
    (files: FileList | null) => {
      void processFiles(files);
    },
    [processFiles]
  );

  const { handleChange: autoResizeOnChange } = useAutoResizeTextarea({
    maxHeight: 360,
    onTextChange: setText,
    value: text,
    ref: areaRef,
  });

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    lastCompositionEndAtRef.current = Date.now();
  }, []);

  const handleTextareaBlur = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !shouldDeferEnterForIme({
          event: e,
          isComposing: isComposingRef.current,
          lastCompositionEndAt: lastCompositionEndAtRef.current,
        })
      ) {
        e.preventDefault();
        startQuickChat();
      }
    },
    [startQuickChat]
  );

  const handleTranscribed = useCallback(
    (transcript: string) => {
      setText(text ? `${text} ${transcript}` : transcript);
    },
    [setText, text]
  );

  const handleVoiceSend = useCallback((transcript: string) => {
    return startQuickChatRef.current(transcript);
  }, []);
  const placeholderMeta = resolveQuickChatPlaceholderMeta(
    quickChatMode.mode,
    isEmptyState,
  );
  const inputPlaceholder = t(placeholderMeta.key, placeholderMeta.defaultValue);
  const desktopCwd =
    getIsDesktopApp() && typeof window !== "undefined"
      ? window.__NOLO_DESKTOP_CWD__?.trim()
      : undefined;
  // Prefer the current space's bound folder; fall back to the desktop process cwd.
  const workspacePath = currentSpace?.boundFolder?.trim() || desktopCwd;
  return (
    <>
      <div
        className="quick-chat-container"
        data-workspace-cwd={workspacePath || undefined}
        data-surface={surface}
        data-testid="quick-chat-runtime"
        style={viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME, {
          enabled: surface === "home-primary",
        })}
      >
        {getIsDesktopApp() && (
          <div
            className="quick-chat-workspace-indicator"
            data-testid="quick-chat-workspace"
            title={workspacePath || undefined}
          >
            {t("quickChat.workspace", "工作区")}:{" "}
            {(workspacePath && compactWorkspacePath(workspacePath)) || t("quickChat.workspaceUnset", "未设置")}
          </div>
        )}
        <div
          className={`quick-chat-box chat-input-card ${isDragOver ? "drag-over" : ""} ${isSending ? "is-sending" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-file-drop-target="quick-chat"
          data-sending={isSending || undefined}
        >
          <AttachmentsPreview
            imagePreviews={imgPreviews}
            pendingFiles={pendingFilesWithStatus}
            onRemoveImage={removeImage}
            processingFiles={processingFileIds}
          />

          <BrowseContextIndicator />

          <TextField
            className="message-input__textarea-wrap"
            aria-label={inputPlaceholder}
            aria-busy={isSending || undefined}
          >
            <TextArea
              ref={areaRef as React.RefObject<HTMLTextAreaElement>}
              className="message-input__textarea"
              data-testid="quick-chat-input"
              placeholder={inputPlaceholder}
              value={text}
              rows={1}
              onChange={autoResizeOnChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onBlur={handleTextareaBlur}
              onKeyDown={handleTextareaKeyDown}
              disabled={isSending}
            />
          </TextField>

          <div className="message-input__controls">
            <div className="message-input__controls-left">
              <FileUploadButton
                disabled={isSending}
                onFilesSelected={handleQuickChatFileSelection}
              />

              <QuickChatModeSelector mode={quickChatMode} onModeChange={handleModeChange} surface={surface} />
            </div>

            <div className="message-input__controls-right">
              {onPersonalizationClick && isEmptyState && (
                <button
                  type="button"
                  className="personalization-button"
                  onClick={onPersonalizationClick}
                  title={t("quickChat.personalization.title", "告诉 Nolo 我的习惯")}
                  aria-label={t("quickChat.personalization.title", "告诉 Nolo 我的习惯")}
                >
                  <LuSettings2 size={16} aria-hidden="true" />
                  <span className="personalization-button-text">
                    {t("quickChat.personalization.label", "告诉 Nolo 我的习惯")}
                  </span>
                </button>
              )}

              {showVoiceInput ? (
                <VoiceInputButton
                  onTranscribed={handleTranscribed}
                  onSend={handleVoiceSend}
                  className="voice-btn-in-send"
                  iconSize={20}
                />
              ) : (
                <SendButton
                  onClick={startQuickChat}
                  disabled={isSendDisabled}
                  loading={isSending}
                  testId="quick-chat-send"
                />
              )}
            </div>
          </div>
        </div>
        {isVoicePanelOpen && dialogKeyRef.current && (
          <LiveVoicePanel
            agentId={dialogAgentIdRef.current ?? currentModeAgentId}
            dialogId={dialogKeyRef.current}
            onClose={() => setIsVoicePanelOpen(false)}
          />
        )}
      </div>

    </>
  );
};

export default QuickChatRuntime;
