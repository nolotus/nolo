/**
 * Test fetch helper that safely casts mock functions to Bun's `typeof fetch`
 * (which requires `.preconnect` in its type definition).
 */
export function asFetch<T extends (...args: any[]) => any>(fn: T): typeof fetch {
  return fn as unknown as typeof fetch;
}
