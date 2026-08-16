import { DEFAULT_LOCAL_API_PORT } from "../../packages/core/localOrigins";

// Single-instance local dev defaults (formerly resolved via buildWorktreeSlotEnv).
const LOCAL_DEV_DB_PATH = "data/leveldb";
const LOCAL_DEV_SLOT_LABEL = "[local-dev api:38123]";
const LOCAL_DEV_PREVIEW_SLUG = "main";

export type RuntimeMode = "core-owner" | "overlay-preview" | "shared-data-preview";

export type RuntimePreviewSlot = {
  slotSlug: "a" | "b" | "c" | "d";
  host: string;
  httpPort: number;
};

export type ResolvedRuntimeConfig = {
  mode: RuntimeMode;
  workspacePath: string;
  branch: string;
  httpPort: number;
  serverDbPath: string;
  slotLabel: string;
  previewSlug: string;
  coreBaseUrl: string | null;
  previewSlot?: RuntimePreviewSlot;
};

export type RuntimeEnv = {
  HTTP_PORT: string;
  NOLO_SERVER_DB_PATH: string;
  NOLO_SLOT_LABEL: string;
  PREVIEW_SLUG: string;
  NOLO_SERVER_CORE_BASE_URL?: string;
  PREVIEW_SLOT?: RuntimePreviewSlot["slotSlug"];
  PREVIEW_HOST?: string;
  PREVIEW_HTTP_PORT?: string;
};

export function resolveRuntimeConfig(input: {
  mode: RuntimeMode;
  workspacePath: string;
  branch: string;
  previewSlot?: RuntimePreviewSlot;
}): ResolvedRuntimeConfig {
  const httpPort = input.previewSlot?.httpPort ?? Number(DEFAULT_LOCAL_API_PORT);
  const previewSlug = LOCAL_DEV_PREVIEW_SLUG;
  // Local dev is single-instance; no separate core-owner proxy to derive.
  const coreBaseUrl = null;
  const slotLabel = input.previewSlot
    ? `[slot:${previewSlug} preview:${input.previewSlot.slotSlug} api:${input.previewSlot.httpPort}]`
    : LOCAL_DEV_SLOT_LABEL;

  return {
    mode: input.mode,
    workspacePath: input.workspacePath,
    branch: input.branch,
    httpPort,
    serverDbPath: LOCAL_DEV_DB_PATH,
    slotLabel,
    previewSlug,
    coreBaseUrl,
    ...(input.previewSlot ? { previewSlot: input.previewSlot } : {}),
  };
}

export function toRuntimeEnv(config: ResolvedRuntimeConfig): RuntimeEnv {
  return {
    HTTP_PORT: String(config.httpPort),
    NOLO_SERVER_DB_PATH: config.serverDbPath,
    NOLO_SLOT_LABEL: config.slotLabel,
    PREVIEW_SLUG: config.previewSlug,
    ...(config.coreBaseUrl ? { NOLO_SERVER_CORE_BASE_URL: config.coreBaseUrl } : {}),
    ...(config.previewSlot
      ? {
          PREVIEW_SLOT: config.previewSlot.slotSlug,
          PREVIEW_HOST: config.previewSlot.host,
          PREVIEW_HTTP_PORT: String(config.previewSlot.httpPort),
        }
      : {}),
  };
}
