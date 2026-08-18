import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/usePageMeta.ts
var import_react = __toESM(require_react());
var upsertMeta = (selector, factory, content) => {
  const existing = document.head.querySelector(selector) ?? factory();
  existing.setAttribute("content", content);
  if (!existing.parentNode) {
    document.head.appendChild(existing);
  }
};
var upsertLink = (selector, factory, href) => {
  const existing = document.head.querySelector(selector) ?? factory();
  existing.setAttribute("href", href);
  if (!existing.parentNode) {
    document.head.appendChild(existing);
  }
};
var usePageMeta = ({ title, description, url, image, robots, type }) => {
  (0, import_react.useEffect)(() => {
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
  }, [description, image, robots, title, type, url]);
};

// packages/core/noloServerUrl.ts
function isNoloChatHostname(hostname) {
  if (typeof hostname !== "string") return false;
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return host === "nolo.chat" || host.endsWith(".nolo.chat");
}
function canonicalizeNoloServerUrl(value) {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized) return normalized;
  try {
    const url = new URL(normalized);
    if (url.protocol === "http:" && isNoloChatHostname(url.hostname)) {
      url.protocol = "https:";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    return normalized;
  }
  return normalized;
}

// packages/app/seo/pageMeta.ts
var DEFAULT_SITE_ORIGIN = "https://nolo.chat";
var DEFAULT_OG_IMAGE_PATH = "/public/nolo-og-card-zh.jpg";
var DEFAULT_PAGE_ROBOTS = "index, follow";
var STATIC_PAGE_META_CONFIG = {
  default: {
    path: "/",
    titleKey: "seo.title",
    descriptionKey: "seo.description"
  },
  home: {
    path: "/",
    titleKey: "seo.home.title",
    descriptionKey: "seo.home.description"
  },
  pricing: {
    path: "/pricing",
    titleKey: "seo.pricing.title",
    descriptionKey: "seo.pricing.description"
  },
  explore: {
    path: "/explore",
    titleKey: "seo.explore.title",
    descriptionKey: "seo.explore.description"
  },
  shareCommunity: {
    path: "/share/community",
    titleKey: "seo.shareCommunity.title",
    descriptionKey: "seo.shareCommunity.description"
  }
};
var normalizeMetaOrigin = (origin) => {
  try {
    const url = new URL(origin ?? DEFAULT_SITE_ORIGIN);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return DEFAULT_SITE_ORIGIN;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return DEFAULT_SITE_ORIGIN;
    }
    return new URL(canonicalizeNoloServerUrl(url.origin)).origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
};
var buildAbsoluteMetaUrl = (path, origin) => new URL(path, normalizeMetaOrigin(origin)).toString();
var resolvePageMeta = ({ title, description, path, imagePath = DEFAULT_OG_IMAGE_PATH, robots = DEFAULT_PAGE_ROBOTS, type = "website" }, origin) => ({
  title,
  description,
  url: buildAbsoluteMetaUrl(path, origin),
  image: buildAbsoluteMetaUrl(imagePath, origin),
  robots,
  type
});
var buildStaticPageMeta = (t, key, origin) => {
  const config = STATIC_PAGE_META_CONFIG[key];
  return resolvePageMeta(
    {
      path: config.path,
      title: t(config.titleKey, { ns: "common" }),
      description: t(config.descriptionKey, { ns: "common" })
    },
    origin
  );
};

export {
  usePageMeta,
  buildStaticPageMeta
};
