import { afterEach, describe, expect, it } from "bun:test";
import {
  auditPublicAgentsAgainstCatalog,
  extractAgentId,
  fetchRawPresetAgentsFromDb,
  type LiveAgentLike,
} from "./verifyPublicAgentCatalogSync";
import type { BuiltinAgentCatalogEntry } from "../../packages/core/builtinAgentCatalog";

const MOCK_CATALOG: BuiltinAgentCatalogEntry[] = [
  {
    id: "01NOLOAPPBLD000000019KCKT0",
    group: "builtin",
    name: "nolo",
    provider: "nolo",
    model: "deepseek-v4-flash",
    runtimeFallback: true,
  },
  {
    id: "01DSV4FLASHPB00000000JFPFD",
    group: "public",
    name: "DeepSeek V4 Flash",
    provider: "nolo",
    model: "deepseek-v4-flash",
    runtimeFallback: true,
  },
  {
    id: "01GPT56SOLPB00000000VXMGCW",
    group: "public",
    name: "GPT-5.6 Sol",
    provider: "openai",
    model: "gpt-5.6-sol",
    runtimeFallback: true,
  },
  {
    id: "01GPTIMG2GEN00000000SSEBOS",
    group: "public",
    name: "GPT Image 2 图片生成器",
    provider: "openai",
    model: "gpt-5.6-luna",
    runtimeFallback: true,
    hasImageOutput: true,
    imageModel: "gpt-image-2",
    imageWorkflow: "generate",
  },
  {
    id: "01INTERNALQWEN000000000001",
    group: "internal",
    name: "Internal Pipeline",
    provider: "nolo",
    model: "qwen3.7-flash",
    runtimeFallback: true,
  },
];

describe("extractAgentId", () => {
  it("extracts id from plain id field", () => {
    expect(extractAgentId({ id: "01DSV4FLASHPB00000000JFPFD" })).toBe(
      "01DSV4FLASHPB00000000JFPFD",
    );
  });

  it("extracts id from agent-pub- dbKey", () => {
    expect(
      extractAgentId({ dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD" }),
    ).toBe("01DSV4FLASHPB00000000JFPFD");
  });

  it("extracts id from agent-pub- id field", () => {
    expect(
      extractAgentId({ id: "agent-pub-01DSV4FLASHPB00000000JFPFD" }),
    ).toBe("01DSV4FLASHPB00000000JFPFD");
  });

  it("extracts id from agent-system- dbKey", () => {
    expect(
      extractAgentId({ dbKey: "agent-system-01DSV4FLASHPB00000000JFPFD" }),
    ).toBe("01DSV4FLASHPB00000000JFPFD");
  });

  it("returns empty string for unrecognized keys", () => {
    expect(extractAgentId({ dbKey: "random-key-without-id" })).toBe("");
    expect(extractAgentId({})).toBe("");
  });
});

describe("auditPublicAgentsAgainstCatalog", () => {
  it("passes when all public agents match catalog definitions and have 0 price", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01NOLOAPPBLD000000019KCKT0",
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        name: "nolo",
        provider: "nolo",
        model: "deepseek-v4-flash",
        userId: "system",
        inputPrice: 0,
        outputPrice: 0,
      },
      {
        id: "01DSV4FLASHPB00000000JFPFD",
        dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        name: "DeepSeek V4 Flash",
        provider: "nolo",
        model: "deepseek-v4-flash",
        userId: "system",
        inputPrice: 0,
        outputPrice: 0,
      },
      {
        id: "01GPT56SOLPB00000000VXMGCW",
        dbKey: "agent-pub-01GPT56SOLPB00000000VXMGCW",
        name: "GPT-5.6 Sol",
        provider: "openai",
        model: "gpt-5.6-sol",
        userId: "system",
        inputPrice: 0,
        outputPrice: 0,
      },
      {
        id: "01GPTIMG2GEN00000000SSEBOS",
        dbKey: "agent-pub-01GPTIMG2GEN00000000SSEBOS",
        name: "GPT Image 2 图片生成器",
        provider: "openai",
        model: "gpt-5.6-luna",
        userId: "system",
        imageModel: "gpt-image-2",
        imageWorkflow: "generate",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    expect(result.ok).toBe(true);
    expect(result.drifts.length).toBe(0);
    expect(result.matchedCount).toBe(4);
  });

  it("detects model mismatch (2026-08-21 nolo Kimi vs DeepSeek incident root cause)", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01NOLOAPPBLD000000019KCKT0",
        name: "nolo",
        provider: "nolo",
        model: "kimi-k2.6", // 线上分叉为 kimi-k2.6
        userId: "system",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    expect(result.ok).toBe(false);
    const modelDrift = result.drifts.find((d) => d.kind === "model_mismatch");
    expect(modelDrift).toBeDefined();
    expect(modelDrift?.expected).toBe("deepseek-v4-flash");
    expect(modelDrift?.actual).toBe("kimi-k2.6");
    expect(modelDrift?.severity).toBe("error");
  });

  it("detects provider mismatch", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01GPT56SOLPB00000000VXMGCW",
        name: "GPT-5.6 Sol",
        provider: "anthropic", // 错误配置为 anthropic
        model: "gpt-5.6-sol",
        userId: "system",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    expect(result.ok).toBe(false);
    const providerDrift = result.drifts.find(
      (d) => d.kind === "provider_mismatch",
    );
    expect(providerDrift).toBeDefined();
    expect(providerDrift?.expected).toBe("openai");
    expect(providerDrift?.actual).toBe("anthropic");
    expect(providerDrift?.severity).toBe("error");
  });

  it("detects unmanaged user ownership on public presets (§2.3 risk)", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01GPT56SOLPB00000000VXMGCW",
        name: "GPT-5.6 Sol",
        provider: "openai",
        model: "gpt-5.6-sol",
        userId: "392282c404", // 挂在普通用户下
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const ownershipDrift = result.drifts.find(
      (d) => d.kind === "ownership_mismatch",
    );
    expect(ownershipDrift).toBeDefined();
    expect(ownershipDrift?.actual).toBe("392282c404");
  });

  it("detects unexpected non-zero pricing on public text model presets", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01GPT56SOLPB00000000VXMGCW",
        name: "GPT-5.6 Sol",
        provider: "openai",
        model: "gpt-5.6-sol",
        userId: "system",
        inputPrice: 40,
        outputPrice: 240,
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const priceDrift = result.drifts.find(
      (d) => d.kind === "unexpected_non_zero_price",
    );
    expect(priceDrift).toBeDefined();
    expect(priceDrift?.actual).toContain("inputPrice=40");
  });

  it("detects orphan system agents not defined in catalog (e.g. Gemini 3 Flash Preview)", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01GOOGLEREVIEW0000000033YO",
        dbKey: "agent-pub-01GOOGLEREVIEW0000000033YO",
        name: "Gemini 3 Flash Preview",
        provider: "google",
        model: "gemini-3-flash-preview",
        userId: "system",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const orphanDrift = result.drifts.find(
      (d) => d.kind === "orphan_system_preset",
    );
    expect(orphanDrift).toBeDefined();
    expect(orphanDrift?.id).toBe("01GOOGLEREVIEW0000000033YO");
    expect(orphanDrift?.severity).toBe("warning");
  });

  it("detects orphan agent-pub- presets owned by non-system user (W3 coverage)", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01ORPHANPUBLIC000000000001",
        dbKey: "agent-pub-01ORPHANPUBLIC000000000001",
        name: "Orphan User Agent with agent-pub prefix",
        provider: "openai",
        model: "gpt-5.6-sol",
        userId: "user-non-system-123",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const orphanDrift = result.drifts.find(
      (d) => d.kind === "orphan_system_preset",
    );
    expect(orphanDrift).toBeDefined();
    expect(orphanDrift?.id).toBe("01ORPHANPUBLIC000000000001");
  });

  it("detects missing catalog entries from public plaza", () => {
    const live: LiveAgentLike[] = [
      // 只有 nolo，缺失其余 3 个 public catalog 条目
      {
        id: "01NOLOAPPBLD000000019KCKT0",
        name: "nolo",
        provider: "nolo",
        model: "deepseek-v4-flash",
        userId: "system",
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const missingDrifts = result.drifts.filter(
      (d) => d.kind === "missing_from_plaza",
    );
    expect(missingDrifts.length).toBe(3);
    expect(missingDrifts.map((d) => d.id)).toContain(
      "01DSV4FLASHPB00000000JFPFD",
    );
  });

  it("detects imageModel and imageWorkflow mismatches", () => {
    const live: LiveAgentLike[] = [
      {
        id: "01GPTIMG2GEN00000000SSEBOS",
        name: "GPT Image 2 图片生成器",
        provider: "openai",
        model: "gpt-5.6-luna",
        userId: "system",
        imageModel: "dall-e-3", // 错误配置
        imageWorkflow: "edit", // 错误配置
      },
    ];

    const result = auditPublicAgentsAgainstCatalog(live, MOCK_CATALOG);
    const imageDrifts = result.drifts.filter(
      (d) => d.id === "01GPTIMG2GEN00000000SSEBOS",
    );
    expect(imageDrifts.length).toBe(2);
    expect(result.ok).toBe(false);
  });
});

describe("fetchRawPresetAgentsFromDb (W2 coverage)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches raw DB records with authorization and maps tombstone", async () => {
    const recordedUrls: string[] = [];
    const recordedHeaders: any[] = [];

    globalThis.fetch = (async (url: any, init: any) => {
      recordedUrls.push(String(url));
      recordedHeaders.push(init?.headers);

      if (String(url).includes("01DSV4FLASHPB00000000JFPFD")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "01DSV4FLASHPB00000000JFPFD",
            name: "DeepSeek V4 Flash",
            model: "deepseek-v4-flash",
            provider: "nolo",
            userId: "system",
            isDeleted: false,
          }),
        } as any;
      }
      if (String(url).includes("01GPT56SOLPB00000000VXMGCW")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "01GPT56SOLPB00000000VXMGCW",
            name: "GPT-5.6 Sol",
            model: "gpt-5.6-sol",
            provider: "openai",
            userId: "system",
            isDeleted: true, // tombstoned
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    }) as any;

    const records = await fetchRawPresetAgentsFromDb(
      "https://test.nolo.chat",
      "test-auth-token",
      MOCK_CATALOG,
    );

    expect(records.length).toBe(2);
    const flash = records.find((r) => r.id === "01DSV4FLASHPB00000000JFPFD");
    expect(flash).toBeDefined();
    expect(flash?.isTombstone).toBe(false);

    const sol = records.find((r) => r.id === "01GPT56SOLPB00000000VXMGCW");
    expect(sol).toBeDefined();
    expect(sol?.isTombstone).toBe(true);

    expect(recordedHeaders[0]?.Authorization).toBe("Bearer test-auth-token");
  });
});
