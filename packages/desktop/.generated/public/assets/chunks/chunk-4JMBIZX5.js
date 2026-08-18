import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";

// packages/ai/agent/publicAgentIdentity.ts
var PUBLIC_AGENT_PREFIX = "agent-pub-";
var toNonEmptyString = (value) => asOptionalTrimmedString(value);
var parsePublicDbKey = (value) => {
  const text = toNonEmptyString(value);
  if (!text) return null;
  if (text.startsWith(PUBLIC_AGENT_PREFIX)) {
    return {
      dbKey: text,
      id: text.slice(PUBLIC_AGENT_PREFIX.length),
      type: "agent"
    };
  }
  return null;
};
var buildPublicDbKey = (type, id) => {
  if (type === "cybot") return "";
  return `${PUBLIC_AGENT_PREFIX}${id}`;
};
function getPublicAgentId(agent) {
  const directId = toNonEmptyString(agent?.id);
  if (directId) {
    return parsePublicDbKey(directId)?.id ?? directId;
  }
  return parsePublicDbKey(agent?.dbKey)?.id;
}
function getPublicAgentDbKey(agent) {
  const directDbKey = toNonEmptyString(agent?.dbKey);
  if (directDbKey) {
    if (directDbKey.startsWith("cybot-")) return void 0;
    return directDbKey;
  }
  const idAsDbKey = parsePublicDbKey(agent?.id)?.dbKey;
  if (idAsDbKey) return idAsDbKey;
  const id = getPublicAgentId(agent);
  if (!id) return void 0;
  if (toNonEmptyString(agent?.type) === "cybot") return void 0;
  return buildPublicDbKey(agent?.type, id) || void 0;
}
function getPublicAgentIdentifiers(agent) {
  const identifiers = [getPublicAgentDbKey(agent), getPublicAgentId(agent)].filter(Boolean);
  return Array.from(new Set(identifiers));
}
function matchesPublicAgentIdentifiers(agent, identifiers) {
  return getPublicAgentIdentifiers(agent).some((identifier) => identifiers.has(identifier));
}
function getPublicAgentPruneDbKey(agent) {
  return getPublicAgentDbKey(agent) ?? getPublicAgentId(agent);
}

export {
  getPublicAgentId,
  getPublicAgentDbKey,
  getPublicAgentIdentifiers,
  matchesPublicAgentIdentifiers,
  getPublicAgentPruneDbKey
};
