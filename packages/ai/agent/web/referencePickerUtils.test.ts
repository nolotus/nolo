import { describe, expect, test } from "bun:test";

import {
  ALL_SPACES_ID,
  buildReferencePickerContents,
  buildReferencePickerSpaceItems,
  collectPendingSkillCandidates,
  filterReferencePickerContents,
} from "./referencePickerUtils";

describe("referencePickerUtils", () => {
  test("buildReferencePickerSpaceItems keeps all-spaces plus current and sorted others", () => {
    const result = buildReferencePickerSpaceItems({
      currentSpace: { id: "space-b", name: "Beta" },
      allMemberSpaces: [
        { spaceId: "space-c", spaceName: "Gamma" },
        { spaceId: "space-a", spaceName: "Alpha" },
        { spaceId: "space-b", spaceName: "Beta" },
      ],
      allSpacesLabel: "All Spaces",
    });

    expect(result.items.map((item) => item.id)).toEqual([
      ALL_SPACES_ID,
      "space-b",
      "space-a",
      "space-c",
    ]);
    expect(result.nameMap.get("space-a")).toBe("Alpha");
    expect(result.nameMap.get("space-b")).toBe("Beta");
  });

  test("buildReferencePickerContents excludes dialogs and null entries", () => {
    expect(
      buildReferencePickerContents({
        contentsObj: {
          "page-1": { title: "Page 1", type: "page" },
          "dialog-1": { title: "Dialog 1", type: "dialog" },
          "page-2": null,
        },
        spaceId: "space-1",
        spaceName: "Alpha",
        unnamedLabel: "Unnamed",
      })
    ).toEqual([
      {
        dbKey: "page-1",
        title: "Page 1",
        spaceId: "space-1",
        spaceName: "Alpha",
        contentType: "page",
        skillSummary: null,
      },
    ]);
  });

  test("filterReferencePickerContents keeps search scoped to selected space", () => {
    const spacesData = new Map([
      [
        "space-1",
        [
          {
            dbKey: "page-alpha",
            title: "Alpha guide",
            spaceId: "space-1",
            spaceName: "Alpha",
            contentType: "page",
          },
        ],
      ],
      [
        "space-2",
        [
          {
            dbKey: "page-beta",
            title: "Beta guide",
            spaceId: "space-2",
            spaceName: "Beta",
            contentType: "page",
          },
        ],
      ],
    ]);

    const filtered = filterReferencePickerContents({
      spacesData,
      activeSpaceId: "space-1",
      searchQuery: "beta",
      pickerMode: "knowledge",
      skillCandidateMap: new Map(),
    });

    expect(filtered).toEqual([]);
  });

  test("filterReferencePickerContents returns only confirmed skill pages in skill mode", () => {
    const spacesData: any = new Map([
      [
        "space-1",
        [
          {
            dbKey: "page-skill",
            title: "Skill Doc",
            spaceId: "space-1",
            spaceName: "Alpha",
            contentType: "page",
            skillSummary: { isSkill: true, name: "Skill Doc" },
          },
          {
            dbKey: "file-1",
            title: "Attachment",
            spaceId: "space-1",
            spaceName: "Alpha",
            contentType: "file",
          },
        ],
      ],
    ]);

    const filtered = filterReferencePickerContents({
      spacesData,
      activeSpaceId: ALL_SPACES_ID,
      searchQuery: "",
      pickerMode: "skill",
      skillCandidateMap: new Map([
        ["file-1", true],
      ]),
    });

    expect(filtered.map((item) => item.dbKey)).toEqual(["page-skill"]);
  });

  test("collectPendingSkillCandidates only returns unchecked pages", () => {
    const pending = collectPendingSkillCandidates({
      contents: [
        {
          dbKey: "page-skill",
          title: "Skill",
          spaceId: "space-1",
          spaceName: "Alpha",
          contentType: "page",
          skillSummary: { isSkill: true, name: "Skill" },
        },
        {
          dbKey: "file-1",
          title: "File",
          spaceId: "space-1",
          spaceName: "Alpha",
          contentType: "file",
        },
        {
          dbKey: "page-known",
          title: "Known",
          spaceId: "space-1",
          spaceName: "Alpha",
          contentType: "page",
        },
        {
          dbKey: "page-unknown",
          title: "Unknown",
          spaceId: "space-1",
          spaceName: "Alpha",
          contentType: "page",
        },
      ],
      skillCandidateMap: new Map([["page-known", false]]),
    });

    expect(pending.map((item) => item.dbKey)).toEqual(["page-unknown"]);
  });
});
