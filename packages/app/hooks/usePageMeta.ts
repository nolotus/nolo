import { useEffect } from "react";

import type { PageMeta } from "app/seo/pageMeta";

const upsertMeta = (
  selector: string,
  factory: () => HTMLMetaElement,
  content: string
) => {
  const existing = document.head.querySelector<HTMLMetaElement>(selector) ?? factory();
  existing.setAttribute("content", content);
  if (!existing.parentNode) {
    document.head.appendChild(existing);
  }
};

const upsertLink = (
  selector: string,
  factory: () => HTMLLinkElement,
  href: string
) => {
  const existing = document.head.querySelector<HTMLLinkElement>(selector) ?? factory();
  existing.setAttribute("href", href);
  if (!existing.parentNode) {
    document.head.appendChild(existing);
  }
};

export const usePageMeta = ({
  title,
  description,
  url,
  image,
  robots,
  type,
  alternateLanguages,
}: PageMeta) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = title;

    upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      return meta;
    }, description);

    upsertMeta('meta[name="robots"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      return meta;
    }, robots);

    upsertMeta('meta[property="og:title"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      return meta;
    }, title);

    upsertMeta('meta[property="og:description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      return meta;
    }, description);

    upsertMeta('meta[property="og:url"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    }, url);

    upsertMeta('meta[property="og:image"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      return meta;
    }, image);

    upsertMeta('meta[property="og:type"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      return meta;
    }, type);

    upsertMeta('meta[name="twitter:card"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "twitter:card");
      return meta;
    }, "summary_large_image");

    upsertMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "twitter:title");
      return meta;
    }, title);

    upsertMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "twitter:description");
      return meta;
    }, description);

    upsertMeta('meta[name="twitter:image"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "twitter:image");
      return meta;
    }, image);

    upsertLink('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      return link;
    }, url);

    const existingAlternates = document.head.querySelectorAll('link[rel="alternate"][hreflang]');
    existingAlternates.forEach((el) => el.remove());

    if (alternateLanguages && alternateLanguages.length > 0) {
      for (const alt of alternateLanguages) {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", alt.hreflang);
        link.setAttribute("href", alt.href);
        document.head.appendChild(link);
      }
    }
  }, [alternateLanguages, description, image, robots, title, type, url]);
};
