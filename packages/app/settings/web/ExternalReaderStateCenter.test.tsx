import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let moduleVersion = 0;

const loadExternalReaderStateCenter = async () => {
  mock.module("react-i18next", () => ({
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  }));
  mock.module("app/routing", () => ({
    Link: ({ children, to, ...props }: any) => (
      <a href={String(to ?? "#")} {...props}>
        {children}
      </a>
    ),
    NavLink: ({ children, to, ...props }: any) => (
      <a href={String(to ?? "#")} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({ hash: "", pathname: "/", search: "" }),
    useNavigate: () => () => {},
  }));

  const module = await import(
    `./ExternalReaderStateCenter.tsx?test=${moduleVersion++}`
  );
  return module.default;
};

describe("ExternalReaderStateCenter", () => {
  let dom: JSDOM;
  let root: Root | null = null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousFetch: typeof globalThis.fetch | undefined;
  let fetchMockCalls: { url: string; options: any }[] = [];

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousFetch = globalThis.fetch;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
    });
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);

    fetchMockCalls = [];
    globalThis.fetch = (async (input, init) => {
      fetchMockCalls.push({ url: String(input), options: init });
      if (String(input).endsWith("/api/external-readers/xhs/status")) {
        return new Response(
          JSON.stringify({
            ok: true,
            providerId: "xhs",
            providerLabel: "小红书",
            status: "unknown",
            mode: "desktop",
            message: "匿名公开预览模式",
            diagnostic: { code: "anonymous_only" },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }) as typeof fetch;

    dom.window.confirm = () => true;
    dom.window.alert = () => {};
  });

  afterEach(() => {
    mock.restore();
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
    });
    if (previousFetch === undefined) {
      delete (globalThis as any).fetch;
    } else {
      globalThis.fetch = previousFetch;
    }
  });

  const getViews = () => {
    return {
      getByText: (text: string) => {
        const elements = container.querySelectorAll("*");
        for (const el of Array.from(elements)) {
          if (
            el.textContent === text ||
            (el.childNodes.length === 1 &&
              el.childNodes[0].nodeType === 3 &&
              el.childNodes[0].nodeValue?.trim() === text)
          ) {
            return el;
          }
        }
        for (const el of Array.from(elements)) {
          if (el.textContent?.includes(text)) {
            return el;
          }
        }
        throw new Error(`Element with text "${text}" not found`);
      },
      queryByText: (text: string) => {
        try {
          return getViews().getByText(text);
        } catch {
          return null;
        }
      },
      getByRole: (role: string, options?: { name?: string }) => {
        const selector = role === "button" ? "button, [role='button']" : `[role='${role}']`;
        const elements = container.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          if (options?.name) {
            if (
              el.textContent?.trim() === options.name ||
              el.getAttribute("aria-label") === options.name
            ) {
              return el;
            }
          } else {
            return el;
          }
        }
        throw new Error(`Element with role "${role}" and name "${options?.name}" not found`);
      },
    };
  };

  it("renders the generic state center and displays desktop requirement on web", async () => {
    const ExternalReaderStateCenter = await loadExternalReaderStateCenter();
    await act(async () => {
      root!.render(
        <ExternalReaderStateCenter
          currentToken="test-token"
          serverBase="http://localhost:8080"
          isDesktop={false}
        />,
      );
    });

    const view = getViews();
    expect(view.getByText("外部平台读取器")).toBeTruthy();
    expect(view.getByText("小红书")).toBeTruthy();
    expect(view.getByText("需要桌面端")).toBeTruthy();
    expect((view.getByRole("button", { name: "查看策略" }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.queryByText("打开登录窗口")).toBeNull();
    expect(view.queryByText("重置登录态")).toBeNull();
  });

  it("does not display desktop requirement when isDesktop is true", async () => {
    const ExternalReaderStateCenter = await loadExternalReaderStateCenter();
    await act(async () => {
      root!.render(
        <ExternalReaderStateCenter
          currentToken="test-token"
          serverBase="http://localhost:8080"
          isDesktop={true}
        />,
      );
    });

    const view = getViews();
    expect(view.getByText("外部平台读取器")).toBeTruthy();
    expect(view.queryByText("需要桌面端")).toBeNull();
  });

  it("calls the generic status route when clicking testing button", async () => {
    const ExternalReaderStateCenter = await loadExternalReaderStateCenter();
    await act(async () => {
      root!.render(
        <ExternalReaderStateCenter
          currentToken="test-token"
          serverBase="http://localhost:8080"
          isDesktop={true}
        />,
      );
    });

    const view = getViews();
    const testBtn = view.getByRole("button", { name: "查看策略" }) as HTMLButtonElement;

    await act(async () => {
      testBtn.click();
    });

    expect(fetchMockCalls.length).toBe(1);
    expect(fetchMockCalls[0].url).toBe("http://localhost:8080/api/external-readers/xhs/status");
    expect(fetchMockCalls[0].options.method).toBe("POST");
    expect(fetchMockCalls[0].options.headers["Authorization"]).toBe("Bearer test-token");
    expect(view.getByText("未知")).toBeTruthy();
    expect(view.getByText("匿名公开预览模式")).toBeTruthy();
    expect(view.getByText("[诊断代码: anonymous_only]")).toBeTruthy();
  });

  it("displays anonymous-unavailable guide without login actions", async () => {
    const ExternalReaderStateCenter = await loadExternalReaderStateCenter();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/api/external-readers/xhs/status")) {
        return new Response(
          JSON.stringify({
            ok: true,
            providerId: "xhs",
            providerLabel: "小红书",
            status: "needs_login",
            mode: "desktop",
            message: "匿名公开访问遇到登录墙",
          }),
          { status: 200 },
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    await act(async () => {
      root!.render(
        <ExternalReaderStateCenter
          currentToken="test-token"
          serverBase="http://localhost:8080"
          isDesktop={true}
        />,
      );
    });

    const view = getViews();
    const testBtn = view.getByRole("button", { name: "查看策略" }) as HTMLButtonElement;

    await act(async () => {
      testBtn.click();
    });

    expect(view.getByText("匿名不可见")).toBeTruthy();
    expect(view.getByText("提示：该页面要求登录后访问")).toBeTruthy();
    expect(view.queryByText("打开登录窗口")).toBeNull();

    globalThis.fetch = originalFetch;
  });
});
