/** Terminal inline results must preserve the host's tool failure signals. */
export function isToolExecutionFailure(args: {
  content?: unknown;
  metadata?: Record<string, unknown>;
}): boolean {
  const metadata = args.metadata;
  if (metadata) {
    if (metadata.error) return true;
    const exitCode = metadata.exitCode;
    if (typeof exitCode === "number" && Number.isFinite(exitCode) && exitCode !== 0) return true;
    if (typeof exitCode === "string" && exitCode.trim() !== "") {
      const parsedExitCode = Number(exitCode);
      if (Number.isFinite(parsedExitCode) && parsedExitCode !== 0) return true;
    }
    if (metadata.timedOut === true) return true;
  }
  if (typeof args.content !== "string" || !args.content.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(args.content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    return Boolean(record.error) || record.ok === false || record.success === false || record.status === "error";
  } catch {
    return false;
  }
}
