import { describe, expect, it } from "bun:test";
import {
  findProviderById,
  isSubscriptionOAuthProvider,
  type OAuthProviderConfig,
} from "./providerRegistry";

// 回归护栏：Antigravity OAuth preset 的 curated 目录必须与默认/recommended 契约一致，
// 防止 UI 目录（create/edit provider 表单）遗漏新模型（如 gemini-3.8-flash）。
describe("providerRegistry antigravity preset", () => {
  const antigravity = findProviderById("antigravity") as
    | OAuthProviderConfig
    | undefined;

  it("exposes the Antigravity OAuth preset through the shared registry", () => {
    expect(antigravity).toBeDefined();
    expect(antigravity?.kind).toBe("oauth");
    expect(isSubscriptionOAuthProvider("antigravity")).toBe(true);
  });

  it("keeps gemini-3.7-flash as defaultModel and the only recommended option", () => {
    expect(antigravity?.defaultModel).toBe("gemini-3.7-flash");
    const recommended = (antigravity?.modelOptions ?? [])
      .filter((m) => m.recommended)
      .map((m) => m.id);
    expect(recommended).toEqual(["gemini-3.7-flash"]);
  });

  it("lists gemini-3.8-flash in modelOptions with full UI mapping fields", () => {
    const ids = (antigravity?.modelOptions ?? []).map((m) => m.id);
    expect(ids).toContain("gemini-3.8-flash");

    const gemini38 = (antigravity?.modelOptions ?? []).find(
      (m) => m.id === "gemini-3.8-flash"
    );
    expect(gemini38?.label).toBe("Gemini 3.8 Flash");
    expect(gemini38?.hasVision).toBe(true);
  });
});
