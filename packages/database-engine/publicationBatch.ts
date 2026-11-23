import { Mutex } from "async-mutex";
import { dialogRunIndexOps } from "./activeDialogRunIndex";
import type { AuthorityBatchOperation, AuthorityStore } from "./authorityStoreTypes";

/** Serialize the publication read + batch with all writes to this local authority store. */
export function withPublicationBatch(store: AuthorityStore): AuthorityStore {
  const lock = new Mutex();
  const batchWrite = (ops: AuthorityBatchOperation[]) =>
    store.batchWrite(ops.flatMap((op) => [op, ...dialogRunIndexOps(op)]));
  const put = (key: string, value: unknown) => {
    const op = { type: "put", key, value } as const;
    const indexOps = dialogRunIndexOps(op);
    return indexOps.length ? store.batchWrite([op, ...indexOps]) : store.put(key, value);
  };
  const del = (key: string) => {
    const op = { type: "del", key } as const;
    const indexOps = dialogRunIndexOps(op);
    return indexOps.length ? store.batchWrite([op, ...indexOps]) : store.del(key);
  };
  const wrapped: AuthorityStore = {
    get location() { return store.location; },
    get status() { return store.status; },
    open: () => store.open(),
    close: () => lock.runExclusive(() => store.close()),
    get: ((key: string) => store.get(key)) as AuthorityStore["get"],
    iterator: (options) => store.iterator(options),
    put: (key, value) => lock.runExclusive(() => put(key, value)),
    del: (key) => lock.runExclusive(() => del(key)),
    batchWrite: (ops) => lock.runExclusive(() => batchWrite(ops)),
    createBatch: () => {
      const batch = store.createBatch();
      const stage = (op: AuthorityBatchOperation) => {
        for (const entry of [op, ...dialogRunIndexOps(op)]) {
          if (entry.type === "put") batch.put(entry.key, entry.value);
          else batch.del(entry.key);
        }
      };
      return {
        put: (key, value) => stage({ type: "put", key, value }),
        del: (key) => stage({ type: "del", key }),
        write: () => lock.runExclusive(() => batch.write()),
      };
    },
    runPublicationBatch: (task) => lock.runExclusive(() => task({ get: wrapped.get, batchWrite })),
  };
  return wrapped;
}
