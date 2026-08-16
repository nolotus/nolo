import { afterEach, describe, expect, it, mock } from "bun:test";

let mockExecuteBrowserToolImpl: (toolName: string, parameters: any) => any = () => {
  throw new Error("not set");
};
let moduleVersion = 0;
const originalFetch = globalThis.fetch;
const thunkApi = {} as any;

function setupModuleMocks() {
  mock.module("./common", () => ({
    executeBrowserTool: async (toolName: string, parameters: any) =>
      mockExecuteBrowserToolImpl(toolName, parameters),
  }));
}

async function loadModule() {
  setupModuleMocks();
  const mod = await import(`./openSession.ts`);
  mock.restore();
  return mod;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("browser_openSession_Func", () => {
  it("opens canonical docs url instead of guessed docs path", async () => {
    const { browser_openSession_Func } = await loadModule();
    let capturedParams: any = null;
    mockExecuteBrowserToolImpl = (_toolName, parameters) => {
      capturedParams = parameters;
      return { sessionId: "session-123" };
    };

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.openclaw.ai/llms.txt") {
        return new Response("- [Remote Access](https://docs.openclaw.ai/gateway/remote.md)", {
          status: 200,
        });
      }
      if (href === "https://docs.openclaw.ai/llms-full.txt") {
        return new Response("not found", { status: 404 });
      }
      if (href === "https://docs.openclaw.ai/gateway/remote.md" && (init?.method ?? "GET") === "HEAD") {
        return new Response(null, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href} ${init?.method ?? "GET"}`);
    }) as any;

    const result = await browser_openSession_Func(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
      thunkApi
    );

    expect(capturedParams).toMatchObject({
      url: "https://docs.openclaw.ai/gateway/remote.md",
    });
    expect(result.rawData).toBe("session-123");
    expect(result.displayData).toContain("文档地址已规范化");
  });

  it("fails before opening session when docs url is unavailable", async () => {
    const { browser_openSession_Func } = await loadModule();
    let executeCalled = false;
    mockExecuteBrowserToolImpl = () => {
      executeCalled = true;
      return { sessionId: "session-should-not-open" };
    };

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.openclaw.ai/llms.txt") {
        return new Response("- [Remote Access](https://docs.openclaw.ai/gateway/remote.md)", {
          status: 200,
        });
      }
      if (href === "https://docs.openclaw.ai/llms-full.txt") {
        return new Response("not found", { status: 404 });
      }
      if (href === "https://docs.openclaw.ai/gateway/remote.md" && (init?.method ?? "GET") === "HEAD") {
        return new Response(null, { status: 404 });
      }
      throw new Error(`unexpected fetch: ${href} ${init?.method ?? "GET"}`);
    }) as any;

    await expect(
      browser_openSession_Func(
        { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
        thunkApi
      )
    ).rejects.toThrow("文档地址不可用");
    expect(executeCalled).toBe(false);
  });

  it("keeps original behavior when docs url is not rewritten", async () => {
    const { browser_openSession_Func } = await loadModule();
    let capturedParams: any = null;
    mockExecuteBrowserToolImpl = (_toolName, parameters) => {
      capturedParams = parameters;
      return { sessionId: "session-original-docs" };
    };

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.example.com/llms.txt") {
        return new Response("not found", { status: 404 });
      }
      if (href === "https://docs.example.com/llms-full.txt") {
        return new Response("not found", { status: 404 });
      }
      throw new Error(`unexpected fetch: ${href} ${init?.method ?? "GET"}`);
    }) as any;

    const result = await browser_openSession_Func(
      { url: "https://docs.example.com/missing/page" },
      thunkApi
    );

    expect(capturedParams).toMatchObject({
      url: "https://docs.example.com/missing/page",
    });
    expect(result.displayData).not.toContain("文档地址已规范化");
  });
});
