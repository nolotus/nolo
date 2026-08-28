import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageContentSource = readFileSync(
  join(import.meta.dir, "messageContent.ts"),
  "utf-8"
);

describe("messageContent file reference source contract", () => {
  it("uploads generated images through dbSlice.upload and optionally mounts them into spaces", () => {
    expect(messageContentSource).toContain('import { upload } from "database/dbSlice";');
    expect(messageContentSource).toContain("dispatch(upload({ file, customKey }) as any).unwrap()");
    expect(messageContentSource).toContain("await addContentAction({");
    expect(messageContentSource).toContain("type: ContentType.IMAGE");
  });

  it("keeps generated image URLs backed by the database file content endpoint", () => {
    expect(messageContentSource).toContain('import { buildMessageFileContentUrl } from "./fileUrl"');
    expect(messageContentSource).toContain("const imageUrl = buildMessageFileContentUrl(currentServer, fileId);");
    expect(messageContentSource).toContain("waitForFileReady(imageUrl)");
  });
});
