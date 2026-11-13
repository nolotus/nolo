import { canonicalizeNoloServerUrl } from "core/noloServerUrl";

export const DEFAULT_SITE_ORIGIN = "https://nolo.chat";
export const DEFAULT_OG_IMAGE_PATH_EN = "/public/nolo-og-card-v2-en.jpg";
export const DEFAULT_OG_IMAGE_PATH_ZH = "/public/nolo-og-card-v2-zh.jpg";
export const DEFAULT_OG_IMAGE_PATH = DEFAULT_OG_IMAGE_PATH_EN;
export const DEFAULT_PAGE_ROBOTS = "index, follow";
export const NOINDEX_PAGE_ROBOTS = "noindex";

/**
 * 登录态/私有页面的路径前缀。这些页面不应被搜索引擎索引。
 * 仅做前缀判定，不引入路由元数据系统；公开页（/、/pricing、/explore、
 * /share/**、/profile/**、/privacy、/terms、/aup、/downloads、/guide 等）不在列。
 */
export const PRIVATE_PATH_PREFIXES = [
  "/settings",
  "/dialog",
  "/chat",
  "/space",
  "/content",
  "/dialogs",
  "/docs",
  "/tables",
  "/images",
  "/attachments",
  "/videos",
  "/audios",
  "/files",
  "/agents",
  "/apps",
  "/favorites",
  "/create",
  "/life",
  "/admin",
  "/lab",
  "/media-jobs",
  "/notifications",
  "/recharge",
];

export const isPrivatePathname = (pathname: string): boolean => {
  const normalized = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
};

export const resolveOgImagePath = (lang?: string): string => {
  if (lang && lang.toLowerCase().startsWith("zh")) {
    return DEFAULT_OG_IMAGE_PATH_ZH;
  }
  return DEFAULT_OG_IMAGE_PATH_EN;
};

export type StaticPageMetaKey =
  | "default"
  | "home"
  | "pricing"
  | "explore"
  | "shareCommunity"
  | "privacy"
  | "terms";

export interface AlternateLanguageLink {
  href: string;
  hreflang: string;
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  robots: string;
  type: "website" | "article";
  alternateLanguages?: AlternateLanguageLink[];
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
  lang?: string;
  robots?: string;
  type?: "website" | "article";
  alternateLanguages?: AlternateLanguageLink[];
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const STATIC_PAGE_META_CONFIG: Record<
  StaticPageMetaKey,
  { path: string; titleKey: string; descriptionKey: string }
> = {
  default: {
    path: "/",
    titleKey: "seo.title",
    descriptionKey: "seo.description",
  },
  home: {
    path: "/",
    titleKey: "seo.home.title",
    descriptionKey: "seo.home.description",
  },
  pricing: {
    path: "/pricing",
    titleKey: "seo.pricing.title",
    descriptionKey: "seo.pricing.description",
  },
  explore: {
    path: "/explore",
    titleKey: "seo.explore.title",
    descriptionKey: "seo.explore.description",
  },
  shareCommunity: {
    path: "/share/community",
    titleKey: "seo.shareCommunity.title",
    descriptionKey: "seo.shareCommunity.description",
  },
  privacy: {
    path: "/privacy",
    titleKey: "seo.privacy.title",
    descriptionKey: "seo.privacy.description",
  },
  terms: {
    path: "/terms",
    titleKey: "seo.terms.title",
    descriptionKey: "seo.terms.description",
  },
};

export const normalizeMetaOrigin = (origin?: string) => {
  try {
    const url = new URL(origin ?? DEFAULT_SITE_ORIGIN);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return DEFAULT_SITE_ORIGIN;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return DEFAULT_SITE_ORIGIN;
    }
    // Shared nolo.chat http→https upgrade; keep origin form for meta tags.
    return new URL(canonicalizeNoloServerUrl(url.origin)).origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
};

export const buildAbsoluteMetaUrl = (path: string, origin?: string) =>
  new URL(path, normalizeMetaOrigin(origin)).toString();

export const buildAlternateLanguageLinks = (
  path: string,
  origin?: string
): AlternateLanguageLink[] => {
  const normalizedOrigin = normalizeMetaOrigin(origin);
  const basePath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(basePath, normalizedOrigin);
  const cleanPath = url.pathname;

  const buildUrlWithLang = (langParam?: string) => {
    const targetUrl = new URL(cleanPath, normalizedOrigin);
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "lang") {
        targetUrl.searchParams.set(key, value);
      }
    }
    if (langParam) {
      targetUrl.searchParams.set("lang", langParam);
    }
    return targetUrl.toString();
  };

  return [
    { hreflang: "x-default", href: buildUrlWithLang() },
    { hreflang: "en", href: buildUrlWithLang() },
    { hreflang: "zh-Hans", href: buildUrlWithLang("zh-CN") },
    { hreflang: "zh-Hant", href: buildUrlWithLang("zh-Hant") },
    { hreflang: "ja", href: buildUrlWithLang("ja") },
    { hreflang: "ko", href: buildUrlWithLang("ko") },
    { hreflang: "de", href: buildUrlWithLang("de") },
    { hreflang: "es", href: buildUrlWithLang("es") },
  ];
};

export const resolvePageMeta = (
  {
    title,
    description,
    path,
    imagePath,
    lang,
    robots = DEFAULT_PAGE_ROBOTS,
    type = "website",
    alternateLanguages,
  }: PageMetaInput,
  origin?: string
): PageMeta => ({
  title,
  description,
  url: buildAbsoluteMetaUrl(path, origin),
  image: buildAbsoluteMetaUrl(imagePath ?? resolveOgImagePath(lang), origin),
  robots,
  type,
  alternateLanguages: alternateLanguages ?? buildAlternateLanguageLinks(path, origin),
});

export const buildStaticPageMeta = (
  t: TranslateFn,
  key: StaticPageMetaKey,
  origin?: string,
  lang?: string,
  robots?: string
) => {
  const config = STATIC_PAGE_META_CONFIG[key];
  return resolvePageMeta(
    {
      path: config.path,
      title: t(config.titleKey, { ns: "common" }),
      description: t(config.descriptionKey, { ns: "common" }),
      lang,
      robots,
    },
    origin
  );
};

/**
 * 404 页面 meta：noindex，canonical 指向请求自身的绝对 URL
 * （不回落到 "/"，避免搜索引擎把 404 URL 当作首页副本）。
 */
export const buildNotFoundPageMeta = (
  t: TranslateFn,
  pathname: string,
  origin?: string,
  lang?: string
) =>
  resolvePageMeta(
    {
      path: pathname.startsWith("/") ? pathname : `/${pathname}`,
      title: t("seo.notFound.title", { ns: "common" }),
      description: t("seo.notFound.description", { ns: "common" }),
      lang,
      robots: NOINDEX_PAGE_ROBOTS,
      alternateLanguages: [],
    },
    origin
  );

export const resolveStaticPageMetaKey = (
  pathname: string
): StaticPageMetaKey | null => {
  if (pathname === "/") return "home";
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/explore") return "explore";
  if (pathname === "/share/community") return "shareCommunity";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  return null;
};
