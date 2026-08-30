import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  buildTsxElementIndex,
  auditEscapeHatchFiles,
  deriveStylexSpecificities,
  calculateSpecificity,
  compareSpecificity,
  type Specificity,
} from "./stylexCascadeAuditor.js";

const workspaceRoot = join(import.meta.dir, "../..");

describe("StyleX Escape Hatch Cascade Specificity Audit", () => {
  const elementIndex = buildTsxElementIndex(workspaceRoot);

  const escapeHatchFiles = [
    "packages/chat/web/chatStylexEscapeHatch.css",
    "packages/chat/dialog/dialogStylexEscapeHatch.css",
    "packages/chat/messages/web/messagesStylexEscapeHatch.css",
    "packages/app/pages/QuickChat.css",
    "packages/create/space/pages/SpaceContent.css",
    "packages/ai/agent/web/agentCreateStylexEscapeHatch.css",
    "packages/ai/agent/web/agentPageStylexEscapeHatch.css",
  ];

  it("ensures ZERO handwritten escape hatch rules are losing to StyleX", () => {
    const audit = auditEscapeHatchFiles(escapeHatchFiles, elementIndex, workspaceRoot);

    if (audit.losing.length > 0) {
      console.error(
        "Failing losing rules:",
        audit.losing.map((l) => `[${l.file}:${l.line}] ${l.selector}`),
      );
    }

    expect(audit.losing.length).toBe(0);
    expect(audit.winning.length).toBeGreaterThan(0);
    expect(audit.derivedSpecificities.globalMax.A).toBeGreaterThanOrEqual(4);
  });

  it("accurately detects regressions when a boosted rule drops below opponent specificity", () => {
    // Synthetic regression check: simulate a degraded selector
    const degradedSelector = ".ChatSidebar__content--single-section .CategorySection__content-inner";
    const spec = calculateSpecificity(degradedSelector);
    const maxOpponentSpecificity: Specificity = { A: 4, B: 1, C: 0 };
    const wins = compareSpecificity(spec, maxOpponentSpecificity) > 0;
    expect(wins).toBe(false);
  });

  it("fails the gate when opponent specificity becomes stronger (mutation test)", () => {
    const entryCssPath = join(workspaceRoot, "public/assets/entry.css");
    const derived = deriveStylexSpecificities(entryCssPath);

    // Mutate opponent standard max to be 1 tier higher in A (e.g. standardMax.A + 1 = 5)
    // to simulate StyleX introducing stronger opponent rules without boosting escape hatches.
    const strongerOpponent: Specificity = {
      A: derived.standardMax.A + 1,
      B: derived.standardMax.B,
      C: derived.standardMax.C,
    };

    const mutatedAudit = auditEscapeHatchFiles(
      escapeHatchFiles,
      elementIndex,
      workspaceRoot,
      { maxOpponentOverride: strongerOpponent, silent: true },
    );

    // Assert that the gate is sensitive to opponent strength increases and catches losing rules
    expect(mutatedAudit.losing.length).toBeGreaterThan(0);
  });
});
