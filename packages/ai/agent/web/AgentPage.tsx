// ai/agent/web/AgentPage.tsx

import "./AgentPage.css";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useLocation, useParams } from "app/routing";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { selectById } from "database/dbSlice";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { useToken, useUserId, useIsLoggedIn } from "identity";
import { useCouldEdit } from "identity";
import { useHasMounted } from "app/hooks/useHasMounted";
import { useModal } from "render/ui/Modal";
import { Agent } from "app/types";
import { createUserKey } from "database/keys";
import { DataType } from "create/types";
import { useUserData } from "database/hooks/useUserData";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { deleteDialog } from "chat/dialog/dialogSlice";
import { getPublicProviderLabel } from "ai/llm/providerDisplay";
import { asOptionalTrimmedString } from "core/optionalString";
import { sanitizeOptionalModelString } from "core/sanitizeModelString";
import {
  asNonEmptyStringArray,
  asTrimmedNonEmptyStringArray,
} from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";

// 新增：对话 + 收藏
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import AgentFavoriteButton from "app/favorite/AgentFavoriteButton";
import { updateAgent } from "ai/agent/agentSlice";
import { toast } from "app/utils/toast";
import AgentPublishDialog, {
  type AgentPublishSettings,
} from "./AgentPublishDialog";
import AgentMemoryTab from "./AgentMemoryTab";
import AgentGrantPanel from "./AgentGrantPanel";
import { OAuthStatusBox } from "./OAuthStatusBox";
import { resolveAgentEditIdentity } from "../hooks/useAgentFormValidation";

// UI Components & Icons
import Button from "render/web/ui/Button";
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
} from "render/web/ui/Tabs";
import PageLoading from "render/web/ui/PageLoading";
import Avatar from "render/web/ui/Avatar";
import { Dialog } from "render/web/ui/modal/Dialog";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import AgentForm from "ai/agent/web/AgentForm";
import {
  LuMessageSquare,
  LuPencil,
  LuCalendarDays,
  LuCpu,
  LuCoins,
  LuImage,
  LuUser,
  LuTerminal,
  LuLaptop,
  LuBookOpen,
  LuShieldCheck,
  LuWrench,
  LuActivity,
  LuMail,
  LuInbox,
  LuTrash2,
  LuGlobe,
  LuLock,
  LuBrain,
  LuCopy,
} from "react-icons/lu";
import { formatPriceAmount } from "ai/llm/getPricing";
import {
  buildAgentDialogHistory,
  buildAgentEmailBindingSummary,
  buildAgentThreadOverview,
  buildAgentThreadOverviewFromApi,
  formatAgentOutputPrice,
  formatAgentEmailReadinessLabel,
  formatCliProviderLabel,
  formatDateValue,
  formatRuntimeLocationLabel,
  resolveAgentCreatorSummary,
  toNonEmptyString,
  toTimestamp,
  type AgentDialogHistoryEntry,
  type AgentEmailBindingSummary,
  type ClientAgentThreadsResponse,
  type AgentThreadOverviewEntry,
} from "./agentDisplayUtils";
import { resolveAgentBadgeMeta } from "./agentBadges";
import { runtimePolicyAllowsHostedExec } from "../createAgentSchema";
import { resolveDialogLaunchSpaceId } from "chat/dialog/dialogLaunchScope";
import { viewTransitionStyle } from "app/viewTransitions";
import { getAgentCardVTNames } from "app/viewTransitionCoordinator";
import { resolveAgentNavPreview } from "./agentNavigationPreview";
import AgentAvatar from "./AgentAvatar";

const AgentForkDialogLazy = lazy(() => import("./AgentForkDialog"));

// --- 辅助组件定义 ---

const PageStateIndicator = ({
  isLoading,
  error,
  t,
}: {
  isLoading: boolean;
  error: any;
  t: any;
}) => (
  <div className="agent-page__container agent-page__state-indicator">
    {isLoading ? (
      <PageLoading fullHeight={false} />
    ) : (
      <>
        <h2>{t("loadError")}</h2>
        <p>{error?.message}</p>
      </>
    )}
  </div>
);

// --- 主组件 ---

interface AgentPageProps {
  agentKey: string;
}

interface AgentPageDetail {
  icon: React.ReactNode;
  key: string;
  label: string;
  value: React.ReactNode;
  ariaLabel?: string;
}

type AgentPageActivityTab = "conversations" | "automations";

interface ClientAgentAutomation {
  automationId: string;
  automationKey: string;
  title: string;
  ownerAgentKey: string;
  status: "active" | "paused" | "cancelled" | "completed";
  runStatus?: "idle" | "running" | "done" | "failed";
  summary?: {
    nextWakeAt?: number;
    lastRunAt?: number;
    runStatus: "idle" | "running" | "done" | "failed" | "never";
    lastErrorMessage?: string;
  };
  trigger: {
    type: "cron";
    expression: string;
    timezone?: string;
    nextWakeAt: number;
  };
  spaceId?: string;
  updatedAt: string;
  lastRunAt?: number;
  lastRunError?: string;
}

interface ClientAgentAutomationsResponse {
  ok: boolean;
  data: {
    automations: ClientAgentAutomation[];
  };
}

const toStringList = (value: unknown): string[] =>
  asTrimmedNonEmptyStringArray(value);

const INTERNAL_IMAGE_TOOL_NAMES = new Set([
  "geminiFlashLiteImage",
  "geminiFlashImage",
  "geminiProImagePreview",
  "openAIGptImage",
  "openAIGptImageGenerate",
  "openAIGptImageEdit",
]);

const buildAbilityProof = (item: Agent | null | undefined) => {
  if (!item) {
    return {
      scenarios: [],
      examples: [],
      referenceLabels: [],
      toolLabels: [],
      imageModelLabels: [] as string[],
      publicReadiness: null as Record<string, any> | null,
      evalReadiness: null as Record<string, any> | null,
      hostedExecAllowed: false,
    };
  }

  const scenarios = toStringList((item as any).scenarios);
  const examples = [
    ...toStringList((item as any).examplePrompts),
    ...toStringList((item as any).sampleInputs),
  ];
  const referenceLabels = Array.isArray(item.references)
    ? asNonEmptyStringArray(
        item.references.map((reference) => reference.title || reference.dbKey),
      )
    : [];
  const toolLabels = asNonEmptyStringArray(item.tools).filter(
    (tool) => !INTERNAL_IMAGE_TOOL_NAMES.has(tool),
  );
  const imageModel = asOptionalTrimmedString((item as any).imageModel);
  const imageModelLabels = imageModel ? [imageModel] : [];
  const publicReadiness =
    (item as any).publicReadiness &&
    typeof (item as any).publicReadiness === "object"
      ? ((item as any).publicReadiness as Record<string, any>)
      : null;
  const evalReadiness =
    (item as any).evalReadiness &&
    typeof (item as any).evalReadiness === "object"
      ? ((item as any).evalReadiness as Record<string, any>)
      : (item as any).evalSummary &&
          typeof (item as any).evalSummary === "object"
        ? ((item as any).evalSummary as Record<string, any>)
        : (item as any).evalStatus &&
            typeof (item as any).evalStatus === "object"
          ? ((item as any).evalStatus as Record<string, any>)
          : null;

  return {
    scenarios,
    examples,
    referenceLabels,
    imageModelLabels,
    toolLabels,
    publicReadiness,
    evalReadiness,
    hostedExecAllowed: runtimePolicyAllowsHostedExec(
      (item as any).runtimeToolPolicy,
    ),
  };
};

// 只在有内容时渲染；空数据直接不占位，避免整栏“暂未配置”噪音。
const AbilityChipGroup = ({
  title,
  items,
  max = 8,
}: {
  title: string;
  items: string[];
  max?: number;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="agent-page__chip-group">
      <span className="agent-page__chip-group-label">{title}</span>
      <div className="agent-page__chip-row">
        {items.slice(0, max).map((item, index) => (
          <span
            key={`${title}-${index}`}
            className="agent-page__chip"
            title={item}
          >
            {item}
          </span>
        ))}
        {items.length > max ? (
          <span className="agent-page__chip agent-page__chip--more">
            +{items.length - max}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const formatWorkspaceLeaseSourceLabel = (source?: string) => {
  if (source === "web-hosted") return "托管临时工作区";
  if (source === "machine-connector") return "绑定机器执行";
  if (source) return source;
  return "暂无可审计执行工作区";
};

const buildRuntimeEvidenceRows = (entry?: AgentThreadOverviewEntry | null) => {
  const evidence = entry?.runtimeEvidence;
  if (!entry || !evidence) {
    return {
      summary: "暂无可审计执行工作区。",
      rows: [] as Array<{ label: string; value: string }>,
      hasExecShell: false,
    };
  }

  const lastToolNames = evidence.lastToolNames ?? [];
  const hasExecShell = lastToolNames.includes("execShell");
  const workspaceLabel = formatWorkspaceLeaseSourceLabel(
    evidence.workspaceLease?.source,
  );
  const rows = [
    { label: "状态", value: evidence.status || entry.status || "未知" },
    { label: "执行位置", value: workspaceLabel },
    {
      label: "工具",
      value:
        lastToolNames.length > 0
          ? lastToolNames.slice(0, 4).join(", ")
          : "暂无工具记录",
    },
    {
      label: "工具调用",
      value:
        typeof evidence.toolCallCount === "number"
          ? `${evidence.toolCallCount} 次`
          : "暂无次数记录",
    },
    {
      label: "证据类型",
      value: evidence.workspaceLease?.artifactKind || "暂无 workspace artifact",
    },
    {
      label: "策略快照",
      value: evidence.hasRuntimeToolPolicySnapshot ? "已记录" : "未记录",
    },
    {
      label: "最近运行",
      value: formatDateValue(entry.updatedAt, "yyyy-MM-dd HH:mm"),
    },
  ];

  return {
    summary: hasExecShell ? "使用了脚本/命令执行。" : "未记录脚本/命令执行。",
    rows,
    hasExecShell,
  };
};

const RuntimeEvidenceSummary = ({
  entry,
}: {
  entry?: AgentThreadOverviewEntry | null;
}) => {
  const evidenceView = buildRuntimeEvidenceRows(entry);
  return (
    <div className="agent-page__runtime-evidence">
      <div className="agent-page__runtime-evidence-title">
        <LuActivity size={14} aria-hidden="true" />
        <span>运行证据</span>
      </div>
      <p className="agent-page__runtime-evidence-summary">
        {evidenceView.summary} Alpha 执行证据，不代表完整生产沙箱。
      </p>
      {evidenceView.rows.length > 0 ? (
        <div className="agent-page__runtime-evidence-grid">
          {evidenceView.rows.map((row) => (
            <div key={row.label} className="agent-page__runtime-evidence-row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {entry?.dbKey ? (
        <Link
          to={buildDialogUrl(entry.dbKey, entry.spaceId)}
          className="agent-page__runtime-evidence-link"
        >
          查看完整对话证据
        </Link>
      ) : null}
    </div>
  );
};

const formatAgentThreadListMeta = (dialog: AgentThreadOverviewEntry) => {
  const statusLabel = dialog.status ?? dialog.threadKind ?? "";
  const spaceSuffix = dialog.spaceName ? ` · ${dialog.spaceName}` : "";
  const timeSuffix = dialog.updatedAt
    ? ` · ${formatDateValue(dialog.updatedAt, "yyyy-MM-dd HH:mm")}`
    : "";
  return `${statusLabel}${spaceSuffix}${timeSuffix}`.trim();
};

const AgentActivityThreadSection = ({
  title,
  items,
  onDelete,
}: {
  title: string;
  items: AgentThreadOverviewEntry[];
  onDelete?: (e: React.MouseEvent, dialogKey: string) => void;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="agent-page__activity-section">
      <h3 className="agent-page__activity-section-title">{title}</h3>
      <div className="agent-page__thread-list">
        {items.map((dialog) => (
          <Link
            key={dialog.dbKey}
            to={buildDialogUrl(dialog.dbKey, dialog.spaceId)}
            className="agent-page__thread-item"
          >
            <span className="agent-page__thread-title">{dialog.title}</span>
            <span className="agent-page__thread-meta">
              {formatAgentThreadListMeta(dialog)}
            </span>
            {onDelete && (
              <button
                type="button"
                className="agent-page__history-delete-btn"
                onClick={(e) => onDelete(e, dialog.dbKey)}
                title="删除对话"
                aria-label="删除对话"
              >
                <LuTrash2 size={14} aria-hidden="true" />
              </button>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

const AgentEmailBindingSection = ({
  agentKey,
  summary,
}: {
  agentKey: string;
  summary: AgentEmailBindingSummary;
}) => {
  const hasBinding = summary.identities.length > 0;

  if (!hasBinding) {
    return null;
  }

  return (
    <section className="agent-page__section agent-page__section--email-binding">
      <div className="agent-page__email-binding">
        <div className="agent-page__email-binding-heading">
          <LuMail size={15} aria-hidden="true" />
          <span>邮箱绑定</span>
          <Link
            to={`/${agentKey}/inbox`}
            className="agent-page__email-binding-inbox-link"
          >
            <LuInbox size={14} aria-hidden="true" />
            <span>查看收件箱</span>
          </Link>
        </div>
        <>
          <p className="agent-page__email-binding-intro">
            受控域名邮箱，用于以该 Agent 身份收发邮件与接收验证信。
            {getPublicProviderLabel(summary.provider)
              ? ` · ${getPublicProviderLabel(summary.provider)}`
              : ""}
          </p>
          <ul className="agent-page__email-binding-list">
            {summary.identities.map((identity) => {
              const readiness = formatAgentEmailReadinessLabel(
                identity.readinessStatus,
              );
              const metaParts = [
                identity.isPrimary ? "主邮箱" : null,
                identity.purpose || null,
                readiness || null,
              ].filter(Boolean);
              return (
                <li
                  key={identity.emailAddress}
                  className="agent-page__email-binding-item"
                >
                  <span className="agent-page__email-binding-address">
                    {identity.emailAddress}
                  </span>
                  {metaParts.length > 0 ? (
                    <span className="agent-page__email-binding-meta">
                      {metaParts.join(" · ")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      </div>
    </section>
  );
};

const AgentPage = ({ agentKey }: AgentPageProps) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const location = useLocation();

  const [deleteDialogKey, setDeleteDialogKey] = useState<string | null>(null);
  const [isDeletingDialog, setIsDeletingDialog] = useState(false);

  const [activityRefreshCounter, setActivityRefreshCounter] = useState(0);
  const [deletedDialogKeys, setDeletedDialogKeys] = useState<Set<string>>(
    new Set(),
  );
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalPage, setManageModalPage] = useState(0);
  const manageModalPageSize = 20;

  const handleRequestDeleteDialog = (
    e: React.MouseEvent,
    dialogKey: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsManageModalOpen(false);
    setDeleteDialogKey(dialogKey);
  };

  const handleConfirmDeleteDialog = async () => {
    if (!deleteDialogKey) return;
    setIsDeletingDialog(true);
    try {
      await dispatch(deleteDialog(deleteDialogKey)).unwrap();
      setDeletedDialogKeys((prev) => new Set([...prev, deleteDialogKey]));
      setActivityRefreshCounter((c) => c + 1);
      setManageModalPage(0);
    } catch (err) {
      console.error("Failed to delete dialog:", err);
    } finally {
      setIsDeletingDialog(false);
      setDeleteDialogKey(null);
    }
  };

  const { spaceId: routeSpaceId } = useParams() as Record<
    string,
    string | undefined
  >;
  const server = useAppSelector(selectCurrentServer);
  const currentToken = useToken();
  const currentUserId = useUserId() ?? "";
  const memberSpaces = useAllMemberSpaces();

  // 优先使用 store 内实体，保证 patch 后页面即时响应
  const storePrimaryItem = useAppSelector(
    (state) => selectById(state, agentKey) as Agent | undefined,
  );

  // Card → page handoff: plaza summary lists often skip Redux seeding.
  // Use location.state preview so the first paint already has avatar/title
  // with matching view-transition names (zoom morph instead of skeleton).
  const navPreview = useMemo(
    () => resolveAgentNavPreview(location.state, agentKey),
    [agentKey, location.state],
  );

  const res = useFetchData<Agent>(storePrimaryItem ? null : agentKey);

  const item =
    storePrimaryItem ||
    res.data ||
    navPreview;
  const badgeMeta = resolveAgentBadgeMeta(item);
  const priceHint = badgeMeta.priceHint;
  const isCliAgent = badgeMeta.isCliAgent;
  const shouldShowTokenCost = badgeMeta.shouldShowTokenCost;
  const isPageLocalCustomRuntime = badgeMeta.isPageLocalCustomRuntime;
  const creatorProfileKey = item?.userId
    ? createUserKey.profile(item?.userId)
    : null;
  const { data: creatorProfile } = useFetchData<any>(creatorProfileKey);
  const error = !item && res.error ? res.error : null;
  const currentKey = agentKey;
  const pageTitle = item?.name?.trim()
    ? `${item.name.trim()} | Nolo.Chat`
    : "Nolo.Chat";
  const agentAuthorityServer =
    item?.authorityServer || item?.originServer || server;

  const {
    visible: isEditVisible,
    open: openEdit,
    close: closeEdit,
  } = useModal();

  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isUpdatingPublishStatus, setIsUpdatingPublishStatus] = useState(false);
  const handleSavePublishSettings = async (settings: AgentPublishSettings) => {
    if (!item || isUpdatingPublishStatus) return;
    setIsUpdatingPublishStatus(true);
    try {
      const effectiveUserId = currentUserId || "local";
      // 复用与 AgentForm 一致的 id 解析逻辑，避免在这里手写 `agent-` 前缀剥离，
      // 否则与 agentSlice.updateAgent 内部的 normalize 规则必须永远保持同步。
      const { agentId: resolvedAgentId } = resolveAgentEditIdentity({
        id: item.id,
      });
      if (!resolvedAgentId) {
        throw new Error("Cannot resolve agent ID");
      }

      await dispatch(
        updateAgent({
          userId: effectiveUserId,
          agentId: resolvedAgentId,
          formData: settings,
          previousAgent: item as any,
        }),
      ).unwrap();

      toast.success("发布配置保存并更新成功");
      setIsPublishModalOpen(false);

      fetch(`${server}/api/version/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "agent",
          entityId: resolvedAgentId,
          snapshot: {
            ...item,
            ...settings,
          },
        }),
      }).catch((err) => {
        // store 已完成私有/公共副本更新；version/save 是补充的快照存档，
        // 失败不应回滚主流程，但需要留痕以便排查丢失的快照。
        console.error("Failed to archive agent snapshot to version/save:", err);
      });
    } catch (err) {
      console.error("Failed to save publish settings:", err);
      toast.error("更新发布配置失败，请稍后重试");
    } finally {
      setIsUpdatingPublishStatus(false);
    }
  };

  // Keep VT names for the whole mount so browser Back can reverse-morph.
  const vtNames = getAgentCardVTNames(currentKey);
  const headerSurfaceVt = viewTransitionStyle(vtNames.surface);
  const headerIconVt = viewTransitionStyle(vtNames.icon);
  const headerTitleVt = viewTransitionStyle(vtNames.title);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = pageTitle;
  }, [pageTitle]);

  // ---------- 对话逻辑（使用 useAgentDialog） ----------
  const dialogSpaceId = resolveDialogLaunchSpaceId({
    routeSpaceId,
  });
  const { isStarting: isDialogLoading, startDialog } = useAgentDialog(
    currentKey,
    {
      spaceId: dialogSpaceId,
      preferredServerOrigin: agentAuthorityServer,
    },
  );
  const historyAgentKeys = useMemo(
    () => new Set(asNonEmptyStringArray([agentKey, currentKey])),
    [agentKey, currentKey],
  );
  const { data: dialogHistoryRecords, loading: isHistoryLoading } = useUserData(
    DataType.DIALOG,
    currentUserId,
    1000,
    { partialDataStrategy: "hydrated-cache" },
  );
  const [agentThreadIndexData, setAgentThreadIndexData] =
    useState<ClientAgentThreadsResponse | null>(null);
  const [agentAutomationData, setAgentAutomationData] =
    useState<ClientAgentAutomationsResponse | null>(null);
  const [activeActivityTab, setActiveActivityTab] =
    useState<AgentPageActivityTab>("conversations");

  useEffect(() => {
    if (!currentToken || !currentKey || !server) {
      setAgentThreadIndexData(null);
      setAgentAutomationData(null);
      return;
    }
    let cancelled = false;

    const loadAgentActivity = async () => {
      try {
        const serverOrigin = String(server).replace(/\/+$/, "");
        const headers = { Authorization: `Bearer ${currentToken}` };
        const [threadsResponse, automationsResponse] = await Promise.all([
          fetch(
            `${serverOrigin}/api/agent/threads?agentKey=${encodeURIComponent(currentKey)}`,
            {
              headers,
            },
          ),
          fetch(
            `${serverOrigin}/api/agent/automations?agentKey=${encodeURIComponent(currentKey)}`,
            { headers },
          ),
        ]);
        const threadPayload = (await threadsResponse
          .json()
          .catch(() => null)) as ClientAgentThreadsResponse | null;
        const automationPayload = (await automationsResponse
          .json()
          .catch(() => null)) as ClientAgentAutomationsResponse | null;
        if (!cancelled) {
          setAgentThreadIndexData(
            threadsResponse.ok && threadPayload?.ok ? threadPayload : null,
          );
          setAgentAutomationData(
            automationsResponse.ok && automationPayload?.ok
              ? automationPayload
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setAgentThreadIndexData(null);
          setAgentAutomationData(null);
        }
      }
    };
    void loadAgentActivity();
    return () => {
      cancelled = true;
    };
  }, [currentKey, currentToken, server, activityRefreshCounter]);

  const historySpaceNameById = useMemo(
    () =>
      new Map(
        (memberSpaces as Array<{ spaceId: string; spaceName: string }>).map(
          (space) => [space.spaceId, space.spaceName || space.spaceId] as const,
        ),
      ),
    [memberSpaces],
  );
  const dialogHistory = useMemo(
    () =>
      buildAgentDialogHistory({
        historyAgentKeys,
        historySpaceNameById,
        limit: 8,
        records: dialogHistoryRecords,
        untitledDialogLabel: t("untitledDialog", "未命名对话"),
      }),
    [dialogHistoryRecords, historyAgentKeys, historySpaceNameById, t],
  );
  const threadOverview = useMemo(() => {
    const projectedOverview = buildAgentThreadOverview({
      historyAgentKeys,
      historySpaceNameById,
      limitPerSection: 4,
      records: dialogHistoryRecords,
      untitledDialogLabel: t("untitledDialog", "未命名对话"),
    });
    if (!agentThreadIndexData?.data?.threads) return projectedOverview;
    const indexedOverview = buildAgentThreadOverviewFromApi({
      threads: agentThreadIndexData.data.threads,
      untitledDialogLabel: t("untitledDialog", "未命名对话"),
    });
    return {
      ...projectedOverview,
      running: indexedOverview.running,
      future: indexedOverview.future,
      recent:
        indexedOverview.recent.length > 0
          ? indexedOverview.recent
          : projectedOverview.recent,
    };
  }, [
    agentThreadIndexData,
    dialogHistoryRecords,
    historyAgentKeys,
    historySpaceNameById,
    t,
  ]);

  const fullDialogHistory = useMemo(
    () =>
      buildAgentDialogHistory({
        historyAgentKeys,
        historySpaceNameById,
        limit: 1000,
        records: dialogHistoryRecords,
        untitledDialogLabel: t("untitledDialog", "未命名对话"),
      }),
    [dialogHistoryRecords, historyAgentKeys, historySpaceNameById, t],
  );

  const fullActivityHistory = useMemo<AgentDialogHistoryEntry[]>(() => {
    const seen = new Set<string>();
    const merged: AgentDialogHistoryEntry[] = [];
    for (const entry of threadOverview.recent) {
      if (!seen.has(entry.dbKey)) {
        seen.add(entry.dbKey);
        merged.push(entry);
      }
    }
    for (const entry of fullDialogHistory) {
      if (!seen.has(entry.dbKey)) {
        seen.add(entry.dbKey);
        merged.push(entry);
      }
    }
    return merged
      .filter((dialog) => !deletedDialogKeys.has(dialog.dbKey))
      .sort(
        (left, right) =>
          toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt),
      );
  }, [threadOverview.recent, fullDialogHistory, deletedDialogKeys]);

  const manageTotalPages = Math.ceil(
    fullActivityHistory.length / manageModalPageSize,
  );

  // Clamp manage modal page when list shrinks (e.g. after deletion)
  useEffect(() => {
    if (!isManageModalOpen) return;
    setManageModalPage((current) => {
      if (manageTotalPages === 0) return 0;
      if (current >= manageTotalPages) return manageTotalPages - 1;
      return current;
    });
  }, [isManageModalOpen, manageTotalPages]);

  const activityHistory = useMemo(
    () => fullActivityHistory.slice(0, 8),
    [fullActivityHistory],
  );

  const runningThreads = useMemo(
    () => threadOverview.running.filter((t) => !deletedDialogKeys.has(t.dbKey)),
    [threadOverview.running, deletedDialogKeys],
  );

  const futureThreads = useMemo(
    () => threadOverview.future.filter((t) => !deletedDialogKeys.has(t.dbKey)),
    [threadOverview.future, deletedDialogKeys],
  );

  const automations = agentAutomationData?.data?.automations ?? [];
  const runtimeEvidenceEntry = useMemo(
    () =>
      [...threadOverview.recent, ...threadOverview.running]
        .filter(
          (entry) =>
            entry.runtimeEvidence && !deletedDialogKeys.has(entry.dbKey),
        )
        .sort((left, right) => {
          const leftTime =
            typeof left.updatedAt === "number"
              ? left.updatedAt
              : Date.parse(String(left.updatedAt));
          const rightTime =
            typeof right.updatedAt === "number"
              ? right.updatedAt
              : Date.parse(String(right.updatedAt));
          return (
            (Number.isFinite(rightTime) ? rightTime : 0) -
            (Number.isFinite(leftTime) ? leftTime : 0)
          );
        })[0] ?? null,
    [threadOverview.recent, threadOverview.running, deletedDialogKeys],
  );
  const conversationsTabCount =
    activityHistory.length + runningThreads.length + futureThreads.length;
  const activityTabs = useMemo(
    () => [
      {
        id: "conversations" as const,
        label: (
          <span className="agent-page__tab-label-wrap">
            <span>{t("agentActivityConversations", "对话")}</span>
            <span className="agent-page__activity-tab-count">
              {conversationsTabCount}
            </span>
          </span>
        ),
      },
      {
        id: "automations" as const,
        label: (
          <span className="agent-page__tab-label-wrap">
            <span>{t("agentAutomations", "自动化")}</span>
            <span className="agent-page__activity-tab-count">
              {automations.length}
            </span>
          </span>
        ),
      },
    ],
    [automations.length, conversationsTabCount, t],
  );

  const canEdit = useCouldEdit(currentKey);
  const hasMounted = useHasMounted();
  // 复制到我的：仅当作者允许复制、当前已登录、且不是作者本人时可用。
  // 沿用 hasMounted 避免 SSR 水合不一致（参考 AgentBlock 的写法）。
  // 与 canEdit 互斥：作者本人在此处 useCouldEdit 为真，且 userId 相同会被排除，
  // 所以 footer 里把 fork 按钮放在 canEdit 分组之外单独渲染。
  const isLoggedIn = useIsLoggedIn();
  const canFork =
    hasMounted &&
    item?.allowFork === true &&
    isLoggedIn &&
    !!currentUserId &&
    item.userId !== currentUserId &&
    // 非 platform（custom / cli）依赖作者本机凭证，buildForkAgentFormData 会拒绝，
    // 这里同步守门，避免按钮显示了却在确认时被拒。
    (!item.apiSource || item.apiSource === "platform");
  const [forkVisible, setForkVisible] = useState(false);
  const openFork = useCallback(() => setForkVisible(true), []);
  const closeFork = useCallback(() => setForkVisible(false), []);
  const abilityProof = useMemo(() => buildAbilityProof(item), [item]);
  const emailBinding = useMemo(
    () =>
      buildAgentEmailBindingSummary(
        item as Agent & { meta?: Record<string, unknown> },
      ),
    [item],
  );

  const details = useMemo<AgentPageDetail[]>(() => {
    if (!item) return [];

    const cleanedModel = sanitizeOptionalModelString(item.model);
    const modelValue = cleanedModel || t("notSpecified");
    const imageModelValue = sanitizeOptionalModelString((item as any).imageModel);
    const hasSeparateImageModel =
      imageModelValue && imageModelValue !== modelValue;
    const hasVision = !!item.hasVision;
    const visionLabel = hasVision ? t("supported") : t("notSupported");

    const valueNode = (
      <span className="agent-page__model-value-container">
        <span className="agent-page__model-name">{modelValue}</span>
        <span
          className={`agent-page__vision-badge ${
            hasVision
              ? "agent-page__vision-badge--active"
              : "agent-page__vision-badge--inactive"
          }`}
          title={`${t("vision")}: ${visionLabel}`}
          aria-label={`${t("vision")}: ${visionLabel}`}
        >
          <LuImage size={11} aria-hidden="true" />
          <span>{t("vision")}</span>
        </span>
      </span>
    );

    const rows: AgentPageDetail[] = [
      {
        icon: <LuCpu size={14} aria-hidden="true" />,
        key: "model",
        label: hasSeparateImageModel ? "对话编排模型" : t("model"),
        value: valueNode,
      },
    ];

    if (hasSeparateImageModel) {
      rows.push({
        icon: <LuImage size={14} aria-hidden="true" />,
        key: "imageModel",
        label: "图片生成模型",
        value: imageModelValue,
      });
    }

    if (item.apiSource === "cli") {
      rows.splice(1, 0, {
        icon: <LuTerminal size={14} aria-hidden="true" />,
        key: "cliProvider",
        label: "CLI",
        value: formatCliProviderLabel(item.cliProvider),
      });
      rows.splice(2, 0, {
        icon: <LuLaptop size={14} aria-hidden="true" />,
        key: "runtimeLocation",
        label: "运行位置",
        value: formatRuntimeLocationLabel(
          item.runtimeBinding?.machineId ?? undefined,
        ),
      });
    } else if (
      // Page-local custom: only 127.0.0.1 (not localhost). Do not switch to
      // isLocalCustomProviderUrl — keeps customProviderUrl includes behavior.
      item.apiSource === "custom" &&
      isPageLocalCustomRuntime &&
      toNonEmptyString(item.customProviderUrl)?.includes("127.0.0.1")
    ) {
      rows.splice(1, 0, {
        icon: <LuLaptop size={14} aria-hidden="true" />,
        key: "runtimeLocation",
        label: "运行位置",
        value: formatRuntimeLocationLabel(
          item.runtimeBinding?.machineId ?? undefined,
          "当前设备本地直连",
        ),
      });
    }

    if (priceHint && !isCliAgent) {
      if (priceHint.type === "per_image") {
        const priceLabel = priceHint.labelKey
          ? t(priceHint.labelKey, "默认档参考价")
          : t("price", "价格");
        const priceValue = `${formatPriceAmount(priceHint.amount)} / ${t("perImage")}${
          priceHint.profileLabel ? ` (${priceHint.profileLabel})` : ""
        }`;
        rows.push({
          icon: <LuImage size={14} aria-hidden="true" />,
          key: "price",
          label: priceLabel,
          value: priceValue,
          ariaLabel: `${t("price", "价格")} (${priceLabel}): ${priceValue}`,
        });
      } else if (shouldShowTokenCost) {
        const costLabel = t("modelCost", "模型成本");
        const costValue = formatAgentOutputPrice(item.outputPrice);
        rows.push({
          icon: <LuCoins size={14} aria-hidden="true" />,
          key: "price",
          label: costLabel,
          value: costValue,
          ariaLabel: `${t("price", "价格")} (${costLabel}): ${costValue}`,
        });
      }
    }

    return rows;
  }, [
    isCliAgent,
    isPageLocalCustomRuntime,
    item,
    priceHint,
    shouldShowTokenCost,
    t,
  ]);

  if (error && !item) {
    return (
      <div className="agent-page">
        <PageStateIndicator isLoading={false} error={error} t={t} />
      </div>
    );
  }

  // Direct-link / slow fetch: paint a named header shell so VT has a target
  // and users never see only a full-page spinner.
  if (!item) {
    return (
      <div className="agent-page">
        <div className="agent-page__container">
          <header className="agent-page__header" style={headerSurfaceVt}>
            <div className="agent-page__avatar" style={headerIconVt}>
              <AgentAvatar
                agent={{ name: t("unnamed"), model: undefined, provider: "" }}
                size={48}
                avatarSize="xlarge"
                className="agent-page__avatar-image"
              />
            </div>
            <div className="agent-page__info">
              <h1 className="agent-page__name" style={headerTitleVt}>
                {t("loading", "加载中…")}
              </h1>
            </div>
          </header>
          <div className="agent-page__body-placeholder" aria-busy="true">
            <PageLoading fullHeight={false} />
          </div>
        </div>
      </div>
    );
  }

  const creator = resolveAgentCreatorSummary({
    creatorProfile,
    item: item as any,
    server,
    unknownUserLabel: t("unknownUser"),
  });
  const creatorDisplay = (
    <Link to={`/profile/${item.userId}`} className="agent-page__creator-link">
      <Avatar
        name={creator.name}
        type="user"
        shape="full"
        size="small"
        src={creator.avatarUrl ?? undefined}
        className="agent-page__creator-avatar"
      />
      <span className="agent-page__creator-name">{creator.name}</span>
    </Link>
  );

  return (
    <>
      <div className="agent-page">
        <div className="agent-page__container">
          {/* Hero Header */}
          <header className="agent-page__header" style={headerSurfaceVt}>
            <div className="agent-page__header-top">
              <div className="agent-page__avatar" style={headerIconVt}>
                <AgentAvatar
                  agent={item}
                  size={64}
                  avatarSize="xlarge"
                  className="agent-page__avatar-image"
                />
              </div>

              <div className="agent-page__info">
                <h1 className="agent-page__name" style={headerTitleVt}>
                  {item.name || t("unnamed")}
                  <span className="agent-page__header-badges">
                    {item.isPublic ? (
                      <span
                        className="agent-page__header-badge agent-page__header-badge--public"
                        title="公开到市场"
                      >
                        <LuGlobe size={11} /> 公开
                      </span>
                    ) : (
                      <span
                        className="agent-page__header-badge agent-page__header-badge--private"
                        title="仅自己可见 (私有)"
                      >
                        <LuLock size={11} /> 私有
                      </span>
                    )}
                    {item.apiSource === "cli" ? (
                      <span
                        className="agent-page__header-badge agent-page__header-badge--cli"
                        title="本机 CLI"
                      >
                        <LuTerminal size={11} /> 本机 CLI
                      </span>
                    ) : item.apiSource === "custom" ? (
                      <span
                        className="agent-page__header-badge agent-page__header-badge--custom"
                        title="自定义 API Key"
                      >
                        <LuWrench size={11} /> 自整 Key
                      </span>
                    ) : (
                      <span
                        className="agent-page__header-badge agent-page__header-badge--platform"
                        title="平台内置 API"
                      >
                        <LuCpu size={11} /> 平台 API
                      </span>
                    )}
                  </span>
                </h1>

                {item.introduction && item.introduction !== t("noIntroduction") && item.introduction !== "暂无简介。" ? (
                  <p className="agent-page__description">
                    {item.introduction}
                  </p>
                ) : abilityProof.scenarios.length > 0 ? (
                  <div className="agent-page__hero-scenarios">
                    {abilityProof.scenarios.slice(0, 4).map((scenario, i) => (
                      <span key={`hero-scenario-${i}`} className="agent-page__hero-chip">
                        {scenario}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="agent-page__description agent-page__description--fallback">
                    {t(
                      "agentDefaultFallback",
                      "智能 AI 助手，随时点击下方的「开始聊天」探索它的完整能力。",
                    )}
                  </p>
                )}

                <div className="agent-page__meta">
                  <div className="agent-page__meta-item">
                    <LuUser size={14} aria-hidden="true" />
                    <span className="agent-page__meta-value agent-page__meta-value--creator">
                      {creatorDisplay}
                    </span>
                  </div>

                  <div className="agent-page__meta-item">
                    <LuCalendarDays size={14} aria-hidden="true" />
                    <span className="agent-page__meta-label">
                      {t("createdAt")}
                    </span>
                    <span className="agent-page__meta-value">
                      {formatDateValue(item.createdAt, "yyyy-MM-dd")}
                    </span>
                  </div>

                  {details.map((d) => (
                    <div
                      key={d.key}
                      className="agent-page__meta-item"
                      {...(d.ariaLabel ? { "aria-label": d.ariaLabel } : {})}
                    >
                      {d.icon}
                      <span className="agent-page__meta-label">{d.label}:</span>
                      <span className="agent-page__meta-value">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="agent-page__header-actions-top">
                <AgentFavoriteButton
                  agentKey={currentKey}
                  className="agent-page__fav-btn"
                  iconSize={20}
                />
              </div>
            </div>

            {/* Hero CTA & Actions Bar */}
            <div className="agent-page__hero-cta-row">
              <Button
                icon={<LuMessageSquare size={18} />}
                onClick={() => startDialog()}
                disabled={isDialogLoading}
                loading={isDialogLoading}
                size="large"
                className="agent-page__primary-action"
              >
                {isDialogLoading ? t("starting") : t("startChat")}
              </Button>

              {(canEdit || canFork) && (
                <div className="agent-page__admin-actions">
                  {canEdit && (
                    <>
                      <Button
                        icon={<LuShieldCheck size={14} aria-hidden="true" />}
                        onClick={() => setIsPublishModalOpen(true)}
                        variant="ghost"
                        className="agent-page__admin-btn"
                        title={t("publishAndValidate", "发布与合规校验")}
                      >
                        {t("publish", "发布")}
                      </Button>
                      <Button
                        icon={<LuPencil size={14} aria-hidden="true" />}
                        onClick={openEdit}
                        variant="ghost"
                        className="agent-page__admin-btn"
                        title={t("edit")}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        icon={<LuBrain size={14} aria-hidden="true" />}
                        onClick={() => setIsMemoryModalOpen(true)}
                        variant="ghost"
                        className="agent-page__admin-btn"
                        title={t("agentMemory.title", "记忆管理")}
                      >
                        {t("agentMemory.manage", "记忆")}
                      </Button>
                    </>
                  )}
                  {canFork && (
                    <Button
                      icon={<LuCopy size={14} aria-hidden="true" />}
                      onClick={openFork}
                      variant="ghost"
                      className="agent-page__admin-btn"
                      title={t("fork.action", "复制到我的")}
                    >
                      {t("fork.action", "复制")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <main className="agent-page__content">
            <div className="agent-page__layout">
              {/* Left Column: Chat Activity & Prompts */}
              <div className="agent-page__main">
                {item.introduction &&
                  item.introduction !== t("noIntroduction") &&
                  item.introduction !== "暂无简介。" &&
                  abilityProof.scenarios.length > 0 && (
                    <section className="agent-page__section agent-page__section--description">
                      <div className="agent-page__chip-row agent-page__scenario-row">
                        {abilityProof.scenarios.slice(0, 6).map((scenario, i) => (
                          <span
                            key={`scenario-${i}`}
                            className="agent-page__chip"
                            title={scenario}
                          >
                            {scenario}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                {/* Example prompts: 一键带着问题开聊，帮新用户迈出第一步 */}
                {abilityProof.examples.length > 0 ? (
                  <section className="agent-page__section agent-page__section--prompts">
                    <h3 className="agent-page__prompts-title">
                      {t("tryAsking", "试试这样问")}
                    </h3>
                    <div className="agent-page__prompt-grid">
                      {abilityProof.examples.slice(0, 4).map((prompt, i) => (
                        <button
                          key={`prompt-${i}`}
                          type="button"
                          className="agent-page__prompt-card"
                          onClick={() => startDialog(prompt)}
                          disabled={isDialogLoading}
                          title={prompt}
                        >
                          <span className="agent-page__prompt-text">
                            {prompt}
                          </span>
                          <LuMessageSquare
                            size={14}
                            aria-hidden="true"
                            className="agent-page__prompt-icon"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Activity — standalone section */}
                <section className="agent-page__section agent-page__section--activity">
                  <AriaTabs
                    selectedKey={activeActivityTab}
                    onSelectionChange={(key) =>
                      setActiveActivityTab(key as AgentPageActivityTab)
                    }
                    className="agent-page__activity-tabs-nav"
                  >
                    <AriaTabList aria-label="智能体活动记录">
                      {activityTabs.map((tab) => (
                        <AriaTab key={tab.id} id={tab.id}>
                          {tab.label}
                        </AriaTab>
                      ))}
                    </AriaTabList>
                  </AriaTabs>

                  <div className="agent-page__activity-panel">
                    {activeActivityTab === "conversations" ? (
                      !currentUserId ? (
                        <p className="agent-page__history-empty">
                          {t(
                            "chatHistoryLoginRequired",
                            "登录后查看你和这个 Agent 的聊天记录",
                          )}
                        </p>
                      ) : isHistoryLoading ? (
                        <p className="agent-page__history-empty">
                          {t("loading", "加载中...")}
                        </p>
                      ) : conversationsTabCount === 0 ? (
                        <div className="agent-page__empty-state">
                          <LuMessageSquare size={20} aria-hidden="true" />
                          <p>
                            {t(
                              "chatHistoryEmpty",
                              "你还没有和这个 Agent 的聊天记录",
                            )}
                          </p>
                          <span>
                            {t(
                              "chatHistoryEmptyHint",
                              "点上方「开始聊天」，记录会出现在这里",
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="agent-page__activity-sections">
                          <AgentActivityThreadSection
                            title={t("agentThreadsRunning", "正在运行")}
                            items={runningThreads}
                            onDelete={handleRequestDeleteDialog}
                          />
                          <AgentActivityThreadSection
                            title={t("agentThreadsFuture", "将来运行")}
                            items={futureThreads}
                            onDelete={handleRequestDeleteDialog}
                          />
                          {activityHistory.length > 0 ? (
                            <div className="agent-page__activity-section">
                              <div className="agent-page__activity-section-header">
                                <h3 className="agent-page__activity-section-title">
                                  {t("agentActivityRecentChats", "最近聊天")}
                                </h3>
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() => setIsManageModalOpen(true)}
                                  title={t(
                                    "agentManageAllDialogs",
                                    "管理全部对话",
                                  )}
                                  aria-label={t(
                                    "agentManageAllDialogs",
                                    "管理全部对话",
                                  )}
                                >
                                  {t("agentManageAll", "管理全部")}
                                </Button>
                              </div>
                              <div className="agent-page__history-list">
                                {activityHistory.map((dialog) => (
                                  <Link
                                    key={dialog.dbKey}
                                    to={buildDialogUrl(
                                      dialog.dbKey,
                                      dialog.spaceId,
                                    )}
                                    className="agent-page__history-item"
                                  >
                                    <div className="agent-page__history-content">
                                      <span className="agent-page__history-title">
                                        {dialog.title}
                                      </span>
                                      <span className="agent-page__history-meta">
                                        {dialog.spaceName
                                          ? `${dialog.spaceName} · `
                                          : ""}
                                        {formatDateValue(
                                          dialog.updatedAt,
                                          "yyyy-MM-dd HH:mm",
                                        )}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="agent-page__history-delete-btn"
                                      onClick={(e) =>
                                        handleRequestDeleteDialog(
                                          e,
                                          dialog.dbKey,
                                        )
                                      }
                                      title={t("deleteDialog", "删除对话")}
                                      aria-label={t("deleteDialog", "删除对话")}
                                    >
                                      <LuTrash2 size={14} aria-hidden="true" />
                                    </button>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : activeActivityTab === "automations" ? (
                      automations.length === 0 ? (
                        <p className="agent-page__history-empty">
                          {t("agentAutomationsEmpty", "暂无自动化规则")}
                        </p>
                      ) : (
                        <div className="agent-page__thread-list">
                          {automations.map((automation) => {
                            const runStatus =
                              automation.summary?.runStatus ??
                              automation.runStatus ??
                              "never";
                            const lifecycleLabel =
                              automation.status === "active"
                                ? t("agentAutomationStatusActive", "已启用")
                                : automation.status === "paused"
                                  ? t("agentAutomationStatusPaused", "已暂停")
                                  : automation.status === "cancelled"
                                    ? t(
                                        "agentAutomationStatusCancelled",
                                        "已取消",
                                      )
                                    : t(
                                        "agentAutomationStatusCompleted",
                                        "已完成",
                                      );
                            const runStatusLabel =
                              runStatus === "running"
                                ? t("agentAutomationRunStatusRunning", "运行中")
                                : runStatus === "done"
                                  ? t(
                                      "agentAutomationRunStatusDone",
                                      "上次成功",
                                    )
                                  : runStatus === "failed"
                                    ? t(
                                        "agentAutomationRunStatusFailed",
                                        "上次失败",
                                      )
                                    : runStatus === "idle"
                                      ? t(
                                          "agentAutomationRunStatusIdle",
                                          "空闲",
                                        )
                                      : t(
                                          "agentAutomationRunStatusNever",
                                          "从未运行",
                                        );
                            const lastError =
                              automation.summary?.lastErrorMessage ??
                              automation.lastRunError;

                            return (
                              <div
                                key={automation.automationKey}
                                className="agent-page__thread-item"
                              >
                                <span className="agent-page__thread-title">
                                  {automation.title ||
                                    t(
                                      "agentAutomationUntitled",
                                      "未命名自动化",
                                    )}
                                </span>
                                <span className="agent-page__thread-meta">
                                  {lifecycleLabel} · {runStatusLabel}
                                  {" · "}
                                  {t("agentAutomationNextRun", "下一次运行")}：
                                  {formatDateValue(
                                    automation.summary?.nextWakeAt ??
                                      automation.trigger?.nextWakeAt,
                                    "yyyy-MM-dd HH:mm",
                                  )}
                                  {" · "}
                                  {t("agentAutomationLastRun", "上次运行")}：
                                  {(automation.summary?.lastRunAt ??
                                  automation.lastRunAt)
                                    ? formatDateValue(
                                        automation.summary?.lastRunAt ??
                                          automation.lastRunAt,
                                        "yyyy-MM-dd HH:mm",
                                      )
                                    : t("agentAutomationNeverRun", "从未运行")}
                                  {lastError
                                    ? ` · ${t("agentAutomationError", "错误")}：${lastError}`
                                    : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : null}
                  </div>
                </section>
              </div>

              {/* Right Column: Sidebar containing static config, proof of capability, etc. */}
              <div className="agent-page__sidebar">
                {canEdit ? <AgentGrantPanel agentKey={currentKey} /> : null}
                {canEdit &&
                typeof item?.apiKeyRef === "string" &&
                ["chatgpt", "claude", "xai", "antigravity", "cursor"].includes(
                  item.apiKeyRef.trim().toLowerCase(),
                ) &&
                currentToken &&
                server ? (
                  <section className="agent-page__section agent-page__section--oauth-status">
                    <div className="agent-page__ability-proof-heading">
                      <LuShieldCheck size={15} aria-hidden="true" />
                      <span>OAuth 凭据（他人代用额度前需已 sync）</span>
                    </div>
                    <OAuthStatusBox
                      providerId={item.apiKeyRef.trim().toLowerCase()}
                      serverOrigin={String(server).replace(/\/+$/, "")}
                      authToken={currentToken}
                    />
                  </section>
                ) : null}
                {/* Ability proof and developer specs */}
                <section className="agent-page__section agent-page__section--ability-proof">
                  <div className="agent-page__ability-proof">
                    <div className="agent-page__ability-proof-heading">
                      <LuShieldCheck size={15} aria-hidden="true" />
                      <span>能力与配置</span>
                    </div>
                    <div className="agent-page__ability-proof-grid">
                      <AbilityChipGroup
                        title="工具"
                        items={abilityProof.toolLabels}
                      />
                      <AbilityChipGroup
                        title="知识 / Skill"
                        items={abilityProof.referenceLabels}
                      />
                      <AbilityChipGroup
                        title="图片生成模型"
                        items={abilityProof.imageModelLabels}
                      />
                      {abilityProof.toolLabels.length === 0 &&
                      abilityProof.referenceLabels.length === 0 &&
                      abilityProof.imageModelLabels.length === 0 ? (
                        <p className="agent-page__ability-proof-empty">
                          未挂载额外工具或知识，纯对话即可使用。
                        </p>
                      ) : null}
                    </div>
                    <details className="agent-page__ability-proof-advanced">
                      <summary>
                        <LuBookOpen size={14} aria-hidden="true" />
                        <span>高级证据</span>
                      </summary>
                      <div className="agent-page__ability-proof-status">
                        <span>
                          <LuWrench size={14} aria-hidden="true" />
                          Public gate
                        </span>
                        <p>
                          {abilityProof.publicReadiness?.summary ||
                            "未连接公开检查结果；发布前可运行 public gate 验证 public alias、eval cases、reference readability 和 secret 风险。"}
                        </p>
                      </div>
                      <div className="agent-page__ability-proof-status">
                        <span>
                          <LuActivity size={14} aria-hidden="true" />
                          评估状态
                        </span>
                        <p>
                          {abilityProof.evalReadiness?.summary ||
                            "未连接评估结果；专业发布前可先生成 eval cases 草稿，再决定是否 dry-run。不强制普通创建流程运行 live eval。"}
                        </p>
                      </div>
                      <div className="agent-page__ability-proof-status">
                        <span>
                          <LuActivity size={14} aria-hidden="true" />
                          托管执行授权
                        </span>
                        <p>
                          {abilityProof.hostedExecAllowed
                            ? "已允许 Alpha 托管临时工作区执行脚本/命令。"
                            : "未允许托管临时执行；普通对话不会获得 Web hosted execShell。"}
                        </p>
                      </div>
                      <RuntimeEvidenceSummary entry={runtimeEvidenceEntry} />
                    </details>
                  </div>
                </section>

                <AgentEmailBindingSection
                  agentKey={agentKey}
                  summary={emailBinding}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <Dialog
        isOpen={isEditVisible}
        onClose={closeEdit}
        title={`${t("edit")} ${item.name || t("agent")}`}
        size="large"
      >
        <AgentForm mode="edit" initialValues={item} onClose={closeEdit} />
      </Dialog>

      <Dialog
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        title={`${t("agentMemory.title", "记忆管理")} · ${item.name || t("agent")}`}
        size="large"
      >
        {(() => {
          const { agentKey, agentId } = resolveAgentEditIdentity(
            item as any,
          );
          return <AgentMemoryTab agentId={agentId} agentKey={agentKey} />;
        })()}
      </Dialog>

      <ConfirmModal
        isOpen={deleteDialogKey !== null}
        onClose={() => setDeleteDialogKey(null)}
        onConfirm={handleConfirmDeleteDialog}
        title={t("deleteDialog", "删除对话")}
        message={t(
          "deleteDialogConfirmation",
          "确定要删除这个对话吗？此操作不可撤销。",
        )}
        type="error"
        confirmText={t("delete", "删除")}
        cancelText={t("cancel", "取消")}
        loading={isDeletingDialog}
      />
      <Dialog
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setManageModalPage(0);
        }}
        title={`管理全部对话记录${fullActivityHistory.length > 0 ? ` (${fullActivityHistory.length})` : ""}`}
        size="large"
      >
        <div className="agent-page__history-list agent-page__history-list--manage">
          {fullActivityHistory.length === 0 ? (
            <p className="agent-page__history-empty">暂无对话记录</p>
          ) : (
            fullActivityHistory
              .slice(
                manageModalPage * manageModalPageSize,
                manageModalPage * manageModalPageSize + manageModalPageSize,
              )
              .map((dialog) => (
                <Link
                  key={dialog.dbKey}
                  to={buildDialogUrl(dialog.dbKey, dialog.spaceId)}
                  className="agent-page__history-item"
                  onClick={() => setIsManageModalOpen(false)}
                >
                  <div className="agent-page__history-content">
                    <span className="agent-page__history-title">
                      {dialog.title}
                    </span>
                    <span className="agent-page__history-meta">
                      {dialog.spaceName ? `${dialog.spaceName} · ` : ""}
                      {formatDateValue(dialog.updatedAt, "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="agent-page__history-delete-btn"
                    onClick={(e) => handleRequestDeleteDialog(e, dialog.dbKey)}
                    title={t("deleteDialog", "删除对话")}
                    aria-label={t("deleteDialog", "删除对话")}
                  >
                    <LuTrash2 size={14} aria-hidden="true" />
                  </button>
                </Link>
              ))
          )}
        </div>
        {manageTotalPages > 1 && (
          <div className="agent-page__manage-pagination">
            <span className="agent-page__manage-pagination-info">
              {manageModalPage + 1} / {manageTotalPages}
            </span>
            <div className="agent-page__manage-pagination-buttons">
              <Button
                variant="secondary"
                size="small"
                disabled={manageModalPage === 0}
                onClick={() => setManageModalPage((p) => Math.max(0, p - 1))}
              >
                {t("previous", "上一页")}
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={manageModalPage >= manageTotalPages - 1}
                onClick={() =>
                  setManageModalPage((p) =>
                    Math.min(manageTotalPages - 1, p + 1),
                  )
                }
              >
                {t("next", "下一页")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <AgentPublishDialog
        agent={item}
        isOpen={isPublishModalOpen}
        isSaving={isUpdatingPublishStatus}
        onClose={() => setIsPublishModalOpen(false)}
        onSave={handleSavePublishSettings}
      />

      {canFork && forkVisible && (
        <Suspense
          fallback={
            <div className="agent__dialog-body-fallback">
              <div className="agent__dialog-spinner" />
              <div className="agent__dialog-text">{t("loading")}</div>
            </div>
          }
        >
          <AgentForkDialogLazy
            isOpen={forkVisible}
            onClose={closeFork}
            agent={item}
          />
        </Suspense>
      )}
    </>
  );
};

export default AgentPage;
