import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import React, { useSyncExternalStore } from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";
import type { SurfForecastResult } from "./useSurfForecast";

// ---- 可控的 session 快照（模拟 server/token 异步更新触发 effect 重跑） ----
interface SnapshotShape {
  server: string;
  token: string | null;
}

let currentSnapshot: SnapshotShape = { server: "", token: null };
const listeners = new Set<() => void>();

function setSnapshot(next: SnapshotShape): void {
  currentSnapshot = next;
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function getSnapshot(): SnapshotShape {
  return currentSnapshot;
}

mock.module("app/sessionSnapshot", () => ({
  useSessionSnapshot: () =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
}));

let moduleVersion = 0;
async function loadUseSurfForecast(): Promise<
  () => SurfForecastResult
> {
  const mod = await import(`./useSurfForecast?test=${moduleVersion++}`);
  return mod.useSurfForecast;
}

const HookProbe: React.FC<{ hook: () => SurfForecastResult }> = ({ hook }) => {
  const { state, profile, tideUnavailable } = hook();
  return (
    <div>
      <div data-testid="state">{state}</div>
      <div data-testid="profile">{profile ? "yes" : "no"}</div>
      <div data-testid="tideUnavailable">{tideUnavailable ? "na" : "ok"}</div>
    </div>
  );
};

describe("useSurfForecast (M1 bug: fetchedRef guard vs effect cleanup race)", () => {
  let previousFetch: typeof fetch;
  let callCount: number;

  // 第一次 effect 的 marine/wind 请求永久挂起（让 cleanup 有机会取消它），
  // 之后（server/token 变化重跑）的请求立即成功。
  const makeHangingFirstRunFetch = (): typeof fetch => {
    const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes("/api/v1/surf/tide")) {
        return new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      callCount += 1;
      if (callCount <= 2) {
        return new Promise<Response>(() => {});
      }
      return new Response(JSON.stringify({ hourly: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    return impl as unknown as typeof fetch;
  };

  beforeEach(() => {
    callCount = 0;
    currentSnapshot = { server: "", token: null };
    previousFetch = globalThis.fetch;
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
    listeners.clear();
  });

  it("reaches ready after server/token change re-runs the effect (not stuck loading)", async () => {
    const useSurfForecast = await loadUseSurfForecast();
    globalThis.fetch = makeHangingFirstRunFetch();

    const view = await renderInDom(<HookProbe hook={useSurfForecast} />);

    try {
      // 首次 effect 的请求挂起 → loading。
      await flushDomUpdates(1);
      expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe("loading");

      // server/token 异步更新 → effect 重跑，cleanup 取消第一次 fetch。
      await React.act(async () => {
        setSnapshot({ server: "http://s2", token: "tok-2" });
      });
      await flushDomUpdates(2);

      // 修复后：第二次 effect 真正发请求并成功 → ready。
      // 修复前：fetchedRef 守卫让第二次 effect 直接 return，永远卡 loading。
      expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe("ready");
      expect(view.container.querySelector('[data-testid="profile"]')?.textContent).toBe("yes");
    } finally {
      await view.cleanup();
    }
  });
});

// ---- M1.1d-a：独立数据源降级 ----

describe("useSurfForecast 单源降级 (M1.1d-a)", () => {
  let previousFetch: typeof fetch;

  beforeEach(() => {
    currentSnapshot = { server: "http://s", token: "tok" };
    previousFetch = globalThis.fetch;
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
    listeners.clear();
  });

  /** marine 失败、wind 成功、tide 空。 */
  const marineFailWindOk = (): typeof fetch => {
    const impl = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes("/api/v1/surf/tide")) {
        return new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("marine-api")) {
        return new Response("boom", { status: 500 });
      }
      // wind (forecast) 成功，返回空 hourly（无风数据）。
      return new Response(JSON.stringify({ hourly: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    return impl as unknown as typeof fetch;
  };

  /** wind 失败、marine 成功。 */
  const windFailMarineOk = (): typeof fetch => {
    const impl = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes("/api/v1/surf/tide")) {
        return new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("marine-api")) {
        return new Response(JSON.stringify({ hourly: { time: [], wave_height: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // wind (forecast) 失败。
      return new Response("boom", { status: 500 });
    };
    return impl as unknown as typeof fetch;
  };

  it("marine fail + wind success → ready (不整卡 error)", async () => {
    const useSurfForecast = await loadUseSurfForecast();
    globalThis.fetch = marineFailWindOk();
    const view = await renderInDom(<HookProbe hook={useSurfForecast} />);
    try {
      await flushDomUpdates(2);
      expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe("ready");
      expect(view.container.querySelector('[data-testid="profile"]')?.textContent).toBe("yes");
    } finally {
      await view.cleanup();
    }
  });

  it("wind fail + marine success → ready (不整卡 error)", async () => {
    const useSurfForecast = await loadUseSurfForecast();
    globalThis.fetch = windFailMarineOk();
    const view = await renderInDom(<HookProbe hook={useSurfForecast} />);
    try {
      await flushDomUpdates(2);
      expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe("ready");
      expect(view.container.querySelector('[data-testid="profile"]')?.textContent).toBe("yes");
    } finally {
      await view.cleanup();
    }
  });

  it("both OM sources fail → error", async () => {
    const useSurfForecast = await loadUseSurfForecast();
    const impl = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes("/api/v1/surf/tide")) {
        return new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("boom", { status: 500 });
    };
    globalThis.fetch = impl as unknown as typeof fetch;
    const view = await renderInDom(<HookProbe hook={useSurfForecast} />);
    try {
      await flushDomUpdates(2);
      expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe("error");
      expect(view.container.querySelector('[data-testid="profile"]')?.textContent).toBe("no");
    } finally {
      await view.cleanup();
    }
  });
});
