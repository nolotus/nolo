import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

let moduleVersion = 0;
const LOCK_RETRY_PATH = `/tmp/lock-retry-authority-${process.pid}-${Date.now()}`;
const LOCK_FASTFAIL_PATH = `/tmp/lock-fastfail-authority-${process.pid}-${Date.now()}`;

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
    const fakeStore = createFakeStore(LOCK_RETRY_PATH, (store) => {
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
    // 日志按秒聚合（抢锁间隔已降到 25ms，逐次打会刷屏），文案随之从
    // 「第 N 次尝试」改为「已尝试 N 次」；每秒至少仍有一条，信息量不变。
    expect(String(warn.mock.calls[0]?.[0])).toContain("已尝试 1 次");
  });

  it("throws the last lock error once the retry budget is exhausted", async () => {
    const fakeStore = createFakeStore(LOCK_RETRY_PATH, () => {
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
    const fakeStore = createFakeStore(LOCK_RETRY_PATH, () => {
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
    const fakeStore = createFakeStore(LOCK_RETRY_PATH, () => {
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

  it("fails fast on a stuck lock instead of burning the whole deploy window", async () => {
    // 回归：默认预算曾是 90s，会把一次失败的进程交接变成 90 秒静默重试
    // （PM2 认为进程还活着，外部探针看不到异常，部署静默失败）。
    // 默认预算必须短到能让进程快速退出并被 PM2 重启。
    const fakeStore = createFakeStore(LOCK_FASTFAIL_PATH, () => {
      throw makeLockError();
    });
    const db = await importDbWithStore(fakeStore);
    const { clock, now, sleep } = createFakeClock();
    spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    // 不传 timeoutMs：走默认预算
    await expect(
      db.ensureServerDbOpen({ intervalMs: 1_000, now, sleep })
    ).rejects.toThrow();

    expect(clock.t).toBe(8_000);
    // 报错要指向真正的原因（上一个进程没退干净），而不是只说一句打开失败
    expect(errorSpy.mock.calls.flat().join(" ")).toMatch(/LOCK|未完全退出|锁被其他进程持有/);
  });

  it("takes the retry budget from NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS", async () => {
    const previous = process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS;
    process.env.NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS = "2000";
    try {
      const fakeStore = createFakeStore(LOCK_RETRY_PATH, () => {
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
