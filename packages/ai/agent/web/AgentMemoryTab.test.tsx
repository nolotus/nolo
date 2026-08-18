import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const realReactI18Next = { ...(await import("react-i18next")) };
const realAppStore = { ...(await import("app/store")) };
const realSettingSlice = {
  ...(await import("app/settings/settingSlice")),
};
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realToast = { ...(await import("app/utils/toast")) };
const realButton = { ...(await import("render/web/ui/Button")) };
const realIdentity = { ...(await import("identity")) };

// mock.restore() 清不掉 mock.module——漏还原会污染后续 suite 文件。
const restoreLeakedModuleMocks = () => {
  mock.module("react-i18next", () => realReactI18Next);
  mock.module("app/store", () => realAppStore);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/utils/toast", () => realToast);
  mock.module("render/web/ui/Button", () => realButton);
  mock.module("identity", () => realIdentity);
};

type AgentMemoryTabModule = {
  default: React.ComponentType<{
    agentId?: string;
    agentKey?: string;
  }>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const memoryItem = {
  id: "memory-1",
  ownerType: "user",
  ownerId: "user-1",
  subjectId: "agent:test",
  kind: "semantic",
  content: "Prefers concise answers",
  createdAt: "2026-07-16T00:00:00.000Z",
  lastActivatedAt: "2026-07-16T00:00:00.000Z",
  activationCount: 1,
  confidence: 0.9,
};

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

let moduleVersion = 0;
const translate = (
  key: string,
  fallback?: string,
  options?: Record<string, unknown>
) =>
  (fallback ?? key).replace(
    "{{count}}",
    String(options?.count ?? "{{count}}")
  );

const loadModule = async (): Promise<AgentMemoryTabModule["default"]> => {
  mock.module("react-i18next", () => ({
    ...realReactI18Next,
    useTranslation: () => ({
      t: translate,
    }),
  }));
  const realIdentity = await import("identity");
  mock.module("identity", () => ({
    ...realIdentity,
    useToken: () => "test-token",
    useUserId: () => "user-1",
  }));
  
  mock.module("app/store", () => ({
    ...realAppStore,
    useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
  }));
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "https://api.test",
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "test-token",
    selectUserId: () => "user-1",
  }));
  mock.module("app/utils/toast", () => ({
    ...realToast,
    toast: {
      success: () => {},
      error: () => {},
    },
  }));
  mock.module("render/web/ui/Button", () => ({
    ...realButton,
    default: ({
      children,
      disabled,
      icon,
      onClick,
      title,
    }: {
      children?: React.ReactNode;
      disabled?: boolean;
      icon?: React.ReactNode;
      onClick?: () => void;
      title?: string;
    }) => (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title}
      >
        {icon}
        {children}
      </button>
    ),
  }));

  const module = (await import(
    `./AgentMemoryTab.tsx?test=${moduleVersion++}`
  )) as AgentMemoryTabModule;
  return module.default;
};

describe("AgentMemoryTab", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      { url: "http://localhost" }
    );
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousFetch = globalThis.fetch;
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
    });
    (
      dom.window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
      root = null;
    }
    dom.window.close();
    if (previousWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      globalThis.window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete (globalThis as { document?: Document }).document;
    } else {
      globalThis.document = previousDocument;
    }
    if (previousFetch === undefined) {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    } else {
      globalThis.fetch = previousFetch;
    }
    mock.restore();
  });

  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  const renderTab = async (
    AgentMemoryTab: AgentMemoryTabModule["default"]
  ): Promise<void> => {
    await act(async () => {
      root!.render(<AgentMemoryTab agentKey="agent:test" />);
    });
  };

  const waitFor = async (
    predicate: () => boolean,
    timeoutMs = 2000
  ): Promise<void> => {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("waitFor timed out");
      }
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      });
    }
  };

  test("shows the loaded count when the list response has a next cursor", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        jsonResponse({ items: [memoryItem], nextCursor: "next-page" })
      )
    ) as unknown as typeof fetch;
    const AgentMemoryTab = await loadModule();

    await renderTab(AgentMemoryTab);
    await waitFor(() =>
      Boolean(container.querySelector(".agent-memory-tab__truncated-hint"))
    );

    expect(
      container.querySelector(".agent-memory-tab__truncated-hint")?.textContent
    ).toBe("记忆较多，当前显示最近 1 条；更早内容未展示。");
  });

  test("clears the old truncation hint as soon as refresh starts", async () => {
    const refreshResponse = deferred<Response>();
    let requestCount = 0;
    globalThis.fetch = mock(() => {
      requestCount += 1;
      if (requestCount === 1) {
        return Promise.resolve(
          jsonResponse({ items: [memoryItem], nextCursor: "next-page" })
        );
      }
      return refreshResponse.promise;
    }) as unknown as typeof fetch;
    const AgentMemoryTab = await loadModule();

    await renderTab(AgentMemoryTab);
    await waitFor(() =>
      Boolean(container.querySelector(".agent-memory-tab__truncated-hint"))
    );

    const refreshButton = container.querySelector(
      'button[title="刷新"]'
    ) as HTMLButtonElement;
    await act(async () => {
      refreshButton.click();
    });

    expect(
      container.querySelector(".agent-memory-tab__truncated-hint")
    ).toBeNull();
    expect(container.textContent).toContain(memoryItem.content);

    await act(async () => {
      refreshResponse.resolve(jsonResponse({ items: [memoryItem] }));
      await refreshResponse.promise;
    });
    await waitFor(() => !refreshButton.disabled);
    expect(
      container.querySelector(".agent-memory-tab__truncated-hint")
    ).toBeNull();
  });

  test("renders the add-memory form and keeps submit disabled until input", async () => {
    const calls: Array<{ url: string; body: any }> = [];
    globalThis.fetch = mock(async (input: string, init?: { body?: string }) => {
      const url = typeof input === "string" ? input : (input as any)?.url;
      let body: any = null;
      try {
        body = init?.body ? JSON.parse(init.body) : undefined;
      } catch {}
      calls.push({ url, body });
      if (url.endsWith("/api/memory/list")) {
        return Promise.resolve(jsonResponse({ items: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    }) as unknown as typeof fetch;

    const AgentMemoryTab = await loadModule();
    await renderTab(AgentMemoryTab);
    await waitFor(() =>
      Boolean(container.querySelector(".agent-memory-tab__add"))
    );

    // 表单元素存在
    const textarea = container.querySelector(
      ".agent-memory-tab__add-input"
    ) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.placeholder).toContain("记住");

    const submitButton = Array.from(
      container.querySelectorAll("button")
    ).find((btn) => btn.textContent?.includes("添加记忆")) as HTMLButtonElement;
    expect(submitButton).toBeTruthy();

    // 空 draft 时提交按钮 disabled，不会触发 remember 请求
    expect(submitButton.disabled).toBe(true);
    const rememberCallsBefore = calls.filter((c) =>
      c.url.endsWith("/api/memory/remember")
    );
    expect(rememberCallsBefore).toHaveLength(0);
  });
});
