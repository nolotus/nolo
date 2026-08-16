import { canonicalizeNoloServerUrl } from "core/noloServerUrl";

export const DEFAULT_SITE_ORIGIN = "https://nolo.chat";
export const DEFAULT_OG_IMAGE_PATH = "/public/nolo-og-card-zh.jpg";
export const DEFAULT_PAGE_ROBOTS = "index, follow";

export type StaticPageMetaKey =
  | "default"
  | "home"
  | "pricing"
  | "explore"
  | "shareCommunity";

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  robots: string;
  type: "website" | "article";
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
  robots?: string;
  type?: "website" | "article";
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

export const resolvePageMeta = (
  { title, description, path, imagePath = DEFAULT_OG_IMAGE_PATH, robots = DEFAULT_PAGE_ROBOTS, type = "website" }: PageMetaInput,
  origin?: string
): PageMeta => ({
  title,
  description,
  url: buildAbsoluteMetaUrl(path, origin),
  image: buildAbsoluteMetaUrl(imagePath, origin),
  robots,
  type,
});

export const buildStaticPageMeta = (
  t: TranslateFn,
  key: StaticPageMetaKey,
  origin?: string
) => {
  const config = STATIC_PAGE_META_CONFIG[key];
  return resolvePageMeta(
    {
      path: config.path,
      title: t(config.titleKey, { ns: "common" }),
      description: t(config.descriptionKey, { ns: "common" }),
    },
    origin
  );
};

export const resolveStaticPageMetaKey = (
  pathname: string
): StaticPageMetaKey | null => {
  if (pathname === "/") return "home";
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/explore") return "explore";
  if (pathname === "/share/community") return "shareCommunity";
  return null;
};
