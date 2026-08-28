import { describe, expect, test } from "bun:test";
import { shouldRenderSiteFooter } from "./siteFooterRoutes";

describe("shouldRenderSiteFooter", () => {
  test("renders on the home page and marketing/legal routes", () => {
    for (const path of [
      "/",
      "/pricing",
      "/recharge",
      "/terms",
      "/privacy",
      "/aup",
      "/about",
      "/contact",
      "/guide",
      "/downloads",
    ]) {
      expect(shouldRenderSiteFooter(path)).toBe(true);
    }
  });

  test("does not render inside full-height workspace routes", () => {
    for (const path of [
      "/chat",
      "/chat/abc123",
      "/space/xyz",
      "/life",
      "/explore",
      "/notifications",
      "/settings",
    ]) {
      expect(shouldRenderSiteFooter(path)).toBe(false);
    }
  });

  test("tolerates a trailing slash", () => {
    expect(shouldRenderSiteFooter("/pricing/")).toBe(true);
    expect(shouldRenderSiteFooter("/")).toBe(true);
  });

  test("matches whitelisted prefixes and their children", () => {
    expect(shouldRenderSiteFooter("/share/community")).toBe(true);
    expect(shouldRenderSiteFooter("/share/community/latest")).toBe(true);
    expect(shouldRenderSiteFooter("/share/some-token")).toBe(false);
  });

  test("rejects empty or non-string input", () => {
    expect(shouldRenderSiteFooter("")).toBe(false);
    expect(shouldRenderSiteFooter(undefined as unknown as string)).toBe(false);
  });
});
