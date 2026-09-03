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

  test("badge click waits for the drain window to end before reloading", () => {
    // waitUntilServerReadyThenReload：meta 200（新进程接管）才放行 reload；
    // 45s 超时兜底与客户端 drain 重试预算（30×1.5s）同量级。
    expect(hookSource).toContain("waitUntilServerReadyThenReload");
    expect(hookSource).toContain("WAIT_READY_TIMEOUT_MS");

    const badgeSource = readFileSync(
      join(import.meta.dir, "DevReloadBadge.tsx"),
      "utf-8",
    );
    // 点击后必须先等待再 reload，禁止直接 window.location.reload()
    expect(badgeSource).toContain("waitUntilServerReadyThenReload");
    expect(badgeSource).toMatch(/waitUntilServerReadyThenReload[\s\S]*reload/);
    expect(badgeSource).toContain("DevReloadBadge--checking");
  });
});

describe("messageSlice", () => {
  test("does not auto-reload after messageStreamEnd", () => {
    expect(messageSliceSource).not.toContain("dev-reload 逻辑");
    expect(messageSliceSource).not.toContain("__DEV_RELOAD_PENDING__");
  });
});