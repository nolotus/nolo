/** Single fixed streaming symbol cycle — no user-selectable sets. */
export const STREAMING_SYMBOLS = ["·", "~", "≈", "〜", "∿"] as const;
export const STREAMING_SYMBOL_INTERVAL_MS = 620;

export function getStaticAnimationSymbol(): string {
  return STREAMING_SYMBOLS[0] ?? "·";
}
