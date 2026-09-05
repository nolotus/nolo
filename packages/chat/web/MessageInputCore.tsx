// packages/chat/web/MessageInputCore.tsx
// Composer assembly: text/IME/mention, panels, controls, send/delete hooks.

import * as stylex from "@stylexjs/stylex";
import { chatInputCardStyles } from "./chatInputCardStyles";
import { messageInputStyles } from "./messageInputStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";
import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "app/store";
import { selectIdentityUserBalance } from "identity/selectors";
import { toast } from "app/utils/toast";
import {
  abortAllMessages,
  selectCurrentDialogTokens,
  useCurrentDialogKey,
  usePendingFiles,
  useActiveControllers,
} from "../dialog/dialogSlice";
import { useCurrentDialogConfig } from "../dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import { useFetchData } from "app/hooks";
import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import { getModelContextWindow } from "ai/llm/getModelContextWindow";
import {
  getContextWindowUsagePercent,
  getDialogTokenTotal,
} from "chat/dialog/dialogUsageFormat";
import {
  selectAllMsgs,
  useHasStreamingMessage,
} from "../messages/messageSlice";
import { useAllToolRuns } from "ai/tools/toolRunStore";
import { useMessageInputFiles } from "./useMessageInputFiles";
import { takeStagedFilesForDialog } from "./stagedDialogFiles";
import type { PendingImagePreview } from "./AttachmentsPreview";
import { read, selectById } from "database/dbSlice";
import { selectOcrModel } from "app/settings/settingSlice";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import type { AgentRuntimeOptions } from "ai/agent/types";
import { useIsMobile } from "app/hooks/useIsMobile";
import { useClipboardFiles } from "app/hooks/useClipboardFiles";
import { useAutoResizeTextarea } from "app/hooks/useAutoResizeTextarea";
import { useElementSizeVar } from "app/hooks/useElementSizeVar";
import { shouldDeferEnterForIme } from "app/utils/ime";
import { viewTransitionStyle, QUICK_CHAT_COMPOSER_VT_NAME } from "app/viewTransitions";
import type { Agent } from "app/types";
import { getApproxPricePerImage, type ImageSizeKey } from "ai/llm/imagePricing";
import { useFavoriteAgentIds } from "app/favorite/favoriteStore";
import { decideMessageInputKeyAction } from "./messageInputKeyBehavior";
import { useChatInput } from "chat/hooks/useChatInput";
import {
  useChatInputSeed,
  publishChatInputSeed,
} from "chat/hooks/useChatInputSeed";
import { useCanvasEditSelection } from "render/canvas/canvasEditContext";
import {
  filterFavoriteAgentsByQuery,
  resolveFavoriteAgentSummaries,
  type FavoriteAgentSummary,
  type ImageUiConfig,
  type ImageProfileOption,
} from "./messageInputAgentUi";
import {
  buildAgentMentionInsertion,
  type MentionState,
} from "./messageInputMention";
import {
  clampSuggestionHighlightIndex,
  createInactiveComposerSuggestionState,
  moveSuggestionHighlightIndex,
  resolveComposerSuggestionState,
  type ComposerSuggestionItem,
  type ComposerSuggestionState,
} from "./composerSuggestions";
import {
  buildSlashCommandInsertion,
  filterSlashCommandsByQuery,
  type SlashCommandTriggerState,
} from "./messageSlashCommands";
import {
  countTextLines,
  estimatePasteBytes,
  formatPasteByteSize,
  shouldCollapsePaste,
  WEB_PASTE_THRESHOLD,
} from "core/collapsedPaste";
import { extractCustomId } from "core/prefix";
import { useAppSelectedNode } from "app/appInspector/appInspectorStore";
import { MessageInputComposer } from "./MessageInputComposer";
import { MessageInputControlsBar } from "./MessageInputControlsBar";
import {
  BrowseContextIndicator,
  useBrowseContext,
} from "./BrowseContextIndicator";
import { ComposerDrawer } from "./ComposerDrawer";
import type { AgentPickerControlProps } from "./AgentPickerControl";
import {
  MessageInputActivityPanel,
  MessageInputAttachmentsPanel,
  MessageInputChip,
  MessageInputConfirmPanel,
  MessageInputImageConfigPanel,
  RunningProcessesPanel,
} from "./MessageInputContextPanels";
import { QueueBadge } from "./QueueBadge";
import {
  useMessageInputSend,
  type EditingSession,
} from "./useMessageInputSend";
import { useMessageInputDeleteConfirm } from "./useMessageInputDeleteConfirm";
import { nanoid } from "nanoid";
const MOBILE_BREAKPOINT = 768;
const DESKTOP_TEXTAREA_MAX_HEIGHT = 360;
const MOBILE_TEXTAREA_MAX_HEIGHT = 220;

type CollapsedPasteBlock = {
  id: string;
  text: string;
};

export interface MessageInputHandle {
  processFiles: (input: FileList | File[] | null) => Promise<void> | void;
}

interface MessageInputProps {
  runtimeOptions?: AgentRuntimeOptions;
  imageUiConfig?: ImageUiConfig | null;
  /** 可选：对象助手面板的 composer agent 切换器；不传则 composer 无变化。 */
  agentPicker?: AgentPickerControlProps;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(({
  runtimeOptions,
  imageUiConfig,
  agentPicker,
}, ref) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");

  // stylex.props() returns { className } which would clobber the handwritten
  // "message-input__box" hook class if spread after it; merge explicitly instead.
  const cardStyleProps = stylex.props(chatInputCardStyles.card);

  const currentDialogKey = useCurrentDialogKey();
  const pendingFiles = usePendingFiles(currentDialogKey) as any[];
  const currentDialogConfig = useCurrentDialogConfig();
  const currentDialogId = useMemo(
    () =>
      currentDialogConfig?.id ??
      (currentDialogKey ? extractCustomId(currentDialogKey) : null),
    [currentDialogConfig?.id, currentDialogKey]
  );
  const currentMessages = useAppSelector((state) =>
    currentDialogId && (state as any)?.message
      ? selectAllMsgs(state, currentDialogId)
      : []
  );
  const allToolRuns = useAllToolRuns();
  const balance = useAppSelector(selectIdentityUserBalance) ?? 0;
  const canMultiImg = balance >= 19;

  const { currentServer, currentToken: token } =
    useAppSelector(selectRuntimeSnapshot);
  const ocrModel = useAppSelector(selectOcrModel);
  const favoriteAgentIds = useFavoriteAgentIds();
  // Primitive signature so effect deps stay stable across selector identity churn.
  const favoriteAgentIdsSignature = useMemo(
    () => favoriteAgentIds.join("|"),
    [favoriteAgentIds]
  );
  const favoriteAgentIdList = useMemo(
    () =>
      favoriteAgentIdsSignature.length > 0
        ? favoriteAgentIdsSignature.split("|")
        : [],
    [favoriteAgentIdsSignature]
  );
  const cachedFavoriteAgents = useAppSelector((state) =>
    favoriteAgentIds.map((agentKey: string) => {
      try {
        return {
          agentKey,
          agent: (selectById(state, agentKey) as Agent | null) ?? null,
        };
      } catch {
        return {
          agentKey,
          agent: null,
        };
      }
    })
  );
  // Latest cache for skip-if-present checks without re-firing the load effect.
  const cachedFavoriteAgentsRef = useRef(cachedFavoriteAgents);
  useEffect(() => {
    cachedFavoriteAgentsRef.current = cachedFavoriteAgents;
  }, [cachedFavoriteAgents]);
  const [loadedFavoriteAgentsByKey, setLoadedFavoriteAgentsByKey] = useState<
    Record<string, Agent>
  >({});

  const {
    text,
    setText,
    imageFiles,
    imgPreviews,
    processImages: hookProcessImages,
    removeImage: hookRemoveImage,
    clear: clearInputBase,
  } = useChatInput({
    draftKey: currentDialogKey,
    maxImages: canMultiImg ? Infinity : 1,
    onImageLimitExceeded: () => {
      toast.error(
        t(
          "insufficientBalanceForMultipleImages",
          "余额未达到19，仅限1张图片"
        )
      );
    },
  });

  const [pastedBlocks, setPastedBlocks] = useState<CollapsedPasteBlock[]>([]);

  const clearInput = useCallback(() => {
    clearInputBase();
    setPastedBlocks([]);
  }, [clearInputBase]);

  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const composeOutgoingText = useCallback(
    (baseText: string = text) => {
      // Keep the same order as expandPastedBlock: typed prompt first, then
      // pasted bodies — so direct-send and expand-then-send stay consistent.
      const parts = [
        baseText.trim() ? baseText : "",
        ...pastedBlocks.map((block) => block.text),
      ].filter((part) => part.length > 0);
      return parts.join("\n\n");
    },
    [pastedBlocks, text],
  );

  const removePastedBlock = useCallback((id: string) => {
    setPastedBlocks((prev) => prev.filter((block) => block.id !== id));
  }, []);

  const {
    processingCount,
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus,
  } = useMessageInputFiles(hookProcessImages, {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    currentDialogKey,
    pendingFiles,
  });

  // Consume files dropped onto this dialog's entry outside the dialog page
  // (e.g. space content list) and attach them to the composer.
  useEffect(() => {
    if (!currentDialogKey) return;
    const staged = takeStagedFilesForDialog(currentDialogKey);
    if (staged.length) void processFiles(staged);
  }, [currentDialogKey, processFiles]);

  const hasStreamingMessage = useHasStreamingMessage(currentDialogId);
  const activeControllers = useActiveControllers();
  const isLoopRunning = Object.keys(activeControllers).length > 0;
  const appSelectedNode = useAppSelectedNode();

  const [imageAspectRatio, setImageAspectRatio] = useState<string | undefined>(
    undefined
  );
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K" | undefined>(
    undefined
  );
  const [imageProfileKey, setImageProfileKey] = useState<
    ImageProfileOption["key"] | undefined
  >(undefined);
  const selectedImageProfile = useMemo(
    () =>
      imageUiConfig?.imageProfiles?.find(
        (profile) => profile.key === imageProfileKey
      ),
    [imageProfileKey, imageUiConfig]
  );

  useEffect(() => {
    if (!imageProfileKey) return;
    if (selectedImageProfile) return;
    setImageProfileKey(undefined);
  }, [imageProfileKey, selectedImageProfile]);

  const [suggestionState, setSuggestionState] =
    useState<ComposerSuggestionState>(() =>
      createInactiveComposerSuggestionState()
    );
  const [suggestionHighlightIndex, setSuggestionHighlightIndex] = useState(0);
  // 记录本轮通过 @ 选择的目标 Agent（可选）
  const [mentionTargetAgentKey, setMentionTargetAgentKey] = useState<
    string | null
  >(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [editingSession, setEditingSession] = useState<EditingSession | null>(
    null
  );
  const canvasEditSelection = useCanvasEditSelection();
  const chatInputSeed = useChatInputSeed();

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const lastCompositionEndAtRef = useRef(0);

  // Consume guide seed from MessageActions when it arrives
  useEffect(() => {
    if (!chatInputSeed) return;
    const { text: seedText, mode, focus } = chatInputSeed;
    if (!seedText) return;

    {
      const prev = text;
      const spacer = prev && !prev.endsWith(" ") ? " " : "";
      setText(
        mode === "append" && prev ? `${prev}${spacer}${seedText}` : seedText
      );
    }
    setEditingSession(
      chatInputSeed.editMessageId
        ? {
            messageId: chatInputSeed.editMessageId,
            originalContent: chatInputSeed.originalContent,
          }
        : null
    );

    publishChatInputSeed(null);

    if (focus && areaRef.current) {
      requestAnimationFrame(() => {
        areaRef.current?.focus();
        const len = areaRef.current?.value?.length ?? 0;
        areaRef.current?.setSelectionRange(len, len);
      });
    }
  }, [chatInputSeed, setText, text]);

  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const maxTextareaHeight = isMobile
    ? MOBILE_TEXTAREA_MAX_HEIGHT
    : DESKTOP_TEXTAREA_MAX_HEIGHT;

  const expandPastedBlock = useCallback(
    (id: string) => {
      const target = pastedBlocks.find((block) => block.id === id);
      if (!target) return;
      const nextText = text.trim()
        ? `${text}\n\n${target.text}`
        : target.text;
      setPastedBlocks((prev) => prev.filter((block) => block.id !== id));
      setText(nextText);
      requestAnimationFrame(() => {
        const el = areaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, maxTextareaHeight)}px`;
        el.focus();
        const end = nextText.length;
        el.setSelectionRange(end, end);
      });
    },
    [maxTextareaHeight, pastedBlocks, setText, text],
  );

  useElementSizeVar(
    rootRef as React.RefObject<HTMLElement>,
    "--message-input-height"
  );

  const { handleChange: autoResizeOnChange } = useAutoResizeTextarea({
    maxHeight: maxTextareaHeight,
    onTextChange: setText,
    value: text,
    ref: areaRef,
  });

  /**
   * 根据收藏的 agentId 拉取 agent 的 name
   */
  useEffect(() => {
    if (favoriteAgentIdList.length === 0) {
      setLoadedFavoriteAgentsByKey({});
      return;
    }

    let cancelled = false;

    const loadFavoriteAgents = async () => {
      const results = await Promise.all(
        favoriteAgentIdList.map(async (agentKey: string) => {
          try {
            const cachedEntry = cachedFavoriteAgentsRef.current.find(
              (entry: any) => entry.agentKey === agentKey
            );
            if (cachedEntry?.agent) return null;

            const agent = (await dispatch(
              read({ dbKey: agentKey })
            ).unwrap()) as Agent;
            if (!agent || cancelled) return null;

            return { agentKey, agent };
          } catch (err) {
            console.warn(
              "[MessageInput] Failed to load favorite agent:",
              agentKey,
              err
            );
            return null;
          }
        })
      );

      if (!cancelled) {
        setLoadedFavoriteAgentsByKey((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const result of results) {
            if (
              result?.agentKey &&
              result.agent &&
              next[result.agentKey] !== result.agent
            ) {
              next[result.agentKey] = result.agent;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    };

    void loadFavoriteAgents();

    return () => {
      cancelled = true;
    };
  }, [favoriteAgentIdList, dispatch]);

  const favoriteAgents = useMemo(
    () =>
      resolveFavoriteAgentSummaries(
        favoriteAgentIdList.map((agentKey: string) => ({
          agentKey,
          agent:
            cachedFavoriteAgents.find(
              (entry: any) => entry.agentKey === agentKey
            )?.agent ??
            loadedFavoriteAgentsByKey[agentKey] ??
            null,
        }))
      ),
    [cachedFavoriteAgents, favoriteAgentIdList, loadedFavoriteAgentsByKey]
  );

  /**
   * 更新统一 suggestion 状态（@ 收藏助手 / / 命令补全）
   */
  const updateSuggestionState = useCallback(
    (value: string, cursorIndex: number) => {
      setSuggestionState(resolveComposerSuggestionState(value, cursorIndex));
      setSuggestionHighlightIndex(0);
    },
    []
  );

  const handleTextareaChange: React.ChangeEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        autoResizeOnChange(event);
        const cursor =
          event.target.selectionStart ?? event.target.value.length;
        updateSuggestionState(event.target.value, cursor);
      },
      [autoResizeOnChange, updateSuggestionState]
    );

  const filteredFavoriteAgents = useMemo(() => {
    return filterFavoriteAgentsByQuery({
      favoriteAgents,
      isAgentMentionActive:
        suggestionState.active && suggestionState.kind === "agent",
      query: suggestionState.query,
    });
  }, [suggestionState, favoriteAgents]);

  const filteredSlashCommands = useMemo(() => {
    if (!suggestionState.active || suggestionState.kind !== "slash-command") {
      return [];
    }
    return filterSlashCommandsByQuery(suggestionState.query);
  }, [suggestionState]);

  /**
   * 在当前光标位置插入 @AgentName，并记录本轮目标 Agent
   */
  const insertMention = useCallback(
    (agent: FavoriteAgentSummary) => {
      const textarea = areaRef.current;
      if (!textarea) return;
      if (!suggestionState.active || suggestionState.kind !== "agent") return;

      const currentValue = textarea.value ?? "";
      const cursorPos = textarea.selectionStart ?? currentValue.length;
      const result = buildAgentMentionInsertion({
        currentValue,
        cursorPos,
        mentionState: suggestionState as MentionState,
        agent,
      });
      if (!result) return;

      setText(result.nextText);
      setMentionTargetAgentKey(result.targetAgentKey);
      setSuggestionState(result.nextMentionState);
      setSuggestionHighlightIndex(result.nextMentionHighlightIndex);

      requestAnimationFrame(() => {
        if (!areaRef.current) return;
        const nextCursor =
          result.nextText.length - currentValue.slice(cursorPos).length;
        areaRef.current.focus();
        areaRef.current.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [suggestionState, setText]
  );

  /**
   * 选中 / 命令建议：只把完整命令填入 textarea，不执行。
   * 执行语义仍留在发送路径（resolveChatSendDecision）。
   */
  const fillSlashCommand = useCallback(
    (command: string) => {
      if (!suggestionState.active || suggestionState.kind !== "slash-command") {
        return;
      }
      const textarea = areaRef.current;
      const currentValue = textarea?.value ?? textRef.current ?? "";
      const cursorPos = textarea?.selectionStart ?? currentValue.length;
      const result = buildSlashCommandInsertion({
        currentValue,
        cursorPos,
        triggerState: suggestionState as SlashCommandTriggerState,
        command,
      });
      if (!result) return;

      setText(result.nextText);
      setSuggestionState(result.nextTriggerState);
      setSuggestionHighlightIndex(result.nextHighlightIndex);

      requestAnimationFrame(() => {
        if (!areaRef.current) return;
        const nextCursor =
          result.nextText.length - currentValue.slice(cursorPos).length;
        areaRef.current.focus();
        areaRef.current.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [suggestionState, setText]
  );

  /**
   * 统一选择入口：按当前 provider 分发（agent 插入 / 命令仅填充）。
   */
  const selectComposerSuggestion = useCallback(
    (index: number) => {
      if (suggestionState.kind === "agent") {
        const clampedIndex = clampSuggestionHighlightIndex(
          index,
          filteredFavoriteAgents.length
        );
        if (clampedIndex < 0) return;
        const target = filteredFavoriteAgents[clampedIndex];
        if (target) {
          insertMention(target);
        }
        return;
      }
      if (suggestionState.kind === "slash-command") {
        const clampedIndex = clampSuggestionHighlightIndex(
          index,
          filteredSlashCommands.length
        );
        if (clampedIndex < 0) return;
        const command = filteredSlashCommands[clampedIndex];
        if (command) {
          fillSlashCommand(command.command);
        }
      }
    },
    [suggestionState, filteredFavoriteAgents, filteredSlashCommands, insertMention, fillSlashCommand]
  );

  const setMentionStateInactive = useCallback(() => {
    setSuggestionState(createInactiveComposerSuggestionState());
    setSuggestionHighlightIndex(0);
    setMentionTargetAgentKey(null);
  }, []);

  useImperativeHandle(ref, () => ({ processFiles }), [processFiles]);

  const {
    pendingSendImageCount,
    isSendPending,
    isSendBlocked,
    fileUploadDisabled,
    cancelEditingSession,
    sendMessage,
    sendMessageRef,
  } = useMessageInputSend({
    text,
    textRef,
    imageFiles,
    imgPreviews: imgPreviews as PendingImagePreview[],
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
  });

  // 当 Agent 结束流式输出/思考后，自动将光标和焦点归还到输入框（仅限桌面端且无其他活动模态/输入控件交互时）
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    const isGenerating = hasStreamingMessage || isLoopRunning;
    if (wasGeneratingRef.current && !isGenerating) {
      if (!isMobile) {
        const activeEl =
          typeof document !== "undefined" ? document.activeElement : null;
        const isInteractingWithOtherInput =
          activeEl?.tagName === "INPUT" ||
          activeEl?.tagName === "BUTTON" ||
          activeEl?.tagName === "SELECT" ||
          activeEl?.tagName === "IFRAME" ||
          (activeEl?.tagName === "TEXTAREA" && activeEl !== areaRef.current) ||
          Boolean((activeEl as HTMLElement)?.isContentEditable) ||
          (typeof document !== "undefined" &&
            Boolean(
              document.querySelector(
                ".modal--open, .c-dialog, dialog[open], [role='dialog']"
              )
            ));

        if (!isInteractingWithOtherInput && areaRef.current) {
          requestAnimationFrame(() => {
            areaRef.current?.focus({ preventScroll: true });
            const len = areaRef.current?.value?.length ?? 0;
            areaRef.current?.setSelectionRange(len, len);
          });
        }
      }
    }
    wasGeneratingRef.current = isGenerating;
  }, [hasStreamingMessage, isLoopRunning, isMobile]);

  const {
    pendingDeleteRun,
    pendingDeleteConfig,
    pendingDeletePreview,
    pendingDeleteLabel,
    pendingDeleteFailureLabel,
    handleConfirmDelete,
    handleDismissDelete,
  } = useMessageInputDeleteConfirm({
    allToolRuns,
    currentMessages,
  });

  const isGenerating = Boolean(
    hasStreamingMessage ||
    isLoopRunning ||
    (activeControllers && Object.keys(activeControllers).length > 0)
  );

  const hasContent = useMemo(
    () =>
      !!text.trim() ||
      pastedBlocks.length > 0 ||
      imgPreviews.length > 0 ||
      pendingFiles.length > 0,
    [text, pastedBlocks.length, imgPreviews.length, pendingFiles.length]
  );
  // 当有正在生成的流式内容或后台任务时，必须常驻显示停止生成按钮（SendButton.stop-mode），
  // 绝不能因为输入框失焦或无内容而切换为语音输入按钮。
  const showVoiceInput =
    !hasContent && !isSendBlocked && !isTextareaFocused && !isGenerating;

  const { handlePaste: handleFilesPaste } =
    useClipboardFiles<HTMLTextAreaElement>(processFiles);

  const handleTextareaPaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      handleFilesPaste(event);
      const files = event.clipboardData?.files;
      if (files && files.length > 0) return;

      const pasted = event.clipboardData?.getData("text/plain") ?? "";
      if (!shouldCollapsePaste(pasted, WEB_PASTE_THRESHOLD)) return;

      event.preventDefault();
      setPastedBlocks((prev) => [...prev, { id: nanoid(), text: pasted }]);
    },
    [handleFilesPaste]
  );

  // Unified suggestion surface items (agent mentions + slash commands).
  const suggestionItems = useMemo<ComposerSuggestionItem[]>(() => {
    if (!suggestionState.active) return [];
    if (suggestionState.kind === "agent") {
      return filteredFavoriteAgents.map((agent) => ({
        key: `agent:${agent.agentKey}`,
        label: agent.name,
      }));
    }
    if (suggestionState.kind === "slash-command") {
      return filteredSlashCommands.map((command) => ({
        key: `command:${command.command}`,
        label: command.command,
        description: t(command.descriptionKey, command.descriptionFallback),
      }));
    }
    return [];
  }, [suggestionState, filteredFavoriteAgents, filteredSlashCommands, t]);

  const suggestionMenuVisible =
    suggestionState.active && suggestionItems.length > 0;

  const suggestionHeaderText =
    suggestionState.kind === "slash-command"
      ? t("slashCommandsLabel", "斜杠命令")
      : t("mentionFavoritesLabel", "选择要 @ 的收藏助手");

  const handleTextareaKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        const shouldDeferEnter = shouldDeferEnterForIme({
          event,
          isComposing: isComposingRef.current,
          lastCompositionEndAt: lastCompositionEndAtRef.current,
        });
        const hasActiveModal =
          Boolean(pendingDeleteRun && pendingDeleteConfig) ||
          (typeof document !== "undefined" &&
            Boolean(
              document.querySelector(
                ".modal--open, .c-dialog, dialog[open], [role='dialog']"
              )
            ));

        switch (
          decideMessageInputKeyAction({
            key: event.key,
            shiftKey: event.shiftKey,
            isMobile,
            hasSuggestionMenu: suggestionMenuVisible,
            shouldDeferEnterForIme: shouldDeferEnter,
            hasActiveModal,
          })
        ) {
          case "suggestion-next":
            event.preventDefault();
            event.stopPropagation();
            setSuggestionHighlightIndex((prev) =>
              moveSuggestionHighlightIndex({
                previousIndex: prev,
                optionCount: suggestionItems.length,
                direction: "next",
              })
            );
            return;

          case "suggestion-prev":
            event.preventDefault();
            event.stopPropagation();
            setSuggestionHighlightIndex((prev) =>
              moveSuggestionHighlightIndex({
                previousIndex: prev,
                optionCount: suggestionItems.length,
                direction: "prev",
              })
            );
            return;

          case "suggestion-select":
            event.preventDefault();
            event.stopPropagation();
            selectComposerSuggestion(suggestionHighlightIndex);
            return;

          case "suggestion-close":
            event.preventDefault();
            event.stopPropagation();
            setSuggestionState(createInactiveComposerSuggestionState());
            setSuggestionHighlightIndex(0);
            return;

          case "send":
            event.preventDefault();
            void sendMessage(composeOutgoingText());
            return;

          default:
            if (event.key === "Escape" && isGenerating && !hasActiveModal) {
              event.preventDefault();
              event.stopPropagation();
              dispatch(abortAllMessages());
              toast.success(t("allMessagesAborted", "已停止生成"), { duration: 3000 });
              return;
            }
            return;
        }
      },
      [
        isMobile,
        sendMessage,
        composeOutgoingText,
        suggestionMenuVisible,
        suggestionItems,
        suggestionHighlightIndex,
        selectComposerSuggestion,
        pendingDeleteRun,
        pendingDeleteConfig,
        isGenerating,
        dispatch,
        t,
      ]
    );

  const handleSendClick = useCallback(() => {
    void sendMessage(composeOutgoingText());
  }, [composeOutgoingText, sendMessage]);

  const showIndicator = processingCount > 0 || isSendPending;
  const indicatorText = processingCount
    ? t("processingFiles", { count: processingCount })
    : pendingSendImageCount > 0
      ? t("compressingImagesMessage", "Compressing images, please wait...")
      : t("sending", "Sending...");

  const resolvedImageUiConfig = useMemo(() => {
    if (!imageUiConfig) return imageUiConfig;
    const activePricingModel =
      selectedImageProfile?.pricingModel ?? imageUiConfig.pricingModel;
    const activeWaitHint =
      selectedImageProfile?.waitHint ?? imageUiConfig.waitHint;
    if (!activePricingModel && !activeWaitHint) return imageUiConfig;

    return {
      ...imageUiConfig,
      waitHint: activeWaitHint,
      pricePerImage:
        getApproxPricePerImage(
          activePricingModel,
          imageSize as ImageSizeKey | undefined
        ) ?? undefined,
      pricingModel: activePricingModel,
    };
  }, [imageSize, imageUiConfig, selectedImageProfile]);

  const showImageConfigRow =
    !!resolvedImageUiConfig?.showControls &&
    !!resolvedImageUiConfig.supportsImageConfig;

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    lastCompositionEndAtRef.current = Date.now();
  }, []);

  const handleTextareaFocus = useCallback(() => {
    setIsTextareaFocused(true);
  }, []);

  const handleTextareaBlur = useCallback(() => {
    isComposingRef.current = false;
    setIsTextareaFocused(false);
  }, []);

  const handleHoverSuggestion = useCallback((index: number) => {
    setSuggestionHighlightIndex(index);
  }, []);

  const handleVoiceTranscribed = useCallback(
    (transcript: string) => {
      setText(textRef.current ? `${textRef.current} ${transcript}` : transcript);
    },
    [setText]
  );

  const handleVoiceSend = useCallback((transcript: string) => {
    void sendMessageRef.current(transcript);
  }, [sendMessageRef]);

  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const activeAgentId = getActiveDialogAgentId(currentDialogConfig);
  const { data: activeAgent } = useFetchData<Agent>(activeAgentId || undefined);
  const resolvedAgent =
    activeAgent && activeAgentId
      ? applyBuiltinAgentRuntimeOverride(activeAgentId, activeAgent)
      : activeAgent;
  const contextWindow = getModelContextWindow(resolvedAgent?.model || "");
  const totalTokens = getDialogTokenTotal(
    tokenStats?.inputTokens ?? 0,
    tokenStats?.outputTokens ?? 0
  );
  const usagePercent =
    contextWindow > 0 && totalTokens > 0
      ? getContextWindowUsagePercent(totalTokens, contextWindow)
      : undefined;

  const browseContext = useBrowseContext();
  const browseHost = useMemo(() => {
    if (!browseContext?.url) return undefined;
    try {
      return new URL(browseContext.url).hostname;
    } catch {
      return undefined;
    }
  }, [browseContext?.url]);

  const imageConfigSummary = useMemo(() => {
    if (!showImageConfigRow) return undefined;
    const parts = [imageAspectRatio, imageSize].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Image";
  }, [showImageConfigRow, imageAspectRatio, imageSize]);

  const totalAttachmentCount =
    (imgPreviews?.length ?? 0) + (pendingFilesWithStatus?.length ?? 0);

  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const prevAttachmentCountRef = useRef(totalAttachmentCount);

  useEffect(() => {
    if (
      totalAttachmentCount > prevAttachmentCountRef.current &&
      totalAttachmentCount > 0
    ) {
      setDrawerExpanded(true);
    }
    prevAttachmentCountRef.current = totalAttachmentCount;
  }, [totalAttachmentCount]);

  const handleToggleDrawer = useCallback(() => {
    setDrawerExpanded((prev) => !prev);
  }, []);

  const drawerContent = useMemo(
    () => (
      <>
        <BrowseContextIndicator />

        <MessageInputAttachmentsPanel
          imagePreviews={imgPreviews as PendingImagePreview[]}
          pendingFiles={pendingFilesWithStatus}
          onRemoveImage={hookRemoveImage}
          processingFiles={processingFileIds}
          isMobile={isMobile}
        />

        {resolvedImageUiConfig && (
          <MessageInputImageConfigPanel
            visible={showImageConfigRow}
            aspectRatio={imageAspectRatio}
            imageSize={imageSize}
            imageProfileKey={imageProfileKey}
            imageUiConfig={resolvedImageUiConfig}
            onAspectRatioChange={setImageAspectRatio}
            onImageSizeChange={setImageSize}
            onImageProfileChange={(v) => setImageProfileKey(v as any)}
          />
        )}
      </>
    ),
    [
      imgPreviews,
      pendingFilesWithStatus,
      hookRemoveImage,
      processingFileIds,
      isMobile,
      resolvedImageUiConfig,
      showImageConfigRow,
      imageAspectRatio,
      imageSize,
      imageProfileKey,
      setImageAspectRatio,
      setImageSize,
      setImageProfileKey,
    ]
  );

  const sendDisabled =
    !hasContent ||
    isSendBlocked ||
    (!canMultiImg && imgPreviews.length > 1);

  const editingChipLabel = t(
    "editingMessageNotice",
    "正在编辑历史消息，发送后将丢弃其后的消息"
  );

  const placeholder =
    processingCount > 0 ? t("waitForProcessing") : t("messageOrFileHere");
  const composerVtStyle = viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME);

  return (
    <>
      <div
        ref={rootRef}
        {...withLiteralClass(
          `message-input ${processingCount > 0 ? "message-input--processing" : ""}`,
          messageInputStyles.container
        )}
        style={composerVtStyle}
      >
        <div
          {...withLiteralClass("message-input__wrapper", messageInputStyles.wrapper)}
        >
          {/* ═══ Runtime Status (Outside Composer Shell, Above) ═══ */}
          <MessageInputActivityPanel
            messages={currentMessages}
            isActive={isLoopRunning || hasStreamingMessage}
          />

          <RunningProcessesPanel messages={currentMessages} />

          <QueueBadge
            dialogKey={currentDialogKey}
            isRunning={isLoopRunning || hasStreamingMessage}
          />

          <MessageInputConfirmPanel
            visible={!!(pendingDeleteRun && pendingDeleteConfig)}
            status={pendingDeleteRun?.status ?? "pending"}
            errorText={pendingDeleteRun?.error}
            failureLabel={pendingDeleteFailureLabel}
            deleteLabel={pendingDeleteLabel}
            confirmDisabled={
              pendingDeleteRun?.status === "running" ||
              !Array.isArray(pendingDeletePreview?.deletable) ||
              pendingDeletePreview.deletable.length === 0
            }
            dismissDisabled={pendingDeleteRun?.status === "running"}
            onConfirm={handleConfirmDelete}
            onDismiss={handleDismissDelete}
          />

          {/* ═══ Composer Shell (Single unified card surface) ═══ */}
          <div
            data-hook="chat-esc-chat-input-card"
            {...cardStyleProps}
            className={[cardStyleProps.className, "message-input__box"].filter(Boolean).join(" ")}
          >
            {/* ── Context Area (Attachments, Browse, Image config, Edit chips, Paste chips) ── */}
            {/* ── Secondary Context Drawer (Attachments, Browse, Image config, Usage) ── */}
            <ComposerDrawer
              attachmentCount={totalAttachmentCount}
              processingAttachmentCount={processingFileIds.size}
              hasBrowseContext={Boolean(browseContext?.url)}
              browseHost={browseHost}
              imageConfigSummary={imageConfigSummary}
              usagePercent={usagePercent}
              expanded={drawerExpanded}
              onToggle={handleToggleDrawer}
            >
              {drawerContent}
            </ComposerDrawer>

            {/* 画布选中上下文：不在输入框显示芯片（由 iframe/画布自身高亮反馈，发送时注入并在发送后自动清除） */}

            {editingSession && (
              <MessageInputChip
                label={editingChipLabel}
                onDismiss={cancelEditingSession}
                dismissAriaLabel={t("cancelEditingMessage", "取消编辑消息")}
              />
            )}

            {pastedBlocks.length > 0 && (
              <div
                {...withLiteralClass("message-input__paste-chips", messageInputStyles.pasteChips)}
              >
                {pastedBlocks.map((block, index) => (
                  <MessageInputChip
                    key={block.id}
                    className="message-input__paste-chip"
                    label={t(
                      "pastedTextChip",
                      "Pasted text #{{id}} · {{lines}} lines · {{size}}",
                      {
                        id: index + 1,
                        lines: countTextLines(block.text),
                        size: formatPasteByteSize(
                          estimatePasteBytes(block.text),
                        ),
                      },
                    )}
                    onActivate={() => expandPastedBlock(block.id)}
                    activateAriaLabel={t(
                      "expandPastedText",
                      "Expand pasted text into the input",
                    )}
                    onDismiss={() => removePastedBlock(block.id)}
                    dismissAriaLabel={t("removePastedText", "Remove pasted text")}
                  />
                ))}
              </div>
            )}

            {/* ── Input Area ── */}
            <MessageInputComposer
              areaRef={areaRef}
              text={text}
              placeholder={placeholder}
              ariaLabel={t("messageInput")}
              onChange={handleTextareaChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
              onKeyDown={handleTextareaKeyDown}
              onPaste={handleTextareaPaste}
              suggestionMenuVisible={suggestionMenuVisible}
              suggestionItems={suggestionItems}
              suggestionHighlightIndex={suggestionHighlightIndex}
              suggestionHeaderText={suggestionHeaderText}
              onSelectSuggestion={selectComposerSuggestion}
              onHoverSuggestion={handleHoverSuggestion}
            />

            {/* ── Controls Bar ── */}
            <MessageInputControlsBar
              fileUploadDisabled={fileUploadDisabled}
              onFilesSelected={processFiles}
              showVoiceInput={showVoiceInput}
              onTranscribed={handleVoiceTranscribed}
              onVoiceSend={handleVoiceSend}
              onSendClick={handleSendClick}
              sendDisabled={sendDisabled}
              agentPicker={agentPicker}
            />
          </div>

          {showIndicator && (
            <div
              {...withLiteralClass("message-input__indicator", messageInputStyles.indicator)}
            >
              <div className="message-input__spinner" />
              <span>{indicatorText}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
