import { describe, expect, test } from "bun:test";

import {
  PERSONALIZATION_DIALOG_CATEGORY,
  PERSONALIZATION_DIALOG_EXTRA_TOOLS,
  buildPersonalizationDialogPolicyContext,
  buildPersonalizationDialogTitle,
  buildPersonalizationRuntimeOptions,
  buildPersonalizationStarterPrompt,
} from "./personalizationDialog";

describe("personalizationDialog", () => {
  test("uses localized signup copy for Chinese users", () => {
    const prompt = buildPersonalizationStarterPrompt("zh-CN", "signup");

    expect(prompt).toContain("我刚完成注册");
    expect(prompt).toContain("最多 3 个简短问题");
    expect(prompt).toContain("不要修改或创建任何 AI");
  });

  test("uses localized manual-adjustment copy for English users", () => {
    const title = buildPersonalizationDialogTitle("en-US", "home");
    const prompt = buildPersonalizationStarterPrompt("en-US", "home");

    expect(title).toBe("Adjust AI Preferences");
    expect(prompt).toContain("I want to adjust my AI preferences");
    expect(prompt).toContain("Do not create documents");
  });

  test("keeps a dedicated dialog category for future reuse", () => {
    expect(PERSONALIZATION_DIALOG_CATEGORY).toBe("user-overlay-profile");
  });

  test("injects the personalization-specific tools into runtime options", () => {
    const result = buildPersonalizationRuntimeOptions({
      extraTools: ["read"],
    });

    expect(result.extraTools).toEqual([
      "read",
      ...PERSONALIZATION_DIALOG_EXTRA_TOOLS,
    ]);
  });

  test("adds dialog-specific policy instructions for onboarding mode", () => {
    const context = buildPersonalizationDialogPolicyContext();

    expect(context).toContain("用户个性化设置");
    expect(context).toContain("ask_user");
    expect(context).toContain("updateUserPreferenceProfile");
    expect(context).toContain("globalPrompt");
    expect(context).toContain("设置里修改");
  });
});
