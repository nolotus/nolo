/**
 * 搜狗微信搜索（weixin.sogou.com）结果页解析器。
 *
 * 纯函数、无网络：输入是 HTML 字符串，输出是文章列表。网络与限流在 index.ts。
 * 用 Bun 内置 `HTMLRewriter`（仓库没有 cheerio 依赖，也不要引入）。
 *
 * 三类页面必须区分开，否则会把「被反爬拦下」伪装成「没搜到」：
 * 1. 正常结果页：有 `ul.news-list > li`；
 * 2. 无结果页：有 `#noresult_part1_container` + 「没有找到相关的微信公众号文章」；
 * 3. 反爬验证页（antispider）：有 `#seccodeForm` / `antispider` 资源引用 / 验证码文案
 *    → 抛 {@link WechatSearchBlockedError}。
 * 4. 以上都不是（结构改版、被劫持页面等）：抛 {@link WechatSearchUnexpectedPageError}。
 *
 * 实测要点（2026-11-11，Bun 1.4.4）：
 * - `HTMLRewriter` 的 text handler **不会**收到注释内容，所以标题里的
 *   `<!--red_beg-->关键词<!--red_end-->` 高亮标记不会污染文本；
 * - 但 `getAttribute` **不做实体解码**，href 里的 `&amp;` 会原样返回，必须自己解码；
 * - 发布时间在 `<span class="s2"><script>document.write(timeConvert('1794379710'))</script></span>`
 *   里，text handler 能拿到 script 内部文本（span 的后代文本）。
 */

import { compactWhitespace } from "core/compactWhitespace";

export type WechatArticle = {
  title: string;
  /** 搜狗中间跳转链接（需浏览器打开才会跳到 mp.weixin.qq.com 原文）。 */
  url: string;
  summary?: string;
  /** ISO 8601 时间（来自页面里的 unix 时间戳）；取不到则省略。 */
  datetime?: string;
  /** 公众号名称。 */
  source?: string;
};

export type WechatSearchParseResult = {
  articles: WechatArticle[];
  /** true 仅当页面明确是「没有找到相关的微信公众号文章」。 */
  noResults: boolean;
};

export const SOGOU_WEIXIN_ORIGIN = "https://weixin.sogou.com";

/** 反爬验证页的结构标记：必须命中「验证表单」本身，而不是页面里偶然出现的字样。 */
const BLOCKED_FORM_SELECTOR = "#seccodeForm, form#seccodeForm";
/** 无结果页的容器 id（真实页面：`<div id="noresult_part1_container">`）。 */
const NO_RESULT_CONTAINER_ID = "noresult_part1_container";
/** 无结果页必须出现的确认文案。 */
const NO_RESULT_TEXT = "没有找到相关的微信公众号文章";

export class WechatSearchBlockedError extends Error {
  constructor(
    message = "搜狗微信搜索返回了反爬验证页（antispider），本次查询被拦截；请降低调用频率后重试，或改用其它数据源。",
  ) {
    super(message);
    this.name = "WechatSearchBlockedError";
  }
}

export class WechatSearchUnexpectedPageError extends Error {
  constructor(
    message = "搜狗微信搜索结果页结构无法识别（既不是结果列表、也不是无结果页或验证页），为避免把异常当空结果，本次查询判为失败。",
  ) {
    super(message);
    this.name = "WechatSearchUnexpectedPageError";
  }
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  "#x27": "'",
};

/** 只解码 Sogou 页面里出现的几个实体；单趟替换，避免 `&amp;lt;` 被二次解码。 */
export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#39|#x27);/g, (match, name: string) =>
    ENTITY_MAP[name] ?? match,
  );
}

/** 把页面里的相对/绝对 href 归一成可直接打开的绝对 URL。 */
export function normalizeArticleUrl(href: string): string {
  const decoded = decodeHtmlEntities(href.trim());
  if (!decoded) return "";
  if (decoded.startsWith("//")) return `https:${decoded}`;
  if (/^https?:\/\//i.test(decoded)) return decoded;
  if (decoded.startsWith("/")) return `${SOGOU_WEIXIN_ORIGIN}${decoded}`;
  return `${SOGOU_WEIXIN_ORIGIN}/${decoded}`;
}

/** `document.write(timeConvert('1794379710'))` → ISO 字符串；取不到返回 undefined。 */
export function parseTimeConvertTimestamp(raw: string): string | undefined {
  const match = raw.match(/timeConvert\(\s*['"]?(\d{9,13})['"]?\s*\)/);
  if (!match) return undefined;
  const digits = match[1]!;
  const seconds = digits.length >= 13 ? Number(digits) / 1000 : Number(digits);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

type PendingItem = {
  title: string;
  href: string;
  summary: string;
  source: string;
  time: string;
};

/**
 * 是否真的是反爬验证页：必须存在验证表单元素本身。
 *
 * 不能用「整页 HTML 含 antispider 子串」判断——查询词、文章标题或正文里出现
 * 「antispider」都会让正常结果页被误判（本轮 R3）。这里交给 HTMLRewriter 看元素。
 */
async function isAntispiderPage(html: string): Promise<boolean> {
  let found = false;
  await new HTMLRewriter()
    .on("form#seccodeForm, #seccodeForm", {
      element() {
        found = true;
      },
    })
    .transform(new Response(html))
    .text();
  return found;
}

/**
 * 是否是真的「无结果页」：`#noresult_part1_container` 容器**内部**必须出现确认文案。
 *
 * 只匹配裸子串会把「保留容器但内容报错」的故障页，以及只在普通段落里提到该文案的
 * 未知页当成正常空结果（本轮 R2），从而破坏「结构异常不得冒充没搜到」。
 */
async function hasNoResultContainerWithText(html: string): Promise<boolean> {
  let insideContainer = false;
  // script/style/noscript 里的文本不是「给用户看的文案」，不能拿它当无结果证据：
  // 一个真正报错的页面完全可能在容器内的脚本里出现这句提示（本轮 R2 残留）。
  let insideNonVisible = 0;
  let visibleText = "";
  let sawContainer = false;
  await new HTMLRewriter()
    .on(`#${NO_RESULT_CONTAINER_ID}`, {
      element(element) {
        sawContainer = true;
        insideContainer = true;
        element.onEndTag(() => {
          insideContainer = false;
          insideNonVisible = 0;
        });
      },
    })
    .on(`#${NO_RESULT_CONTAINER_ID} script, #${NO_RESULT_CONTAINER_ID} style, #${NO_RESULT_CONTAINER_ID} noscript, #${NO_RESULT_CONTAINER_ID} template`, {
      element(element) {
        insideNonVisible += 1;
        element.onEndTag(() => {
          if (insideNonVisible > 0) insideNonVisible -= 1;
        });
      },
    })
    .on(`#${NO_RESULT_CONTAINER_ID} *`, {
      text(chunk) {
        if (!insideContainer || insideNonVisible > 0) return;
        visibleText += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();
  return sawContainer && visibleText.includes(NO_RESULT_TEXT);
}

/**
 * 解析结果页 HTML。返回前已经排除了「被拦截」与「无法识别」两种页面。
 */
export async function parseWechatSearchHtml(html: string): Promise<WechatSearchParseResult> {
  if (await isAntispiderPage(html)) {
    throw new WechatSearchBlockedError();
  }

  const items: PendingItem[] = [];
  let current: PendingItem | null = null;
  let inTitle = false;
  let inSummary = false;
  let inSource = false;
  let inTime = false;

  await new HTMLRewriter()
    .on("ul.news-list li", {
      element(element) {
        current = { title: "", href: "", summary: "", source: "", time: "" };
        element.onEndTag(() => {
          if (current) items.push(current);
          current = null;
          inTitle = false;
          inSummary = false;
          inSource = false;
          inTime = false;
        });
      },
    })
    .on("ul.news-list li h3 a", {
      element(element) {
        if (!current) return;
        current.href = element.getAttribute("href") ?? "";
        inTitle = true;
        element.onEndTag(() => {
          inTitle = false;
        });
      },
      text(chunk) {
        if (current && inTitle) current.title += chunk.text;
      },
    })
    .on("ul.news-list li p.txt-info", {
      element(element) {
        inSummary = true;
        element.onEndTag(() => {
          inSummary = false;
        });
      },
      text(chunk) {
        if (current && inSummary) current.summary += chunk.text;
      },
    })
    .on("ul.news-list li .s-p span.all-time-y2", {
      element(element) {
        inSource = true;
        element.onEndTag(() => {
          inSource = false;
        });
      },
      text(chunk) {
        if (current && inSource) current.source += chunk.text;
      },
    })
    .on("ul.news-list li .s-p span.s2", {
      element(element) {
        inTime = true;
        element.onEndTag(() => {
          inTime = false;
        });
      },
      text(chunk) {
        if (current && inTime) current.time += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();

  const articles: WechatArticle[] = [];
  for (const item of items) {
    const title = compactWhitespace(item.title);
    const url = normalizeArticleUrl(item.href);
    if (!title || !url) continue;
    const summary = compactWhitespace(item.summary);
    const source = compactWhitespace(item.source);
    const datetime = parseTimeConvertTimestamp(item.time);
    articles.push({
      title,
      url,
      ...(summary ? { summary } : {}),
      ...(datetime ? { datetime } : {}),
      ...(source ? { source } : {}),
    });
  }

  if (articles.length > 0) return { articles, noResults: false };

  if (await hasNoResultContainerWithText(html)) {
    return { articles: [], noResults: true };
  }

  // 有 li 但一条都取不出可用字段，说明页面结构变了：宁可报错也不要冒充空结果。
  throw new WechatSearchUnexpectedPageError();
}
