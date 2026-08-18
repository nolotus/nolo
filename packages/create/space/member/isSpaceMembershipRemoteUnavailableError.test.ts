import { describe, expect, it } from "bun:test";
import {
  SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE,
  isSpaceMembershipRemoteUnavailableError,
} from "./isSpaceMembershipRemoteUnavailableError";

describe("isSpaceMembershipRemoteUnavailableError", () => {
  it("matches the canonical code in string, Error, and SerializedError shapes", () => {
    expect(
      isSpaceMembershipRemoteUnavailableError(
        `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: unable to refresh`
      )
    ).toBe(true);
    expect(
      isSpaceMembershipRemoteUnavailableError(
        new Error(
          `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: unable to refresh from https://nolo.chat`
        )
      )
    ).toBe(true);
    expect(
      isSpaceMembershipRemoteUnavailableError({
        message: `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: fail`,
        name: "Error",
      })
    ).toBe(true);
  });

  it("rejects unrelated settings/membership failures", () => {
    expect(isSpaceMembershipRemoteUnavailableError("settings failed")).toBe(
      false
    );
    expect(isSpaceMembershipRemoteUnavailableError(new Error("boom"))).toBe(
      false
    );
    expect(isSpaceMembershipRemoteUnavailableError({ message: 12 })).toBe(
      false
    );
    expect(isSpaceMembershipRemoteUnavailableError(null)).toBe(false);
    expect(isSpaceMembershipRemoteUnavailableError(undefined)).toBe(false);
  });
});
