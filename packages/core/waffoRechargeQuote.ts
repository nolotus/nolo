export interface WaffoRechargePricing {
  cnyPerUsd: number;
  processorPercent: number;
  processorFixed: number;
}

export interface WaffoRechargeQuote {
  credits: number;
  principalCny: number;
  principalUsd: string;
  feeUsd: string;
  totalUsd: string;
  feeCny: string;
  totalCny: string;
  currency: "USD";
  cnyPerUsd: number;
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
  pricing: WaffoRechargePricing
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

  // 本金按标准货币舍入（展示值 ≈ 面额）；总额向上取整做 gross-up，
  // 保证扣除通道费后净收入 ≥ 本金，零头全部归入 fee。
  const principalCny = credits;
  const principalUsdCents = centsRound(principalCny / pricing.cnyPerUsd);
  const fixedCents = centsCeil(pricing.processorFixed);
  const grossCents = (principalUsdCents + fixedCents) / (1 - pricing.processorPercent);
  const totalUsdCents = centsCeil(grossCents / 100);
  if (totalUsdCents < principalUsdCents || totalUsdCents > MAX_CENTS) {
    throw new Error("Waffo recharge amount exceeds safe monetary precision");
  }
  const feeUsdCents = totalUsdCents - principalUsdCents;
  const totalCny = totalUsdCents * pricing.cnyPerUsd / 100;
  const feeCny = feeUsdCents * pricing.cnyPerUsd / 100;

  return {
    credits,
    principalCny,
    principalUsd: money(principalUsdCents),
    feeUsd: money(feeUsdCents),
    totalUsd: money(totalUsdCents),
    feeCny: feeCny.toFixed(2),
    totalCny: totalCny.toFixed(2),
    currency: "USD",
    cnyPerUsd: pricing.cnyPerUsd,
  };
};
