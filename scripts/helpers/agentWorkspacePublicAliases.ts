import type {
  AgentRecord,
  AgentWorkspaceContext,
  ListedAgent,
} from "./agentWorkspace";
import { readDbRecord, writeDbRecord } from "./agentWorkspace";

export type PublicAliasMismatchKind =
  | "invalid-public-key-shape"
  | "missing-public-alias"
  | "stale-public-alias";

export type PublicAliasMismatch = {
  id: string;
  name: string;
  privateKey: string;
  publicKey: string;
  kind: PublicAliasMismatchKind;
  isPublicFlag: boolean;
  publicRecordExists: boolean;
};

export type PublicAliasRepairResult = {
  repaired: PublicAliasMismatch[];
  skipped: PublicAliasMismatch[];
};

const PUBLIC_ALIAS_SENSITIVE_FIELDS = [
  "apiKey",
  "apiKeyFromAgentKey",
  "secret",
  "password",
] as const;

export function isCurrentAgentPublicAlias(publicKey: string): boolean {
  return publicKey.startsWith("agent-pub-");
}

export function hasInvalidPublicAliasShape(publicKey: string): boolean {
  return /^agent-pub-agent-/i.test(publicKey);
}

export function findPublicAliasMismatches(
  agents: ListedAgent[]
): PublicAliasMismatch[] {
  return agents
    .filter(
      (agent) =>
        hasInvalidPublicAliasShape(agent.publicKey) ||
        agent.isPublicFlag !== agent.publicRecordExists
    )
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      privateKey: agent.privateKey,
      publicKey: agent.publicKey,
      kind: hasInvalidPublicAliasShape(agent.publicKey)
        ? "invalid-public-key-shape"
        : agent.isPublicFlag
          ? "missing-public-alias"
          : "stale-public-alias",
      isPublicFlag: agent.isPublicFlag,
      publicRecordExists: agent.publicRecordExists,
    }));
}

export function buildPublicAliasRecord(
  privateRecord: AgentRecord,
  publicKey: string
): AgentRecord {
  const publicRecord = { ...privateRecord };
  for (const field of PUBLIC_ALIAS_SENSITIVE_FIELDS) {
    delete publicRecord[field];
  }

  return {
    ...publicRecord,
    isPublic: true,
    dbKey: publicKey,
    updatedAt: Date.now(),
  };
}

export async function repairMissingPublicAliases(
  context: AgentWorkspaceContext,
  mismatches: PublicAliasMismatch[]
): Promise<PublicAliasRepairResult> {
  const repaired: PublicAliasMismatch[] = [];
  const skipped: PublicAliasMismatch[] = [];

  for (const mismatch of mismatches) {
    if (
      mismatch.kind !== "missing-public-alias" ||
      !isCurrentAgentPublicAlias(mismatch.publicKey)
    ) {
      skipped.push(mismatch);
      continue;
    }

    const privateRecord = await readDbRecord<AgentRecord>(
      context,
      mismatch.privateKey
    );
    if (!privateRecord || privateRecord.isPublic !== true) {
      skipped.push(mismatch);
      continue;
    }

    await writeDbRecord(
      context,
      mismatch.publicKey,
      buildPublicAliasRecord(privateRecord, mismatch.publicKey)
    );
    repaired.push(mismatch);
  }

  return { repaired, skipped };
}
