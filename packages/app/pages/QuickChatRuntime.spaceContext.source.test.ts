import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "QuickChatRuntime.tsx"), "utf8");

describe("QuickChatRuntime space context (source)", () => {
  it("accepts explicit route spaceId and prefers it over Redux", () => {
    expect(source).toContain("spaceId?: string");
    expect(source).toContain("spaceId: spaceIdProp");
    expect(source).toContain("const storeSpaceId = useAppSelector(selectCurrentSpaceId)");
    expect(source).toContain("const currentSpaceId = spaceIdProp ?? storeSpaceId");
    expect(source).toContain("spaceId: currentSpaceId");
  });

  it("supports desktop cwd workspace access and display without changing web behavior", () => {
    expect(source).toContain("getIsDesktopApp() ? { workspaceToolsHint: true }");
    expect(source).toContain("window.__NOLO_DESKTOP_CWD__");
    expect(source).toContain("data-testid=\"quick-chat-workspace\"");
    expect(source).toContain("cwd: desktopCwd");
    expect(source).toContain("t(\"quickChat.workspace\", \"工作区\")");
    expect(source).toContain("t(\"quickChat.workspaceUnset\", \"未设置\")");
  });

  it("prefers the current space boundFolder over the desktop cwd for the workspace indicator", () => {
    expect(source).toContain("selectSpaceById");
    expect(source).toContain("currentSpace?.boundFolder?.trim() || desktopCwd");
    expect(source).toContain("data-workspace-cwd={workspacePath || undefined}");
  });

  it("supports the compact Space Home surface token", () => {
    expect(source).toContain('"space-home-compact"');
  });
});
