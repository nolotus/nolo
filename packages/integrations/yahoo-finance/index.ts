// yahoo-finance2 常驻约 13MB（84 个模块），而服务端/桌面端在启动时只为拿下面的
// tool schema 就会加载本文件。客户端改为首次调用时才动态加载，schema 保持静态。
let yahooFinancePromise: Promise<any> | null = null;
function getYahooFinanceClient(): Promise<any> {
  if (!yahooFinancePromise) {
    const pending = import("yahoo-finance2").then(
      ({ default: YahooFinance }) => new YahooFinance(),
    );
    yahooFinancePromise = pending;
    // 加载失败不缓存，下次调用可重试；按身份清除，不误清后来的重试。
    pending.catch(() => {
      if (yahooFinancePromise === pending) yahooFinancePromise = null;
    });
  }
  return yahooFinancePromise;
}

// 1. 获取股票实时报价 (Quote)
export async function getYahooFinanceQuote(symbol: string) {
  try {
    const yahooFinance = await getYahooFinanceClient();
    const quote = await yahooFinance.quote(symbol);
    return quote;
  } catch (error: any) {
    throw new Error(`Failed to get quote for ${symbol}: ${error.message}`);
  }
}

// 2. 获取股票历史数据 (Historical)
export async function getYahooFinanceHistorical(
  symbol: string,
  period1: string | Date,
  period2?: string | Date
) {
  try {
    const queryOptions: any = { period1 };
    if (period2) {
      queryOptions.period2 = period2;
    }
    const yahooFinance = await getYahooFinanceClient();
    const result = await yahooFinance.historical(symbol, queryOptions);
    return result;
  } catch (error: any) {
    throw new Error(`Failed to get historical data for ${symbol}: ${error.message}`);
  }
}

// 3. 工具的 OpenAI Schema 定义
export const YAHOO_FINANCE_TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "getYahooFinanceQuote",
      description: "Get real-time stock quote and financial summary for a given ticker symbol (e.g., AAPL, TSLA).",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The stock ticker symbol to look up.",
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getYahooFinanceHistorical",
      description: "Get historical pricing data (open, high, low, close, volume) for a specific stock ticker.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The stock ticker symbol.",
          },
          period1: {
            type: "string",
            description: "Start date in YYYY-MM-DD format.",
          },
          period2: {
            type: "string",
            description: "End date in YYYY-MM-DD format (optional, defaults to current date).",
          },
        },
        required: ["symbol", "period1"],
      },
    },
  },
];
