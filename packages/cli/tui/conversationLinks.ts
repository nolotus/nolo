/**
 * Extract the links that appeared in a TUI conversation, so they can be listed
 * and opened by number.
 *
 * Why this instead of linkifying the transcript inline: an inline link would
 * put an OSC 8 wrapper in the middle of assistant text, which then gets copied
 * verbatim into issues and PRs (escape residue), and the transcript path is not
 * OSC 8-aware for width or truncation. A numbered list is a separate UI layer —
 * it never touches the text the user reads or copies.
 *
 * Both reviews of the TUI hyperlink work recommended this shape as the "do it
 * later" step; it is cheap precisely because the extraction is pure.
 */

/** Same protocol allow-list as the CLI's safeUrl: http/https only. */
/**
 * Same protocol allow-list as the CLI's safeUrl: http/https only.
 *
 * Brackets are allowed inside a candidate so Wikipedia-style addresses
 * (`.../Foo_(bar)`) survive; unbalanced trailing closers are trimmed after
 * the match rather than excluded blind. Shared with the RN matcher so both
 * ends of the product agree on what a URL is.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

export type ConversationLink = {
  url: string;
  /** Where it came from, so a user can tell an assistant link from a tool's. */
  role: "user" | "assistant";
  /** 1-based, in order of first appearance. */
  index: number;
};

/**
 * Trim sentence punctuation and unbalanced trailing closers.
 *
 * Balanced closers stay (`Foo_(bar)` is a real address); a stray one from the
 * surrounding sentence (`see (https://x.test/a) ok`) is dropped. Mirrors the
 * RN matcher so both ends agree on what counts as a URL.
 */
function trimUrl(raw: string): string {
  const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let out = raw.replace(/[.,;:!?]+$/, "");
  while (out) {
    const last = out[out.length - 1];
    const opener = CLOSERS[last];
    if (!opener) break;
    const openCount = out.split(opener).length - 1;
    const closeCount = out.split(last).length - 1;
    if (closeCount > openCount) {
      out = out.slice(0, -1);
      continue;
    }
    break;
  }
  return out;
}

/**
 * Turns to scan, including the one still in progress.
 *
 * `history.turns` holds only finalized turns; the message just submitted (or
 * the reply currently streaming) lives in currentRole/currentContent until the
 * next turn starts. Found live in a TUI session: submitting a message with a
 * URL and immediately running /links reported "no links yet" even though the
 * URL was on screen, because the turn carrying it had not been finalized.
 */
export function collectConversationTurns(history: {
  turns: ReadonlyArray<{ role?: string; content?: string }>;
  currentRole?: string | null;
  currentContent?: string;
}): Array<{ role?: string; content?: string }> {
  const turns = [...history.turns];
  // Both conditions, matching the six other readers in this module: the
  // invariant is that role and content are set/cleared in one synchronous
  // step, so a content-bearing turn always has a role. Guarding on both keeps
  // that assumption explicit rather than relying on it.
  if (history.currentRole != null && history.currentContent) {
    turns.push({
      role: history.currentRole ?? undefined,
      content: history.currentContent,
    });
  }
  return turns;
}

/**
 * Collect distinct URLs across the conversation, in first-appearance order.
 * Duplicates keep their first index so re-numbering never shifts.
 */
export function extractConversationLinks(
  turns: ReadonlyArray<{ role?: string; content?: string }>,
  options: { limit?: number } = {},
): { links: ConversationLink[]; total: number; hasMore: boolean } {
  const limit = options.limit ?? 20;
  const seen = new Map<string, ConversationLink>();
  let total = 0;
  for (const turn of turns) {
    const content = typeof turn?.content === "string" ? turn.content : "";
    if (!content) continue;
    // `local` turns are command echoes produced by this very feature (the
    // router routes non-chat slash output through a local turn), so counting
    // them would relabel our own panel's URLs as assistant links.
    if (turn?.role === "local") continue;
    const role = turn?.role === "user" ? "user" : "assistant";
    // Fresh regex per turn: lastIndex is stateful on a /g/ literal.
    const pattern = new RegExp(URL_PATTERN.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const url = trimUrl(match[0]);
      if (!url || seen.has(url)) continue;
      // Stop recording at the limit but keep counting, so the caller can say
      // "showing the first N of M" instead of silently implying there are 20.
      if (seen.size < limit) {
        seen.set(url, { url, role, index: seen.size + 1 });
      }
      total += 1;
    }
  }
  return { links: [...seen.values()], total, hasMore: total > seen.size };
}

/**
 * Render the numbered list.
 *
 * `t` is injected (not imported) so this module stays free of the i18n
 * singleton — the extraction logic stays trivially testable. Returns the
 * "no links" message rendered through t() rather than null, because the caller
 * needs *something* to show for an empty conversation.
 */
export function renderConversationLinks(
  extracted: { links: ReadonlyArray<ConversationLink>; total: number },
  t: (
    key: "noConversationLinks" | "conversationLinksShowing" | "conversationLinksCopyHint",
    ...args: Array<string | number>
  ) => string,
): string {
  const { links, total } = extracted;
  if (links.length === 0) return t("noConversationLinks");
  const lines = links.map((link) => {
    const who = link.role === "user" ? "you" : "assistant";
    return `  ${String(link.index).padStart(2)}  [${who}] ${link.url}`;
  });
  // One heading serves both cases: "showing first N of M" reads correctly
  // whether N === M or not.
  const heading = t("conversationLinksShowing", links.length, total);
  // No "/open <n>" hint: that command does not exist, and advertising it would
  // send the user straight into "Unknown command".
  return [heading, ...lines, "", t("conversationLinksCopyHint")].join("\n");
}
