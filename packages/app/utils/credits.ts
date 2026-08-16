import { asOptionalFiniteNumber } from "core/optionalNumber";

export const formatCredits = (
  amount: number | null | undefined,
  unit: string,
  fractionDigits = 2
): string => {
  const numericAmount = asOptionalFiniteNumber(amount) ?? 0;
  const digits = Number.isInteger(fractionDigits)
    ? Math.max(0, fractionDigits)
    : 2;
  return `${numericAmount.toFixed(digits)} ${unit}`;
};
