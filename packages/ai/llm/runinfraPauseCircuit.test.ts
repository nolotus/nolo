import { describe, expect, it, beforeEach } from "bun:test";
import {
  MAX_PAUSE_MS,
  clearRuninfraPause,
  getRuninfraPauseRemainingMs,
  recordRuninfraPause,
  resetRuninfraPauseCircuit,
} from "./runinfraPauseCircuit";

describe("runinfra hosted_model_paused circuit", () => {
  beforeEach(() => {
    resetRuninfraPauseCircuit();
  });

  it("records paused_until and reports remaining wait", () => {
    const now = 1_000_000;
    const resumeAt = recordRuninfraPause({
      model: "glm-5-3-flash",
      pausedUntil: new Date(now + 5_000).toISOString(),
      nowMs: now,
    });

    expect(resumeAt).toBe(now + 5_000);
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBe(5_000);
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now + 4_000)).toBe(
      1_000,
    );
  });

  it("expires the entry once the window passes", () => {
    const now = 2_000_000;
    recordRuninfraPause({
      model: "glm-5-3-flash",
      pausedUntil: new Date(now + 3_000).toISOString(),
      nowMs: now,
    });

    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now + 3_001)).toBeNull();
    // 过期后应已被惰性清理，再查仍为 null
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now + 10)).toBeNull();
  });

  it("falls back to retryAfterMs when paused_until is unparseable", () => {
    const now = 3_000_000;
    const resumeAt = recordRuninfraPause({
      model: "glm-5-3-flash",
      pausedUntil: "not-a-date",
      retryAfterMs: 2_500,
      nowMs: now,
    });

    expect(resumeAt).toBe(now + 2_500);
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBe(2_500);
  });

  it("ignores records with neither a usable paused_until nor retryAfterMs", () => {
    const now = 4_000_000;
    expect(
      recordRuninfraPause({ model: "glm-5-3-flash", nowMs: now }),
    ).toBeNull();
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBeNull();
  });

  it("ignores an already-elapsed paused_until", () => {
    const now = 5_000_000;
    expect(
      recordRuninfraPause({
        model: "glm-5-3-flash",
        pausedUntil: new Date(now - 1_000).toISOString(),
        nowMs: now,
      }),
    ).toBeNull();
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBeNull();
  });

  it("caps an absurdly distant paused_until to MAX_PAUSE_MS", () => {
    const now = 6_000_000;
    const resumeAt = recordRuninfraPause({
      model: "glm-5-3-flash",
      pausedUntil: new Date(now + 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(resumeAt).toBe(now + MAX_PAUSE_MS);
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBe(MAX_PAUSE_MS);
  });

  it("scopes pauses per model and clears on recovery", () => {
    const now = 7_000_000;
    recordRuninfraPause({
      model: "glm-5-3-flash",
      pausedUntil: new Date(now + 5_000).toISOString(),
      nowMs: now,
    });

    expect(getRuninfraPauseRemainingMs("other-model", now)).toBeNull();

    clearRuninfraPause("glm-5-3-flash");
    expect(getRuninfraPauseRemainingMs("glm-5-3-flash", now)).toBeNull();
  });

  it("ignores blank model keys", () => {
    const now = 8_000_000;
    expect(
      recordRuninfraPause({
        model: "  ",
        pausedUntil: new Date(now + 5_000).toISOString(),
        nowMs: now,
      }),
    ).toBeNull();
    expect(getRuninfraPauseRemainingMs(null, now)).toBeNull();
  });
});
