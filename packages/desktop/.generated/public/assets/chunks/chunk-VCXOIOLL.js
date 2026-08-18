// packages/core/trimmedLowercaseString.ts
function asTrimmedLowercaseString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export {
  asTrimmedLowercaseString
};
