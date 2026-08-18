import { describe, expect, it } from "bun:test";
import { shouldDeferEnterForIme } from "./ime";

describe("shouldDeferEnterForIme", () => {
  it("defers enter while composition is still active", () => {
    expect(
      shouldDeferEnterForIme({
        event: { nativeEvent: { isComposing: true } },
        isComposing: false,
        lastCompositionEndAt: 0,
        now: 1_000,
      })
    ).toBe(true);
  });

  it("defers enter for Firefox-style IME fallback keycode 229", () => {
    expect(
      shouldDeferEnterForIme({
        event: { keyCode: 229 },
        isComposing: false,
        lastCompositionEndAt: 0,
        now: 1_000,
      })
    ).toBe(true);
  });

  it("defers enter for the short grace window after composition ends", () => {
    expect(
      shouldDeferEnterForIme({
        event: {},
        isComposing: false,
        lastCompositionEndAt: 980,
        now: 1_000,
      })
    ).toBe(true);
  });

  it("allows enter once composition has fully settled", () => {
    expect(
      shouldDeferEnterForIme({
        event: {},
        isComposing: false,
        lastCompositionEndAt: 900,
        now: 1_000,
      })
    ).toBe(false);
  });
});

