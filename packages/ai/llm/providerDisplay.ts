// packages/ai/llm/providerDisplay.ts
// User-facing provider labels. Internal routing ids may differ.

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { asTrimmedString } from "core/trimmedString";
import {
  LEGACY_OLLAMA_CLOUD_PROVIDER,
  PLATFORM_HOSTED_KIMI_PROVIDER,
} from "./kimi";

/**
 * Label shown in product UI. Returns null when the provider should be hidden
 * (caller should omit the segment entirely).
 */
export function getPublicProviderLabel(
  provider?: string | null
): string | null {
  const p = asTrimmedLowercaseString(provider);
  if (!p) return null;
  if (p === PLATFORM_HOSTED_KIMI_PROVIDER || p === LEGACY_OLLAMA_CLOUD_PROVIDER) {
    // Product brand only — no third-party cloud name.
    return "nolo";
  }
  return asTrimmedString(provider);
}

/** Format "provider · model" for UI; hides empty / internal providers cleanly. */
export function formatProviderModelLine(
  provider?: string | null,
  model?: string | null
): string {
  const label = getPublicProviderLabel(provider);
  const m = asTrimmedString(model);
  if (label && m) return `${label} / ${m}`;
  if (m) return m;
  if (label) return label;
  return "";
}
