import type { RuntimeMode } from "../dev/runtimeConfig";

export type PreviewRuntimeMode = Extract<RuntimeMode, "overlay-preview" | "shared-data-preview">;

type EnvLike = Record<string, string | undefined>;
type PreviewRuntimeModeInput = {
  args: Map<string, string>;
  env: EnvLike;
  branch?: string | null;
};

function readRuntimeMode(args: Map<string, string>, env: EnvLike): string | undefined {
  return args.get("--runtime-mode") || env.NOLO_PREVIEW_RUNTIME_MODE;
}

function isPreviewRuntimeMode(value: string): value is PreviewRuntimeMode {
  return value === "overlay-preview" || value === "shared-data-preview";
}

function normalizeBranchTopic(branch: string) {
  return branch
    .split("/")
    .at(-1)!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveDefaultPreviewRuntimeMode(branch?: string | null): PreviewRuntimeMode {
  if (branch && normalizeBranchTopic(branch) !== "alpha") {
    return "overlay-preview";
  }
  return "shared-data-preview";
}

export function resolvePreviewRuntimeMode(input: PreviewRuntimeModeInput): PreviewRuntimeMode {
  const explicitMode = readRuntimeMode(input.args, input.env);
  if (explicitMode) {
    if (!isPreviewRuntimeMode(explicitMode)) {
      throw new Error(`Unsupported preview runtime mode: ${explicitMode}`);
    }
    return explicitMode;
  }

  if (input.args.has("--no-core") || input.env.NOLO_PREVIEW_DISABLE_CORE === "1") {
    return "overlay-preview";
  }

  return resolveDefaultPreviewRuntimeMode(input.branch);
}
