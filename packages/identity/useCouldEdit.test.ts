import { describe, expect, it } from "bun:test";

import { resolveCouldEdit } from "./useCouldEdit";

describe("resolveCouldEdit", () => {
  const admin = "0e95801d90";
  const owner = "userowner"; // extractUserId takes the 2nd dash segment; keep it hyphen-free
  const stranger = "userstranger";

  it("returns false for undefined key", () => {
    expect(resolveCouldEdit(undefined, admin)).toBe(false);
    expect(resolveCouldEdit(undefined, owner)).toBe(false);
  });

  it("never allows editing agent-pub-* keys (public agents are platform-owned)", () => {
    expect(resolveCouldEdit("agent-pub-01DSV4PRONPB00000001VIR3EK", admin)).toBe(false);
    expect(resolveCouldEdit("agent-pub-01DSV4PRONPB00000001VIR3EK", owner)).toBe(false);
    expect(resolveCouldEdit("agent-pub-anything", admin)).toBe(false);
  });

  it("allows the system admin to edit non-public keys (admin relief)", () => {
    expect(resolveCouldEdit(`agent-${owner}-01AGENTID`, admin)).toBe(true);
  });

  it("allows the owner to edit their own private agent", () => {
    expect(resolveCouldEdit(`agent-${owner}-01AGENTID`, owner)).toBe(true);
  });

  it("rejects a stranger editing someone else's private agent", () => {
    expect(resolveCouldEdit(`agent-${owner}-01AGENTID`, stranger)).toBe(false);
  });

  it("rejects unauthenticated users", () => {
    expect(resolveCouldEdit(`agent-${owner}-01AGENTID`, undefined)).toBe(false);
  });
});
