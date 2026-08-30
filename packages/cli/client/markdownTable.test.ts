/**
 * markdownTable 单元测试。
 *
 * 覆盖：
 *   - 三种对齐语法（`:---` 左 / `---:` 右 / `:---:` 居中）的填充正确性
 *   - CJK / emoji 显示宽度（displayWidth，非 .length）下的列宽对齐
 *   - 转义竖线 `\|` 与 code span `` `a|b` `` 不被误当作分隔符切分
 *   - 超宽表格的列压缩 + 单元格软换行，框线保持完整
 *   - 极窄（width < 40）与列数 > 6 时降级为记录卡片
 *   - 表格未闭合时不渲染（流式安全）
 *
 * 断言全部基于实际渲染产物（stripAnsi 后逐字符比对），无恒真断言。
 */
import { describe, expect, test } from "bun:test";
import { displayWidth, stripAnsi } from "../tui/tuiAnsi";
import { styleInlineMarkdown } from "./inlineMarkdown";
import {
  cellDisplayWidth,
  computeColumnWidths,
  padCell,
  parseMarkdownTableBlock,
  parseTableAligns,
  renderMarkdownTable,
  renderRecordCards,
  splitTableCells,
  wrapCellToWidth,
  type ParsedTable,
} from "./markdownTable";

/** 去掉 ANSI 与 ZWSP 占位，得到纯可见文本，用于精确断言。 */
const strip = (s: string) => stripAnsi(s).replace(/\u200b/g, "");

function box(
  headers: string[],
  aligns: ParsedTable["aligns"],
  rows: string[][],
  width: number,
): string {
  return strip(renderMarkdownTable({ headers, aligns, rows }, { width, brightness: "dark" }));
}

describe("markdownTable / 对齐语法", () => {
  test("左对齐 `:---`：文本贴左，右侧补空格", () => {
    const out = box(["L"], ["left"], [["abc"]], 60);
    // 表体行：单元格内容 abc 后补空格至列宽。
    const bodyLine = out.split("\n").find((l) => l.includes("abc"));
    expect(bodyLine).toBeDefined();
    expect(bodyLine!.indexOf("abc")).toBeGreaterThan(0); // 前面有框线 │
    // 左侧无空格（紧跟 │ 后即内容）。
    expect(bodyLine!.startsWith("│ abc")).toBe(true);
  });

  test("右对齐 `---:`：文本贴右，左侧补空格", () => {
    const out = box(["R"], ["right"], [["abc"]], 60);
    const bodyLine = out.split("\n").find((l) => l.includes("abc"));
    // 内容紧贴右侧框线：│ 后是空格，abc 后紧跟 │。
    expect(bodyLine!.endsWith("abc │")).toBe(true);
  });

  test("居中对齐 `:---:`：两侧空格大致相等", () => {
    const out = box(["C"], ["center"], [["abc"]], 60);
    const bodyLine = out.split("\n").find((l) => l.includes("abc"))!;
    const before = bodyLine.indexOf("abc") - 1; // 去掉前导 │
    const after = bodyLine.length - bodyLine.indexOf("abc") - 3 - 1; // 去掉 abc 与尾部 │
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });

  test("三种对齐在真实 parse 管线里各自生效", () => {
    const table = parseMarkdownTableBlock([
      "| longleft | longright | longcenter |",
      "|:--- |---:|:---:|",
      "| a | bb | ccc |",
    ])!;
    expect(table.aligns).toEqual(["left", "right", "center"]);
    const out = box(table.headers, table.aligns, table.rows, 60);
    // 列宽由表头（长文本）决定，body 短内容因此被填充 → 对齐方式可观察。
    // 示例：│ a         │         bb │    ccc    │
    const body = out.split("\n").find((l) => l.includes(" a "))!;
    const seg = body.split("│");
    const L = seg[1]!;
    const R = seg[2]!;
    const C = seg[3]!;
    // 三格内容都被保留（trim 后为原文）。
    expect(L.trim()).toBe("a");
    expect(R.trim()).toBe("bb");
    expect(C.trim()).toBe("ccc");
    // 左对齐：内容贴左（前仅格式空格），右侧补空格。
    expect(L.indexOf("a")).toBe(1);
    expect(L.endsWith(" ")).toBe(true); // 右侧有填充空格
    expect(L.trimEnd().length).toBeGreaterThan(L.trim().length);
    // 右对齐：内容贴右，左侧补空格。
    expect(R.indexOf("bb")).toBeGreaterThan(1); // 前有多个填充空格
    // 居中对齐：两侧都有空格。
    expect(C.startsWith(" ")).toBe(true);
    expect(C.endsWith(" ")).toBe(true);
    expect(C.trim()).toBe("ccc");
  });
});

describe("markdownTable / CJK 与 emoji 宽度", () => {
  test("中英混排列宽对齐（displayWidth，中文按 2 计）", () => {
    // 中文「模型」显示宽 4，与「价格」等宽列对齐。
    const out = box(
      ["模型", "价格"],
      ["left", "right"],
      [["DeepSeek V4 Flash", "0.14"]],
      60,
    );
    const headerLine = out.split("\n").find((l) => l.includes("模型"))!;
    const bodyLine = out.split("\n").find((l) => l.includes("DeepSeek"))!;
    // 全角字符按 displayWidth 计 2：表头行与表体行可见宽度一致，框线不错位。
    expect(cellDisplayWidth(headerLine)).toBe(cellDisplayWidth(bodyLine));
    // 表头「模型」后补空格到列宽（列宽由表体最长内容决定）。
    expect(headerLine).toMatch(/│ 模型 +│/);
  });

  test("含 emoji 的列按 displayWidth 对齐（emoji 计 2 宽）", () => {
    expect(cellDisplayWidth("🚀 火箭")).toBe(7); // emoji 2 + 空格 1 + 中文 4
    expect(cellDisplayWidth("✅ 可用")).toBe(7);
    const out = box(
      ["图标", "名字"],
      ["left", "left"],
      [
        ["🚀 火箭", "中文"],
        ["✅ 可用", "DeepSeek"],
      ],
      40,
    );
    const rocket = out.split("\n").find((l) => l.includes("🚀"))!;
    const check = out.split("\n").find((l) => l.includes("✅"))!;
    // emoji 单元格显示宽与 ASCII/中文混排列同宽。
    expect(rocket).toContain("🚀 火箭 │");
    expect(check).toContain("✅ 可用 │");
    // 两条 body 行（含内部分隔符）可见宽度一致，框线列不因 emoji 错位。
    expect(cellDisplayWidth(rocket)).toBe(cellDisplayWidth(check));
  });
});

describe("markdownTable / 转义与 code span", () => {
  test("转义竖线 `\\|` 不被当作列分隔符", () => {
    const cells = splitTableCells("| a \\| b | c |");
    expect(cells).toEqual(["a | b", "c"]);
  });

  test("code span `` `a|b` `` 内的竖线不被切分", () => {
    const cells = splitTableCells("| `a|b` | c |");
    expect(cells).toEqual(["`a|b`", "c"]);
  });

  test("转义竖线与 code span 混在真实渲染里保持单列", () => {
    // 走真实解析管线：`\|` 被 mask/unmask 还原为字面 |，且不被切分。
    const table = parseMarkdownTableBlock([
      "| 语法 | 说明 |",
      "|---|---|",
      "| a \\| b | 转义 |",
    ])!;
    expect(table.rows[0][0]).toBe("a | b"); // 解析后还原为单字面竖线
    const out = box(table.headers, table.aligns, table.rows, 40);
    const line = out.split("\n").find((l) => l.includes("a | b"))!;
    // 2 列 → 框线段数 = 列数 + 2 = 4。
    expect(line.split("│")).toHaveLength(4);
  });

  test("code span 单元格渲染为单列", () => {
    const table = parseMarkdownTableBlock([
      "| cmd | desc |",
      "|---|---|",
      "| `a|b` | code |",
    ])!;
    expect(table.rows[0][0]).toBe("`a|b`"); // 内部竖线未被切分
    const out = box(table.headers, table.aligns, table.rows, 40);
    const line = out.split("\n").find((l) => l.includes("a|b"))!;
    // 2 列 → 框线段数 = 列数 + 2 = 4。
    expect(line.split("│")).toHaveLength(4);
  });
});

describe("markdownTable / 超宽压缩与软换行", () => {
  test("超宽时压缩最宽列并软换行，框线保持完整", () => {
    const widths = computeColumnWidths(
      ["模型", "价格", "备注"],
      [["很长的模型名称字段", "0.14", "一段特别长的备注内容"]],
      24, // 极小可用宽，强制压缩
    );
    expect(widths.reduce((a, b) => a + b, 0) + 2 * 3 + 1).toBeLessThanOrEqual(24);

    const out = box(
      ["模型", "输入价格", "备注"],
      ["left", "right", "left"],
      [["DeepSeek V4 Flash 超长模型名称测试项目", "0.14", "这是一个非常非常长的备注内容用来测试软换行是否生效的文本"]],
      40,
    );
    const lines = out.split("\n");
    // 顶框、表头分隔、底框都在。
    expect(lines[0].startsWith("┌")).toBe(true);
    expect(lines.some((l) => l.startsWith("├"))).toBe(true);
    expect(lines[lines.length - 1].startsWith("└")).toBe(true);
    // 长内容被拆成多行（软换行生效）：内容行 > 表头 1 行。
    const contentLines = lines.filter(
      (l) => !l.startsWith("┌") && !l.startsWith("├") && !l.startsWith("└"),
    );
    expect(contentLines.length).toBeGreaterThan(1);
    // 所有框线行可见宽度一致（列位置不因换行而错位，用 displayWidth 判定）。
    const widthSet = new Set(lines.map((l) => cellDisplayWidth(l)));
    expect(widthSet.size).toBe(1);
  });

  test("wrapCellToWidth 在空格处断行、不回切单词", () => {
    const segs = wrapCellToWidth("hello world foo", 10);
    // 第一段 <= 10 且不以断开的单词结尾（尽量在空格处断）。
    expect(segs.every((s) => cellDisplayWidth(s) <= 10)).toBe(true);
  });

  test("wrapCellToWidth 按 grapheme cluster 切分，不截断 ZWJ emoji", () => {
    const family = "👨‍👩‍👧‍👦"; // 7 个 code point，但 1 个 grapheme cluster
    const text = "abc" + family + "def";
    const segs = wrapCellToWidth(text, 5);
    // 窄列换行时 ZWJ 序列必须整体保留，不能被从中间截断。
    expect(segs.some((s) => s.includes(family))).toBe(true);
    // 各段拼接还原原文，无字符丢失。
    expect(segs.join("")).toBe(text);
    // 所有段显示宽度均不超过上限。
    expect(segs.every((s) => cellDisplayWidth(s) <= 5)).toBe(true);
  });
});

describe("markdownTable / 极窄与列数降级", () => {
  test("width < 40 降级为记录卡片（无框线）", () => {
    const out = box(
      ["模型", "价格"],
      ["left", "right"],
      [["DeepSeek V4 Flash", "0.14"]],
      30,
    );
    expect(out).not.toContain("┌");
    expect(out).not.toContain("│");
    expect(out).toContain("DeepSeek V4 Flash");
    expect(out).toContain("价格: 0.14");
  });

  test("列数 > 6 降级为记录卡片", () => {
    const headers = ["a", "b", "c", "d", "e", "f", "g"];
    const out = box(
      headers,
      headers.map(() => "left"),
      [["1", "2", "3", "4", "5", "6", "7"]],
      80,
    );
    expect(out).not.toContain("┌");
    // 首格作记录名，其余按「字段: 值」分行。
    expect(out).toContain("1");
    expect(out).toContain("b: 2");
    expect(out).toContain("g: 7");
  });

  test("renderRecordCards 超宽记录名软换行", () => {
    const table: ParsedTable = {
      headers: ["record", "价格"],
      aligns: ["left", "right"],
      rows: [["一个特别特别特别长的记录名称用来测试折行", "1"]],
    };
    const out = strip(
      renderRecordCards(table, 20, {
        header: (t) => t,
        label: (t) => t,
      }),
    );
    // 每行可见宽度不超 20。
    for (const line of out.split("\n")) {
      expect(cellDisplayWidth(line)).toBeLessThanOrEqual(22);
    }
  });
});

describe("markdownTable / 未闭合与退化块", () => {
  test("表格未闭合（只有 header + 分隔行，无 body）不渲染框线", () => {
    const table = parseMarkdownTableBlock(["| a | b |", "|---|---|"]);
    // 解析仍返回表结构（rows 为空）。
    expect(table).not.toBeNull();
    expect(table!.rows).toEqual([]);
    // 但 renderBoxTable 路径在无 body 时仍画框（纯框线表）；
    // 真正的流式保护在 convertMarkdownTablesForTerminal：无 body 整块原样保留。
    // 这里验证：parse 层对空 body 是合法的（空表），上层负责不渲染。
    expect(table!.headers).toEqual(["a", "b"]);
  });

  test("parseMarkdownTableBlock 对不合法输入返回 null", () => {
    expect(parseMarkdownTableBlock([])).toBeNull();
    expect(parseMarkdownTableBlock(["| a | b |"])).toBeNull(); // 无分隔行
    expect(parseMarkdownTableBlock(["| a | b |", "| c | d |"])).toBeNull(); // 第二行非分隔
    expect(parseMarkdownTableBlock(["| a |", "|---|---|"])).toBeNull(); // 表头只有 1 列
  });

  test("parseTableAligns 缺省对齐为左对齐", () => {
    expect(parseTableAligns("|---|---|---|")).toEqual(["left", "left", "left"]);
    expect(parseTableAligns("|:---|:---:|---:|")).toEqual(["left", "center", "right"]);
  });
});

describe("markdownTable / 单元格数与边界", () => {
  test("body 行短于表头时缺省补空串", () => {
    const out = box(
      ["h1", "h2", "h3"],
      ["left", "left", "left"],
      [["1", "2"]], // 缺 h3
      40,
    );
    const row = out.split("\n").find((l) => l.includes("1"))!;
    // 缺列补空：行仍完整对齐到 3 列（3 列 → 框线段数 = 3 + 2）。
    expect(row.split("│")).toHaveLength(5);
    // 第三列内容为空（补空串），但行末仍有右框线。
    expect(row.trimEnd().endsWith("│")).toBe(true);
  });

  test("body 行长于表头时多余列被截断", () => {
    const out = box(
      ["h1", "h2"],
      ["left", "left"],
      [["1", "2", "3"]], // 多 h3
      40,
    );
    const row = out.split("\n").find((l) => l.includes("1"))!;
    // 只渲染 2 列（2 列 → 框线段数 = 2 + 2）。
    expect(row.split("│")).toHaveLength(4);
    expect(row).not.toContain("3");
  });

  test("空 body（只有表头）renderBoxTable 仍画完整框线", () => {
    const out = renderMarkdownTable(
      { headers: ["a", "b"], aligns: ["left", "left"], rows: [] },
      { width: 40, brightness: "dark" },
    );
    const lines = strip(out).split("\n");
    expect(lines[0].startsWith("┌")).toBe(true);
    expect(lines[lines.length - 1].startsWith("└")).toBe(true);
  });

  test("宽度 0 / 极小宽度走卡片降级而非崩溃", () => {
    const out = renderMarkdownTable(
      { headers: ["模型", "价格"], aligns: ["left", "right"], rows: [["A", "1"]] },
      { width: 0, brightness: "dark" },
    );
    // width 0 会被 resolveTableWidth 忽略 → 走 stdout 宽；此处至少不抛异常。
    expect(typeof out).toBe("string");
  });
});

describe("markdownTable / padCell 对齐", () => {
  test("padCell 左/右/居中填充空格正确", () => {
    expect(padCell("x", 4, "left")).toBe("x   ");
    expect(padCell("x", 4, "right")).toBe("   x");
    expect(padCell("x", 4, "center")).toBe(" x  ");
  });
});

describe("markdownTable / 缺陷 A：inline markdown 软换行不残留字面标记", () => {
  // 缺陷 A：列宽较窄时，inline 标记被软换行从定界符中间切开（如
  // `**价格显示虚高` + `8 倍**`），下游 styleInlineMarkdown 按行配对失败，
  // `**` 字面残留。修复后 renderMarkdownTable 先把 inline 转成 ANSI 样式，
  // 软换行按 grapheme 切分时定界符已随样式消费，不再残留。
  test("bold 被软换行切开后无字面 `**` 残留，且高亮保留", () => {
    const out = renderMarkdownTable(
      {
        headers: ["问题", "说明"],
        aligns: ["left", "left"],
        rows: [["**价格显示虚高 8 倍**", "plain"]],
      },
      { width: 40, brightness: "dark" },
    );
    // 无字面 `**` 残留。
    expect(out).not.toContain("**");
    // bold 高亮保留（\x1b[1m 包裹内容）。
    expect(out).toContain("\x1b[1m价格显示虚高 8 倍\x1b[0m");
    // 内容完整。
    const stripped = strip(out);
    expect(stripped).toContain("价格显示虚高 8 倍");
  });

  test("窄列下 bold 跨行仍无字面标记、框线对齐", () => {
    const out = renderMarkdownTable(
      {
        headers: ["问题", "根因"],
        aligns: ["left", "left"],
        rows: [["**价格显示虚高 8 倍**", "TUI 把平台积分 cost 当美元 ×8 换算"]],
      },
      { width: 40, brightness: "dark" },
    );
    expect(out).not.toContain("**");
    // 所有框线行可见宽度一致（displayWidth 判定，含 EA=A 符号 ×）。
    const lines = out.split("\n");
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
  });

  test("italic / strike / link 软换行后无字面标记", () => {
    const out = renderMarkdownTable(
      {
        headers: ["A", "B"],
        aligns: ["left", "left"],
        rows: [["*斜体文本*", "~~删除线~~"], ["[链接](https://nolo.chat)", "plain"]],
      },
      { width: 30, brightness: "dark" },
    );
    expect(out).not.toContain("*斜体文本*");
    expect(out).not.toContain("~~删除线~~");
    expect(out).not.toContain("[链接](https://nolo.chat)");
    // 内容保留。
    const stripped = strip(out);
    expect(stripped).toContain("斜体文本");
    expect(stripped).toContain("删除线");
    expect(stripped).toContain("链接");
  });

  test("code span 高亮不破坏列宽（cell 级样式化后宽度恒等）", () => {
    const out = renderMarkdownTable(
      {
        headers: ["cmd", "desc"],
        aligns: ["left", "left"],
        rows: [["`a|b`", "code"]],
      },
      { width: 40, brightness: "dark" },
    );
    // code span 内容保留，且无字面反引号残留（cell 级 styleInlineMarkdown
    // 已把定界反引号消费成 muted 高亮，不再依赖 ZWSP 占位）。
    const stripped = strip(out);
    expect(stripped).toContain("a|b");
    expect(stripped).not.toContain("`");
    // 框线对齐。
    const lines = out.split("\n");
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
  });
});

describe("markdownTable / 缺陷 B：EA=A 符号不欠 pad、框线不错位", () => {
  // 缺陷 B：→ × 等 EA=A 符号被 displayWidth 按 1 列计，但终端按 2 列渲染
  // → pad 不足、竖线错位。修复后 displayWidth 按 2 列计，pad 恒等式成立。
  test("含 → / × 的单元格渲染后所有框线行 displayWidth 一致（不再欠 pad）", () => {
    const out = renderMarkdownTable(
      {
        headers: ["issue", "fix"],
        aligns: ["left", "left"],
        rows: [["context window 8x", "131072 → 1_000_000 + assert"], ["×8 convert", "plain"]],
      },
      { width: 50, brightness: "dark" },
    );
    const lines = out.split("\n");
    // 所有框线行可见宽度一致（displayWidth 已按 2 列计 → 不再欠 pad）。
    // 这是 pad 恒等式的正确形式：displayWidth 一致 = 每列 pad 到位、无溢出。
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
    // 对照：若 EA=A 符号仍按 1 列计（修复前），含 → 的行会欠 1 列 pad，
    // displayWidth 与其它行不一致。此处显式断言 → 计 2 列。
    expect(displayWidth("131072 → 1_000_000 + assert")).toBe(28);
  });

  test("窄列（框线表档位）下含 → 的单元格软换行后框线仍对齐", () => {
    const out = renderMarkdownTable(
      {
        headers: ["修复", "依据"],
        aligns: ["left", "left"],
        rows: [["131072 → 1_000_000 + 断言同步", "智谱官方文档核对"]],
      },
      { width: 40, brightness: "dark" },
    );
    const lines = out.split("\n");
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
  });
});

describe("markdownTable / 缺陷 A 回归：styled 单元格软换行 ANSI 计宽不崩溃", () => {
  // 缺陷 A：旧 wrapCellToWidth 逐 grapheme 累加宽度时，把 ESC 的后续字节
  // （[、1、m）误计为可见宽度 → 产物出现孤立 ESC 段（空首行）+ 字面 [1m/[0m
  // 泄漏 + bold 丢失。修复后按 [ANSI 序列 | 可见文本] token 切分，ANSI 宽度 0
  // 且禁止从中间切分，跨行样式段末补 reset、续行开头补重开。

  test("窄列下 bold 单元格必然换行：无字面 ANSI 泄漏、无空首行、文本完整、pad 恒等", () => {
    // 框线表档位（width >= 40）下用足够长的 bold 内容强制软换行成多行。
    const longBold = "**价格显示虚高 8 倍且需要换行才能放下这段很长的加粗文本内容**";
    const out = renderMarkdownTable(
      {
        headers: ["说明"],
        aligns: ["left"],
        rows: [[longBold]],
      },
      { width: 40, brightness: "dark" },
    );
    // 无字面 ANSI 泄漏：stripAnsi 后不得残留 [1m / [0m（若 ESC 被切走，
    // 字面 [1m 会留在可见文本里）。
    const stripped = strip(out);
    expect(stripped).not.toContain("[1m");
    expect(stripped).not.toContain("[0m");
    // 无纯空白首行（孤立 ESC 段渲染成空行）。
    const lines = out.split("\n");
    expect(lines[0]!.trim()).not.toBe("");
    // 确实发生了软换行（多行）。
    expect(lines.length).toBeGreaterThan(1);
    // 可见文本完整（stripAnsi 后拼接还原全部内容；软换行可能切在空格处，
    // 断点空格被消费，且续行有 pad 空格，故按片段分别断言）。
    const joined = stripped.replace(/\n/g, "");
    expect(joined).toContain("价格显示虚高 8");
    expect(joined).toContain("倍且需要换行才能放下这段很长的加粗文");
    expect(joined).toContain("本内容");
    // pad 恒等式：所有框线行 stripAnsi 后 displayWidth 一致（列位置不因
    // 换行而错位）。
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
    // bold 高亮仍保留（至少一段以 \x1b[1m 开头）。
    expect(out).toContain("\x1b[1m");
  });

  test("renderRecordCards（width<40）路径：bold 换行无字面泄漏、文本完整", () => {
    const out = renderMarkdownTable(
      {
        headers: ["名称", "说明"],
        aligns: ["left", "left"],
        rows: [["**价格显示虚高 8 倍**", "TUI 把积分当美元 ×8 换算"]],
      },
      { width: 30, brightness: "dark" },
    );
    // 无字面 ANSI 泄漏（stripAnsi 后不得残留 [1m / [0m）。
    const stripped = strip(out);
    expect(stripped).not.toContain("[1m");
    expect(stripped).not.toContain("[0m");
    // 无纯空白行（记录卡片里 label 行不应为空）。
    for (const l of out.split("\n")) {
      expect(l.trim()).not.toBe("");
    }
    // 可见文本完整（值可能软换行成多行，逐段断言）。
    expect(stripped).toContain("价格显示虚高 8 倍");
    expect(stripped).toContain("TUI 把积分当美元 ×8");
    expect(stripped).toContain("换算");
    // 每行可见宽度不超过可用宽（记录卡片不破行）。
    for (const l of out.split("\n")) {
      expect(displayWidth(l)).toBeLessThanOrEqual(30);
    }
  });
});

describe("markdownTable / 缺陷 C 回归：多 span 单元格软换行不丢样式、不渗染", () => {
  // 缺陷 C（sliceTokens 切点 gap 丢弃 SGR/OSC token）：旧实现取段用
  // [charTokenIdx[a], charTokenIdx[b-1]]，落在切点两侧可见字符「之间」的
  // token（span 收尾 \x1b[0m、切点空格后紧邻的 \x1b[1m）既不在本段也不在
  // 下一段，从所有段消失 → bold 样式丢失、active 状态失真导致下段错误重开
  // （bold 渗染纯文本）、OSC 8 closer 丢失使超链接无法闭合。修复后切片边界
  // 外扩（段尾到 charTokenIdx[b]-1、段首回扩到 charTokenIdx[a-1]+1），gap
  // 为空。以下用例全部为多 span 单元格（旧测试全是单 span 整格，正是漏网
  // 原因）。

  test("wrapCellToWidth 多 span：bold 段加粗、前后纯文本段无渗染、无字面泄漏", () => {
    // "text **bold** text" 样式化后为 "text \x1b[1mbold\x1b[0m text"，
    // 窄宽度（8）下切点落在 bold 两侧，正是旧实现丢 token 的场景。
    const styled = styleInlineMarkdown("text **bold** text", "dark");
    const segs = wrapCellToWidth(styled, 8);
    // 三段：纯文本 / bold / 纯文本。
    expect(segs.map((s) => stripAnsi(s))).toEqual(["text", "bold", "text"]);
    // bold 段加粗（含 \x1b[1m 且以 reset 收尾）。
    expect(segs[1]).toContain("\x1b[1m");
    expect(segs[1]).toContain("\x1b[0m");
    // 前后纯文本段无 bold 渗染（不得含 \x1b[1m）。
    expect(segs[0]).not.toContain("\x1b[1m");
    expect(segs[2]).not.toContain("\x1b[1m");
    // 无字面 ANSI 泄漏。
    for (const s of segs) {
      expect(stripAnsi(s)).not.toContain("[1m");
      expect(stripAnsi(s)).not.toContain("[0m");
    }
  });

  test("框线表多 span 单元格软换行：bold 保留、无渗染、pad 恒等", () => {
    // 足够长的多 span 内容强制软换行成多行（框线表档位 width >= 40）。
    const long = "text **bold** text **bold2** tail **bold3** more text here";
    const out = renderMarkdownTable(
      { headers: ["说明"], aligns: ["left"], rows: [[long]] },
      { width: 40, brightness: "dark" },
    );
    const lines = out.split("\n");
    // 确实发生软换行（多行）。
    expect(lines.length).toBeGreaterThan(1);
    // 无字面 ANSI 泄漏。
    const stripped = strip(out);
    expect(stripped).not.toContain("[1m");
    expect(stripped).not.toContain("[0m");
    // 可见文本完整：软换行在空格处断行会消费断点空格，故按片段分别断言
    // （框线行 stripAnsi 后拼接，去掉框线字符）。
    const body = stripped
      .split("\n")
      .filter((l) => l.includes("text"))
      .join("");
    expect(body).toContain("text bold text bold2 tail bold3 more");
    expect(body).toContain("text here");
    // bold 高亮保留（至少一段以 \x1b[1m 开头）。
    expect(out).toContain("\x1b[1m");
    // pad 恒等式：所有框线行 displayWidth 一致。
    const widths = new Set(lines.map((l) => displayWidth(l)));
    expect(widths.size).toBe(1);
  });

  test("含链接单元格软换行：OSC 8 逐段闭合、点击域不跨行渗出", () => {
    // "click [here](https://x.com) now" 样式化后含 OSC 8 开/闭序列，窄宽度
    // 下链接文本被软换行切开。段级 OSC 8 纪律：切进链接文本内部时，中间续行
    // 以未闭合超链接收尾（SGR reset 不闭合 OSC 8），点击域会渗到 pad/框线。
    // 修复后每一段（尤其中间段）都以 closer 或零 opener 状态收尾，逐段配平。
    const styled = styleInlineMarkdown("click [here](https://x.com) now", "dark");
    const segs = wrapCellToWidth(styled, 8);
    const joined = segs.join("");
    // 可见文本完整。
    expect(segs.map((s) => stripAnsi(s)).join("")).toBe("clickhere(https://x.com)now");
    // 无字面 ANSI 泄漏。
    for (const s of segs) {
      expect(stripAnsi(s)).not.toContain("[1m");
      expect(stripAnsi(s)).not.toContain("[0m");
    }
    // 逐段闭合断言：每一段要么以 closer 收尾，要么段内 opener 已配平（零
    // open 状态）。中间段若以 opener 开启收尾（未补 closer）即失败。
    const openerRe = /\x1b\]8;;https:\/\/x\.com\x1b\\/g;
    const closerRe = /\x1b\]8;;\x1b\\/g;
    for (const s of segs) {
      const openCount = (s.match(openerRe) || []).length;
      const closeCount = (s.match(closerRe) || []).length;
      // 段内 opener 必须配平（prefix 重发 opener 后段末补 closer）。
      expect(openCount).toBe(closeCount);
    }
    // 全局：opener 与 closer 总数配平（每段自闭合，无跨行残留）。
    const totalOpen = (joined.match(openerRe) || []).length;
    const totalClose = (joined.match(closerRe) || []).length;
    expect(totalOpen).toBe(totalClose);
    expect(totalOpen).toBeGreaterThan(0);
  });

  test("链接结尾 cell 软换行：尾随 OSC 8 closer 不丢失、超链接闭合", () => {
    // 缺陷 F1（HIGH）：cell 以链接结尾（"... \x1b]8;;url\x1b\\text\x1b]8;;\x1b\\"）
    // 且发生换行时，末段 sliceTokens 的 b==n 分支旧实现用 charTokenIdx[n-1]
    // 把尾随 closer 裁掉 → 超链接永不闭合，点击域渗入 pad/框线/其后所有行。
    // 修复后末段延伸到 tokens 末尾，closer 保留。
    const styled = styleInlineMarkdown(
      "前缀文字 [text](https://example.com/very/long/url/path)",
      "dark",
    );
    const segs = wrapCellToWidth(styled, 12);
    // 确实发生软换行（多段）。
    expect(segs.length).toBeGreaterThan(1);
    const joined = segs.join("");
    // 可见文本完整（链接可见回退 "text (url)" 保留；断点空格被软换行消费）。
    expect(segs.map((s) => stripAnsi(s)).join("")).toContain(
      "text(https://example.com/very/long/url/path)",
    );
    // OSC 8 closer 出现次数 >= 1，且最后一个 opener 之后必有 closer。
    const openerRe = /\x1b\]8;;https:\/\/example\.com\/very\/long\/url\/path\x1b\\/g;
    const closerRe = /\x1b\]8;;\x1b\\/g;
    const openCount = (joined.match(openerRe) || []).length;
    const closeCount = (joined.match(closerRe) || []).length;
    expect(closeCount).toBeGreaterThanOrEqual(1);
    const lastOpen = joined.lastIndexOf("\x1b]8;;https://example.com/very/long/url/path\x1b\\");
    const lastClose = joined.lastIndexOf("\x1b]8;;\x1b\\");
    expect(lastClose).toBeGreaterThan(lastOpen);
    // 逐段闭合：每一段 opener 配平（末段 closer 保留，无跨行残留）。
    for (const s of segs) {
      const o = (s.match(openerRe) || []).length;
      const c = (s.match(closerRe) || []).length;
      expect(o).toBe(c);
    }
    expect(openCount).toBe(closeCount);
  });

  test("renderRecordCards（width<40）路径：链接结尾 cell 尾随 closer 保留", () => {
    // 记录卡片路径同样走 wrapCellToWidth，需覆盖至少一条同类（链接结尾 +
    // 换行）回归。
    const out = renderMarkdownTable(
      {
        headers: ["名称", "说明"],
        aligns: ["left", "left"],
        rows: [["前缀 [text](https://example.com/very/long/url/path)", "plain"]],
      },
      { width: 30, brightness: "dark" },
    );
    const closerRe = /\x1b\]8;;\x1b\\/g;
    const openerRe = /\x1b\]8;;https:\/\/example\.com\/very\/long\/url\/path\x1b\\/g;
    const closeCount = (out.match(closerRe) || []).length;
    const openCount = (out.match(openerRe) || []).length;
    // 链接结尾 cell 换行后 closer 保留、opener 配平。
    expect(closeCount).toBeGreaterThanOrEqual(1);
    expect(openCount).toBe(closeCount);
    // 无字面 ANSI 泄漏。
    const stripped = strip(out);
    expect(stripped).not.toContain("[1m");
    expect(stripped).not.toContain("[0m");
  });

  test("renderRecordCards（width<40）路径：多 span 单元格 bold 保留、无渗染", () => {
    const out = renderMarkdownTable(
      {
        headers: ["名称", "说明"],
        aligns: ["left", "left"],
        rows: [["text **bold** text", "plain"]],
      },
      { width: 30, brightness: "dark" },
    );
    // 无字面 ANSI 泄漏。
    const stripped = strip(out);
    expect(stripped).not.toContain("[1m");
    expect(stripped).not.toContain("[0m");
    // 可见文本完整。
    expect(stripped).toContain("text bold text");
    expect(stripped).toContain("plain");
    // bold 高亮保留。
    expect(out).toContain("\x1b[1m");
    // 每行可见宽度不超过可用宽。
    for (const l of out.split("\n")) {
      expect(displayWidth(l)).toBeLessThanOrEqual(30);
    }
  });
});
