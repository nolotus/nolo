/**
 * Platform-owned `stock-quotes` built-in skill.
 *
 * 股票行情查询（stock-api）指导规范。
 * 内容全部来自代码，经 builtinSkillRegistry 暴露给 Web、Desktop、CLI、TUI 等端。
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const STOCK_QUOTES_SKILL_SLUGS = ["stock-quotes"] as const;

export type StockQuotesSkillSlug = (typeof STOCK_QUOTES_SKILL_SLUGS)[number];

function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

export function buildStockQuotesSkillId(slug: StockQuotesSkillSlug): string {
  return deterministicId("01SK", slug);
}

export function buildStockQuotesSkillPageKey(
  userId: string,
  slug: StockQuotesSkillSlug,
): string {
  return `page-${userId}-${buildStockQuotesSkillId(slug)}`;
}

export function buildStockQuotesSkillConfig(
  slug: StockQuotesSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildStockQuotesSkillId(slug),
    name: "股票行情查询（stock-api）",
    triggerMode: "explicit",
    description:
      "用 npx stock-api 查 A 股、港股、美股、场内基金的实时行情快照与 K 线（日/周/月）。触发词：查股价、现在多少钱、行情、涨跌幅、收盘价、K线、日线、A股、港股、美股、ETF、股票代码、stock-api。注意：不查财报、基本面、估值分位、资金流、公告、分钟级实时；需要出网并允许执行外部 npm 包。",
  };
}

const BODY = `# 股票行情查询（stock-api）

## 能做什么、不能做什么

**能查**：A 股、港股、美股、场内基金的当前行情快照（现价、昨收、涨跌幅、当日最高最低），以及 K 线（日/周/月，含成交量）。

**不能查**：财报、基本面指标、估值分位、资金流、分红送转、公告、分钟级实时。要这些必须换别的源，不要在这个 skill 上硬凑。

数据来自 \`stock-api\`（MIT，零运行时依赖，1995 star），底层是腾讯 / 新浪 / 东方财富的公开网页接口封装。

> **它不是授权数据源**。个人看盘、研究、原型可以直接用；做对外收费产品或要 SLA，先解决数据授权和稳定性，别把这个库当成解决方案。

## 代码格式（最容易错的一步）

\`SH\` / \`SZ\` / \`HK\` / \`US\` 前缀 + 无分隔符代码：

- \`SH600519\` 贵州茅台
- \`SZ000651\` 格力电器
- \`SH510500\` 中证500ETF
- \`HK00700\` 腾讯控股
- \`USAAPL\` 苹果

只写 \`600519\` 会失败，必须带前缀。

## 命令

\`\`\`bash
# 单只行情
npx -y stock-api get-stock SH600519

# 批量行情（一次多只，比循环调单只省事）
npx -y stock-api get-stocks SH510500 SZ000651 HK00700 USAAPL

# K 线：period 可选 day|week|month，count 是根数
npx -y stock-api get-klines SH600519 --period day --count 120

# 按名字找代码（不知道代码时先用这个）
npx -y stock-api search-stocks 格力电器
\`\`\`

通用可选 \`--source auto|tencent|sina|eastmoney\`，默认 \`auto\`。

## 输出字段与两个坑

\`get-stock\` / \`get-stocks\` 返回：

\`\`\`json
{ "code": "SH510500", "name": "中证500ETF南方", "now": 6.661,
  "low": 6.35, "high": 6.688, "yesterday": 6.38,
  "percent": 0.044043887147335425, "source": "tencent" }
\`\`\`

- **\`percent\` 是小数比例，不是百分数**。\`0.04404\` = **+4.40%**。直接当百分比念出去会差 100 倍。
  验算：\`6.661 / 6.38 - 1 = 0.04404\` ✓
- **\`source\` 是实际命中的源**。\`auto\` 会兜底，所以看这个字段就知道数据是谁给的、也可用来判断"现在哪家挂了"。

\`get-klines\` 返回数组，每根含 \`date\` / \`open\` / \`high\` / \`low\` / \`close\` / \`volume\` / \`source\`。

## 数据源与兜底

默认顺序 \`tencent → sina → eastmoney\`。

- 三个源全部不可用时没有第四个兜底，会直接报错——这时老实告诉用户"行情源当前不可用"，不要凭印象编一个价格。
- \`eastmoney.searchStocks\` 依赖的搜索接口对部分境外 IP（海外服务器、CI 出口）会返回空，所以在境外环境按名字搜股票可能搜不到，换 \`--source tencent\` 或直接给代码。

## 已知限制（都是实测，不是推测）

- **CLI 没有 \`inspect-stock\`**。README 里说的"诊断"能力只存在于 MCP 工具 \`inspect_stock\`，CLI 直接跑会返回 \`Unknown command: inspect-stock\`。
- **\`--adjust qfq|hfq\` 参数存在，但换算正确性未验证**。在 2026-11-03 / 11-04 两天的茅台样本上，\`--adjust qfq\` 与 \`--adjust none\` 输出完全相同（这两日无除权，属正常表现，不构成验证）。做跨年长周期回测前，先拿一只确定除过权的票自己校对一次。
- **首次 \`npx\` 会下载包**，有几秒冷启动；之后走本地缓存。用 \`-y\` 避免交互提示卡住。
- 需要出网，并且允许执行外部 npm 包。

## 使用纪律

查到的价格必须原样引用命令输出，不要四舍五入改写成"大约"或补一个自己算的目标价。用户问的是投资判断时，给数据 + 说明这是快照行情（无时间戳、非实时推送），不越界当投资建议。`;

export function buildStockQuotesSkillContentBySlug(
  slug: StockQuotesSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildStockQuotesSkillConfig(slug),
  });
}
