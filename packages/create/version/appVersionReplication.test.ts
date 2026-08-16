import { describe, expect, it, mock } from "bun:test";

import {
  ensureSpecificAppVersionLocal,
  fetchAppVersionsCurrentServerFirst,
  syncSpecificAppVersion,
} from "./appVersionReplication";

describe("appVersionReplication", () => {
  it("falls back to source server for app version list when current server is empty", async () => {
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/version/list?type=app&entityId=app-1") {
        return new Response(JSON.stringify({ success: true, versions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "https://us.nolo.chat/api/version/list?type=app&entityId=app-1") {
        return new Response(
          JSON.stringify({
            success: true,
            versions: [
              {
                versionId: "v-1",
                entityId: "app-1",
                type: "app",
                createdAt: 123,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://us.nolo.chat/api/version/get?type=app&entityId=app-1&versionId=v-1") {
        return new Response(
          JSON.stringify({
            success: true,
            version: {
              versionId: "v-1",
              entityId: "app-1",
              type: "app",
              createdAt: 123,
              snapshot: { code: "worker" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "http://localhost/api/version/save") {
        return new Response(JSON.stringify({ success: true, versionId: "v-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const versions = await fetchAppVersionsCurrentServerFirst({
        currentServer: "http://localhost",
        sourceServer: "https://us.nolo.chat",
        token: "token-1",
        appId: "app-1",
      });
      expect(versions).toEqual([
        expect.objectContaining({
          versionId: "v-1",
          entityId: "app-1",
        }),
      ]);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("preserves the original versionId when copying a specific app version locally", async () => {
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "http://localhost/api/version/get?type=app&entityId=app-1&versionId=v-9") {
        return new Response(JSON.stringify({ error: "not found", code: "NOT_FOUND" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "https://us.nolo.chat/api/version/get?type=app&entityId=app-1&versionId=v-9") {
        return new Response(
          JSON.stringify({
            success: true,
            version: {
              versionId: "v-9",
              entityId: "app-1",
              type: "app",
              label: "before-restore",
              pinned: true,
              createdAt: 456,
              snapshot: { code: "worker" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "http://localhost/api/version/save") {
        expect(JSON.parse(String(init?.body))).toEqual({
          type: "app",
          entityId: "app-1",
          snapshot: { code: "worker" },
          label: "before-restore",
          pinned: true,
          versionId: "v-9",
          createdAt: 456,
        });
        return new Response(JSON.stringify({ success: true, versionId: "v-9" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await expect(
        syncSpecificAppVersion({
          currentServer: "http://localhost",
          sourceServer: "https://us.nolo.chat",
          token: "token-1",
          appId: "app-1",
          versionId: "v-9",
        })
      ).resolves.toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("skips remote fetch when the target app version already exists locally", async () => {
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/version/get?type=app&entityId=app-1&versionId=v-local") {
        return new Response(
          JSON.stringify({
            success: true,
            version: {
              versionId: "v-local",
              entityId: "app-1",
              type: "app",
              createdAt: 999,
              snapshot: { code: "already-local" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await expect(
        ensureSpecificAppVersionLocal({
          currentServer: "http://localhost",
          sourceServer: "https://us.nolo.chat",
          token: "token-1",
          appId: "app-1",
          versionId: "v-local",
        })
      ).resolves.toBe(true);
      expect(fetchMock.mock.calls).toHaveLength(1);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
