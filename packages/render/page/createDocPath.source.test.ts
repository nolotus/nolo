import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

describe("create doc path source contract", () => {
  it("routes docStore.createDocState to createPageAction lazily", () => {
    // docSlice has been peeled out of Redux into the standalone docStore
    // (render/page/docStore.ts). createDocState delegates to createPageAction
    // with the same lazy-import contract the old docSlice.createDoc asyncThunk used.
    const source = readSource("packages/render/page/docStore.ts");
    expect(source).toContain('const { createPageAction } = await import("./createPageAction");');
    expect(source).toContain("return createPageAction(args, thunkApi);");
  });

  it("persists created pages through dbSlice.write in createPageAction", () => {
    const source = readSource("packages/render/page/createPageAction.ts");
    expect(source).toContain("await dispatch(write({ data: pageData, customKey: dbKey })).unwrap();");
  });

  it("keeps primary note creation entrypoints routed through createDocState", () => {
    const widgetsSectionSource = readSource("packages/app/pages/widgets/WidgetsSection.tsx");
    const createMenuSource = readSource("packages/render/layout/CreateMenuButtonContainer.tsx");

    // Callers now import createDocState from the standalone docStore (peeled out
    // of Redux) and invoke it directly with { dispatch, getState } instead of
    // dispatching a Redux asyncThunk.
    expect(widgetsSectionSource).toContain('import { createDocState } from "render/page/docStore";');
    expect(widgetsSectionSource).toContain("createDocState({}, { dispatch, getState: store.getState })");

    expect(createMenuSource).toContain('import { createDocState } from "render/page/docStore";');
    expect(createMenuSource).toContain("createDocState(");
    expect(createMenuSource).toContain("spaceId: pageCreateSpaceId ?? undefined");
    // Space-scoped creates must open under /space/:id/:pageKey, not bare /:pageKey.
    expect(createMenuSource).toContain("buildRoutableContentPath({");
    expect(createMenuSource).toContain("spaceId: pageCreateSpaceId");
    expect(createMenuSource).toContain("navigate(`${path}?edit=true`)");
  });

  it("defaults new page titles to untitled (not date-stamped notes)", () => {
    const createPageSource = readSource("packages/render/page/createPageAction.ts");
    const serverCreateSource = readSource("packages/render/page/server/createPage.ts");
    expect(createPageSource).toContain('defaultValue: "未命名页面"');
    expect(createPageSource).not.toContain("的笔记");
    expect(serverCreateSource).toContain('"未命名页面"');
    expect(serverCreateSource).not.toContain("的笔记");
  });
});