const SANDBOX_PATH_PATTERN = /^\/[A-Za-z0-9._\-/]{1,200}$/;

/** Paths permitted by the Docker sandbox command boundary. */
export function isValidSandboxPath(path: string): boolean {
  if (typeof path !== "string" || path.trim().length === 0) return false;
  if (!SANDBOX_PATH_PATTERN.test(path)) return false;
  if (path.includes("..") || path.includes("//")) return false;
  return true;
}

/** Argv permitted by the Docker sandbox command boundary. */
export function isValidArgv(argv: readonly string[]): boolean {
  if (!Array.isArray(argv) || argv.length === 0) return false;
  return argv.every(
    (arg) =>
      typeof arg === "string" &&
      arg.length > 0 &&
      arg.length <= 4096 &&
      !arg.includes("\0") &&
      !arg.includes("\n") &&
      !arg.includes("\r"),
  );
}
