import { describe, expect, test } from "bun:test";
import { createDefaultPreviewSlotRegistry } from "./previewSlotRegistry";
import { resolveOwnedPreviewLaunchEnv } from "./previewLaunchEnv";

describe("previewLaunchEnv", () => {
  test("uses the claimed preview slot port for an owned worktree", () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[2] = {
      ...registry.slots[2],
      status: "claimed",
      branch: "codex/preview-auth-tool",
      worktreePath: "C:\\repo\\.worktrees\\codex-preview-auth",
      claimedBy: "codex",
      assignedAt: "2026-05-15T08:00:00.000Z",
    };

    const launchEnv = resolveOwnedPreviewLaunchEnv(registry, {
      branch: "codex/preview-auth-tool",
      worktreePath: "C:\\repo\\.worktrees\\codex-preview-auth",
    });

    expect(launchEnv).toMatchObject({
      HTTP_PORT: "38323",
      PREVIEW_HTTP_PORT: "38323",
      PREVIEW_HOST: "alpha-c.nolo.chat",
      PREVIEW_SLOT: "c",
      NOLO_SLOT_LABEL: "[slot:main preview:c api:38323]",
      NOLO_SERVER_DB_PATH: "data/leveldb",
    });
  });

  test("returns null when the worktree does not own a preview slot", () => {
    const registry = createDefaultPreviewSlotRegistry();

    expect(
      resolveOwnedPreviewLaunchEnv(registry, {
        branch: "codex/other",
        worktreePath: "C:\\repo\\.worktrees\\other",
      })
    ).toBeNull();
  });

  test("can omit core proxy env for overlay-only UI previews", () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/ui-only",
      worktreePath: "C:\\repo\\.worktrees\\ui-only",
      claimedBy: "codex",
      assignedAt: "2026-05-15T08:00:00.000Z",
    };

    const launchEnv = resolveOwnedPreviewLaunchEnv(registry, {
      branch: "feat/ui-only",
      worktreePath: "C:\\repo\\.worktrees\\ui-only",
      runtimeMode: "overlay-preview",
    });

    expect(launchEnv?.HTTP_PORT).toBe("38123");
    expect(launchEnv).not.toHaveProperty("NOLO_SERVER_CORE_BASE_URL");
  });
});
