// packages/core/stringArray.ts
function asNonEmptyStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) => typeof item === "string" && !!item.trim()
  );
}
function asTrimmedNonEmptyStringArray(value) {
  return asNonEmptyStringArray(value).map((item) => item.trim());
}

// packages/core/optionalString.ts
function asOptionalTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}

export {
  asNonEmptyStringArray,
  asTrimmedNonEmptyStringArray,
  asOptionalTrimmedString
};
