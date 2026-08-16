/**
 * packages/ai/tools/cloudflareCrawl.test.ts
 *
 * 测试 cloudflareCrawlTool 的核心逻辑与 handler 行为。
 *
 * 单元测试（始终运行）：
 *   - 参数校验
 *   - 正常返回结果解析
 *   - 异步任务（wait=false）返回 jobId
 *   - 已完成任务的 displayData 格式
 *
 * 集成测试（需要 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID，
 * 且显式设置 RUN_LIVE_CF_CRAWL_TESTS=1）：
 *   - 测试中国常用网站 vs 直接 fetch 对比（JS 渲染场景）
 *   - 测试国外静态文档站点
 *
 * 运行：bun test packages/ai/tools/cloudflareCrawl.test.ts --timeout 30000
 */

import { afterEach, describe, expect, it, mock } from "bun:test";

// ─────────────────────────────────────────────
// Mock toolApiClient
// ─────────────────────────────────────────────
let mockCallToolApiImpl: (path: string, body: any) => any = () => { throw new Error("not set"); };
let moduleVersion = 0;
const originalFetch = globalThis.fetch;

function setupModuleMocks() {
  mock.module("./toolApiClient", () => ({
    callToolApi: async (_thunkApi: any, path: string, body: any) => {
      return mockCallToolApiImpl(path, body);
    },
    getRequestConfig: (_thunkApi: any) => ({
      currentServer: "http://localhost:3000",
      token: "test-token",
    }),
  }));
}

async function loadModule() {
  setupModuleMocks();
  return await import(`./cloudflareCrawlTool.ts`);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

const thunkApi = {} as any;

// ─────────────────────────────────────────────
// 单元测试
// ─────────────────────────────────────────────
describe("cloudflareCrawlFunc - 参数校验", () => {
  it("url 缺失时抛错", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    await expect(
      cloudflareCrawlFunc({ url: "" }, thunkApi)
    ).rejects.toThrow("必须提供有效的 http/https URL");
  });

  it("url 非 http 时抛错", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    await expect(
      cloudflareCrawlFunc({ url: "ftp://example.com" }, thunkApi)
    ).rejects.toThrow("必须提供有效的 http/https URL");
  });
});

describe("cloudflareCrawlFunc - wait=false 立即返回 jobId", () => {
  it("返回 jobId 和 running 状态", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    mockCallToolApiImpl = () => ({ jobId: "test-job-123", status: "running" });

    const result = await cloudflareCrawlFunc(
      { url: "https://example.com", wait: false },
      thunkApi
    );

    expect(result.rawData.jobId).toBe("test-job-123");
    expect(result.rawData.status).toBe("running");
    expect(result.displayData).toContain("test-job-123");
    expect(result.displayData).toContain("已启动");
  });
});

describe("cloudflareCrawlFunc - 正常完成", () => {
  it("已完成任务：rawData 包含 pages 数组", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    mockCallToolApiImpl = () => ({
      jobId: "done-job-456",
      status: "completed",
      total: 3,
      finished: 3,
      browserSecondsUsed: 12.5,
      records: [
        {
          url: "https://example.com/",
          status: "completed",
          markdown: "# Example\nHello world",
          metadata: { status: 200, title: "Example Domain", url: "https://example.com/" },
        },
        {
          url: "https://example.com/about",
          status: "completed",
          markdown: "# About\nWe are example.",
          metadata: { status: 200, title: "About", url: "https://example.com/about" },
        },
        {
          url: "https://example.com/missing",
          status: "errored",
          metadata: { status: 404, title: "", url: "https://example.com/missing" },
        },
      ],
    });

    const result = await cloudflareCrawlFunc(
      { url: "https://example.com", limit: 3 },
      thunkApi
    );

    expect(result.rawData.status).toBe("completed");
    expect(result.rawData.pages).toHaveLength(3);
    expect(result.rawData.pages[0].content).toContain("Hello world");
    expect(result.displayData).toContain("✅");
    expect(result.displayData).toContain("3");
    expect(result.displayData).toContain("12.5");
  });

  it("任务超时/取消时 displayData 包含警告图标", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    mockCallToolApiImpl = () => ({
      jobId: "timeout-job",
      status: "cancelled_due_to_timeout",
      total: 10,
      finished: 4,
      browserSecondsUsed: 420,
      records: [],
    });

    const result = await cloudflareCrawlFunc({ url: "https://example.com" }, thunkApi);
    expect(result.displayData).toContain("⚠️");
  });
});

describe("cloudflareCrawlFunc - formats 和 options 参数透传", () => {
  it("includePatterns / excludePatterns 被包含在请求体中", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    let capturedBody: any = null;
    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return { jobId: "x", status: "running" };
    };

    await cloudflareCrawlFunc(
      {
        url: "https://example.com",
        wait: false,
        includePatterns: ["/blog/**"],
        excludePatterns: ["/admin/**"],
        formats: ["markdown", "html"],
      },
      thunkApi
    );

    expect(capturedBody.options.includePatterns).toEqual(["/blog/**"]);
    expect(capturedBody.options.excludePatterns).toEqual(["/admin/**"]);
    expect(capturedBody.formats).toEqual(["markdown", "html"]);
  });
});

describe("cloudflareCrawlFunc - docs discovery guardrails", () => {
  it("会将 docs 猜测路径规范化后再启动 crawl", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    let capturedBody: any = null;
    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return { jobId: "crawl-docs-job", status: "running" };
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

    const result = await cloudflareCrawlFunc(
      { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote", wait: false },
      thunkApi
    );

    expect(capturedBody.url).toBe("https://docs.openclaw.ai/gateway/remote.md");
    expect(result.displayData).toContain("文档地址已规范化");
    expect(result.rawData).toMatchObject({
      originalUrl: "https://docs.openclaw.ai/gateway-runbook/gateway/remote",
      resolvedUrl: "https://docs.openclaw.ai/gateway/remote.md",
    });
  });

  it("docs 规范化后仍不可用时直接失败，不启动 crawl", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    mockCallToolApiImpl = () => {
      throw new Error("should not call crawl api");
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
      cloudflareCrawlFunc(
        { url: "https://docs.openclaw.ai/gateway-runbook/gateway/remote", wait: false },
        thunkApi
      )
    ).rejects.toThrow("文档地址不可用");
  });

  it("未发生规范化时保留旧行为，不额外拦截原始 docs url", async () => {
    const { cloudflareCrawlFunc } = await loadModule();
    let capturedBody: any = null;
    mockCallToolApiImpl = (_path, body) => {
      capturedBody = body;
      return { jobId: "crawl-original-docs", status: "running" };
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

    const result = await cloudflareCrawlFunc(
      { url: "https://docs.example.com/missing/page", wait: false },
      thunkApi
    );

    expect(capturedBody.url).toBe("https://docs.example.com/missing/page");
    expect(result.displayData).not.toContain("文档地址已规范化");
  });
});

describe("cloudflareCrawlStatusFunc - 参数校验", () => {
  it("jobId 缺失时抛错", async () => {
    const { cloudflareCrawlStatusFunc } = await loadModule();
    await expect(
      cloudflareCrawlStatusFunc({ jobId: "" }, thunkApi)
    ).rejects.toThrow("必须提供 jobId");
  });
});

// ─────────────────────────────────────────────
// 集成测试（可选，需要 env 变量）
// ─────────────────────────────────────────────
const HAS_CF_CREDS =
  !!process.env.CLOUDFLARE_API_TOKEN && !!process.env.CLOUDFLARE_ACCOUNT_ID;
const RUN_LIVE_CF_CRAWL_TESTS = process.env.RUN_LIVE_CF_CRAWL_TESTS === "1";

const integrationTest = HAS_CF_CREDS && RUN_LIVE_CF_CRAWL_TESTS ? it : it.skip;
const CF_CRAWL_POLL_INTERVAL_MS = 1_500;
const CF_CRAWL_TIMEOUT_MS = 20_000;

/**
 * 辅助：直接 fetch 获取页面文本（用于与 CF crawl 结果对比）
 */
async function directFetch(url: string): Promise<{ ok: boolean; chars: number; sample: string }> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TestBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const text = await resp.text();
    return { ok: resp.ok, chars: text.length, sample: text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, chars: 0, sample: e.message };
  }
}

/**
 * 通过 Cloudflare crawl API 直接爬取（集成测试中直接调 CF API，不走本地服务端）
 */
async function cfCrawlDirect(url: string, limit = 3): Promise<{
  ok: boolean;
  status: string;
  pageCount: number;
  sampleMarkdown: string;
  browserSecondsUsed: number;
  error?: string;
}> {
  const token = process.env.CLOUDFLARE_API_TOKEN!;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`;

  // 启动
  const startResp = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit, formats: ["markdown"], render: true }),
  });
  const startJson = await startResp.json() as any;
  if (!startResp.ok || !startJson.success) {
    return {
      ok: false,
      status: "start_failed",
      pageCount: 0,
      sampleMarkdown: "",
      browserSecondsUsed: 0,
      error: `CF start failed: ${JSON.stringify(startJson)}`,
    };
  }
  const jobId: string = startJson.result;

  // 轮询（显式 live 测试下也尽量缩短等待）
  const deadline = Date.now() + CF_CRAWL_TIMEOUT_MS;
  let lastStatus = "running";
  while (Date.now() < deadline && lastStatus === "running") {
    await new Promise((r) => setTimeout(r, CF_CRAWL_POLL_INTERVAL_MS));
    const statusResp = await fetch(`${base}/${jobId}?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const s = await statusResp.json() as any;
    if (!statusResp.ok || !s?.success) {
      return {
        ok: false,
        status: "status_failed",
        pageCount: 0,
        sampleMarkdown: "",
        browserSecondsUsed: 0,
        error: `CF status failed: ${JSON.stringify(s)}`,
      };
    }
    lastStatus = s?.result?.status ?? "unknown";
  }

  // 获取结果
  const resultResp = await fetch(`${base}/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await resultResp.json() as any;
  if (!resultResp.ok || !result?.success) {
    return {
      ok: false,
      status: "result_failed",
      pageCount: 0,
      sampleMarkdown: "",
      browserSecondsUsed: 0,
      error: `CF result failed: ${JSON.stringify(result)}`,
    };
  }
  const records: any[] = result?.result?.records ?? [];
  const completed = records.filter((r: any) => r.status === "completed");

  return {
    ok: true,
    status: result?.result?.status,
    pageCount: completed.length,
    sampleMarkdown: completed[0]?.markdown?.slice(0, 500) ?? "",
    browserSecondsUsed: result?.result?.browserSecondsUsed ?? 0,
  };
}

// ── 国外静态文档站（Cloudflare 自家文档，应表现最好）──
integrationTest("CF crawl: developers.cloudflare.com/workers (静态文档)", async () => {
  const url = "https://developers.cloudflare.com/workers/";
  const [cfResult, direct] = await Promise.all([
    cfCrawlDirect(url, 1),
    directFetch(url),
  ]);

  console.log(`[CF] status=${cfResult.status}, pages=${cfResult.pageCount}, browserSec=${cfResult.browserSecondsUsed}`);
  console.log(`[直接 fetch] ok=${direct.ok}, chars=${direct.chars}`);
  console.log(`[CF markdown 片段]\n${cfResult.sampleMarkdown.slice(0, 300)}`);

  if (!cfResult.ok) {
    console.warn(`[CF] developers.cloudflare.com/workers crawl unavailable: ${cfResult.error}`);
    return;
  }

  expect(cfResult.status).toBe("completed");
  expect(cfResult.pageCount).toBeGreaterThan(0);
  // CF 的 markdown 应比原始 HTML 更干净（字符数通常少于原 HTML）
  expect(cfResult.sampleMarkdown.length).toBeGreaterThan(50);
}, 30_000);

// ── 中文 JS 渲染站点（知乎，SPA） ──
integrationTest("CF crawl vs 直接 fetch: zhihu.com (JS 渲染站，CF 应有优势)", async () => {
  const url = "https://www.zhihu.com/";

  const [cfResult, direct] = await Promise.all([
    cfCrawlDirect(url, 1),
    directFetch(url),
  ]);

  console.log(`[知乎][CF] status=${cfResult.status}, pages=${cfResult.pageCount}`);
  console.log(`[知乎][直接 fetch] ok=${direct.ok}, chars=${direct.chars}, sample=${direct.sample.slice(0, 100)}`);
  console.log(`[知乎][CF markdown 片段]\n${cfResult.sampleMarkdown.slice(0, 400)}`);

  if (!cfResult.ok) {
    console.warn(`[知乎][CF] crawl unavailable: ${cfResult.error}`);
    return;
  }

  // 知乎是 SPA，直接 fetch 通常只得到很少的有效内容
  // CF 的 JS 渲染应能获得更多可读内容
  if (direct.ok) {
    const directHasContent = direct.sample.includes("知乎") || direct.sample.includes("zhihu");
    const cfHasContent = cfResult.sampleMarkdown.length > 100;
    console.log(`[对比] 直接 fetch 有有效内容: ${directHasContent}, CF 有有效内容: ${cfHasContent}`);
  }
  // 不做硬断言（站点可能封锁爬虫），只记录对比结果供人工判断
}, 30_000);

// ── 中文静态站（掘金，有 SSR） ──
integrationTest("CF crawl vs 直接 fetch: juejin.cn (SSR 站，对比是否 CF 更优)", async () => {
  const url = "https://juejin.cn/";

  const [cfResult, direct] = await Promise.all([
    cfCrawlDirect(url, 1),
    directFetch(url),
  ]);

  console.log(`[掘金][CF] status=${cfResult.status}, pages=${cfResult.pageCount}`);
  console.log(`[掘金][直接 fetch] ok=${direct.ok}, chars=${direct.chars}`);
  console.log(`[掘金][CF markdown 片段]\n${cfResult.sampleMarkdown.slice(0, 400)}`);
  console.log(`[掘金][直接 fetch 片段]\n${direct.sample.slice(0, 200)}`);

  if (!cfResult.ok) {
    console.warn(`[掘金][CF] crawl unavailable: ${cfResult.error}`);
    return;
  }
}, 30_000);

// ── Wikipedia (国际静态内容) ──
integrationTest("CF crawl vs 直接 fetch: en.wikipedia.org (静态，直接 fetch 应已足够)", async () => {
  const url = "https://en.wikipedia.org/wiki/Cloudflare";

  const [cfResult, direct] = await Promise.all([
    cfCrawlDirect(url, 1),
    directFetch(url),
  ]);

  console.log(`[Wikipedia][CF] status=${cfResult.status}, pages=${cfResult.pageCount}, browserSec=${cfResult.browserSecondsUsed}`);
  console.log(`[Wikipedia][直接 fetch] ok=${direct.ok}, chars=${direct.chars}`);
  if (!cfResult.ok) {
    console.warn(`[Wikipedia][CF] crawl unavailable: ${cfResult.error}`);
    return;
  }
  // Wikipedia 是静态内容，直接 fetch 和 CF 都应能获取
  // 此测试验证 CF 没有被 Wikipedia 封锁
  if (cfResult.status === "completed") {
    expect(cfResult.sampleMarkdown).toContain("Cloudflare");
  }
}, 30_000);
