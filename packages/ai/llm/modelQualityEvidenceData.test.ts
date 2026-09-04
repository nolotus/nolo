import { describe, expect, it } from "bun:test";

import {
  DOMAIN_BENCHMARK_PRIORITY,
  resolveCandidateQualityEvidence,
  resolveModelQualityEvidence,
} from "./modelQualityEvidence";
import { MODEL_QUALITY_EVIDENCE } from "./modelQualityEvidenceData";

// Real curated data must resolve exactly as confirmed at the source pages.
describe("modelQualityEvidenceData (real evidence)", () => {
  it("resolves Terminal-Bench 4.0 for the confirmed terminal candidates", () => {
    const resolved = resolveCandidateQualityEvidence(
      ["gpt-6-astra", "claude-fable-5-1", "gemini-3.8-flash"],
      "coding.terminal",
      MODEL_QUALITY_EVIDENCE,
    );
    expect(resolved.map((entry) => entry.evidence?.score)).toEqual([57.9, 55.8, 19.1]);
    expect(
      resolved.every(
        (entry) =>
          entry.evidence?.benchmark === "terminal-bench-4" &&
          entry.evidence.benchmarkVersion === "4.0" &&
          entry.evidence.sourceUrl === "https://openai.com/index/gpt-6-astra/",
      ),
    ).toBe(true);
  });

  it("resolves DeepSWE 1.1 for coding.repo", () => {
    const resolved = resolveCandidateQualityEvidence(
      ["gpt-6-astra", "claude-fable-5-1", "gemini-3.8-flash"],
      "coding.repo",
      MODEL_QUALITY_EVIDENCE,
    );
    expect(resolved.map((entry) => entry.evidence?.score)).toEqual([74.1, 67.4, 73.8]);
    expect(
      resolved.every((entry) => entry.evidence?.benchmark === "deepswe-1.1"),
    ).toBe(true);
  });

  it("resolves Agents on Rails; Gemini 3.8 Flash stays correctly missing", () => {
    const resolved = resolveCandidateQualityEvidence(
      ["claude-fable-5-1", "glm-5-3-flash", "gemini-3.8-flash"],
      "coding.rails",
      MODEL_QUALITY_EVIDENCE,
    );
    expect(resolved[0]?.evidence).toMatchObject({ benchmark: "agents-on-rails", score: 92 });
    expect(resolved[1]?.evidence).toMatchObject({ benchmark: "agents-on-rails", score: 83 });
    // No confirmed Rails score for Gemini 3.8 Flash: missing must stay missing.
    expect(resolved[2]).toEqual({ model: "gemini-3.8-flash", evidence: null });
  });

  it("never falls back across domains to fill missing evidence", () => {
    // Gemini has terminal + repo evidence but nothing for rails.
    expect(resolveModelQualityEvidence("gemini-3.8-flash", "coding.rails", MODEL_QUALITY_EVIDENCE)).toBeNull();
    // GLM has rails evidence but nothing for terminal/repo.
    expect(resolveModelQualityEvidence("glm-5-3-flash", "coding.terminal", MODEL_QUALITY_EVIDENCE)).toBeNull();
    expect(resolveModelQualityEvidence("glm-5-3-flash", "coding.repo", MODEL_QUALITY_EVIDENCE)).toBeNull();
    // design.website is deliberately empty this round.
    expect(resolveModelQualityEvidence("claude-fable-5-1", "design.website", MODEL_QUALITY_EVIDENCE)).toBeNull();
    expect(MODEL_QUALITY_EVIDENCE.some((entry) => entry.domain === "design.website")).toBe(false);
  });

  it("keeps every recorded benchmark declared in its domain priority", () => {
    for (const entry of MODEL_QUALITY_EVIDENCE) {
      const priority = DOMAIN_BENCHMARK_PRIORITY[entry.domain];
      expect(priority).toBeDefined();
      expect(priority).toContain(entry.benchmark);
    }
  });

  it("has no duplicate (model, domain, benchmark) observations", () => {
    const keys = MODEL_QUALITY_EVIDENCE.map((entry) => `${entry.model}|${entry.domain}|${entry.benchmark}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry carries provenance and keeps the raw benchmark-native score", () => {
    expect(MODEL_QUALITY_EVIDENCE).toHaveLength(8);
    for (const entry of MODEL_QUALITY_EVIDENCE) {
      expect(entry.sourceUrl).toMatch(/^https:\/\//);
      expect(typeof entry.score).toBe("number");
      // Percent-scale benchmarks: raw values, never rescaled to 0-1.
      expect(entry.score).toBeGreaterThan(1);
    }
  });
});
