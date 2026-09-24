export type WaffoRefundCurrency = "CNY" | "USD";
export type WaffoRefundChannel = "cny_wechat" | "usd_card";

export interface WaffoRefundQuoteInput {
  paidAmount: number;
  currency: WaffoRefundCurrency;
  channel: WaffoRefundChannel;
  cnyPerUsd: number;
  processorPercent: number;
  processorFixed: number;
  refundProcessingUsd?: number;
}

export interface WaffoRefundQuote {
  accepted: boolean;
  refundAmount: number;
  channelFee: number;
  refundFee: number;
  reason?: "below_threshold" | "not_refundable";
}

const MAX_CENTS = Number.MAX_SAFE_INTEGER;
const floorMinorUnit = (value: number) => Math.floor(value * 100 + 1e-9) / 100;

export const quoteWaffoRefund = ({
  paidAmount,
  currency,
  channel,
  cnyPerUsd,
  processorPercent,
  processorFixed,
  refundProcessingUsd = 1,
}: WaffoRefundQuoteInput): WaffoRefundQuote => {
  if (
    !Number.isFinite(paidAmount) ||
    paidAmount <= 0 ||
    paidAmount * 100 > MAX_CENTS ||
    (currency !== "CNY" && currency !== "USD") ||
    (channel !== "cny_wechat" && channel !== "usd_card") ||
    (channel === "cny_wechat" && currency !== "CNY") ||
    (channel === "usd_card" && currency !== "USD") ||
    !Number.isFinite(cnyPerUsd) ||
    cnyPerUsd <= 0 ||
    !Number.isFinite(processorPercent) ||
    processorPercent < 0 ||
    processorPercent >= 1 ||
    !Number.isFinite(processorFixed) ||
    processorFixed < 0 ||
    !Number.isFinite(refundProcessingUsd) ||
    refundProcessingUsd < 0
  ) {
    throw new Error("invalid Waffo refund quote input");
  }

  const channelFee =
    paidAmount * processorPercent +
    (channel === "usd_card" ? processorFixed : 0);
  const refundFee = refundProcessingUsd * (currency === "CNY" ? cnyPerUsd : 1);
  const refundAmount = floorMinorUnit(paidAmount - channelFee - refundFee);
  const quote = { refundAmount, channelFee, refundFee };

  if (paidAmount < (currency === "CNY" ? 15 : 5)) {
    return { accepted: false, ...quote, reason: "below_threshold" };
  }
  if (refundAmount <= 0) {
    return { accepted: false, ...quote, reason: "not_refundable" };
  }
  return { accepted: true, ...quote };
};
