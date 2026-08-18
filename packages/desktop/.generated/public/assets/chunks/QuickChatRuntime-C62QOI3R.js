import {
  QUICK_CHAT_GENERAL_TIER_AGENT_KEYS,
  QuickChatModeSelector_default,
  buildQuickChatExtraParts,
  buildQuickChatFirstMessageText,
  buildQuickChatRouteState,
  formatQuickChatDialogTitle,
  getQuickChatPerfNow,
  logQuickChatPerf,
  resolveQuickChatAgentKey,
  resolveQuickChatPlaceholderMeta
} from "/public/assets/chunks/chunk-6SCCZZZJ.js";
import {
  LiveVoicePanel
} from "/public/assets/chunks/chunk-XNEFXHLI.js";
import {
  BrowseContextIndicator,
  FileUploadButton_default,
  SendButton_default,
  VoiceInputButton_default,
  sendFirstMessage,
  useAutoResizeTextarea,
  useChatInput,
  useFileDropZone,
  useMessageInputFiles
} from "/public/assets/chunks/chunk-DKWNAD22.js";
import {
  shouldDeferEnterForIme
} from "/public/assets/chunks/chunk-JUT5AJQ2.js";
import {
  foldHomePath
} from "/public/assets/chunks/chunk-DBB6IKZV.js";
import "/public/assets/chunks/chunk-6EJRYVCO.js";
import "/public/assets/chunks/chunk-5SG4AG33.js";
import {
  useFetchData
} from "/public/assets/chunks/chunk-EA4SLPRB.js";
import "/public/assets/chunks/chunk-QADHV2NS.js";
import "/public/assets/chunks/chunk-APUNFOYF.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-SDMAWFBN.js";
import "/public/assets/chunks/chunk-4JMBIZX5.js";
import {
  markRecentlyCreated
} from "/public/assets/chunks/chunk-HOEAUVHJ.js";
import "/public/assets/chunks/chunk-PZK4ZAN4.js";
import {
  AttachmentsPreview_default
} from "/public/assets/chunks/chunk-CGT2EIX6.js";
import "/public/assets/chunks/chunk-5UVYUAHU.js";
import "/public/assets/chunks/chunk-T73R6CXN.js";
import "/public/assets/chunks/chunk-2NEHLYGB.js";
import "/public/assets/chunks/chunk-2W6XN4XG.js";
import "/public/assets/chunks/chunk-D23ANNTW.js";
import "/public/assets/chunks/chunk-QJUZO4YG.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import "/public/assets/chunks/chunk-RUNEFDCC.js";
import "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $b8dcdc58eeae0d40$export$2c73285ae9390cec,
  $bd263d78e9bf3c56$export$f5c9f3c2c4054eec
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  buildQuickChatModelOverride
} from "/public/assets/chunks/chunk-KH5LQ5GL.js";
import {
  isLiveAudioOnlyAgent
} from "/public/assets/chunks/chunk-IFVDE6LX.js";
import "/public/assets/chunks/chunk-VKQKRZVR.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  ensureCodingSkills
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import {
  buildBuiltinObjectSkillReference,
  ensureBuiltinObjectSkills
} from "/public/assets/chunks/chunk-SSBU25HK.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-AWGGOX2H.js";
import "/public/assets/chunks/chunk-DFTLAEUX.js";
import "/public/assets/chunks/chunk-VPSYWRNH.js";
import "/public/assets/chunks/chunk-IHMA4QTO.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  QUICK_CHAT_COMPOSER_VT_NAME,
  enableNextRouteViewTransition,
  useNavigate,
  viewTransitionStyle
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-V2ALUAJU.js";
import {
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
  QUICK_CHAT_IMAGE_AGENT_KEY,
  createDialog,
  fetchUserProfile,
  isAbortError,
  noloAgentId,
  selectCurrentSpaceId,
  selectCurrentUserBalance,
  selectDefaultAgentId,
  selectOcrModel,
  selectRuntimeSnapshot,
  selectSpaceById,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuSettings2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY,
  PUBLIC_GLM_52_AGENT_KEY,
  buildDialogUrl
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  clearPendingAttachments,
  usePendingFiles
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/QuickChatRuntime.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var QUICK_CHAT_AGENT_TITLES = {
  [QUICK_CHAT_IMAGE_AGENT_KEY]: "Kimi K2.6",
  [PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY]: "DeepSeek V4 Flash",
  [PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY]: "DeepSeek V4 Pro",
  [PUBLIC_GLM_52_AGENT_KEY]: "GLM 5.2"
};
var isAbortLikeError = (error) => {
  if (typeof error === "string") {
    return /aborted/i.test(error);
  }
  if (isAbortError(error)) return true;
  if (error instanceof Error) {
    return /aborted/i.test(error.message);
  }
  if (error && typeof error === "object") {
    const message = error.message;
    return typeof message === "string" && /aborted/i.test(message);
  }
  return false;
};
var QUICK_CHAT_DEBUG = false;
var QuickChatRuntime = ({
  initialText = "",
  initialAgentId = null,
  surface = "default",
  spaceId: spaceIdProp,
  autoSend = false,
  isEmptyState = false,
  onPersonalizationClick,
  quickChatMode,
  onModeChange: handleModeChange
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isSending, setIsSending] = (0, import_react.useState)(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = (0, import_react.useState)(false);
  const dialogKeyRef = (0, import_react.useRef)(null);
  const dialogAgentIdRef = (0, import_react.useRef)(null);
  const defaultAgentId = useAppSelector(selectDefaultAgentId);
  const autoAgentId = useAppSelector(
    (state) => state.settings?.quickChatAutoAgentId
  ) || "";
  const { data: autoOverrideAgent } = useFetchData(autoAgentId || null);
  const allDbEntities = useAppSelector((state) => state.db?.entities ?? {});
  const resolveTierAgent = (0, import_react.useCallback)(
    (tier) => QUICK_CHAT_DEFAULT_TIER_AGENTS[tier],
    []
  );
  const currentModeAgentId = defaultAgentId;
  const shouldReadCurrentAgent = currentModeAgentId !== noloAgentId && !!currentModeAgentId;
  const { data: agent } = useFetchData(
    shouldReadCurrentAgent ? currentModeAgentId : null
  );
  const storeSpaceId = useAppSelector(selectCurrentSpaceId) || void 0;
  const currentSpaceId = spaceIdProp ?? storeSpaceId;
  const currentSpace = useAppSelector((state) => selectSpaceById(state, currentSpaceId));
  const agentName = agent?.name || (currentModeAgentId === noloAgentId ? "nolo" : t("unknown"));
  const pendingFiles = usePendingFiles();
  const currentUserId = useUserId();
  const currentUserBalance = useAppSelector(selectCurrentUserBalance);
  const { currentServer, currentToken: token } = useAppSelector(selectRuntimeSnapshot);
  const ocrModel = useAppSelector(selectOcrModel);
  const isComposingRef = (0, import_react.useRef)(false);
  const lastCompositionEndAtRef = (0, import_react.useRef)(0);
  const isStartingRef = (0, import_react.useRef)(false);
  const autoSendStartedRef = (0, import_react.useRef)(false);
  const currentUserBalanceRef = (0, import_react.useRef)(currentUserBalance);
  const balanceLoadPromiseRef = (0, import_react.useRef)(null);
  const initialAgentIdRef = (0, import_react.useRef)(initialAgentId);
  const areaRef = (0, import_react.useRef)(null);
  import_react.default.useEffect(() => {
    initialAgentIdRef.current = initialAgentId;
  }, [initialAgentId]);
  import_react.default.useEffect(() => {
    currentUserBalanceRef.current = currentUserBalance;
  }, [currentUserBalance]);
  const {
    text,
    setText,
    imageFiles,
    imgPreviews,
    processImages,
    removeImage,
    clear: clearInput
  } = useChatInput();
  const {
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus
  } = useMessageInputFiles(processImages, {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    pendingFiles
  });
  import_react.default.useEffect(() => {
    if (initialText && !text) {
      setText(initialText);
    }
  }, [initialText, setText, text]);
  import_react.default.useEffect(() => {
    if (typeof window === "undefined" || !window.__NOLO_DESKTOP__ || window.__NOLO_DESKTOP_E2E__ !== true) return;
    const handleDesktopE2eQuickChat = (event) => {
      const detail = event.detail;
      const nextText = asTrimmedString(detail?.text);
      if (!nextText) return;
      void startQuickChatRef.current(nextText);
    };
    window.addEventListener("nolo-desktop-e2e-quick-chat", handleDesktopE2eQuickChat);
    return () => {
      window.removeEventListener("nolo-desktop-e2e-quick-chat", handleDesktopE2eQuickChat);
    };
  }, []);
  import_react.default.useEffect(() => {
    if (agent && "defaultInteractionMode" in agent && agent.defaultInteractionMode === "live_audio") {
      setIsVoicePanelOpen(true);
    }
  }, [agent]);
  import_react.default.useEffect(() => {
    if (autoSend && text && !autoSendStartedRef.current && !isStartingRef.current && !isSending) {
      autoSendStartedRef.current = true;
      void startQuickChatRef.current();
    }
  }, [autoSend, text, isSending]);
  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useFileDropZone(processFiles);
  const startQuickChatRef = (0, import_react.useRef)(async () => {
  });
  const getErrorReason = (0, import_react.useCallback)(
    (error) => {
      const reason = (() => {
        if (typeof error === "string" && error.trim()) {
          return error;
        }
        if (error instanceof Error && error.message.trim()) {
          return error.message;
        }
        if (error && typeof error === "object") {
          const message = error.message;
          if (typeof message === "string" && message.trim()) {
            return message;
          }
        }
        return t("unknown");
      })();
      return reason === "Rejected" ? t("sendFailMessage", "\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5") : reason;
    },
    [t]
  );
  const notifyStartupError = (0, import_react.useCallback)(
    (errorKey, error) => {
      console.error("[QuickChat] start failed", { stage: errorKey, error });
      toast.error(`${t(`quickChat.${errorKey}`)}: ${getErrorReason(error)}`);
    },
    [getErrorReason, t]
  );
  const ensureCurrentBalanceLoaded = (0, import_react.useCallback)(async () => {
    if (typeof currentUserBalanceRef.current === "number") {
      return currentUserBalanceRef.current;
    }
    if (!currentUserId) {
      throw new Error("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u8BD5\u3002");
    }
    if (!balanceLoadPromiseRef.current) {
      balanceLoadPromiseRef.current = Promise.resolve(
        dispatch(fetchUserProfile()).unwrap()
      ).then((profile) => {
        const nextBalance = typeof profile?.balance === "number" ? profile.balance : currentUserBalanceRef.current;
        if (typeof nextBalance !== "number") {
          throw new Error("\u6B63\u5728\u83B7\u53D6\u7528\u6237\u4F59\u989D\uFF0C\u8BF7\u7A0D\u5019...");
        }
        currentUserBalanceRef.current = nextBalance;
        return nextBalance;
      }).finally(() => {
        balanceLoadPromiseRef.current = null;
      });
    }
    return balanceLoadPromiseRef.current;
  }, [currentUserId, dispatch]);
  const startQuickChat = (0, import_react.useCallback)(async (overrideText) => {
    const startedAt = getQuickChatPerfNow();
    const trimmedText = (overrideText ?? text).trim();
    if (isStartingRef.current || isSending || !trimmedText && !imageFiles.size && !pendingFiles.length)
      return;
    isStartingRef.current = true;
    setIsSending(true);
    logQuickChatPerf("start", startedAt, {
      hasText: !!trimmedText,
      imageCount: imageFiles.size,
      pendingFileCount: pendingFiles.length
    });
    QUICK_CHAT_DEBUG && console.group("[QuickChatTrace] startQuickChat enter");
    QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] startQuickChat input", {
      trimmedTextLength: trimmedText.length,
      imageFilesSize: imageFiles.size,
      pendingFilesLength: pendingFiles.length,
      hasImages: imageFiles.size > 0 || pendingFiles.length > 0,
      quickChatMode
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
      const resolvedAgent = specialistAgentId ? { agentKey: specialistAgentId } : await resolveQuickChatAgentKey({
        hasImages,
        text: trimmedText,
        resolveTierAgent,
        dispatch,
        mode: quickChatMode.mode
      });
      const effectiveAgentId = resolvedAgent.agentKey || defaultAgentId;
      const quickChatSkills = resolvedAgent.skills;
      const quickChatModelOverride = autoOverrideAgent && QUICK_CHAT_GENERAL_TIER_AGENT_KEYS.has(effectiveAgentId) ? buildQuickChatModelOverride(autoOverrideAgent) : null;
      const dialogTitle = QUICK_CHAT_AGENT_TITLES[effectiveAgentId] ?? formatQuickChatDialogTitle(agentName);
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] routing", {
        hasImages,
        effectiveAgentId,
        dialogTitle,
        defaultAgentId
      });
      dialogAgentIdRef.current = effectiveAgentId;
      let dialogKey = "";
      let dialogSpaceId = null;
      if (currentUserId) {
        try {
          await dispatch(ensureCodingSkills(currentUserId));
        } catch (error) {
          console.warn("[QuickChat] ensure coding skills failed", error);
        }
      }
      let skillExtraReferences;
      if (quickChatSkills?.length && currentUserId) {
        try {
          await dispatch(ensureBuiltinObjectSkills(currentUserId));
        } catch (error) {
          console.warn("[QuickChat] ensure builtin object skills failed", error);
        }
        skillExtraReferences = quickChatSkills.map(
          (kind) => buildBuiltinObjectSkillReference(kind, currentUserId)
        );
      }
      try {
        const dialogAgentMode = specialistAgentId ? "fixed" : "auto";
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] createDialog dispatch", {
          agentMode: dialogAgentMode,
          cybots: specialistAgentId ? [effectiveAgentId] : [],
          spaceId: currentSpaceId,
          title: dialogTitle
        });
        const result = await dispatch(
          createDialog({
            agentMode: dialogAgentMode,
            cybots: specialistAgentId ? [effectiveAgentId] : [],
            ...!specialistAgentId && hasImages ? {
              autoRoute: {
                stickyTier: "image",
                version: 1
              }
            } : {},
            skipGreeting: true,
            skipAgentConfigRead: true,
            optimisticReturnBeforeWrite: true,
            spaceId: currentSpaceId,
            title: dialogTitle,
            ...skillExtraReferences ? { extraReferences: skillExtraReferences } : {}
          })
        ).unwrap();
        dialogKey = result?.dbKey ?? "";
        dialogKeyRef.current = dialogKey;
        dialogSpaceId = result?.spaceId ?? null;
        initialAgentIdRef.current = null;
        if (!dialogKey) {
          throw new Error("Dialog key is missing.");
        }
        QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] createDialog resolved", {
          dialogKey,
          dialogSpaceId
        });
        logQuickChatPerf("dialog-created", startedAt, {
          dialogKey,
          dialogSpaceId
        });
      } catch (error) {
        QUICK_CHAT_DEBUG && console.error("[QuickChatTrace] createDialog failed", error);
        notifyStartupError("createDialogFailed", error);
        QUICK_CHAT_DEBUG && console.groupEnd();
        return;
      }
      markRecentlyCreated(dialogKey);
      const routeState = buildQuickChatRouteState(trimmedText);
      const dialogUrl = buildDialogUrl(dialogKey, dialogSpaceId);
      logQuickChatPerf("navigate-started", startedAt, {
        dialogKey,
        dialogSpaceId,
        dialogUrl
      });
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] navigate", {
        dialogUrl,
        routeState
      });
      enableNextRouteViewTransition();
      navigate(dialogUrl, {
        replace: true,
        state: routeState
      });
      logQuickChatPerf("navigated", startedAt, {
        dialogKey
      });
      logQuickChatPerf("prepare-first-message-started", startedAt, {
        dialogKey,
        imageCount: imageFiles.size,
        pendingFileCount: pendingFiles.length
      });
      const extraParts = buildQuickChatExtraParts(pendingFiles);
      QUICK_CHAT_DEBUG && console.log("[QuickChatTrace] prepare sendFirstMessage", {
        dialogKey,
        textLength: trimmedText.length,
        imageCount: filesArray.length,
        imageFileSummaries: filesArray.map((f) => ({
          name: f.name,
          type: f.type,
          sizeBytes: f.size
        })),
        extraPartCount: extraParts.length
      });
      const desktopCwd2 = typeof window !== "undefined" ? window.__NOLO_DESKTOP_CWD__?.trim() : void 0;
      const runtimeOptions = {
        ...getIsDesktopApp() ? { workspaceToolsHint: true } : {},
        ...getIsDesktopApp() && desktopCwd2 ? { cwd: desktopCwd2 } : {},
        ...quickChatModelOverride ? { quickChatModelOverride } : {},
        ...!specialistAgentId && effectiveAgentId === PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY && !quickChatModelOverride ? { quickChatReasoningEffort: "max" } : {}
      };
      const sendPromise = Promise.resolve(
        dispatch(
          sendFirstMessage({
            dialogKey,
            text: firstMessageText,
            imageFiles: filesArray,
            extraParts,
            quickChatPerfStartedAt: startedAt,
            // Auto dialogs do not persist the routed Agent key; pass the
            // resolved target only for this turn.
            targetAgentKey: effectiveAgentId,
            ...Object.keys(runtimeOptions).length > 0 ? { runtimeOptions } : {}
          })
        )
      );
      logQuickChatPerf("send-first-message-dispatched", startedAt, {
        dialogKey,
        extraPartCount: extraParts.length,
        imageCount: filesArray.length
      });
      logQuickChatPerf("first-message-dispatched", startedAt, {
        dialogKey
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
            error
          });
          return;
        }
        if (error && typeof error === "object" && error.__errorInDialog === true) {
          console.info("[QuickChat] send error written into dialog", {
            dialogKey,
            message: error.message
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
    autoOverrideAgent
  ]);
  (0, import_react.useEffect)(() => {
    startQuickChatRef.current = startQuickChat;
  }, [startQuickChat]);
  const isLiveAudioOnly = (0, import_react.useMemo)(() => {
    if (!agent) return false;
    return isLiveAudioOnlyAgent(agent);
  }, [agent]);
  const isSendDisabled = (0, import_react.useMemo)(() => {
    if (isLiveAudioOnly) return true;
    return !text.trim() && !imageFiles.size && !pendingFiles.length || isSending;
  }, [text, imageFiles.size, pendingFiles.length, isSending, isLiveAudioOnly]);
  const showVoiceInput = (0, import_react.useMemo)(
    () => !text.trim() && !imageFiles.size && !pendingFiles.length && !isSending,
    [text, imageFiles.size, pendingFiles.length, isSending]
  );
  const handleQuickChatFileSelection = (0, import_react.useCallback)(
    (files) => {
      void processFiles(files);
    },
    [processFiles]
  );
  const { handleChange: autoResizeOnChange } = useAutoResizeTextarea({
    maxHeight: 360,
    onTextChange: setText,
    value: text,
    ref: areaRef
  });
  const handleCompositionStart = (0, import_react.useCallback)(() => {
    isComposingRef.current = true;
  }, []);
  const handleCompositionEnd = (0, import_react.useCallback)(() => {
    isComposingRef.current = false;
    lastCompositionEndAtRef.current = Date.now();
  }, []);
  const handleTextareaBlur = (0, import_react.useCallback)(() => {
    isComposingRef.current = false;
  }, []);
  const handleTextareaKeyDown = (0, import_react.useCallback)(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey && !shouldDeferEnterForIme({
        event: e,
        isComposing: isComposingRef.current,
        lastCompositionEndAt: lastCompositionEndAtRef.current
      })) {
        e.preventDefault();
        startQuickChat();
      }
    },
    [startQuickChat]
  );
  const handleTranscribed = (0, import_react.useCallback)(
    (transcript) => {
      setText(text ? `${text} ${transcript}` : transcript);
    },
    [setText, text]
  );
  const handleVoiceSend = (0, import_react.useCallback)((transcript) => {
    return startQuickChatRef.current(transcript);
  }, []);
  const placeholderMeta = resolveQuickChatPlaceholderMeta(
    quickChatMode.mode,
    isEmptyState
  );
  const inputPlaceholder = t(placeholderMeta.key, placeholderMeta.defaultValue);
  const desktopCwd = getIsDesktopApp() && typeof window !== "undefined" ? window.__NOLO_DESKTOP_CWD__?.trim() : void 0;
  const workspacePath = currentSpace?.boundFolder?.trim() || desktopCwd;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "quick-chat-container",
      "data-workspace-cwd": workspacePath || void 0,
      "data-surface": surface,
      "data-testid": "quick-chat-runtime",
      style: viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME, {
        enabled: surface === "home-primary"
      }),
      children: [
        getIsDesktopApp() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "quick-chat-workspace-indicator",
            "data-testid": "quick-chat-workspace",
            title: workspacePath || void 0,
            children: [
              t("quickChat.workspace", "\u5DE5\u4F5C\u533A"),
              ":",
              " ",
              workspacePath && foldHomePath(workspacePath) || t("quickChat.workspaceUnset", "\u672A\u8BBE\u7F6E")
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: `quick-chat-box chat-input-card ${isDragOver ? "drag-over" : ""} ${isSending ? "is-sending" : ""}`,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
            "data-file-drop-target": "quick-chat",
            "data-sending": isSending || void 0,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                AttachmentsPreview_default,
                {
                  imagePreviews: imgPreviews,
                  pendingFiles: pendingFilesWithStatus,
                  onRemoveImage: removeImage,
                  processingFiles: processingFileIds
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrowseContextIndicator, {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                $b8dcdc58eeae0d40$export$2c73285ae9390cec,
                {
                  className: "message-input__textarea-wrap",
                  "aria-label": inputPlaceholder,
                  "aria-busy": isSending || void 0,
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
                    {
                      ref: areaRef,
                      className: "message-input__textarea",
                      "data-testid": "quick-chat-input",
                      placeholder: inputPlaceholder,
                      value: text,
                      rows: 1,
                      onChange: autoResizeOnChange,
                      onCompositionStart: handleCompositionStart,
                      onCompositionEnd: handleCompositionEnd,
                      onBlur: handleTextareaBlur,
                      onKeyDown: handleTextareaKeyDown,
                      disabled: isSending
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "message-input__controls", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "message-input__controls-left", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    FileUploadButton_default,
                    {
                      disabled: isSending,
                      onFilesSelected: handleQuickChatFileSelection
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickChatModeSelector_default, { mode: quickChatMode, onModeChange: handleModeChange, surface })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "message-input__controls-right", children: [
                  onPersonalizationClick && isEmptyState && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "personalization-button",
                      onClick: onPersonalizationClick,
                      title: t("quickChat.personalization.title", "\u544A\u8BC9 Nolo \u6211\u7684\u4E60\u60EF"),
                      "aria-label": t("quickChat.personalization.title", "\u544A\u8BC9 Nolo \u6211\u7684\u4E60\u60EF"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSettings2, { size: 16, "aria-hidden": "true" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "personalization-button-text", children: t("quickChat.personalization.label", "\u544A\u8BC9 Nolo \u6211\u7684\u4E60\u60EF") })
                      ]
                    }
                  ),
                  showVoiceInput ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    VoiceInputButton_default,
                    {
                      onTranscribed: handleTranscribed,
                      onSend: handleVoiceSend,
                      className: "voice-btn-in-send",
                      iconSize: 20
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    SendButton_default,
                    {
                      onClick: startQuickChat,
                      disabled: isSendDisabled,
                      loading: isSending,
                      testId: "quick-chat-send"
                    }
                  )
                ] })
              ] })
            ]
          }
        ),
        isVoicePanelOpen && dialogKeyRef.current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          LiveVoicePanel,
          {
            agentId: dialogAgentIdRef.current ?? currentModeAgentId,
            dialogId: dialogKeyRef.current,
            onClose: () => setIsVoicePanelOpen(false)
          }
        )
      ]
    }
  ) });
};
var QuickChatRuntime_default = QuickChatRuntime;
export {
  QuickChatRuntime_default as default
};
