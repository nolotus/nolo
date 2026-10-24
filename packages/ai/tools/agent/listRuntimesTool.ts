// packages/ai/tools/agent/listRuntimesTool.ts

import {
  buildRuntimeCatalog,
  resolveDockerReadiness,
  type InstaboxReadiness,
  type RuntimeCatalog,
  type RuntimeCatalogDeps,
  type RuntimeSummary,
} from "../../../agent-runtime/runtimeCatalog";
import {
  normalizeDockerReadiness,
  type DockerRuntimeReadiness,
  type DockerRuntimeReadinessSource,
} from "../../../agent-runtime/dockerReadiness.stub";
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
  /**
   * 生产接线：instabox 就绪探测的单例源。
   * 传源 = 每次真正探测；传 `instaboxReadiness`（快照）= 只消费既有结论。
   */
  instaboxReadinessSource?: {
    get(callerUserId: string): Promise<InstaboxReadiness>;
    snapshot?(callerUserId: string): InstaboxReadiness;
  };
};

export type ListRuntimesServerHooks = {
  getDockerBindingAuthorizer?: () => { isBound?: (caller: string) => boolean };
  isInstaboxBound?: (callerUserId: string) => boolean | Promise<boolean>;
  getInstaboxReadiness?: (callerUserId: string) => Promise<InstaboxReadiness>;
};

let serverHooks: ListRuntimesServerHooks | undefined;

/**
 * 供服务端通过可信 DI 注册 server-only 绑定与就绪钩子。
 * 共享工具层不在 web 构建图中静态或动态 import server 模块。
 */
export function registerListRuntimesServerHooks(
  hooks: ListRuntimesServerHooks | undefined,
): void {
  serverHooks = hooks;
}

export function getRegisteredListRuntimesServerHooks(): ListRuntimesServerHooks | undefined {
  return serverHooks;
}

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

function loadDockerBindingIsBoundFallback(): ((caller: string) => boolean) | undefined {
  if (serverHooks?.getDockerBindingAuthorizer) {
    try {
      const authorizer = serverHooks.getDockerBindingAuthorizer();
      return (caller: string) => Boolean(authorizer?.isBound?.(caller));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function loadInstaboxBoundFallback(callerUserId?: string): Promise<boolean> {
  if (!callerUserId) return false;
  if (serverHooks?.isInstaboxBound) {
    try {
      return await serverHooks.isInstaboxBound(callerUserId);
    } catch {
      return false;
    }
  }
  return false;
}

export async function resolveTrustedInstaboxReadiness(
  callerUserId?: string,
  thunkApi?: any,
  trustedContext?: ListRuntimesTrustedContext,
  isInstaboxBound?: (caller: string) => boolean,
): Promise<InstaboxReadiness | undefined> {
  const source = trustedContext?.instaboxReadinessSource ?? thunkApi?.extra?.instaboxReadinessSource;
  if (source && typeof source.get === "function" && callerUserId) {
    try {
      return await source.get(callerUserId);
    } catch {
      return {
        ready: false,
        reason: "quota-unverifiable",
        details: "Instabox readiness source probe failed",
      };
    }
  }
  const injected = trustedContext?.instaboxReadiness ?? thunkApi?.extra?.instaboxReadiness;
  if (injected) return injected;
  if (callerUserId && isInstaboxBound?.(callerUserId)) {
    if (serverHooks?.getInstaboxReadiness) {
      try {
        return await serverHooks.getInstaboxReadiness(callerUserId);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Trusted caller identity, in strict precedence order:
 *
 * 1. `trustedContext.callerUserId` — the explicit composition-root binding.
 *    Explicit presence of the key in `trustedContext` (even if its value is
 *    `undefined`, `null`, empty string, or non-string) fail-closes and immediately
 *    evaluates to `""` — it is NEVER treated as "absent" and MUST NOT fall back
 *    to store or extra identities under any circumstances.
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
  if (trustedContext && "callerUserId" in trustedContext) {
    const bound = trustedContext.callerUserId;
    return typeof bound === "string" ? bound : "";
  }

  if (typeof thunkApi?.getState === "function") {
    const state = thunkApi.getState();
    if (state != null) {
      const fromStore = selectIdentityUserId(state);
      if (fromStore) return fromStore;
    }
  }

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

  const explicitInstaboxBound =
    trustedContext?.isInstaboxBound ?? thunkApi?.extra?.isInstaboxBound;
  let isInstaboxBound: ((caller: string) => boolean) | undefined = explicitInstaboxBound;
  if (!isInstaboxBound && callerUserId) {
    const bound = await loadInstaboxBoundFallback(callerUserId);
    isInstaboxBound = (caller: string) => (caller === callerUserId ? bound : false);
  }

  const instaboxReadiness = await resolveTrustedInstaboxReadiness(
    callerUserId,
    thunkApi,
    trustedContext,
    isInstaboxBound,
  );

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
    isInstaboxBound,
    instaboxReadiness,
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
