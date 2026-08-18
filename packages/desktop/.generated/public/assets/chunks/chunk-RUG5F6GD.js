// packages/core/optionalNumber.ts
function asOptionalFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}

// packages/core/optionalPositiveNumber.ts
function asOptionalPositiveFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}

export {
  asOptionalFiniteNumber,
  asOptionalPositiveFiniteNumber
};
