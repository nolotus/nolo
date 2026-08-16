import { toErrorMessage } from "core/errorMessage";

export type ClosedLoopStepStatus = "pass" | "fail" | "skipped";

export type ClosedLoopStepResult = {
  name: string;
  status: ClosedLoopStepStatus;
  ok: boolean;
  report?: unknown;
  error?: string;
};

export type ClosedLoopReport = {
  ok: boolean;
  dryRun: boolean;
  runLive: boolean;
  writeWiring: boolean;
  steps: ClosedLoopStepResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
};

export function buildClosedLoopReport(args: {
  dryRun: boolean;
  runLive: boolean;
  writeWiring: boolean;
  steps: ClosedLoopStepResult[];
}): ClosedLoopReport {
  const summary = {
    passed: args.steps.filter((step) => step.status === "pass").length,
    failed: args.steps.filter((step) => step.status === "fail").length,
    skipped: args.steps.filter((step) => step.status === "skipped").length,
  };
  return {
    ok: summary.failed === 0,
    dryRun: args.dryRun,
    runLive: args.runLive,
    writeWiring: args.writeWiring,
    steps: args.steps,
    summary,
  };
}

export function stepFromChildReport(name: string, child: unknown): ClosedLoopStepResult {
  const ok = Boolean((child as any)?.ok);
  return {
    name,
    status: ok ? "pass" : "fail",
    ok,
    report: child,
  };
}

export function failedStep(name: string, error: unknown): ClosedLoopStepResult {
  return {
    name,
    status: "fail",
    ok: false,
    error: toErrorMessage(error),
  };
}
