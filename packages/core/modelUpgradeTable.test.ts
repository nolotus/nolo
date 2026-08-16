import { expect, test } from "bun:test";
import {
  MODEL_UPGRADE_TABLE,
  lookupModelUpgrade,
  resolveModelUpgrade,
} from "./modelUpgradeTable";

test("GLM 5.2 已恢复上架：nolo/glm-5.2 不再命中迁移", () => {
  const hit = lookupModelUpgrade("nolo", "glm-5.2");
  expect(hit).toBeUndefined();
});

test("lookup 大小写不敏感", () => {
  expect(
    lookupModelUpgrade("DeepSeek", "DEEPSEEK-V4-FLASH")?.to,
  ).toEqual({ provider: "nolo", model: "deepseek-v4-flash" });
  expect(lookupModelUpgrade("  deepseek  ", "  deepseek-v4-pro  ")?.to.model).toBe(
    "deepseek-v4-pro",
  );
});

test("lookup 未命中返回 undefined", () => {
  expect(lookupModelUpgrade("nolo", "kimi-k2.6")).toBeUndefined();
  expect(lookupModelUpgrade("nolo", undefined)).toBeUndefined();
  expect(lookupModelUpgrade(undefined, "glm-5.2")).toBeUndefined();
  expect(lookupModelUpgrade("deepseek", "kimi-k2.6")).toBeUndefined();
});

test("deepseek provider 已下架：deepseek-v4-* 全部命中迁移到 nolo", () => {
  expect(lookupModelUpgrade("deepseek", "deepseek-v4-flash")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-flash",
  });
  expect(lookupModelUpgrade("deepseek", "deepseek-v4-pro")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-pro",
  });
});

test("Claude 记录侧统一 nolo：deepinfra/anthropic/claude-* 命中迁移", () => {
  expect(
    lookupModelUpgrade("deepinfra", "anthropic/claude-opus-4-8")?.to,
  ).toEqual({ provider: "nolo", model: "anthropic/claude-opus-4-8" });
  expect(
    lookupModelUpgrade("deepinfra", "anthropic/claude-sonnet-5")?.to,
  ).toEqual({ provider: "nolo", model: "anthropic/claude-sonnet-5" });
  // Claude Haiku 4.5 已下架，不再迁移到 nolo
  expect(
    lookupModelUpgrade("deepinfra", "anthropic/claude-haiku-4-5"),
  ).toBeUndefined();
});

test("DeepSeek 家族规则：任何第三方 provider 的 deepseek-v4-* 都迁到 nolo", () => {
  expect(lookupModelUpgrade("fireworks", "deepseek-v4-flash")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-flash",
  });
  expect(lookupModelUpgrade("openrouter", "deepseek-v4-pro")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-pro",
  });
  // 大小写规范化（FIREWORKS 不在静态表，确保真正跑进规则兜底分支）
  expect(lookupModelUpgrade("FIREWORKS", "DeepSeek-V4-Flash")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-flash",
  });
  // nolo 托管的不触发规则
  expect(lookupModelUpgrade("nolo", "deepseek-v4-flash")).toBeUndefined();
  // 非 deepseek 家族模型不触发规则
  expect(lookupModelUpgrade("fireworks", "kimi-k2.6")).toBeUndefined();
});

test("resolveModelUpgrade 命中时返回目标，未命中原样返回", () => {
  expect(resolveModelUpgrade("nolo", "glm-5.2")).toEqual({
    provider: "nolo",
    model: "glm-5.2",
  });
  expect(resolveModelUpgrade("nolo", "kimi-k2.6")).toEqual({
    provider: "nolo",
    model: "kimi-k2.6",
  });
  expect(resolveModelUpgrade(undefined, null)).toEqual({
    provider: undefined,
    model: null,
  });
});

test("表内目标尽量是 nolo 平台托管（原则约束，upgrade 换代除外）", () => {
  for (const u of MODEL_UPGRADE_TABLE) {
    if (u.kind === "upgrade") {
      // 换代：同 provider 内升级（如 grok-4.5 -> 4.6），目标可保持原 provider
      expect(u.to.provider.toLowerCase()).toBe(
        u.from.provider.toLowerCase(),
      );
    } else {
      expect(u.to.provider.toLowerCase()).toBe("nolo");
    }
  }
});

test("MiniMax M3（fireworks）命中迁移到 nolo DeepSeek V4 Pro", () => {
  expect(
    lookupModelUpgrade(
      "fireworks",
      "accounts/fireworks/models/minimax-m3",
    )?.to,
  ).toEqual({ provider: "nolo", model: "deepseek-v4-pro" });
});

test("Grok 统一到 nolo：xai/grok-4.5 升级为 nolo/grok-4.6，xai/grok-4.6 迁移到 nolo", () => {
  const hit45 = lookupModelUpgrade("xai", "grok-4.5");
  expect(hit45?.to).toEqual({ provider: "nolo", model: "grok-4.6" });
  expect(hit45?.kind).toBeUndefined();
  const hit46 = lookupModelUpgrade("xai", "grok-4.6");
  expect(hit46?.to).toEqual({ provider: "nolo", model: "grok-4.6" });
  expect(hit46?.kind).toBeUndefined();
});

test("下架且无兼容替代的模型：一律兜底到 nolo DeepSeek V4 Flash", () => {
  const expected = { provider: "nolo", model: "deepseek-v4-flash" };
  expect(lookupModelUpgrade("moonshot", "kimi-k2.7-code")?.to).toEqual(expected);
  expect(
    lookupModelUpgrade("fireworks", "accounts/fireworks/models/kimi-k2p7-code")?.to,
  ).toEqual(expected);
  expect(lookupModelUpgrade("moonshot", "kimi-k2.5")?.to).toEqual(expected);
  expect(
    lookupModelUpgrade("openrouter", "moonshotai/Kimi-K2.5")?.to,
  ).toEqual(expected);
  expect(
    lookupModelUpgrade("fireworks", "accounts/fireworks/models/minimax-m2p7")?.to,
  ).toEqual(expected);
  expect(
    lookupModelUpgrade("fireworks", "accounts/fireworks/models/kimi-k2p5")?.to,
  ).toEqual(expected);
  expect(lookupModelUpgrade("fireworks", "kimi-k2p5")?.to).toEqual(expected);
  expect(
    lookupModelUpgrade("fireworks", "accounts/fireworks/models/qwen3p6-plus")?.to,
  ).toEqual(expected);
  expect(lookupModelUpgrade("fireworks", "qwen3p6-plus")?.to).toEqual(expected);
  expect(lookupModelUpgrade("fireworks", "minimax-m2p7")?.to).toEqual(expected);
  expect(lookupModelUpgrade("fireworks", "minimax-m2p5")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "devstral-2512")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "devstral")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "grok-4.3")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "grok-3")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "grok-3-beta")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "grok-3-fast-beta")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "grok-2-vision")?.to).toEqual(expected);
  expect(lookupModelUpgrade("openrouter", "o3-pro")?.to).toEqual(expected);
  expect(lookupModelUpgrade("mimo", "mimo-v2.5-pro")?.to).toEqual(expected);
  // 大小写不敏感
  expect(lookupModelUpgrade("Moonshot", "KIMI-K2.7-CODE")?.to).toEqual(expected);
  // nolo 托管的下架模型同样兜底
  expect(lookupModelUpgrade("nolo", "kimi-k2.7-code")?.to).toEqual(expected);
});

test("nolo 专属下架：haiku 仅 nolo provider 兜底，deepinfra 直连不受影响", () => {
  const expected = { provider: "nolo", model: "deepseek-v4-flash" };
  // nolo 平台已下架 → 兜底
  expect(lookupModelUpgrade("nolo", "anthropic/claude-haiku-4-5")?.to).toEqual(expected);
  expect(lookupModelUpgrade("nolo", "claude-haiku-4-5")?.to).toEqual(expected);
  // deepinfra 直连仍可用 → 不迁移
  expect(
    lookupModelUpgrade("deepinfra", "anthropic/claude-haiku-4-5"),
  ).toBeUndefined();
});

test("兜底规则不误伤：可用模型、有显式目标的模型保持原判定", () => {
  // 可用模型：kimi-k2.6 无任何迁移
  expect(lookupModelUpgrade("moonshot", "kimi-k2.6")).toBeUndefined();
  // 有显式兼容目标：minimax-m3 命中显式条目（deepseek-v4-pro），不被兜底规则覆盖
  expect(
    lookupModelUpgrade(
      "fireworks",
      "accounts/fireworks/models/minimax-m3",
    )?.to,
  ).toEqual({ provider: "nolo", model: "deepseek-v4-pro" });
  // deepseek 家族规则优先于下架兜底（deepseek-v4-flash 也不在集合）
  expect(lookupModelUpgrade("deepseek", "deepseek-v4-flash")?.to).toEqual({
    provider: "nolo",
    model: "deepseek-v4-flash",
  });
  // nolo 托管自身不触发（nolo/deepseek-v4-flash 无迁移）
  expect(lookupModelUpgrade("nolo", "deepseek-v4-flash")).toBeUndefined();
});

test("resolveModelUpgrade 对下架模型返回兜底目标", () => {
  expect(resolveModelUpgrade("moonshot", "kimi-k2.7-code")).toEqual({
    provider: "nolo",
    model: "deepseek-v4-flash",
  });
});
