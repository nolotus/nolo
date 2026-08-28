import { type ProcessKey } from "../dev/devControlRuntime";
import {
  buildPreviewLaunchEnv,
  findOwnedPreviewSlot,
  type PreviewLaunchEnv,
} from "./previewLaunchEnv";
import type { PreviewRuntimeMode } from "./previewRuntimeMode";
import {
  claimPreviewSlot,
  releasePreviewSlot,
} from "./previewSlotManager";
import type {
  PreviewSlotRecord,
  PreviewSlotRegistry,
  PreviewSlotSlug,
} from "./previewSlotRegistry";

type PreviewStartRuntime = {
  startTargets(keys: ProcessKey[]): Promise<void>;
};

type PreviewStartLaunchEnv = PreviewLaunchEnv;

type StartPreviewSessionInput = {
  registry: PreviewSlotRegistry;
  branch: string;
  worktreePath: string;
  requestedSlot?: PreviewSlotSlug;
  claimedBy?: string | null;
  runtimeMode?: PreviewRuntimeMode;
  createRuntime(launchEnv: PreviewStartLaunchEnv): PreviewStartRuntime;
};

export type PreviewStartSummary = {
  slotSlug: PreviewSlotSlug;
  previewUrl: string;
  localApiOrigin: string;
  serverDbPath: string;
};

function buildPreviewStartSummary(
  slot: PreviewSlotRecord,
  launchEnv: PreviewStartLaunchEnv
): PreviewStartSummary {
  return {
    slotSlug: slot.slotSlug,
    previewUrl: `https://${slot.host}`,
    localApiOrigin: `http://127.0.0.1:${launchEnv.HTTP_PORT}`,
    serverDbPath: launchEnv.NOLO_SERVER_DB_PATH,
  };
}

export async function startPreviewSession(input: StartPreviewSessionInput) {
  const existingOwnedSlot = findOwnedPreviewSlot(input.registry, input);
  const matchingOwnedSlot =
    existingOwnedSlot &&
    (!input.requestedSlot || existingOwnedSlot.slotSlug === input.requestedSlot)
      ? existingOwnedSlot
      : null;
  const claimed = matchingOwnedSlot
    ? {
        slot: matchingOwnedSlot,
        registry: input.registry,
      }
    : claimPreviewSlot(input.registry, {
        branch: input.branch,
        worktreePath: input.worktreePath,
        requestedSlot: input.requestedSlot,
        claimedBy: input.claimedBy ?? null,
      });

  const launchEnv = buildPreviewLaunchEnv({
    slot: claimed.slot,
    branch: input.branch,
    worktreePath: input.worktreePath,
    runtimeMode: input.runtimeMode,
  });

  const runtime = input.createRuntime(launchEnv);

  try {
    await runtime.startTargets(["web", "api"]);
    return {
      registry: claimed.registry,
      slot: claimed.slot,
      launchEnv,
      summary: buildPreviewStartSummary(claimed.slot, launchEnv),
    };
  } catch (error) {
    const releasedRegistry = releasePreviewSlot(claimed.registry, {
      slotSlug: claimed.slot.slotSlug,
      branch: input.branch,
      worktreePath: input.worktreePath,
      force: true,
    });
    if (error instanceof Error) {
      throw Object.assign(error, { releasedRegistry });
    }
    throw Object.assign(new Error(String(error)), { releasedRegistry });
  }
}
