import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "AgentPage.tsx"), "utf8");
const stylesSource = readFileSync(
  join(import.meta.dir, "agentPageStyles.ts"),
  "utf8",
);
const escapeHatchSource = readFileSync(
  join(import.meta.dir, "agentPageStylexEscapeHatch.css"),
  "utf8",
);
const styles = stylesSource + "\n" + escapeHatchSource;

describe("AgentPage source contract", () => {
  it("keeps document.title synced with the current agent name", () => {
    expect(source).toContain("const pageTitle = item?.name?.trim()");
    expect(source).toContain("`${item.name.trim()} | Nolo.Chat`");
    expect(source).toContain("document.title = pageTitle;");
    expect(source).toContain("}, [pageTitle]);");
  });

  it("does not refetch public agent data that SSR already hydrated", () => {
    expect(source).toContain(
      "useFetchData<Agent>(storePrimaryItem ? null : agentKey)",
    );
  });

  it("uses card navigation preview so first paint keeps shared-element targets", () => {
    expect(source).toContain('from "./agentNavigationPreview"');
    expect(source).toContain("resolveAgentNavPreview(location.state, agentKey");
    expect(source).toContain("navPreview");
    expect(source).toContain(
      "storePrimaryItem ||\n    res.data ||\n    navPreview",
    );
  });

  it("shows machine-bound CLI agent runtime location as ordinary agent metadata", () => {
    expect(source).toContain('from "./agentDisplayUtils"');
    expect(source).toContain("formatRuntimeLocationLabel");
    expect(source).toContain("runtimeBinding?.machineId");
    expect(source).toContain('label: "运行位置"');
  });

  it("shows machine-bound local custom agents as ordinary runtime metadata too", () => {
    expect(source).toContain('item.apiSource === "custom"');
    expect(source).toContain("customProviderUrl");
    expect(source).toContain("当前设备本地直连");
  });

  it("renders ordinary agent price metadata with the same per-million-token format as agent cards and accessible aria-label", () => {
    expect(source).toContain('t("modelCost", "模型成本")');
    expect(source).toContain("formatAgentOutputPrice(item.outputPrice)");
    expect(source).toContain('ariaLabel: `${t("price", "价格")} (${costLabel}): ${costValue}`');
    expect(source).not.toContain('t("referencePricePerTurn", "按次参考价")');
  });

  it("only uses routed scope for detail-page chat launches", () => {
    expect(source).not.toContain("selectCurrentSpaceId");
    expect(source).not.toContain("selectViewMode");
    expect(source).toContain(
      "const dialogSpaceId = resolveDialogLaunchSpaceId({",
    );
    expect(source).toContain("routeSpaceId,");
    expect(source).toMatch(/useAgentDialog\(\s*currentKey,\s*\{/);
    expect(source).toContain("spaceId: dialogSpaceId");
  });

  it("contains new label/profile styling and drops creator label prefix", () => {
    expect(source).not.toContain(
      'className="agent-page__meta-label">{t("creator")}',
    );
    expect(source).toContain("resolveAgentCreatorSummary");
    expect(source).toContain("agent-page__creator-avatar");
    expect(source).toContain("styles.creatorName");
    expect(source).toContain("styles.creatorLink");
  });

  it("loads the signed-in user's own dialog history for this agent from user data", () => {
    expect(source).toContain("useUserData(");
    expect(source).toContain("DataType.DIALOG");
    expect(source).toContain("buildAgentDialogHistory({");
    expect(source).toContain("buildDialogUrl(dialog.dbKey, dialog.spaceId)");
  });

  it("renders one activity area with conversations and automation tabs", () => {
    expect(source).toContain("threadOverview");
    expect(source).toContain("runningThreads");
    expect(source).toContain("futureThreads");
    expect(source).toContain(
      'type AgentPageActivityTab = "conversations" | "automations";',
    );
    expect(source).toContain('useState<AgentPageActivityTab>("conversations")');
    expect(source).toContain('t("agentActivityConversations", "对话")');
    expect(source).toContain("AgentActivityThreadSection");
    expect(source).toContain('t("agentActivityRecentChats", "最近聊天")');
    expect(source).toContain('t("agentThreadsRunning", "正在运行")');
    expect(source).toContain('t("agentThreadsFuture", "将来运行")');
    expect(source).toContain('t("agentAutomations", "自动化")');
    expect(source).not.toContain(
      'type AgentPageActivityTab = "history" | "running" | "future" | "automations";',
    );
    expect(source).not.toContain('t("agentThreadsRecent", "过往对话")');
    expect(source).toContain("AriaTabs");
    expect(source).toContain("AriaTabList");
    expect(source).toContain("AriaTab");
    expect(source).toContain('data-hook="activity-tabs-nav"');
    expect(escapeHatchSource).toContain('[data-hook="activity-tabs-nav"]');
    expect(stylesSource).toContain('boxSizing: "border-box"');
    expect(escapeHatchSource).toContain(".react-aria-TabList");
    expect(stylesSource).toContain("activitySections");
  });

  it("keeps the primary action before scrollable activity in a responsive two-column layout", () => {
    expect(source).toContain("styles.layout");
    expect(source).toContain("styles.main");
    expect(source).toContain("styles.sidebar");
    expect(stylesSource).toContain("layout:");
    expect(stylesSource).toContain("main:");
    expect(stylesSource).toContain("sidebar:");
    expect(stylesSource).toContain('flexDirection: "column"');
    expect(stylesSource).toContain('maxHeight: "min(34vh, 320px)"');

    const actionIndex = source.indexOf(
      'className="agent-page__primary-action"',
    );
    const activityIndex = source.indexOf("styles.sectionActivity");
    expect(actionIndex).toBeGreaterThan(-1);
    expect(activityIndex).toBeGreaterThan(-1);
    expect(actionIndex).toBeLessThan(activityIndex);
  });

  it("surfaces controlled inbox email bindings from agent meta", () => {
    expect(source).toContain("buildAgentEmailBindingSummary");
    expect(source).toContain("AgentEmailBindingSection");
    expect(source).toContain("邮箱绑定");
    expect(source).toMatch(
      /<AgentEmailBindingSection\s+agentKey=\{agentKey\}\s+summary=\{emailBinding\}\s*\/>/,
    );
    expect(source).toContain("查看收件箱");
    expect(source).toContain("/inbox");
    expect(stylesSource).toContain("emailBinding");
    expect(stylesSource).toContain("emailBindingInboxLink");
  });

  it("renders automation run summaries with labels instead of bare timestamps", () => {
    expect(source).toContain("summary?: {");
    expect(source).toContain('t("agentAutomationNextRun", "下一次运行")');
    expect(source).toContain('t("agentAutomationLastRun", "上次运行")');
    expect(source).toContain('t("agentAutomationNeverRun", "从未运行")');
    expect(source).toContain('t("agentAutomationError", "错误")');
    expect(source).toContain('t("agentAutomationStatusActive", "已启用")');
    expect(source).toContain('t("agentAutomationRunStatusRunning", "运行中")');
    expect(source).toMatch(
      /t\(\s*"agentAutomationRunStatusNever",\s*"从未运行",?\s*\)/,
    );
    expect(source).toContain("automation.summary?.nextWakeAt ??");
    expect(source).toContain("automation.trigger?.nextWakeAt");
    expect(source).toMatch(
      /automation\.summary\?\.lastErrorMessage\s*\?\?\s*automation\.lastRunError/,
    );
    expect(source).not.toContain("{automation.status} ·");
  });

  it("keeps vision as a small model badge", () => {
    expect(source).toContain("styles.visionBadge");
    expect(source).toContain('title={`${t("vision")}: ${visionLabel}`}');
    expect(source).not.toContain('key: "vision"');
    expect(stylesSource).toContain("visionBadgeActive");
    expect(stylesSource).toContain("visionBadgeInactive");
    expect(stylesSource).toContain("opacity: 0.55");
    expect(stylesSource).toContain('width: "clamp(260px, 30%, 304px)"');
    expect(stylesSource).not.toContain("specsTagsFlow");
    // details-row / detail-inline-* 那套行内详情布局在 ae1328ce1（2026-07-29
    // 的 CTA 改版）里被整体替换掉了，当时漏改本测试，红了两周。样式已随之
    // 清理，这里同步断言它不会悄悄回来。
    expect(source).not.toContain("agent-page__details-row");
    expect(stylesSource).not.toContain("detailInline");
  });

  it("surfaces ability proof without introducing an Agent Spec section", () => {
    expect(source).toContain("styles.sectionAbilityProof");
    expect(source).toContain("INTERNAL_IMAGE_TOOL_NAMES");
    expect(source).toContain('key: "imageModel"');
    expect(source).toContain('"图片生成模型"');
    expect(source).toContain('"对话编排模型"');
    expect(source).toContain("能力与配置");
    expect(source).toContain("知识 / Skill");
    expect(source).toContain("Public gate");
    expect(source).toContain("publicReadiness");
    expect(source).not.toContain("Agent Spec");
    expect(source).not.toContain("specPageKey");
    expect(stylesSource).toContain("abilityProof");
  });

  it("hides empty capability groups and offers one-click example prompts", () => {
    // 空数据的能力分组不渲染占位文案，避免整栏“暂未配置”噪音
    expect(source).toContain("if (items.length === 0) return null;");
    expect(source).not.toContain("暂未提供示例提问");
    expect(source).not.toContain("暂未挂载 references");
    // 示例提问在主列，一键带着问题开聊（经 chat input seed 预填）
    expect(source).toContain("styles.promptCard");
    expect(source).toContain("startDialog(prompt)");
    expect(stylesSource).toContain("promptCard");
  });

  it("surfaces runtime evidence from thread summaries inside advanced ability proof", () => {
    expect(source).toContain("运行证据");
    expect(source).toContain("RuntimeEvidenceSummary");
    expect(source).toContain("runtimeEvidenceEntry");
    expect(source).toContain("workspaceLease?.source");
    expect(source).toContain("hasRuntimeToolPolicySnapshot");
    expect(source).toContain("toolCallCount");
    expect(source).toContain("lastToolNames");
    expect(source).toContain("Alpha 执行证据，不代表完整生产沙箱");
    expect(source).toContain("托管临时工作区");
    expect(source).toContain("绑定机器执行");
    expect(source).toContain("暂无可审计执行工作区");
    expect(source).toContain("使用了脚本/命令执行");
    expect(source).toContain("查看完整对话证据");
    expect(source).not.toContain("stdout");
    expect(source).not.toContain("stderr");
    expect(stylesSource).toContain("runtimeEvidence");
  });

  it("keeps eval readiness as optional advanced proof instead of a mandatory create step", () => {
    expect(source).toContain("evalReadiness");
    expect(source).toContain("评估状态");
    expect(source).toContain(
      "未连接评估结果；专业发布前可先生成 eval cases 草稿，再决定是否 dry-run。",
    );
    expect(source).toContain("不强制普通创建流程运行 live eval。");
    expect(source).not.toContain("Agent Spec");
    expect(source).not.toContain("specPageKey");
  });

  it("shows hosted exec authorization as configuration evidence without introducing agent spec", () => {
    expect(source).toContain("runtimePolicyAllowsHostedExec");
    expect(source).toContain("hostedExecAllowed");
    expect(source).toContain("托管执行授权");
    expect(source).toContain("已允许 Alpha 托管临时工作区执行脚本/命令");
    expect(source).toContain("普通对话不会获得 Web hosted execShell");
    expect(source).not.toContain("Agent Spec");
    expect(source).not.toContain("specPageKey");
  });

  it("loads activity sections from AgentThreadIndex while keeping dialog history fallback", () => {
    expect(source).toContain("useToken");
    expect(source).toContain("/api/agent/threads?agentKey=");
    expect(source).toContain("Authorization: `Bearer ${currentToken}`");
    expect(source).toContain("buildAgentThreadOverviewFromApi({");
    expect(source).toContain("running: indexedOverview.running");
    expect(source).toContain("future: indexedOverview.future");
    expect(source).toContain("indexedOverview.recent.length > 0");
    expect(source).toContain("activityHistory");
    expect(source).toContain("const dialogHistory = useMemo(");
    expect(source).toContain("buildAgentDialogHistory({");
  });

  it("merge contract: API-indexed activity does not leak projected active sections", () => {
    // The merge must use indexedOverview for running/future, not projectedOverview.
    expect(source).toContain("running: indexedOverview.running");
    expect(source).toContain("future: indexedOverview.future");
    // Recent is also indexed when available, with a temporary dialog projection fallback.
    expect(source).toContain("recent:");
    expect(source).toContain("? indexedOverview.recent");
    expect(source).toContain(": projectedOverview.recent");
    // Must not restore projected running/future after API merge.
    expect(source).not.toMatch(/running:\s*projectedOverview\.running/);
    expect(source).not.toMatch(/future:\s*projectedOverview\.future/);
    // The fallback guard must check for threads before merging.
    expect(source).toContain("agentThreadIndexData?.data?.threads");
  });

  it("uses shared AgentAvatar on detail so card→page morph keeps the same face", () => {
    expect(source).toContain('import AgentAvatar from "./AgentAvatar"');
    expect(source).toContain("<AgentAvatar");
    expect(source).not.toContain('from "./useAgentModelAvatarComponent"');
    expect(source).not.toContain(
      "const [modelAvatarStyle, setModelAvatarStyle] = useState",
    );
  });

  it("keeps mobile detail page creator and chat action touch-sized", () => {
    expect(escapeHatchSource).toContain("@media (max-width: 768px)");
    expect(escapeHatchSource).toContain(".agent-page__creator-avatar.avatar");
    expect(escapeHatchSource).toContain("width: 18px;");
    expect(escapeHatchSource).toContain("height: 18px;");
    expect(escapeHatchSource).toContain("min-height: 44px !important;");
  });

  it("removes the card-style shadows from the public agent detail page", () => {
    expect(stylesSource).toContain("container:");
    expect(stylesSource).not.toContain("0 12px 32px -4px");
  });

  it("gives owner actions visible text labels instead of icon-only buttons", () => {
    expect(source).toContain('title={t("edit")}');
    // 缩进不参与契约：只要求 edit 按钮的 children 是可见文案而非纯图标。
    expect(source).toMatch(/\{t\("edit"\)\}\s*<\/Button>/);
    // 契约是「有图标 + 有可见文案」，图标尺寸属于样式细节，不进契约
    // （改版把 16 调成了 14，不该因此让测试红）。
    expect(source).toMatch(/icon=\{<LuPencil size=\{\d+\} aria-hidden="true" \/>\}/);
  });
});
