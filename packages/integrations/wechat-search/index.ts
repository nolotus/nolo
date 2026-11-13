/**
 * 微信公众号文章搜索数据源（后端）。
 *
 * 能力来源：抓取 `https://weixin.sogou.com/weixin?type=2&query=<kw>&ie=utf8` 的 HTML
 * 并解析（无 API key、无第三方付费接口）。解析在 ./parser.ts（纯函数、可单测）。
 *
 * 已知限制（实测，不要当成 bug 去「修」）：
 * - 返回的是搜狗中间跳转链接（`weixin.sogou.com/link?url=...`），不是 mp.weixin.qq.com 直链。
 *   直链解析（跟随跳转）实测成功率 0/2，本次不实现；链接必须在浏览器里打开才会跳转。
 * - 搜狗有反爬：可能返回 antispider 验证页。此时 parser 抛 WechatSearchBlockedError，
 *   **绝不**返回空数组冒充「没搜到」。
 * - 反爬风险要求低频：全局并发上限 1，请求间隔 ≥1s。
 */

import { createConcurrencyLimiter } from "core/concurrencyLimiter";

import {
  parseWechatSearchHtml,
  WechatSearchBlockedError,
  type WechatArticle,
} from "./parser";

export {
  parseWechatSearchHtml,
  WechatSearchBlockedError,
  WechatSearchUnexpectedPageError,
} from "./parser";
export type { WechatArticle } from "./parser";

export const WECHAT_SEARCH_DEFAULT_NUM = 10;
/** 硬上限：搜狗每页 10 条，最多翻 2 页。 */
export const WECHAT_SEARCH_MAX_NUM = 20;
const PAGE_SIZE = 10;
const MAX_PAGES = Math.ceil(WECHAT_SEARCH_MAX_NUM / PAGE_SIZE);
const REQUEST_TIMEOUT_MS = 15_000;
/** 两次请求起始时刻的最小间隔（反爬前的自我限速）。 */
const MIN_REQUEST_INTERVAL_MS = 1_000;

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const WECHAT_SEARCH_TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "searchWechatArticles",
      description:
        "搜索微信公众号文章（数据来自搜狗微信搜索）。返回文章标题、摘要、发布时间、公众号名称与链接。" +
        "注意：返回的是搜狗中间跳转链接（https://weixin.sogou.com/link?url=...），不是 mp.weixin.qq.com 直链，" +
        "必须在浏览器中打开才会跳转到公众号原文，且这类链接有时效性。" +
        "搜狗有反爬限制，请低频调用（不要连续高频调用，两次调用之间至少间隔 1 秒），不要用它做批量抓取。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词（如 '大模型 推理成本'）。",
          },
          num: {
            type: "number",
            description: "返回的文章数量。默认为 10，最大不超过 20。",
          },
        },
        required: ["query"],
      },
    },
  },
];

/** 全局并发 1：所有调用方共享同一个限流器（模块级，跨请求生效）。 */
const requestLimiter = createConcurrencyLimiter(1);
let lastRequestStartedAt = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function searchUrl(query: string, page: number): string {
  const base = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}&ie=utf8`;
  return page > 1 ? `${base}&page=${page}` : base;
}

async function fetchSearchPage(query: string, page: number): Promise<string> {
  return requestLimiter.run(async () => {
    const wait = lastRequestStartedAt + MIN_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestStartedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(searchUrl(query, page), {
        headers: {
          "User-Agent": DESKTOP_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to reach Sogou WeChat search: ${reason}`);
    }
    // 被重定向到 /antispider 时 body 也是验证页，这里提前给出更明确的错误。
    // 判据必须是**路径**含 antispider，不能对整个 URL 做子串匹配——否则搜索
    // 关键词里出现 "antispider" 时，正常结果也会被误判为反爬（本轮 R3）。
    let redirectedToAntispider = false;
    try {
      redirectedToAntispider = new URL(response.url).pathname.includes("antispider");
    } catch {
      // response.url 不是合法 URL 时不据此判定，交给 parser 的结构化检测。
      redirectedToAntispider = false;
    }
    if (redirectedToAntispider) throw new WechatSearchBlockedError();
    if (!response.ok) {
      throw new Error(`Sogou WeChat search returned HTTP ${response.status}`);
    }
    return await response.text();
  });
}

function normalizeNum(num?: number): number {
  const requested = Number(num);
  if (!Number.isFinite(requested) || requested <= 0) return WECHAT_SEARCH_DEFAULT_NUM;
  return Math.max(1, Math.min(WECHAT_SEARCH_MAX_NUM, Math.trunc(requested)));
}

/**
 * 搜索微信公众号文章。结果形状与既有数据源一致（`{ results }`）。
 *
 * 失败语义：反爬/网络/HTTP/页面结构无法识别都会抛错——空结果只可能来自页面明确说
 * 「没有找到相关的微信公众号文章」（此时 `noResults: true` 且 `results` 为空）。
 */
export async function searchWechatArticles(
  query: string,
  num: number = WECHAT_SEARCH_DEFAULT_NUM,
): Promise<{ results: WechatArticle[]; noResults: boolean }> {
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("Search query cannot be empty.");
  }
  const keyword = query.trim();
  const limit = normalizeNum(num);

  const results: WechatArticle[] = [];
  const seen = new Set<string>();
  let noResults = false;

  for (let page = 1; page <= MAX_PAGES && results.length < limit; page += 1) {
    const html = await fetchSearchPage(keyword, page);
    const parsed = await parseWechatSearchHtml(html);
    if (parsed.noResults) {
      noResults = results.length === 0;
      break;
    }
    let added = 0;
    for (const article of parsed.articles) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      results.push(article);
      added += 1;
      if (results.length >= limit) break;
    }
    // 整页都是已见过的链接（或翻页返回同一页）：继续翻只会加重反爬风险。
    if (added === 0) break;
  }

  return { results, noResults };
}
