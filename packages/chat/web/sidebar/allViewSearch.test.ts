import { describe, expect, test } from "bun:test";

import type { MyContentListItem } from "app/utils/myContentItems";
import { DataType } from "create/types";
import type { ShareSummary } from "share/types";

let moduleVersion = 0;
const loadAllViewSearch = () => import(`./allViewSearch.ts`);

const recentItems: MyContentListItem[] = [
  {
    source: "user-data",
    title: "Weekly Plan",
    type: "page",
    contentKey: "page-user-1",
    pinned: false,
    createdAt: 0,
    updatedAt: 1,
    spaceId: "space-1",
    spaceName: "Planning",
  },
  {
    source: "user-data",
    title: "Dinner Chat",
    type: "dialog",
    contentKey: "dialog-user-1",
    pinned: false,
    createdAt: 0,
    updatedAt: 2,
    spaceId: "space-2",
    spaceName: "Personal",
  },
];

const shares: ShareSummary[] = [
  {
    token: "share-1",
    type: DataType.DIALOG,
    title: "Research Share",
    description: "Shared discussion with the team",
    createdAt: 1,
    authorId: "user-1",
    authorName: "Nolotus",
  },
];

describe("allViewSearch helpers", () => {
  test("matches search text across multiple candidate fields", async () => {
    const { matchesAllViewSearch } = await loadAllViewSearch();
    expect(matchesAllViewSearch("plan", "Weekly Plan", "dialog")).toBe(true);
    expect(matchesAllViewSearch("team", undefined, "Shared discussion with the team")).toBe(
      true
    );
    expect(matchesAllViewSearch("missing", "Weekly Plan")).toBe(false);
  });

  test("filters recent items by title, type, space name, and content key", async () => {
    const { filterAllViewRecentItems } = await loadAllViewSearch();
    expect(filterAllViewRecentItems(recentItems, "plan").map((item: any) => item.contentKey)).toEqual([
      "page-user-1",
    ]);
    expect(filterAllViewRecentItems(recentItems, "personal").map((item: any) => item.contentKey)).toEqual([
      "dialog-user-1",
    ]);
  });

  test("identifies unscoped file images as dialog image attachments", async () => {
    const { isAllViewDialogImageAttachment } = await loadAllViewSearch();
    expect(
      isAllViewDialogImageAttachment({
        type: "file",
        fileCategory: "image",
        spaceId: null,
      })
    ).toBe(true);
    expect(
      isAllViewDialogImageAttachment({
        type: "file",
        fileCategory: "image",
        spaceId: "space-1",
      })
    ).toBe(false);
    expect(
      isAllViewDialogImageAttachment({
        type: "page",
        spaceId: null,
      })
    ).toBe(false);
  });

  test("filters favorite keys using loaded favorite record metadata", async () => {
    const { filterAllViewFavoriteKeys } = await loadAllViewSearch();
    expect(
      filterAllViewFavoriteKeys(
        ["agent-1", "dialog-1"],
        {
          "agent-1": { title: "Writing Copilot", type: "agent", spaceId: "workspace" },
          "dialog-1": { title: "Roadmap Review", type: "dialog", spaceId: "planning" },
        },
        "copilot"
      )
    ).toEqual(["agent-1"]);
  });
});

