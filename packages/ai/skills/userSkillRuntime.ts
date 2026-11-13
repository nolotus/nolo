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
import {
  buildAgentSkillPreferenceDiagnostic,
  reportAgentSkillPreferenceDiagnostic,
} from "./agentSkillPreferenceDiagnostics";
import type { PromptSkillConfigSource } from "./userPromptSkills";
import { isAccountOnDemandWorkflowSkill, resolveUserEnabledSkills } from "./userSkills";

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
  const requiredSlugs = new Set<string>();
  for (const [identifier, mode] of Object.entries(resolveAgentSkillConfig(effectiveConfig))) {
    const entry = resolveBuiltinSkillEntry(identifier);
    if (!entry) continue;
    if (mode === "disabled") disabledSlugs.add(entry.slug);
    if (mode === "required") requiredSlugs.add(entry.slug);
  }

  // 账号级启用 skill 列表（解析口径见 ai/skills/userSkills）。
  const enabledSkills = resolveUserEnabledSkills(preferences);

  // 【诊断】偏好真正被消费的边界就在这里：打印偏好来源、实际解析出的启用
  // skill 列表、agent 级档位，以及读路径丢弃掉的非法条目。非法档位在读
  // 路径是被静默丢弃的（见 ai/tools/agentSkillConfig），没有这条诊断就
  // 无法解释「账号记录写着 auto-review，实际 run 却注入了 ub-mode」。
  // 只输出 slug / 档位值 / 计数，不含任何凭据或正文；同一进程内相同快照
  // 只打印一次。
  reportAgentSkillPreferenceDiagnostic(
    buildAgentSkillPreferenceDiagnostic({
      agentConfig: effectiveConfig,
      preferences,
      enabledSkills,
    }),
  );

  const graph = await resolveSkillGraphFromRoots({
    roots: enabledSkills.map((identifier) => ({
      identifier,
      mode: isAccountOnDemandWorkflowSkill(identifier) && !requiredSlugs.has(identifier)
        ? "recommended" as const
        : "required" as const,
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
    if (visit.mode !== "required" || seen.has(visit.dbKey)) continue;
    seen.add(visit.dbKey);
    const page = contentByKey.get(visit.dbKey);
    const patch = (visit.meta?.skillConfig?.promptPatch ||
      parseSkillDocProtocol(page?.content ?? "", visit.meta).content).trim();
    if (patch) skillPromptPatches.add(patch);
  }

  return { ...graph, contentByKey, skillPromptPatches: [...skillPromptPatches] };
}
