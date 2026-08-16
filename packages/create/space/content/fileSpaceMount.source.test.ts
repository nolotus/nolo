import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (fileName: string) =>
  readFileSync(join(import.meta.dir, fileName), "utf-8");

describe("space file content source contract", () => {
  it("adds uploaded files to spaces through uploadFileAction followed by addContentAction", () => {
    const source = readSource("uploadAndAddFileToSpaceAction.ts");
    expect(source).toContain('import { uploadFileAction } from "database/actions/upload";');
    expect(source).toContain('import { addContentAction } from "./addContentAction";');
    expect(source).toContain('import { patch } from "database/dbSlice";');
    expect(source).toContain("const fileMetadata = await uploadFileAction(");
    expect(source).toContain("const result = await addContentAction({");
    expect(source).toContain("patch({");
    expect(source).toContain("spaceId,");
    expect(source).toContain('window.dispatchEvent(new Event("nolo-user-data-updated"))');
  });

  it("stores and removes space content references through dbSlice patch/read flows", () => {
    const addSource = readSource("addContentAction.ts");
    const deleteSource = readSource("deleteContentFromSpaceAction.ts");

    expect(addSource).toContain('import { read, patch } from "database/dbSlice";');
    expect(addSource).toContain("const spaceData = await dispatch(read({");
    expect(addSource).toContain("patch({ dbKey: spaceKey, changes })");

    expect(deleteSource).toContain('import { patch, read, remove } from "database/dbSlice";');
    expect(deleteSource).toContain("const updatedSpaceData = await (dispatch as any)(");
    expect(deleteSource).toContain("deleteFileAction(key, thunkAPI)");
  });
});
