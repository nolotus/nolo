import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { formatSkillSlashReference } from "../../agent-runtime/skillSlashReference";
import { listBuiltinSkills, resolveBuiltinSkillSlug } from "ai/skills/builtinSkillRegistry";
import { collectSkillCandidatesFromSpace } from "ai/tools/loadSkillTool";
import { isAgentSkillDisabled, type AgentSkillConfigSource } from "ai/tools/agentSkillConfig";
import { createSpaceKey } from "create/space/spaceKeys";
import { normalizeServerOrigin } from "core/serverOrigin";
import { isRecord } from "core/isRecord";
import { isTombstoneRecord } from "database/tombstones";
import type { SkillCandidate } from "./messageSlashCommands";

type CatalogContext = {
  currentServer?: string;
  currentToken?: string;
  currentUserId?: string;
};

type SpaceCandidate = ReturnType<typeof collectSkillCandidatesFromSpace>[number];
type SpaceSkillCandidate = SkillCandidate & SpaceCandidate;

export function buildBuiltinSkillCandidates(
  agent?: AgentSkillConfigSource | null,
): SkillCandidate[] {
  return listBuiltinSkills()
    .filter((entry) => !agent || !isAgentSkillDisabled(agent, entry.slug))
    .map((entry) => ({
      name: entry.slug,
      description: entry.config.description,
      source: "builtin",
      token: formatSkillSlashReference({ source: "builtin", id: entry.slug }),
    }));
}

export function filterLoadableSkillCandidates<T extends SpaceCandidate>(
  spaces: readonly T[],
  agent?: AgentSkillConfigSource | null,
): T[] {
  return spaces.filter((candidate) => {
    // Match the Web loader's exact-Space disabled-skill gate, including aliases.
    const slug = resolveBuiltinSkillSlug(candidate.dbKey) ??
      (candidate.skillId ? resolveBuiltinSkillSlug(candidate.skillId) : null) ??
      resolveBuiltinSkillSlug(candidate.name);
    return !slug || !agent || !isAgentSkillDisabled(agent, slug);
  });
}

/** Membership and document reads use the same authenticated server as loadSkill.
 * Project discovery deliberately has no Web fallback: no authorized local bridge.
 */
export async function loadSpaceSkillCandidates(
  context: CatalogContext,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<SpaceSkillCandidate[]> {
  const server = normalizeServerOrigin(context.currentServer);
  const { currentToken, currentUserId } = context;
  if (!server || !currentToken || !currentUserId) return [];
  const headers = { Authorization: `Bearer ${currentToken}` };
  const read = async (dbKey: string): Promise<Record<string, any> | null> => {
    try {
      const response = await request(
        `${server}/api/v1/db/read/${encodeURIComponent(dbKey)}?includeDeleted=true`,
        { headers, signal },
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const record = payload?.data ?? payload;
      return isRecord(record) && !isTombstoneRecord(record) ? record : null;
    } catch {
      return null;
    }
  };
  try {
    const response = await request(`${server}/rpc/getUserSpaceMemberships`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId }),
      signal,
    });
    if (!response.ok) return [];
    const memberships: unknown = await response.json();
    if (!Array.isArray(memberships)) return [];
    const spaceIds = [...new Set(memberships.flatMap((membership) => {
      if (!isRecord(membership) || isTombstoneRecord(membership) ||
        (!!membership.userId && membership.userId !== currentUserId) ||
        typeof membership.spaceId !== "string" || !membership.spaceId.trim()) return [];
      return [membership.spaceId.trim()];
    }))];
    const groups = await Promise.all(spaceIds.map(async (spaceId) => {
      const space = await read(createSpaceKey.space(spaceId));
      return collectSkillCandidatesFromSpace(space);
    }));
    const indexed = [...new Map(groups.flat().map((entry) => [entry.dbKey, entry])).values()];
    const verified = await Promise.all(indexed.map(async (entry) => {
      if (signal?.aborted) return null;
      const page = await read(entry.dbKey);
      if (!page) return null;
      return {
        ...entry,
        description: typeof page.description === "string" ? page.description : "",
      };
    }));
    if (signal?.aborted) return [];
    return verified.flatMap((entry) => entry ? [{
      ...entry,
      description: entry.description,
      source: "space",
      token: formatSkillSlashReference({ source: "space", dbKey: entry.dbKey }),
    }] : []);
  } catch {
    return [];
  }
}

export function useSkillCandidates(agent?: AgentSkillConfigSource | null): readonly SkillCandidate[] {
  const runtime = useAppSelector(selectRuntimeSnapshot);
  const { currentServer, currentToken, currentUserId } = runtime;
  const context = useMemo(() => ({ currentServer, currentToken, currentUserId }),
    [currentServer, currentToken, currentUserId]);
  const [catalog, setCatalog] = useState<{
    context: CatalogContext;
    candidates: SpaceSkillCandidate[];
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadSpaceSkillCandidates(context, controller.signal).then((candidates) => {
      if (!controller.signal.aborted) setCatalog({ context, candidates });
    });
    return () => controller.abort();
  }, [context]);
  return useMemo(() => {
    const spaces = catalog?.context === context ? catalog.candidates : [];
    return [
      ...buildBuiltinSkillCandidates(agent),
      ...filterLoadableSkillCandidates(spaces, agent),
    ];
  }, [agent, catalog, context]);
}
