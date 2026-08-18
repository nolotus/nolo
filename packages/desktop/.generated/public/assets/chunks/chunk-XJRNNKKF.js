// packages/core/serverOrigin.ts
function normalizeServerOrigin(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : "";
}

export {
  normalizeServerOrigin
};
