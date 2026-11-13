/** Known gateway request-item limits; unknown providers keep token-only behavior. */
export const PROVIDER_INPUT_ITEM_LIMITS = [
  {
    provider: "opendesign",
    endpointHost: "open-design.ai",
    // Upstream HTTP 400: "[code=context_length_exceeded] Input is too long:
    // conversation history exceeds the limit on input items (1003 > 1000 items)."
    // type=invalid_request_error, code=context_length_exceeded, param=messages.
    maxInputItems: 1000,
  },
] as const;

export function resolveProviderInputItemLimit(args: {
  provider?: string | null;
  endpoint?: string | null;
}): number | undefined {
  const byProvider = PROVIDER_INPUT_ITEM_LIMITS.find(
    entry => entry.provider === args.provider?.toLowerCase(),
  );
  if (byProvider) return byProvider.maxInputItems;
  if (!args.endpoint) return undefined;
  let host: string;
  try {
    host = new URL(args.endpoint.includes("://") ? args.endpoint : `https://${args.endpoint}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return PROVIDER_INPUT_ITEM_LIMITS.find(entry =>
    host === entry.endpointHost || host.endsWith(`.${entry.endpointHost}`),
  )?.maxInputItems;
}
