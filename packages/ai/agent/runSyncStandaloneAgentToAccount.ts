/**
 * Production UI adapter: explicit Agent → account snapshot via Redux db.read/write.
 * Platform-neutral (Web/Desktop/RN). Never auto-invoked from login/onboarding;
 * callers must be user-confirmed.
 */
import { read, write } from "database/dbSlice";
import {
  syncStandaloneAgentToAccount,
  type SyncStandaloneAgentToAccountInput,
  type SyncStandaloneAgentToAccountResult,
} from "database/sync/syncStandaloneAgentToAccount";

type UnwrapDispatch = {
  (action: unknown): { unwrap: () => Promise<unknown> };
};

export type RunSyncStandaloneAgentToAccountInput = Pick<
  SyncStandaloneAgentToAccountInput,
  "accountUserId" | "localAgentKey" | "includeDialogs" | "signal"
>;

/**
 * Wires authoritative client DB read + account writeAction path for explicit sync.
 * Does not introduce fetch endpoints or a shadow store.
 */
export async function runSyncStandaloneAgentToAccount(
  input: RunSyncStandaloneAgentToAccountInput,
  dispatch: UnwrapDispatch
): Promise<SyncStandaloneAgentToAccountResult> {
  return syncStandaloneAgentToAccount(input, {
    readRecord: async (dbKey) => {
      try {
        const result = await dispatch(read({ dbKey })).unwrap();
        if (result && typeof result === "object") {
          return result as Record<string, unknown>;
        }
        return null;
      } catch {
        return null;
      }
    },
    writeRecord: async ({ data, customKey, userId }) => {
      const written = await dispatch(
        write({ data, customKey, userId })
      ).unwrap();
      if (written && typeof written === "object") {
        return written as Record<string, unknown>;
      }
      return { ...data, dbKey: customKey, userId };
    },
  });
}
