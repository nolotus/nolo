import { describe, expect, it } from "bun:test";
import { CORE_DRAIN_REASON, SERVER_DRAIN_REASON } from "./drainReason";

describe("drainReason shared wire constant", () => {
  it("defines the exact wire reason string", () => {
    expect(CORE_DRAIN_REASON).toBe("core_draining");
  });

  it("keeps server and client aliases identical", () => {
    expect(SERVER_DRAIN_REASON).toBe(CORE_DRAIN_REASON);
  });
});
