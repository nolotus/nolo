import { existsSync } from "node:fs";

import {
  type PreviewSlotRecord,
  type PreviewSlotRegistry,
  type PreviewSlotSlug,
} from "./previewSlotRegistry";

type ClaimInput = {
  branch: string;
  worktreePath: string;
  claimedBy: string | null;
  requestedSlot?: PreviewSlotSlug;
  now?: string;
};

type ReleaseInput = {
  slotSlug: PreviewSlotSlug;
  branch: string;
  worktreePath: string;
  force?: boolean;
};

function findSlot(registry: PreviewSlotRegistry, slotSlug: PreviewSlotSlug) {
  const slot = registry.slots.find((entry) => entry.slotSlug === slotSlug);
  if (!slot) {
    throw new Error(`Unknown preview slot: ${slotSlug}`);
  }
  return slot;
}

export function claimPreviewSlot(
  registry: PreviewSlotRegistry,
  input: ClaimInput
): { slot: PreviewSlotRecord; registry: PreviewSlotRegistry } {
  const slot = input.requestedSlot
    ? findSlot(registry, input.requestedSlot)
    : registry.slots.find((entry) => entry.status === "free");
  if (!slot) {
    throw new Error("No free preview slots available");
  }
  if (slot.status !== "free") {
    throw new Error(`Preview slot ${slot.slotSlug} is already claimed`);
  }

  const nextSlot: PreviewSlotRecord = {
    ...slot,
    branch: input.branch,
    worktreePath: input.worktreePath,
    claimedBy: input.claimedBy,
    assignedAt: input.now ?? new Date().toISOString(),
    status: "claimed",
  };

  return {
    slot: nextSlot,
    registry: {
      ...registry,
      slots: registry.slots.map((entry) =>
        entry.slotSlug === nextSlot.slotSlug ? nextSlot : entry
      ),
    },
  };
}

export function releasePreviewSlot(
  registry: PreviewSlotRegistry,
  input: ReleaseInput
): PreviewSlotRegistry {
  const slot = findSlot(registry, input.slotSlug);
  const matchesOwner =
    slot.branch === input.branch && slot.worktreePath === input.worktreePath;
  if (!matchesOwner && !input.force) {
    throw new Error(`Preview slot ${slot.slotSlug} is owned by another branch/worktree`);
  }

  return {
    ...registry,
    slots: registry.slots.map((entry): PreviewSlotRecord =>
      entry.slotSlug === input.slotSlug
        ? {
            ...entry,
            branch: null,
            worktreePath: null,
            claimedBy: null,
            assignedAt: null,
            status: "free",
          }
        : entry
    ),
  };
}

export function renderPreviewSlotEnv(slot: PreviewSlotRecord) {
  return [
    `PREVIEW_SLOT=${slot.slotSlug}`,
    `PREVIEW_HOST=${slot.host}`,
    `HTTP_PORT=${slot.httpPort}`,
    `PREVIEW_HTTP_PORT=${slot.httpPort}`,
  ].join("\n");
}

export function renderPreviewProxySnippet(slot: PreviewSlotRecord) {
  return [
    `# preview slot ${slot.slotSlug}`,
    `server_name ${slot.host};`,
    `location / {`,
    `  proxy_pass http://127.0.0.1:${slot.httpPort};`,
    `}`,
  ].join("\n");
}

export function repairPreviewSlots(registry: PreviewSlotRegistry): PreviewSlotRegistry {
  return {
    ...registry,
    slots: registry.slots.map((slot): PreviewSlotRecord =>
      slot.status === "claimed" && slot.worktreePath && !existsSync(slot.worktreePath)
        ? { ...slot, status: "stale" }
        : slot
    ),
  };
}
