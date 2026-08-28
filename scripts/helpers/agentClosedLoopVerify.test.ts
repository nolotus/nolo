import { describe, expect, test } from "bun:test";

import {
  buildClosedLoopReport,
  failedStep,
  stepFromChildReport,
} from "./agentClosedLoopVerify";

describe("agentClosedLoopVerify", () => {
  test("summarizes passed and skipped steps", () => {
    const report = buildClosedLoopReport({
      dryRun: true,
      runLive: false,
      writeWiring: false,
      steps: [
        { name: "wiring", status: "pass", ok: true },
        { name: "eval", status: "skipped", ok: true },
      ],
    });

    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({ passed: 1, failed: 0, skipped: 1 });
  });

  test("marks a child report failure as closed-loop failure", () => {
    const report = buildClosedLoopReport({
      dryRun: false,
      runLive: true,
      writeWiring: false,
      steps: [
        stepFromChildReport("wiring", { ok: true }),
        stepFromChildReport("eval", { ok: false }),
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.summary.failed).toBe(1);
  });

  test("normalizes thrown errors into failed steps", () => {
    const step = failedStep("eval", new Error("boom"));

    expect(step).toMatchObject({
      name: "eval",
      status: "fail",
      ok: false,
      error: "boom",
    });
  });
});
