import { describe, expect, mock, test } from "bun:test";
import { createDefaultPreviewSlotRegistry } from "./previewSlotRegistry";
import { startPreviewSession } from "./previewStart";

describe("previewStart", () => {
  test("preview slot wins for ports while local dev uses the shared db", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    const startTargets = mock(async () => undefined);

    const result = await startPreviewSession({
      registry,
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      requestedSlot: "a",
      createRuntime: () => ({
        startTargets,
      }),
    });

    expect(result.slot.httpPort).toBe(38123);
    expect(result.launchEnv.NOLO_SERVER_DB_PATH).toBe("data/leveldb");
    expect(result.launchEnv).not.toHaveProperty("NOLO_SERVER_CORE_BASE_URL");
    expect(result.launchEnv.PREVIEW_HOST).toBe("alpha-a.nolo.chat");
    expect(result.launchEnv.HTTP_PORT).toBe("38123");
    expect("TOOL_WORKER_ORIGIN" in result.launchEnv).toBe(false);
    expect(startTargets).toHaveBeenCalledWith(["web", "api"]);
  });

  test("releases the claimed slot when dev startup throws", async () => {
    const registry = createDefaultPreviewSlotRegistry();

    try {
      await startPreviewSession({
        registry,
        branch: "feat/preview-a",
        worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
        requestedSlot: "a",
        createRuntime: () => ({
          startTargets: async () => {
            throw new Error("api failed");
          },
        }),
      });
      throw new Error("expected preview start to fail");
    } catch (error) {
      expect((error as Error).message).toContain("api failed");
      const releasedRegistry = (error as Error & {
        releasedRegistry?: typeof registry;
      }).releasedRegistry;
      expect(releasedRegistry?.slots[0]?.status).toBe("free");
      expect(releasedRegistry?.slots[0]?.branch).toBeNull();
    }
  });

  test("reuses an existing slot owned by the same branch and worktree", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };

    const result = await startPreviewSession({
      registry,
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      requestedSlot: "a",
      claimedBy: "codex-a",
      createRuntime: () => ({
        startTargets: async () => undefined,
      }),
    });

    expect(result.slot.slotSlug).toBe("a");
    expect(result.summary.previewUrl).toBe("https://alpha-a.nolo.chat");
    expect(result.summary.localApiOrigin).toBe("http://127.0.0.1:38123");
    expect(result.registry.slots[0]?.assignedAt).toBe("2026-05-07T08:00:00.000Z");
  });
});
