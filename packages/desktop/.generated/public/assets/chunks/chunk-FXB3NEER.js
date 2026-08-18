import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";

// packages/app/utils/credits.ts
var formatCredits = (amount, unit, fractionDigits = 2) => {
  const numericAmount = asOptionalFiniteNumber(amount) ?? 0;
  const digits = Number.isInteger(fractionDigits) ? Math.max(0, fractionDigits) : 2;
  return `${numericAmount.toFixed(digits)} ${unit}`;
};

export {
  formatCredits
};
