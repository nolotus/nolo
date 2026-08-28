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
  const mod = await import(`./firecrawlTool.ts`);
  mock.restore();
  return mod;
}

const thunkApi = {} as any;

afterEach(() => {
  mock.restore();
});

describe("firecrawlScrapeFunc", () => {
  it("returns markdown content from the scrape API", async () => {
    const { firecrawlScrapeFunc } = await loadModule();
    let capturedBody: any = null;

    mockCallToolApiImpl = (path, body) => {
      capturedBody = body;
      expect(path).toBe("/api/firecrawl-scrape");
      return {
        success: true,
        data: {
          markdown: "# Firecrawl\n\nHello world.",
          metadata: {
            title: "Firecrawl",
            url: "https://firecrawl.dev/",
            statusCode: 200,
            contentType: "text/html",
          },
        },
        creditsUsed: 1,
      };
    };

    const result = await firecrawlScrapeFunc(
      { url: "  https://firecrawl.dev  " },
      thunkApi,
    );

    expect(capturedBody).toEqual({
      url: "https://firecrawl.dev",
      onlyMainContent: true,
      timeout: undefined,
    });
    expect(result.rawData).toEqual({
      url: "https://firecrawl.dev/",
      title: "Firecrawl",
      markdown: "# Firecrawl\n\nHello world.",
      metadata: {
        title: "Firecrawl",
        url: "https://firecrawl.dev/",
        statusCode: 200,
        contentType: "text/html",
      },
      creditsUsed: 1,
    });
    expect(result.llmContext).toContain("Hello world.");
    expect(result.displayData).toContain("Firecrawl 已抓取");
  });

  it("rejects invalid URLs", async () => {
    const { firecrawlScrapeFunc } = await loadModule();
    await expect(
      firecrawlScrapeFunc({ url: "ftp://example.com" }, thunkApi),
    ).rejects.toThrow("有效的 http/https URL");
  });
});

describe("firecrawlSearchFunc", () => {
  it("returns search results with markdown previews", async () => {
    const { firecrawlSearchFunc } = await loadModule();
    let capturedBody: any = null;

    mockCallToolApiImpl = (path, body) => {
      capturedBody = body;
      expect(path).toBe("/api/firecrawl-search");
      return {
        success: true,
        data: {
          web: [
            {
              title: "Firecrawl Docs",
              url: "https://docs.firecrawl.dev/",
              description: "API docs",
              markdown: "# Docs\n\nSearch result body.",
              category: "research",
            },
          ],
        },
        creditsUsed: 2,
      };
    };

    const result = await firecrawlSearchFunc(
      {
        query: "firecrawl pdf parser",
        limit: 3,
        categories: ["pdf"],
        country: "US",
      },
      thunkApi,
    );

    expect(capturedBody).toEqual({
      query: "firecrawl pdf parser",
      limit: 3,
      includeContent: true,
      categories: ["pdf"],
      country: "US",
    });
    expect(result.rawData).toEqual({
      query: "firecrawl pdf parser",
      results: [
        {
          title: "Firecrawl Docs",
          url: "https://docs.firecrawl.dev/",
          description: "API docs",
          category: "research",
          content: "# Docs\n\nSearch result body.",
        },
      ],
      creditsUsed: 2,
    });
    expect(result.llmContext).toContain("Found 1 Firecrawl results");
    expect(result.displayData).toContain("🔎");
  });

  it("rejects empty queries", async () => {
    const { firecrawlSearchFunc } = await loadModule();
    await expect(
      firecrawlSearchFunc({ query: "   " }, thunkApi),
    ).rejects.toThrow("有效的 query");
  });

  it("caps search llmContext size for many large results", async () => {
    const { firecrawlSearchFunc } = await loadModule();

    mockCallToolApiImpl = () => ({
      success: true,
      data: {
        web: Array.from({ length: 20 }, (_value, index) => ({
          title: `Result ${index + 1}`,
          url: `https://example.com/${index + 1}`,
          description: "x".repeat(500),
          markdown: "y".repeat(3000),
        })),
      },
    });

    const result = await firecrawlSearchFunc(
      { query: "large result set", limit: 20, includeContent: true },
      thunkApi,
    );

    expect(result.llmContext.length).toBeLessThanOrEqual(12_000);
  });
});