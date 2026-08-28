import { describe, expect, test } from "bun:test";
import stringWidthRaw from "string-width";
import {
  __clearDisplayWidthCacheForTest,
  __getDisplayWidthCacheSizeForTest,
  buildWindowTitle,
  displayWidth,
  stripAnsi,
  tokenizeAnsiLine,
} from "./tuiAnsi";
import { getCliLocale, setCliLocale } from "./i18n";

describe("displayWidth grapheme clusters", () => {
  test("counts ZWJ families and emoji modifiers as one double-width cell cluster", () => {
    expect(displayWidth("👨‍👩‍👧‍👦")).toBe(2);
    expect(displayWidth("👍🏽")).toBe(2);
    expect(displayWidth("❤️")).toBe(2);
  });
});

describe("terminal escape handling", () => {
  test("strips OSC title sequences that the old CSI-only regex missed", () => {
    expect(stripAnsi("A\x1b]0;untrusted title\x07B")).toBe("AB");
  });

  test("tokenizer consumes unsupported escapes and always makes progress", () => {
    const tokens = tokenizeAnsiLine("A\x1b]0;untrusted title\x07B");
    expect(tokens.filter((token) => token.kind === "char").map((token) => token.value).join(""))
      .toBe("AB");
  });
});

describe("buildWindowTitle", () => {
  test("strips ANSI sequences from title", () => {
    const res = buildWindowTitle("\x1b[31mBold Red Title\x1b[0m");
    expect(res).toBe("\x1b]0;Bold Red Title\x07\x1b]2;Bold Red Title\x07");
  });

  test("replaces CRLF and LF newlines with spaces", () => {
    const res = buildWindowTitle("First Line\r\nSecond Line\nThird Line");
    expect(res).toBe(
      "\x1b]0;First Line Second Line Third Line\x07\x1b]2;First Line Second Line Third Line\x07",
    );
  });

  test("truncates title exceeding 80 display columns, accounting for CJK width", () => {
    // 42 Chinese characters (width 2 each = 84 cols), should truncate to 40 characters (80 cols)
    const longTitle = "测试".repeat(21);
    const res = buildWindowTitle(longTitle);
    const expectedText = "测试".repeat(20);
    expect(res).toBe(`\x1b]0;${expectedText}\x07\x1b]2;${expectedText}\x07`);
  });

  test("uses BEL (\\x07) as string terminator for both OSC 0 and OSC 2", () => {
    const res = buildWindowTitle("Hello World");
    expect(res.startsWith("\x1b]0;Hello World\x07")).toBe(true);
    expect(res.endsWith("\x1b]2;Hello World\x07")).toBe(true);
    expect(res).toBe("\x1b]0;Hello World\x07\x1b]2;Hello World\x07");
  });

  test("filters C0 control characters (BEL/ESC) so they cannot break the OSC sequence", () => {
    const res = buildWindowTitle("Task\x07Urgent");
    // The embedded BEL must be replaced with a space, not terminate the sequence early.
    expect(res).toBe("\x1b]0;Task Urgent\x07\x1b]2;Task Urgent\x07");
  });
});

/**
 * Reference 实现：优化前的 displayWidth（在实现被优化后这里原样保留，用于等价性对照）。
 * 语义与生产实现的历史版本一致：全量字素分段 + 每 cluster 一次 stringWidth 判定加宽。
 */
const refGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function referenceDisplayWidth(str: string, locale: "zh" | "en"): number {
  const plain = stripAnsi(str);
  let width = stringWidthRaw(plain);
  for (const { segment } of refGraphemeSegmenter.segment(plain)) {
    if (stringWidthRaw(segment) !== 1) continue;
    const code = segment.codePointAt(0) ?? 0;
    const forceWideSymbol =
      (code >= 0x2600 && code <= 0x27bf && !(code >= 0x2768 && code <= 0x2775)) ||
      (code >= 0x2b00 && code <= 0x2bff) ||
      (code >= 0x1f300 && code <= 0x1faff);
    // 与生产实现同步：EA=A 常见符号（箭头/数学/项目符号）强制按 2 列计。
    const ambiguousWide =
      (code >= 0x2190 && code <= 0x2195) ||
      code === 0x21d0 || code === 0x21d2 || code === 0x21d4 ||
      code === 0x00d7 || code === 0x00f7 || code === 0x00b1 ||
      code === 0x2022 || code === 0x00b7;
    const cjkQuote =
      locale === "zh" && (code === 0x201c || code === 0x201d || code === 0x2018 || code === 0x2019);
    if (forceWideSymbol || ambiguousWide || cjkQuote) width += 1;
  }
  return width;
}

describe("displayWidth equivalence with reference implementation", () => {
  // 覆盖 ASCII / 中文 / 日文 / emoji(含 ZWJ、肤色修饰符) / 组合重音 / 双宽符号 / ANSI 混排 /
  // 空串 / 纯 ANSI，以及命中/未命中加宽区间的各种边界。
  const samples: string[] = [
    "", // 空串
    "a", "abc", "Hello, World!", // 纯 ASCII
    "  \t ", "1234567890", // 空白/数字
    "\x1b[31mred\x1b[0m", // 纯 ANSI
    "\x1b[1;32mbold green\x1b[0m done", // ANSI 混排
    "中文测试", // 中文
    "日本語のテストです", // 日文
    "混合abc中文xyz", // 中英混合
    "☀☁☂", // 杂项符号区间 0x2600-0x27bf
    "❌⚠️❗", // 同上
    "❨❩❪❫", // 括号区间 0x2768-0x2775（应排除加宽）
    "⭕⭐⭐", // 0x2b00-0x2bff 区间
    "🀄🃏🎴", // 0x1f300-0x1faff 区间
    "👨‍👩‍👧", // ZWJ 家庭 emoji
    "👨‍👩‍👧‍👦", // ZWJ 家庭 emoji（4人）
    "👍🏽", // 肤色修饰符
    "❤️", // 变体选择符 emoji
    "🏳️‍🌈", // 旗帜 ZWJ
    "e\u0301", "a\u0301", // 组合重音
    "日本\u0301語", // 组合重音混中文
    "\u201c引号\u201d", // 中文引号（zh 下加宽）
    "\u2018单引\u2019", // 中文单引号（zh 下加宽）
    "“quote”", // 英文引号（en 下不加宽）
    "→←↑↓", // 箭头
    "©®™", // 标点符号
    "ＡＢＣ全角", // 全角
    "＃＄％", // 全角符号
    "零宽\u200b空格", // 零宽字符
    "🚀🚀🚀", // rocket
    "😀🙂🙃", // 普通 emoji
    "表格｜线│", // 制表符/线框
    "x\u2028y", // 行分隔符
  ];

  // 额外生成一些组合：中文引号嵌在 emoji/符号里，确保命中路径混合
  const mixedSamples = [
    "中文“引号”加emoji😀",
    "☀测试🌙结束",
    "a\u201cb\u201d",
    "\u201c\u2600\u201d",
    "👨‍👩‍👧“测试”",
  ];

  for (const locale of ["zh", "en"] as const) {
    describe(`locale=${locale}`, () => {
      for (const s of [...samples, ...mixedSamples]) {
        test(`displayWidth(${JSON.stringify(s)}) matches reference`, () => {
          setCliLocale(locale);
          const got = displayWidth(s);
          const expected = referenceDisplayWidth(s, locale);
          expect(got).toBe(expected);
        });
      }
    });
  }

  /**
   * 回归：纯 ASCII 行必须走「不进缓存」的快路径。
   *
   * scanWidthNeeds 曾在循环结束时恒返回 hasNonAscii:true，使快路径成为死代码，
   * 所有 ASCII 行改走缓存写入 + FIFO 淘汰（实测各异 ASCII 行慢 13x）。行为正确
   * 但性能目标落空，且这类缺陷无法被等价性测试发现，故在此单独锁定。
   *
   * 判据：大量互不相同的 ASCII 行不应因缓存淘汰而显著慢于重复的同一行。
   */
  test("pure-ASCII lines take the uncached fast path", () => {
    setCliLocale("zh");
    __clearDisplayWidthCacheForTest();

    // 1000 条互不相同的 ASCII 行：全部走快路径，缓存必须一条不写。
    for (let i = 0; i < 1000; i++) displayWidth(`plain ascii line ${i}`);
    expect(__getDisplayWidthCacheSizeForTest()).toBe(0);

    // ANSI 只影响 stripAnsi 前的原串，剥离后仍是纯 ASCII，同样不该写缓存。
    displayWidth("\x1b[31mred ascii\x1b[39m");
    expect(__getDisplayWidthCacheSizeForTest()).toBe(0);

    // 对照：非 ASCII 行确实会写缓存，证明上面的 0 不是因为缓存整体失效。
    displayWidth("中文行");
    expect(__getDisplayWidthCacheSizeForTest()).toBe(1);

    __clearDisplayWidthCacheForTest();
  });

  test("the display width cache is bounded", () => {
    setCliLocale("zh");
    __clearDisplayWidthCacheForTest();
    // 远超上限（4096）的各异非 ASCII 行，缓存不得无界增长。
    for (let i = 0; i < 6000; i++) displayWidth(`中文行 ${i}`);
    expect(__getDisplayWidthCacheSizeForTest()).toBeLessThanOrEqual(4096);
    __clearDisplayWidthCacheForTest();
  });

  test("getCliLocale is restored to zh after equivalence tests (test isolation)", () => {
    // 上一个 loop 已把 locale 设为 en，确认状态与 getCliLocale 一致即可；
    // 生产启动默认 zh，这里还原，避免影响其它测试文件假设。
    setCliLocale("zh");
    expect(getCliLocale()).toBe("zh");
  });
});

describe("displayWidth / East Asian Ambiguous 符号强制加宽", () => {
  // 缺陷 B：EA=A 符号（箭头/数学/项目符号）stringWidth 按 1 列计，但 CJK
  // 终端实际按 2 列渲染 → 表格 pad 不足、框线错位。修复后 displayWidth 必须
  // 按 2 列计，且 zh/en 两个 locale 下行为一致（这些符号与 CJK 引号不同，
  // 不依赖 locale）。
  const ambiguous = ["→", "←", "↑", "↓", "↔", "↕", "⇒", "⇐", "⇔", "×", "÷", "±", "•", "·"];
  for (const locale of ["zh", "en"] as const) {
    describe(`locale=${locale}`, () => {
      for (const c of ambiguous) {
        test(`displayWidth(${JSON.stringify(c)}) = 2 (EA=A 按 2 列)`, () => {
          setCliLocale(locale);
          expect(displayWidth(c)).toBe(2);
        });
      }
      test("EA=A 符号混排行按 2 列计宽", () => {
        setCliLocale(locale);
        // 131072 → 1_000_000 +：→ 计 2 列，其余 ASCII 各 1 列。
        expect(displayWidth("131072 → 1_000_000 +")).toBe(21);
        expect(displayWidth("×8 换算")).toBe(8); // ×2 + 8 + 空格 + 换算4
      });
    });
  }
  test("框线字符不受 EA=A 加宽影响（仍按 1 列）", () => {
    setCliLocale("zh");
    for (const c of ["─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼"]) {
      expect(displayWidth(c)).toBe(1);
    }
  });
});
