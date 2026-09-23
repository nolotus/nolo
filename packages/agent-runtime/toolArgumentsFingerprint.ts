// packages/agent-runtime/toolArgumentsFingerprint.ts
//
// Deterministic machine identity for a tool call's arguments.
//
// `argumentsPreview` (see summarizeToolArguments) is a lossy human-readable
// projection — two different argument sets can collapse to the same preview
// (`readFile {path:"a.ts",lines:"1-50"}` and `{path:"a.ts",lines:"100-150"}`
// both preview as `a.ts`). Observation consumers that need to detect repeated
// tool calls cannot rely on it.
//
// `argumentsFingerprint` solves this: a stable hash over the canonical JSON
// normalization of the FULL arguments, with object key order normalized and
// array order preserved. It never contains raw argument text, so it is safe
// to persist and send to external consumers.
//
// Identity boundary: this fingerprint covers arguments only. Tool identity is
// `canonicalToolName + argumentsFingerprint` — callers compose them.

import { normalizeToolArguments } from "./progressGuard";

// FNV-1a 32-bit, computed with Math.imul so the 32-bit modular multiply is
// exact.
//
// Why not `core/fnv1a32`? Its `hash * 0x01000193 >>> 0` multiplies in float64
// and loses the low bits once the product passes 2^53: measured on 100k
// realistic canonical argument strings it produced 11 hash collisions where
// this exact-multiply version produced 0. A hash collision here would surface
// as a FALSE `repeated_tool_call` signal — the exact false positive this
// fingerprint exists to prevent — so the cheaper collision rate is not
// acceptable for this seam.
//
// The shared helper cannot simply be corrected instead: its outputs are
// load-bearing persisted identities (`cred-<hex>` credential groups in agent
// records, deploy worker-name prefixes), so changing its arithmetic would
// re-key existing records. That is a migration, not a PR-local fix.
//
// Non-cryptographic: we need a stable equality key, not adversarial resistance.
const hashFingerprintInput = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/**
 * Build a deterministic fingerprint for a tool call's arguments.
 *
 * Accepts the raw argument payload as produced by providers: a JSON string
 * (the common case for OpenAI-compatible tool_calls) or an already-parsed
 * object/array (some providers hand structured args directly). Invalid JSON
 * falls back to a deterministic normalization of the raw text — never throws.
 *
 * Returns an 8-char hex string.
 *
 * Only `undefined` / `null` (the argument field is absent — the emitter never
 * received a payload) yield `undefined`, so emitters can omit the field rather
 * than forge an identity. An empty-but-present payload — `""`, `"{}"`, `"[]"`,
 * `{}` — IS a real no-arg tool call and gets a stable full-quality fingerprint,
 * because the emitter did receive the complete (empty) arguments.
 */
export function buildToolArgumentsFingerprint(
  rawArguments: unknown,
): string | undefined {
  if (rawArguments === undefined || rawArguments === null) return undefined;
  const normalized = normalizeToolArguments(rawArguments);
  return hashFingerprintInput(normalized);
}
