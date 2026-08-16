import { resolveRuntimeConfig, toRuntimeEnv, type RuntimeEnv } from "../dev/runtimeConfig";
import type { PreviewRuntimeMode } from "./previewRuntimeMode";
import type { PreviewSlotRecord, PreviewSlotRegistry } from "./previewSlotRegistry";

export type PreviewLaunchEnv = RuntimeEnv & {
  HTTP_PORT: string;
  PREVIEW_SLOT: PreviewSlotRecord["slotSlug"];
  PREVIEW_HOST: string;
  PREVIEW_HTTP_PORT: string;
};

export function findOwnedPreviewSlot(
  registry: PreviewSlotRegistry,
  input: {
    branch: string;
    worktreePath: string;
  }
): PreviewSlotRecord | null {
  return (
    registry.slots.find(
      (slot) =>
        slot.status === "claimed" &&
        slot.branch === input.branch &&
        slot.worktreePath === input.worktreePath
    ) ?? null
  );
}

export function buildPreviewLaunchEnv(input: {
  slot: PreviewSlotRecord;
  branch: string;
  worktreePath: string;
  runtimeMode?: PreviewRuntimeMode;
}): PreviewLaunchEnv {
  return toRuntimeEnv(
    resolveRuntimeConfig({
      mode: input.runtimeMode ?? "shared-data-preview",
      workspacePath: input.worktreePath,
      branch: input.branch,
      previewSlot: {
        slotSlug: input.slot.slotSlug,
        host: input.slot.host,
        httpPort: input.slot.httpPort,
      },
    })
  ) as PreviewLaunchEnv;
}

export function resolveOwnedPreviewLaunchEnv(
  registry: PreviewSlotRegistry,
  input: {
    branch: string;
    worktreePath: string;
    runtimeMode?: PreviewRuntimeMode;
  }
): PreviewLaunchEnv | null {
  const slot = findOwnedPreviewSlot(registry, input);
  return slot
    ? buildPreviewLaunchEnv({
        slot,
        branch: input.branch,
        worktreePath: input.worktreePath,
        runtimeMode: input.runtimeMode,
      })
    : null;
}
