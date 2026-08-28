import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readCollection = () =>
  readFileSync(join(import.meta.dir, "MyContentCollection.tsx"), "utf8");
const readBatchHelper = () =>
  readFileSync(join(import.meta.dir, "myContentBatchManage.ts"), "utf8");

describe("MyContentCollection batch manage", () => {
  it("enables batch manage on dialog, table, docs, and attachment tabs", () => {
    const source = readCollection();
    const helper = readBatchHelper();

    expect(source).toContain("MY_CONTENT_BATCH_TABS");
    expect(helper).toContain('"page"');
    expect(helper).toContain('"image"');
    expect(helper).toContain('"attachment"');
    expect(source).toContain("MyContentCollection__toolbar");
    expect(source).toContain("MyContentCollection__selection-bar");
    expect(source).toContain("id: item.contentKey");
    expect(source).toContain("toggleSelectKey");
    expect(source).toContain('selectionMode="none"');
    expect(source).toContain("ConfirmModal");
    expect(source).not.toContain("window.confirm");
    expect(source).toContain("MyContentSelectableCard");
    expect(source).toContain('if (itemTab === "table")');
    expect(source).toContain('if (itemTab === "page")');
  });
});
