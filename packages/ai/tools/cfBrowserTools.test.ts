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
  const mod = await import(`./cfBrowserTools.ts`);
  mock.restore();
  return mod;
}

const originalFetch = globalThis.fetch;
const thunkApi = {} as any;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("cfBrowserTools docs guardrails", () => {
  it("canonicalizes docs urls for cfGetMarkdown", async () => {
    const { cfGetMarkdownFunc } = await loadModule();
    let capturedBody: any = null;
    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return {
        markdown: "# Remote Access\nUse Tailscale.",
        success: true,
        browserMsUsed: 900,
        source: body.url,
      };
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

    const result = await cfGetMarkdownFunc(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
      thunkApi
    );

    expect(capturedBody.url).toBe("https://docs.openclaw.ai/gateway/remote.md");
    expect(result.displayData).toContain("文档地址已规范化");
    expect(result.rawData).toMatchObject({
      resolvedUrl: "https://docs.openclaw.ai/gateway/remote.md",
      originalUrl: "https://docs.openclaw.ai/gateway-runbook/gateway/remote",
    });
  });

  it("fails cfGetMarkdown when markdown extraction is empty", async () => {
    const { cfGetMarkdownFunc } = await loadModule();
    mockCallToolApiImpl = () => ({
      markdown: "",
      success: true,
      browserMsUsed: 100,
      source: "https://example.com",
    });

    await expect(cfGetMarkdownFunc({ url: "https://example.com" }, thunkApi)).rejects.toThrow(
      "未提取到正文内容"
    );
  });

  it("canonicalizes docs urls for cfExtractJSON", async () => {
    const { cfExtractJSONFunc } = await loadModule();
    let capturedBody: any = null;
    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return {
        result: { ok: true },
        success: true,
        browserMsUsed: 1100,
        source: body.url,
      };
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

    const result = await cfExtractJSONFunc(
      {
        url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote",
        prompt: "提取主要配置项",
      },
      thunkApi
    );

    expect(capturedBody.url).toBe("https://docs.openclaw.ai/gateway/remote.md");
    expect(result.displayData).toContain("文档地址已规范化");
  });

  it("canonicalizes docs urls for cfGeneratePDF and cfScreenshot", async () => {
    const { cfGeneratePDFFunc, cfScreenshotFunc } = await loadModule();
    const capturedUrls: string[] = [];
    mockCallToolApiImpl = (_path, body) => {
      capturedUrls.push(body.url);
      if (_path === "/api/cf-pdf") {
        return {
          dataUrl: "data:application/pdf;base64,aaa",
          mimeType: "application/pdf",
          filename: "remote.pdf",
          browserMsUsed: 1500,
          source: body.url,
        };
      }
      return {
        dataUrl: "data:image/png;base64,bbb",
        mimeType: "image/png",
        browserMsUsed: 1500,
        source: body.url,
      };
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

    const pdfResult = await cfGeneratePDFFunc(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
      thunkApi
    );
    const screenshotResult = await cfScreenshotFunc(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote" },
      thunkApi
    );

    expect(capturedUrls).toEqual([
      "https://docs.openclaw.ai/gateway/remote.md",
      "https://docs.openclaw.ai/gateway/remote.md",
    ]);
    expect(pdfResult.displayData).toContain("文档地址已规范化");
    expect(screenshotResult.displayData).toContain("文档地址已规范化");
  });
});
