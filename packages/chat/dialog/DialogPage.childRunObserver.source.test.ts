import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const dialogPageSource = readFileSync(
  join(import.meta.dir, "DialogPage.tsx"),
  "utf-8",
);
const panelSource = readFileSync(
  join(import.meta.dir, "ChildRunObserverPanel.tsx"),
  "utf-8",
);
const modalSource = readFileSync(
  join(import.meta.dir, "ChildRunDetailModal.tsx"),
  "utf-8",
);
const stateSource = readFileSync(
  join(import.meta.dir, "childRunObserverState.ts"),
  "utf-8",
);

describe("DialogPage child-run observer wiring", () => {
  it("mounts the observer on the parent dialog shell", () => {
    expect(dialogPageSource).toContain(
      'import { ChildRunObserverPanel } from "./ChildRunObserverPanel"',
    );
    expect(dialogPageSource).toContain(
      "<ChildRunObserverPanel parentThreadId={dialogId} />",
    );
    expect(dialogPageSource).toContain("DialogPage-shell--withChildRunObserver");
  });

  it("keeps the observer collapsed by default and collapsible when open", () => {
    expect(panelSource).toContain("shouldShowChrome");
    expect(panelSource).toContain('threads.length > 0 || loadState === "error"');
    expect(panelSource).toContain("useState(false)");
    expect(panelSource).toContain("ChildRunObserverPanel__collapsedRail");
    expect(panelSource).toContain("setIsExpanded(false)");
    expect(panelSource).toContain("setIsExpanded(true)");
  });

  it("filters by parentThreadId and opens modal via dialog-read only", () => {
    expect(panelSource).toContain("parentThreadId");
    expect(panelSource).toContain("buildChildThreadsQueryUrl");
    expect(panelSource).toContain("ChildRunDetailModal");
    expect(modalSource).toContain("/api/dialog-read");
    expect(modalSource).toContain("buildDialogReadUrl");
    expect(modalSource).not.toContain("initDialog");
    expect(modalSource).not.toContain("clearDialogState");
    expect(modalSource).not.toContain("selectCurrentDialogKey");
  });

  it("uses relationship fields rather than space/title filters", () => {
    expect(stateSource).toContain("filterDirectChildRuns");
    expect(stateSource).toContain("thread.parentThreadId");
    expect(stateSource).not.toContain("spaceId");
    expect(panelSource).not.toContain("spaceId=");
  });
});
