import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const hookSource = readFileSync(
  join(import.meta.dir, "useStaleBuildPrompt.ts"),
  "utf-8",
);
const messageSliceSource = readFileSync(
  join(import.meta.dir, "../../chat/messages/messageSlice.ts"),
  "utf-8",
);

describe("stale build prompt", () => {
  test("polls /api/core/meta against boot buildSha", () => {
    expect(hookSource).toContain("/api/core/meta");
    expect(hookSource).toContain("readBootBuildSha");
    expect(hookSource).not.toContain("__DEV_RELOAD_PENDING__");
  });
});

describe("messageSlice", () => {
  test("does not auto-reload after messageStreamEnd", () => {
    expect(messageSliceSource).not.toContain("dev-reload 逻辑");
    expect(messageSliceSource).not.toContain("__DEV_RELOAD_PENDING__");
  });
});