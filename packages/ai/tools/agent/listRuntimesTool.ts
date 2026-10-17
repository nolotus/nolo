// packages/ai/tools/agent/listRuntimesTool.ts

import {
  buildRuntimeCatalog,
  type RuntimeCatalog,
  type RuntimeCatalogDeps,
  type RuntimeSummary,
} from "server/handlers/agentRun/runtimeCatalog";
import { selectIdentityUserId } from "identity/selectors";

export const listRuntimesFunctionSchema = {
  name: "listRuntimes",
  description:
    "List available agent runtime execution environments (such as server, local, or connected machines). Returns RuntimeSummary items with runtimeKey and selectable status for delegation targeting.",
  parameters: {
    type: "object",
    properties: {},
  },
} as const;

export type ListRuntimesResult = {
  rawData: {
    success: boolean;
    runtimes: RuntimeSummary[];
    selectableCount: number;
    error?: string;
  };
  displayData: string;
};

export function formatRuntimeSummaryCard(runtimes: RuntimeSummary[]): string {
  if (!runtimes.length) return "No runtimes available.";
  const lines = runtimes.map((r) => {
    const statusIcon = r.selectable ? "✓" : "✗";
    const details = r.details ? `: ${r.details}` : "";
    const reason = r.reason ? ` (${r.reason}${details})` : "";
    return `- [${statusIcon}] ${r.name} (${r.kind}) - ${r.status}${reason} [key: ${r.runtimeKey}]`;
  });
  return `Available Runtimes:\n${lines.join("\n")}`;
}

export type ListRuntimesTrustedContext = Partial<RuntimeCatalogDeps>;

/**
 * Trusted caller identity, in strict precedence order:
 *
 * 1. `trustedContext.callerUserId` — the explicit composition-root binding.
 *    A supplied-but-blank value fail-closes: it is never treated as "absent",
 *    so a caller that means "no caller" cannot silently inherit store identity.
 * 2. `selectIdentityUserId(thunkApi.getState())` — the repo-standard identity
 *    selector. Phase 5 deleted the Redux auth slice, so there is no
 *    `state.identity.userId` to read; identity lives in the session runtime the
 *    owning store stamps onto its states (`withIdentitySessionReader`). Reading
 *    a non-existent field made every production call look unauthenticated.
 * 3. `thunkApi.extra.userId` — host-provided trusted extra (never model args).
 */
function resolveTrustedCallerUserId(
  thunkApi?: any,
  trustedContext?: ListRuntimesTrustedContext,
): string | undefined {
  const bound = trustedContext?.callerUserId;
  if (bound !== undefined && bound !== null) return bound;

  const fromStore = selectIdentityUserId(thunkApi?.getState?.());
  if (fromStore) return fromStore;

  const fromExtra = thunkApi?.extra?.userId;
  return typeof fromExtra === "string" ? fromExtra : undefined;
}

export async function listRuntimesToolFunc(
  _args: unknown,
  thunkApi?: any,
  trustedContext?: ListRuntimesTrustedContext,
): Promise<ListRuntimesResult> {
  // CRITICAL: Never trust _args for callerUserId, serverScope, or credentials.
  // Model-provided fields in _args are explicitly ignored.

  // Production passes only { parentMessageId, toolRunId, agentKey } as the
  // trusted context, so the caller identity normally comes from the store-bound
  // session through the standard selector.
  const callerUserId = resolveTrustedCallerUserId(thunkApi, trustedContext);

  // Resolve trusted serverScope from trustedContext or environment
  const serverScope =
    trustedContext?.serverScope ??
    process.env.NOLO_RUNTIME_SCOPE ??
    "default";

  // Resolve trusted dependencies
  const machineRegistry =
    trustedContext?.machineRegistry ??
    thunkApi?.extra?.machineRegistry ?? {
      listMachines: () => [],
    };

  const connectorConnections =
    trustedContext?.connectorConnections ??
    thunkApi?.extra?.connectorConnections ?? {
      hasConnection: () => false,
    };

  const serverSelectable = trustedContext?.serverSelectable ?? true;
  const connectorSurface = trustedContext?.connectorSurface ?? "cli";
  const dockerSelectable = trustedContext?.dockerSelectable === true || thunkApi?.extra?.dockerSelectable === true;
  const dockerQuotaSnapshot = dockerSelectable
    ? (trustedContext?.dockerQuotaSnapshot ?? thunkApi?.extra?.dockerQuotaSnapshot)
    : undefined;

  if (!callerUserId || !callerUserId.trim()) {
    return {
      rawData: {
        success: false,
        runtimes: [],
        selectableCount: 0,
        error: "callerUserId is required and missing from trusted context",
      },
      displayData: "No runtimes available (unauthenticated).",
    };
  }

  const catalog = buildRuntimeCatalog({
    callerUserId,
    serverScope,
    serverSelectable,
    connectorSurface,
    machineRegistry,
    connectorConnections,
    ...(dockerSelectable !== undefined ? { dockerSelectable } : {}),
    ...(dockerQuotaSnapshot ? { dockerQuotaSnapshot } : {}),
  });

  return {
    rawData: {
      success: true,
      runtimes: catalog.runtimes,
      selectableCount: catalog.selectableCount,
    },
    displayData: formatRuntimeSummaryCard(catalog.runtimes),
  };
}
