import { Mutex } from "async-mutex";
import type { AuthorityStore } from "./authorityStoreTypes";

/** Serialize the publication read + batch with all writes to this local authority store. */
export function withPublicationBatch(store: AuthorityStore): AuthorityStore {
  const lock = new Mutex();
  const wrapped: AuthorityStore = {
    get location() { return store.location; },
    get status() { return store.status; },
    open: () => store.open(),
    close: () => lock.runExclusive(() => store.close()),
    get: ((key: string) => store.get(key)) as AuthorityStore["get"],
    iterator: (options) => store.iterator(options),
    put: (key, value) => lock.runExclusive(() => store.put(key, value)),
    del: (key) => lock.runExclusive(() => store.del(key)),
    batchWrite: (ops) => lock.runExclusive(() => store.batchWrite(ops)),
    createBatch: () => {
      const batch = store.createBatch();
      return {
        put: (key, value) => batch.put(key, value),
        del: (key) => batch.del(key),
        write: () => lock.runExclusive(() => batch.write()),
      };
    },
    runPublicationBatch: (task) => lock.runExclusive(() => task(store)),
  };
  return wrapped;
}
