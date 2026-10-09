import { createServerOwnedToolProjection } from "./serverOwnedToolProjection";

/**
 * Compatibility wrapper for the first durable interactive tool slice.
 * ask_user stays read-only until canonical server persistence so the browser
 * never writes a resolution against a transient dbKey.
 */
export function createServerOwnedAskUserProjection(args: {
  dialogId: string;
  dispatch: (action: any) => any;
  messageMetadata: Record<string, unknown>;
}) {
  return createServerOwnedToolProjection({
    ...args,
    supportedToolNames: ["ask_user"],
    keepReadOnlyUntilCanonical: ["ask_user"],
  });
}
