// ai/llm/modelQualityEvidenceData.ts
//
// Curated, human-confirmed real benchmark evidence (v1.1).
//
// Data-only: no computation, no resolvers, immutable/readonly. Benchmark
// updates should mostly touch this file; adopt a new benchmark family/version
// by bumping DOMAIN_BENCHMARK_PRIORITY in modelQualityEvidence.ts — never by
// changing the resolver.
//
// Provenance rules:
// - every entry carries a sourceUrl pointing at the public page the score was
//   read from;
// - no guessing: a model without a confirmed score for a domain simply has no
//   entry (missing evidence must stay missing);
// - deliberately NOT recorded: Design Arena website Elo (changelog confirms
//   the model additions but the public page exposes no stable exact values),
//   Muse Spark 1.3 (Artificial Analysis Intelligence Index is not a
//   domain-specific quality benchmark; output speed / TTFT belong to a future
//   separate speed dimension), pre-4.0 Terminal-Bench snapshots.

import type { ModelQualityEvidence } from "./modelQualityEvidence";

// Canonical model ids follow the repo's existing naming systems:
// - claude family encodes the minor version with dashes (claude-opus-4-6),
//   so Fable 5.1 is `claude-fable-5-1` (not yet in the runtime catalog — the
//   evidence store never requires a catalog hit, so recording the canonical
//   future id is fine; do not alias it to claude-fable-5);
// - `gemini-3.8-flash` matches modelAbility.ts;
// - `glm-5-3-flash` is PLATFORM_HOSTED_GLM_53_FLASH_MODEL (`glm-5.3-flash`
//   is an accepted alias, the constant is the primary id).

/** Source shared by the Terminal-Bench 4.0 and DeepSWE 1.1 tables. */
const GPT6_ASTRA_LAUNCH_URL = "https://openai.com/index/gpt-6-astra/";
/** Agents on Rails update covering Claude Fable 5.1 and GLM 5.3 Flash. */
const RAILS_FABLE_GLM_URL =
  "https://rubyonrails.org/2026/9/2/agents-on-rails-claude-fable-5-1-and-glm-5-3-flash";

/**
 * Curated current evidence. Only human-confirmed scores from the source pages
 * below; scores stay benchmark-native (percent here), never normalized.
 */
export const MODEL_QUALITY_EVIDENCE: readonly ModelQualityEvidence[] = [
  // coding.terminal — Terminal-Bench 4.0 (percent, same source table).
  { model: "gpt-6-astra", domain: "coding.terminal", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 57.9, sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "claude-fable-5-1", domain: "coding.terminal", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 55.8, sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "gemini-3.8-flash", domain: "coding.terminal", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 19.1, sourceUrl: GPT6_ASTRA_LAUNCH_URL },

  // coding.repo — DeepSWE 1.1 (percent, same source).
  { model: "gpt-6-astra", domain: "coding.repo", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 74.1, sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "claude-fable-5-1", domain: "coding.repo", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 67.4, sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "gemini-3.8-flash", domain: "coding.repo", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 73.8, sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  // coding.rails — Agents on Rails (leaderboard percent).
  { model: "claude-fable-5-1", domain: "coding.rails", benchmark: "agents-on-rails", score: 92, sourceUrl: RAILS_FABLE_GLM_URL },
  { model: "glm-5-3-flash", domain: "coding.rails", benchmark: "agents-on-rails", score: 83, sourceUrl: RAILS_FABLE_GLM_URL },
];
