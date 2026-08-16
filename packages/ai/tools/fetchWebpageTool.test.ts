import { afterEach, describe, expect, it, mock } from "bun:test";

let mockCallToolApiImpl: (path: string, body: any) => any = () => {
  throw new Error("not set");
};
let moduleVersion = 0;

function setupModuleMocks() {
  mock.module("./toolApiClient", () => ({
    callToolApi: async (_thunkApi: any, path: string, body: any) => {
      return mockCallToolApiImpl(path, body);
    },
  }));
}

async function loadModule() {
  setupModuleMocks();
  const mod = await import(`./fetchWebpageTool.ts`);
  mock.restore();
  return mod;
}

const originalFetch = globalThis.fetch;
const thunkApi = {} as any;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("fetchWebpageFunc", () => {
  it("retries Cloudflare docs pages with the advertised markdown URL", async () => {
    const { fetchWebpageFunc } = await loadModule();
    const requestedUrls: string[] = [];

    mockCallToolApiImpl = (_path, body) => {
      requestedUrls.push(body.url);
      if (body.url === "https://developers.cloudflare.com/workers/platform/pricing/#containers") {
        return {
          markdown: [
            "STOP! If you are an AI agent or LLM, read this before continuing.",
            "Get this page as Markdown: https://developers.cloudflare.com/workers/platform/pricing/index.md (append index.md)",
          ].join("\n"),
          success: true,
          browserMsUsed: 400,
          source: body.url,
        };
      }
      if (body.url === "https://developers.cloudflare.com/workers/platform/pricing/index.md") {
        return {
          markdown: "# Pricing\n\n## Containers\n\nContainers are billed for every 10ms.",
          success: true,
          browserMsUsed: 350,
          source: body.url,
        };
      }
      throw new Error(`unexpected tool api url: ${body.url}`);
    };

    const result = await fetchWebpageFunc(
      { url: "https://developers.cloudflare.com/workers/platform/pricing/#containers" },
      thunkApi
    );

    expect(requestedUrls).toEqual([
      "https://developers.cloudflare.com/workers/platform/pricing/#containers",
      "https://developers.cloudflare.com/workers/platform/pricing/index.md",
    ]);
    expect(result.rawData).toContain("[Resolved URL] https://developers.cloudflare.com/workers/platform/pricing/index.md");
    expect(result.rawData).toContain("Containers are billed for every 10ms");
    expect(result.displayData).toContain("文档地址已规范化");
  });

  it("resolves docs guessed paths via llms.txt before rendering", async () => {
    const { fetchWebpageFunc } = await loadModule();
    let capturedBody: any = null;

    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return {
        markdown: "# Remote Access\nUse Tailscale.",
        success: true,
        browserMsUsed: 1200,
        source: body.url,
      };
    };

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.openclaw.ai/llms.txt") {
        return new Response(
          [
            "# OpenClaw",
            "- [Gateway Runbook](https://docs.openclaw.ai/gateway/index.md)",
            "- [Remote Access](https://docs.openclaw.ai/gateway/remote.md)",
          ].join("\n"),
          { status: 200 }
        );
      }
      if (href === "https://docs.openclaw.ai/llms-full.txt") {
        return new Response("not found", { status: 404 });
      }
      if (
        href === "https://docs.openclaw.ai/gateway/remote.md" &&
        (init?.method ?? "GET") === "HEAD"
      ) {
        return new Response(null, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href} ${init?.method ?? "GET"}`);
    }) as any;

    const result = await fetchWebpageFunc(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
      thunkApi
    );

    expect(capturedBody.url).toBe("https://docs.openclaw.ai/gateway/remote.md");
    expect(result.rawData).toContain("[Resolved URL] https://docs.openclaw.ai/gateway/remote.md");
    expect(result.displayData).toContain("文档地址已规范化");
  });

  it("throws when extraction is empty instead of returning success-shaped empty text", async () => {
    const { fetchWebpageFunc } = await loadModule();
    mockCallToolApiImpl = () => ({
      markdown: "",
      success: true,
      browserMsUsed: 300,
      source: "https://example.com",
    });

    await expect(
      fetchWebpageFunc({ url: "https://example.com" }, thunkApi)
    ).rejects.toThrow("未提取到正文内容");
  });

  it("fails fast for docs urls that still resolve to a 404", async () => {
    const { fetchWebpageFunc } = await loadModule();

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.openclaw.ai/llms.txt") {
        return new Response("# OpenClaw\n", { status: 200 });
      }
      if (href === "https://docs.openclaw.ai/llms-full.txt") {
        return new Response("not found", { status: 404 });
      }
      if (href === "https://docs.openclaw.ai/unknown/path" && (init?.method ?? "GET") === "HEAD") {
        return new Response(null, { status: 404 });
      }
      throw new Error(`unexpected fetch: ${href} ${init?.method ?? "GET"}`);
    }) as any;

    await expect(
      fetchWebpageFunc({ url: "https://docs.openclaw.ai/unknown/path" }, thunkApi)
    ).rejects.toThrow("文档地址不可用");
  });

  it("mentions both original and resolved docs urls when the canonical target is unavailable", async () => {
    const { fetchWebpageFunc } = await loadModule();

    globalThis.fetch = mock(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://docs.openclaw.ai/llms.txt") {
        return new Response(
          "- [Remote Access](https://docs.openclaw.ai/gateway/remote.md)",
          { status: 200 }
        );
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
      fetchWebpageFunc({ url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" }, thunkApi)
    ).rejects.toThrow(
      "原始地址 https://docs.openclaw.ai/gateway-runbook/gateway/remote 已规范化为 https://docs.openclaw.ai/gateway/remote.md"
    );
  });
});
