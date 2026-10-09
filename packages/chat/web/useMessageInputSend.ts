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
import { getMediaJob } from "./mediaJobs";
import { resolveBrowserModelImageUrl } from "chat/messages/browserImageUrl";
import { compactDialogAndForkAction } from "chat/dialog/actions/compactDialogAndForkAction";
import { getPrimaryDialogAgentId, getActiveDialogAgentId } from "chat/dialog/dialogAgents";
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

/**
 * Turn lease — the single observable record for an in-flight composer send.
 * Replaces the silent `sendingGuardRef` boolean: every repeated press now goes
 * through resolveChatSendDecision, which turns a genuinely running turn into a
 * queue (text) / explicit block (attachments), and a lease that outlived its
 * turn into `stale-send` (recovered once — never auto-resent).
 */
export type TurnLeasePhase = "idle" | "sending";

export type TurnLease = {
  turnId: string;
  dialogKey: string | null | undefined;
  startedAt: number;
  phase: TurnLeasePhase;
};

/**
 * How long a held lease with no observable runtime activity may be treated as a
 * dispatch still setting up (message persisting before the loop controller /
 * stream exists) before it is considered genuinely stale. Only a lease older
 * than this with no stream / controller / uploads is recovered — never one that
 * may still have a real request behind it (§3.4 / §8.1).
 */
export const STALE_LEASE_GRACE_MS = 4000;

/** 音视频任务工具名；pendingFiles 含 media_job 时本轮自动开放。 */
export const MEDIA_JOB_TOOL_NAME = "mediaJobTool";

/**
 * pendingFiles 含 `type==="media_job"` 时，把 mediaJobTool 合并进本轮
 * runtimeOptions.extraTools（去重、不改原对象）；不含时原样返回同一个引用，
 * 避免普通消息凭空带上无关工具。
 */
export const withMediaJobExtraTools = <
  T extends { extraTools?: string[] } | undefined,
>(
  runtimeOptions: T,
  pendingFiles: ReadonlyArray<{ type?: string } | null | undefined>,
): T => {
  const hasMediaJob = pendingFiles.some(
    (file) => String(file?.type ?? "").trim() === "media_job",
  );
  if (!hasMediaJob) return runtimeOptions;

  const base = (runtimeOptions ?? {}) as { extraTools?: string[] };
  const existing = base.extraTools ?? [];
  if (existing.includes(MEDIA_JOB_TOOL_NAME)) return runtimeOptions;
  return { ...base, extraTools: [...existing, MEDIA_JOB_TOOL_NAME] } as T;
};

/**
 * media_job pendingFile 只有 {id,name,type,trackingId}，时长要问服务端。
 * 逐项 hydrate；任一项取不到（网络/接口失败）就省略该项时长——绝不阻塞发送。
 */
export const hydrateMediaJobDurations = async <
  T extends { id?: string; type?: string; durationSec?: number },
>(
  files: T[],
): Promise<T[]> => {
  const mediaJobs = files.filter(
    (file) =>
      String(file?.type ?? "").trim() === "media_job" &&
      Boolean(file?.id) &&
      !Number.isFinite(file?.durationSec),
  );
  if (mediaJobs.length === 0) return files;

  const durations = new Map<string, number>();
  await Promise.all(
    mediaJobs.map(async (file) => {
      const id = file.id as string;
      try {
        const { job } = await getMediaJob(id);
        const durationSec = Number(job?.durationSec);
        if (Number.isFinite(durationSec) && durationSec > 0) {
          durations.set(id, durationSec);
        }
      } catch {
        // 仅影响展示时长，失败不阻塞发送
      }
    }),
  );
  if (durations.size === 0) return files;

  return files.map((file) => {
    const durationSec = file.id ? durations.get(file.id) : undefined;
    return durationSec === undefined
      ? file
      : ({ ...file, durationSec } as T);
  });
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

  // Turn lease — the single source of truth for "a send is in flight".
  // The old `sendingGuardRef` boolean silently dropped every repeated press
  // when a turn never settled (ctx-overflow feedback bug). The lease carries
  // turnId/dialogKey/startedAt/phase so the composer and the queue decisions
  // read one observable record instead of two drifting flags.
  const turnLeaseRef = useRef<TurnLease | null>(null);
  // Monotonic sequence so turnId is unique even for two sends in the same ms.
  const leaseSeqRef = useRef(0);
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

  // Lease-scoped release: never clear a lease that a newer send has acquired
  // since (protects against a late finally from an abandoned turn wiping a
  // fresh lease and re-opening the silent double-send window).
  const releaseTurnLease = useCallback((token: TurnLease | null) => {
    if (token !== null && turnLeaseRef.current !== token) return;
    turnLeaseRef.current = null;
    setIsSending(false);
    setPendingSendImageCount(0);
  }, []);

  const acquireTurnLease = useCallback(
    (dialogKey: string | null | undefined, pendingImageCount: number): TurnLease => {
      const lease: TurnLease = {
        turnId: `${dialogKey ?? "pending-dialog"}::${Date.now()}::${
          leaseSeqRef.current++
        }`,
        dialogKey,
        startedAt: Date.now(),
        phase: "sending",
      };
      turnLeaseRef.current = lease;
      setPendingSendImageCount(pendingImageCount);
      setIsSending(true);
      return lease;
    },
    []
  );

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
  // Turn-lease phase surfaced to the composer so its indicator / disabled state
  // read the same lease sendMessage gates on (single source of truth).
  const turnPhase: "idle" | "sending" = isSending ? "sending" : "idle";

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
    const snap = latestRef.current;
    const liveText = overrideText ?? snap.textRef.current ?? snap.text;
    const liveImgPreviews = snap.imgPreviews;
    const livePendingFiles = snap.pendingFiles;

    // Every press now flows through the decision resolver — the old top-level
    // `if (sendingGuardRef.current) return;` silently swallowed repeats when a
    // turn never settled. The turn lease (turnId/dialogKey/startedAt/phase) is
    // the single observable record shared by the resolver and the composer.
    const lease = turnLeaseRef.current;
    const leaseActive = lease !== null;
    const decisionIsSendPending =
      leaseActive && !snap.hasStreamingMessage && !snap.isLoopRunning;
    const decisionIsSendBlocked =
      snap.processingCount > 0 || decisionIsSendPending;
    // Real runtime activity behind the lease (stream, loop controller, or
    // in-flight attachment processing).
    const observableActivity =
      snap.hasStreamingMessage ||
      snap.isLoopRunning ||
      snap.processingCount > 0;
    // A lease younger than the grace window is almost certainly a dispatch
    // whose controller/stream hasn't been created yet — treat it as live so we
    // never re-dispatch while a real request may still be in flight (§3.4).
    const leaseIsFresh =
      lease !== null && Date.now() - lease.startedAt < STALE_LEASE_GRACE_MS;
    const hasActiveTurn = observableActivity || leaseIsFresh;

    const decision = resolveMessageInputSendDecision({
      text: liveText,
      imagePreviewCount: liveImgPreviews.length,
      pendingFileCount: livePendingFiles.length,
      isSendBlocked: decisionIsSendBlocked,
      canMultiImg: snap.canMultiImg,
      isLoopRunning: snap.isLoopRunning,
      isSendPending: decisionIsSendPending,
      hasActiveTurn,
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
        // noop now carries a reason: empty-input stays silent; blocked is
        // already reflected by the disabled button + upload indicator; a
        // genuinely running turn/lease surfaces sendAlreadyRunning instead of
        // silently dropping the press.
        switch (decision.reason) {
          case "empty-input":
            return;
          case "blocked":
            return;
          case "already-sending":
            toast.info(
              t(
                "sendAlreadyRunning",
                "这条消息仍在处理中。你可以停止当前请求，或将纯文本消息加入队列。"
              )
            );
            return;
        }
        return;
      case "stale-send":
        // A lease outlived its turn with no runtime activity behind it (the old
        // silent guard leak). Release it once so the composer is usable again,
        // and ask the user to send again — never auto-resend.
        releaseTurnLease(lease);
        toast.info(
          t("sendStateRecovered", "检测到已失效的发送状态，现已恢复。请重新发送。")
        );
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
          t("queuedText", "消息已排队，将在当前轮次结束后发送。"),
          {
            duration: 2000,
          }
        );
        return;
      case "queue-blocked":
        toast.error(
          t(
            "queuedAttachmentBlocked",
            "当前轮次仍在运行。含附件或多图的消息不会排队，请等待完成后再发送。"
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

    // 本轮待发附件含音视频任务时，自动为本次调用开放 mediaJobTool。
    const effectiveRuntimeOptionsWithTools = withMediaJobExtraTools(
      effectiveRuntimeOptions,
      livePendingFiles
    );

    if (snap.canvasEditSelection) {
      markPendingCanvasEditSelection(snap.canvasEditSelection);
    }
    const myLease = acquireTurnLease(
      snap.currentDialogKey,
      currentImageFiles.length
    );
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
            runtimeOptions: effectiveRuntimeOptionsWithTools,
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

      const hydratedPendingFiles =
        await hydrateMediaJobDurations(livePendingFiles);
      const attachmentParts = await resolvePendingAttachmentsToMessageParts(
        hydratedPendingFiles,
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
          runtimeOptions: effectiveRuntimeOptionsWithTools as any,
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
          runtimeOptions: effectiveRuntimeOptionsWithTools as any,
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
      releaseTurnLease(myLease);
    }
  }, [
    acquireTurnLease,
    armFreshDialogSend,
    cancelEditingSession,
    clearState,
    dispatch,
    markStartFreshOnNextSend,
    releaseTurnLease,
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
    turnPhase,
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
