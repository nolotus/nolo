export const SHELL_DESTRUCTIVE_PATTERNS = [
  /\brm\s+(-[^\n\r]*\s+)?/i,
  /\bremove-item\b/i,
  /\bdel\s+\/?[a-z]*\s+/i,
  /\berase\s+/i,
  /\brmdir\s+/i,
  /\brd\s+\/s\b/i,
  /\bgit\s+reset\s+(--hard\b|--merge\b|--keep\b)/i,
  /\bgit\s+clean\s+-[^\n\r]*f/i,
  /\bgit\s+checkout\s+--\b/i,
  /\bgit\s+restore\s+--source=/i,
] as const;

export const isDestructiveShellCommand = (params: {
  command?: unknown;
  input?: unknown;
}): boolean => {
  const combined = [
    typeof params.command === "string" ? params.command : "",
    typeof params.input === "string" ? params.input : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!combined.trim()) return false;
  return SHELL_DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(combined));
};
