/**
 * Re-export from the shared agent-runtime location.
 *
 * This file exists for backward compatibility only.
 * New code should import from `packages/agent-runtime/desktopRuntimeEntrypoint.ts`.
 */
export {
  resolveDesktopRuntimeEntrypoint,
  DESKTOP_ENTRYPOINT_ENV_VAR,
} from "../../../../packages/agent-runtime/desktopRuntimeEntrypoint";
