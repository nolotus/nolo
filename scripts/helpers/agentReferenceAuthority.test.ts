import { describe, expect, test } from "bun:test";

import {
  canReadReferenceForAgentRun,
  type ReferenceAuthorityContext,
  type ReferenceAuthorityDoc,
} from "./agentReferenceAuthority";

const privateDoc = (overrides: Partial<ReferenceAuthorityDoc> = {}): ReferenceAuthorityDoc => ({
  dbKey: "page-owner-private",
  ownerUserId: "owner-1",
  visibility: "private",
  ...overrides,
});

const publicUserContext = (overrides: Partial<ReferenceAuthorityContext> = {}): ReferenceAuthorityContext => ({
  userId: "public-user",
  agentKey: "agent-pub-01COURSE",
  agentOwnerUserId: "owner-1",
  ...overrides,
});

describe("agent reference authority user stories", () => {
  test("1 private agent plus private docs: owner can read own docs", () => {
    expect(
      canReadReferenceForAgentRun(
        privateDoc(),
        publicUserContext({
          userId: "owner-1",
          agentKey: "agent-owner-01PRIVATE",
        }),
      ),
    ).toEqual({ ok: true, reason: "user-owner" });
  });

  test("2 public agent plus owner docs: public user needs explicit agent grant", () => {
    expect(canReadReferenceForAgentRun(privateDoc(), publicUserContext())).toEqual({
      ok: false,
      reason: "denied",
    });

    expect(
      canReadReferenceForAgentRun(
        privateDoc({ grantedAgentKeys: ["agent-pub-01COURSE"] }),
        publicUserContext(),
      ),
    ).toEqual({ ok: true, reason: "agent-grant" });
  });

  test("3 public agent plus public docs: public user can read by public visibility", () => {
    expect(
      canReadReferenceForAgentRun(
        privateDoc({ visibility: "public" }),
        publicUserContext(),
      ),
    ).toEqual({ ok: true, reason: "public-doc" });
  });

  test("4 space agent plus space docs: space grant allows space member run", () => {
    expect(
      canReadReferenceForAgentRun(
        privateDoc({ grantedSpaceIds: ["space-tcm"] }),
        publicUserContext({
          agentKey: "agent-owner-01SPACE",
          spaceId: "space-tcm",
        }),
      ),
    ).toEqual({ ok: true, reason: "space-grant" });
  });

  test("5 space agent plus multi-owner docs: agent owner cannot bypass another owner's doc", () => {
    expect(
      canReadReferenceForAgentRun(
        privateDoc({ ownerUserId: "contributor-2" }),
        publicUserContext({
          userId: "owner-1",
          agentKey: "agent-owner-01SPACE",
          spaceId: "space-tcm",
        }),
      ),
    ).toEqual({ ok: false, reason: "denied" });

    expect(
      canReadReferenceForAgentRun(
        privateDoc({ ownerUserId: "contributor-2", grantedSpaceIds: ["space-tcm"] }),
        publicUserContext({
          userId: "owner-1",
          agentKey: "agent-owner-01SPACE",
          spaceId: "space-tcm",
        }),
      ),
    ).toEqual({ ok: true, reason: "space-grant" });
  });

  test("6 public agent plus multi-owner contributed docs: each private contribution needs a grant", () => {
    const context = publicUserContext({ agentKey: "agent-pub-01COMMUNITY" });
    const docs: ReferenceAuthorityDoc[] = [
      privateDoc({
        dbKey: "page-a",
        ownerUserId: "contributor-a",
        grantedAgentKeys: ["agent-pub-01COMMUNITY"],
      }),
      privateDoc({
        dbKey: "page-b",
        ownerUserId: "contributor-b",
      }),
    ];

    expect(docs.map((doc) => canReadReferenceForAgentRun(doc, context))).toEqual([
      { ok: true, reason: "agent-grant" },
      { ok: false, reason: "denied" },
    ]);
  });
});
