import { describe, expect, it } from "bun:test";

import {
  DEVICE_LOCAL_OWNER_ID,
  canChatDeviceLocalWithoutLogin,
  isDeviceLocalDbKey,
  isDeviceLocalDialogOrAgent,
  isDeviceLocalOwnerId,
  isDeviceLocalSpaceActor,
  isDeviceLocalSpaceBody,
  isDeviceLocalSpaceMembership,
  resolveEffectiveSpaceActorId,
  resolveRecordOwnerUserId,
} from "./deviceLocal";

describe("deviceLocal helpers", () => {
  it("recognizes the local owner sentinel", () => {
    expect(isDeviceLocalOwnerId("local")).toBe(true);
    expect(isDeviceLocalOwnerId("  local  ")).toBe(true);
    expect(isDeviceLocalOwnerId(DEVICE_LOCAL_OWNER_ID)).toBe(true);
    expect(isDeviceLocalOwnerId("user-1")).toBe(false);
    expect(isDeviceLocalOwnerId(null)).toBe(false);
    expect(isDeviceLocalOwnerId("")).toBe(false);
  });

  it("resolves effective Space actor without mutating auth", () => {
    expect(resolveEffectiveSpaceActorId(null)).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveEffectiveSpaceActorId(undefined)).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveEffectiveSpaceActorId("")).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveEffectiveSpaceActorId("local")).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveEffectiveSpaceActorId("  local  ")).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveEffectiveSpaceActorId("user-a")).toBe("user-a");
    // Null/blank resolve to the synthetic local actor (guest Space authority).
    expect(isDeviceLocalSpaceActor(null)).toBe(true);
    expect(isDeviceLocalSpaceActor(DEVICE_LOCAL_OWNER_ID)).toBe(true);
    expect(isDeviceLocalSpaceActor("user-a")).toBe(false);
  });

  it("classifies device-local Space membership and body by owner fields", () => {
    expect(
      isDeviceLocalSpaceMembership({ userId: DEVICE_LOCAL_OWNER_ID })
    ).toBe(true);
    expect(isDeviceLocalSpaceMembership({ userId: "user-a" })).toBe(false);
    expect(
      isDeviceLocalSpaceBody({
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
      })
    ).toBe(true);
    expect(
      isDeviceLocalSpaceBody({ ownerId: "user-a", userId: "user-a" })
    ).toBe(false);
    // Space body keys stay space-{ULID}; authority is owner/userId fields.
    expect(
      isDeviceLocalSpaceBody({
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: undefined,
      })
    ).toBe(true);
  });

  it("classifies migration source owners without cross-owner confusion", () => {
    expect(
      resolveRecordOwnerUserId({ userId: "user-a", dbKey: "dialog-local-01X" })
    ).toBe("user-a");
    expect(
      resolveRecordOwnerUserId({ dbKey: "dialog-local-01X" })
    ).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(
      resolveRecordOwnerUserId({ id: "agent-local-01AGENT" })
    ).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(resolveRecordOwnerUserId({ id: "orphan" })).toBe(null);
  });

  it("recognizes dialog-local / agent-local db keys", () => {
    expect(isDeviceLocalDbKey("dialog-local-01DIALOG")).toBe(true);
    expect(isDeviceLocalDbKey("agent-local-01AGENT")).toBe(true);
    expect(isDeviceLocalDbKey("dialog-user-1-01DIALOG")).toBe(false);
    expect(isDeviceLocalDbKey("agent-user-1-01AGENT")).toBe(false);
    expect(isDeviceLocalDbKey("agent-pub-01PUBLIC")).toBe(false);
    expect(isDeviceLocalDbKey(null)).toBe(false);
  });

  it("treats userId=local as device-local even for non-local key shapes", () => {
    expect(
      isDeviceLocalDialogOrAgent({
        dbKey: "dialog-user-1-01X",
        userId: "local",
      })
    ).toBe(true);
  });

  it("detects device-local via cybots / primary agent keys", () => {
    expect(
      isDeviceLocalDialogOrAgent({
        dbKey: "dialog-user-1-01X",
        cybots: ["agent-local-01AGENT"],
      })
    ).toBe(true);
    expect(
      isDeviceLocalDialogOrAgent({
        primaryAgentKey: "agent-local-01AGENT",
      })
    ).toBe(true);
    expect(
      isDeviceLocalDialogOrAgent({
        dbKey: "dialog-user-1-01X",
        cybots: ["agent-user-1-01AGENT"],
      })
    ).toBe(false);
  });

  it("allows logged-out chat only for device-local identity", () => {
    expect(
      canChatDeviceLocalWithoutLogin({ dbKey: "dialog-local-01DIALOG" })
    ).toBe(true);
    expect(
      canChatDeviceLocalWithoutLogin({
        dbKey: "dialog-user-1-01DIALOG",
        userId: "user-1",
      })
    ).toBe(false);
  });
});
