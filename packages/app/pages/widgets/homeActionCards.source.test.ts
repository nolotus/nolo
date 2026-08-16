import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const source = readFileSync(join(import.meta.dir, "WidgetsSection.tsx"), "utf-8");
const actionCss = readFileSync(join(import.meta.dir, "actionCards.css"), "utf-8");

describe("Home action cards source contract", () => {
  it("removes the guide card from home shortcuts", () => {
    expect(source).not.toContain("GUIDE_SPACE_URL");
    expect(source).not.toContain("window.location.assign");
    expect(source).not.toContain('id: "guide"');
    expect(source).not.toContain("homeActions.guideTitle");
  });

  it("keeps note creation routed through createDocState", () => {
    // docSlice has been peeled out of Redux into the standalone docStore;
    // callers invoke createDocState directly with { dispatch, getState }.
    expect(source).toContain('import { createDocState } from "render/page/docStore";');
    expect(source).toContain("createDocState({}, { dispatch, getState: store.getState })");
  });

  it("creates tables through the shared useCreateTable hook", () => {
    expect(source).toContain('import { useCreateTable } from "render/table/useCreateTable";');
    expect(source).toContain("createNewTable");
    expect(source).not.toContain('import { addRow, createTable } from "render/table/tableSlice";');
  });

  it("renders custom-tab shortcuts including pricing and client download in the custom pane", () => {
    expect(source).toContain('titleKey: "homeActions.createNoteTitle"');
    expect(source).toContain('titleKey: "homeActions.createTableTitle"');
    expect(source).not.toContain('titleKey: "homeActions.guideTitle"');
    expect(source).toContain('titleKey: "topbar.pricing"');
    expect(source).toContain('titleKey: "downloadClient"');
    expect(source).toContain('descKey: "homeActions.pricingDesc"');
    expect(source).toContain('descKey: "homeActions.downloadClientDesc"');
    expect(actionCss).toContain(".home-custom-actions__card");
    expect(actionCss).toContain(".home-custom-actions__icon");
    expect(actionCss).toContain(".home-custom-actions__title");
  });

  it("filters downloadClient from the custom pane on the desktop app", () => {
    expect(source).toContain("getIsDesktopApp()");
    expect(source).toContain("!(isDesktop && id === \"downloadClient\")");
  });

  it("does not start the conversational agent creator from custom shortcuts", () => {
    expect(source).not.toContain("startConversationalAgentCreation");
    expect(source).not.toContain("navigate(`/${CreateRoutePaths.CREATE_AGENT}`)");
  });
});
