import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_PREVIEW_SLOTS,
  createDefaultPreviewSlotRegistry,
  readPreviewSlotRegistry,
  resolvePreviewSlotRegistryPath,
  writePreviewSlotRegistry,
} from "./previewSlotRegistry";

describe("previewSlotRegistry", () => {
  test("resolvePreviewSlotRegistryPath prefers explicit env override", () => {
    expect(
      resolvePreviewSlotRegistryPath({
        NOLO_PREVIEW_SLOT_REGISTRY: "C:\\preview\\slots.json",
      } as NodeJS.ProcessEnv)
    ).toBe("C:\\preview\\slots.json");
  });

  test("createDefaultPreviewSlotRegistry returns 4 fixed slots", () => {
    const registry = createDefaultPreviewSlotRegistry();

    expect(registry.schemaVersion).toBe(1);
    expect(registry.slots.map((slot) => slot.slotSlug)).toEqual(
      DEFAULT_PREVIEW_SLOTS.map((slot) => slot.slotSlug)
    );
    expect(registry.slots.every((slot) => slot.status === "free")).toBe(true);
  });

  test("writePreviewSlotRegistry persists JSON that readPreviewSlotRegistry can read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "preview-slot-registry-"));
    const file = join(dir, "slots.json");
    const registry = createDefaultPreviewSlotRegistry();

    registry.slots[0] = {
      ...registry.slots[0],
      branch: "feat/preview-a",
      worktreePath: "C:\\Users\\nolot\\bun-nolo\\.worktrees\\preview-a",
      claimedBy: "codex-a",
      assignedAt: "2026-05-07T00:00:00.000Z",
      status: "claimed",
    };

    await writePreviewSlotRegistry(registry, file);
    const reread = await readPreviewSlotRegistry(file);

    expect(reread).toEqual(registry);
  });
});
