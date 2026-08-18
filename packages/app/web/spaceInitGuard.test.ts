import { describe, expect, it } from "bun:test";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { decideSpaceInitialization } from "./spaceInitGuard";

describe("decideSpaceInitialization", () => {
  it("should initialize when user logs in for the first time", () => {
    const result = decideSpaceInitialization(null, "user-1");
    expect(result).toEqual({
      shouldInitialize: true,
      nextInitializedUserId: "user-1",
    });
  });

  it("should skip initialization for the same user", () => {
    const result = decideSpaceInitialization("user-1", "user-1");
    expect(result).toEqual({
      shouldInitialize: false,
      nextInitializedUserId: "user-1",
    });
  });

  it("guest / no account hydrates with effective actor local", () => {
    const result = decideSpaceInitialization(null, undefined);
    expect(result).toEqual({
      shouldInitialize: true,
      nextInitializedUserId: DEVICE_LOCAL_OWNER_ID,
    });
  });

  it("logout from account re-initializes as local actor", () => {
    const result = decideSpaceInitialization("user-1", undefined);
    expect(result).toEqual({
      shouldInitialize: true,
      nextInitializedUserId: DEVICE_LOCAL_OWNER_ID,
    });
  });

  it("skips re-init when already hydrated as local guest", () => {
    const result = decideSpaceInitialization(DEVICE_LOCAL_OWNER_ID, undefined);
    expect(result).toEqual({
      shouldInitialize: false,
      nextInitializedUserId: DEVICE_LOCAL_OWNER_ID,
    });
  });

  it("should initialize again when user changes", () => {
    const result = decideSpaceInitialization("user-1", "user-2");
    expect(result).toEqual({
      shouldInitialize: true,
      nextInitializedUserId: "user-2",
    });
  });

  it("login from guest re-initializes for the account", () => {
    const result = decideSpaceInitialization(DEVICE_LOCAL_OWNER_ID, "user-1");
    expect(result).toEqual({
      shouldInitialize: true,
      nextInitializedUserId: "user-1",
    });
  });
});
