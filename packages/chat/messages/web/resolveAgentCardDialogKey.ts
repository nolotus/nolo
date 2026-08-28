import { toTrimmedString } from "core/toTrimmedString";
import { createAgentKey } from "database/keys";

export const resolveAgentCardDialogKey = (agent: any): string => {
  const rawDbKey = toTrimmedString(agent?.dbKey);
  if (rawDbKey) {
    // Legacy cybot-* keys are unsupported
    if (rawDbKey.startsWith("cybot-")) return "";
    return rawDbKey;
  }

  const agentId = toTrimmedString(agent?.id);
  const ownerUserId = toTrimmedString(agent?.ownerUserId ?? agent?.userId ?? agent?.creatorId);
  const isPublic = !!agent?.isPublic;

  if (!agentId) return "";
  if (toTrimmedString(agent?.type) === "cybot") return "";

  if (isPublic) {
    return createAgentKey.public(agentId);
  }

  if (!ownerUserId) return "";
  return createAgentKey.private(ownerUserId, agentId);
};
