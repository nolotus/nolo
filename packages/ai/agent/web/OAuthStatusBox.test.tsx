// Component test for OAuthStatusBox — the OAuth connection-state machine
// that manages the four states (loading / not_connected / connected /
// error), the sign-in modal, the Disconnect action, and the polling fix
// from kimi-code review Blocker #1 (stale closure must not overwrite a
// successful "connected" with "error" after 15 ticks).
//
// NOTE: The "loading" state is tested indirectly — it's the initial
// state before the fetch resolves. In JSDOM, `Promise.resolve()` inside
// `fetch` is flushed instantly by `act()`, so "Checking connection"
// is never visible to the DOM. The tests below verify the final state
// transitions instead.

import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type StatusPayload = {
  connected: boolean;
  email?: string;
  accountId?: string;
  expiresAt?: number;
};

type OAuthStatusBoxModule = {
  OAuthStatusBox: React.ComponentType<{
    providerId: string;
    serverOrigin: string;
    authToken: string;
  }>;
};

const buildStatusJsonResponse = (
  status: number,
  payload: StatusPayload | { error: string }
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const buildEmptyResponse = (status: number) => new Response("", { status });

let moduleVersion = 0;
const loadModule = async (): Promise<OAuthStatusBoxModule["OAuthStatusBox"]> => {
  const actualReactI18Next = await import("react-i18next");
  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
  }));
  // bun test 不跑 @stylexjs babel 编译；组件链上的 StyleX 样式模块
  // （modelSourceStyles）在运行时调用 create/keyframes 会抛错，给一个
  // 结构兼容的测试替身（class 合并语义对渲染断言无关紧要）。
  let stylexTestId = 0;
  const stylexProps = (...args: unknown[]) => {
    const classNames: string[] = [];
    for (const arg of args) {
      if (!arg || typeof arg !== "object") continue;
      for (const key of Object.keys(arg as Record<string, unknown>)) {
        classNames.push(key);
      }
    }
    return { className: classNames.join(" "), style: {} };
  };
  mock.module("@stylexjs/stylex", () => ({
    create: (styles: Record<string, unknown>) => styles,
    keyframes: (_frames: unknown) => `test-keyframes-${stylexTestId++}`,
    props: stylexProps,
  }));
  mock.module("render/web/ui/Button", () => ({
    __esModule: true,
    default: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      [k: string]: unknown;
    }) => React.createElement("button", { onClick }, children),
  }));
  const module = (await import(
    `./OAuthStatusBox.tsx?test=${moduleVersion++}`
  )) as OAuthStatusBoxModule;
  return module.OAuthStatusBox;
};

describe("OAuthStatusBox", () => {
  const serverOrigin = "https://api.test.com";
  const authToken = "test-token";
  const providerId = "xai";

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
    (dom.window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    (dom.window as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
      (cb: () => void) => setTimeout(cb, 0) as unknown as number;
    (dom.window as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame =
      (id: number) => clearTimeout(id);
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  // Drain React's scheduler while `window` is still defined. Unmount and
  // poll-driven setState leave MessageChannel/setTimeout work that reads
  // `window.event` in react-dom; deleting window first causes
  // "ReferenceError: window is not defined" as an unhandled inter-test error.
  const flushReactScheduler = async (times = 2): Promise<void> => {
    for (let i = 0; i < times; i += 1) {
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
  };

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
      root = null;
    }
    await flushReactScheduler(3);
    try {
      dom.window.close();
    } catch {
      /* jsdom may already be closed */
    }
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

  const renderBox = async (
    Box: OAuthStatusBoxModule["OAuthStatusBox"]
  ): Promise<void> => {
    if (!root) throw new Error("root not initialised");
    await act(async () => {
      root!.render(
        <Box
          providerId={providerId}
          serverOrigin={serverOrigin}
          authToken={authToken}
        />
      );
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
      // Poll-interval setState runs on real timers; wrap each spin in act so
      // React commits under the act environment instead of leaking work past
      // the assertion into afterEach teardown.
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10);
        });
      });
    }
    await flushReactScheduler();
  };

  test("renders not_connected when status endpoint returns 404", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(buildEmptyResponse(404))
    ) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);
    // The "loading" state is flushed instantly in JSDOM (fetch resolves
    // synchronously), so we check for the final "not_connected" state.
    // The "not_connected" state shows "Sign in on this device" and the
    // nolo auth command — NOT "Not signed in" (that's the error state
    // when authToken is empty, which is a different test).
    expect(
      container.textContent?.indexOf("Sign in on this device")
    ).toBeGreaterThanOrEqual(0);
    expect(
      container.textContent?.indexOf("nolo auth xai --sync-to-server")
    ).toBeGreaterThanOrEqual(0);
  });

  test("renders connected state with email and disconnect link", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        buildStatusJsonResponse(200, {
          connected: true,
          email: "user@example.com",
          expiresAt: Date.now() + 60 * 60_000,
        })
      )
    ) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);
    expect(
      container.textContent?.indexOf("Signed in as user@example.com")
    ).toBeGreaterThanOrEqual(0);
    const disconnectLink = container.querySelector("a");
    expect(disconnectLink?.textContent).toBe("Disconnect");
  });

  test("renders error state on non-404 error status", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        buildStatusJsonResponse(503, { error: "server_not_configured" })
      )
    ) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);
    expect(container.textContent?.indexOf("Status 503")).toBeGreaterThanOrEqual(
      0
    );
  });

  test("renders error state when serverOrigin is empty", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(buildEmptyResponse(404))
    ) as unknown as typeof fetch;
    const Box = await loadModule();
    if (!root) throw new Error("root not initialised");
    await act(async () => {
      root!.render(
        <Box providerId={providerId} serverOrigin="" authToken={authToken} />
      );
    });
    expect(
      container.textContent?.indexOf("Server origin not configured")
    ).toBeGreaterThanOrEqual(0);
  });

  test("opens and closes the sign-in modal", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(buildEmptyResponse(404))
    ) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);

    const openButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").indexOf("Sign in on this device") >= 0
    );
    expect(openButton).toBeDefined();
    if (openButton) {
      await act(async () => {
        openButton.click();
      });
    }
    expect(container.textContent?.indexOf("Sign in to xai")).toBeGreaterThanOrEqual(
      0
    );
    expect(
      container.textContent?.indexOf("nolo auth xai --sync-to-server")
    ).toBeGreaterThanOrEqual(0);

    const closeButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "Close"
    );
    expect(closeButton).toBeDefined();
    if (closeButton) {
      await act(async () => {
        closeButton.click();
      });
    }
    // Modal should be closed — "Sign in to xai" disappears
    expect(container.textContent?.indexOf("Sign in to xai")).toBeLessThan(0);
  });

  test("Disconnect calls DELETE and returns to not_connected state", async () => {
    let deleteCalled = false;
    let statusCallCount = 0;
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.indexOf("/status") >= 0) {
        statusCallCount += 1;
        if (statusCallCount === 1) {
          return Promise.resolve(
            buildStatusJsonResponse(200, {
              connected: true,
              email: "user@example.com",
              expiresAt: Date.now() + 60 * 60_000,
            })
          );
        }
        return Promise.resolve(buildEmptyResponse(404));
      }
      if (url.indexOf("/api/oauth/") >= 0) {
        deleteCalled = true;
        return Promise.resolve(buildEmptyResponse(200));
      }
      return Promise.resolve(buildEmptyResponse(404));
    }) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);
    expect(
      container.textContent?.indexOf("Signed in as user@example.com")
    ).toBeGreaterThanOrEqual(0);

    const disconnectLink = Array.from(container.querySelectorAll("a")).find(
      (a) => (a.textContent ?? "").trim() === "Disconnect"
    );
    expect(disconnectLink).toBeDefined();
    if (disconnectLink) {
      await act(async () => {
        disconnectLink.click();
      });
    }
    expect(deleteCalled).toBe(true);
    // After disconnect, should show "not_connected" state
    expect(
      container.textContent?.indexOf("Sign in on this device")
    ).toBeGreaterThanOrEqual(0);
  });

  test("polling stops and closes the modal when status flips to connected (kimi review Blocker #1)", async () => {
    let statusCallCount = 0;
    globalThis.fetch = mock(() => {
      statusCallCount += 1;
      if (statusCallCount <= 1) {
        return Promise.resolve(buildEmptyResponse(404));
      }
      return Promise.resolve(
        buildStatusJsonResponse(200, {
          connected: true,
          email: "user@example.com",
          expiresAt: Date.now() + 60 * 60_000,
        })
      );
    }) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);

    const openButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").indexOf("Sign in on this device") >= 0
    );
    expect(openButton).toBeDefined();
    if (openButton) {
      await act(async () => {
        openButton.click();
      });
    }

    const iveRunItButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "I've run it"
    );
    expect(iveRunItButton).toBeDefined();
    if (iveRunItButton) {
      await act(async () => {
        iveRunItButton.click();
      });
    }

    // The poll should eventually see "connected" and close the modal.
    await waitFor(() =>
      Boolean(
        container.textContent &&
          container.textContent.indexOf("Signed in as user@example.com") >= 0
      )
    );
    // Modal should be closed
    expect(container.textContent?.indexOf("Sign in to xai")).toBeLessThan(0);
  });

  test("polling shows error after 15 ticks if status stays 404 (kimi review Blocker #1)", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(buildEmptyResponse(404))
    ) as unknown as typeof fetch;
    const Box = await loadModule();

    await renderBox(Box);

    const openButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").indexOf("Sign in on this device") >= 0
    );
    expect(openButton).toBeDefined();
    if (openButton) {
      await act(async () => {
        openButton.click();
      });
    }

    const iveRunItButton = Array.from(container.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "I've run it"
    );
    expect(iveRunItButton).toBeDefined();
    if (iveRunItButton) {
      await act(async () => {
        iveRunItButton.click();
      });
    }

    // After 15 ticks (30s @ 2s interval), the polling should stop and show
    // "Still not connected" error.
    await waitFor(
      () => {
        if (!container.textContent) return false;
        return container.textContent.indexOf("Still not connected") >= 0;
      },
      40_000
    );
  }, 45_000);
});
