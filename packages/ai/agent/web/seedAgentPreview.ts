import type { Agent } from "app/types";
import type { AppDispatch, RootState } from "app/store";
import { asTrimmedString } from "core/trimmedString";
import { upsertSSREntity } from "database/dbSlice";
import { buildAgentNavPreview } from "./agentNavigationPreview";

/**
 * Soft-seed a plaza/list agent into Redux for AgentPage first paint.
 * Never overwrites a record that already looks "full" (has prompt text).
 */
export const looksLikeFullAgentRecord = (record: unknown): boolean => {
  if (!record || typeof record !== "object") return false;
  const prompt = (record as { prompt?: unknown }).prompt;
  return typeof prompt === "string" && prompt.trim().length > 0;
};

export const resolveAgentDbKey = (agent: { dbKey?: unknown; id?: unknown }): string => {
  const key = agent.dbKey || agent.id;
  return asTrimmedString(key);
};

/** Read an entity from the db slice without going through selectById (suite mocks often replace it). */
const readDbEntity = (state: RootState, dbKey: string): unknown => {
  const entities = (state as { db?: { entities?: Record<string, unknown> } })?.db
    ?.entities;
  return entities?.[dbKey];
};

export const seedAgentPreviewInStore = (
  dispatch: AppDispatch,
  getState: () => RootState,
  agent: Agent
): void => {
  const dbKey = resolveAgentDbKey(agent as { dbKey?: unknown; id?: unknown });
  if (!dbKey) return;

  const existing = readDbEntity(getState(), dbKey);
  if (looksLikeFullAgentRecord(existing)) return;

  const preview = buildAgentNavPreview(agent);
  dispatch(
    upsertSSREntity({
      ...preview,
      dbKey,
      id: (agent as { id?: unknown }).id || dbKey,
    } as any)
  );
};

export const seedAgentPreviewsInStore = (
  dispatch: AppDispatch,
  getState: () => RootState,
  agents: Agent[]
): void => {
  for (const agent of agents) {
    seedAgentPreviewInStore(dispatch, getState, agent);
  }
};
