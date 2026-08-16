import {
  resolveRuntimeConfig,
  toRuntimeEnv,
  type RuntimeEnv,
} from "../dev/runtimeConfig";
import {
  buildPreviewLaunchEnv,
  findOwnedPreviewSlot,
} from "./previewLaunchEnv";
import type { PreviewRuntimeMode } from "./previewRuntimeMode";
import { releasePreviewSlot } from "./previewSlotManager";
import type {
  PreviewSlotRecord,
  PreviewSlotRegistry,
} from "./previewSlotRegistry";

type PreviewProcessKey = "web" | "api";

export type PreviewProcessStatus = {
  key: PreviewProcessKey;
  pid: number | null;
  running: boolean;
  ready?: boolean;
  log: string;
};

export type PreviewSessionStatus = {
  slotStatus: "claimed" | "stale" | "free" | "unclaimed-for-this-worktree";
  slotSlug: "a" | "b" | "c" | "d" | null;
  branch: string;
  worktreePath: string;
  previewUrl: string | null;
  localApiOrigin: string | null;
  serverDbPath: string;
  processes: Record<PreviewProcessKey, PreviewProcessStatus>;
};

type LaunchEnv = RuntimeEnv & {
  HTTP_PORT: string;
  PREVIEW_SLOT?: PreviewSlotRecord["slotSlug"];
  PREVIEW_HOST?: string;
  PREVIEW_HTTP_PORT?: string;
};

type RuntimeWithStatus = {
  collectStatus(): Promise<PreviewProcessStatus[]>;
};

type RuntimeWithStop = RuntimeWithStatus & {
  stopTargets(keys: PreviewProcessKey[]): Promise<void>;
};

function buildLaunchEnv(
  ownedSlot: PreviewSlotRecord | null,
  branch: string,
  worktreePath: string,
  runtimeMode: PreviewRuntimeMode = "shared-data-preview"
): LaunchEnv {
  if (!ownedSlot) {
    return toRuntimeEnv(
      resolveRuntimeConfig({
        mode: runtimeMode,
        workspacePath: worktreePath,
        branch,
      })
    ) as LaunchEnv;
  }

  return buildPreviewLaunchEnv({ slot: ownedSlot, branch, worktreePath, runtimeMode });
}

function normalizeProcesses(
  statuses: PreviewProcessStatus[]
): Record<PreviewProcessKey, PreviewProcessStatus> {
  const defaults: Record<PreviewProcessKey, PreviewProcessStatus> = {
    web: { key: "web", pid: null, running: false, log: "" },
    api: { key: "api", pid: null, running: false, ready: false, log: "" },
  };

  for (const status of statuses) {
    defaults[status.key] = status;
  }

  return defaults;
}

function buildPreviewSessionStatus(
  ownedSlot: PreviewSlotRecord | null,
  launchEnv: LaunchEnv,
  processes: PreviewProcessStatus[],
  branch: string,
  worktreePath: string
): PreviewSessionStatus {
  return {
    slotStatus: ownedSlot?.status ?? "unclaimed-for-this-worktree",
    slotSlug: ownedSlot?.slotSlug ?? null,
    branch,
    worktreePath,
    previewUrl: ownedSlot ? `https://${ownedSlot.host}` : null,
    localApiOrigin: `http://127.0.0.1:${launchEnv.HTTP_PORT}`,
    serverDbPath: launchEnv.NOLO_SERVER_DB_PATH,
    processes: normalizeProcesses(processes),
  };
}

export async function getPreviewSessionStatus(input: {
  registry: PreviewSlotRegistry;
  branch: string;
  worktreePath: string;
  runtimeMode?: PreviewRuntimeMode;
  createRuntime(launchEnv: LaunchEnv): RuntimeWithStatus;
}) {
  const ownedSlot = findOwnedPreviewSlot(input.registry, input);
  const launchEnv = buildLaunchEnv(ownedSlot, input.branch, input.worktreePath, input.runtimeMode);
  const runtime = input.createRuntime(launchEnv);
  const processes = await runtime.collectStatus();

  return buildPreviewSessionStatus(
    ownedSlot,
    launchEnv,
    processes,
    input.branch,
    input.worktreePath
  );
}

export async function releasePreviewSession(input: {
  registry: PreviewSlotRegistry;
  branch: string;
  worktreePath: string;
  force?: boolean;
  runtimeMode?: PreviewRuntimeMode;
  createRuntime(launchEnv: LaunchEnv): RuntimeWithStatus;
}) {
  const status = await getPreviewSessionStatus(input);
  if (!status.slotSlug) {
    return {
      registry: input.registry,
      slot: null,
      status: "skipped" as const,
      released: false,
      reason: "no_slot" as const,
      localApiOrigin: status.localApiOrigin ?? undefined,
      previewUrl: status.previewUrl ?? undefined,
    };
  }

  const hasActiveProcess =
    status.processes.web.running ||
    status.processes.api.running;

  if (hasActiveProcess && !input.force) {
    throw new Error("Run preview:stop before preview:release");
  }

  const registry = releasePreviewSlot(input.registry, {
    slotSlug: status.slotSlug,
    branch: input.branch,
    worktreePath: input.worktreePath,
    force: input.force,
  });

  return {
    registry,
    slot: registry.slots.find((slot) => slot.slotSlug === status.slotSlug) ?? null,
    status: "released" as const,
    released: true,
    slotSlug: status.slotSlug,
    localApiOrigin: status.localApiOrigin ?? undefined,
    previewUrl: status.previewUrl ?? undefined,
  };
}

export async function stopPreviewSession(input: {
  registry: PreviewSlotRegistry;
  branch: string;
  worktreePath: string;
  runtimeMode?: PreviewRuntimeMode;
  createRuntime(launchEnv: LaunchEnv): RuntimeWithStop;
}) {
  const status = await getPreviewSessionStatus(input);
  const runtime = input.createRuntime(
    buildLaunchEnv(findOwnedPreviewSlot(input.registry, input), input.branch, input.worktreePath, input.runtimeMode)
  );
  const hasActiveProcess =
    status.processes.web.running ||
    status.processes.api.running;

  if (!hasActiveProcess) {
    return { status, stopped: false };
  }

  await runtime.stopTargets(["web", "api"]);
  return { status, stopped: true };
}
