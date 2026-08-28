import { describe, expect, it } from "bun:test";
import React from "react";

import { renderInDom, flushDomUpdates } from "../../testing/domRender";
import { resolvePageMeta } from "app/seo/pageMeta";
import { usePageMeta } from "./usePageMeta";

const HookProbe: React.FC<{ meta: ReturnType<typeof resolvePageMeta> }> = ({ meta }) => {
  usePageMeta(meta);
  return null;
};

describe("usePageMeta", () => {
  it("updates title, canonical link, and social metadata", async () => {
    const firstMeta = resolvePageMeta(
      {
        title: "First Title",
        description: "First Description",
        path: "/pricing",
      },
      "https://nolo.chat"
    );
    const secondMeta = resolvePageMeta(
      {
        title: "Second Title",
        description: "Second Description",
        path: "/explore",
        imagePath: "/public/wangximeng-rivers-900.jpg",
      },
      "https://nolo.chat"
    );

    const view = await renderInDom(<HookProbe meta={firstMeta} />);

    try {
      await flushDomUpdates(1);

      expect(view.document.title).toBe("First Title");
      expect(
        view.document.querySelector('meta[name="description"]')?.getAttribute("content")
      ).toBe("First Description");
      expect(
        view.document.querySelector('meta[property="og:url"]')?.getAttribute("content")
      ).toBe("https://nolo.chat/pricing");
      expect(
        view.document.querySelector('link[rel="canonical"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="zh-Hans"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing?lang=zh-CN");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="zh-Hant"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing?lang=zh-Hant");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="ja"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing?lang=ja");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="ko"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/pricing?lang=ko");

      await view.rerender(<HookProbe meta={secondMeta} />);
      await flushDomUpdates(1);

      expect(view.document.title).toBe("Second Title");
      expect(
        view.document.querySelector('link[rel="canonical"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="zh-Hans"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore?lang=zh-CN");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="zh-Hant"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore?lang=zh-Hant");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="ja"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore?lang=ja");
      expect(
        view.document.querySelector('link[rel="alternate"][hreflang="ko"]')?.getAttribute("href")
      ).toBe("https://nolo.chat/explore?lang=ko");
      expect(
        view.document.querySelectorAll('link[rel="alternate"][hreflang]').length
      ).toBe(6);
      expect(
        Array.from(view.document.querySelectorAll('link[rel="alternate"][hreflang]')).some((el) =>
          el.getAttribute("href")?.includes("/pricing")
        )
      ).toBe(false);
      expect(
        view.document.querySelector('meta[name="twitter:title"]')?.getAttribute("content")
      ).toBe("Second Title");
      expect(
        view.document.querySelector('meta[name="twitter:description"]')?.getAttribute("content")
      ).toBe("Second Description");
      expect(
        view.document.querySelector('meta[name="twitter:image"]')?.getAttribute("content")
      ).toBe("https://nolo.chat/public/wangximeng-rivers-900.jpg");
      expect(
        view.document.querySelector('meta[property="og:type"]')?.getAttribute("content")
      ).toBe("website");
    } finally {
      await view.cleanup();
    }
  });
});
