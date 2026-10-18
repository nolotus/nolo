// packages/agent-runtime/executionWorkload.ts
//
// Provider-agnostic replacement for the sbx-specific `DockerWorkload`.
//
// Semantics: "this run's tool calls do not execute on the host; they go through
// an external execution channel". Which provider backs that channel is a
// `backendId`, not a type. That is what lets a subagent run on
// linux-bubblewrap / Instabox / sbx / Cloud Run without a second code path.

/**
 * One tool invocation executed by an external backend.
 * Returns a string so it can be handed straight back to the model; failures are
 * encoded as `{ok:false,error}` rather than thrown.
 */
export type ExecutionToolChannel = (
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<string>;

export type ExecutionWorkload = {
  kind: "external";
  /** Which backend produced this channel ("linux-bubblewrap-v1", "instabox", ...). */
  backendId: string;
  /** Absent = not ready; every tool call must fail closed. */
  channel?: ExecutionToolChannel;
};

/** Narrows a value to a workload whose channel is usable. */
export function isReadyExecutionWorkload(
  value: unknown,
): value is ExecutionWorkload & { channel: ExecutionToolChannel } {
  if (!value || typeof value !== "object") return false;
  const w = value as Partial<ExecutionWorkload>;
  return w.kind === "external" && typeof w.channel === "function";
}

/**
 * Compatibility adapter: the pre-existing sbx type used `kind: "docker"`.
 * Kept so un-migrated call sites keep failing closed instead of silently
 * executing on the host.
 */
export function normalizeLegacyDockerWorkload(value: unknown): ExecutionWorkload | null {
  if (!value || typeof value !== "object") return null;
  const w = value as { kind?: unknown; channel?: unknown };
  if (w.kind !== "docker") return null;
  return {
    kind: "external",
    backendId: "docker-sandbox-cloud",
    ...(typeof w.channel === "function" ? { channel: w.channel as ExecutionToolChannel } : {}),
  };
}
