import { afterEach, describe, expect, it, mock } from "bun:test";

// 测试需要运行时计算 ?test=N 后缀来打掉模块缓存；这是 bun:test
// 在多 case 共享同一份被测模块时的标准 cache-busting 手法，
// 属于 ts-no-dynamic-import 规则下的「测试边界」豁免场景。
type ApifyParams = { actorId: string; input: Record<string, unknown> };

function makeCapture(): {
  ref: { current: ApifyParams | null };
  set: (params: ApifyParams) => void;
} {
  const ref: { current: ApifyParams | null } = { current: null };
  return { ref, set: (params) => (ref.current = params) };
}

let moduleVersion = 0;
let activeImpl: (params: ApifyParams) => unknown = () => {
  throw new Error("not set");
};

function setupModuleMocks() {
  mock.module("./apifyActorClient", () => ({
    callApifyActor: (_thunkApi: unknown, params: unknown) => {
      return activeImpl(params as ApifyParams);
    },
  }));
}

async function loadModule() {
  setupModuleMocks();
  const mod = await import(
    `./googleSearchScraperTool.ts?test=${moduleVersion++}`
  );
  mock.restore();
  return mod;
}

const thunkApi = {} as unknown;

afterEach(() => {
  mock.restore();
  activeImpl = () => {
    throw new Error("not set");
  };
});

describe("googleSearchScraperFunc", () => {
  it("accepts the OpenAI-style single `query` string and forwards a trimmed, newline-joined input", async () => {
    const { googleSearchScraperFunc } = await loadModule();
    const cap = makeCapture();
    activeImpl = (params) => {
      cap.set(params);
      return { rawData: [], displayData: "ok" };
    };

    await googleSearchScraperFunc(
      { query: "  香港演艺人协会 历届会长  " },
      thunkApi,
    );

    const input = cap.ref.current?.input;
    expect(input).toBeDefined();
    expect(input?.queries).toBe("香港演艺人协会 历届会长");
    expect(input?.maxPagesPerQuery).toBe(1);
    expect(input?.resultsPerPage).toBe(10);
  });

  it("accepts the legacy `queries` array and preserves ordering", async () => {
    const { googleSearchScraperFunc } = await loadModule();
    const cap = makeCapture();
    activeImpl = (params) => {
      cap.set(params);
      return { rawData: [], displayData: "ok" };
    };

    await googleSearchScraperFunc(
      { queries: ["apple", "banana", "cherry"] },
      thunkApi,
    );

    expect(cap.ref.current?.input.queries).toBe("apple\nbanana\ncherry");
  });

  it("merges both `query` and `queries` when both are provided", async () => {
    const { googleSearchScraperFunc } = await loadModule();
    const cap = makeCapture();
    activeImpl = (params) => {
      cap.set(params);
      return { rawData: [], displayData: "ok" };
    };

    await googleSearchScraperFunc(
      { query: "alpha", queries: ["beta", "gamma"] },
      thunkApi,
    );

    expect(cap.ref.current?.input.queries).toBe("alpha\nbeta\ngamma");
  });

  it("treats a string `queries` as a single element (model edge case)", async () => {
    const { googleSearchScraperFunc } = await loadModule();
    const cap = makeCapture();
    activeImpl = (params) => {
      cap.set(params);
      return { rawData: [], displayData: "ok" };
    };

    await googleSearchScraperFunc({ queries: "solo search term" }, thunkApi);

    expect(cap.ref.current?.input.queries).toBe("solo search term");
  });

  it("throws when neither `query` nor `queries` is provided", async () => {
    const { googleSearchScraperFunc } = await loadModule();

    await expect(
      googleSearchScraperFunc({}, thunkApi),
    ).rejects.toThrow("必须提供至少一个搜索关键词");
  });

  it("throws when both inputs are blank strings / arrays of blanks", async () => {
    const { googleSearchScraperFunc } = await loadModule();

    await expect(
      googleSearchScraperFunc(
        { query: "   ", queries: ["  ", "\t"] },
        thunkApi,
      ),
    ).rejects.toThrow("必须提供至少一个搜索关键词");
  });

  it("passes through optional Actor inputs unchanged", async () => {
    const { googleSearchScraperFunc } = await loadModule();
    const cap = makeCapture();
    activeImpl = (params) => {
      cap.set(params);
      return { rawData: [], displayData: "ok" };
    };

    await googleSearchScraperFunc(
      {
        query: "site:example.com test",
        maxPagesPerQuery: 2,
        resultsPerPage: 25,
        languageCode: "zh-CN",
        countryCode: "cn",
        mobileResults: true,
        includeUnfilteredResults: true,
        saveHtml: true,
      },
      thunkApi,
    );

    expect(cap.ref.current?.input).toEqual({
      queries: "site:example.com test",
      maxPagesPerQuery: 2,
      resultsPerPage: 25,
      mobileResults: true,
      includeUnfilteredResults: true,
      saveHtml: true,
      languageCode: "zh-CN",
      countryCode: "cn",
    });
  });
});
