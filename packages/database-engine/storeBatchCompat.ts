import type {
  AuthorityBatchOperation,
  AuthorityBatchWriter,
} from "./authorityStoreTypes";

type BatchArrayStoreLike = {
  batchWrite?(ops: AuthorityBatchOperation[]): Promise<void>;
  batch?(ops: AuthorityBatchOperation[]): Promise<void>;
};

type BatchBuilderStoreLike = {
  createBatch?(): AuthorityBatchWriter;
  batch?(): AuthorityBatchWriter;
};

export function writeStoreOps(
  store: BatchArrayStoreLike & BatchBuilderStoreLike,
  ops: AuthorityBatchOperation[]
): Promise<void> {
  if (typeof store.batchWrite === "function") {
    return store.batchWrite(ops);
  }
  if (typeof store.batch === "function") {
    const result = store.batch(ops);
    if (result && typeof (result as any).then === "function") {
      return result as Promise<void>;
    }
    if (result && typeof (result as any).write === "function") {
      for (const op of ops) {
        if (op.type === "put") {
          (result as unknown as AuthorityBatchWriter).put(op.key, op.value);
        } else {
          (result as unknown as AuthorityBatchWriter).del(op.key);
        }
      }
      return (result as unknown as AuthorityBatchWriter).write();
    }
  }
  throw new Error("Store does not support batch array writes");
}

export function createStoreBatch(store: BatchBuilderStoreLike): AuthorityBatchWriter {
  if (typeof store.createBatch === "function") {
    return store.createBatch();
  }
  if (typeof store.batch === "function") {
    return store.batch();
  }
  throw new Error("Store does not support batch builder writes");
}
