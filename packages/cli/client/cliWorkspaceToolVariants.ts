/**
 * Local workspace tool runtime toggle.
 *
 * Extracted from localRuntimeAdapter.ts. This module no longer hosts the
 * schema variant experiment layer (readFile/globFiles description/parameter
 * variants were removed after the A/B concluded — the winning schemas are the
 * only implementations in localWorkspaceToolDefs.ts). It now only owns the
 * declared-only toggle for the CLI local runtime.
 *
 * No module state — only reads env vars.
 */
import type { EnvLike } from "./localRuntimeHelpers";

/**
 * Whether the CLI local runtime should use declared-only workspace tools
 * (no auto-injected default tool surface).
 */
export function shouldUseDeclaredOnlyLocalWorkspaceTools(env: EnvLike) {
  const value =
    env.NOLO_LOCAL_WORKSPACE_TOOLSET || env.NOLO_LOCAL_TOOLSET_MODE || "";
  return value === "declared-only" || value === "declared";
}
