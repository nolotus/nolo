// file: packages/app/pages/QuickChat.tsx
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { viewTransitionStyle, QUICK_CHAT_COMPOSER_VT_NAME } from "app/viewTransitions";
import { TextField, TextArea } from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  LuBot,
  LuMessageCircle,
  LuMic,
  LuPaperclip,
  LuArrowUp,
  LuLayoutGrid,
} from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectDefaultAgentId,
  selectDefaultAgentPreference,
  SYSTEM_DEFAULT_AGENT_ID,
} from "app/settings/settingSlice";
import { noloAgentId } from "core/init";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
} from "core/builtinAgents";
import { toErrorMessage } from "core/errorMessage";
import { asTrimmedString } from "core/trimmedString";
import { useNavigate } from "app/routing";
import { toast } from "app/utils/toast"
import { read } from "database/dbSlice";
import QuickChatModeSelector from "./QuickChatModeSelector";
import {
  resolveQuickChatLaunchSpecialist,
  resolveQuickChatPlaceholderMeta,
  useQuickChatMode,
  type QuickChatMode,
} from "./quickChatFlow";
import { shouldDeferEnterForIme } from "app/utils/ime";
import "chat/web/chatInputCard.css";
import "./QuickChat.css";

const quickChatRuntimeImport = () => import("./QuickChatRuntime");
const QuickChatRuntime = lazy(quickChatRuntimeImport);
const QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS = 500;
const QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS = 250;
const QUICK_CHAT_PERF_PREFIX = "[QuickChatPerf]";

let quickChatPreloadPromise: Promise<PromiseSettledResult<unknown>[]> | null = null;
let quickChatPreloadScheduled = false;
let quickChatPreloadSettled = false;
const quickChatRuntimeReadyCallbacks = new Set<() => void>();

const logQuickChatPreloadStage = (
  stage: string,
  details: Record<string, unknown> = {}
) => {
  if (typeof window === "undefined") return;
  console.info(QUICK_CHAT_PERF_PREFIX, {
    stage,
    atMs: performance.now(),
    ...details,
  });
};

export const preloadQuickChatRuntimeDependencies = () => {
  if (!quickChatPreloadPromise) {
    logQuickChatPreloadStage("quick-chat-preload-started");
    quickChatPreloadPromise = Promise.allSettled([
      quickChatRuntimeImport(),
      import("render/page/PageLoader"),
      import("chat/dialog/actions/createDialogAction"),
      import("chat/dialog/actions/handleSendMessageAction"),
      import("ai/agent/streamAgentChatTurn"),
    ]);
    void quickChatPreloadPromise.then((results) => {
      quickChatPreloadSettled = true;
      logQuickChatPreloadStage("quick-chat-preload-settled", {
        rejectedCount: results.filter((result: PromiseSettledResult<unknown>) => result.status === "rejected")
          .length,
      });
      for (const callback of quickChatRuntimeReadyCallbacks) {
        callback();
      }
      quickChatRuntimeReadyCallbacks.clear();
    });
  }
  return quickChatPreloadPromise;
};

export const onQuickChatRuntimeReady = (callback: () => void) => {
  if (quickChatPreloadSettled) {
    callback();
    return () => {};
  }
  quickChatRuntimeReadyCallbacks.add(callback);
  return () => {
    quickChatRuntimeReadyCallbacks.delete(callback);
  };
};

const scheduleQuickChatRuntimeDependencyPreload = (trigger: string) => {
  if (quickChatPreloadScheduled || typeof window === "undefined") {
    return () => {};
  }
  quickChatPreloadScheduled = true;
  logQuickChatPreloadStage("quick-chat-preload-scheduled", {
    trigger,
    idleTimeoutMs: QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS,
    fallbackDelayMs: QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS,
  });

  const preload = () => {
    void preloadQuickChatRuntimeDependencies();
  };
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number }
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(preload, {
      timeout: QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS,
    });
    return () => {
      idleWindow.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(
    preload,
    QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS
  );
  return () => {
    window.clearTimeout(timeoutId);
  };
};

scheduleQuickChatRuntimeDependencyPreload("module");

export type QuickChatSurface = "default" | "home-primary" | "space-home-compact";

interface QuickChatProps {
  surface?: QuickChatSurface;
  isEmptyState?: boolean;
  /** Route-authoritative Space context; when set, wins over Redux for createDialog. */
  spaceId?: string;
  /** `/chat?launch=<slug>` 直达专职 agent（如用户菜单里的「我想反馈」）。 */
  launch?: string | null;
}

const QuickChat: React.FC<QuickChatProps> = ({
  surface = "default",
  isEmptyState = false,
  spaceId,
  launch = null,
}) => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const defaultAgentId = useAppSelector(selectDefaultAgentId);
  const defaultAgentPreference = useAppSelector(selectDefaultAgentPreference);
  const allDbEntities = useAppSelector((state) => state.db?.entities ?? {});
  const [isRuntimeActive, setRuntimeActive] = useState(false);
  const [draft, setDraft] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [initialAgentId, setInitialAgentId] = useState<string | null>(null);

  const [quickChatMode, handleModeChange] = useQuickChatMode();
  const isCompact = surface === "space-home-compact";

  const startPersonalization = useCallback(async () => {
    try {
      const { startPersonalizationDialog } = await import(
        "ai/policy/personalizationDialog"
      );
      await startPersonalizationDialog({
        dispatch,
        navigate,
        language: i18n.language,
        source: "home",
      });
    } catch (error) {
      console.error("Failed to start personalization dialog:", error);
      toast.error(t("homeActions.personalizationFailed", "启动个性化设置失败"));
    }
  }, [dispatch, i18n.language, navigate, t]);

  const handleChipClick = useCallback(
    (chip: QuickChatChipAction) => {
      if (chip.action === "personalization") {
        void startPersonalization();
        return;
      }
      if (chip.action === "specialist") {
        setDraft(chip.prompt);
        setInitialAgentId(chip.agentKey);
        setAutoSend(true);
        void preloadQuickChatRuntimeDependencies();
        setRuntimeActive(true);
        return;
      }
      setDraft(chip.prompt);
      setInitialAgentId(null);
      setAutoSend(true);
      void preloadQuickChatRuntimeDependencies();
      setRuntimeActive(true);
    },
    [startPersonalization]
  );

  // `/chat?launch=feedback` 等直达入口：挂载后自动以专职 agent 开一轮对话，只触发一次。
  const launchSpecialist = useMemo(
    () => resolveQuickChatLaunchSpecialist(launch),
    [launch]
  );
  const hasLaunchedRef = useRef(false);
  useEffect(() => {
    if (!launchSpecialist || hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    handleChipClick({
      action: "specialist",
      agentKey: launchSpecialist.agentKey,
      prompt: t(launchSpecialist.promptKey, launchSpecialist.promptFallback),
    });
  }, [handleChipClick, launchSpecialist, t]);

  useEffect(() => {
    if (isRuntimeActive) return;
    const cancelPreload = scheduleQuickChatRuntimeDependencyPreload("effect");
    const cancelRuntimeReady = onQuickChatRuntimeReady(() => {
      setRuntimeActive(true);
    });
    return () => {
      cancelPreload();
      cancelRuntimeReady();
    };
  }, [isRuntimeActive]);

  useEffect(() => {
    if (!defaultAgentId) return;
    logQuickChatPreloadStage("quick-chat-agent-prewarm-started", {
      defaultAgentId,
    });
    void Promise.resolve(dispatch(read({ dbKey: defaultAgentId })))
      .then(() => {
        logQuickChatPreloadStage("quick-chat-agent-prewarm-settled", {
          defaultAgentId,
        });
      })
      .catch((error) => {
        logQuickChatPreloadStage("quick-chat-agent-prewarm-failed", {
          defaultAgentId,
          error: toErrorMessage(error),
        });
      });
  }, [defaultAgentId, dispatch]);

  const activateRuntime = useCallback(() => {
    void preloadQuickChatRuntimeDependencies();
    setRuntimeActive(true);
  }, []);

  const handleShellChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    void preloadQuickChatRuntimeDependencies();
    setDraft(event.target.value);
    setRuntimeActive(true);
  }, []);

  const handleShellKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !shouldDeferEnterForIme({
          event,
          isComposing: false,
          lastCompositionEndAt: 0,
        })
      ) {
        event.preventDefault();
        // If the runtime is already active, do not intercept; let QuickChatRuntime handle it.
        if (!isRuntimeActive) {
          setAutoSend(true);
          setRuntimeActive(true);
        }
      }
    },
    [isRuntimeActive]
  );

  const resolveAgentDisplayName = useCallback(
    (agentId: string): string => {
      if (agentId === SYSTEM_DEFAULT_AGENT_ID || agentId === noloAgentId) {
        return t("quickChat.defaultAgentName", "nolo");
      }
      const entity = allDbEntities[agentId];
      const candidate = asTrimmedString(entity?.name);
      return candidate || t("quickChat.defaultAgentName", "nolo");
    },
    [allDbEntities, t],
  );

  const agentName = (() => {
    if (
      !defaultAgentPreference ||
      defaultAgentPreference === SYSTEM_DEFAULT_AGENT_ID ||
      defaultAgentId === noloAgentId
    ) {
      return t("quickChat.defaultAgentName", "nolo");
    }
    return resolveAgentDisplayName(defaultAgentPreference);
  })();

  const placeholderMeta = resolveQuickChatPlaceholderMeta(
    quickChatMode.mode,
    isEmptyState,
  );
  const placeholder = t(placeholderMeta.key, placeholderMeta.defaultValue);
  const isSendDisabled = useMemo(() => !draft.trim(), [draft]);
  const wrapperClassName = [
    "quick-chat-wrapper",
    isEmptyState ? "is-empty-state" : "",
    isCompact ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showGreeting = !isCompact && surface !== "home-primary";

  if (isRuntimeActive) {
    return (
      <div className={wrapperClassName} data-surface={surface}>
        {showGreeting && (
          <h1 className="quick-chat-greeting">
            {t("quickChat.greeting", "今天一起做什么？")}
          </h1>
        )}
        <Suspense fallback={
          <QuickChatShell
            draft={draft}
            placeholder={placeholder}
            disabled
            isEmptyState={isEmptyState}
            surface={surface}
            quickChatMode={quickChatMode}
            onModeChange={handleModeChange}
          />
        }>
          <QuickChatRuntime
            initialText={draft}
            initialAgentId={initialAgentId}
            surface={surface}
            spaceId={spaceId}
            autoSend={autoSend}
            isEmptyState={isEmptyState}
            onPersonalizationClick={isCompact ? undefined : startPersonalization}
            quickChatMode={quickChatMode}
            onModeChange={handleModeChange}
          />
        </Suspense>
        {!isCompact && <QuickChatChips onChipClick={handleChipClick} />}
      </div>
    );
  }

  return (
    <div className={wrapperClassName} data-surface={surface}>
      {showGreeting && (
        <h1 className="quick-chat-greeting">
          {t("quickChat.greeting", "今天一起做什么？")}
        </h1>
      )}
      <QuickChatShell
        draft={draft}
        placeholder={placeholder}
        disabled={isSendDisabled}
        surface={surface}
        isEmptyState={isEmptyState}
        onActivate={activateRuntime}
        onChange={handleShellChange}
        onKeyDown={handleShellKeyDown}
        quickChatMode={quickChatMode}
        onModeChange={handleModeChange}
      />
      {!isCompact && <QuickChatChips onChipClick={handleChipClick} />}
    </div>
  );
};

interface QuickChatShellProps {
  draft: string;
  placeholder: string;
  disabled?: boolean;
  surface?: QuickChatSurface;
  isEmptyState?: boolean;
  onActivate?: () => void;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  quickChatMode: QuickChatMode;
  onModeChange: (mode: QuickChatMode) => void;
}

const QuickChatShell: React.FC<QuickChatShellProps> = ({
  draft,
  placeholder,
  disabled = true,
  surface = "default",
  isEmptyState = false,
  onActivate,
  onChange,
  onKeyDown,
  quickChatMode,
  onModeChange,
}) => {
  const vtStyle = viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME, {
    enabled: surface === "home-primary",
  });
  return (
    <div className="quick-chat-container" data-surface={surface} data-testid="quick-chat-shell" style={vtStyle}>
      <div className="quick-chat-box chat-input-card">
        <TextField className="message-input__textarea-wrap" aria-label={placeholder || "Quick chat"}>
          <TextArea
            className="message-input__textarea"
            data-testid="quick-chat-input"
            placeholder={placeholder}
            value={draft}
            rows={1}
            readOnly={!onChange}
            onFocus={onActivate}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
        </TextField>
        <div className="message-input__controls">
          <div className="message-input__controls-left">
            <button
              type="button"
              className="upload-button"
              onFocus={onActivate}
              onClick={onActivate}
              aria-label="Upload"
            >
              <LuPaperclip size={18} aria-hidden="true" />
            </button>

            <QuickChatModeSelector mode={quickChatMode} onModeChange={onModeChange} surface={surface} />
          </div>

          <div className="message-input__controls-right">
            <button
              type="button"
              className={`send-button ${disabled ? "voice-mode" : "send-mode"}`}
              data-testid="quick-chat-send"
              aria-disabled={disabled}
              onFocus={onActivate}
              onClick={onActivate}
              aria-label="Send"
            >
              {disabled ? (
                <LuMic size={18} aria-hidden="true" />
              ) : (
                <LuArrowUp
                  size={20}
                  strokeWidth={1.75}
                  className="send-icon"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type QuickChatChipAction =
  | { action: "prompt"; prompt: string }
  | { action: "personalization" }
  | { action: "specialist"; agentKey: string; prompt: string };

interface QuickChatChip {
  key: string;
  label: string;
  icon: React.ReactNode;
  action: QuickChatChipAction;
}

interface QuickChatChipsProps {
  onChipClick: (chip: QuickChatChipAction) => void;
}

const QuickChatChips: React.FC<QuickChatChipsProps> = ({ onChipClick }) => {
  const { t } = useTranslation();

  const chips = useMemo<QuickChatChip[]>(
    () => [
      {
        key: "brainstorm",
        label: t("quickChat.chipBrainstorm", "头脑风暴"),
        icon: <LuMessageCircle size={16} aria-hidden="true" />,
        action: { action: "prompt", prompt: t("quickChat.chipBrainstormPrompt", "帮我做一次头脑风暴") },
      },
      {
        key: "createAgent",
        label: t("quickChat.chipCreateAgent", "创建agent"),
        icon: <LuBot size={16} aria-hidden="true" />,
        action: {
          action: "specialist",
          agentKey: BUILTIN_AGENT_CREATOR_AGENT_KEY,
          prompt: t("quickChat.chipCreateAgentPrompt", "帮我创建一个Agent"),
        },
      },
      {
        key: "createApp",
        label: t("quickChat.chipCreateApp", "创建应用"),
        icon: <LuLayoutGrid size={16} aria-hidden="true" />,
        action: {
          action: "specialist",
          agentKey: BUILTIN_APP_BUILDER_AGENT_KEY,
          prompt: t("quickChat.chipCreateAppPrompt", "帮我创建一个应用"),
        },
      },
    ],
    [t]
  );

  return (
    <div className="quick-chat-chips">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="quick-chat-chip"
          onClick={() => onChipClick(chip.action)}
        >
          {chip.icon}
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickChat;
