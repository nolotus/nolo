import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

describe("update and delete path source contract", () => {
  it("persists doc saves through dbSlice.patch in docStore.saveDocState", () => {
    // docSlice has been peeled out of Redux into the standalone docStore
    // (render/page/docStore.ts). saveDocState is the async function that
    // replaces the old saveDoc asyncThunk and still persists via dbSlice.patch.
    const source = readSource("packages/render/page/docStore.ts");
    expect(source).toContain("export async function saveDocState(");
    expect(source).toContain("patch({");
  });

  it("keeps primary save entrypoints routed through saveDocState", () => {
    const topbarSource = readSource("packages/render/layout/useTopBarState.tsx");
    const renderPageSource = readSource("packages/render/page/RenderPage.tsx");

    // Both topbar and RenderPage now drive saves through the standalone
    // docStore's saveDocState (peeled out of Redux). The caret-jump bug fix
    // relies on saveDocState NOT bumping externalUpdateSeq, so the editor
    // remount key stays stable on autosave.
    expect(topbarSource).toContain("saveDocState(");
    expect(topbarSource).toContain("pageKey: page.pageKey ?? pageKey!");
    expect(renderPageSource).toContain("saveDocState(");
    expect(renderPageSource).toContain("pageKey");
    expect(renderPageSource).toContain('} from "./docStore";');
  });

  it("keeps primary delete entrypoints routed through deleteDbKey", () => {
    const topbarDeleteSource = readSource("packages/render/layout/TopbarDeleteButton.tsx");
    const fileInfoSource = readSource("packages/render/page/FileInfoPanel.tsx");
    const deleteContentButtonSource = readSource("packages/create/space/components/DeleteContentButton.tsx");
    const deleteDbKeySource = readSource("packages/app/hooks/deleteDbKey.ts");

    expect(topbarDeleteSource).toContain("await dispatch(");
    expect(topbarDeleteSource).toContain("deleteDbKey(");
    expect(topbarDeleteSource).toContain("includeAttachments: true");
    expect(fileInfoSource).toContain("await (dispatch as any)(deleteDbKey(pageKey, spaceId));");
    expect(deleteContentButtonSource).toContain("deleteDbKey(");
    expect(deleteContentButtonSource).toContain("serverOrigin: sourceServerOrigin");
    expect(deleteContentButtonSource).toContain("resolveDeleteSuccessPath");
    expect(deleteContentButtonSource).toContain("isViewingDeletedContent");
    expect(deleteContentButtonSource).not.toContain("removeFavoriteLocally");
    expect(deleteDbKeySource).toContain("resolveDeletedFavoriteProjectionRemoval");
    expect(deleteDbKeySource).toContain("removeFavoriteLocally");
  });
});
