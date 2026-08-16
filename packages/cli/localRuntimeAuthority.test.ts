import { describe, expect, test } from "bun:test";

import {
  resolveCliAuthorityBrokerEndpoint,
  resolveCliAuthorityBrokerHealthPath,
  resolveCliAuthorityBrokerMetadataPath,
  resolveCliAuthorityBrokerPort,
  resolveCliAuthorityBrokerSocketPath,
  resolveCliAuthorityStoreDriverConfig,
  resolveCliAuthorityStoreDriver,
} from "../database-engine/cliAuthorityStoreDriver";
import { connectCliAuthorityBroker } from "./localRuntimeAuthority";

describe("CLI authority driver selection", () => {
  test("defaults to the broker driver", () => {
    expect(resolveCliAuthorityStoreDriver({
      env: {},
      homeDir: "/Users/demo",
    })).toBe("broker");
  });

  test("ignores explicit non-broker overrides", () => {
    expect(resolveCliAuthorityStoreDriver({
      env: { NOLO_CLI_AUTHORITY_DRIVER: "level" },
      homeDir: "/Users/demo",
    })).toBe("broker");
    expect(resolveCliAuthorityStoreDriver({
      env: { NOLO_CLI_AUTHORITY_DRIVER: "memory" },
      homeDir: "/Users/demo",
    })).toBe("broker");
    expect(resolveCliAuthorityStoreDriver({
      env: { NOLO_CLI_AUTHORITY_DRIVER: "broker" },
      homeDir: "/Users/demo",
    })).toBe("broker");
  });

  test("falls back to broker and exposes invalid driver input", () => {
    expect(resolveCliAuthorityStoreDriverConfig({
      env: { NOLO_CLI_AUTHORITY_DRIVER: "bogus" },
      homeDir: "/Users/demo",
    })).toEqual({
      driver: "broker",
      invalidDriver: "bogus",
    });
    expect(resolveCliAuthorityStoreDriverConfig({
      env: { NOLO_CLI_AUTHORITY_DRIVER: "level" },
      homeDir: "/Users/demo",
    })).toEqual({
      driver: "broker",
      invalidDriver: "level",
    });
  });
});

describe("CLI authority broker paths", () => {
  test("resolves the default TCP endpoint under NOLO_HOME", () => {
    expect(resolveCliAuthorityBrokerPort({
      env: { NOLO_HOME: "/var/nolo", NOLO_CLI_AUTHORITY_BROKER_PORT: "48123" },
      homeDir: "/Users/demo",
    })).toBe(48123);
    expect(resolveCliAuthorityBrokerEndpoint({
      transport: "tcp",
      env: { NOLO_HOME: "/var/nolo", NOLO_CLI_AUTHORITY_BROKER_PORT: "48123" },
      homeDir: "/Users/demo",
    })).toBe("tcp://127.0.0.1:48123");
  });

  test("still resolves Unix socket paths for explicit diagnostics and compatibility", () => {
    expect(resolveCliAuthorityBrokerSocketPath({
      transport: "unix",
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
    })).toBe("/var/nolo/run/authority-store-broker.sock");
    expect(resolveCliAuthorityBrokerEndpoint({
      transport: "unix",
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
    })).toBe("unix:///var/nolo/run/authority-store-broker.sock");
  });

  test("resolves broker metadata and health paths under NOLO_HOME", () => {
    expect(resolveCliAuthorityBrokerMetadataPath({
      transport: "unix",
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
    })).toBe("/var/nolo/run/authority-store-broker.json");
    expect(resolveCliAuthorityBrokerHealthPath({
      transport: "unix",
      env: { NOLO_HOME: "/var/nolo" },
      homeDir: "/Users/demo",
    })).toBe("/var/nolo/run/authority-store-broker.health.json");
  });
});

describe("CLI authority broker connect", () => {
  test("attaches after a lock race and retries takeover when the short-lived owner exits", async () => {
    const attempts: string[] = [];
    const client = {
      open: async () => {
        attempts.push("client.open");
        if (attempts.filter((item) => item === "client.open").length < 4) {
          throw Object.assign(new Error("connect ENOENT"), {
            reason: "cli_authority_broker_unavailable",
            status: 503,
          });
        }
      },
    };

    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => client as any,
        startBroker: async () => {
          attempts.push("startBroker");
          if (attempts.filter((item) => item === "startBroker").length === 1) {
            throw new Error("Database failed to open");
          }
        },
        sleep: async () => {
          attempts.push("sleep");
        },
      },
    });

    expect(typeof authority.get).toBe("function");
    expect(attempts).toEqual([
      "startBroker",
      "sleep",
      "client.open",
      "sleep",
      "client.open",
      "sleep",
      "client.open",
      "sleep",
      "client.open",
    ]);
  });

  test("takes over after an attached broker owner exits before put or batchWrite", async () => {
    for (const operation of ["put", "batchWrite"] as const) {
      const attempts: string[] = [];
      let clientNumber = 0;

      const authority = await connectCliAuthorityBroker({
        endpoint: "unix:///tmp/test-authority.sock",
        metadataPath: "/tmp/test-authority.json",
        healthPath: "/tmp/test-authority.health.json",
        dbPath: "/tmp/test.leveldb",
        deps: {
          createClient: () => {
            clientNumber += 1;
            const currentClient = clientNumber;
            return {
              open: async () => {
                attempts.push(`client${currentClient}.open`);
              },
              put: async () => {
                attempts.push(`client${currentClient}.put`);
                if (currentClient === 1) {
                  throw Object.assign(new Error("connect ECONNREFUSED"), {
                    reason: "cli_authority_broker_unavailable",
                    status: 503,
                  });
                }
              },
              batchWrite: async () => {
                attempts.push(`client${currentClient}.batchWrite`);
                if (currentClient === 1) {
                  throw Object.assign(new Error("connect ECONNREFUSED"), {
                    reason: "cli_authority_broker_unavailable",
                    status: 503,
                  });
                }
              },
            } as any;
          },
          startBroker: async () => {
            attempts.push("startBroker");
            if (clientNumber === 1) {
              throw new Error("Database failed to open");
            }
          },
          sleep: async () => {
            attempts.push("sleep");
          },
        },
      });

      if (operation === "put") {
        await authority.put("key", "value");
      } else {
        await authority.batchWrite([{ type: "put", key: "key", value: "value" }]);
      }

      expect(attempts).toEqual([
        "startBroker",
        "sleep",
        "client1.open",
        `client1.${operation}`,
        "startBroker",
        "client2.open",
        `client2.${operation}`,
      ]);
    }
  });

  test("restarts an interrupted iterator before yielding entries", async () => {
    let clientNumber = 0;
    const attempts: string[] = [];

    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => {
          clientNumber += 1;
          const currentClient = clientNumber;
          return {
            open: async () => {
              attempts.push(`client${currentClient}.open`);
            },
            iterator: async function* () {
              attempts.push(`client${currentClient}.iterator`);
              if (currentClient === 1) {
                throw Object.assign(new Error("connect ECONNREFUSED"), {
                  reason: "cli_authority_broker_unavailable",
                  status: 503,
                });
              }
              yield ["key", "value"] as [string, unknown];
            },
          } as any;
        },
        startBroker: async () => {
          attempts.push("startBroker");
        },
        sleep: async () => {},
      },
    });

    const entries: Array<[string, unknown]> = [];
    for await (const entry of authority.iterator()) {
      entries.push(entry);
    }

    expect(entries).toEqual([["key", "value"]]);
    expect(attempts).toEqual([
      "startBroker",
      "client1.open",
      "client1.iterator",
      "startBroker",
      "client2.open",
      "client2.iterator",
    ]);
  });

  test("keeps iterator consumption lazy when the consumer stops after one entry", async () => {
    let yieldedByClient = 0;
    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => ({
          open: async () => {},
          iterator: async function* () {
            for (const key of ["a", "b", "c"]) {
              yieldedByClient += 1;
              yield [key, key] as [string, unknown];
            }
          },
        }) as any,
        startBroker: async () => {},
        sleep: async () => {},
      },
    });

    for await (const _entry of authority.iterator()) {
      break;
    }

    expect(yieldedByClient).toBe(1);
  });

  test("resumes an interrupted forward iterator after the last yielded key without duplicates", async () => {
    let clientNumber = 0;
    const iteratorOptions: unknown[] = [];
    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => {
          clientNumber += 1;
          const currentClient = clientNumber;
          return {
            open: async () => {},
            iterator: async function* (options: unknown) {
              iteratorOptions.push(options);
              yield ["a", 1] as [string, unknown];
              if (currentClient === 1) {
                throw Object.assign(new Error("connect ECONNREFUSED"), {
                  reason: "cli_authority_broker_unavailable",
                  status: 503,
                });
              }
              yield ["b", 2] as [string, unknown];
            },
          } as any;
        },
        startBroker: async () => {},
        sleep: async () => {},
      },
    });

    const entries: Array<[string, unknown]> = [];
    for await (const entry of authority.iterator()) {
      entries.push(entry);
    }

    expect(entries).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(iteratorOptions).toEqual([
      {},
      { gte: "a" },
    ]);
  });

  test("resumes an interrupted reverse iterator below the last yielded key", async () => {
    let clientNumber = 0;
    const iteratorOptions: unknown[] = [];
    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => {
          clientNumber += 1;
          const currentClient = clientNumber;
          return {
            open: async () => {},
            iterator: async function* (options: unknown) {
              iteratorOptions.push(options);
              if (currentClient === 1) {
                yield ["c", 3] as [string, unknown];
                throw Object.assign(new Error("connect ECONNREFUSED"), {
                  reason: "cli_authority_broker_unavailable",
                  status: 503,
                });
              }
              yield ["b", 2] as [string, unknown];
            },
          } as any;
        },
        startBroker: async () => {},
        sleep: async () => {},
      },
    });

    const entries: Array<[string, unknown]> = [];
    for await (const entry of authority.iterator({ reverse: true })) {
      entries.push(entry);
    }

    expect(entries).toEqual([
      ["c", 3],
      ["b", 2],
    ]);
    expect(iteratorOptions).toEqual([
      { reverse: true },
      { reverse: true, lt: "c" },
    ]);
  });

  test("retries an unavailable operation only once", async () => {
    let clientNumber = 0;
    const authority = await connectCliAuthorityBroker({
      endpoint: "unix:///tmp/test-authority.sock",
      metadataPath: "/tmp/test-authority.json",
      healthPath: "/tmp/test-authority.health.json",
      dbPath: "/tmp/test.leveldb",
      deps: {
        createClient: () => {
          clientNumber += 1;
          return {
            open: async () => {},
            put: async () => {
              throw Object.assign(new Error("connect ECONNREFUSED"), {
                reason: "cli_authority_broker_unavailable",
                status: 503,
              });
            },
          } as any;
        },
        startBroker: async () => {},
        sleep: async () => {},
      },
    });

    await expect(authority.put("key", "value")).rejects.toThrow(
      "connect ECONNREFUSED"
    );
    expect(clientNumber).toBe(2);
  });
});
