import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fileUrlSource = readFileSync(
  join(import.meta.dir, "fileUrl.ts"),
  "utf-8"
);
const databaseFileUrlSource = readFileSync(
  join(import.meta.dir, "../../database/fileUrl.ts"),
  "utf-8"
);
const messageContentSource = readFileSync(
  join(import.meta.dir, "messageContent.ts"),
  "utf-8"
);
const firstMessageSource = readFileSync(
  join(import.meta.dir, "sendFirstMessage.ts"),
  "utf-8"
);
const base64MigrationSource = readFileSync(
  join(import.meta.dir, "hooks/useBase64Migration.ts"),
  "utf-8"
);

describe("message file url source contract", () => {
  it("centralizes file content url construction in a shared helper", () => {
    expect(databaseFileUrlSource).toContain("export const buildDatabaseFileContentUrl");
    expect(databaseFileUrlSource).toContain("export const isLocalDatabaseFileContentUrl");
    expect(fileUrlSource).toContain("export const buildMessageFileContentUrl");
    expect(fileUrlSource).toContain("export const isLocalFileContentUrl");
    expect(fileUrlSource).toContain('from "database/fileUrl"');
  });

  it("reuses the helper across message image flows", () => {
    expect(messageContentSource).toContain('import { buildMessageFileContentUrl } from "./fileUrl"');
    expect(firstMessageSource).toContain('import { buildMessageFileContentUrl, isLocalFileContentUrl } from "./fileUrl"');
    expect(base64MigrationSource).toContain('import { buildMessageFileContentUrl } from "../fileUrl"');
    expect(messageContentSource).not.toContain("API_ENDPOINTS.DATABASE}/file/content/${fileId}");
    expect(firstMessageSource).not.toContain("API_ENDPOINTS.DATABASE}/file/content/${fileId}");
    expect(base64MigrationSource).not.toContain("API_ENDPOINTS.DATABASE}/file/content/${fileId}");
  });

  it("derives message image server origins from the runtime snapshot", () => {
    expect(messageContentSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(firstMessageSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(base64MigrationSource).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(messageContentSource).toContain("getRuntimeServerContext(state)");
    expect(firstMessageSource).toContain("getRuntimeServerContext(state)");
    expect(base64MigrationSource).toContain("useAppSelector(selectRuntimeCurrentServer)");
    expect(messageContentSource).not.toContain('selectCurrentServer(state)');
    expect(firstMessageSource).not.toContain('selectCurrentServer(state)');
  });
});
