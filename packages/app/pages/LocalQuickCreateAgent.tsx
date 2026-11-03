import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "react-redux";
import { useNavigate, useSearchParams } from "app/routing";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuClock,
  LuCloudUpload,
  LuKey,
  LuShield,
  LuSparkles,
  LuTerminal,
} from "react-icons/lu";
import Button from "render/web/ui/Button";
import { useAppDispatch, type RootState } from "app/store";
import { useUserId } from "identity";
import { createAgent } from "ai/agent/agentSlice";
import { runSyncStandaloneAgentToAccount } from "ai/agent/runSyncStandaloneAgentToAccount";
import {
  ensureSyncMappingsHydrated,
  getSyncMapping,
  getSyncMappingVersion,
  subscribeSyncMappingVersion,
} from "database/sync/syncMapping";
import {
  getAgentSourceDescriptor,
  listAgentSourceDescriptors,
  projectAgentSourceFormData,
  type AgentSourceDescriptor,
} from "ai/agent/agentSourceDescriptors";
import { scanInstalledClis } from "ai/agent/cliChatClient";
import type { CliProvider } from "ai/agent/cliProviders";
import { getIsDesktopApp } from "app/utils/env";
import { writeLocalFirstOnboardingDismissed } from "app/localFirst/onboardingDismissed";
import { createAgentKey } from "database/keys";
import { useCreateDialog } from "chat/dialog/useCreateDialog";
import { markRecentlyCreated } from "chat/web/sidebar/recentlyCreatedStore";
import { localFirstLog } from "app/localFirst/localFirstLog";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import {
  quickCreateBackTarget,
  quickCreateStepDirection,
  quickCreateStepForState,
  runQuickCreateStepTransition,
  type QuickCreateStep,
} from "./quickCreateStepViewTransitions";
import "./LocalQuickCreateAgent.css";

/** Top-level user intent — plain language, not provider taxonomy. */
export type LocalCreatePath = "byo" | "membership";

/** Under “已购会员”: how they access that membership. */
export type MembershipAccess = "cli" | "oauth" | "api_key";

function resolveAgentDbKey(
  agent: { id?: string; isPublic?: boolean; userId?: string },
  ownerUserId: string,
): string {
  const id = asTrimmedString(agent.id);
  if (!id) return "";
  if (agent.isPublic) return createAgentKey.public(id);
  const owner = asOptionalTrimmedString(agent.userId) ?? ownerUserId;
  return createAgentKey.private(owner, id);
}

function parsePath(raw: string | null): LocalCreatePath | null {
  if (raw === "byo" || raw === "membership") return raw;
  return null;
}

/** 深链预选会员接入方式（onboarding CLI 直达用）；仅开放 cli——oauth/api_key
 *  语义上仍需用户手动选择（oauth 尚未开放完成授权），非法值静默忽略。 */
function parseMembershipAccess(raw: string | null): MembershipAccess | null {
  return raw === "cli" ? "cli" : null;
}

function filterByPath(
  path: LocalCreatePath,
  membershipAccess: MembershipAccess | null,
): AgentSourceDescriptor[] {
  const all = listAgentSourceDescriptors();
  if (path === "byo") {
    // API Key + local models (Ollama / LM Studio) + configure later.
    return all.filter(
      (d) =>
        d.accessVariant === "metered_key" ||
        d.accessVariant === "local_runtime" ||
        d.accessVariant === "configure_later",
    );
  }
  // membership
  if (membershipAccess === "cli") {
    return all.filter((d) => d.accessVariant === "cli_session");
  }
  if (membershipAccess === "oauth") {
    return all.filter((d) => d.accessVariant === "oauth");
  }
  if (membershipAccess === "api_key") {
    // Subscription-style key+URL (Token Plan etc.)
    return all.filter((d) => d.accessVariant === "token_plan_endpoint");
  }
  return [];
}

function iconForDescriptor(d: AgentSourceDescriptor) {
  switch (d.accessVariant) {
    case "oauth":
      return LuShield;
    case "cli_session":
      return LuTerminal;
    case "local_runtime":
      return LuSparkles;
    case "configure_later":
      return LuClock;
    default:
      return LuKey;
  }
}

/** Detected CLIs first; keep relative order within each group. */
export function orderSourcesWithInstalledCli(
  candidates: AgentSourceDescriptor[],
  installed: readonly CliProvider[],
): AgentSourceDescriptor[] {
  if (installed.length === 0) return candidates;
  const installedSet = new Set(installed);
  const detected: AgentSourceDescriptor[] = [];
  const rest: AgentSourceDescriptor[] = [];
  for (const d of candidates) {
    const provider = d.form.cliProvider;
    if (provider && installedSet.has(provider)) {
      detected.push(d);
    } else {
      rest.push(d);
    }
  }
  return [...detected, ...rest];
}

/**
 * Local-first create: short questions first, then concrete source + create.
 * Still projects through agentSourceDescriptors (no second registry).
 */
const LocalQuickCreateAgent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { createNewDialog } = useCreateDialog();
  const accountUserId = useUserId();
  // 创建永远落在本机：云同步是创建之后由用户显式触发的独立动作。
  const ownerUserId = "local";
  const hasAccount = Boolean(accountUserId && accountUserId !== "local");

  const initialPath = parsePath(searchParams.get("path"));
  const initialAccess = parseMembershipAccess(searchParams.get("access"));

  const [path, setPath] = useState<LocalCreatePath | null>(initialPath);
  const [membershipAccess, setMembershipAccess] =
    useState<MembershipAccess | null>(initialAccess);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showEndpointFields, setShowEndpointFields] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 创建成功后的本机 Agent（dbKey + 展示名），用于显式云同步与开始聊天。 */
  const [createdAgent, setCreatedAgent] = useState<{
    dbKey: string;
    name: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [installedClis, setInstalledClis] = useState<CliProvider[]>([]);
  const [cliScanBusy, setCliScanBusy] = useState(false);
  /** The wizard's step surface — the element that slides on a step change. */
  const stepPanelRef = useRef<HTMLDivElement | null>(null);

  const step: QuickCreateStep = quickCreateStepForState({
    path,
    membershipAccess,
    sourceKey,
  });

  const candidates = useMemo(() => {
    if (!path) return [];
    if (path === "membership" && !membershipAccess) return [];
    const base = filterByPath(path, membershipAccess);
    if (membershipAccess === "cli" && installedClis.length > 0) {
      return orderSourcesWithInstalledCli(base, installedClis);
    }
    return base;
  }, [path, membershipAccess, installedClis]);

  const installedCliSet = useMemo(
    () => new Set(installedClis),
    [installedClis],
  );

  // Desktop-only: once on CLI source step, probe local host (non-blocking).
  useEffect(() => {
    if (step !== "source" || membershipAccess !== "cli") return;
    if (!getIsDesktopApp()) return;

    let cancelled = false;
    setCliScanBusy(true);
    localFirstLog("quickCreate.cliScan.start", {});
    void scanInstalledClis({ getState: () => store.getState() })
      .then((list) => {
        if (cancelled) return;
        setInstalledClis(list);
        localFirstLog("quickCreate.cliScan.done", {
          count: list.length,
          providers: list.join(","),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setInstalledClis([]);
      })
      .finally(() => {
        if (!cancelled) setCliScanBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [membershipAccess, store, step]);

  const selected = useMemo(
    () => (sourceKey ? getAgentSourceDescriptor(sourceKey) : undefined),
    [sourceKey],
  );

  // 显式云同步状态：以 durable mapping 为唯一真源，冷启动先 hydrate 再判状态。
  const mappingVersion = useSyncExternalStore(
    subscribeSyncMappingVersion,
    getSyncMappingVersion,
    () => 0,
  );
  const syncedToCloud = useMemo(() => {
    if (!createdAgent || !hasAccount || !accountUserId) return false;
    return Boolean(getSyncMapping(createdAgent.dbKey, accountUserId));
  }, [createdAgent, accountUserId, hasAccount, mappingVersion]);

  useEffect(() => {
    if (!createdAgent) return;
    void ensureSyncMappingsHydrated().catch(() => {
      /* best-effort cold hydrate for honest mapped status */
    });
  }, [createdAgent]);

  /**
   * Every step move goes through here: the runner slides the step surface in
   * the direction of travel (forward → in from the right, back → in from the
   * left) and degrades to an instant switch under reduced motion / SSR /
   * browsers without the View Transitions API.
   */
  const goToStep = useCallback(
    (target: QuickCreateStep, update: () => void) => {
      runQuickCreateStepTransition({
        direction: quickCreateStepDirection(step, target),
        panel: stepPanelRef.current,
        update,
      });
    },
    [step],
  );

  const pickSource = useCallback(
    (key: string) => {
      const d = getAgentSourceDescriptor(key);
      goToStep(
        quickCreateStepForState({ path, membershipAccess, sourceKey: key }),
        () => {
          setSourceKey(key);
          setError(null);
          setShowEndpointFields(false);
          if (!d) return;
          setModel(d.form.model ?? "");
          setBaseUrl(d.form.customProviderUrl ?? "");
          if (!d.requiresApiKey) setApiKey("");
        },
      );
    },
    [membershipAccess, path, goToStep],
  );

  const choosePath = useCallback(
    (next: LocalCreatePath) => {
      goToStep(
        quickCreateStepForState({
          path: next,
          membershipAccess: null,
          sourceKey: null,
        }),
        () => {
          setPath(next);
          setMembershipAccess(null);
          setSourceKey(null);
          setApiKey("");
          setError(null);
          setShowEndpointFields(false);
        },
      );
      localFirstLog("quickCreate.path", { path: next });
    },
    [goToStep],
  );

  const chooseMembershipAccess = useCallback(
    (access: MembershipAccess) => {
      goToStep(
        quickCreateStepForState({
          path,
          membershipAccess: access,
          sourceKey: null,
        }),
        () => {
          setMembershipAccess(access);
          setSourceKey(null);
          setApiKey("");
          setError(null);
          setShowEndpointFields(false);
        },
      );
      localFirstLog("quickCreate.membershipAccess", { access });
    },
    [path, goToStep],
  );

  const goBack = useCallback(() => {
    // 创建成功后的面板：返回只是收起它，回到表单，不改变 wizard 步骤。
    if (createdAgent) {
      setCreatedAgent(null);
      setSyncError(null);
      setSyncSuccess(null);
      setError(null);
      return;
    }
    // Boundary: the first step has nothing behind it, so nothing moves.
    const target = quickCreateBackTarget(step, path);
    if (!target) return;

    goToStep(target, () => {
      setError(null);
      if (step === "form") {
        setSourceKey(null);
        return;
      }
      if (step === "source") {
        if (path === "membership") {
          setMembershipAccess(null);
        } else {
          setPath(null);
        }
        return;
      }
      if (step === "membership") {
        setPath(null);
      }
    });
  }, [createdAgent, goToStep, step, path]);

  const displayName = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed) return trimmed;
    if (!selected) return t("localFirst.quickCreate.defaultLaterName", "我的本地助手");
    if (selected.accessVariant === "local_runtime")
      return t("localFirst.quickCreate.defaultOllamaName", "本机 Ollama");
    if (selected.accessVariant === "configure_later")
      return t("localFirst.quickCreate.defaultLaterName", "我的本地助手");
    return t("localFirst.quickCreate.defaultNamed", {
      label: selected.label,
      defaultValue: `我的${selected.label}`,
    });
  }, [name, selected, t]);

  const needsApiKey = Boolean(selected?.requiresApiKey);
  const isOAuth = selected?.accessVariant === "oauth";
  const isCli = selected?.accessVariant === "cli_session";
  const isOllama = selected?.accessVariant === "local_runtime";
  const isLater = selected?.accessVariant === "configure_later";

  const onSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (busy || !sourceKey || !selected) return;
      setBusy(true);
      setError(null);

      localFirstLog("quickCreate.submit", {
        path: path || "",
        sourceKey,
        owner: ownerUserId,
        hasApiKey: Boolean(apiKey.trim()),
        // never log apiKey contents
      });
      try {
        if (needsApiKey && !apiKey.trim()) {
          setError(t("localFirst.quickCreate.apiKeyRequired", "请粘贴 API Key。"));
          setBusy(false);
          return;
        }
        const formData = projectAgentSourceFormData({
          sourceKey,
          name: displayName,
          apiKey: needsApiKey ? apiKey : null,
          model,
          customProviderUrl: baseUrl,
        });
        // 创建永远落在本机（owner="local"）；云同步是创建之后显式触发的独立动作。
        const agent = await dispatch(
          createAgent({
            userId: ownerUserId,
            formData,
            spaceId: undefined,
          }) as any,
        ).unwrap();
        setApiKey("");
        const agentDbKey = resolveAgentDbKey(agent as any, ownerUserId);
        if (!agentDbKey) {
          throw new Error(
            t(
              "localFirst.quickCreate.missingAgentId",
              "创建成功但缺少 Agent 标识，无法打开对话。",
            ),
          );
        }
        localFirstLog("quickCreate.done", {
          owner: ownerUserId,
          key: agentDbKey,
          sourceKey,
        });
        // 本地 Agent 真实创建成功：持久化 onboarding 完成标记，避免回首页时引导反复弹出。
        if (getIsDesktopApp() && typeof window !== "undefined") {
          writeLocalFirstOnboardingDismissed(window.localStorage, true);
        }
        // Web create path: flash agent row in sidebar (dialog marked in useCreateDialog).
        markRecentlyCreated(agentDbKey);
        // 不在这里自动建对话/跳转：先展示创建成功面板与显式云同步入口。
        setCreatedAgent({ dbKey: agentDbKey, name: displayName });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("localFirst.quickCreate.failed", "创建失败，请重试");
        setError(message);
        localFirstLog("quickCreate.error", { message: message.slice(0, 120) });
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      sourceKey,
      selected,
      path,
      ownerUserId,
      apiKey,
      needsApiKey,
      displayName,
      model,
      baseUrl,
      dispatch,
      t,
    ],
  );

  /**
   * 显式云同步：直接复用生产适配器（内部调用 syncStandaloneAgentToAccount，
   * 走 durable mapping + 默认 job registry，不重写上传逻辑）。
   * 失败语义按契约处理：抛错即如实展示，不谎报成功。
   */
  const onSyncNow = useCallback(async () => {
    if (!createdAgent || !hasAccount || !accountUserId || syncing) return;
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    localFirstLog("quickCreate.sync.start", { key: createdAgent.dbKey });
    try {
      const result = await runSyncStandaloneAgentToAccount(
        {
          accountUserId,
          localAgentKey: createdAgent.dbKey,
        },
        dispatch as {
          (action: unknown): { unwrap: () => Promise<unknown> };
        },
      );
      localFirstLog("quickCreate.sync.done", {
        key: createdAgent.dbKey,
        remoteDbKey: result.remoteDbKey,
        reused: result.reused,
      });
      setSyncSuccess(
        result.reused
          ? t(
              "localFirst.quickCreate.syncReused",
              "已同步到云端（快照）：已存在云端副本，本次未重复创建。",
            )
          : t("localFirst.quickCreate.syncSuccess", "已同步到云端（快照）。"),
      );
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("localFirst.quickCreate.syncFailed", "同步失败，请稍后重试。");
      setSyncError(message);
      localFirstLog("quickCreate.sync.error", { message: message.slice(0, 120) });
    } finally {
      setSyncing(false);
    }
  }, [createdAgent, hasAccount, accountUserId, syncing, dispatch, t]);

  const onStartChat = useCallback(async () => {
    if (!createdAgent || startingChat) return;
    setStartingChat(true);
    setError(null);
    try {
      await createNewDialog({ agents: [createdAgent.dbKey] });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("localFirst.quickCreate.failed", "创建失败，请重试");
      setError(message);
    } finally {
      setStartingChat(false);
    }
  }, [createdAgent, startingChat, createNewDialog, t]);

  return (
    <div className="local-quick-create" data-testid="local-quick-create">
      <div
        className="local-quick-create__card"
        data-quick-create-step-panel
        ref={stepPanelRef}
      >
        <header className="local-quick-create__header">
          {step !== "path" ? (
            <button
              type="button"
              className="local-quick-create__back"
              onClick={goBack}
              data-testid="local-quick-create-back"
            >
              <LuArrowLeft size={16} aria-hidden />
              {t("localFirst.quickCreate.back", "返回")}
            </button>
          ) : null}
          <h1 className="local-quick-create__title">
            {createdAgent
              ? t("localFirst.quickCreate.titleCreated", "已创建")
              : step === "path"
                ? t("localFirst.quickCreate.titlePath", "怎么开始？")
                : step === "membership"
                  ? t(
                      "localFirst.quickCreate.titleMembership",
                      "你的会员怎么连进来？",
                    )
                  : step === "source"
                    ? path === "byo"
                      ? t(
                          "localFirst.quickCreate.titleSourceByo",
                          "填 Key 或本地地址",
                        )
                      : t("localFirst.quickCreate.titleSource", "用哪一家？")
                    : t("localFirst.quickCreate.titleForm", "差不多好了")}
          </h1>
          {step === "path" ? (
            <p className="local-quick-create__desc">
              {t(
                "localFirst.quickCreate.descPath",
                "选最接近你的一项，我们一步步带你建好助手。",
              )}
            </p>
          ) : null}
          {step === "membership" ? (
            <p className="local-quick-create__desc">
              {t(
                "localFirst.quickCreate.descMembership",
                "不用懂技术名，按你平时怎么用那个会员来选。",
              )}
            </p>
          ) : null}
          {step === "source" ? (
            <p className="local-quick-create__desc">
              {path === "byo"
                ? t(
                    "localFirst.quickCreate.descSourceByo",
                    "选 API Key 模板，或本机 Ollama / LM Studio，后面还能改。",
                  )
                : t(
                    "localFirst.quickCreate.descSource",
                    "点一下就能继续，后面还能改。",
                  )}
            </p>
          ) : null}
          {createdAgent ? (
            <p className="local-quick-create__desc">
              {t(
                "localFirst.quickCreate.descCreated",
                "助手已建好，可以开始聊天；需要的话再手动同步到云端。",
              )}
            </p>
          ) : null}
        </header>

        {/* ── Step: path ── */}
        {step === "path" ? (
          <div
            className="local-quick-create__intent-list"
            data-testid="local-quick-create-path"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="local-quick-create__intent"
              data-testid="local-quick-create-path-byo"
              onClick={() => choosePath("byo")}
            >
              <span className="local-quick-create__intent-num">1</span>
              <span className="local-quick-create__intent-body">
                <span className="local-quick-create__intent-title">
                  {t(
                    "localFirst.quickCreate.path.byo",
                    "我有 API Key / 本地模型",
                  )}
                </span>
                <span className="local-quick-create__intent-hint">
                  {t(
                    "localFirst.quickCreate.path.byoHint",
                    "OpenAI Key、Ollama、LM Studio、兼容端点",
                  )}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="local-quick-create__intent"
              data-testid="local-quick-create-path-membership"
              onClick={() => choosePath("membership")}
            >
              <span className="local-quick-create__intent-num">2</span>
              <span className="local-quick-create__intent-body">
                <span className="local-quick-create__intent-title">
                  {t(
                    "localFirst.quickCreate.path.membership",
                    "我在用某家 AI 会员/订阅",
                  )}
                </span>
                <span className="local-quick-create__intent-hint">
                  {t(
                    "localFirst.quickCreate.path.membershipHint",
                    "Claude、ChatGPT、Grok、Token Plan…",
                  )}
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {/* ── Step: membership access ── */}
        {step === "membership" ? (
          <div
            className="local-quick-create__intent-list"
            data-testid="local-quick-create-membership-access"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="local-quick-create__intent"
              data-testid="local-quick-create-membership-cli"
              onClick={() => chooseMembershipAccess("cli")}
            >
              <span className="local-quick-create__intent-num">1</span>
              <span className="local-quick-create__intent-body">
                <span className="local-quick-create__intent-title">
                  {t(
                    "localFirst.quickCreate.membership.cli",
                    "本机终端 / CLI 已经登录",
                  )}
                </span>
                <span className="local-quick-create__intent-hint">
                  {t(
                    "localFirst.quickCreate.membership.cliHint",
                    "Claude Code、Codex、Grok CLI 等",
                  )}
                </span>
              </span>
            </button>
            {/* OAuth descriptors/runtime contracts remain available for the later
                provider-specific authorization slice. Do not expose this path until
                selecting it can actually complete authorization on this device. */}
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="local-quick-create__intent"
              data-testid="local-quick-create-membership-api-key"
              onClick={() => chooseMembershipAccess("api_key")}
            >
              <span className="local-quick-create__intent-num">2</span>
              <span className="local-quick-create__intent-body">
                <span className="local-quick-create__intent-title">
                  {t(
                    "localFirst.quickCreate.membership.apiKey",
                    "会员发了 Key 和接口地址",
                  )}
                </span>
                <span className="local-quick-create__intent-hint">
                  {t(
                    "localFirst.quickCreate.membership.apiKeyHint",
                    "例如 Token Plan 这类套餐",
                  )}
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {/* ── Step: pick concrete provider ── */}
        {step === "source" ? (
          <div
            className="local-quick-create__presets"
            role="listbox"
            data-testid="local-quick-create-source-list"
          >
            {membershipAccess === "cli" && cliScanBusy ? (
              <p
                className="local-quick-create__scan-hint"
                data-testid="local-quick-create-cli-scan"
              >
                {t(
                  "localFirst.quickCreate.cliScanning",
                  "正在检测本机已安装的 CLI…",
                )}
              </p>
            ) : null}
            {candidates.length === 0 ? (
              <p className="local-quick-create__defaults-hint">
                {t("localFirst.quickCreate.emptySources", "暂无可用选项")}
              </p>
            ) : (
              candidates.map((d) => {
                const Icon = iconForDescriptor(d);
                const detected = Boolean(
                  d.form.cliProvider &&
                    installedCliSet.has(d.form.cliProvider),
                );
                return (
                  <button
                    key={d.sourceKey}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={
                      detected
                        ? "local-quick-create__preset is-detected"
                        : "local-quick-create__preset"
                    }
                    onClick={() => pickSource(d.sourceKey)}
                    data-testid={`local-quick-create-source-${d.sourceKey}`}
                    data-source-key={d.sourceKey}
                    data-cli-detected={detected ? "true" : undefined}
                  >
                    <Icon size={16} aria-hidden />
                    <span className="local-quick-create__preset-label">
                      {d.label}
                      {detected ? (
                        <span className="local-quick-create__preset-badge">
                          {t(
                            "localFirst.quickCreate.cliDetected",
                            "已检测到",
                          )}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        {/* ── Step: form ── */}
        {step === "form" && selected && !createdAgent ? (
          <form className="local-quick-create__form" onSubmit={onSubmit}>
            <label className="local-quick-create__field">
              <span className="local-quick-create__label">
                {t("localFirst.quickCreate.nameLabel", "给助手起个名字（可跳过）")}
              </span>
              <input
                className="local-quick-create__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={displayName}
                maxLength={50}
                autoFocus
                data-testid="local-quick-create-name"
              />
            </label>

            <p className="local-quick-create__chosen" data-testid="local-quick-create-chosen">
              {selected.label}
            </p>

            {isOAuth && selected.oauthAuthCommand ? (
              <p
                className="local-quick-create__defaults-hint"
                data-testid="local-quick-create-oauth-hint"
              >
                {selected.oauthAuthCommand}
              </p>
            ) : null}

            {isCli ? (
              <p
                className="local-quick-create__defaults-hint"
                data-testid="local-quick-create-cli-hint"
              >
                {selected.cliBinaryHint || selected.label}
              </p>
            ) : null}

            {needsApiKey ? (
              <label className="local-quick-create__field">
                <span className="local-quick-create__label">API Key</span>
                <input
                  className="local-quick-create__input"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  data-testid="local-quick-create-api-key"
                />
              </label>
            ) : null}

            {needsApiKey || (isOllama && showEndpointFields) ? (
              <>
                <label className="local-quick-create__field">
                  <span className="local-quick-create__label">
                    {t("localFirst.quickCreate.modelLabel", "模型")}
                  </span>
                  <input
                    className="local-quick-create__input"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    data-testid="local-quick-create-model"
                  />
                </label>
                <label className="local-quick-create__field">
                  <span className="local-quick-create__label">
                    {t("localFirst.quickCreate.endpointLabel", "接口地址")}
                  </span>
                  <input
                    className="local-quick-create__input"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    data-testid="local-quick-create-endpoint"
                  />
                </label>
              </>
            ) : null}

            {isOllama && !showEndpointFields ? (
              <button
                type="button"
                className="local-quick-create__advanced"
                onClick={() => setShowEndpointFields(true)}
              >
                {t("localFirst.quickCreate.changeDefaults", "改地址/模型")}
              </button>
            ) : null}

            {isLater ? (
              <p className="local-quick-create__defaults-hint">
                {t("localFirst.quickCreate.laterHint", "之后再接模型")}
              </p>
            ) : null}

            {error ? (
              <p className="local-quick-create__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="local-quick-create__actions">
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={busy}
                icon={<LuArrowRight size={18} />}
                data-testid="local-quick-create-submit"
              >
                {busy
                  ? t("localFirst.quickCreate.creating", "创建中…")
                  : t("localFirst.quickCreate.submit", "创建，开始聊天")}
              </Button>
            </div>
          </form>
        ) : null}

        {/* ── 创建成功面板：显式云同步状态 + 手动触发 ── */}
        {createdAgent ? (
          <div
            className="local-quick-create__created"
            data-testid="local-quick-create-created"
          >
            <p
              className="local-quick-create__chosen"
              data-testid="local-quick-create-created-name"
            >
              {createdAgent.name}
            </p>

            <div className="local-quick-create__sync-row">
              <span className="local-quick-create__sync-text">
                <span
                  className="local-quick-create__sync-title"
                  data-testid="local-quick-create-sync-status"
                >
                  {syncedToCloud
                    ? t(
                        "localFirst.quickCreate.syncStatusSynced",
                        "已同步到云端（快照）",
                      )
                    : t(
                        "localFirst.quickCreate.syncStatusLocal",
                        "未同步到云端",
                      )}
                </span>
                <span
                  className="local-quick-create__sync-note"
                  data-testid="local-quick-create-sync-note"
                >
                  {t(
                    "localFirst.quickCreate.syncNote",
                    "同步会创建一份云端副本；本机记录保持不变；之后不会自动持续同步。",
                  )}
                </span>
              </span>
              {syncedToCloud ? <LuCheck size={18} aria-hidden /> : null}
            </div>

            {!hasAccount ? (
              <p
                className="local-quick-create__sync-warning"
                data-testid="local-quick-create-sync-login-hint"
              >
                {t(
                  "localFirst.quickCreate.syncRequiresLogin",
                  "需登录 Nolo 账号才能同步到云端",
                )}
              </p>
            ) : null}

            {syncSuccess ? (
              <p
                className="local-quick-create__sync-success"
                data-testid="local-quick-create-sync-success"
              >
                {syncSuccess}
              </p>
            ) : null}

            {syncError ? (
              <p
                className="local-quick-create__error"
                data-testid="local-quick-create-sync-error"
                role="alert"
              >
                {syncError}
              </p>
            ) : null}

            <div className="local-quick-create__actions">
              <Button
                type="button"
                variant="primary"
                size="large"
                block
                onClick={onStartChat}
                disabled={startingChat}
                icon={<LuArrowRight size={18} />}
                data-testid="local-quick-create-start-chat"
              >
                {t("localFirst.quickCreate.startChat", "开始聊天")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="large"
                block
                onClick={onSyncNow}
                disabled={!hasAccount || syncing}
                icon={<LuCloudUpload size={18} />}
                data-testid="local-quick-create-sync-now"
              >
                {syncing
                  ? t("localFirst.quickCreate.syncing", "同步中…")
                  : t("localFirst.quickCreate.syncNow", "立即同步到云端")}
              </Button>
            </div>
          </div>
        ) : null}

        {step === "path" ? (
          <button
            type="button"
            className="local-quick-create__advanced"
            onClick={() => navigate("/create/agent")}
            data-testid="local-quick-create-advanced"
          >
            {t("localFirst.quickCreate.advanced", "我更想自己填完整配置")}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default LocalQuickCreateAgent;
