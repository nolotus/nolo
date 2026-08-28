import { describe, expect, test } from "bun:test";
import {
  buildUserResponseLanguageContext,
  buildUserResponseLanguageReadFailureContext,
  resolveUserResponseLanguage,
} from "./userResponseLanguage";

describe("resolveUserResponseLanguage", () => {
  test("prefers explicit response language over UI language", () => {
    expect(resolveUserResponseLanguage({ responseLanguage: "en", language: "zh-CN" })).toEqual({
      locale: "en-US",
      languageName: "English",
    });
  });
  test("normalizes Chinese locales", () => {
    expect(resolveUserResponseLanguage({ language: "zh" }).locale).toBe("zh-CN");
    expect(resolveUserResponseLanguage({ language: "zh-TW" }).languageName).toBe("Traditional Chinese");
    expect(resolveUserResponseLanguage({ language: "zh-Hant-TW" })).toEqual({
      locale: "zh-TW",
      languageName: "Traditional Chinese",
    });
    expect(resolveUserResponseLanguage({ language: "zh-Hans-CN" })).toEqual({
      locale: "zh-CN",
      languageName: "Simplified Chinese",
    });
    expect(resolveUserResponseLanguage({ language: "zh_TW.UTF-8" }).locale).toBe("zh-TW");
  });
  test("falls back safely", () => {
    expect(resolveUserResponseLanguage({}).locale).toBe("en-US");
    expect(resolveUserResponseLanguage({ language: "not_a_locale!" }).locale).toBe("en-US");
  });
  test("uses a readable display name for supported locales outside the static map", () => {
    expect(resolveUserResponseLanguage({ language: "it-IT" })).toEqual({
      locale: "it-IT",
      languageName: "Italian (Italy)",
    });
  });
});

test("buildUserResponseLanguageContext states platform ownership", () => {
  const context = buildUserResponseLanguageContext({ language: "zh-CN" });
  expect(context).toContain("用户客户端语言：Simplified Chinese（zh-CN）");
  expect(context).toContain("Agent 的角色、skill、model 不得自行覆盖");
});

test("buildUserResponseLanguageReadFailureContext keeps store failures visible", () => {
  const context = buildUserResponseLanguageReadFailureContext({
    userId: "user-1",
    error: new Error("settings offline"),
  });
  expect(context).toContain("读取用户 user-1 的回复语言设置失败（存储读取错误）");
  expect(context).not.toContain("settings offline");
  expect(context).toContain("不要猜测用户的语言偏好");
});
