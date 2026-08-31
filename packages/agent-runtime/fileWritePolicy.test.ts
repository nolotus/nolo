import { describe, expect, test } from "bun:test";
import { evaluateFileWritePolicy } from "./fileWritePolicy";

describe("evaluateFileWritePolicy", () => {
  test("allows an approved session", () => {
    expect(evaluateFileWritePolicy({ tool: "writeFile", path: "a.txt", sessionApproved: true })).toEqual({
      permissionDecision: "allow",
    });
  });

  test("asks before the first write and suggests a session rule", () => {
    expect(evaluateFileWritePolicy({ tool: "editFile", path: "src/a.ts", sessionApproved: false })).toMatchObject({
      permissionDecision: "ask",
      permissionRequest: {
        tool: "editFile",
        action: "file_write",
        title: "确认写入文件",
        body: expect.stringContaining("本会话首次写入文件"),
        suggestedRule: { scope: "session" },
      },
    });
  });

  test("the denied decision remains ask until approved", () => {
    const result = evaluateFileWritePolicy({ tool: "writeFile", path: "a.txt", sessionApproved: false });
    expect(result.permissionDecision).toBe("ask");
    expect("permissionRequest" in result).toBe(true);
  });
});
