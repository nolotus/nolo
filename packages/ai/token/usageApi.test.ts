import { describe, expect, test, afterEach } from "bun:test";
import {
  fetchTokenStats,
  fetchUsageRecordsPage,
  fetchAllUsageRecords,
} from "./usageApi";

const DEPS = { server: "https://server.nolo.test/", token: "test-tok" };

describe("usageApi remote integration", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockJson = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  test("fetchTokenStats hits /usage/stats with auth and maps days to timeKey", async () => {
    let requestedUrl = "";
    let requestedHeaders = {} as Record<string, string>;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedHeaders = Object.fromEntries(
        new Headers((init as any)?.headers).entries()
      );
      return mockJson({
        success: true,
        days: [
          { date: "2026-08-20", total: { cost: 3 } },
          { date: "2026-08-21", total: { cost: 1 } },
        ],
      });
    }) as any;

    const days = await fetchTokenStats(DEPS, {
      startDate: "2026-08-20",
      endDate: "2026-08-21",
      period: "day",
    });

    expect(requestedUrl).toContain("/api/v1/usage/stats");
    expect(requestedUrl).toContain("startDate=2026-08-20");
    expect(requestedUrl).toContain("endDate=2026-08-21");
    expect(requestedUrl).toContain("period=day");
    expect(requestedHeaders["authorization"]).toBe("Bearer test-tok");
    // server 尾部斜杠被归一（不应出现 //api 双斜杠）
    expect(requestedUrl).not.toContain("//api/");
    expect(days).toHaveLength(2);
    expect(days[0].timeKey).toBe("2026-08-20");
  });

  test("fetchTokenStats throws on 401", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ success: false, error: { message: "unauthorized" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )) as any;

    await expect(
      fetchTokenStats(DEPS, { startDate: "2026-08-20", endDate: "2026-08-21" })
    ).rejects.toThrow(/unauthorized/);
  });

  test("fetchUsageRecordsPage forwards window/model/limit and no cursor on first page", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return mockJson({
        success: true,
        records: [{ id: "rec-1", cost: 0.01, createdAt: 3000 }],
        nextCursor: "cur-1",
        hasMore: true,
      });
    }) as any;

    const page = await fetchUsageRecordsPage(DEPS, {
      startTime: 1000,
      endTime: 2000,
      model: "claude-3-opus",
      pageSize: 50,
    });

    expect(requestedUrl).toContain("/api/v1/usage/records");
    expect(requestedUrl).toContain("startTime=1000");
    expect(requestedUrl).toContain("endTime=2000");
    expect(requestedUrl).toContain("model=claude-3-opus");
    expect(requestedUrl).toContain("limit=50");
    // 哨兵「全部模型」不透传
    expect(requestedUrl).not.toContain("model=" + encodeURIComponent("全部模型"));
    expect(page.nextCursor).toBe("cur-1");
    expect(page.hasMore).toBe(true);
  });

  test("fetchAllUsageRecords loops cursor until hasMore=false", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      const withCursor = String(url).includes("cursor=");
      return mockJson({
        success: true,
        records: [{ id: withCursor ? "r2" : "r1", createdAt: 2000 }],
        nextCursor: withCursor ? null : "cur-1",
        hasMore: !withCursor,
      });
    }) as any;

    const result = await fetchAllUsageRecords(DEPS, {
      startTime: 0,
      endTime: 3000,
    });

    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("cursor=cur-1");
    expect(result.total).toBe(2);
    expect(result.records.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
