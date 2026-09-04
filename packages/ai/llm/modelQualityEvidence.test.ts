import { describe, expect, it } from "bun:test";

import {
  DOMAIN_BENCHMARK_PRIORITY,
  resolveCandidateQualityEvidence,
  resolveModelQualityEvidence,
  type ModelQualityEvidence,
} from "./modelQualityEvidence";

// Synthetic fixtures only — no real leaderboard data is transcribed here.
const TERMINAL_FIXTURES: ModelQualityEvidence[] = [
  { model: "model-a", domain: "coding.terminal", benchmark: "terminal-bench-4", score: 55 },
  { model: "model-a", domain: "coding.terminal", benchmark: "terminal-bench-2.1", score: 90 },
  { model: "model-b", domain: "coding.terminal", benchmark: "terminal-bench-3", score: 70 },
];

describe("modelQualityEvidence", () => {
  it("A: prefers the newest declared benchmark over a higher raw score", () => {
    const resolved = resolveModelQualityEvidence("model-a", "coding.terminal", TERMINAL_FIXTURES);
    expect(resolved?.benchmark).toBe("terminal-bench-4");
    expect(resolved?.score).toBe(55); // raw score preserved, not normalized/compared
  });

  it("B: falls back to the next declared benchmark when the newest is missing", () => {
    const older: ModelQualityEvidence[] = [
      { model: "model-b", domain: "coding.terminal", benchmark: "terminal-bench-2.1", score: 64 },
      { model: "model-b", domain: "coding.terminal", benchmark: "terminal-bench-3", score: 70 },
    ];
    const resolved = resolveModelQualityEvidence("model-b", "coding.terminal", older);
    expect(resolved?.benchmark).toBe("terminal-bench-3");
  });

  it("C: never leaks evidence across domains", () => {
    const mixed: ModelQualityEvidence[] = [
      ...TERMINAL_FIXTURES,
      { model: "model-a", domain: "design.website", benchmark: "design-arena-website", score: 82 },
    ];
    const terminal = resolveModelQualityEvidence("model-a", "coding.terminal", mixed);
    const design = resolveModelQualityEvidence("model-a", "design.website", mixed);
    expect(terminal?.benchmark).toBe("terminal-bench-4");
    expect(terminal?.domain).toBe("coding.terminal");
    expect(design?.benchmark).toBe("design-arena-website");
    expect(design?.domain).toBe("design.website");
  });

  it("D: prunes to the candidate list, preserving input order", () => {
    const store: ModelQualityEvidence[] = [
      ...TERMINAL_FIXTURES,
      { model: "model-c", domain: "coding.terminal", benchmark: "terminal-bench-4", score: 48 },
      { model: "model-d", domain: "coding.terminal", benchmark: "terminal-bench-3", score: 61 },
    ];
    const pruned = resolveCandidateQualityEvidence(["model-a", "model-c"], "coding.terminal", store);
    expect(pruned.map((entry) => entry.model)).toEqual(["model-a", "model-c"]);
    expect(pruned[0]?.evidence?.benchmark).toBe("terminal-bench-4");
    expect(pruned[1]?.evidence?.benchmark).toBe("terminal-bench-4");
  });

  it("E: returns null evidence for unknown models instead of throwing", () => {
    expect(resolveModelQualityEvidence("model-zzz", "coding.terminal", TERMINAL_FIXTURES)).toBeNull();
    const pruned = resolveCandidateQualityEvidence(["model-zzz"], "coding.terminal", TERMINAL_FIXTURES);
    expect(pruned).toEqual([{ model: "model-zzz", evidence: null }]);
  });

  it("F: ignores benchmarks not declared in the domain priority", () => {
    const unreviewed: ModelQualityEvidence[] = [
      { model: "model-b", domain: "coding.terminal", benchmark: "unreviewed-bench-9", score: 99 },
    ];
    expect(resolveModelQualityEvidence("model-b", "coding.terminal", unreviewed)).toBeNull();
    // An unreviewed entry never shadows a declared benchmark.
    const both: ModelQualityEvidence[] = [
      ...unreviewed,
      { model: "model-b", domain: "coding.terminal", benchmark: "terminal-bench-3", score: 70 },
    ];
    expect(resolveModelQualityEvidence("model-b", "coding.terminal", both)?.benchmark).toBe("terminal-bench-3");
  });

  it("returns null for domains without a declared priority", () => {
    expect(DOMAIN_BENCHMARK_PRIORITY["coding.general"]).toBeUndefined();
    expect(resolveModelQualityEvidence("model-a", "coding.general", TERMINAL_FIXTURES)).toBeNull();
  });

  it("preserves benchmark identity (version) and raw score untouched", () => {
    const versioned: ModelQualityEvidence[] = [
      {
        model: "model-b",
        domain: "coding.terminal",
        benchmark: "terminal-bench-4",
        benchmarkVersion: "2026-06",
        score: 55.8,
      },
    ];
    const resolved = resolveModelQualityEvidence("model-b", "coding.terminal", versioned);
    expect(resolved).toBe(versioned[0]);
    expect(resolved?.benchmarkVersion).toBe("2026-06");
    expect(resolved?.score).toBe(55.8);
  });
});
