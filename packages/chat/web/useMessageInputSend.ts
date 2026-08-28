// packages/chat/web/useMessageInputSend.ts
// Send / queue / slash-command (/new, /compact) path for the message composer.
// Keeps MessageInputContainer as an assembly layer while preserving existing
// resolver + action contracts.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { useAppDispatch } from "app/store";
import { toast } from "app/utils/toast";
import type { AgentRuntimeOptions } from "ai/agent/types";
import {
  createDialog,
  clearPendingAttachments,
  enqueueUserInput,
} from "../dialog/dialogSlice";
import { sendFirstMessage } from "chat/messages/sendFirstMessage";
import { resolvePendingAttachmentsToMessageParts } from "chat/messages/pendingAttachmentParts";
import { resolveBrowserModelImageUrl } from "chat/messages/browserImageUrl";
import { compactDialogAndForkAction } from "chat/dialog/actions/compactDialogAndForkAction";
import { getPrimaryDialogAgentId } from "chat/dialog/dialogAgents";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import {
  isCompactDialogSlashCommand,
  isFreshDialogSlashCommand,
} from "./messageSlashCommands";
import { resolveMessageInputSendDecision } from "./messageInputSendResolver";
import { editUserMessageAndReplay } from "chat/messages/messageSlice";
import {
  buildCanvasNodeEditingTarget,
  markPendingCanvasEditSelection,
  publishCanvasEditSelection,
} from "render/canvas/canvasEditContext";
import {
  clearSelectedNode,
} from "app/appInspector/appInspectorStore";
import { buildLocalPreviewEditingTarget } from "app/appInspector/buildLocalPreviewEditingTarget";
import type { ImageUiConfig, ImageProfileOption } from "./messageInputAgentUi";

export type EditingSession = {
  messageId: string;
  originalContent: any;
};

export type UseMessageInputSendArgs = {
  text: string;
  textRef: MutableRefObject<string>;
  imageFiles: Map<string, File>;
  imgPreviews: Array<{ id: string; url: string }>;
  pendingFiles: any[];
  clearInput: () => void;
  clearFileStatus: () => void;
  processingCount: number;
  hasStreamingMessage: boolean;
  isLoopRunning: boolean;
  canMultiImg: boolean;
  mentionTargetAgentKey: string | null;
  setMentionStateInactive: () => void;
  currentDialogKey: string | null | undefined;
  currentDialogConfig: any;
  currentServer: string | null | undefined;
  token: string | null | undefined;
  runtimeOptions?: AgentRuntimeOptions;
  imageUiConfig?: ImageUiConfig | null;
  imageAspectRatio: string | undefined;
  imageSize: "1K" | "2K" | "4K" | undefined;
  selectedImageProfile: ImageProfileOption | undefined;
  canvasEditSelection: any;
  editingSession: EditingSession | null;
  setEditingSession: (session: EditingSession | null) => void;
  appSelectedNode: any;
  areaRef: MutableRefObject<HTMLTextAreaElement | null>;
};

export function useMessageInputSend(args: UseMessageInputSendArgs) {
  const {
    text,
    textRef,
    imageFiles,
    imgPreviews,
    pendingFiles,
    clearInput,
    clearFileStatus,
    processingCount,
    hasStreamingMessage,
    isLoopRunning,
    canMultiImg,
    mentionTargetAgentKey,
    setMentionStateInactive,
    currentDialogKey,
    currentDialogConfig,
    currentServer,
    token,
    runtimeOptions,
    imageUiConfig,
    imageAspectRatio,
    imageSize,
    selectedImageProfile,
    canvasEditSelection,
    editingSession,
    setEditingSession,
    appSelectedNode,
    areaRef,
  } = args;

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");

  const [isSending, setIsSending] = useState(false);
  const [pendingSendImageCount, setPendingSendImageCount] = useState(0);
  const [startFreshOnNextSend, setStartFreshOnNextSend] = useState(false);

  // 同步防重入守卫：避免 React state 异步批处理导致 sendMessage 被调用两次
  const sendingGuardRef = useRef(false);
  // Mirror startFresh flag in a ref so sendMessage can read it without depending
  // on state (keeps callback identity stable for memoized controls / keydown).
  const startFreshOnNextSendRef = useRef(false);
  // 用 ref 持有最新 sendMessage，避免语音转录后 onSend 拿到旧闭包（text 为空）
  const sendMessageRef = useRef<(overrideText?: string) => Promise<void>>(
    async () => {}
  );

  // Snapshot volatile values into refs so sendMessage identity is stable across
  // pure keystrokes (text changes). Callers pass textRef for the latest text.
  const latestRef = useRef(args);
  useEffect(() => {
    latestRef.current = args;
    latestRef.current.text = text;
  });

  const markStartFreshOnNextSend = useCallback((next: boolean) => {
    startFreshOnNextSendRef.current = next;
    setStartFreshOnNextSend(next);
  }, []);

  const clearState = useCallback(() => {
    clearInput();
    clearFileStatus();
    setMentionStateInactive();
    dispatch(clearPendingAttachments());

    if (areaRef.current) {
      areaRef.current.style.height = "auto";
      areaRef.current.focus();
    }
  }, [clearInput, clearFileStatus, dispatch, setMentionStateInactive, areaRef]);

  const cancelEditingSession = useCallback(() => {
    setEditingSession(null);
  }, [setEditingSession]);

  const armFreshDialogSend = useCallback(() => {
    clearState();
    markStartFreshOnNextSend(true);
    toast.success(
      "Started a fresh dialog. Next message will open a new chat."
    );
  }, [clearState, markStartFreshOnNextSend]);

  const runCompactDialog = useCallback(async () => {
    if (!currentDialogKey) {
      throw new Error(
        "Cannot compact before the current dialog is initialized."
      );
    }

    const result = await dispatch(
      compactDialogAndForkAction({ dialogKey: currentDialogKey })
    ).unwrap();

    clearState();
    navigate(buildDialogUrl(result.dbKey, result.spaceId), {
      state: { isNew: true },
    });
    toast.success("Compacted this chat and switched to a new dialog.");
  }, [clearState, currentDialogKey, dispatch, navigate]);

  // 拆分“能否继续输入”和“能否立刻再次发送”：
  // 输入框尽量保持可编辑，只在真正阻断发送动作时禁用按钮/上传。
  const isSendPending = isSending && !hasStreamingMessage && !isLoopRunning;
  const isSendBlocked = processingCount > 0 || isSendPending;
  const fileUploadDisabled = processingCount > 0 || isSendPending;

  const sendViaFreshDialog = useCallback(
    async ({
      text: sendText,
      imageFiles: sendImageFiles,
      extraParts,
      runtimeOptions: sendRuntimeOptions,
      targetAgentKey,
    }: {
      text: string;
      imageFiles: File[];
      extraParts: any[];
      runtimeOptions?: AgentRuntimeOptions;
      targetAgentKey?: string;
    }) => {
      const nextAgentKey =
        targetAgentKey ?? getActiveDialogAgentId(currentDialogConfig);

      if (!nextAgentKey) {
        throw new Error(
          "Cannot start a fresh dialog without a primary agent."
        );
      }

      const result = await dispatch(
        createDialog({ cybots: [nextAgentKey], skipGreeting: true })
      ).unwrap();

      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true },
      });

      await dispatch(
        sendFirstMessage({
          dialogKey: result.dbKey,
          text: sendText,
          imageFiles: sendImageFiles,
          extraParts,
          runtimeOptions: sendRuntimeOptions,
          targetAgentKey,
        })
      );

      markStartFreshOnNextSend(false);
    },
    [currentDialogConfig, dispatch, markStartFreshOnNextSend, navigate]
  );

  const sendMessage = useCallback(async (overrideText?: string) => {
    if (sendingGuardRef.current) return;

    const snap = latestRef.current;
    const liveText = overrideText ?? snap.textRef.current ?? snap.text;
    const liveImgPreviews = snap.imgPreviews;
    const livePendingFiles = snap.pendingFiles;
    // Use sendingGuardRef (synced with isSending) so sendMessage identity does
    // not churn when the pending flag flips — memoized controls keep stable onClick.
    const decisionIsSendPending =
      sendingGuardRef.current &&
      !snap.hasStreamingMessage &&
      !snap.isLoopRunning;
    const decisionIsSendBlocked =
      snap.processingCount > 0 || decisionIsSendPending;

    const decision = resolveMessageInputSendDecision({
      text: liveText,
      imagePreviewCount: liveImgPreviews.length,
      pendingFileCount: livePendingFiles.length,
      isSendBlocked: decisionIsSendBlocked,
      canMultiImg: snap.canMultiImg,
      isLoopRunning: snap.isLoopRunning,
      isSendPending: decisionIsSendPending,
      isFreshDialogSlashCommand,
      isCompactDialogSlashCommand,
    });

    switch (decision.kind) {
      case "arm-fresh-dialog":
        armFreshDialogSend();
        return;
      case "compact-blocked":
        toast.error(
          "Wait for the current response to finish before using /compact."
        );
        return;
      case "compact-dialog":
        break;
      case "noop":
        return;
      case "multi-image-blocked":
        toast.error(
          t(
            "insufficientBalanceForMultipleImagesSend",
            "余额未达到19，无法发送多张图片"
          )
        );
        return;
      case "queue-text":
        dispatch(
          enqueueUserInput({
            text: decision.text,
            dialogKey: snap.currentDialogKey ?? undefined,
          })
        );
        clearState();
        toast.success(
          t("messageQueued", "消息已排队，将在当前轮次结束后发送"),
          {
            duration: 2000,
          }
        );
        return;
      case "queue-blocked":
        toast.error(
          t(
            "cannotSendFileDuringLoop",
            "Agent 运行中，含附件消息请等待完成后再发送"
          )
        );
        return;
      case "send":
        break;
    }

    if (decision.kind === "compact-dialog") {
      try {
        await runCompactDialog();
      } catch (e: any) {
        console.error("[MessageInput] runCompactDialog error:", e);
        const rawMsg =
          typeof e === "string" ? e : e?.message || t("sendFailMessage");
        const msg = rawMsg === "Rejected" ? t("sendFailMessage") : rawMsg;
        toast.error(msg);
      }
      return;
    }
    const trimmed = decision.text;

    const currentImageFiles = Array.from(snap.imageFiles.values());
    const targetAgentKey = snap.mentionTargetAgentKey ?? undefined;

    const canOverrideImageConfig =
      snap.imageUiConfig?.showControls &&
      snap.imageUiConfig.supportsImageConfig;

    const hasImageOverride =
      canOverrideImageConfig &&
      (snap.imageAspectRatio ||
        snap.imageSize ||
        snap.selectedImageProfile?.imageModelOverride);

    const effectiveRuntimeOptionsBase = hasImageOverride
      ? {
          ...snap.runtimeOptions,
          imageConfigOverride: {
            ...snap.runtimeOptions?.imageConfigOverride,
            imageModelOverride: snap.selectedImageProfile?.imageModelOverride,
            aspectRatio: snap.imageAspectRatio,
            imageSize: snap.imageSize,
          },
        }
      : snap.runtimeOptions;
    const base = effectiveRuntimeOptionsBase ?? {};
    const effectiveRuntimeOptions = snap.canvasEditSelection
      ? {
          ...base,
          editingTarget: buildCanvasNodeEditingTarget(snap.canvasEditSelection),
        }
      : snap.appSelectedNode && !base.editingTarget
        ? {
            ...base,
            editingTarget: buildLocalPreviewEditingTarget(snap.appSelectedNode),
          }
        : base;

    if (snap.canvasEditSelection) {
      markPendingCanvasEditSelection(snap.canvasEditSelection);
    }
    setPendingSendImageCount(currentImageFiles.length);
    sendingGuardRef.current = true;
    setIsSending(true);
    if (!snap.editingSession) {
      clearState();
    }
    // 选中元素是「本轮」意图：随本条消息注入后即清除，避免粘到后续消息。
    if (snap.appSelectedNode) {
      clearSelectedNode();
    }

    try {
      if (snap.editingSession) {
        if (currentImageFiles.length > 0 || livePendingFiles.length > 0) {
          throw new Error("编辑历史消息时暂不支持新增附件");
        }

        await dispatch(
          editUserMessageAndReplay({
            dialogKey: snap.currentDialogKey ?? undefined,
            messageId: snap.editingSession.messageId,
            originalContent: snap.editingSession.originalContent,
            nextText: trimmed,
            runtimeOptions: effectiveRuntimeOptions,
            targetAgentKey,
            quickChatPerfStartedAt: undefined,
          })
        ).unwrap();
        if (snap.canvasEditSelection) {
          publishCanvasEditSelection(null);
        }
        clearState();
        cancelEditingSession();
        markStartFreshOnNextSend(false);
        return;
      }

      const attachmentParts = await resolvePendingAttachmentsToMessageParts(
        livePendingFiles,
        {
          currentServer: snap.currentServer,
          resolveImageUrl: (imageUrl) =>
            resolveBrowserModelImageUrl(imageUrl, {
              authToken: snap.token,
            }),
        }
      );

      if (startFreshOnNextSendRef.current) {
        await sendViaFreshDialog({
          text: trimmed,
          imageFiles: currentImageFiles,
          extraParts: attachmentParts,
          runtimeOptions: effectiveRuntimeOptions as any,
          targetAgentKey,
        });
        if (snap.canvasEditSelection) {
          publishCanvasEditSelection(null);
        }
        return;
      }

      await dispatch(
        sendFirstMessage({
          text: trimmed,
          imageFiles: currentImageFiles,
          extraParts: attachmentParts,
          dialogKey: snap.currentDialogKey ?? undefined,
          runtimeOptions: effectiveRuntimeOptions as any,
          targetAgentKey,
        })
      );
      if (snap.canvasEditSelection) {
        publishCanvasEditSelection(null);
      }
      markStartFreshOnNextSend(false);
    } catch (e: any) {
      if (snap.canvasEditSelection) {
        markPendingCanvasEditSelection(null);
      }
      console.error("[MessageInput] sendMessage error:", e);
      // 错误已由 handleSendMessageAction 写入对话流（用户可直接点击链接操作），
      // 此时不再弹 toast——避免错误信息重复且 toast 会遮挡对话里的可操作内容。
      if (e?.__errorInDialog === true) {
        return;
      }
      const rawMsg =
        typeof e === "string" ? e : e?.message || t("sendFailMessage");
      const msg = rawMsg === "Rejected" ? t("sendFailMessage") : rawMsg;
      toast.error(msg);
    } finally {
      sendingGuardRef.current = false;
      setIsSending(false);
      setPendingSendImageCount(0);
    }
  }, [
    armFreshDialogSend,
    cancelEditingSession,
    clearState,
    dispatch,
    markStartFreshOnNextSend,
    runCompactDialog,
    sendViaFreshDialog,
    t,
  ]);

  // 每次渲染都同步到 ref，保证 onSend 回调拿到最新闭包
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  return {
    isSending,
    pendingSendImageCount,
    startFreshOnNextSend,
    // Prefer the ref-synced setter so external callers cannot desync the flag.
    setStartFreshOnNextSend: markStartFreshOnNextSend,
    isSendPending,
    isSendBlocked,
    fileUploadDisabled,
    clearState,
    cancelEditingSession,
    armFreshDialogSend,
    runCompactDialog,
    sendMessage,
    sendMessageRef,
  };
}
