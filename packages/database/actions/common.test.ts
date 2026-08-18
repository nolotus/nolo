import { describe, expect, it } from "bun:test";
import { getAllServers, mergeConfiguredServers } from "./common";

describe("server origin normalization", () => {
  it("canonicalizes legacy nolotus cluster origins", () => {
    expect(
      mergeConfiguredServers("https://nolotus.com/", ["https://us.nolotus.com/"])
    ).toEqual(["https://nolo.chat", "https://us.nolo.chat"]);
  });

  it("orders a canonicalized preferred server before the remaining configured servers", () => {
    expect(
      getAllServers(
        "https://nolotus.com/",
        ["https://us.nolotus.com/"],
        "https://us.nolotus.com/"
      )
    ).toEqual(["https://us.nolo.chat", "https://nolo.chat"]);
  });
  it("includes main and alpha cluster peers when current server is local dev", () => {
    expect(
      mergeConfiguredServers("http://127.0.0.1:38123", ["http://127.0.0.1:38124"])
    ).toEqual([
      "http://127.0.0.1:38123",
      "http://127.0.0.1:38124",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  it("expands a single cluster peer to the full main+alpha pair", () => {
    expect(mergeConfiguredServers("https://nolo.chat", [])).toEqual([
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
    expect(mergeConfiguredServers("https://us.nolo.chat", [])).toEqual([
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);
  });

  it("retries transient server failures before returning remote data", async () => {
    const { fetchFromServer } = await import(`./common.ts?test=retry-${Date.now()}`);
    const statuses = [502, 200];
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (url: string) => {
      requestedUrls.push(url);
      const status = statuses.shift() ?? 200;
      return new Response(JSON.stringify({ ok: status === 200 }), {
        headers: { "Content-Type": "application/json" },
        status,
      });
    }) as typeof fetch;

    const result = await fetchFromServer("https://preferred", "dialog-user-retry", "token");

    expect(result).toEqual({ ok: true });
    expect(requestedUrls).toHaveLength(2);
  });
});
