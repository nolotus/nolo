// Pure, Redux-free core for the streaming reveal animation.
//
// Contract (see also useStreamingReveal.ts):
// - `canonical` content is only a *target*; the visible projection catches up
//   on its own loop and never restarts from scratch when the target changes.
// - Within one streaming segment the visible text is monotonic: already shown
//   body text never shrinks. Three target relations are distinguished:
//     - "append": target extends (or equals) the visible text → animate tail.
//     - "transient-shrink": target is a prefix of the visible text (e.g. a
//       metadata-only snapshot or a reset buffer mid-stream) → freeze; keep
//       showing what the user already saw until the target grows back.
//     - "replace": target is not a prefix relation at all → deliberate segment
//       replacement; snap so canonical corrections actually surface.
// - All slicing happens on grapheme boundaries (Intl.Segmenter), so emoji,
//   ZWJ sequences and surrogate pairs are never cut into replacement chars.

export const REVEAL_TICK_MS = 12;

// Adaptive pacing (graphemes behind → graphemes revealed per tick). Small
// backlogs feel like typing; big bursts skip most of the animation while a
// bounded fading tail keeps the "streaming" feel.
const SMALL_BACKLOG_GRAPHEMES = 8;
const MEDIUM_BACKLOG_GRAPHEMES = 24;
const LARGE_BACKLOG_GRAPHEMES = 80;
const HUGE_BURST_TAIL_GRAPHEMES = 24;

export function splitVisibleCharacters(content: string): string[] {
  const Segmenter = Intl.Segmenter;
  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(content), (part) => part.segment);
  }
  return Array.from(content);
}

/**
 * Graphemes to reveal on the next tick given the current backlog.
 * Pure and deterministic so tests can step it without wall-clock timers.
 */
export function computeRevealStep(behind: number): number {
  if (behind <= 0) return 0;
  if (behind <= SMALL_BACKLOG_GRAPHEMES) return 1;
  if (behind <= MEDIUM_BACKLOG_GRAPHEMES) return 3;
  if (behind <= LARGE_BACKLOG_GRAPHEMES) return 8;
  // Huge burst: jump most of it immediately, keep only a bounded animated tail.
  return behind - HUGE_BURST_TAIL_GRAPHEMES;
}

export type RevealTargetRelation = "append" | "transient-shrink" | "replace";

export function classifyRevealTarget(
  target: string,
  visible: string
): RevealTargetRelation {
  if (target === visible) return "append";
  if (visible.length === 0) return "append";
  if (target.startsWith(visible)) return "append";
  if (visible.startsWith(target)) return "transient-shrink";
  return "replace";
}

/**
 * Next visible projection for a reveal tick. Grapheme-safe: the returned
 * string is always a whole-grapheme prefix of `target` (append), `visible`
 * itself (frozen transient shrink) or all of `target` (replacement snap).
 */
export function nextRevealContent(target: string, visible: string): string {
  const relation = classifyRevealTarget(target, visible);
  if (relation === "replace") return target;
  if (relation === "transient-shrink") return visible;

  const targetGraphemes = splitVisibleCharacters(target);
  const visibleCount =
    visible.length === 0 ? 0 : splitVisibleCharacters(visible).length;
  const behind = targetGraphemes.length - visibleCount;
  if (behind <= 0) return visible;

  const nextCount = Math.min(
    targetGraphemes.length,
    visibleCount + computeRevealStep(behind)
  );
  return targetGraphemes.slice(0, nextCount).join("");
}
