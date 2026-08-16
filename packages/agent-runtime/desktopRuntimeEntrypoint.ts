/**
 * Desktop runtime entrypoint resolution.
 *
 * Shared between:
 * - `packages/desktop/src/bun/index.ts` (sets the env var)
 * - `packages/server/handlers/desktopAgentRuntimeTurnService.ts` (reads the env var)
 *
 * The packaged desktop app always sets `NOLO_DESKTOP_APP_ENTRY` to its own
 * `index.js` path before any server/runtime code runs. Tool executors that
 * need to spawn CLI subcommands (e.g. `dialog list`, `table query`) use this
 * entrypoint so they go through the same `DESKTOP_CLI_COMMAND_ROOTS` dispatch
 * as direct CLI invocations from the terminal.
 *
 * The fallback resolves to `packages/cli/index.ts` relative to this file,
 * which only works in development (non-packaged) environments. In production
 * the env var must be set.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the CLI entrypoint for desktop runtime tool executors.
 *
 * Priority:
 * 1. `NOLO_DESKTOP_APP_ENTRY` env var (set by desktop entry at startup)
 * 2. Relative fallback to `packages/cli/index.ts` (dev only)
 *
 * @example
 * ```ts
 * const entrypoint = resolveDesktopRuntimeEntrypoint();
 * // => "/Applications/Nolo Desktop.app/Contents/Resources/app/bun/index.js"
 * ```
 */
export function resolveDesktopRuntimeEntrypoint(): string {
  const envEntrypoint = process.env.NOLO_DESKTOP_APP_ENTRY;
  if (envEntrypoint && envEntrypoint.trim()) {
    return envEntrypoint.trim();
  }

  // Fallback for development: resolve relative to this file.
  // In packaged builds, NOLO_DESKTOP_APP_ENTRY must be set.
  // This file is at packages/agent-runtime/desktopRuntimeEntrypoint.ts
  // CLI index is at packages/cli/index.ts
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "../cli/index.ts"
  );
}

/**
 * The env var name used to pass the desktop entrypoint path.
 * Exported for use in tests and documentation.
 */
export const DESKTOP_ENTRYPOINT_ENV_VAR = "NOLO_DESKTOP_APP_ENTRY";
