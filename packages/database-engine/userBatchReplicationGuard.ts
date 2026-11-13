/** Replication is not a claim API. Preserve minted authority through late
 * snapshots; never let a client manufacture an authority owner or receipt. */
const fields = ["userBatchOwner", "userBatchPhase", "userBatchReceipt", "acceptedUserBatchId"] as const;
export function protectUserBatchReplication(existing: any, incoming: any): any {
  const reserved = /^(metadata\.)?(userBatchOwner|userBatchPhase|userBatchReceipt|acceptedUserBatchId)(\.|$)/;
  const forged = Object.keys(incoming).some(key => reserved.test(key)) ||
    (incoming.metadata && typeof incoming.metadata === "object" && Object.keys(incoming.metadata).some(key => reserved.test(key)));
  if (!existing?.metadata?.userBatchReceipt) {
    if (forged || incoming.metadata?.queueState === "accepted" || incoming["metadata.queueState"] === "accepted") {
      throw new Error("USER_BATCH_AUTHORITY_CONTROLLED");
    }
    return incoming;
  }
  const result = { ...incoming };
  for (const key of Object.keys(result)) {
    if (reserved.test(key) || key.startsWith("metadata.queueState")) delete result[key];
  }
  const metadata = incoming.metadata && typeof incoming.metadata === "object" && !Array.isArray(incoming.metadata) ? incoming.metadata : {};
  result.metadata = { ...metadata, queueState: existing.metadata.queueState };
  for (const field of fields) result.metadata[field] = existing.metadata[field];
  return result;
}
