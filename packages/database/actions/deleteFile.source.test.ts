import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const deleteFileActionSource = readFileSync(
  new URL("./deleteFile.ts", import.meta.url),
  "utf8"
);

describe("deleteFileAction source contract", () => {
  it("deletes local file blobs before delegating metadata removal to removeAction", () => {
    expect(deleteFileActionSource).toContain('import { removeAction } from "./remove";');
    expect(deleteFileActionSource).toContain("deleteFileFromIndexedDb(metadata.id)");
    expect(deleteFileActionSource).toContain("await removeAction(dbKey, thunkApi);");
  });
});
