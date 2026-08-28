import { describe, expect, test } from "bun:test";

import { probeCliAuthorityBrokerHealth } from "./cliAuthorityBrokerHealth";

const metadata = {
  pid: 1234,
  endpoint: "tcp://127.0.0.1:48123",
};

const health = {
  ok: true,
  pid: 1234,
  endpoint: "tcp://127.0.0.1:48123",
};

describe("CLI authority broker health", () => {
  test("rejects static health when the metadata pid is dead", async () => {
    let endpointProbed = false;
    const result = await probeCliAuthorityBrokerHealth({
      endpoint: metadata.endpoint,
      metadataPath: "/tmp/authority.json",
      healthPath: "/tmp/authority.health.json",
      deps: {
        readJson: async (filePath) =>
          filePath.endsWith(".health.json") ? health : metadata,
        isPidAlive: () => false,
        openEndpoint: async () => {
          endpointProbed = true;
        },
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "authority broker metadata pid 1234 is not alive",
    });
    expect(endpointProbed).toBe(false);
  });

  test("rejects static health when the endpoint is unreachable", async () => {
    const result = await probeCliAuthorityBrokerHealth({
      endpoint: metadata.endpoint,
      metadataPath: "/tmp/authority.json",
      healthPath: "/tmp/authority.health.json",
      deps: {
        readJson: async (filePath) =>
          filePath.endsWith(".health.json") ? health : metadata,
        isPidAlive: () => true,
        openEndpoint: async () => {
          throw new Error("connect ECONNREFUSED");
        },
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "authority broker endpoint is unreachable: connect ECONNREFUSED",
    });
  });
});
