import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "useActionsHoverPin.ts"),
  "utf-8"
);

describe("useActionsHoverPin source contract", () => {
  it("exports leave-delay constant and pin API", () => {
    expect(source).toContain("export const ACTIONS_HOVER_LEAVE_DELAY_MS");
    expect(source).toContain("export function useActionsHoverPin");
    expect(source).toContain("isActionsHover");
    expect(source).toContain("onMouseEnter");
    expect(source).toContain("onMouseLeave");
  });

  it("clears the leave timer on enter and on unmount", () => {
    expect(source).toContain("clearLeaveTimer");
    expect(source).toContain("window.clearTimeout");
    expect(source).toContain("useEffect(() => () => clearLeaveTimer()");
  });

  it("no-ops handlers when disabled", () => {
    expect(source).toContain("if (!enabled) return");
    expect(source).toContain("onMouseEnter: enabled ? onMouseEnter : undefined");
    expect(source).toContain("onMouseLeave: enabled ? onMouseLeave : undefined");
  });
});
