import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

let moduleVersion = 0;

type FakeAuthorityStore = {
  location: string;
  status: string;
  openCalls: number;
  open: () => Promise<void>;
  close: () => Promise<void>;
};

function createFakeStore(
  location: string,
  onOpen: (store: FakeAuthorityStore) => void
): FakeAuthorityStore {
  const store: FakeAuthorityStore = {
    location,
    status: "closed",
    openCalls: 0,
    async open() {
      store.openCalls += 1;
      onOpen(store);
    },
    async close() {
      store.status = "closed";
    },
  };
  return store;
}

function makeLockError() {
  const err = new Error(
    "IO error: lock /tmp/lock-retry-authority/LOCK: Resource temporarily unavailable"
  ) as Error & { code?: string };
  err.code = "LEVEL_LOCKED";
  return err;
}

function makeIoError() {
  const err = new Error("EIO: i/o error, open failed") as Error & {
    code?: string;
  };
  err.code = "EIO";
  return err;
}

function createFakeClock() {
  const clock = { t: 0 };
  return {
    clock,
    now: () => clock.t,
    sleep: (ms: number) => {
      clock.t += ms;
      return Promise.resolve();
    },
  };
}

async function importDbWithStore(fakeStore: FakeAuthorityStore) {
  const fakeLegacyDb = {
    location: fakeStore.location,
    get status() {
      return fakeStore.status;
    },
    open: () => fakeStore.open(),
    close: () => fakeStore.close(),
  };
  mock.module("./serverStoreFactory", () => ({
    getOrCreateServerStoreRuntime: () => ({
      authorityStore: fakeStore,
      serverDb: fakeLegacyDb,
    }),
  }));
  mock.module("./dbPath", () => ({
    resolveServerDbPath: () => fakeStore.location,
  }));
  return import(`./db.ts?test=${moduleVersion++}`);
}

describe("database server db module", () => {
  beforeEach(() => {
    delete (globalThis as any).__serverAuthorityStore;
    delete (globalThis as any).__serverDb;
  });

  afterEach(() => {
    delete (globalThis as any).__serverAuthorityStore;
    delete (globalThis as any).__serverDb;
    mock.restore();
  });

  it("creates one shared authority store and one shared legacy facade", async () => {
    const fakeStore = {
      location: "/tmp/shared-authority",
      status: "closed",
      openCalls: 0,
      closeCalls: 0,
      async open() {
        this.openCalls += 1;
        this.status = "open";
      },
      async close() {
        this.closeCalls += 1;
        this.status = "closed";
      },
    };

    const fakeLegacyDb = {
      location: "/tmp/shared-authority",
      get status() {
        return fakeStore.status;
      },
      open: () => fakeStore.open(),
      close: () => fakeStore.close(),
      get: async () => null,
      put: async () => {},
      del: async () => {},
      batch: () => ({
        put: () => {},
        del: () => {},
        write: async () => {},
      }),
      iterator: async function* () {},
    };

    const runtime = {
      authorityStore: fakeStore,
      serverDb: fakeLegacyDb,
    };
    const getOrCreateServerStoreRuntime = mock(() => runtime);

    mock.module("./serverStoreFactory", () => ({ getOrCreateServerStoreRuntime }));
    mock.module("./dbPath", () => ({
      resolveServerDbPath: () => "/tmp/shared-authority",
    }));

    const first = await import(`./db.ts?test=${moduleVersion++}`);
    const second = await import(`./db.ts?test=${moduleVersion++}`);

    expect(getOrCreateServerStoreRuntime).toHaveBeenCalledTimes(2);
    expect(getOrCreateServerStoreRuntime).toHaveBeenCalledWith("/tmp/shared-authority");
    expect(first.default).toBe(second.default);
    expect(first.getServerAuthorityStore()).toBe(fakeStore);

    await first.ensureServerDbOpen();
    expect(fakeStore.openCalls).toBe(1);
    expect(fakeStore.status).toBe("open");

    await first.closeServerDb();
    expect(fakeStore.closeCalls).toBe(1);
    expect(fakeStore.status).toBe("closed");
  });

  it("retries lock errors until the store opens within the deadline", async () => {
    const fakeStore = createFakeStore("/tmp/lock-retry-authority", (store) => {
      if (store.openCalls <= 3) throw makeLockError();
      store.status = "open";
    });
    const db = await importDbWithStore(fakeStore);
    const { clock, now, sleep } = createFakeClock();
    const warn = spyOn(console, "warn").mockImplementation(() => {});

    await db.ensureServerDbOpen({
      timeoutMs: 90_000,
      intervalMs: 1_000,
      now,
      sleep,
    });

    expect(fakeStore.openCalls).toBe(4);
    expect(fakeStore.status).toBe("open");
    expect(clock.t).toBe(3_000);
    expect(warn).toHaveBeenCalledTimes(3);
    expect(String(warn.mock.calls[0]?.[0])).toContain("第 1 次尝试");
  });

  it("throws the last lock error once the retry budget is exhausted", async () => {
    const fakeStore = createFakeStore("/tmp/lock-retry-authority", () => {
      throw makeLockError();
    });
    const db = await importDbWithStore(fakeStore);
    const { clock, now, sleep } = createFakeClock();
    spyOn(console, "warn").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});

    await expect(
      db.ensureServerDbOpen({
        timeoutMs: 3_000,
        intervalMs: 1_000,
        now,
        sleep,
      })
    ).rejects.toThrow(/Resource temporarily unavailable/);

    // t=0/1000/2000/3000 各尝试一次，共 floor(timeout/interval)+1 次
    expect(fakeStore.openCalls).toBe(4);
    expect(clock.t).toBe(3_000);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("quiet 模式下重试与失败都不打日志（CLI 只读兜底用）", async () => {
    // CLI/TUI 抢不到锁是预期内的（dev server 常驻持锁），逐秒 warn 会刷屏；
    // 调用方会退回更有用的 HTTP 错误，所以这条路径必须静默。
    const fakeStore = createFakeStore("/tmp/lock-retry-authority", () => {
      throw makeLockError();
    });
    const db = await importDbWithStore(fakeStore);
    const { now, sleep } = createFakeClock();
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});

    await expect(
      db.ensureServerDbOpen({
        timeoutMs: 3_000,
        intervalMs: 1_000,
        now,
        sleep,
        quiet: true,
      })
    ).rejects.toThrow(/Resource temporarily unavailable/);

    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("rethrows non-lock errors immediately without retrying", async () => {
    const fakeStore = createFakeStore("/tmp/lock-retry-authority", () => {
      throw makeIoError();
    });
    const db = await importDbWithStore(fakeStore);
    const { clock, now, sleep } = createFakeClock();
    spyOn(console, "error").mockImplementation(() => {});

    await expect(
      db.ensureServerDbOpen({
        timeoutMs: 90_000,
        intervalMs: 1_000,
        now,
        sleep,
      })
    ).rejects.toThrow(/EIO/);

    expect(fakeStore.openCalls).toBe(1);
    expect(clock.t).toBe(0);
  });

  it("takes the retry budget from NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS", async () => {
    const previous = process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS;
    process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS = "2000";
    try {
      const fakeStore = createFakeStore("/tmp/lock-retry-authority", () => {
        throw makeLockError();
      });
      const db = await importDbWithStore(fakeStore);
      const { now, sleep } = createFakeClock();
      spyOn(console, "warn").mockImplementation(() => {});
      spyOn(console, "error").mockImplementation(() => {});

      await expect(
        db.ensureServerDbOpen({ intervalMs: 1_000, now, sleep })
      ).rejects.toThrow(/Resource temporarily unavailable/);

      // 预算 2000ms / 间隔 1000ms：t=0/1000/2000 共 3 次尝试
      expect(fakeStore.openCalls).toBe(3);
    } finally {
      if (previous === undefined) {
        delete process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS;
      } else {
        process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS = previous;
      }
    }
  });
});
