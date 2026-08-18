import { describe, expect, it } from "bun:test";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import {
  checkSpaceMembership,
  localSpaceAuthorityPatchStamp,
} from "./permissions";

describe("checkSpaceMembership device-local authority", () => {
  const localSpace = {
    id: "01LOCAL",
    ownerId: DEVICE_LOCAL_OWNER_ID,
    userId: DEVICE_LOCAL_OWNER_ID,
    members: [DEVICE_LOCAL_OWNER_ID],
  } as any;

  const accountSpace = {
    id: "01ACCT",
    ownerId: "user-a",
    userId: "user-a",
    members: ["user-a"],
  } as any;

  it("allows guest on real device-local Space body", () => {
    expect(() => checkSpaceMembership(localSpace, null)).not.toThrow();
    expect(() => checkSpaceMembership(localSpace, undefined)).not.toThrow();
  });

  it("allows logged-in account on real device-local Space body", () => {
    expect(() => checkSpaceMembership(localSpace, "user-a")).not.toThrow();
  });

  it("does not treat account Space as local even when only cached locally", () => {
    expect(() => checkSpaceMembership(accountSpace, null)).toThrow();
    expect(() => checkSpaceMembership(accountSpace, "user-b")).toThrow(
      "当前用户不是空间成员"
    );
    expect(() => checkSpaceMembership(accountSpace, "user-a")).not.toThrow();
  });

  it("stamps userId=local only for device-local body patches", () => {
    expect(localSpaceAuthorityPatchStamp(localSpace)).toEqual({
      userId: DEVICE_LOCAL_OWNER_ID,
    });
    expect(localSpaceAuthorityPatchStamp(accountSpace)).toEqual({});
    expect(localSpaceAuthorityPatchStamp(null)).toEqual({});
  });
});
