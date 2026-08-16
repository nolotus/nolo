import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";

import { MemoryDB } from "database-engine/MemoryDB";

let moduleVersion = 0;

async function loadTableSliceModule() {
  const actualRuntimeServerContext = await import("database/runtimeServerContext");
  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: (state: any) => {
      const currentServer = state.settings?.currentServer;
      const syncServers = Array.isArray(state.settings?.syncServers)
        ? state.settings.syncServers
        : [];
      return {
        currentToken: state.auth?.currentToken,
        currentServer,
        syncServers,
        remoteServers: [currentServer, ...syncServers].filter(Boolean),
      };
    },
  }));
  const module = await import(`./tableSlice`);
  mock.restore();
  return module;
}

function expectFulfilled(action: any) {
  expect(action.type).toEndWith("/fulfilled");
}

function createStore(
  db: MemoryDB,
  tableReducer: any,
  preloadedState?: Record<string, unknown>
) {
  return configureStore({
    reducer: {
      table: tableReducer,
      auth: (
        state = {
          currentToken: "token-123",
        }
      ) => state,
      settings: (
        state = {
          currentServer: "https://alpha.example",
        }
      ) => state,
    } as any,
    middleware: ((getDefaultMiddleware: any) =>
      getDefaultMiddleware({
        serializableCheck: false,
        thunk: {
          extraArgument: {
            db,
            tokenManager: null,
          },
        },
      })) as any,
    preloadedState,
  } as any);
}

describe("tableSlice loadTableRows", () => {
  let db: MemoryDB;
  let fetchMock: ReturnType<typeof mock>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mock.restore();
    db = new MemoryDB();
    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    mock.restore();
    globalThis.fetch = originalFetch;
  });

  it("requests rows from the current server and caches missing local rows", async () => {
    const serverRow = {
      dbKey: "row-tenant-1-table-1-row-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "server",
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [serverRow],
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer);
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://alpha.example/rpc/listTableRows"
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      }),
      body: JSON.stringify({
        tenantId: "tenant-1",
        tableId: "table-1",
        includeDeleted: true,
        envelope: "table-sync-v1",
      }),
    });

    await expect(db.get(serverRow.dbKey)).resolves.toEqual(serverRow);
  });

  it("does not overwrite a newer local row with an older server snapshot", async () => {
    const dbKey = "row-tenant-1-table-1-row-2";
    const localRow = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T17:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "local-newer",
    };
    const serverRow = {
      ...localRow,
      updatedAt: "2026-03-11T16:00:00.000Z",
      value: "server-older",
    };

    await db.put(dbKey, localRow);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [serverRow],
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer);
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    await expect(db.get(dbKey)).resolves.toEqual(localRow);
  });

  it("overwrites a stale local row when the server row is newer", async () => {
    const dbKey = "row-tenant-1-table-1-row-3";
    const localRow = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "local-older",
    };
    const serverRow = {
      ...localRow,
      updatedAt: "2026-03-11T18:00:00.000Z",
      value: "server-newer",
    };

    await db.put(dbKey, localRow);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [serverRow],
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer);
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    await expect(db.get(dbKey)).resolves.toEqual(serverRow);
  });

  it("filters deleted tombstone rows from visible results while still caching them locally", async () => {
    const activeRow = {
      dbKey: "row-tenant-1-table-1-row-4",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T19:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "active",
    };
    const deletedRow = {
      dbKey: "row-tenant-1-table-1-row-5",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T20:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      deletedAt: "2026-03-11T20:00:00.000Z",
      value: "deleted",
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [activeRow, deletedRow],
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer);
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([activeRow]);
    await expect(db.get(activeRow.dbKey)).resolves.toEqual(activeRow);
    await expect(db.get(deletedRow.dbKey)).resolves.toEqual(deletedRow);
  });

  it("clears stale local rows when every remote returns a complete empty table snapshot", async () => {
    const staleRow = {
      dbKey: "row-tenant-1-table-1-stale",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "stale-local",
    };
    await db.put(staleRow.dbKey, staleRow);

    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toMatchObject({
        tenantId: "tenant-1",
        tableId: "table-1",
        includeDeleted: true,
        envelope: "table-sync-v1",
      });
      if (
        url === "https://alpha.example/rpc/listTableRows" ||
        url === "https://main.example/rpc/listTableRows"
      ) {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            tableMeta: {
              dbKey: "meta-tenant-1-table-1",
              tenantId: "tenant-1",
              tableId: "table-1",
              type: "table",
            },
            rows: [],
            deletedRows: [],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([]);
    await expect(db.get(staleRow.dbKey)).rejects.toThrow();
  });

  it("keeps local rows when any remote snapshot fails because absence is not authoritative", async () => {
    const localRow = {
      dbKey: "row-tenant-1-table-1-local",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "local",
    };
    await db.put(localRow.dbKey, localRow);

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            rows: [],
            deletedRows: [],
          }),
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return { ok: false, status: 503, json: async () => ({ message: "down" }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([localRow]);
    await expect(db.get(localRow.dbKey)).resolves.toEqual(localRow);
  });

  it("hides all rows when a complete remote snapshot says the table meta is deleted", async () => {
    const localRow = {
      dbKey: "row-tenant-1-table-1-local-visible-before-meta-delete",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "local",
    };
    await db.put(localRow.dbKey, localRow);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        complete: true,
        includeDeleted: true,
        tableMeta: {
          dbKey: "meta-tenant-1-table-1",
          tenantId: "tenant-1",
          tableId: "table-1",
          type: "table",
          deletedAt: "2026-03-11T20:00:00.000Z",
          updatedAt: "2026-03-11T20:00:00.000Z",
        },
        rows: [localRow],
        deletedRows: [],
      }),
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer);
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([]);
  });

  it("uses the newest table meta across servers instead of treating any stale deleted meta as authoritative", async () => {
    const liveRow = {
      dbKey: "row-tenant-1-table-1-row-from-newer-live-meta",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T18:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "visible",
    };

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            tableMeta: {
              dbKey: "meta-tenant-1-table-1",
              tenantId: "tenant-1",
              tableId: "table-1",
              type: "table",
              deletedAt: "2026-03-11T17:00:00.000Z",
              updatedAt: "2026-03-11T17:00:00.000Z",
            },
            rows: [],
            deletedRows: [],
          }),
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            tableMeta: {
              dbKey: "meta-tenant-1-table-1",
              tenantId: "tenant-1",
              tableId: "table-1",
              type: "table",
              updatedAt: "2026-03-11T19:00:00.000Z",
            },
            rows: [liveRow],
            deletedRows: [],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([liveRow]);
  });

  it("does not let a partial remote table meta tombstone hide local rows", async () => {
    const localRow = {
      dbKey: "row-tenant-1-table-1-local-when-main-fails",
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T18:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "local",
    };
    await db.put(localRow.dbKey, localRow);

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            tableMeta: {
              dbKey: "meta-tenant-1-table-1",
              tenantId: "tenant-1",
              tableId: "table-1",
              type: "table",
              deletedAt: "2026-03-11T20:00:00.000Z",
              updatedAt: "2026-03-11T20:00:00.000Z",
            },
            rows: [],
            deletedRows: [],
          }),
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return { ok: false, status: 503, json: async () => ({ message: "down" }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([localRow]);
    await expect(db.get(localRow.dbKey)).resolves.toEqual(localRow);
  });

  it("does not let a partial remote row tombstone overwrite a local live row", async () => {
    const dbKey = "row-tenant-1-table-1-live-vs-partial-tombstone";
    const localRow = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T18:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      type: "table_row",
      value: "local-live",
    };
    const remoteTombstone = {
      ...localRow,
      updatedAt: "2026-03-11T20:00:00.000Z",
      deletedAt: "2026-03-11T20:00:00.000Z",
      value: "deleted-on-alpha",
    };
    await db.put(dbKey, localRow);

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            rows: [],
            deletedRows: [remoteTombstone],
          }),
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return { ok: false, status: 503, json: async () => ({ message: "down" }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([localRow]);
    await expect(db.get(dbKey)).resolves.toEqual(localRow);
  });

  it("does not let a partial remote live row resurrect a local tombstone", async () => {
    const dbKey = "row-tenant-1-table-1-tombstone-vs-partial-live";
    const localTombstone = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T18:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      deletedAt: "2026-03-11T18:00:00.000Z",
      type: "table_row",
      value: "local-deleted",
    };
    const remoteLive = {
      ...localTombstone,
      updatedAt: "2026-03-11T20:00:00.000Z",
      deletedAt: undefined,
      value: "live-on-alpha",
    };
    await db.put(dbKey, localTombstone);

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            complete: true,
            includeDeleted: true,
            rows: [remoteLive],
            deletedRows: [],
          }),
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return { ok: false, status: 503, json: async () => ({ message: "down" }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([]);
    await expect(db.get(dbKey)).resolves.toEqual(localTombstone);
  });

  it("merges local and multi-server rows, picking the newest version per dbKey", async () => {
    const dbKey = "row-tenant-1-table-1-row-7";
    const localRow = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T16:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "local",
    };
    const alphaRow = {
      ...localRow,
      updatedAt: "2026-03-11T17:00:00.000Z",
      value: "alpha",
    };
    const mainRow = {
      ...localRow,
      updatedAt: "2026-03-11T18:00:00.000Z",
      value: "main-newest",
    };

    await db.put(dbKey, localRow);
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => [alphaRow],
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => [mainRow],
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(action.payload).toEqual([mainRow]);
    await expect(db.get(dbKey)).resolves.toEqual(mainRow);
  });

  it("lets a newer remote tombstone hide an older active row from another source", async () => {
    const dbKey = "row-tenant-1-table-1-row-8";
    const alphaRow = {
      dbKey,
      tenantId: "tenant-1",
      tableId: "table-1",
      updatedAt: "2026-03-11T17:00:00.000Z",
      createdAt: "2026-03-11T15:00:00.000Z",
      value: "active-on-alpha",
    };
    const mainDeletedRow = {
      ...alphaRow,
      updatedAt: "2026-03-11T18:00:00.000Z",
      deletedAt: "2026-03-11T18:00:00.000Z",
      value: "deleted-on-main",
    };

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://alpha.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => [alphaRow],
        };
      }
      if (url === "https://main.example/rpc/listTableRows") {
        return {
          ok: true,
          json: async () => [mainDeletedRow],
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { default: tableReducer, loadTableRows } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      settings: {
        currentServer: "https://alpha.example",
        syncServers: ["https://main.example"],
      },
    });
    const action = await store.dispatch(
      loadTableRows({ tenantId: "tenant-1", tableId: "table-1" }) as any
    );

    expectFulfilled(action);
    expect(action.payload).toEqual([]);
    await expect(db.get(dbKey)).resolves.toEqual(mainDeletedRow);
  });

  it("soft-deletes a row by writing a tombstone so the deletion can sync", async () => {
    const row = {
      dbKey: "row-tenant-1-table-1-row-6",
      tenantId: "tenant-1",
      tableId: "table-1",
      rowId: "row-6",
      createdAt: "2026-03-11T15:00:00.000Z",
      updatedAt: "2026-03-11T16:00:00.000Z",
      type: "table_row",
      value: "to-delete",
    };

    const { default: tableReducer, deleteRow } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      table: {
        currentTable: {
          dbKey: "meta-tenant-1-table-1",
          tenantId: "tenant-1",
          tableId: "table-1",
          columns: [],
          createdAt: "2026-03-11T15:00:00.000Z",
          updatedAt: "2026-03-11T16:00:00.000Z",
          type: "table",
        },
        isLoading: false,
        isInitialized: true,
        error: null,
        rows: [row],
      },
    });

    const action = await store.dispatch(deleteRow(row.dbKey) as any);

    expect(action.type).toEndWith("/fulfilled");

    const persisted = await db.get(row.dbKey);
    expect(persisted).toMatchObject({
      dbKey: row.dbKey,
      rowId: row.rowId,
      type: "table_row",
      value: "to-delete",
    });
    expect(typeof (persisted as any).deletedAt).toBe("string");
    expect(typeof (persisted as any).updatedAt).toBe("string");
    expect(store.getState().table.rows).toEqual([]);
  });
});

describe("tableSlice updateTableIcon", () => {
  let db: MemoryDB;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mock.restore();
    db = new MemoryDB();
    globalThis.fetch = mock(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
  });

  afterEach(() => {
    mock.restore();
    globalThis.fetch = originalFetch;
  });

  it("patches the current table meta icon without touching rows", async () => {
    const tableMeta = {
      dbKey: "meta-tenant-1-table-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      displayName: "Roadmap",
      columns: [],
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z",
      type: "table",
    };
    await db.put(tableMeta.dbKey, tableMeta);

    const { default: tableReducer, updateTableIcon } = await loadTableSliceModule();
    const store = createStore(db, tableReducer, {
      table: {
        currentTable: tableMeta,
        isLoading: false,
        isInitialized: true,
        error: null,
        rows: [],
        focusContext: null,
      },
    });

    const action = await store.dispatch(
      updateTableIcon({
        tenantId: "tenant-1",
        tableId: "table-1",
        icon: { kind: "emoji", value: "📊" },
      }) as any
    );

    expectFulfilled(action);
    await expect(db.get(tableMeta.dbKey)).resolves.toMatchObject({
      icon: { kind: "emoji", value: "📊" },
      displayName: "Roadmap",
    });
    expect((store.getState() as any).table.currentTable.icon).toEqual({
      kind: "emoji",
      value: "📊",
    });
  });
});
