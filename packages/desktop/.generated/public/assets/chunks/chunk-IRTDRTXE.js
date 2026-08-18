// packages/core/isRecord.ts
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export {
  isRecord
};
