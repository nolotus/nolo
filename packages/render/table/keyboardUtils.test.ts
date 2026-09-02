// packages/render/table/keyboardUtils.test.ts
import { describe, expect, test } from "bun:test";

import { isImeComposingKeyEvent } from "./keyboardUtils";

const makeEvent = (
  overrides: Partial<{
    isComposing: boolean;
    keyCode: number;
  }> = {}
) =>
  ({
    nativeEvent: { isComposing: overrides.isComposing ?? false },
    keyCode: overrides.keyCode ?? 13,
  }) as any;

describe("isImeComposingKeyEvent", () => {
  test("flags standard isComposing keydowns", () => {
    expect(isImeComposingKeyEvent(makeEvent({ isComposing: true }))).toBe(true);
  });

  test("flags legacy keyCode 229 keydowns", () => {
    expect(isImeComposingKeyEvent(makeEvent({ keyCode: 229 }))).toBe(true);
  });

  test("passes through regular keys", () => {
    expect(isImeComposingKeyEvent(makeEvent())).toBe(false);
    expect(isImeComposingKeyEvent(makeEvent({ keyCode: 9 }))).toBe(false);
  });

  test("tolerates a missing nativeEvent", () => {
    expect(isImeComposingKeyEvent({ nativeEvent: undefined, keyCode: 13 } as any)).toBe(
      false
    );
  });
});
