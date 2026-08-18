import {
  buildAgentNavPreview
} from "/public/assets/chunks/chunk-WOLEEY5H.js";
import {
  upsertSSREntity
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";

// packages/ai/agent/web/seedAgentPreview.ts
var looksLikeFullAgentRecord = (record) => {
  if (!record || typeof record !== "object") return false;
  const prompt = record.prompt;
  return typeof prompt === "string" && prompt.trim().length > 0;
};
var resolveAgentDbKey = (agent) => {
  const key = agent.dbKey || agent.id;
  return asTrimmedString(key);
};
var readDbEntity = (state, dbKey) => {
  const entities = state?.db?.entities;
  return entities?.[dbKey];
};
var seedAgentPreviewInStore = (dispatch, getState, agent) => {
  const dbKey = resolveAgentDbKey(agent);
  if (!dbKey) return;
  const existing = readDbEntity(getState(), dbKey);
  if (looksLikeFullAgentRecord(existing)) return;
  const preview = buildAgentNavPreview(agent);
  dispatch(
    upsertSSREntity({
      ...preview,
      dbKey,
      id: agent.id || dbKey
    })
  );
};
var seedAgentPreviewsInStore = (dispatch, getState, agents) => {
  for (const agent of agents) {
    seedAgentPreviewInStore(dispatch, getState, agent);
  }
};

// packages/ai/agent/web/agentCardUtils.ts
var isInteractiveAgentCardTarget = (target) => {
  if (!(target instanceof Element)) return false;
  if (target.closest("button") || target.closest("[role='menu']") || target.closest(".agent__actions-top")) {
    return true;
  }
  const anchor = target.closest("a");
  return anchor !== null && !anchor.classList.contains("agent");
};

export {
  seedAgentPreviewInStore,
  seedAgentPreviewsInStore,
  isInteractiveAgentCardTarget
};
