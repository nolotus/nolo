import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const uploadActionSource = readFileSync(
  new URL("./upload.ts", import.meta.url),
  "utf8"
);

describe("uploadFileAction source contract", () => {
  it("routes primary upload and replication through replication helpers", () => {
    expect(uploadActionSource).toContain("scheduleUploadReplication");
    expect(uploadActionSource).toContain("resolveUploadReplicationServers");
    expect(uploadActionSource).toContain("const primaryUploadServer = uploadServers[0] ?? currentServer");
    expect(uploadActionSource).toContain("excludeServers: primaryUploadServer ? [primaryUploadServer] : []");
    expect(uploadActionSource).toContain("uploadToCurrentServer");
    expect(uploadActionSource).not.toContain("syncWithServers(");
    expect(uploadActionSource).not.toContain("noloUploadRequest");
    expect(uploadActionSource).not.toContain("planServersForTenant(");
    expect(uploadActionSource).not.toContain("getAllServers(");
  });

  it("stores canonical file records under DataType.FILE while preserving mimeType separately", () => {
    expect(uploadActionSource).toContain("type: DataType.FILE");
    expect(uploadActionSource).toContain('mimeType: file.type || "application/octet-stream"');
    expect(uploadActionSource).toContain("title: file.name");
    expect(uploadActionSource).toContain("fileCategory: resolveFileCategory({");
  });
});
