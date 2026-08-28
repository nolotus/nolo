import { useTranslation } from "react-i18next";

export interface ArtConfig {
  src: string;
  srcSet?: string;
  sizes?: string;
  /** CSS object-position */
  pos?: string;
}

const responsiveArt = (
  src: string,
  intrinsicWidth: number,
  pos?: string
): ArtConfig => {
  const optimizedSrc = src.replace(/\.jpg$/, "-900.jpg");
  const optimizedWidth = Math.min(900, intrinsicWidth);
  const srcSet =
    intrinsicWidth > optimizedWidth
      ? `${optimizedSrc} ${optimizedWidth}w, ${src} ${intrinsicWidth}w`
      : `${optimizedSrc} ${optimizedWidth}w`;

  return {
    src: optimizedSrc,
    srcSet,
    pos,
  };
};

/**
 * 15 unique artworks — one per page × language, zero repetition.
 *
 * ZH  中国 ──────────────────────────────────────────────────────
 *   home      : 王希孟《千里江山图》北宋
 *   downloads : 郭熙《早春图》北宋
 *   pricing   : 范宽《溪山行旅图》北宋
 *   login     : 倪瓒《六君子图》元代  — 极简墨竹
 *   signup    : 唐寅《山水图》明代
 *
 * JA  日本 浮世绘 ─────────────────────────────────────────────
 *   home      : 北斋《富岳三十六景》
 *   downloads : 北斋《神奈川冲浪里》
 *   pricing   : 广重《蒲原夜雪》
 *   login     : 广重《龟户梅园》
 *   signup    : 北斋《山下白雨》
 *
 * EN  西欧 浪漫主义 ─────────────────────────────────────────────
 *   home      : 弗里德里希《雾海上的旅人》德国
 *   downloads : 透纳《战舰无畏号》英国
 *   pricing   : 米莱《奥菲利亚》英国
 *   login     : 维米尔《倒牛奶的女仆》荷兰
 *   signup    : 莫奈《睡莲》法国
 */
const ART_MAP: Record<string, Record<string, ArtConfig>> = {
  home: {
    zh: responsiveArt("/public/wangximeng-rivers.jpg", 1200, "center 28%"),
    ja: responsiveArt("/public/hokusai-fuji.jpg", 1200, "center 42%"),
    en: responsiveArt("/public/friedrich-wanderer.jpg", 1200, "center 35%"),
  },
  downloads: {
    zh: responsiveArt("/public/guoxi-spring.jpg", 685, "center 15%"),
    ja: responsiveArt("/public/hokusai-wave.jpg", 1200, "center bottom"),
    en: responsiveArt("/public/turner-temeraire.jpg", 1400, "center 40%"),
  },
  pricing: {
    zh: responsiveArt("/public/fankuan-mountains.jpg", 698, "40% 25%"),
    ja: responsiveArt("/public/hiroshige-snow.jpg", 1839, "center 35%"),
    en: responsiveArt("/public/millais-ophelia.jpg", 1800, "50% 65%"),
  },
  login: {
    zh: responsiveArt("/public/nizan-gentlemen.jpg", 756, "center 40%"),
    ja: responsiveArt("/public/hiroshige-plum.jpg", 952, "center 35%"),
    en: responsiveArt("/public/vermeer-milkmaid.jpg", 1248, "30% 20%"),
  },
  signup: {
    zh: responsiveArt("/public/tangyin-landscape.jpg", 1029, "center 25%"),
    ja: responsiveArt("/public/hokusai-thunder.jpg", 1525, "center 15%"),
    en: responsiveArt("/public/monet-waterlilies.jpg", 2342, "center 50%"),
  },
};

/** Returns the culturally-matched artwork config for the current i18n language. */
export function usePageArt(page: keyof typeof ART_MAP): ArtConfig {
  const { i18n } = useTranslation();
  const lang = i18n.language ?? "en";
  const map = ART_MAP[page] ?? ART_MAP.downloads;

  if (lang.startsWith("zh")) return map.zh;
  if (lang === "ja") return map.ja;
  return map.en;
}
