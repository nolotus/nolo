import { describe, expect, it } from "bun:test";

import {
  decideAgentThreadAdmission,
  normalizeAgentThreadMaxConcurrent,
  resolveAgentThreadMaxConcurrent,
} from "./agentThreadAdmission";

describe("agentThreadAdmission", () => {
  it("normalizes only positive integer maxConcurrent values", () => {
    expect(normalizeAgentThreadMaxConcurrent(1)).toBe(1);
    expect(normalizeAgentThreadMaxConcurrent(3)).toBe(3);
    expect(normalizeAgentThreadMaxConcurrent(0)).toBeNull();
    expect(normalizeAgentThreadMaxConcurrent(-1)).toBeNull();
    expect(normalizeAgentThreadMaxConcurrent(1.5)).toBeNull();
    expect(normalizeAgentThreadMaxConcurrent("3")).toBeNull();
    expect(normalizeAgentThreadMaxConcurrent(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("prefers nested admission.maxConcurrent over top-level legacy config", () => {
    expect(
      resolveAgentThreadMaxConcurrent({
        maxConcurrent: 5,
        admission: { maxConcurrent: 2 },
      }),
    ).toBe(2);
  });

  it("falls back to top-level maxConcurrent for minimal agent config", () => {
    expect(resolveAgentThreadMaxConcurrent({ maxConcurrent: 4 })).toBe(4);
  });

  it("defaults to maxConcurrent = 2 when no limit is configured", () => {
    expect(
      decideAgentThreadAdmission({
        agentConfig: {},
        activeThreadCount: 0,
      }),
    ).toEqual({
      allowed: true,
      activeThreadCount: 0,
      maxConcurrent: 2,
    });

    expect(
      decideAgentThreadAdmission({
        agentConfig: {},
        activeThreadCount: 999,
      }),
    ).toEqual({
      allowed: false,
      reason: "max_concurrent_reached",
      activeThreadCount: 999,
      maxConcurrent: 2,
    });
  });

  it("allows dispatch below the by-agent limit", () => {
    expect(
      decideAgentThreadAdmission({
        agentConfig: { admission: { maxConcurrent: 3 } },
        activeThreadCount: 2,
      }),
    ).toEqual({
      allowed: true,
      activeThreadCount: 2,
      maxConcurrent: 3,
    });
  });

  it("rejects dispatch at or above the by-agent limit", () => {
    expect(
      decideAgentThreadAdmission({
        agentConfig: { admission: { maxConcurrent: 2 } },
        activeThreadCount: 2,
      }),
    ).toEqual({
      allowed: false,
      reason: "max_concurrent_reached",
      activeThreadCount: 2,
      maxConcurrent: 2,
    });
  });
});
