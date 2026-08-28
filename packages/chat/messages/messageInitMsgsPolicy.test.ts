import { describe, expect, test } from "bun:test";

import {
  resolveInitMsgsFulfilledWriteMode,
  resolveInitMsgsHasMoreOlder,
} from "./messageInitMsgsPolicy";
import { isValidMessage } from "./messageValidation";

describe("resolveInitMsgsFulfilledWriteMode", () => {
  test("upserts for new dialogs", () => {
    expect(
      resolveInitMsgsFulfilledWriteMode({ isNew: true, hasLocalStreaming: false })
    ).toBe("upsert");
  });

  test("upserts when local bucket is still streaming (re-enter)", () => {
    expect(
      resolveInitMsgsFulfilledWriteMode({
        isNew: false,
        hasLocalStreaming: true,
      })
    ).toBe("upsert");
  });

  test("replaces for established idle dialogs", () => {
    expect(
      resolveInitMsgsFulfilledWriteMode({
        isNew: false,
        hasLocalStreaming: false,
      })
    ).toBe("replace");
  });
});

describe("resolveInitMsgsHasMoreOlder", () => {
  test("false when full history (no limit)", () => {
    expect(resolveInitMsgsHasMoreOlder({ fetchedCount: 100 })).toBe(false);
  });

  test("true when page came back full", () => {
    expect(
      resolveInitMsgsHasMoreOlder({ limit: 30, fetchedCount: 30 })
    ).toBe(true);
  });

  test("false when page came back short", () => {
    expect(
      resolveInitMsgsHasMoreOlder({ limit: 30, fetchedCount: 12 })
    ).toBe(false);
  });
});

describe("isValidMessage", () => {
  test("requires a string id", () => {
    expect(isValidMessage({ id: "m1" })).toBe(true);
    expect(isValidMessage({ id: 1 })).toBe(false);
    expect(isValidMessage(null)).toBe(false);
  });
});
