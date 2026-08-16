import { describe, expect, it } from "bun:test";

import {
  compareRemoteRecordsByComparableTime,
  partitionReadServers,
  planAuthorityReadServers,
  pickBestSettledRemoteRecord,
  shouldReplaceLocalWithRemoteRecord,
  shouldReplicateLocalRecord,
} from "./readResolution";

describe("read resolution", () => {
  it("partitions preferred and fallback servers", () => {
    expect(
      partitionReadServers({
        allServers: ["https://preferred", "https://backup", "https://nolo.chat"],
        preferredServerOrigin: "https://preferred/",
      })
    ).toEqual({
      preferredServer: "https://preferred",
      fallbackServers: ["https://backup", "https://nolo.chat"],
      orderedServersForLocalHit: [
        "https://preferred",
        "https://backup",
        "https://nolo.chat",
      ],
    });
  });

  it("returns only fallback servers when no preferred server is provided", () => {
    expect(
      partitionReadServers({
        allServers: ["https://backup", "https://nolo.chat"],
        preferredServerOrigin: null,
      })
    ).toEqual({
      preferredServer: null,
      fallbackServers: ["https://backup", "https://nolo.chat"],
      orderedServersForLocalHit: ["https://backup", "https://nolo.chat"],
    });
  });

  it("places authority server before provenance and generic fallback servers", () => {
    expect(
      planAuthorityReadServers({
        allServers: ["https://nolo.chat", "https://us.nolo.chat"],
        authorityServer: "https://self.example.com/",
        serverOrigin: "https://us.nolo.chat/",
      })
    ).toEqual([
      "https://self.example.com",
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);
  });

  it("compares remote records by updatedAt, createdAt, then meta.createdAt", () => {
    expect(
      compareRemoteRecordsByComparableTime(
        { updatedAt: "2026-05-24T00:00:00.000Z" },
        { createdAt: "2026-05-23T00:00:00.000Z" }
      )
    ).toBeGreaterThan(0);
    expect(
      compareRemoteRecordsByComparableTime(
        { createdAt: "2026-05-22T00:00:00.000Z" },
        { meta: { createdAt: 1 } }
      )
    ).toBeGreaterThan(0);
  });

  it("picks the best fulfilled remote record and preserves its index", () => {
    const settledResults: PromiseSettledResult<any>[] = [
      { status: "rejected", reason: new Error("boom") },
      {
        status: "fulfilled",
        value: { updatedAt: "2026-05-23T00:00:00.000Z", title: "older" },
      },
      {
        status: "fulfilled",
        value: { updatedAt: "2026-05-24T00:00:00.000Z", title: "newer" },
      },
    ];

    expect(
      pickBestSettledRemoteRecord({
        settledResults,
        isBetterCandidate: (current, latest) =>
          compareRemoteRecordsByComparableTime(current, latest) > 0,
      })
    ).toEqual({
      index: 2,
      data: { updatedAt: "2026-05-24T00:00:00.000Z", title: "newer" },
    });
  });

  it("decides when a remote record should replace the local cache", () => {
    expect(
      shouldReplaceLocalWithRemoteRecord({
        localData: null,
        remoteData: { updatedAt: "2026-05-24T00:00:00.000Z" },
        isRemoteNewer: () => true,
      })
    ).toBe(true);
    expect(
      shouldReplaceLocalWithRemoteRecord({
        localData: { updatedAt: "2026-05-25T00:00:00.000Z" },
        remoteData: { updatedAt: "2026-05-24T00:00:00.000Z" },
        isRemoteNewer: () => false,
      })
    ).toBe(false);
  });

  it("decides when local data should be replicated back to servers", () => {
    expect(
      shouldReplicateLocalRecord({
        localData: { title: "local" },
        remoteData: null,
        remoteTargetCount: 2,
      })
    ).toBe(true);
    expect(
      shouldReplicateLocalRecord({
        localData: { title: "local" },
        remoteData: { title: "remote" },
        remoteTargetCount: 2,
      })
    ).toBe(false);
    expect(
      shouldReplicateLocalRecord({
        localData: { title: "local" },
        remoteData: null,
        remoteTargetCount: 0,
      })
    ).toBe(false);
  });
});
