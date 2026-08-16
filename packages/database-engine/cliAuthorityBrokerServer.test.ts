import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createCliAuthorityBrokerClient,
} from "./cliAuthorityBrokerClient";
import {
  getOrCreateCliAuthorityBrokerServer,
  type CliAuthorityBrokerServerHandle,
} from "./cliAuthorityBrokerServer";
import type {
  AuthorityBatchOperation,
  AuthorityBatchWriter,
  AuthorityIteratorOptions,
  AuthorityStore,
} from "./authorityStoreTypes";
import { MemoryDB } from "./MemoryDB";

function createMemoryAuthorityStore(label: string): AuthorityStore {
  const db = new MemoryDB();
  let status = "closed";
  return {
    get location() {
      return label;
    },
    get status() {
      return status;
    },
    async open() {
      status = "open";
    },
    async close() {
      status = "closed";
    },
    async get(key: string): Promise<any> {
      return db.get(key);
    },
    async put(key: string, value: unknown) {
      await db.put(key, value);
    },
    async del(key: string) {
      await db.del(key);
    },
    async batchWrite(ops: AuthorityBatchOperation[]) {
      await db.batch(ops);
    },
    createBatch(): AuthorityBatchWriter {
      const batch = db.batch() as any;
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
    iterator(options?: AuthorityIteratorOptions): any {
      return db.iterator(options);
    },
  };
}

const handlesToClose = new Set<CliAuthorityBrokerServerHandle>();
const tempDirsToRemove = new Set<string>();

afterEach(async () => {
  for (const handle of handlesToClose) {
    await handle.close().catch(() => {});
  }
  handlesToClose.clear();
  for (const dir of tempDirsToRemove) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirsToRemove.clear();
});

describe("cliAuthorityBrokerServer", () => {
  it("starts one authority owner and serves multiple clients against the same store", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-broker-"));
    tempDirsToRemove.add(tempDir);
    const endpoint = `unix://${path.join(tempDir, "authority.sock")}`;
    const metadataPath = path.join(tempDir, "authority-store-broker.json");
    const healthPath = path.join(tempDir, "authority-store-broker.health.json");

    const handle = await getOrCreateCliAuthorityBrokerServer({
      endpoint,
      metadataPath,
      healthPath,
      transportMode: "inprocess",
      createStore: () => createMemoryAuthorityStore("memory://authority"),
    });
    handlesToClose.add(handle);

    const clientA = createCliAuthorityBrokerClient({
      endpoint: handle.listeningEndpoint,
      invoke: handle.request,
    });
    const clientB = createCliAuthorityBrokerClient({
      endpoint: handle.listeningEndpoint,
      invoke: handle.request,
    });

    await clientA.put("agent:1", { model: "mimo-v2.5-pro" });
    expect(await clientB.get("agent:1")).toEqual({ model: "mimo-v2.5-pro" });

    expect(fs.existsSync(metadataPath)).toBe(true);
    expect(fs.existsSync(healthPath)).toBe(true);
    expect(handle.authorityStore.location).toBe("memory://authority");
  });

  it("reuses the same broker owner for repeated boot calls", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-broker-"));
    tempDirsToRemove.add(tempDir);
    const endpoint = `unix://${path.join(tempDir, "authority.sock")}`;
    let createStoreCalls = 0;

    const first = await getOrCreateCliAuthorityBrokerServer({
      endpoint,
      transportMode: "inprocess",
      createStore: () => {
        createStoreCalls += 1;
        return createMemoryAuthorityStore(`memory://authority/${createStoreCalls}`);
      },
    });
    const second = await getOrCreateCliAuthorityBrokerServer({
      endpoint,
      transportMode: "inprocess",
      createStore: () => {
        createStoreCalls += 1;
        return createMemoryAuthorityStore(`memory://authority/${createStoreCalls}`);
      },
    });
    handlesToClose.add(first);

    expect(second).toBe(first);
    expect(createStoreCalls).toBe(1);
  });

  it("allows concurrent logical clients to share one broker-backed store", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-broker-"));
    tempDirsToRemove.add(tempDir);
    const endpoint = `unix://${path.join(tempDir, "authority.sock")}`;

    const handle = await getOrCreateCliAuthorityBrokerServer({
      endpoint,
      transportMode: "inprocess",
      createStore: () => createMemoryAuthorityStore("memory://authority"),
    });
    handlesToClose.add(handle);

    const clients = Array.from({ length: 4 }, () => createCliAuthorityBrokerClient({
      endpoint: handle.listeningEndpoint,
      invoke: handle.request,
    }));

    await Promise.all(clients.map((client, index) =>
      client.put(`agent:${index}`, { index })
    ));

    await Promise.all(clients.map(async (_client, index) => {
      await expect(clients[0].get(`agent:${index}`)).resolves.toEqual({ index });
    }));
  });
});
