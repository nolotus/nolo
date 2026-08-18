import {
  resolveAvatarUrl
} from "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  formatModelCostPerMillion
} from "/public/assets/chunks/chunk-5IJJ57JD.js";
import {
  asRecordOrEmpty,
  format,
  toTimestampMs
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asNonEmptyStringArray,
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";

// packages/ai/agent/web/agentDisplayUtils.ts
var buildAgentThreadOverviewFromApi = ({
  threads,
  untitledDialogLabel
}) => {
  const groups = {
    running: [],
    future: [],
    recent: []
  };
  for (const thread of threads) {
    const entry = {
      agentKey: thread.primaryAgentKey,
      dbKey: toNonEmptyString(thread.dialogKey) || toNonEmptyString(thread.dialogId) || thread.threadId,
      listSection: thread.section,
      spaceId: null,
      spaceName: null,
      status: thread.status,
      threadKind: thread.threadKind,
      ...thread.runtimeEvidence ? { runtimeEvidence: thread.runtimeEvidence } : {},
      title: toNonEmptyString(thread.title) || untitledDialogLabel,
      updatedAt: thread.updatedAt
    };
    groups[thread.section].push(entry);
  }
  return groups;
};
var formatCliProviderLabel = (provider) => {
  if (provider === "codex") return "OpenAI Codex CLI (codex exec)";
  if (provider === "gemini") return "Gemini CLI (gemini)";
  if (provider === "claude") return "Claude CLI (claude)";
  if (provider === "agy") return "Google Antigravity CLI (agy)";
  if (provider === "qoder") return "Qoder CLI (qoder)";
  if (provider === "opencode") return "OpenCode CLI (opencode)";
  if (provider === "grok") return "Grok CLI (grok)";
  if (provider === "kimi") return "Kimi Code CLI (kimi)";
  return "GitHub Copilot CLI (gh copilot)";
};
var formatRuntimeLocationLabel = (machineId, localLabel = "\u9ED8\u8BA4\u73AF\u5883") => machineId ? `\u8FDC\u7A0B\u7535\u8111 (${machineId})` : localLabel;
var toNonEmptyString = (value) => asOptionalTrimmedString(value) ?? null;
var toTimestamp = toTimestampMs;
var formatDateValue = (value, pattern) => {
  const timestamp = toTimestamp(value);
  return timestamp > 0 ? format(new Date(timestamp), pattern) : "--";
};
var shouldShowAgentTokenCost = (agent, priceHint) => !!agent && agent.apiSource !== "cli" && priceHint?.type === "per_turn" && (asOptionalFiniteNumber(agent.inputPrice) !== void 0 || asOptionalFiniteNumber(agent.outputPrice) !== void 0);
var formatAgentOutputPrice = (outputPrice) => outputPrice === 0 ? formatModelCostPerMillion(outputPrice) : `1M / ${formatModelCostPerMillion(outputPrice)}`;
var isAutomationRunDialog = (dialog) => dialog.triggerType === "automation_run" || dialog.triggerType === "scheduled_run" || Boolean(dialog.parentAutomationKey) || Boolean(dialog.parentTaskKey);
var resolveAgentCreatorSummary = ({
  item,
  creatorProfile,
  server,
  unknownUserLabel
}) => {
  const name = toNonEmptyString(creatorProfile?.nickname) || toNonEmptyString(creatorProfile?.name) || toNonEmptyString(creatorProfile?.username) || toNonEmptyString(item.userName) || toNonEmptyString(item.creatorName) || toNonEmptyString(item.userId) || unknownUserLabel;
  const creatorAvatarRaw = toNonEmptyString(
    creatorProfile?.avatarFileId || creatorProfile?.avatar || creatorProfile?.avatarUrl || item.creator?.avatarFileId || item.creator?.avatar || item.creatorAvatar || item.userAvatar || item.authorAvatar
  );
  return {
    avatarUrl: creatorAvatarRaw ? resolveAvatarUrl(creatorAvatarRaw, item.originServer || server) : null,
    name
  };
};
var buildAgentDialogHistory = ({
  historyAgentKeys,
  historySpaceNameById,
  limit = 8,
  records,
  untitledDialogLabel
}) => records.flatMap((record) => {
  const dialog = record;
  if (isAutomationRunDialog(dialog)) return [];
  const cybots = asNonEmptyStringArray(dialog.cybots);
  if (!cybots.some((dialogAgentKey) => historyAgentKeys.has(dialogAgentKey))) {
    return [];
  }
  const dbKey = toNonEmptyString(dialog.dbKey);
  if (!dbKey) return [];
  return [
    {
      dbKey,
      spaceId: toNonEmptyString(dialog.spaceId),
      title: toNonEmptyString(dialog.title) || untitledDialogLabel,
      updatedAt: dialog.updatedAt ?? dialog.createdAt
    }
  ];
}).sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)).slice(0, limit).map((dialog) => ({
  ...dialog,
  spaceName: dialog.spaceId ? historySpaceNameById.get(dialog.spaceId) ?? dialog.spaceId : null
}));
var readAgentThreadSummary = (dialog) => {
  const summary = asRecordOrEmpty(dialog.agentThread);
  const listSection = summary.listSection === "running" || summary.listSection === "future" || summary.listSection === "recent" ? summary.listSection : dialog.status === "running" || dialog.status === "pending" ? "running" : "recent";
  return {
    agentKey: toNonEmptyString(summary.agentKey) || toNonEmptyString(dialog.primaryAgentKey) || null,
    listSection,
    status: toNonEmptyString(summary.status) || toNonEmptyString(dialog.status),
    threadKind: toNonEmptyString(summary.threadKind) || toNonEmptyString(dialog.threadKind)
  };
};
var buildRuntimeEvidenceFromCheckpoint = (checkpoint) => {
  if (!isRecord(checkpoint)) return void 0;
  const runtimeBinding = isRecord(checkpoint.runtimeBinding) ? checkpoint.runtimeBinding : void 0;
  const workspaceLease = isRecord(runtimeBinding?.workspaceLease) ? runtimeBinding.workspaceLease : void 0;
  const evidence = isRecord(workspaceLease?.evidence) ? workspaceLease.evidence : void 0;
  const lastToolNames = asNonEmptyStringArray(checkpoint.lastToolNames);
  const rawToolCallCount = checkpoint.toolCallCount;
  const toolCallCount = asOptionalFiniteNumber(rawToolCallCount);
  const runtimeToolPolicySnapshot = runtimeBinding?.runtimeToolPolicySnapshot;
  if (lastToolNames.length === 0 && toolCallCount === void 0 && !workspaceLease && !runtimeToolPolicySnapshot && !toNonEmptyString(checkpoint.status)) {
    return void 0;
  }
  return {
    ...toNonEmptyString(checkpoint.status) ? { status: toNonEmptyString(checkpoint.status) ?? void 0 } : {},
    lastToolNames,
    ...toolCallCount !== void 0 ? { toolCallCount } : {},
    ...workspaceLease ? {
      workspaceLease: {
        ...toNonEmptyString(workspaceLease.source) ? { source: toNonEmptyString(workspaceLease.source) ?? void 0 } : {},
        ...toNonEmptyString(evidence?.artifactKind) ? { artifactKind: toNonEmptyString(evidence?.artifactKind) ?? void 0 } : {}
      }
    } : {},
    hasRuntimeToolPolicySnapshot: isRecord(runtimeToolPolicySnapshot)
  };
};
var buildAgentThreadOverview = ({
  historyAgentKeys,
  historySpaceNameById,
  limitPerSection = 6,
  records,
  untitledDialogLabel
}) => {
  const groups = {
    running: [],
    future: [],
    recent: []
  };
  const entries = records.flatMap((record) => {
    const dialog = record;
    if (isAutomationRunDialog(dialog)) return [];
    const thread = readAgentThreadSummary(dialog);
    const cybots = asNonEmptyStringArray(dialog.cybots);
    const matchesAgent = thread.agentKey && historyAgentKeys.has(thread.agentKey) || cybots.some((dialogAgentKey) => historyAgentKeys.has(dialogAgentKey));
    if (!matchesAgent) return [];
    const dbKey = toNonEmptyString(dialog.dbKey);
    if (!dbKey) return [];
    const runtimeEvidence = buildRuntimeEvidenceFromCheckpoint(
      dialog.runtimeCheckpoint
    );
    return [
      {
        agentKey: thread.agentKey,
        dbKey,
        listSection: thread.listSection,
        spaceId: toNonEmptyString(dialog.spaceId),
        status: thread.status,
        threadKind: thread.threadKind,
        title: toNonEmptyString(dialog.title) || untitledDialogLabel,
        updatedAt: dialog.updatedAt ?? dialog.createdAt,
        ...runtimeEvidence ? { runtimeEvidence } : {}
      }
    ];
  }).sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)).map((dialog) => ({
    ...dialog,
    spaceName: dialog.spaceId ? historySpaceNameById.get(dialog.spaceId) ?? dialog.spaceId : null
  }));
  for (const entry of entries) {
    groups[entry.listSection].push(entry);
  }
  return {
    running: groups.running.slice(0, limitPerSection),
    future: groups.future.slice(0, limitPerSection),
    recent: groups.recent.slice(0, limitPerSection)
  };
};
var normalizeAgentEmailAddress = (value) => {
  const trimmed = toNonEmptyString(value);
  return trimmed ? trimmed.toLowerCase() : null;
};
var formatAgentEmailReadinessLabel = (status) => {
  switch (status) {
    case "ready":
      return "\u53EF\u6536\u4FE1";
    case "warming":
      return "\u9884\u70ED\u4E2D";
    case "failed_warmup":
      return "\u6536\u4FE1\u672A\u5C31\u7EEA";
    case "created":
      return "\u5DF2\u521B\u5EFA";
    default:
      return "";
  }
};
var buildAgentEmailBindingSummary = (agent) => {
  const meta = agent?.meta;
  const primaryEmail = normalizeAgentEmailAddress(meta?.emailAddress);
  const provider = toNonEmptyString(meta?.emailProvider);
  const identities = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (raw) => {
    if (!raw || raw.disabledAt) return;
    const emailAddress = normalizeAgentEmailAddress(raw.emailAddress);
    if (!emailAddress || seen.has(emailAddress)) return;
    seen.add(emailAddress);
    identities.push({
      emailAddress,
      isPrimary: primaryEmail === emailAddress,
      provider: toNonEmptyString(raw.provider) || void 0,
      purpose: toNonEmptyString(raw.purpose) || void 0,
      source: toNonEmptyString(raw.source) || void 0,
      readinessStatus: typeof raw.readinessStatus === "string" ? raw.readinessStatus : null
    });
  };
  if (primaryEmail) {
    push({
      emailAddress: primaryEmail,
      provider: meta?.emailProvider,
      readinessStatus: meta?.emailReadinessStatus,
      source: "bound"
    });
  }
  if (Array.isArray(meta?.emailIdentities)) {
    for (const entry of meta.emailIdentities) {
      if (isRecord(entry)) {
        push(entry);
      }
    }
  }
  return {
    primaryEmail,
    provider: provider || identities[0]?.provider || null,
    identities
  };
};

export {
  buildAgentThreadOverviewFromApi,
  formatCliProviderLabel,
  formatRuntimeLocationLabel,
  toNonEmptyString,
  toTimestamp,
  formatDateValue,
  shouldShowAgentTokenCost,
  formatAgentOutputPrice,
  resolveAgentCreatorSummary,
  buildAgentDialogHistory,
  buildAgentThreadOverview,
  formatAgentEmailReadinessLabel,
  buildAgentEmailBindingSummary
};
