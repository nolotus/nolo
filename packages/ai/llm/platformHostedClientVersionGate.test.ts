// packages/ai/llm/platformHostedClientVersionGate.test.ts
//
// 客户端版本闸门第 1 层（目录标注）+ 判定纯函数的机械核对。
import { describe, expect, test } from "bun:test";

import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
  PLATFORM_HOSTED_KIMI_PROVIDER,
  LEGACY_OLLAMA_CLOUD_PROVIDER,
} from "./kimi";
import {
  PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
  PLATFORM_HOSTED_ROUTING_TABLE,
  resolvePlatformHostedMinClientVersion,
} from "./platformHostedRoutingTable";
import { platformHostedModels } from "./platformHosted";
import {
  buildClientVersionGateErrorDetail,
  CLIENT_VERSION_TOO_OLD_CODE,
  evaluatePlatformHostedClientVersionGate,
} from "./platformHostedClientVersionGate";

describe("catalog annotation (layer 1)", () => {
  test("kimi-k3 carries the expected minClientVersion in the routing table", () => {
    expect(PLATFORM_HOSTED_ROUTING_TABLE[PLATFORM_HOSTED_KIMI_K3_MODEL]?.minClientVersion)
      .toBe(PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION);
    // 定值依据：K3 quirk 的本地直连修复 853dbdd5e 最早随 cli-v0.38.0-alpha.4 发布
    expect(PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION).toBe("0.38.0-alpha.4");
  });

  test("the model catalog served to clients ships the same value (no drift)", () => {
    const catalogEntry = platformHostedModels.find(
      (model) => model.name === PLATFORM_HOSTED_KIMI_K3_MODEL,
    );
    expect(catalogEntry).toBeDefined();
    expect((catalogEntry as { minClientVersion?: string }).minClientVersion).toBe(
      PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
    );
  });

  test("catalog and routing table agree on minClientVersion for every hosted model", () => {
    // 漂移守卫：目录是路由表的投影。任何一侧单独改动都会在这里炸。
    const mismatched = platformHostedModels
      .map((model) => {
        const catalogValue = (model as { minClientVersion?: string }).minClientVersion;
        const tableValue = resolvePlatformHostedMinClientVersion(model.name);
        return { name: model.name, catalogValue, tableValue };
      })
      .filter((row) => row.catalogValue !== row.tableValue);
    expect(mismatched).toEqual([]);
  });

  test("kimi-k3 is currently the only gated hosted model (YAGNI)", () => {
    // 标注判据是「有专属 quirk / wire 特殊性」。多标一个就是多一条会随客户端
    // 发版腐化的约束，所以这里把当前集合钉死；新增门控时必须自觉更新本断言。
    const gated = Object.entries(PLATFORM_HOSTED_ROUTING_TABLE)
      .filter(([, entry]) => Boolean(entry.minClientVersion))
      .map(([model]) => model)
      .sort();
    expect(gated).toEqual([PLATFORM_HOSTED_KIMI_K3_MODEL]);
  });

  test("resolvePlatformHostedMinClientVersion returns undefined for ungated / unknown models", () => {
    expect(resolvePlatformHostedMinClientVersion(PLATFORM_HOSTED_KIMI_K26_MODEL)).toBeUndefined();
    expect(resolvePlatformHostedMinClientVersion("glm-5.3")).toBeUndefined();
    expect(resolvePlatformHostedMinClientVersion("not-a-model")).toBeUndefined();
    expect(resolvePlatformHostedMinClientVersion(undefined)).toBeUndefined();
  });
});

describe("evaluatePlatformHostedClientVersionGate (layer 2 decision)", () => {
  const gatedRequest = {
    provider: PLATFORM_HOSTED_KIMI_PROVIDER,
    model: PLATFORM_HOSTED_KIMI_K3_MODEL,
  };

  test("blocks a platform-hosted gated model on a too-old client", () => {
    const decision = evaluatePlatformHostedClientVersionGate({
      ...gatedRequest,
      clientVersion: "0.32.0-alpha.4",
    });
    expect(decision.blocked).toBe(true);
    if (!decision.blocked) throw new Error("unreachable");
    expect(decision.code).toBe(CLIENT_VERSION_TOO_OLD_CODE);
    expect(decision.minClientVersion).toBe(PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION);
    expect(decision.clientVersion).toBe("0.32.0-alpha.4");
    expect(decision.message).toContain("npx nolo-cli@latest");
  });

  test("blocks the legacy ollama-cloud provider alias too", () => {
    const decision = evaluatePlatformHostedClientVersionGate({
      provider: LEGACY_OLLAMA_CLOUD_PROVIDER,
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
      clientVersion: "0.31.0",
    });
    expect(decision.blocked).toBe(true);
  });

  test("normalises casing / whitespace in the model id", () => {
    const decision = evaluatePlatformHostedClientVersionGate({
      provider: " NOLO ",
      model: "  Kimi-K3  ",
      clientVersion: "0.31.0",
    });
    expect(decision.blocked).toBe(true);
  });

  test("passes at exactly the minimum and above", () => {
    for (const version of [
      PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
      "0.38.0-alpha.5",
      "0.38.0",
      "1.2.3",
    ]) {
      expect(
        evaluatePlatformHostedClientVersionGate({
          ...gatedRequest,
          clientVersion: version,
        }).blocked,
      ).toBe(false);
    }
  });

  test("fail-open on missing / unparsable client version", () => {
    for (const version of [undefined, null, "", "   ", "nightly"]) {
      expect(
        evaluatePlatformHostedClientVersionGate({
          ...gatedRequest,
          clientVersion: version,
        }).blocked,
      ).toBe(false);
    }
  });

  test("never gates an ungated hosted model", () => {
    expect(
      evaluatePlatformHostedClientVersionGate({
        provider: PLATFORM_HOSTED_KIMI_PROVIDER,
        model: PLATFORM_HOSTED_KIMI_K26_MODEL,
        clientVersion: "0.1.0",
      }).blocked,
    ).toBe(false);
  });

  test("never gates non-platform providers (custom / OAuth subscription models)", () => {
    for (const provider of [
      "custom",
      "openai",
      "anthropic",
      "moonshot",
      "deepseek",
      "cursor",
      "",
      undefined,
    ]) {
      expect(
        evaluatePlatformHostedClientVersionGate({
          provider,
          model: PLATFORM_HOSTED_KIMI_K3_MODEL,
          clientVersion: "0.1.0",
        }).blocked,
      ).toBe(false);
    }
  });

  test("never gates a custom-API or explicitly-credentialled request", () => {
    expect(
      evaluatePlatformHostedClientVersionGate({
        ...gatedRequest,
        clientVersion: "0.1.0",
        isCustomApi: true,
      }).blocked,
    ).toBe(false);
    expect(
      evaluatePlatformHostedClientVersionGate({
        ...gatedRequest,
        clientVersion: "0.1.0",
        hasExplicitCredential: true,
      }).blocked,
    ).toBe(false);
  });

  test("the error detail carries machine-readable upgrade facts", () => {
    const decision = evaluatePlatformHostedClientVersionGate({
      ...gatedRequest,
      clientVersion: "0.31.7",
    });
    if (!decision.blocked) throw new Error("expected blocked");
    expect(buildClientVersionGateErrorDetail(decision)).toEqual({
      reason: CLIENT_VERSION_TOO_OLD_CODE,
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
      minClientVersion: PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
      clientVersion: "0.31.7",
      upgradeCommand: "npx nolo-cli@latest",
      retryable: false,
    });
  });
});
