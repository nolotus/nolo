// packages/ai/tools/agent/listRuntimesTool.ts

import {
  buildRuntimeCatalog,
  resolveDockerReadiness,
  type RuntimeCatalog,
  type RuntimeCatalogDeps,
  type RuntimeSummary,
} from "../../../server/handlers/agentRun/runtimeCatalog";
import {
  normalizeDockerReadiness,
  type DockerRuntimeReadiness,
  type DockerRuntimeReadinessSource,
} from "../../../server/handlers/agentRun/dockerRuntimeReadiness";
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
    // 就绪卡片才带额度摘要（额度不可核实的运行时不输出任何「就绪」暗示）。
    const quota = r.selectable && r.quotaSnapshot
      ? ` [quota: ${r.quotaSnapshot.remaining ?? "unknown"} ${r.quotaSnapshot.unit ?? ""} @ ${r.quotaSnapshot.source}]`
      : "";
    return `- [${statusIcon}] ${r.name} (${r.kind}) - ${r.status}${reason}${quota} [key: ${r.runtimeKey}]`;
  });
  return `Available Runtimes:\n${lines.join("\n")}`;
}

export type ListRuntimesTrustedContext = Partial<RuntimeCatalogDeps> & {
  /**
   * 生产接线：docker 就绪探测的**单例源**（`createDefaultDockerRuntimeReadinessSource`）。
   * 传源 = 每次真正探测；传 `dockerReadiness`（快照）= 只消费既有结论。
   */
  dockerReadinessSource?: DockerRuntimeReadinessSource;
};

/**
 * docker 就绪判定：探测源（最权威）> 就绪快照 > 旧注入面（dockerSelectable）。
 * 一律 fail-closed：任何异常 / 缺省都返回不可用，绝不默认放行。
 */
export async function resolveTrustedDockerReadiness(
  thunkApi?: any,
  trustedContext?: ListRuntimesTrustedContext,
): Promise<DockerRuntimeReadiness> {
  const source = trustedContext?.dockerReadinessSource ?? thunkApi?.extra?.dockerReadinessSource;
  if (source && typeof source.get === "function") {
    try {
      return normalizeDockerReadiness(await source.get());
    } catch {
      return {
        ready: false,
        reason: "not-configured",
        details: "docker readiness source failed; execution stays closed",
      };
    }
  }
  const injected = trustedContext?.dockerReadiness ?? thunkApi?.extra?.dockerReadiness;
  if (injected) return normalizeDockerReadiness(injected);
  return resolveDockerReadiness({
    dockerSelectable:
      trustedContext?.dockerSelectable === true || thunkApi?.extra?.dockerSelectable === true,
    dockerQuotaSnapshot: trustedContext?.dockerQuotaSnapshot ?? thunkApi?.extra?.dockerQuotaSnapshot,
  });
}

/**
 * 服务端专用兜底：docker 账户绑定的真相只存在于 server handlers
 * （bun:sqlite / node:crypto / node:path，并连带 dockerSandboxExecutionBackend 等）。
 * 这里用动态 import 而不是静态 import：工具注册表所在的 web 图不再静态可达
 * server-only 模块；esbuild web 构建把该模块重定向到 fail-closed stub。
 * 加载失败（模块不可用）一律 fail-closed：返回 undefined，绝不默认放行。
 */
async function loadDockerBindingIsBoundFallback(): Promise<
  ((caller: string) => boolean) | undefined
> {
  try {
    const { getDockerBindingAuthorizer } = await import(
      "../../../server/handlers/agentRun/dockerWorkloadLifecycle"
    );
    return (caller: string) => Boolean(getDockerBindingAuthorizer().isBound?.(caller));
  } catch {
    return undefined;
  }
}

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
  const dockerReadiness = await resolveTrustedDockerReadiness(thunkApi, trustedContext);
  const isDockerBound =
    trustedContext?.isDockerBound ??
    thunkApi?.extra?.isDockerBound ??
    (trustedContext?.dockerSelectable === true ? (() => true) : undefined) ??
    (trustedContext?.dockerReadinessSource ? (() => true) : undefined) ??
    (await loadDockerBindingIsBoundFallback());

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
    dockerReadiness,
    isDockerBound,
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
