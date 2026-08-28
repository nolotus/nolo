import { describe, expect, test } from "bun:test";

import {
  buildDeleteSpacesPreview,
  filterSpaceDeletionCandidates,
  resolveConfirmedSpaceDeletionTargets,
} from "./deleteSpacesToolModel";

const member = (overrides: Record<string, any>) => ({
  spaceId: "space-a",
  spaceName: "Alpha",
  role: "owner",
  ownerId: "user-a",
  ...overrides,
});

const space = (overrides: Record<string, any> = {}) => ({
  id: "space-a",
  name: "Alpha",
  ownerId: "user-a",
  members: ["user-a"],
  contents: {},
  ...overrides,
});

describe("deleteSpacesToolModel", () => {
  test("matches spaces by prefix and only marks owned spaces as deletable", () => {
    const memberships = [
      member({ spaceId: "a", spaceName: "rn_owner_verify_0504" }),
      member({ spaceId: "b", spaceName: "rn_owner_verify_0504b", ownerId: "user-b", role: "member" }),
      member({ spaceId: "c", spaceName: "other" }),
    ];

    const matches = filterSpaceDeletionCandidates(memberships, {
      query: "rn_owner_verify_0504",
      matchMode: "prefix",
    });

    const preview = buildDeleteSpacesPreview({
      currentUserId: "user-a",
      candidates: matches,
      spaceRecordsById: {
        a: space({ id: "a", ownerId: "user-a", members: ["user-a", "user-b"] }),
        b: space({ id: "b", ownerId: "user-b", members: ["user-a", "user-b"] }),
      },
    });

    expect(preview.deletable.map((item) => item.spaceId)).toEqual(["a"]);
    expect(preview.skipped).toEqual([
      {
        spaceId: "b",
        name: "rn_owner_verify_0504b",
        reason: "not_owner",
        ownerId: "user-b",
      },
    ]);
    expect(preview.deletable[0].memberCount).toBe(2);
  });

  test("confirmed delete targets must still be present in the fresh preview", () => {
    const preview = buildDeleteSpacesPreview({
      currentUserId: "user-a",
      candidates: [
        member({ spaceId: "a", spaceName: "rn_owner_verify_0504" }),
        member({ spaceId: "b", spaceName: "rn_owner_verify_0504b" }),
      ],
      spaceRecordsById: {
        a: space({ id: "a", ownerId: "user-a" }),
        b: space({ id: "b", ownerId: "user-a" }),
      },
    });

    const resolved = resolveConfirmedSpaceDeletionTargets(preview, ["b", "missing"]);

    expect(resolved.targets.map((item) => item.spaceId)).toEqual(["b"]);
    expect(resolved.missingConfirmedSpaceIds).toEqual(["missing"]);
  });

  test("spaceId matching normalizes space-* prefixes", () => {
    const matches = filterSpaceDeletionCandidates(
      [member({ spaceId: "abc", spaceName: "Anything" })],
      { query: "space-abc", matchMode: "spaceId" }
    );

    expect(matches.map((item) => item.spaceId)).toEqual(["abc"]);
  });
});
