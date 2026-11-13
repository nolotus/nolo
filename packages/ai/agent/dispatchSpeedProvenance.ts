/** Only trusted startAgentRun adapters write this fact; never inferred from lineage. */
export type DispatchSpeedProvenance = {
  version: 1;
  source: "cli-startAgentRun" | "server-startAgentRun";
  userId: string;
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};

export function isServerDispatchSpeedSource(value: unknown, dialogId: string, userId: string): boolean {
  const dialog = record(value);
  const proof = record(dialog.dispatchSpeedProvenance);
  return proof.version === 1 && proof.source === "server-startAgentRun" &&
    proof.userId === userId && record(dialog.runtimeBinding).tenantUserId === userId && dialog.id === dialogId;
}

export function isLocalDispatchSpeedSource(value: unknown, dialogId: string, userId: string): boolean {
  const run = record(value);
  const proof = record(run.dispatchSpeedProvenance);
  return proof.version === 1 && proof.source === "cli-startAgentRun" &&
    proof.userId === userId && typeof run.runId === "string" && run.runId.length > 0 &&
    run.dialogId === dialogId && run.ephemeral !== true;
}
