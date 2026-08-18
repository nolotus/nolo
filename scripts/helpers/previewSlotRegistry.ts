import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type PreviewSlotSlug = "a" | "b" | "c" | "d";
export type PreviewSlotStatus = "free" | "claimed" | "stale";

export type PreviewSlotRecord = {
  slotSlug: PreviewSlotSlug;
  host: string;
  branch: string | null;
  worktreePath: string | null;
  claimedBy: string | null;
  httpPort: number;
  assignedAt: string | null;
  status: PreviewSlotStatus;
};

export type PreviewSlotRegistry = {
  schemaVersion: 1;
  slots: PreviewSlotRecord[];
};

export const DEFAULT_PREVIEW_SLOTS: ReadonlyArray<
  Pick<PreviewSlotRecord, "slotSlug" | "host" | "httpPort">
> = [
  { slotSlug: "a", host: "alpha-a.nolo.chat", httpPort: 38123 },
  { slotSlug: "b", host: "alpha-b.nolo.chat", httpPort: 38223 },
  { slotSlug: "c", host: "alpha-c.nolo.chat", httpPort: 38323 },
  { slotSlug: "d", host: "alpha-d.nolo.chat", httpPort: 38423 },
];

export function resolvePreviewSlotRegistryPath(
  env: NodeJS.ProcessEnv = process.env
) {
  return env.NOLO_PREVIEW_SLOT_REGISTRY?.trim()
    ? env.NOLO_PREVIEW_SLOT_REGISTRY.trim()
    : join(homedir(), ".nolo", "preview-slots.json");
}

export function createDefaultPreviewSlotRegistry(): PreviewSlotRegistry {
  return {
    schemaVersion: 1,
    slots: DEFAULT_PREVIEW_SLOTS.map((slot) => ({
      ...slot,
      branch: null,
      worktreePath: null,
      claimedBy: null,
      assignedAt: null,
      status: "free",
    })),
  };
}

export async function readPreviewSlotRegistry(
  registryPath = resolvePreviewSlotRegistryPath()
) {
  try {
    const raw = await readFile(registryPath, "utf8");
    return JSON.parse(raw) as PreviewSlotRegistry;
  } catch {
    return createDefaultPreviewSlotRegistry();
  }
}

export async function writePreviewSlotRegistry(
  registry: PreviewSlotRegistry,
  registryPath = resolvePreviewSlotRegistryPath()
) {
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}
