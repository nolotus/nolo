/**
 * 锁住「内置 agent 的运行时字段由代码托管」这个契约。
 *
 * 背景（2026-08）：catalog 原本只在记录缺失时兜底，记录存在就完全让位给数据库。
 * 于是 catalog 把 nolo 切到 deepseek-v4-flash-vision-exp 之后，线上记录仍是
 * kimi-k2.6（再被 platformHosted 转发到 qwen），代码和线上静默分叉了一整个版本，
 * 用户看到的 context window 和实际回答的模型都对不上。
 *
 * 这些断言存在的意义：任何人（或 AI）想「顺手」把覆盖逻辑去掉、或把 model 改回
 * 从数据库读，都会在这里失败并读到上面这段原因。
 */
import { describe, expect, it } from "bun:test";

import {
  applyBuiltinAgentRuntimeOverride,
  resolveBuiltinAgentRuntimeFields,
} from "./builtinPlatformAgentConfigs";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_CHROME_OPERATOR_AGENT_KEY,
  BUILTIN_ECOMMERCE_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_NOLO_AGENT_MODEL,
  BUILTIN_PLATFORM_AGENT_KEYS,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
} from "core/builtinAgents";

describe("builtin agent runtime override", () => {
  it("covers all six platform builtin agents", () => {
    // 范围就是 catalog 的 builtin 组；广场档（public）刻意不在内，它们保留
    // 数据侧的灵活性（上架/调价/换模型不必发版）。
    expect(BUILTIN_PLATFORM_AGENT_KEYS).toHaveLength(6);
    for (const key of [
      BUILTIN_NOLO_AGENT_KEY,
      BUILTIN_APP_BUILDER_AGENT_KEY,
      BUILTIN_ECOMMERCE_AGENT_KEY,
      BUILTIN_AGENT_CREATOR_AGENT_KEY,
      BUILTIN_FEEDBACK_AGENT_KEY,
      BUILTIN_CHROME_OPERATOR_AGENT_KEY,
    ]) {
      expect(BUILTIN_PLATFORM_AGENT_KEYS).toContain(key);
      const fields = resolveBuiltinAgentRuntimeFields(key);
      expect(fields).not.toBeNull();
      expect(fields!.provider.length).toBeGreaterThan(0);
      expect(fields!.model.length).toBeGreaterThan(0);
    }
  });

  it("overrides a stale database model with the catalog model", () => {
    // 正是线上 nolo 那条记录的形状：model 停在 kimi-k2.6。
    const staleRecord = {
      dbKey: BUILTIN_NOLO_AGENT_KEY,
      name: "nolo",
      provider: "nolo",
      model: "kimi-k2.6",
    };
    expect(applyBuiltinAgentRuntimeOverride(BUILTIN_NOLO_AGENT_KEY, staleRecord)).toMatchObject({
      provider: "nolo",
      model: BUILTIN_NOLO_AGENT_MODEL,
    });
    expect(BUILTIN_NOLO_AGENT_MODEL).not.toBe("kimi-k2.6");
  });

  it("keeps content fields owned by the record", () => {
    // 运行时字段归代码，内容字段归数据——覆盖不能把 prompt/tools/greeting 吃掉。
    const record = {
      dbKey: BUILTIN_NOLO_AGENT_KEY,
      model: "kimi-k2.6",
      prompt: "路由人格提示词",
      tools: ["a", "b"],
      greeting: { text: "你好" },
      name: "nolo",
    };
    const result = applyBuiltinAgentRuntimeOverride(BUILTIN_NOLO_AGENT_KEY, record);
    expect(result.prompt).toBe("路由人格提示词");
    expect(result.tools).toEqual(["a", "b"]);
    expect(result.greeting).toEqual({ text: "你好" });
    expect(result.name).toBe("nolo");
  });

  it("leaves non-builtin agents untouched", () => {
    // 广场档和用户自建 agent 必须原样通过，否则等于悄悄接管了整个平台。
    const publicRecord = { model: "deepseek-v4-flash", provider: "nolo" };
    expect(
      applyBuiltinAgentRuntimeOverride(PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY, publicRecord),
    ).toBe(publicRecord);

    const ownedRecord = { model: "gpt-5.6-luna", provider: "openai" };
    expect(applyBuiltinAgentRuntimeOverride("agent-0e95801d90-mine", ownedRecord)).toBe(
      ownedRecord,
    );
    expect(resolveBuiltinAgentRuntimeFields("agent-0e95801d90-mine")).toBeNull();
  });

  it("also overrides the nested rawRecord copy", () => {
    // AgentRuntimeAgentConfig 把原始记录整份挂在 rawRecord 上，下游有直接从
    // 那里读 provider/model 的；只盖顶层会留下一份仍是 kimi-k2.6 的副本。
    const config = {
      key: BUILTIN_NOLO_AGENT_KEY,
      provider: "nolo",
      model: "kimi-k2.6",
      prompt: "路由人格提示词",
      rawRecord: { dbKey: BUILTIN_NOLO_AGENT_KEY, provider: "nolo", model: "kimi-k2.6" },
    };
    const result = applyBuiltinAgentRuntimeOverride(BUILTIN_NOLO_AGENT_KEY, config);
    expect(result.model).toBe(BUILTIN_NOLO_AGENT_MODEL);
    expect(result.rawRecord.model).toBe(BUILTIN_NOLO_AGENT_MODEL);
    // rawRecord 的其余字段不受影响
    expect(result.rawRecord.dbKey).toBe(BUILTIN_NOLO_AGENT_KEY);
    expect(result.prompt).toBe("路由人格提示词");
  });

  it("returns the same object when nothing needs changing", () => {
    // 已经一致时不复制对象：覆盖是幂等的，不该在热路径上制造垃圾。
    const record = {
      provider: "nolo",
      model: BUILTIN_NOLO_AGENT_MODEL,
    };
    expect(applyBuiltinAgentRuntimeOverride(BUILTIN_NOLO_AGENT_KEY, record)).toBe(record);

    // 带 rawRecord 且两层都已一致时同样不复制。
    const withRaw = {
      provider: "nolo",
      model: BUILTIN_NOLO_AGENT_MODEL,
      rawRecord: { provider: "nolo", model: BUILTIN_NOLO_AGENT_MODEL },
    };
    expect(applyBuiltinAgentRuntimeOverride(BUILTIN_NOLO_AGENT_KEY, withRaw)).toBe(withRaw);
  });
});
