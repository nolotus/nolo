/**
 * Test-only: call-level stand-ins that keep `startTuiWorkspace` suites off the
 * outside world, without touching production code or process env.
 *
 * The submit path awaits memory recall, work-context reads and shared storage
 * before calling the injected agentRunner. An unresponsive broker reproduced
 * the missing agentRunner call seen in Alpha CI; why CI's broker was slow is
 * unconfirmed. These wiring tests do not validate broker or store semantics.
 *
 * These are the same seams `tuiTurnRunner.test.ts` already uses (`spyOn` on the
 * module export reaches the importer's live binding), applied one level lower so
 * the suites still drive the real workspace, decoder, attachment and queue entry
 * points — only the external I/O is replaced. Bun's `spyOn` mutates the module
 * namespace for the whole process, so callers MUST restore (see `afterAll`).
 */
import { spyOn } from "bun:test";

import type { HybridRecordStore } from "../../agent-runtime/hybridRecordStore";
import * as localRuntimeDialog from "../client/localRuntimeDialog";
import * as memoryRecall from "../memoryRecall";

/** In-memory `HybridRecordStore`: no broker, no LevelDB, no remote fallback. */
export function createInMemoryRecordStore(): HybridRecordStore {
  const records = new Map<string, any>();
  const iterate = async function* (
    options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number },
  ): AsyncGenerator<[string, any]> {
    let entries = [...records.entries()].filter(([key]) =>
      key >= options.gte &&
      (options.lte === undefined || key <= options.lte) &&
      (options.lt === undefined || key < options.lt));
    entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    if (options.reverse) entries.reverse();
    if (options.limit !== undefined) entries = entries.slice(0, options.limit);
    for (const entry of entries) yield entry;
  };
  return {
    read: async (dbKey) => records.get(dbKey) ?? null,
    write: async (dbKey, record) => {
      records.set(dbKey, record);
      return record;
    },
    batch: async (ops) => {
      for (const op of ops) records.set(op.key, op.value);
    },
    iterator: (options) => iterate(options),
  };
}

/**
 * Replace the three external I/O entry points with local no-ops. Returns the
 * restore function; call it from `afterAll` so a later file in the same process
 * never inherits the stubs.
 */
export function installHermeticWorkspaceIo(): () => void {
  const store = createInMemoryRecordStore();
  const restore: Array<() => void> = [];
  const restoreAll = () => {
    while (restore.length) restore.pop()!();
  };
  try {
    const memory = spyOn(memoryRecall, "resolveCliMemory");
    restore.push(() => memory.mockRestore());
    memory.mockResolvedValue(null);
    const work = spyOn(memoryRecall, "resolveCliWorkContext");
    restore.push(() => work.mockRestore());
    work.mockResolvedValue(null);
    const shared = spyOn(localRuntimeDialog, "getOrCreateSharedStore");
    restore.push(() => shared.mockRestore());
    shared.mockResolvedValue(store);
  } catch (error) {
    restoreAll();
    throw error;
  }
  return restoreAll;
}
