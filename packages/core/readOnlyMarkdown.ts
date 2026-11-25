const MENTION_PATTERN = /@\[(\w+):([^\]|]+)\|([^\]]+)\]/;

/** Return the markdown accepted by the read-only renderer, or null for its fallback. */
export function getRenderableReadOnlyMarkdown(value: unknown): string | null {
  const markdown = typeof value === "string" ? value.trim() : "";
  return markdown && !MENTION_PATTERN.test(markdown) ? markdown : null;
}
