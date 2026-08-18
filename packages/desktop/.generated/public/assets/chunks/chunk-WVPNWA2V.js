import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  LEGACY_OLLAMA_CLOUD_PROVIDER,
  PLATFORM_HOSTED_KIMI_PROVIDER
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";

// packages/ai/llm/providerDisplay.ts
function getPublicProviderLabel(provider) {
  const p = asTrimmedLowercaseString(provider);
  if (!p) return null;
  if (p === PLATFORM_HOSTED_KIMI_PROVIDER || p === LEGACY_OLLAMA_CLOUD_PROVIDER) {
    return "nolo";
  }
  return asTrimmedString(provider);
}
function formatProviderModelLine(provider, model) {
  const label = getPublicProviderLabel(provider);
  const m = asTrimmedString(model);
  if (label && m) return `${label} / ${m}`;
  if (m) return m;
  if (label) return label;
  return "";
}

export {
  getPublicProviderLabel,
  formatProviderModelLine
};
