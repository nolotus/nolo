import { describe, expect, test } from "bun:test";
import {
  normalizeSystemBuiltinSkills,
} from "./settingNormalizers";
import { DEFAULT_SYSTEM_BUILTIN_SKILLS } from "./settingInitialState";
import { normalizeSettingChanges } from "./settingPersistence";
import { SYSTEM_BUILTIN_SKILL_PACK_IDS } from "ai/tools/toolPacks";
import { DEFAULT_SYSTEM_AGENT_CAPABILITIES } from "ai/tools/agentCapabilities";

/**
 * 期望 map = 全部默认值，再覆盖若干显式项。
 * 从 registry 派生而不是写死列表——这些用例测的是「归一化行为」，
 * registry 里到底有几个能力由 agentCapabilities.test.ts 单独钉住。
 */
const withDefaults = (overrides: Record<string, boolean> = {}) => ({
  ...DEFAULT_SYSTEM_AGENT_CAPABILITIES,
  ...overrides,
});

describe("normalizeSystemBuiltinSkills", () => {
  test("缺失 key 用 defaults 补齐——默认开启语义", () => {
    const expected = withDefaults();
    expect(normalizeSystemBuiltinSkills(undefined, DEFAULT_SYSTEM_BUILTIN_SKILLS)).toEqual(
      expected,
    );
    expect(normalizeSystemBuiltinSkills(null, DEFAULT_SYSTEM_BUILTIN_SKILLS)).toEqual(
      expected,
    );
    expect(normalizeSystemBuiltinSkills({}, DEFAULT_SYSTEM_BUILTIN_SKILLS)).toEqual(
      expected,
    );
  });

  test("显式 false 保留——关闭语义持久化", () => {
    expect(
      normalizeSystemBuiltinSkills(
        { "web-search": false },
        DEFAULT_SYSTEM_BUILTIN_SKILLS,
      ),
    ).toEqual(withDefaults({ "web-search": false }));
  });

  test("非 boolean 值被 Boolean() 归一化——畸形存储不崩溃", () => {
    expect(
      normalizeSystemBuiltinSkills(
        { "web-search": 0 } as any,
        DEFAULT_SYSTEM_BUILTIN_SKILLS,
      ),
    ).toEqual(withDefaults({ "web-search": false }));
    expect(
      normalizeSystemBuiltinSkills(
        { "web-search": "off" } as any,
        DEFAULT_SYSTEM_BUILTIN_SKILLS,
      ),
    ).toEqual(withDefaults());
  });

  test("新增内置 skill 时存量用户自动默认开启", () => {
    // 模拟未来新增 skill: persisted map 缺新 key → 用 defaults 补。
    const defaults = { "web-search": true, "code-search": true } as Record<
      string,
      boolean
    >;
    expect(
      normalizeSystemBuiltinSkills({ "web-search": false }, defaults),
    ).toEqual({ "web-search": false, "code-search": true });
  });

  test("defaults and system capability ids come from one registry", () => {
    expect(DEFAULT_SYSTEM_BUILTIN_SKILLS).toEqual(
      DEFAULT_SYSTEM_AGENT_CAPABILITIES,
    );
    for (const packId of SYSTEM_BUILTIN_SKILL_PACK_IDS) {
      expect(DEFAULT_SYSTEM_BUILTIN_SKILLS[packId]).toBe(true);
    }
  });
});

describe("normalizeSettingChanges (systemBuiltinSkills)", () => {
  test("setSettings 写入 systemBuiltinSkills 时走归一化", () => {
    const out = normalizeSettingChanges({
      systemBuiltinSkills: { "web-search": false },
    });
    expect(out.systemBuiltinSkills).toEqual(withDefaults({ "web-search": false }));
  });

  test("setSettings 写入畸形值时被归一化不崩溃", () => {
    const out = normalizeSettingChanges({
      systemBuiltinSkills: { "web-search": "false" } as any,
    });
    expect(out.systemBuiltinSkills).toEqual(withDefaults());
  });

  test("未携带 systemBuiltinSkills 的 payload 不引入该字段", () => {
    const out = normalizeSettingChanges({ globalPrompt: "hi" });
    expect("systemBuiltinSkills" in out).toBe(false);
  });
});