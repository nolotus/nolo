import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

const loadModule = async () => {
  const fakeStore = {
    location: "/tmp/factory-authority",
    status: "closed",
    async open() {},
    async close() {},
  };

  const levelCtor = mock(function FakeLevel(this: any, path: string) {
    this.location = path;
    this.status = "closed";
    this.open = async () => {};
    this.close = async () => {};
    this.get = async () => null;
    this.put = async () => {};
    this.del = async () => {};
    this.batch = () => ({
      put: () => {},
      del: () => {},
      write: async () => {},
    });
    this.iterator = async function* () {};
  });
  const createLevelAuthorityStore = mock(() => fakeStore);
  const createLegacyServerDb = mock((store: any) => ({
    get location() {
      return store.location;
    },
    get status() {
      return store.status;
    },
    get: async () => null,
    put: async () => {},
    del: async () => {},
    batch: () => ({
      put: () => {},
      del: () => {},
      write: async () => {},
    }),
    iterator: async function* () {},
  }));

  mock.module("level", () => ({ Level: levelCtor }));
  mock.module("./levelAuthorityStore", () => ({ createLevelAuthorityStore }));
  mock.module("./legacyServerDb", () => ({ createLegacyServerDb }));

  const module = await import(`./serverStoreFactory.ts`);
  return {
    ...module,
    levelCtor,
    createLevelAuthorityStore,
    createLegacyServerDb,
  };
};

describe("serverStoreFactory", () => {
  afterEach(() => {
    mock.restore();
  });

  it("defaults to the level driver when no authority driver env is set", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    const runtime = getOrCreateServerStoreRuntime("/tmp/factory-default", {
      env: {},
      globalScope: {},
    });

    expect(runtime.authorityStore.location).toBe("/tmp/factory-authority");
    expect(createLevelAuthorityStore).toHaveBeenCalledTimes(1);
    expect(createLegacyServerDb).toHaveBeenCalledTimes(1);
  });

  it("accepts an explicit level authority driver", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    const runtime = getOrCreateServerStoreRuntime("/tmp/factory-level", {
      env: {
        NOLO_SERVER_AUTHORITY_DRIVER: "level",
      },
      globalScope: {},
    });

    expect(runtime.serverDb.location).toBe("/tmp/factory-authority");
    expect(createLevelAuthorityStore).toHaveBeenCalledTimes(1);
    expect(createLegacyServerDb).toHaveBeenCalledTimes(1);
  });

  it("accepts an explicit memory authority driver", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    const runtime = getOrCreateServerStoreRuntime("/tmp/factory-memory", {
      env: {
        NOLO_SERVER_AUTHORITY_DRIVER: "memory",
      },
      globalScope: {},
    });

    expect(runtime.authorityStore.location).toBe("/tmp/factory-memory");
    expect(runtime.serverDb.location).toBe("/tmp/factory-memory");
    expect(createLevelAuthorityStore).not.toHaveBeenCalled();
    expect(createLegacyServerDb).toHaveBeenCalledTimes(1);
  });

  it("rejects a remote authority driver because only embedded drivers are supported", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    expect(() =>
      getOrCreateServerStoreRuntime("/tmp/factory-remote", {
        env: {
          NOLO_SERVER_AUTHORITY_DRIVER: "remote",
        } as any,
        globalScope: {},
      })
    ).toThrow(/Unsupported server authority store driver/i);
    expect(createLevelAuthorityStore).not.toHaveBeenCalled();
    expect(createLegacyServerDb).not.toHaveBeenCalled();
  });

  it("rejects unknown authority drivers before constructing a store", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    expect(() =>
      getOrCreateServerStoreRuntime("/tmp/factory-unknown", {
        env: {
          NOLO_SERVER_AUTHORITY_DRIVER: "worker",
        },
        globalScope: {},
      })
    ).toThrow(/Unsupported server authority store driver/i);
    expect(createLevelAuthorityStore).not.toHaveBeenCalled();
    expect(createLegacyServerDb).not.toHaveBeenCalled();
  });

  it("fails closed when a cached authority store was initialized with a different driver", async () => {
    const {
      getOrCreateServerStoreRuntime,
      createLevelAuthorityStore,
      createLegacyServerDb,
    } = await loadModule();

    const cachedStore = {
      location: "/tmp/cached-authority",
      status: "open",
      async open() {},
      async close() {},
    };
    const cachedDb = {
      location: "/tmp/cached-authority",
      get status() {
        return cachedStore.status;
      },
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
    const globalScope = {
      __serverAuthorityStore: cachedStore,
      __serverDb: cachedDb,
      __serverAuthorityStoreDriver: "memory",
    };

    expect(() =>
      getOrCreateServerStoreRuntime("/tmp/factory-mismatch", {
        driver: "level",
        globalScope,
      })
    ).toThrow(/already initialized with driver/i);
    expect(createLevelAuthorityStore).not.toHaveBeenCalled();
    expect(createLegacyServerDb).not.toHaveBeenCalled();
  });
});
