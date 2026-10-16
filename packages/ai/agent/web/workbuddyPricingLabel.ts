export type WorkBuddyPricingLabelInput = {
  rate?: number;
  free: boolean;
  observedAt: number;
  requiresActivePackage: true;
};

export function workbuddyPricingLabel(
  pricing: WorkBuddyPricingLabelInput | undefined,
  now = Date.now(),
): "当前零费率" | `额度倍率 ×${number}` | "费率待确认" {
  if (!pricing || !Number.isFinite(pricing.observedAt) || now - pricing.observedAt > 5 * 60_000 || pricing.observedAt > now ||
      typeof pricing.free !== "boolean" || pricing.requiresActivePackage !== true ||
      (pricing.rate !== undefined && (!Number.isFinite(pricing.rate) || pricing.rate < 0)) ||
      (pricing.free !== (pricing.rate === 0))) return "费率待确认";
  if (pricing.free && pricing.rate === 0) return "当前零费率";
  if (!pricing.free && typeof pricing.rate === "number" && pricing.rate > 0) return `额度倍率 ×${pricing.rate}`;
  return "费率待确认";
}
