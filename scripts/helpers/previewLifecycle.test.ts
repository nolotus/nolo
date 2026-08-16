import { describe, expect, mock, test } from "bun:test";
import { createDefaultPreviewSlotRegistry } from "./previewSlotRegistry";
import {
  getPreviewSessionStatus,
  releasePreviewSession,
  stopPreviewSession,
} from "./previewLifecycle";

describe("previewLifecycle", () => {
  test("aggregates a claimed running session into one summary", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };

    const summary = await getPreviewSessionStatus({
      registry,
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      createRuntime: () => ({
        collectStatus: async () => [
          { key: "web", pid: 101, running: true, log: "web.log" },
          { key: "api", pid: 303, running: true, ready: true, log: "api.log" },
        ],
      }),
    });

    expect(summary.slotStatus).toBe("claimed");
    expect(summary.previewUrl).toBe("https://alpha-a.nolo.chat");
    expect(summary.processes.api.ready).toBe(true);
    expect(summary.processes).not.toHaveProperty("tool");
    expect(summary).not.toHaveProperty("toolWorkerOrigin");
  });

  test("uses the claimed preview slot launch env when collecting status", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[2] = {
      ...registry.slots[2],
      status: "claimed",
      branch: "feat/preview-c",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-c",
      claimedBy: "codex-c",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };
    const launchEnvs: any[] = [];

    const summary = await getPreviewSessionStatus({
      registry,
      branch: "feat/preview-c",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-c",
      createRuntime: (launchEnv) => {
        launchEnvs.push(launchEnv);
        return {
          collectStatus: async () => [],
        };
      },
    });

    expect(launchEnvs[0]).toMatchObject({
      HTTP_PORT: String(registry.slots[2].httpPort),
      PREVIEW_HTTP_PORT: String(registry.slots[2].httpPort),
      PREVIEW_HOST: registry.slots[2].host,
      PREVIEW_SLOT: "c",
      NOLO_SLOT_LABEL: "[slot:main preview:c api:38323]",
      NOLO_SERVER_DB_PATH: "data/leveldb",
    });
    expect(summary.localApiOrigin).toBe("http://127.0.0.1:38323");
  });

  test("can collect overlay-only preview status without core proxy env", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[2] = {
      ...registry.slots[2],
      status: "claimed",
      branch: "feat/preview-c",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-c",
      claimedBy: "codex-c",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };
    const launchEnvs: any[] = [];

    await getPreviewSessionStatus({
      registry,
      branch: "feat/preview-c",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-c",
      runtimeMode: "overlay-preview",
      createRuntime: (launchEnv) => {
        launchEnvs.push(launchEnv);
        return {
          collectStatus: async () => [],
        };
      },
    });

    expect(launchEnvs[0]).not.toHaveProperty("NOLO_SERVER_CORE_BASE_URL");
  });

  test("release refuses while preview processes are still active", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };

    await expect(
      releasePreviewSession({
        registry,
        branch: "feat/preview-a",
        worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
        createRuntime: () => ({
          collectStatus: async () => [
            { key: "web", pid: 101, running: true, log: "web.log" },
            { key: "api", pid: 303, running: true, ready: true, log: "api.log" },
          ],
        }),
      })
    ).rejects.toThrow("Run preview:stop before preview:release");
  });

  test("stop leaves slot ownership intact", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };

    const stopTargets = mock(async () => undefined);
    const result = await stopPreviewSession({
      registry,
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      createRuntime: () => ({
        collectStatus: async () => [
          { key: "web", pid: 101, running: true, log: "web.log" },
          { key: "api", pid: 303, running: true, ready: true, log: "api.log" },
        ],
        stopTargets,
      }),
    });

    expect(result.stopped).toBe(true);
    expect(result.status.slotStatus).toBe("claimed");
    expect(stopTargets).toHaveBeenCalledWith(["web", "api"]);
  });

  test("release succeeds after processes are stopped", async () => {
    const registry = createDefaultPreviewSlotRegistry();
    registry.slots[0] = {
      ...registry.slots[0],
      status: "claimed",
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T08:00:00.000Z",
    };

    const result = await releasePreviewSession({
      registry,
      branch: "feat/preview-a",
        worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
        createRuntime: () => ({
          collectStatus: async () => [
            { key: "web", pid: null, running: false, log: "web.log" },
            { key: "api", pid: null, running: false, ready: false, log: "api.log" },
          ],
        }),
    });

    expect(result.registry.slots[0]?.status).toBe("free");
    expect(result.status).toBe("released");
    expect(result.released).toBe(true);
    expect(result.slotSlug).toBe("a");
  });

  test("release is a no-op when this worktree owns no preview slot", async () => {
    const registry = createDefaultPreviewSlotRegistry();

    const result = await releasePreviewSession({
      registry,
      branch: "feat/no-preview",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\no-preview",
      createRuntime: () => ({
        collectStatus: async () => [],
      }),
    });

    expect(result.registry).toBe(registry);
    expect(result.slot).toBeNull();
    expect(result.status).toBe("skipped");
    expect(result.released).toBe(false);
    expect(result.reason).toBe("no_slot");
  });
});
