import { beforeEach, describe, expect, test, mock } from "bun:test";

let moduleVersion = 0;
const loadReadXPostTool = async () => {
  mock.restore();
  return import(new URL(`./readXPostTool.ts?test=${moduleVersion++}`, import.meta.url).href);
};

describe("readXPostFunc", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("reads an X post through an injected bridge reader", async () => {
    const { readXPostFunc } = await loadReadXPostTool();
    let readerArgs: any = null;
    const result = await readXPostFunc(
      {
        url: "https://x.com/karminski3/status/2051832734533013575",
        keepOpen: true,
        profileDir: "C:\\tmp\\nolo-x-persistent",
        headless: false,
      },
      {},
      {
        reader: async (url: string, args: any) => {
          readerArgs = args;
          return {
            ok: true,
            backend: "desktop_local_browser",
            fetchedAt: "2026-05-06T05:30:00.000Z",
            data: {
              id: "2051832734533013575",
              url,
              author: {
                handle: "karminski3",
                displayName: "karminski-牙医",
              },
              text: "Gemma 4 draft model speeds up speculative decoding.",
              media: [],
              sourceBackend: "desktop_local_browser",
              fetchedAt: "2026-05-06T05:30:00.000Z",
            },
          };
        },
      },
    );

    expect(readerArgs).toEqual({
      keepOpen: true,
      profileDir: "C:\\tmp\\nolo-x-persistent",
      headless: false,
    });
    expect(result.rawData.ok).toBe(true);
    expect(result.rawData.data.author.handle).toBe("karminski3");
    expect(result.displayData).toContain("@karminski3");
    expect(result.displayData).toContain("Gemma 4 draft model");
  });

  test("rejects non-X status URLs", async () => {
    const { readXPostFunc } = await loadReadXPostTool();
    await expect(
      readXPostFunc({ url: "https://example.com/post/1" }, {}, {}),
    ).rejects.toThrow("X/Twitter status URL");
  });

  test("routes packaged desktop tool calls through the local read_x_post API", async () => {
    const { readXPostFunc } = await loadReadXPostTool();
    const previousDesktop = process.env.NOLO_DESKTOP;
    const previousPort = process.env.NOLO_DESKTOP_SERVER_PORT;
    const previousAuthToken = process.env.AUTH_TOKEN;
    const previousFetch = globalThis.fetch;
    const calls: any[] = [];

    process.env.NOLO_DESKTOP = "1";
    process.env.NOLO_DESKTOP_SERVER_PORT = "3233";
    delete process.env.AUTH_TOKEN;
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          ok: true,
          backend: "desktop_local_browser",
          fetchedAt: "2026-05-07T02:30:00.000Z",
          data: {
            id: "123",
            url: "https://x.com/user/status/123",
            author: { handle: "user" },
            text: "desktop local api",
            media: [],
            sourceBackend: "desktop_local_browser",
            fetchedAt: "2026-05-07T02:30:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as any;

    try {
      const result = await readXPostFunc(
        { url: "https://x.com/user/status/123" },
        {
          getState: () => ({
            auth: { currentToken: "desktop-token" },
            settings: { currentServer: "https://nolo.chat" },
          }),
        },
        {},
      );

      expect(result.rawData.ok).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("http://127.0.0.1:3233/api/read-x-post");
      expect(calls[0].init.headers.Authorization).toStartWith("Bearer ");
    } finally {
      if (previousDesktop === undefined) delete process.env.NOLO_DESKTOP;
      else process.env.NOLO_DESKTOP = previousDesktop;
      if (previousPort === undefined) delete process.env.NOLO_DESKTOP_SERVER_PORT;
      else process.env.NOLO_DESKTOP_SERVER_PORT = previousPort;
      if (previousAuthToken === undefined) delete process.env.AUTH_TOKEN;
      else process.env.AUTH_TOKEN = previousAuthToken;
      globalThis.fetch = previousFetch;
    }
  });

  test("uses same-origin desktop endpoint from the web desktop bundle", async () => {
    const { readXPostFunc } = await loadReadXPostTool();
    const previousPlatform = process.env.PLATFORM;
    const previousWindow = (globalThis as any).window;
    const previousFetch = globalThis.fetch;
    const calls: any[] = [];

    process.env.PLATFORM = "web";
    (globalThis as any).window = { __NOLO_DESKTOP__: true };
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          ok: true,
          backend: "desktop_local_browser",
          fetchedAt: "2026-05-06T05:30:00.000Z",
          data: {
            id: "123",
            url: "https://x.com/user/status/123",
            author: { handle: "user" },
            text: "from desktop endpoint",
            media: [],
            sourceBackend: "desktop_local_browser",
            fetchedAt: "2026-05-06T05:30:00.000Z",
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }) as any;

    try {
      const result = await readXPostFunc(
        { url: "https://x.com/user/status/123" },
        {},
      );

      expect(result.rawData.ok).toBe(true);
      expect(result.displayData).toContain("from desktop endpoint");
      expect(calls[0].url).toBe("/api/read-x-post");
      expect(JSON.parse(String(calls[0].init.body))).toEqual({
        url: "https://x.com/user/status/123",
        keepOpen: false,
      });
    } finally {
      if (previousPlatform === undefined) delete process.env.PLATFORM;
      else process.env.PLATFORM = previousPlatform;
      (globalThis as any).window = previousWindow;
      globalThis.fetch = previousFetch;
    }
  });
});
