import { canonicalizeToolName } from "./toolNameAliases";

export type ToolReplaySemantics =
  | "pure"
  | "idempotent"
  | "deduplicated"
  | "unsafe"
  | "unknown";

export type ToolSideEffectSemantics =
  | "none"
  | "observable"
  | "mutation"
  | "unknown";

/** Where the executor itself runs, not where the underlying data originates. */
export type ToolExecutionLocality =
  | "server"
  | "workspace"
  | "device"
  | "external"
  | "unknown";

export type ToolExecutionInteraction =
  | "none"
  | "blocking"
  /** Explicit confirmed human hand-off: the tool returns a structured
   * `{ status: "requires_confirmation" }` result and the current execution
   * pauses for the user instead of continuing in the same turn. Distinct from
   * `blocking` (ask_user's durable interactive plane) and from `confirm`
   * (confirmation *before* execution). */
  | "handoff"
  | "confirm"
  | "authorize"
  | "unknown";

/**
 * Whether sibling calls may run concurrently without semantic conflicts.
 * This does not imply replay safety, zero cost or durable-Web admission.
 * Unknown tools resolve to `exclusive` so future scheduling fails closed.
 */
export type ToolConcurrencySemantics = "safe" | "exclusive";

export type DurableWebForegroundClass = "read-only" | "interactive" | false;

export type ToolExecutionContract = {
  replay: ToolReplaySemantics;
  sideEffects: ToolSideEffectSemantics;
  locality: ToolExecutionLocality;
  interaction: ToolExecutionInteraction;
  concurrency: ToolConcurrencySemantics;
  /**
   * Product admission status for the server-owned Web foreground plane.
   *
   * This is explicit rather than inferred. A tool can be operationally read-only
   * but still not have proven projection/recovery/Stop/F5 parity. Conversely an
   * external read may have observable cost/quota effects yet remain safe for the
   * current at-most-once durable foreground because the runtime does not replay it.
   */
  durableWebForeground: DurableWebForegroundClass;
};

export type ToolExecutionSemantics = Omit<
  ToolExecutionContract,
  "durableWebForeground"
>;

export const UNKNOWN_TOOL_EXECUTION_CONTRACT: ToolExecutionContract = {
  replay: "unknown",
  sideEffects: "unknown",
  locality: "unknown",
  interaction: "unknown",
  concurrency: "exclusive",
  durableWebForeground: false,
};

export const UNKNOWN_TOOL_EXECUTION_SEMANTICS: ToolExecutionSemantics = {
  replay: "unknown",
  sideEffects: "unknown",
  locality: "unknown",
  interaction: "unknown",
  concurrency: "exclusive",
};

const serverPureRead = (
  durableWebForeground: DurableWebForegroundClass,
): ToolExecutionContract => ({
  replay: "pure",
  sideEffects: "none",
  locality: "server",
  interaction: "none",
  concurrency: "safe",
  durableWebForeground,
});

const serverExternalRead = (
  durableWebForeground: DurableWebForegroundClass,
): ToolExecutionContract => ({
  // Repeating the request should not mutate the target resource, but may spend
  // provider quota/money and may observe newer remote state; it is not pure.
  replay: "idempotent",
  sideEffects: "observable",
  locality: "server",
  interaction: "none",
  concurrency: "safe",
  durableWebForeground,
});

/**
 * Confirmed human hand-off step: server-hosted, may spend provider quota, and
 * finishes by asking the user to confirm instead of doing the work.
 */
const serverConfirmedHandoffStep = (): ToolExecutionContract => ({
  replay: "unsafe",
  sideEffects: "observable",
  locality: "server",
  interaction: "handoff",
  concurrency: "exclusive",
  durableWebForeground: false,
});

/**
 * Single execution-policy source for canonical tool names.
 *
 * Keep UI grouping, prompt metadata and capability packs elsewhere. This table
 * owns only execution/recovery semantics plus the current durable-Web product
 * admission decision. Missing tools resolve to UNKNOWN and fail closed.
 *
 * Adding/removing a durable tool should normally require one edit here; all
 * durable Web sets are derived below rather than duplicated in eligibility.
 */
export const TOOL_EXECUTION_CONTRACT: Readonly<
  Record<string, ToolExecutionContract>
> = Object.freeze({
  // Proven durable network reads. They execute on the server but touch external
  // systems, so replay/cost semantics are intentionally not called "pure".
  exa_search: serverExternalRead("read-only"),
  fetchWebpage: serverExternalRead("read-only"),

  // Proven durable server-hosted workspace reads/queries.
  searchDialogMessages: serverPureRead("read-only"),
  listDialogs: serverPureRead("read-only"),
  readDialog: serverPureRead("read-only"),
  queryDialogsBySubjectRef: serverPureRead("read-only"),
  listAgents: serverPureRead("read-only"),
  readAgent: serverPureRead("read-only"),
  listSpaces: serverPureRead("read-only"),
  readSpace: serverPureRead("read-only"),
  readDoc: serverPureRead("read-only"),
  readSkillDoc: serverPureRead("read-only"),
  listTables: serverPureRead("read-only"),
  queryTableRows: serverPureRead("read-only"),
  list_cloud_resources: serverPureRead("read-only"),
  cloud_probe: serverPureRead("read-only"),

  // Audited execution against an owned cloud resource. Same class as execShell
  // (arbitrary command, not replayable), except the executor itself runs on the
  // server through the authorization/capability/audit gate. Never read-only.
  cloud_exec: {
    replay: "unsafe",
    sideEffects: "mutation",
    locality: "server",
    interaction: "none",
    concurrency: "exclusive",
    durableWebForeground: false,
  },

  // Read-only presentation payload. Actions remain inert; this adds no submit or
  // open-app authority to server-owned projection.
  show_interaction: {
    replay: "pure",
    sideEffects: "none",
    locality: "server",
    interaction: "none",
    concurrency: "safe",
    durableWebForeground: "read-only",
  },

  // Durable interactive boundary: the current execution ends and a later user
  // choice starts a new execution. It is intentionally not modeled as a read.
  ask_user: {
    replay: "unsafe",
    sideEffects: "observable",
    locality: "server",
    interaction: "blocking",
    concurrency: "exclusive",
    durableWebForeground: "interactive",
  },

  // Confirmed human hand-off boundary for the media step family. These tools
  // do not start work needing authorization: they return
  // `{ status: "requires_confirmation", ... }` and the run must stop and wait
  // for the user. Registered explicitly (rather than inferred from any status)
  // so a random tool echoing the same status never pauses the run, and kept out
  // of the durable Web foreground plane on purpose (media ServerTool admission
  // is owned elsewhere).
  transcribe: serverConfirmedHandoffStep(),
  translate: serverConfirmedHandoffStep(),
  exportDocument: serverConfirmedHandoffStep(),
  readArtifact: serverConfirmedHandoffStep(),

  // Representative explicitly non-durable execution classes. These entries
  // make the reason machine-readable; unlisted tools remain UNKNOWN.
  execShell: {
    replay: "unsafe",
    sideEffects: "mutation",
    locality: "workspace",
    interaction: "none",
    concurrency: "exclusive",
    durableWebForeground: false,
  },
  readFile: {
    replay: "idempotent",
    sideEffects: "none",
    locality: "device",
    interaction: "none",
    concurrency: "safe",
    durableWebForeground: false,
  },
  globFiles: {
    replay: "idempotent",
    sideEffects: "none",
    locality: "device",
    interaction: "none",
    concurrency: "safe",
    durableWebForeground: false,
  },
  createDoc: {
    replay: "unsafe",
    sideEffects: "mutation",
    locality: "server",
    interaction: "none",
    concurrency: "exclusive",
    durableWebForeground: false,
  },
  updateDoc: {
    replay: "unsafe",
    sideEffects: "mutation",
    locality: "server",
    interaction: "none",
    concurrency: "exclusive",
    durableWebForeground: false,
  },
  deleteDialogs: {
    replay: "unsafe",
    sideEffects: "mutation",
    locality: "server",
    interaction: "confirm",
    concurrency: "exclusive",
    durableWebForeground: false,
  },
  loadSkill: {
    replay: "unsafe",
    sideEffects: "observable",
    locality: "server",
    interaction: "none",
    concurrency: "exclusive",
    durableWebForeground: false,
  },
});

export function resolveToolExecutionContract(
  toolName: unknown,
): ToolExecutionContract {
  if (typeof toolName !== "string" || !toolName.trim()) {
    return UNKNOWN_TOOL_EXECUTION_CONTRACT;
  }
  const canonicalName = canonicalizeToolName(toolName);
  return TOOL_EXECUTION_CONTRACT[canonicalName] ?? UNKNOWN_TOOL_EXECUTION_CONTRACT;
}

export function resolveToolExecutionSemantics(
  toolName: unknown,
): ToolExecutionSemantics {
  const { replay, sideEffects, locality, interaction, concurrency } =
    resolveToolExecutionContract(toolName);
  return { replay, sideEffects, locality, interaction, concurrency };
}

function collectDurableWebToolNames(
  durableClass: Exclude<DurableWebForegroundClass, false>,
): ReadonlySet<string> {
  return new Set(
    Object.entries(TOOL_EXECUTION_CONTRACT)
      .filter(([, contract]) => contract.durableWebForeground === durableClass)
      .map(([name]) => name),
  );
}

export const DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES =
  collectDurableWebToolNames("read-only");

export const DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES =
  collectDurableWebToolNames("interactive");

export const DURABLE_WEB_FOREGROUND_TOOL_NAMES: ReadonlySet<string> = new Set([
  ...DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES,
  ...DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES,
]);

export function isDurableWebForegroundToolName(toolName: unknown): boolean {
  if (typeof toolName !== "string" || !toolName.trim()) return false;
  return DURABLE_WEB_FOREGROUND_TOOL_NAMES.has(canonicalizeToolName(toolName));
}

/**
 * Structured tool-result status that marks an explicit confirmed hand-off.
 *
 * Shared with the runtime predicate (`isConfirmedHandoffToolResult`) and with
 * the planned uniform protocol block, so the status string has one owner.
 */
export const TOOL_RESULT_REQUIRES_CONFIRMATION_STATUS = "requires_confirmation";

/**
 * Tools whose contract declares an explicit confirmed human hand-off. Derived
 * from the contract table (single source) instead of another name list here.
 */
export const CONFIRMED_HANDOFF_TOOL_NAMES: ReadonlySet<string> = new Set(
  Object.entries(TOOL_EXECUTION_CONTRACT)
    .filter(([, contract]) => contract.interaction === "handoff")
    .map(([name]) => name),
);

/**
 * Whether this tool is *allowed* to pause a run via `requires_confirmation`.
 * The allowlist is the point: a status string alone is never evidence.
 */
export function isConfirmedHandoffToolName(toolName: unknown): boolean {
  if (typeof toolName !== "string" || !toolName.trim()) return false;
  return CONFIRMED_HANDOFF_TOOL_NAMES.has(canonicalizeToolName(toolName));
}

export function isConcurrencySafeToolName(toolName: unknown): boolean {
  return resolveToolExecutionContract(toolName).concurrency === "safe";
}

/**
 * Read-only here means no target mutation and server execution. Observable
 * effects such as external request cost/quota are allowed because current Web
 * durable foreground is at-most-once and does not auto-replay tool calls.
 */
export function hasProvenServerReadOnlySemantics(toolName: unknown): boolean {
  const contract = resolveToolExecutionContract(toolName);
  return (
    contract.durableWebForeground === "read-only" &&
    (contract.replay === "pure" || contract.replay === "idempotent") &&
    (contract.sideEffects === "none" || contract.sideEffects === "observable") &&
    contract.locality === "server" &&
    contract.interaction === "none"
  );
}

export function hasProvenDurableWebForegroundSemantics(
  toolName: unknown,
): boolean {
  const contract = resolveToolExecutionContract(toolName);
  if (contract.durableWebForeground === "read-only") {
    return hasProvenServerReadOnlySemantics(toolName);
  }
  if (contract.durableWebForeground === "interactive") {
    return (
      contract.locality === "server" &&
      contract.interaction === "blocking" &&
      contract.sideEffects === "observable"
    );
  }
  return false;
}
