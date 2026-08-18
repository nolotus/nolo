import { afterEach, describe, expect, test } from "bun:test";

import {
  __resetBrowserCredentialBrokerMemoryForTests,
  createFileCredentialBroker,
} from "./fileCredentialBroker.browser.stub";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function installDesktopFlag(value: boolean | undefined) {
  const g = globalThis as { __NOLO_DESKTOP__?: boolean };
  if (value === undefined) {
    delete g.__NOLO_DESKTOP__;
  } else {
    g.__NOLO_DESKTOP__ = value;
  }
}

afterEach(() => {
  __resetBrowserCredentialBrokerMemoryForTests();
  installDesktopFlag(undefined);
});

describe("fileCredentialBroker.browser.stub", () => {
  test("non-desktop: put/get uses memory and never fetch", async () => {
    installDesktopFlag(false);
    let fetchCalls = 0;
    const fetchImpl = (async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    const broker = createFileCredentialBroker({ desktop: false, fetchImpl });
    await broker.put("api-key:agent-web", "sk-memory");
    expect(await broker.has("api-key:agent-web")).toBe(true);
    expect(await broker.get("api-key:agent-web")).toBe("sk-memory");

    // Survives within process via module Map
    const broker2 = createFileCredentialBroker({ desktop: false, fetchImpl });
    expect(await broker2.get("api-key:agent-web")).toBe("sk-memory");
    expect(fetchCalls).toBe(0);
  });

  test("non-desktop: secrets persist in localStorage across broker instances (survives refresh)", async () => {
    installDesktopFlag(false);
    // Inject a minimal localStorage mock (bun test env has no DOM by default)
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    };
    const g = globalThis as { localStorage?: Storage };
    g.localStorage = mockStorage;
    try {
      const fetchImpl = (async () =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch;

      const brokerA = createFileCredentialBroker({ desktop: false, fetchImpl });
      await brokerA.put("api-key:agent-persist", "sk-persisted");

      // Fresh broker instance — simulates page reload (module state rebuilt, localStorage persists)
      const brokerB = createFileCredentialBroker({ desktop: false, fetchImpl });
      expect(await brokerB.get("api-key:agent-persist")).toBe("sk-persisted");
      expect(await brokerB.has("api-key:agent-persist")).toBe(true);

      // Actually stored under the localStorage key prefix, not module Map
      expect(mockStorage.getItem("nolo.cred.api-key:agent-persist")).toBe("sk-persisted");

      await brokerB.delete("api-key:agent-persist");
      expect(mockStorage.getItem("nolo.cred.api-key:agent-persist")).toBeNull();
    } finally {
      delete g.localStorage;
    }
  });

  test("desktop: put/has/get/delete call host HTTP with correct body", async () => {
    installDesktopFlag(true);
    const calls: FetchCall[] = [];
    const store = new Map<string, string>();

    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        op: string;
        ref: string;
        secret?: string;
      };
      if (body.op === "put") {
        store.set(body.ref, body.secret ?? "");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (body.op === "has") {
        return new Response(
          JSON.stringify({ ok: true, has: store.has(body.ref) }),
          { status: 200 },
        );
      }
      if (body.op === "get") {
        return new Response(
          JSON.stringify({ ok: true, secret: store.get(body.ref) ?? null }),
          { status: 200 },
        );
      }
      if (body.op === "delete") {
        store.delete(body.ref);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false, error: "bad op" }), {
        status: 400,
      });
    }) as unknown as typeof fetch;

    const broker = createFileCredentialBroker({
      desktop: true,
      fetchImpl,
    });
    const ref = "api-key:agent-desktop";

    await broker.put(ref, "sk-host");
    expect(await broker.has(ref)).toBe(true);
    expect(await broker.get(ref)).toBe("sk-host");
    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);

    expect(calls.map((c) => c.url)).toEqual([
      "/api/desktop/credentials",
      "/api/desktop/credentials",
      "/api/desktop/credentials",
      "/api/desktop/credentials",
      "/api/desktop/credentials",
    ]);
    expect(calls.map((c) => JSON.parse(String(c.init?.body ?? "{}")))).toEqual([
      { op: "put", ref, secret: "sk-host" },
      { op: "has", ref },
      { op: "get", ref },
      { op: "delete", ref },
      { op: "has", ref },
    ]);

    // Durable store is host Map only — module memory must stay empty
    __resetBrowserCredentialBrokerMemoryForTests();
    const memoryBroker = createFileCredentialBroker({ desktop: false });
    expect(await memoryBroker.get(ref)).toBeNull();
  });

  test("desktop put rejects when host returns non-ok / 500 (failure safety)", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ ok: false, error: "disk full" }), {
        status: 500,
      })) as unknown as typeof fetch;

    const broker = createFileCredentialBroker({
      desktop: true,
      fetchImpl,
    });

    await expect(broker.put("api-key:agent-fail", "sk-must-not-strip")).rejects.toThrow(
      /disk full|failed/i,
    );
  });

  test("desktop put rejects on non-2xx even without ok:false body", async () => {
    const fetchImpl = (async () =>
      new Response("internal", { status: 500 })) as unknown as typeof fetch;

    const broker = createFileCredentialBroker({
      desktop: true,
      fetchImpl,
    });

    await expect(broker.put("api-key:agent-fail", "sk-x")).rejects.toThrow(
      /failed \(500\)/i,
    );
  });
});
