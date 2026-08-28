import { describe, expect, it } from "bun:test";

import {
  fetchDiscoveredModels,
  isDiscoverablePreset,
  mergeModelOptionsWithDiscovery,
} from "./providerModelDiscoveryClient";

function mockFetch(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: { url: string; headers: Record<string, string>; body?: string }[] } {
  const calls: { url: string; headers: Record<string, string>; body?: string }[] = [];
  const fetchImpl = ((url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    calls.push({
      url: u,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return Promise.resolve(impl(u, init));
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe("isDiscoverablePreset", () => {
  it("covers Z.AI coding plan (必含) and other OpenAI-compatible presets", () => {
    expect(isDiscoverablePreset("zai-coding-plan")).toBe(true);
    expect(isDiscoverablePreset("bigmodel-coding-plan")).toBe(true);
    expect(isDiscoverablePreset("openai-api")).toBe(true);
    expect(isDiscoverablePreset("kimi-api")).toBe(true);
    // 非 OpenAI-compatible / 聚合 endpoint / manual → 客户端就不发请求
    expect(isDiscoverablePreset("anthropic-api")).toBe(false);
    expect(isDiscoverablePreset("gemini-api")).toBe(false);
    expect(isDiscoverablePreset("token-plan")).toBe(false);
    expect(isDiscoverablePreset("manual")).toBe(false);
    expect(isDiscoverablePreset("")).toBe(false);
  });
});

describe("mergeModelOptionsWithDiscovery", () => {
  const staticZai = [
    { id: "glm-5.3-flash", label: "GLM 5.3 Flash", recommended: true, hasVision: true },
    { id: "glm-5.3", label: "GLM 5.3" },
    { id: "glm-5-turbo", label: "GLM 5 Turbo" },
    { id: "glm-4.7", label: "GLM 4.7" },
  ];

  it("returns static options unchanged when discovery is null (failure fallback)", () => {
    expect(mergeModelOptionsWithDiscovery(staticZai, null)).toEqual(staticZai);
    expect(
      mergeModelOptionsWithDiscovery(staticZai, { source: "static", models: [] }),
    ).toEqual(staticZai);
  });

  it("keeps static order, appends live-only models, dedupes by id", () => {
    const live = {
      source: "live" as const,
      models: [
        { id: "glm-4.7", label: "GLM 4.7" },
        { id: "glm-5.3", label: "GLM 5.3", hasVision: true },
        { id: "glm-5.3-flash", label: "GLM 5.3 Flash", recommended: true, hasVision: true },
        { id: "glm-5.5", label: "glm-5.5" },
        { id: "glm-4.6", label: "glm-4.6" },
      ],
    };
    const merged = mergeModelOptionsWithDiscovery(staticZai, live);
    expect(merged.map((m) => m.id)).toEqual([
      "glm-5.3-flash",
      "glm-5.3",
      "glm-5-turbo",
      "glm-4.7",
      "glm-5.5",
      "glm-4.6",
    ]);
    // 同 id 时 live 覆盖静态：glm-5.3 获得 hasVision
    expect(merged.find((m) => m.id === "glm-5.3")).toMatchObject({ hasVision: true });
  });

  it("keeps exactly one recommended entry", () => {
    const live = {
      source: "live" as const,
      models: [
        { id: "glm-4.6", label: "glm-4.6", recommended: true },
        { id: "glm-5.3-flash", label: "GLM 5.3 Flash", recommended: true },
      ],
    };
    const merged = mergeModelOptionsWithDiscovery(staticZai, live);
    const recs = merged.filter((m) => m.recommended);
    expect(recs).toHaveLength(1);
    // defaultModel（静态 recommended）优先
    expect(recs[0].id).toBe("glm-5.3-flash");
  });
});

describe("fetchDiscoveredModels", () => {
  it("posts presetId+apiKey to the server endpoint and parses live models", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      new Response(
        JSON.stringify({
          ok: true,
          presetId: "zai-coding-plan",
          source: "live",
          models: [{ id: "glm-5.3-flash", label: "glm-5.3-flash", hasVision: true, recommended: true }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const r = await fetchDiscoveredModels({
      serverOrigin: "http://localhost:38123/",
      token: "tk",
      presetId: "zai-coding-plan",
      apiKey: "sk-zai",
      fetchImpl,
    });
    expect(r).toMatchObject({ source: "live", models: [{ id: "glm-5.3-flash" }] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost:38123/api/agents/providers/discover-models");
    expect(calls[0].headers.Authorization).toBe("Bearer tk");
    expect(JSON.parse(calls[0].body ?? "{}")).toEqual({
      presetId: "zai-coding-plan",
      apiKey: "sk-zai",
    });
  });

  it("returns null for non-whitelisted preset (no request)", async () => {
    const { fetchImpl, calls } = mockFetch(() => new Response("{}", { status: 200 }));
    const r = await fetchDiscoveredModels({
      serverOrigin: "http://localhost",
      token: "tk",
      presetId: "manual",
      apiKey: "sk-x",
      fetchImpl,
    });
    expect(r).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("returns null on 409/500/network error (UI keeps static options)", async () => {
    const { fetchImpl } = mockFetch(() => new Response("conflict", { status: 409 }));
    expect(
      await fetchDiscoveredModels({ serverOrigin: "http://localhost", token: "tk", presetId: "zai-coding-plan", apiKey: "sk", fetchImpl }),
    ).toBeNull();
    const boom = ((() => {
      throw new Error("net down");
    }) as unknown) as typeof fetch;
    expect(
      await fetchDiscoveredModels({ serverOrigin: "http://localhost", token: "tk", presetId: "zai-coding-plan", apiKey: "sk", fetchImpl: boom }),
    ).toBeNull();
  });

  it("returns null when models list is empty (never render an empty dropdown)", async () => {
    const { fetchImpl } = mockFetch(() =>
      new Response(JSON.stringify({ ok: true, source: "live", models: [] }), { status: 200 }),
    );
    const r = await fetchDiscoveredModels({
      serverOrigin: "http://localhost",
      token: "tk",
      presetId: "zai-coding-plan",
      apiKey: "sk",
      fetchImpl,
    });
    expect(r).toBeNull();
  });
});
