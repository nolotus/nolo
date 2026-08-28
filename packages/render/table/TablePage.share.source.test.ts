import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tablePageSource = readFileSync(join(import.meta.dir, "TablePage.tsx"), "utf-8");
const useTableShareActionsSource = readFileSync(
  join(import.meta.dir, "useTableShareActions.ts"),
  "utf-8",
);
const topBarSource = readFileSync(
  join(import.meta.dir, "../layout/TopBar.tsx"),
  "utf-8",
);
const useTopBarStateSource = readFileSync(
  join(import.meta.dir, "../layout/useTopBarState.tsx"),
  "utf-8",
);
const tableTopbarOverflowSource = readFileSync(
  join(import.meta.dir, "../layout/TableTopbarOverflowContent.tsx"),
  "utf-8",
);
const layoutCssSource = readFileSync(
  join(import.meta.dir, "../layout/layout.css"),
  "utf-8",
);
const localeSource = readFileSync(
  join(import.meta.dir, "../../app/i18n/translations/interface.locale.ts"),
  "utf-8",
);

describe("TablePage share source contract", () => {
  it("loads live table share state and offers a first-class community share action", () => {
    expect(useTableShareActionsSource).toContain('import { share } from "database/dbSlice"');
    expect(useTableShareActionsSource).toContain('from "share/tableShareState"');
    expect(useTableShareActionsSource).toContain("share({");
    expect(useTableShareActionsSource).toContain('visibility: "community"');
    expect(useTableShareActionsSource).toContain("createWebSharePath");
  });

  it("renders share status and replication issue surfaces in the topbar overflow menu", () => {
    expect(tableTopbarOverflowSource).toContain("topbar__more-table-share");
    expect(tableTopbarOverflowSource).toContain("topbar__more-table-share-status");
    expect(tableTopbarOverflowSource).toContain("topbar__more-table-share-warning");
    expect(useTableShareActionsSource).toContain("replicationDirtyAt");
    expect(useTableShareActionsSource).toContain("lastReplicationError");
  });

  it("places table share actions in the topbar more menu without copy-link affordances", () => {
    expect(topBarSource).toContain("TableTopbarOverflowContent");
    expect(topBarSource).toContain("showTableShareInOverflow");
    expect(useTopBarStateSource).toContain("useTableShareActions");
    expect(useTopBarStateSource).toContain('contentKeyType === "meta"');
    expect(tablePageSource).not.toContain("table-page__more-menu");
    expect(tablePageSource).not.toContain("navigator.clipboard");
    expect(tablePageSource).not.toContain("tableShareCopyLink");
    expect(tablePageSource).not.toContain("tableShareLinkCopied");
    expect(tablePageSource).not.toContain("tableShareLinkGenerated");
    expect(useTableShareActionsSource).toContain("window.open(");
    expect(localeSource).toContain("tableShare");
    expect(localeSource).toContain("tableSharePublished");
    expect(localeSource).toContain("tableShareReplicationIssue");
  });

  it("defines dedicated styles for the table share topbar overflow surfaces", () => {
    expect(layoutCssSource).toContain(".topbar__more-table-share");
    expect(layoutCssSource).toContain(".topbar__more-table-share-status");
    expect(layoutCssSource).toContain(".topbar__more-table-share-warning");
  });

  it("does not rewrite filter or view URL params before table metadata loads", () => {
    expect(tablePageSource).toContain("if (!tableMeta || !selectedStatusFilter) return;");
    expect(tablePageSource).toContain("if (!tableMeta || !selectedOwnerFilter) return;");
    expect(tablePageSource).toContain("? [selectedStatusFilter, ...statusFilterOptions]");
    expect(tablePageSource).toContain("? [selectedOwnerFilter, ...ownerFilterOptions]");
    expect(tablePageSource).not.toContain(
      "statusFilterOptions.length > 0 && !statusFilterOptions.includes",
    );
    expect(tablePageSource).not.toContain(
      "ownerFilterOptions.length > 0 && !ownerFilterOptions.includes",
    );
    expect(tablePageSource).toContain('if (!tableMeta) return;\n    if (selectedViewChoice === "kanban"');
    expect(tablePageSource).toContain('if (!tableMeta || typeof window === "undefined") return;');
  });

  it("shows table load errors instead of falling back to the generic no-match page", () => {
    expect(tablePageSource).toContain("table-page__center-state--error");
    expect(tablePageSource).toContain("error || `表不存在或加载失败: ${tableKey}`");
    expect(tablePageSource).toContain("window.location.reload()");
    expect(tablePageSource).not.toContain(
      'return <NoMatch message={`表不存在或加载失败: ${tableKey}`} />',
    );
  });
});