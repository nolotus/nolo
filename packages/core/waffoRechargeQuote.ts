export interface WaffoRechargePricing {
  cnyPerUsd: number;
  processorPercent: number;
  processorFixed: number;
}

export interface WaffoRechargeQuote {
  credits: number;
  currency: "USD" | "CNY";
  cnyPerUsd: number;
  // USD 支线字段（currency === "USD" 时有值）
  principalUsd: string;
  feeUsd: string;
  totalUsd: string;
  // CNY 支线字段（currency === "CNY" 时有值）
  principalCny: string;
  feeCny: string;
  totalCny: string;
}

const MAX_CENTS = Number.MAX_SAFE_INTEGER;
const assertSafeCents = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value * 100 > MAX_CENTS) {
    throw new Error("Waffo recharge amount exceeds safe monetary precision");
  }
};
const centsCeil = (value: number) => {
  assertSafeCents(value);
  return Math.ceil(value * 100);
};
const centsRound = (value: number) => {
  assertSafeCents(value);
  return Math.round(value * 100);
};
const money = (value: number) => (value / 100).toFixed(2);

export const quoteWaffoRecharge = (
  credits: number,
  pricing: WaffoRechargePricing,
  currency: "USD" | "CNY" = "USD"
): WaffoRechargeQuote => {
  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new Error("credits must be a positive integer");
  }
  if (
    !Number.isFinite(pricing.cnyPerUsd) ||
    pricing.cnyPerUsd <= 0 ||
    !Number.isFinite(pricing.processorPercent) ||
    pricing.processorPercent < 0 ||
    pricing.processorPercent >= 1 ||
    !Number.isFinite(pricing.processorFixed) ||
    pricing.processorFixed < 0
  ) {
    throw new Error("invalid Waffo recharge pricing");
  }

  const creditsAmount = credits;
  if (currency === "CNY") {
    const principalCnyCents = credits * 100;
    // 直接在 fen 上取整；centsCeil 接收元单位会再 ×100，这里不能复用。
    const feeCnyCents = Math.ceil(principalCnyCents * pricing.processorPercent / (1 - pricing.processorPercent));
    const totalCnyCents = principalCnyCents + feeCnyCents;
    if (totalCnyCents > MAX_CENTS) throw new Error("Waffo recharge amount exceeds safe monetary precision");
    return {
      credits: creditsAmount, currency, cnyPerUsd: pricing.cnyPerUsd,
      principalUsd: "0.00", feeUsd: "0.00", totalUsd: "0.00",
      principalCny: money(principalCnyCents), feeCny: money(feeCnyCents), totalCny: money(totalCnyCents),
    };
  }
  // USD card: gross-up processor fees. Principal is credits converted via cnyPerUsd.
  const principalUsdCents = centsRound(creditsAmount / pricing.cnyPerUsd);
  const fixedCents = centsCeil(pricing.processorFixed);
  const grossCents = (principalUsdCents + fixedCents) / (1 - pricing.processorPercent);
  const totalUsdCents = centsCeil(grossCents / 100);
  if (totalUsdCents < principalUsdCents || totalUsdCents > MAX_CENTS) throw new Error("Waffo recharge amount exceeds safe monetary precision");
  const feeUsdCents = totalUsdCents - principalUsdCents;
  return {
    credits: creditsAmount, currency, cnyPerUsd: pricing.cnyPerUsd,
    principalUsd: money(principalUsdCents), feeUsd: money(feeUsdCents), totalUsd: money(totalUsdCents),
    principalCny: (principalUsdCents * pricing.cnyPerUsd / 100).toFixed(2),
    feeCny: (feeUsdCents * pricing.cnyPerUsd / 100).toFixed(2),
    totalCny: (totalUsdCents * pricing.cnyPerUsd / 100).toFixed(2),
  };
};
