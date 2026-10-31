import {
  resolveBuiltinSkillEntry,
  resolveBuiltinSkillPage as resolveBuiltinSkillRuntimePage,
} from "./builtinSkillRegistry";
import {
  isAgentSkillDisabled,
  resolveAgentSkillConfig,
  type AgentSkillConfigSource,
} from "ai/tools/agentSkillConfig";
import {
  resolveSkillGraphFromRoots,
  type ResolvedSkillGraph,
} from "./referenceRuntime";
import { parseSkillDocProtocol } from "./skillDocProtocol";
import type { PromptSkillConfigSource } from "./userPromptSkills";
import { resolveUserEnabledSkills } from "./userSkills";

/** Account contributions only; callers merge these before tool admission. */
export async function resolveUserSkillRuntime(
  agentConfig: PromptSkillConfigSource | null | undefined,
  preferences: { enabledSkills?: unknown; enabledPromptSkills?: unknown } | null | undefined,
): Promise<ResolvedSkillGraph> {
  const effectiveConfig: AgentSkillConfigSource | null =
    agentConfig && typeof agentConfig === "object"
      ? ("rawRecord" in agentConfig && agentConfig.rawRecord &&
          typeof agentConfig.rawRecord === "object"
          ? agentConfig.rawRecord as AgentSkillConfigSource
          : agentConfig as AgentSkillConfigSource)
      : null;

  // Normalize identity aliases without changing the agent's persisted configuration.
  // Any explicit denial wins, including historical page keys and canonical ids.
  const disabledSlugs = new Set<string>();
  for (const identifier of Object.keys(resolveAgentSkillConfig(effectiveConfig))) {
    if (!isAgentSkillDisabled(effectiveConfig, identifier)) continue;
    const entry = resolveBuiltinSkillEntry(identifier);
    if (entry) disabledSlugs.add(entry.slug);
  }

  const graph = await resolveSkillGraphFromRoots({
    roots: resolveUserEnabledSkills(preferences).map((identifier) => ({
      identifier,
      mode: "required" as const,
    })),
    loadPage: async (identifier) => {
      const entry = resolveBuiltinSkillEntry(identifier);
      // The registry preserves the requested dbKey, so request canonical identity
      // to deduplicate slug/id/historical page aliases across independent roots.
      return entry ? resolveBuiltinSkillRuntimePage(entry.skillId) : null;
    },
    strictRequiredDependencies: true,
    admitSkill: (page, canonicalIdentifier) => {
      const entry = resolveBuiltinSkillEntry(canonicalIdentifier) ??
        resolveBuiltinSkillEntry(page?.dbKey);
      return !!entry && !disabledSlugs.has(entry.slug) &&
        !isAgentSkillDisabled(effectiveConfig, entry.slug);
    },
  });

  // The shared traversal owns admission and atomic root rollback. Only committed
  // visits may contribute body text or retained pages; its load cache can also
  // contain pages from rejected roots.
  const admittedKeys = new Set(graph.visits.map((visit) => visit.dbKey));
  const contentByKey = new Map(
    [...graph.contentByKey].filter(([, page]) => page?.dbKey && admittedKeys.has(page.dbKey)),
  );
  const skillPromptPatches = new Set<string>();
  const seen = new Set<string>();
  for (const visit of graph.visits) {
    if (seen.has(visit.dbKey)) continue;
    seen.add(visit.dbKey);
    const page = contentByKey.get(visit.dbKey);
    const patch = (visit.meta?.skillConfig?.promptPatch ||
      parseSkillDocProtocol(page?.content ?? "", visit.meta).content).trim();
    if (patch) skillPromptPatches.add(patch);
  }

  return { ...graph, contentByKey, skillPromptPatches: [...skillPromptPatches] };
}
