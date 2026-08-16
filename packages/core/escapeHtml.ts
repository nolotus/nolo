/**
 * Shared pure HTML entity escaper for untrusted text interpolated into HTML.
 *
 * Auth email templates, invite messages, and unsubscribe pages all escape the
 * same five characters so reflected values cannot break out of text or attribute
 * context. Keep one definition so the entity set (including single-quote) cannot
 * drift across auth/server email modules.
 *
 * Dependency-free so pure unit tests do not pull auth/email modules.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
