export type ReferenceVisibility = "private" | "public";

export type ReferenceAuthorityDoc = {
  dbKey: string;
  ownerUserId: string;
  visibility: ReferenceVisibility;
  grantedAgentKeys?: string[];
  grantedSpaceIds?: string[];
};

export type ReferenceAuthorityContext = {
  userId: string;
  agentKey: string;
  agentOwnerUserId: string;
  spaceId?: string | null;
};

export type ReferenceAuthorityDecision = {
  ok: boolean;
  reason:
    | "user-owner"
    | "public-doc"
    | "agent-grant"
    | "space-grant"
    | "denied";
};

export function canReadReferenceForAgentRun(
  doc: ReferenceAuthorityDoc,
  context: ReferenceAuthorityContext,
): ReferenceAuthorityDecision {
  if (doc.ownerUserId === context.userId) {
    return { ok: true, reason: "user-owner" };
  }

  if (doc.visibility === "public") {
    return { ok: true, reason: "public-doc" };
  }

  if (doc.grantedAgentKeys?.includes(context.agentKey)) {
    return { ok: true, reason: "agent-grant" };
  }

  if (context.spaceId && doc.grantedSpaceIds?.includes(context.spaceId)) {
    return { ok: true, reason: "space-grant" };
  }

  return { ok: false, reason: "denied" };
}
