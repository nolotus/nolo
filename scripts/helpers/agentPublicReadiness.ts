import type { AgentPublicGateConfig } from "./agentCreationSpec";
import type { AgentEvalCase } from "./agentMultiTurnEval";

export type { AgentPublicGateConfig };

export type ReferenceReadabilityResult = {
  dbKey: string;
  title?: string;
  ok: boolean;
  status?: number;
  message?: string;
};

export type MemoryInjectionResult = {
  hasUnrelatedUserGlobalMemory: boolean;
  detail?: string;
};

export type AgentPublicReadinessInput = {
  evalCases: AgentEvalCase[];
  prompt: string;
  recordName: string;
  recordText: string;
  publicAlias?: Record<string, unknown> | null;
  publicName?: string;
  gate: AgentPublicGateConfig;
  referenceReadabilityResults?: ReferenceReadabilityResult[];
  memoryInjectionResult?: MemoryInjectionResult | null;
};

export type CheckSeverity = "ok" | "fail";

export type PublicReadinessCheck = {
  id: string;
  label: string;
  severity: CheckSeverity;
  detail?: string;
};

export type AgentPublicReadinessReport = {
  ok: boolean;
  checks: PublicReadinessCheck[];
  summary: string;
};

function countMultiTurnCases(cases: AgentEvalCase[]): number {
  return cases.filter((c) => c.turns.length >= 2).length;
}

function matchesAnySignal(value: string, signals: string[]): boolean {
  const lower = value.toLowerCase();
  return signals.some((signal) => {
    const normalized = signal.toLowerCase();
    return lower.includes(normalized) || normalized.includes(lower);
  });
}

function countSourceGroundedCases(cases: AgentEvalCase[], signals: string[]): number {
  return cases.filter((c) =>
    c.turns.some(
      (turn) =>
        (turn.required ?? []).some((value) => matchesAnySignal(value, signals)) ||
        (turn.requiredAny ?? []).some((value) => matchesAnySignal(value, signals)),
    ),
  ).length;
}

function countSafetyCases(cases: AgentEvalCase[], signals: string[]): number {
  return cases.filter((c) =>
    c.turns.some(
      (turn) =>
        (turn.forbidden ?? []).some((value) => matchesAnySignal(value, signals)),
    ),
  ).length;
}

function checkForbiddenRecordText(
  recordText: string,
  forbiddenTerms: string[],
): string[] {
  const lower = recordText.toLowerCase();
  return forbiddenTerms.filter((term) => lower.includes(term.toLowerCase()));
}

function checkRequiredPromptText(
  prompt: string,
  requiredTerms: string[],
): string[] {
  const lower = prompt.toLowerCase();
  return requiredTerms.filter((term) => !lower.includes(term.toLowerCase()));
}

const SENSITIVE_FIELDS = ["apiKey", "apiKeyFromAgentKey", "secret", "password"];

function checkPublicAliasSecrets(alias: Record<string, unknown>): string[] {
  return SENSITIVE_FIELDS.filter((field) => alias[field] !== undefined);
}

export function evaluateAgentPublicReadiness(
  input: AgentPublicReadinessInput,
): AgentPublicReadinessReport {
  const { evalCases, prompt, recordName, recordText, publicAlias, publicName, gate } = input;
  const checks: PublicReadinessCheck[] = [];

  // Eval case count
  if (gate.minCases !== undefined) {
    const ok = evalCases.length >= gate.minCases;
    checks.push({
      id: "eval-case-count",
      label: `Eval cases >= ${gate.minCases}`,
      severity: ok ? "ok" : "fail",
      detail: `Found ${evalCases.length} cases.`,
    });
  }

  // Multi-turn cases
  if (gate.minMultiTurnCases !== undefined) {
    const count = countMultiTurnCases(evalCases);
    const ok = count >= gate.minMultiTurnCases;
    checks.push({
      id: "multi-turn-case-count",
      label: `Multi-turn cases >= ${gate.minMultiTurnCases}`,
      severity: ok ? "ok" : "fail",
      detail: `Found ${count} multi-turn cases.`,
    });
  }

  // Source-grounded cases
  if (gate.minSourceGroundedCases !== undefined) {
    const signals = gate.sourceGroundingSignals ?? [];
    const count = signals.length > 0 ? countSourceGroundedCases(evalCases, signals) : 0;
    const ok = count >= gate.minSourceGroundedCases;
    checks.push({
      id: "source-grounded-case-count",
      label: `Source-grounded cases >= ${gate.minSourceGroundedCases}`,
      severity: ok ? "ok" : "fail",
      detail: signals.length > 0
        ? `Found ${count} source-grounded cases.`
        : "No publicGate.sourceGroundingSignals configured.",
    });
  }

  // Safety cases
  if (gate.minSafetyCases !== undefined) {
    const signals = gate.safetySignals ?? [];
    const count = signals.length > 0 ? countSafetyCases(evalCases, signals) : 0;
    const ok = count >= gate.minSafetyCases;
    checks.push({
      id: "safety-case-count",
      label: `Safety cases >= ${gate.minSafetyCases}`,
      severity: ok ? "ok" : "fail",
      detail: signals.length > 0
        ? `Found ${count} safety cases.`
        : "No publicGate.safetySignals configured.",
    });
  }

  // Forbidden record text
  if (gate.forbiddenRecordText && gate.forbiddenRecordText.length > 0) {
    const found = checkForbiddenRecordText(recordText, gate.forbiddenRecordText);
    const ok = found.length === 0;
    checks.push({
      id: "forbidden-record-text",
      label: "Record text free of forbidden leakage terms",
      severity: ok ? "ok" : "fail",
      detail: ok ? undefined : `Found forbidden terms in record: ${found.join(", ")}`,
    });
  }

  // Required prompt text
  if (gate.requiredPromptText && gate.requiredPromptText.length > 0) {
    const missing = checkRequiredPromptText(prompt, gate.requiredPromptText);
    const ok = missing.length === 0;
    checks.push({
      id: "required-prompt-text",
      label: "Prompt contains required text",
      severity: ok ? "ok" : "fail",
      detail: ok ? undefined : `Missing required prompt text: ${missing.join(", ")}`,
    });
  }

  // Public alias exists
  if (gate.requirePublicAlias) {
    const ok = publicAlias != null;
    checks.push({
      id: "public-alias-exists",
      label: "Public alias record exists",
      severity: ok ? "ok" : "fail",
      detail: ok ? undefined : "No public alias record found.",
    });
  }

  // No public secrets
  if (gate.requireNoPublicSecrets && publicAlias) {
    const secrets = checkPublicAliasSecrets(publicAlias);
    const ok = secrets.length === 0;
    checks.push({
      id: "no-public-secrets",
      label: "Public alias has no secrets",
      severity: ok ? "ok" : "fail",
      detail: ok ? undefined : `Found secret fields in public alias: ${secrets.join(", ")}`,
    });
  }

  // Public name match
  if (publicName) {
    const ok = recordName === publicName;
    checks.push({
      id: "public-name-match",
      label: `Record name matches publicName "${publicName}"`,
      severity: ok ? "ok" : "fail",
      detail: ok ? undefined : `Record name "${recordName}" does not match publicName "${publicName}".`,
    });
  }

  // Reference readability by public (unauthenticated) user
  if (gate.requireReferenceReadability) {
    const results = input.referenceReadabilityResults ?? [];
    const failures = results.filter((r) => !r.ok);
    const ok = results.length > 0 && failures.length === 0;
    checks.push({
      id: "reference-readability",
      label: "All references readable by public agent run",
      severity: ok ? "ok" : "fail",
      detail: ok
        ? `${results.length} reference(s) verified.`
        : failures.length > 0
          ? `Failed to read ${failures.length} reference(s): ${failures.map((f) => `${f.dbKey} (${f.status ?? "err"}: ${f.message ?? "unknown"})`).join("; ")}`
          : "No reference readability results provided.",
    });
  }

  // Memory injection: public specialist agent must not inject unrelated user-global memory
  if (gate.forbidUnrelatedUserGlobalMemory) {
    const memResult = input.memoryInjectionResult ?? null;
    const ok = memResult ? !memResult.hasUnrelatedUserGlobalMemory : false;
    checks.push({
      id: "no-unrelated-memory-injection",
      label: "Public specialist agent does not inject unrelated user-global memory",
      severity: ok ? "ok" : "fail",
      detail: ok
        ? undefined
        : memResult?.detail ?? "No memory injection verification result provided.",
    });
  }

  const failed = checks.filter((c) => c.severity === "fail");
  const ok = failed.length === 0;

  const parts: string[] = [];
  if (ok) {
    parts.push("All checks passed.");
  } else {
    parts.push(`${failed.length} check(s) failed.`);
  }
  parts.push(`${checks.length} total, ${checks.filter((c) => c.severity === "ok").length} ok, ${failed.length} fail.`);

  return {
    ok,
    checks,
    summary: parts.join(" "),
  };
}
