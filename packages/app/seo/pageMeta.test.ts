import { describe, expect, it } from "bun:test";

import {
  DEFAULT_SITE_ORIGIN,
  buildAbsoluteMetaUrl,
  buildStaticPageMeta,
  normalizeMetaOrigin,
  resolvePageMeta,
  resolveStaticPageMetaKey,
} from "./pageMeta";

describe("pageMeta helpers", () => {
  it("falls back to the canonical site origin for localhost", () => {
    expect(normalizeMetaOrigin("http://localhost:3000")).toBe(DEFAULT_SITE_ORIGIN);
    expect(buildAbsoluteMetaUrl("/pricing", "http://127.0.0.1:5173")).toBe(
      "https://nolo.chat/pricing"
    );
  });

  it("canonicalizes nolo.chat social metadata URLs to https", () => {
    expect(normalizeMetaOrigin("http://nolo.chat")).toBe("https://nolo.chat");
    expect(buildAbsoluteMetaUrl("/public/nolo-og-card-zh.jpg", "http://nolo.chat")).toBe(
      "https://nolo.chat/public/nolo-og-card-zh.jpg"
    );
    expect(buildAbsoluteMetaUrl("/", "http://us.nolo.chat")).toBe("https://us.nolo.chat/");
  });

  it("builds route-specific metadata from translation keys", () => {
    const meta = buildStaticPageMeta(
      (key) =>
        ({
          "seo.home.title": "Home Title",
          "seo.home.description": "Home Description",
        }[key] ?? key),
      "home",
      "https://alpha.nolo.chat"
    );

    expect(meta).toEqual(
      expect.objectContaining({
        title: "Home Title",
        description: "Home Description",
        url: "https://alpha.nolo.chat/",
        image: "https://alpha.nolo.chat/public/nolo-og-card-zh.jpg",
      })
    );
  });

  it("resolves default route mappings and explicit page metadata", () => {
    expect(resolveStaticPageMetaKey("/")).toBe("home");
    expect(resolveStaticPageMetaKey("/pricing")).toBe("pricing");
    expect(resolveStaticPageMetaKey("/explore")).toBe("explore");
    expect(resolveStaticPageMetaKey("/share/community")).toBe("shareCommunity");
    expect(resolveStaticPageMetaKey("/about")).toBe("about");
    expect(resolveStaticPageMetaKey("/contact")).toBe("contact");
    expect(resolveStaticPageMetaKey("/dialog-1")).toBeNull();

    const meta = resolvePageMeta(
      {
        title: "Custom Title",
        description: "Custom Description",
        path: "/custom",
      },
      "https://nolo.chat"
    );

    expect(meta.robots).toBe("index, follow");
    expect(meta.type).toBe("website");
    expect(meta.url).toBe("https://nolo.chat/custom");
    expect(meta.alternateLanguages).toEqual([
      { hreflang: "x-default", href: "https://nolo.chat/custom" },
      { hreflang: "en", href: "https://nolo.chat/custom" },
      { hreflang: "zh-Hans", href: "https://nolo.chat/custom?lang=zh-CN" },
      { hreflang: "zh-Hant", href: "https://nolo.chat/custom?lang=zh-Hant" },
      { hreflang: "ja", href: "https://nolo.chat/custom?lang=ja" },
      { hreflang: "ko", href: "https://nolo.chat/custom?lang=ko" },
    ]);
  });

  it("builds alternate language links preserving non-lang search parameters", () => {
    const meta = buildStaticPageMeta(
      (key) => key,
      "pricing",
      "https://nolo.chat"
    );

    expect(meta.alternateLanguages).toEqual([
      { hreflang: "x-default", href: "https://nolo.chat/pricing" },
      { hreflang: "en", href: "https://nolo.chat/pricing" },
      { hreflang: "zh-Hans", href: "https://nolo.chat/pricing?lang=zh-CN" },
      { hreflang: "zh-Hant", href: "https://nolo.chat/pricing?lang=zh-Hant" },
      { hreflang: "ja", href: "https://nolo.chat/pricing?lang=ja" },
      { hreflang: "ko", href: "https://nolo.chat/pricing?lang=ko" },
    ]);
  });
});
