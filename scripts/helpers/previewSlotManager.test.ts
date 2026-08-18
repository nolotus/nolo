import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDefaultPreviewSlotRegistry } from "./previewSlotRegistry";
import {
  claimPreviewSlot,
  repairPreviewSlots,
  releasePreviewSlot,
  renderPreviewSlotEnv,
  renderPreviewProxySnippet,
} from "./previewSlotManager";

describe("previewSlotManager", () => {
  test("claimPreviewSlot marks a free slot claimed and exports stable env", () => {
    const registry = createDefaultPreviewSlotRegistry();
    const claimed = claimPreviewSlot(registry, {
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      requestedSlot: "a",
      now: "2026-05-07T12:00:00.000Z",
    });

    expect(claimed.slot.slotSlug).toBe("a");
    expect(claimed.slot.status).toBe("claimed");
    const env = renderPreviewSlotEnv(claimed.slot);
    expect(env).toContain("PREVIEW_HOST=alpha-a.nolo.chat");
    expect(env).toContain("HTTP_PORT=38123");
    expect(env).not.toContain("TOOL_WORKER_PORT");
    expect(env).not.toContain("PREVIEW_TOOL_WORKER_PORT");
    expect(env).not.toContain("TOOL_WORKER_ORIGIN");
    expect("toolWorkerPort" in claimed.slot).toBe(false);
  });

  test("releasePreviewSlot rejects mismatched owners", () => {
    const registry = createDefaultPreviewSlotRegistry();
    const claimed = claimPreviewSlot(registry, {
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      requestedSlot: "a",
      now: "2026-05-07T12:00:00.000Z",
    });

    expect(() =>
      releasePreviewSlot(claimed.registry, {
        slotSlug: "a",
        branch: "feat/preview-b",
        worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-b",
      })
    ).toThrow("owned by another branch/worktree");
  });

  test("renderPreviewProxySnippet uses stable host and app port", () => {
    const registry = createDefaultPreviewSlotRegistry();
    const claimed = claimPreviewSlot(registry, {
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      requestedSlot: "a",
    });

    expect(renderPreviewProxySnippet(claimed.slot)).toContain("server_name alpha-a.nolo.chat;");
    expect(renderPreviewProxySnippet(claimed.slot)).toContain("proxy_pass http://127.0.0.1:38123;");
  });

  test("repairPreviewSlots marks missing worktree claims as stale", async () => {
    const dir = await mkdtemp(join(tmpdir(), "preview-slot-worktree-"));
    const claimed = claimPreviewSlot(createDefaultPreviewSlotRegistry(), {
      branch: "feat/preview-a",
      worktreePath: join(dir, "missing-worktree"),
      claimedBy: "codex-a",
      requestedSlot: "a",
    });

    const repaired = repairPreviewSlots(claimed.registry);
    expect(repaired.slots[0].status).toBe("stale");
  });
});
