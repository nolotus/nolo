import { describe, expect, it } from "bun:test";
import { collectDeepInfraRequestIds } from "./deepinfraRequestIdQuery";

describe("collectDeepInfraRequestIds", () => {
  it("collects request ids from timestamp-based local token records", async () => {
    const rows = new Map<string, unknown>([
      [
        "token-1",
        {
          provider: "deepinfra",
          timestamp: Date.parse("2026-05-21T00:00:10.000Z"),
          provider_request_ids: ["req_1"],
          provider_response_ids: ["resp_1"],
        },
      ],
      [
        "token-2",
        {
          provider: "openai",
          timestamp: Date.parse("2026-05-21T00:00:11.000Z"),
          provider_request_ids: ["req_ignored"],
        },
      ],
    ]);

    const result = await collectDeepInfraRequestIds({
      store: {
        iterator: async function* (options: { gte?: string; lte?: string }) {
          for (const key of [...rows.keys()].sort()) {
            if (options.gte && key < options.gte) continue;
            if (options.lte && key > options.lte) continue;
            yield [key, rows.get(key)] as [string, unknown];
          }
        },
      },
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
    });

    expect(result).toEqual({
      requestIds: ["req_1"],
      responseIds: ["resp_1"],
      scannedTokenRecords: 2,
      matchedTokenRecords: 1,
    });
  });
});
