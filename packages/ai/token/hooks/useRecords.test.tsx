import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

mock.module("app/sessionSnapshot", () => ({
    useSessionSnapshot: () => ({
        token: "test-tok",
        server: "https://server.nolo.test",
        balance: 42,
        userId: "user-1",
    }),
}));

import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useRecords, type RecordsFilter } from "./useRecords";

let dom: JSDOM;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).navigator = dom.window.navigator;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  container = dom.window.document.getElementById("root") as HTMLDivElement;
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

describe("useRecords hook (cursor)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const TestConsumer: React.FC<{
    filter: RecordsFilter;
    onStateChange: (state: ReturnType<typeof useRecords>) => void;
  }> = ({ filter, onStateChange }) => {
    const result = useRecords(filter);
    React.useEffect(() => {
      onStateChange(result);
    }, [result, onStateChange]);
    return (
      <div data-testid="records-count">
        {result.records.length}
        <button onClick={result.loadMore}>load-more</button>
      </div>
    );
  };

  it("loads the first page, then appends the next page via cursor on loadMore", async () => {
    const urls: string[] = [];
    let callCount = 0;

    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      callCount++;
      // 第一页：有更多 → 返回游标
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            records: [{ id: "rec-1", model: "gpt-5.5", cost: 0.01, createdAt: 3000 }],
            nextCursor: "cur-1",
            hasMore: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // 第二页：游标透传 → 结束
      return new Response(
        JSON.stringify({
          success: true,
          records: [{ id: "rec-2", model: "gpt-5.5", cost: 0.02, createdAt: 2000 }],
          nextCursor: null,
          hasMore: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    let state = null as ReturnType<typeof useRecords> | null;
    const startTime = 1787174400000;
    const endTime = 1787259599000;

    await act(async () => {
      root.render(
        
          <TestConsumer
            filter={{ startTime, endTime, model: "全部模型" }}
            onStateChange={(s) => {
              state = s;
            }}
          />
        
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // 首屏：requests 1 页（limit=50，无 cursor），records=第一页，hasMore=true
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(`startTime=${startTime}`);
    expect(urls[0]).toContain(`endTime=${endTime}`);
    expect(urls[0]).toContain("limit=50");
    expect(urls[0]).not.toContain("cursor=");
    expect(state?.records.map((r) => r.id)).toEqual(["rec-1"]);
    expect(state?.hasMore).toBe(true);
    expect(state?.loading).toBe(false);

    // 触发 loadMore：透传 cursor，append 第二页，hasMore 结束
    await act(async () => {
      state?.loadMore();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("cursor=cur-1");
    expect(state?.records.map((r) => r.id)).toEqual(["rec-1", "rec-2"]);
    expect(state?.hasMore).toBe(false);
    expect(state?.loadingMore).toBe(false);
  });

  it("drops stale responses after a window switch (竞态护栏)", async () => {
    const pending: Array<(r: Response) => void> = [];
    globalThis.fetch = (async () =>
      new Promise<Response>((resolve) => {
        pending.push(resolve);
      })) as any;

    let state = null as ReturnType<typeof useRecords> | null;
    const renderWith = (filter: RecordsFilter) =>
      act(() => {
        root.render(
          
            <TestConsumer
              filter={filter}
              onStateChange={(s) => {
                state = s;
              }}
            />
          
        );
      });

    const ok = (records: any[], nextCursor: string | null, hasMore: boolean) =>
      new Response(
        JSON.stringify({ success: true, records, nextCursor, hasMore }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    // 窗口 A 发起请求（挂起）
    renderWith({ startTime: 1000, endTime: 2000, model: "全部模型" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(pending).toHaveLength(1);

    // 窗口切到 B（新的 loadFromStart 请求）
    renderWith({ startTime: 3000, endTime: 4000, model: "全部模型" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(pending).toHaveLength(2);

    // B 先返回 → 展示 B
    await act(async () => {
      pending[1](ok([{ id: "b1", createdAt: 3500 }], null, false));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(state?.records.map((r) => r.id)).toEqual(["b1"]);

    // A 的旧响应后到 → 必须被丢弃，不得污染 B 的列表
    await act(async () => {
      pending[0](ok([{ id: "a1", createdAt: 1500 }], "cur-x", true));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(state?.records.map((r) => r.id)).toEqual(["b1"]);
    expect(state?.hasMore).toBe(false);
  });
});
