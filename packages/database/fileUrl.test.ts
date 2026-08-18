import { describe, expect, it } from "bun:test";
import {
  buildDatabaseFileContentUrl,
  isLocalDatabaseFileContentUrl,
} from "./fileUrl";

describe("database file url helpers", () => {
  it("builds normalized file content urls", () => {
    expect(
      buildDatabaseFileContentUrl("https://nolo.chat/", "file-123")
    ).toBe("https://nolo.chat/api/v1/db/file/content/file-123");
  });

  it("returns null when server or file id is missing", () => {
    expect(buildDatabaseFileContentUrl("", "file-123")).toBeNull();
    expect(buildDatabaseFileContentUrl("https://nolo.chat", "")).toBeNull();
  });

  it("detects local file content urls", () => {
    expect(
      isLocalDatabaseFileContentUrl(
        "http://127.0.0.1:38123/api/v1/db/file/content/file-123"
      )
    ).toBe(true);
    expect(
      isLocalDatabaseFileContentUrl(
        "https://nolo.chat/api/v1/db/file/content/file-123"
      )
    ).toBe(false);
  });
});
