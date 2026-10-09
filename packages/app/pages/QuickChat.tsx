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
  takePendingQuickChatDraft,
  type QuickChatMode,
} from "./quickChatFlow";
import { shouldDeferEnterForIme } from "app/utils/ime";
import * as stylex from "@stylexjs/stylex";
import { chatInputCardStyles } from "chat/web/chatInputCardStyles";
import "chat/web/chatStylexEscapeHatch.css";
import "./QuickChat.css";

// 动态 import 必须包一层可重试加载器：React.lazy 会把第一个 rejected promise
// 钉死在组件实例上，chunk 404（部署后旧 hash 被清理）一旦发生就永久失败。
// 失败时重建 lazy 组件并重新发 import()，才能拿到恢复机会（见 QuickChat 内的
// runtimeComponent / QuickChatChunkErrorBoundary 与 preload 的 reject 处理）。
export const isQuickChatChunkLoadError = (error: unknown): boolean => {
  if (!error) return false;
  const name = (error as { name?: unknown })?.name;
  const message = (error as { message?: unknown })?.message;
  const text = `${typeof name === "string" ? name : ""} ${typeof message === "string" ? message : ""}`;
  return (
    /ChunkLoadError/i.test(text) ||
    /dynamically imported module/i.test(text) ||
    /Failed to fetch/i.test(text) ||
    /Importing a module script failed/i.test(text) ||
    /import\(\)/i.test(text) && /failed/i.test(text)
  );
};

const quickChatRuntimeImport = () => import("./QuickChatRuntime");
const createQuickChatRuntimeComponent = () => lazy(quickChatRuntimeImport);
const QUICK_CHAT_CHUNK_RELOAD_KEY = "nolo.quickchat.chunkReloadAt";
const QUICK_CHAT_CHUNK_RELOAD_COOLDOWN_MS = 60_000;

/**
 * Stale-deploy chunk 404 的终极恢复：整页刷新让 index.html 换成新 hash 清单。
 * 用 sessionStorage 冷却窗防 reload 死循环（部署彻底缺失时最多刷一次）。
 */
export const shouldReloadForQuickChatChunk = (
  storage: Pick<Storage, "getItem" | "setItem"> | null =
    typeof sessionStorage !== "undefined" ? sessionStorage : null,
  now: number = Date.now(),
): boolean => {
  if (!storage) return false;
  try {
    const last = Number.parseInt(storage.getItem(QUICK_CHAT_CHUNK_RELOAD_KEY) ?? "", 10);
    if (Number.isFinite(last) && now - last < QUICK_CHAT_CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    storage.setItem(QUICK_CHAT_CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
};
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
      const rejectedCount = results.filter(
        (result: PromiseSettledResult<unknown>) => result.status === "rejected"
      ).length;
      const runtimeRejected = results[0]?.status === "rejected";
      // Runtime chunk 挂了（典型：deploy 后旧 hash 被清理 → 404）时不发 ready
      // 回调 —— ready 回调唯一作用是 setRuntimeActive(true)，此刻激活只会让
      // lazy 立刻抛出同一个 rejection。同时释放缓存的 promise 让下次 preload
      // 重新 import（失败的动态 import 不会进模块缓存，重试能真实重新拉取）。
      if (runtimeRejected) {
        quickChatPreloadPromise = null;
        logQuickChatPreloadStage("quick-chat-preload-rejected", {
          rejectedCount,
          reason:
            results[0]?.status === "rejected"
              ? String((results[0] as PromiseRejectedResult).reason)
              : undefined,
        });
        return;
      }
      quickChatPreloadSettled = true;
      logQuickChatPreloadStage("quick-chat-preload-settled", {
        rejectedCount,
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

// Prewarm only when QuickChat is mounted (the effect below), not when an
// unrelated route imports Home/NewChatPage while discovering the route table.
// The shell is eager; mounted chat still preloads with the same idle deadline.

interface QuickChatChunkErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onRetry: () => void;
  retryLabel: string;
}

interface QuickChatChunkErrorBoundaryState {
  hasError: boolean;
  retriedOnce: boolean;
}

/**
 * QuickChatRuntime chunk 加载失败边界。典型触发：deploy 把旧 hash chunk 清掉，
 * 存量会话 lazy import 404（React.lazy 会把该 rejection 钉死在组件上）。
 * 处理顺序：先静默重试一次（可能 recoverable 的瞬时网络抖动）；再失败则
 * 若允许就整页 reload（index.html 已指向新 hash 清单）；reload 冷却期内
 * 兜底回退到 shell + 显式重试按钮，绝不让输入框永久转圈。
 */
class QuickChatChunkErrorBoundary extends React.Component<
  QuickChatChunkErrorBoundaryProps,
  QuickChatChunkErrorBoundaryState
> {
  state: QuickChatChunkErrorBoundaryState = { hasError: false, retriedOnce: false };
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<QuickChatChunkErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    const chunkError = isQuickChatChunkLoadError(error);
    logQuickChatPreloadStage("quick-chat-runtime-chunk-error", {
      message: error?.message,
      chunkError,
      retriedOnce: this.state.retriedOnce,
    });
    if (!chunkError) return; // Non-chunk render errors: keep manual retry UI only.
    if (!this.state.retriedOnce) {
      // First failure: retry the chunk fetch once before escalating to reload.
      this.retryTimer = setTimeout(() => this.handleRetry(), 600);
      return;
    }
    // Second failure on a stale deploy: reload picks up the fresh index.html /
    // asset manifest. Cooldown prevents a reload loop when the deploy itself
    // is broken — in that case the manual retry fallback stays reachable.
    if (shouldReloadForQuickChatChunk() && typeof window !== "undefined") {
      window.location.reload();
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.setState(
      () => ({ hasError: false, retriedOnce: true }),
      () => this.props.onRetry(),
    );
  };

  render() {
    if (this.state.hasError) {
      if (!this.state.retriedOnce) {
        // Auto-retry in flight: keep showing the shell (no dead spinner).
        return this.props.fallback;
      }
      return (
        <div data-testid="quick-chat-chunk-error" className="quick-chat-chunk-error">
          {this.props.fallback}
          <button
            type="button"
            data-testid="quick-chat-chunk-retry"
            onClick={() => this.handleRetry()}
          >
            {this.props.retryLabel}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  // React.lazy 缓存首个 rejected import promise：chunk 404 后必须换一个新的
  // lazy 组件实例重试，否则同一组件永远重抛同一个 rejection。
  const [runtimeComponent, setRuntimeComponent] = useState(
    createQuickChatRuntimeComponent
  );

  const retryRuntimeChunk = useCallback(() => {
    // 释放被拒的 preload 缓存，让 import() 真正重新拉取 chunk；
    // 然后换一个全新 lazy 实例，绕开 React.lazy 的 rejection 钉死。
    quickChatPreloadPromise = null;
    quickChatPreloadSettled = false;
    setRuntimeComponent(createQuickChatRuntimeComponent());
    void preloadQuickChatRuntimeDependencies();
  }, []);

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
  // 登录回跳后恢复草稿；放在 effect 而非 state 初始化，避免 StrictMode 双调用时读取即清除导致丢失。
  useEffect(() => {
    const pending = takePendingQuickChatDraft();
    if (pending) setDraft(pending);
  }, []);
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

  const showGreeting = !isCompact;

  if (isRuntimeActive) {
    const RuntimeComponent = runtimeComponent;
    return (
      <div className={wrapperClassName} data-surface={surface}>
        {showGreeting && (
          <h1 className="quick-chat-greeting">
            {t("quickChat.greeting", "今天一起做什么？")}
          </h1>
        )}
        <QuickChatChunkErrorBoundary
          onRetry={retryRuntimeChunk}
          retryLabel={t("quickChat.retryLoad", "重试加载")}
          fallback={
            <QuickChatShell
              draft={draft}
              placeholder={placeholder}
              disabled
              isEmptyState={isEmptyState}
              surface={surface}
              quickChatMode={quickChatMode}
              onModeChange={handleModeChange}
            />
          }
        >
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
            <RuntimeComponent
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
        </QuickChatChunkErrorBoundary>
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
  // stylex.props() returns { className } which would clobber the handwritten
  // "quick-chat-box" hook class if spread after it; merge explicitly instead.
  const cardStyleProps = stylex.props(chatInputCardStyles.card);
  return (
    <div className="quick-chat-container" data-surface={surface} data-testid="quick-chat-shell" style={vtStyle}>
      <div
        data-hook="chat-esc-chat-input-card"
        {...cardStyleProps}
        className={[cardStyleProps.className, "quick-chat-box"].filter(Boolean).join(" ")}
      >
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
