/**
 * Stable presentation helpers for preflight blocked results.
 * Sorts types alphabetically so UI chips/lists do not flicker by insertion order.
 */

import { asOptionalFiniteNumber } from "core/optionalNumber";

export type UnsupportedTypeCount = {
  type: string;
  count: number;
};

/** Type/count pairs with positive counts, sorted by type key. */
export function formatUnsupportedTypeCounts(
  unsupportedByType: Record<string, number> | null | undefined
): UnsupportedTypeCount[] {
  if (!unsupportedByType || typeof unsupportedByType !== "object") {
    return [];
  }
  return Object.entries(unsupportedByType)
    .map(([type, count]) => ({
      type: String(type),
      count: asOptionalFiniteNumber(count) ?? 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => a.type.localeCompare(b.type));
}

/**
 * Plain "type: count" lines for blocked-result copy.
 * Optional labelForType maps machine type keys to localized labels.
 */
export function formatUnsupportedTypeCountLines(
  unsupportedByType: Record<string, number> | null | undefined,
  labelForType?: (type: string) => string
): string[] {
  return formatUnsupportedTypeCounts(unsupportedByType).map(({ type, count }) => {
    const label = labelForType ? labelForType(type) : type;
    return `${label}: ${count}`;
  });
}
