import type {
  AuthorityBatchOperation,
  AuthorityStore,
} from "./authorityStoreTypes";

type BatchWriterLike = {
  put(key: string, value: unknown): void;
  del(key: string): void;
  write(): Promise<void>;
};

type LevelLikeForTests = {
  readonly location?: string;
  readonly status?: string;
  open?(): Promise<void>;
  close?(): Promise<void>;
  get(key: string): Promise<any>;
  get<T>(key: string): Promise<T>;
  put(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  batch(ops: AuthorityBatchOperation[]): Promise<void>;
  batch(): BatchWriterLike;
  iterator(
    options?: {
      gte?: string;
      lte?: string;
      lt?: string;
      reverse?: boolean;
    }
  ): AsyncIterableIterator<[string, unknown]>;
};

export function createTestAuthorityStore(levelDb: LevelLikeForTests): AuthorityStore {
  const writeBatchOps = async (ops: AuthorityBatchOperation[]) => {
    const result = levelDb.batch(ops);
    if (result && typeof (result as any).then === "function") {
      await result;
      return;
    }
    if (result && typeof (result as any).write === "function") {
      for (const op of ops) {
        if (op.type === "put") {
          (result as unknown as BatchWriterLike).put(op.key, op.value);
        } else {
          (result as unknown as BatchWriterLike).del(op.key);
        }
      }
      await (result as unknown as BatchWriterLike).write();
      return;
    }
    throw new Error("Test authority backing does not support batch writes");
  };

  return {
    get location() {
      return levelDb.location;
    },
    get status() {
      return levelDb.status;
    },
    async open() {
      await levelDb.open?.();
    },
    async close() {
      await levelDb.close?.();
    },
    async get(key: string): Promise<any> {
      return levelDb.get(key);
    },
    async put(key: string, value: unknown) {
      await levelDb.put(key, value);
    },
    async del(key: string) {
      await levelDb.del(key);
    },
    async batchWrite(ops: AuthorityBatchOperation[]) {
      await writeBatchOps(ops);
    },
    createBatch() {
      const batch = levelDb.batch();
      return {
        put(key: string, value: unknown) {
          batch.put(key, value);
        },
        del(key: string) {
          batch.del(key);
        },
        async write() {
          await batch.write();
        },
      };
    },
    iterator(options = {}) {
      return levelDb.iterator(options);
    },
  };
}
