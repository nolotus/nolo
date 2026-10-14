/**
 * Non-authoritative, read-only classification of shell request shapes.
 * Does not normalize, authorize, execute, or choose a backend.
 * Never log or persist the input command; the observation contains no arguments.
 */
export type ShellRequestObservation = {
  shape: "raw-command" | "local-capability" | "server-session" | "unknown";
  hasCommand: boolean;
  backgroundRequested: boolean;
  hasStdin: boolean;
  hasSessionFields: boolean;
};

export function observeShellRequest(value: unknown): ShellRequestObservation {
  const unknown: ShellRequestObservation = {
    shape: "unknown", hasCommand: false, backgroundRequested: false,
    hasStdin: false, hasSessionFields: false,
  };
  if (typeof value === "string") {
    const command = value.trim();
    if (!command) return unknown;
    // JSON tool-call strings carry a structured object, not a raw shell command.
    if (command.startsWith("{") && command.endsWith("}")) {
      try { return observeShellRequest(JSON.parse(command)); } catch { /* raw command */ }
    }
    return { ...unknown, shape: "raw-command", hasCommand: true };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return unknown;
  const record = value as Record<string, unknown>;
  const hasCommand = [record.command, record.cmd].some(x => typeof x === "string" && x.trim().length > 0);
  const hasSessionFields = ["cwd", "pty", "interactive", "sessionId", "close"].some(k => Object.hasOwn(record,k));
  const backgroundRequested = record.background === true || (typeof record.background === "string" && record.background.trim().toLowerCase() === "true");
  const hasStdin = typeof record.input === "string";
  return {
    shape: hasSessionFields ? "server-session" : hasCommand ? "local-capability" : "unknown",
    hasCommand, backgroundRequested, hasStdin, hasSessionFields,
  };
}
