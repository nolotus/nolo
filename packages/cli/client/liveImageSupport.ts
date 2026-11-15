import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import { resolveCatalogImageSupport, withLiveImageSupport, type AgentCapabilityConfig } from "../../ai/llm/agentCapabilities";
import type { AntigravityAvailableModel } from "../oauth/flows/antigravity";

type Config = AgentCapabilityConfig & {
  key?: string;
  userId?: unknown;
  ownerUserId?: unknown;
  rawRecord?: Record<string, unknown>;
};

/** Adapter-local, lazy and single-flight. No discovery or token read before ownership/route checks. */
export function createLiveImageSupportResolver(
  userId: string,
  discover: () => Promise<Record<string, AntigravityAvailableModel>>,
  timeoutMs = 5_000,
) {
  let discovery: Promise<Record<string, AntigravityAvailableModel>> | undefined;
  return async <T extends Config>(config: T): Promise<T> => {
    if (resolveCatalogImageSupport(config) !== undefined) return config;
    const plan = resolveAgentCallPlan({ ...config, key: config.key ?? "" } as Parameters<typeof resolveAgentCallPlan>[0]);
    if (plan.authMethod.kind !== "oauth" || plan.authMethod.ref !== "antigravity") return config;
    const raw = config.rawRecord ?? config;
    const owner = typeof raw.userId === "string" && raw.userId.trim()
      ? raw.userId.trim() : typeof raw.ownerUserId === "string" ? raw.ownerUserId.trim() : undefined;
    if (!userId || owner !== userId) return withLiveImageSupport(config, false);
    discovery ??= new Promise<Record<string, AntigravityAvailableModel>>((resolve) => {
      const timer = setTimeout(() => resolve({}), timeoutMs);
      Promise.resolve().then(discover).then(resolve, () => resolve({})).finally(() => clearTimeout(timer));
    });
    const models = await discovery;
    const model = config.model?.trim() ?? "";
    const entry = Object.hasOwn(models, model) ? models[model] : undefined;
    return withLiveImageSupport(config, entry?.supportsImages === true && entry.disabled !== true);
  };
}
