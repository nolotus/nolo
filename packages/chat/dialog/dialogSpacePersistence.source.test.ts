import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const createDialogActionSource = readFileSync(
  join(import.meta.dir, "actions", "createDialogAction.ts"),
  "utf-8"
);
const dialogPageSource = readFileSync(
  join(import.meta.dir, "DialogPage.tsx"),
  "utf-8"
);
const quickChatRuntimeSource = readFileSync(
  join(import.meta.dir, "..", "..", "app", "pages", "QuickChatRuntime.tsx"),
  "utf-8"
);
const sendFirstMessageSource = readFileSync(
  join(
    import.meta.dir,
    "..",
    "messages",
    "sendFirstMessage.ts"
  ),
  "utf-8"
);

describe("dialog space persistence source contract", () => {
  it("stores the current space id in newly created dialogs", () => {
    expect(createDialogActionSource).toContain("...(spaceId && { spaceId })");
  });

  it("only persists an explicitly provided space intent", () => {
    expect(createDialogActionSource).toContain(
      "const spaceId = explicitSpaceId;"
    );
  });

  it("persists inherited dialog metadata when branching from an existing chat", () => {
    expect(createDialogActionSource).toContain("inheritedFromDialogKey");
    expect(createDialogActionSource).toContain("inheritedFromDialogTitle");
  });

  it("restores dialog space before dialog initialization on refresh", () => {
    expect(dialogPageSource).toContain(
      "ensureDialogSpaceAction(pageKey, normalizedRouteSpaceId)"
    );
  });

  it("navigates quick chat dialogs with the dialog space routed in the path", () => {
    // Prefer build-then-navigate so URL + route state stay readable.
    expect(quickChatRuntimeSource).toContain(
      "const dialogUrl = buildDialogUrl(dialogKey, dialogSpaceId)"
    );
    expect(quickChatRuntimeSource).toContain("navigate(dialogUrl,");
  });

  it("keeps first-message uploads decoupled from default space selection", () => {
    expect(sendFirstMessageSource).not.toContain("resolvePreferredSpaceId");
  });
});
