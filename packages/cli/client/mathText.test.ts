import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  transpileLatexToUnicode,
  renderMathBlock,
  maskMathInLine,
  hasUnsupportedLatex,
  setMathRenderingEnabled,
  isMathRenderingEnabled,
} from "./mathText";
import {
  formatAssistantDisplay,
  createRenderAwareStreamWriter,
} from "./assistantOutput";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("mathText / Unicode 转写", () => {
  beforeEach(() => {
    setMathRenderingEnabled(true);
  });

  test("希腊字母转写（大小写）", () => {
    expect(transpileLatexToUnicode("\\alpha + \\beta = \\gamma")).toBe("α + β = γ");
    expect(transpileLatexToUnicode("\\pi \\approx 3.14159")).toBe("π ≈ 3.14159");
    expect(transpileLatexToUnicode("\\Sigma \\Delta \\Omega \\theta")).toBe("Σ Δ Ω θ");
    expect(transpileLatexToUnicode("\\lambda \\mu \\sigma \\omega")).toBe("λ μ σ ω");
    expect(transpileLatexToUnicode("\\Phi \\Psi \\Xi \\Gamma")).toBe("Φ Ψ Ξ Γ");
  });

  test("常见运算符与关系符号", () => {
    expect(transpileLatexToUnicode("a \\times b \\div c \\pm d \\mp e")).toBe("a × b ÷ c ± d ∓ e");
    expect(transpileLatexToUnicode("x \\leq y \\geq z \\neq w \\approx v")).toBe("x ≤ y ≥ z ≠ w ≈ v");
    expect(transpileLatexToUnicode("A \\to B \\Rightarrow C \\Leftrightarrow D")).toBe("A → B ⇒ C ⇔ D");
    expect(transpileLatexToUnicode("x \\in S \\subset T \\forall x \\exists y")).toBe("x ∈ S ⊂ T ∀ x ∃ y");
    expect(transpileLatexToUnicode("a \\cdot b \\circ c")).toBe("a · b ∘ c");
    expect(transpileLatexToUnicode("\\infty \\partial f / \\partial x")).toBe("∞ ∂ f / ∂ x");
    expect(transpileLatexToUnicode("p \\land q \\lor \\neg r")).toBe("p ∧ q ∨ ¬ r");
  });

  test("大算符（求和、乘积、积分）", () => {
    expect(transpileLatexToUnicode("\\sum_{i=1}^n x_i")).toBe("∑ᵢ₌₁ⁿ xᵢ");
    expect(transpileLatexToUnicode("\\prod x \\int f(x) dx")).toBe("∏ x ∫ f(x) dx");
    expect(transpileLatexToUnicode("\\iint_D dx dy")).toBe("∬_(D) dx dy");
  });

  test("上下标转换 - 有 Unicode 对应路径", () => {
    expect(transpileLatexToUnicode("x^2 + y^2 = z^2")).toBe("x² + y² = z²");
    expect(transpileLatexToUnicode("x^{10} + a_i + b_{10}")).toBe("x¹⁰ + aᵢ + b₁₀");
    expect(transpileLatexToUnicode("e^{-x}")).toBe("e⁻ˣ");
    expect(transpileLatexToUnicode("a_{ij}")).toBe("aᵢⱼ");
    expect(transpileLatexToUnicode("v^{n+1}")).toBe("vⁿ⁺¹");
  });

  test("上下标转换 - 无 Unicode 对应回退路径", () => {
    // \alpha has no unicode superscript/subscript -> fallback to ^(α) / _(...)
    expect(transpileLatexToUnicode("x^{\\alpha}")).toBe("x^(α)");
    expect(transpileLatexToUnicode("a_{xyz}")).toBe("a_(xyz)");
  });

  test("根号 \\sqrt 转写", () => {
    expect(transpileLatexToUnicode("\\sqrt{x}")).toBe("√(x)");
    expect(transpileLatexToUnicode("\\sqrt[3]{x+y}")).toBe("∛(x+y)");
    expect(transpileLatexToUnicode("\\sqrt[n]{x}")).toBe("ⁿ√(x)");
  });

  test("分式 \\frac 短式与长式", () => {
    expect(transpileLatexToUnicode("\\frac{1}{2}")).toBe("1/2");
    expect(transpileLatexToUnicode("\\frac{a+b}{c+d}")).toBe("(a+b)/(c+d)");
    expect(transpileLatexToUnicode("\\frac{\\pi}{4}")).toBe("π/4");
  });

  test("括号修饰 \\left \\right 剥离", () => {
    expect(transpileLatexToUnicode("\\left( x + y \\right)")).toBe("( x + y )");
    expect(transpileLatexToUnicode("\\left[ \\frac{a}{b} \\right]")).toBe("[ a/b ]");
    expect(transpileLatexToUnicode("\\left\\{ x \\right\\}")).toBe("{ x }");
  });

  test("无法处理的结构原样保留", () => {
    const matrix = "\\begin{matrix} 1 & 0 \\\\ 0 & 1 \\end{matrix}";
    expect(hasUnsupportedLatex(matrix)).toBe(true);
    expect(transpileLatexToUnicode(matrix)).toBe(matrix);

    const align = "\\begin{align} x &= 1 \\\\ y &= 2 \\end{align}";
    expect(hasUnsupportedLatex(align)).toBe(true);
    expect(transpileLatexToUnicode(align)).toBe(align);

    const cases = "\\begin{cases} x, & \\text{if } x > 0 \\\\ 0, & \\text{otherwise} \\end{cases}";
    expect(hasUnsupportedLatex(cases)).toBe(true);
    expect(transpileLatexToUnicode(cases)).toBe(cases);

    const macro = "\\newcommand{\\R}{\\mathbb{R}}";
    expect(hasUnsupportedLatex(macro)).toBe(true);
    expect(transpileLatexToUnicode(macro)).toBe(macro);
  });
});

describe("mathText / 块级渲染与分式", () => {
  beforeEach(() => {
    setMathRenderingEnabled(true);
  });

  test("长分式在块级渲染下呈现为三行居中结构", () => {
    const longFrac = "\\frac{a^2 + b^2 + c^2}{x_1 + x_2 + x_3}";
    const rendered = renderMathBlock(longFrac, { columns: 40 });
    const lines = rendered.split("\n");
    expect(lines.length).toBe(3);
    // 包含水平分隔线
    expect(lines[1]).toContain("──────");
    // 包含分子与分母
    expect(lines[0]).toContain("a² + b² + c²");
    expect(lines[2]).toContain("x₁ + x₂ + x₃");
  });

  test("普通块级公式居中且使用 dim 样式", () => {
    const block = renderMathBlock("E = mc^2", { columns: 40 });
    expect(block).toContain("\x1b[2m");
    expect(block).toContain("E = mc²");
    expect(block).toContain("\x1b[0m");
  });
});

describe("mathText / 误伤防护与 Mask 有效性", () => {
  beforeEach(() => {
    setMathRenderingEnabled(true);
  });

  test("货币符号不被误伤为公式", () => {
    // 基础守卫：闭合 $ 前有空格的自然语言/货币
    const text = "价格是 $100 到 $200 元";
    const mask = maskMathInLine(text);
    expect(mask.maskedText).toBe("价格是 $100 到 $200 元");
    expect(mask.restore(mask.maskedText)).toBe("价格是 $100 到 $200 元");

    const text2 = "Budget between $50 and $100 total";
    const mask2 = maskMathInLine(text2);
    expect(mask2.maskedText).toBe(text2);

    const text3 = "Costs: $10, $20, $30";
    const mask3 = maskMathInLine(text3);
    expect(mask3.maskedText).toBe(text3);

    // 问题 1 覆盖：闭合 $ 前非空白，能穿过第一道守卫，专门靠 isCurrencyOrNonMath 拦下的货币写法
    const text4 = "涨幅 $100-$200 元";
    const mask4 = maskMathInLine(text4);
    expect(mask4.maskedText).toBe("涨幅 $100-$200 元");
    expect(mask4.restore(mask4.maskedText)).toBe("涨幅 $100-$200 元");

    const text5 = "花了 $50,他赚了 $80";
    const mask5 = maskMathInLine(text5);
    expect(mask5.maskedText).toBe("花了 $50,他赚了 $80");
    expect(mask5.restore(mask5.maskedText)).toBe("花了 $50,他赚了 $80");

    const text6 = "原价 $99/特价 $49";
    const mask6 = maskMathInLine(text6);
    expect(mask6.maskedText).toBe("原价 $99/特价 $49");

    const text7 = "var$foo$bar";
    const mask7 = maskMathInLine(text7);
    expect(mask7.maskedText).toBe("var$foo$bar");

    // formatAssistantDisplay 全链路集成检验
    const out1 = formatAssistantDisplay("商品价格是 $100 到 $200 之间");
    expect(out1).toContain("$100 到 $200");

    const out2 = formatAssistantDisplay("涨幅 $100-$200 元");
    expect(out2).toContain("$100-$200");

    const out3 = formatAssistantDisplay("花了 $50,他赚了 $80");
    expect(out3).toContain("$50");
    expect(out3).toContain("$80");
  });

  test("纯数字与小数包裹不被误判为公式", () => {
    // 纯整数
    const text1 = "$5$ 元";
    const mask1 = maskMathInLine(text1);
    expect(mask1.maskedText).toBe("$5$ 元");
    expect(mask1.restore(mask1.maskedText)).toBe("$5$ 元");

    // 纯小数
    const text2 = "共 $12.5$";
    const mask2 = maskMathInLine(text2);
    expect(mask2.maskedText).toBe("共 $12.5$");
    expect(mask2.restore(mask2.maskedText)).toBe("共 $12.5$");

    // 千分位逗号数字
    const text3 = "总计 $1,234.56$ 美元";
    const mask3 = maskMathInLine(text3);
    expect(mask3.maskedText).toBe("总计 $1,234.56$ 美元");
    expect(mask3.restore(mask3.maskedText)).toBe("总计 $1,234.56$ 美元");

    // 前导无0小数
    const text4 = "折扣 $.99$";
    const mask4 = maskMathInLine(text4);
    expect(mask4.maskedText).toBe("折扣 $.99$");

    // formatAssistantDisplay 全链路集成检验
    const out1 = formatAssistantDisplay("单价 $5$ 元");
    expect(out1).toContain("$5$ 元");

    const out2 = formatAssistantDisplay("共 $12.5$");
    expect(out2).toContain("$12.5$");

    const out3 = formatAssistantDisplay("总计 $1,234.56$ 美元");
    expect(out3).toContain("$1,234.56$");

    // 真正的数学公式依然正常转写与 mask
    const math1 = "公式 $x$ 与 $x = 5$ 还有 $5 + 3$";
    const maskMath1 = maskMathInLine(math1);
    expect(maskMath1.maskedText).toContain("\x00M0\x00");
    expect(maskMath1.restore(maskMath1.maskedText)).toBe("公式 x 与 x = 5 还有 5 + 3");
  });

  test("代码围栏内与 code span 内的 $ 不被处理", () => {
    const text = "Run `echo $VAR` in terminal";
    const mask = maskMathInLine(text);
    expect(mask.maskedText).toBe("Run `echo $VAR` in terminal");
    expect(mask.restore(mask.maskedText)).toBe("Run `echo $VAR` in terminal");

    const fenced = "```bash\necho $HOME && echo $PATH\n```";
    const out = formatAssistantDisplay(fenced);
    expect(stripAnsi(out)).toContain("$HOME");
    expect(stripAnsi(out)).toContain("$PATH");
  });

  test("公式内 * 和反引号不被 Markdown 行内样式破坏（核心回归）", () => {
    const text1 = "计算公式 $a*b*c$ 的值";
    const mask1 = maskMathInLine(text1);
    expect(mask1.maskedText).toContain("\x00M0\x00");
    // 模拟 markdown 斜体规则替换
    const styled1 = mask1.maskedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "\x1b[2m$1\x1b[0m");
    const restored1 = mask1.restore(styled1);
    expect(restored1).toBe("计算公式 a*b*c 的值");

    const text2 = "公式 $x`y`z$ 的表示";
    const mask2 = maskMathInLine(text2);
    const styled2 = mask2.maskedText.replace(/`([^`]+)`/g, "\x1b[90m$1\x1b[0m");
    const restored2 = mask2.restore(styled2);
    expect(restored2).toBe("公式 x`y`z 的表示");

    // 全链路 formatAssistantDisplay
    const out1 = formatAssistantDisplay("公式：$a*b*c$");
    expect(stripAnsi(out1)).toBe("公式：a*b*c");

    const out2 = formatAssistantDisplay("公式：$x`y`z$");
    expect(stripAnsi(out2)).toBe("公式：x`y`z");
  });
});

describe("mathText / 畸形输入安全回退", () => {
  test("未闭合的上标大括号保留原始语法", () => {
    expect(transpileLatexToUnicode("x^{unclosed")).toContain("^{unclosed");
    expect(transpileLatexToUnicode("x_{unclosed")).toContain("_{unclosed");
  });

  test("math off 同样关闭块级公式转写", () => {
    setMathRenderingEnabled(false);
    const out = renderMathBlock("\\alpha + \\beta");
    expect(stripAnsi(out)).toContain("\\alpha + \\beta");
    expect(stripAnsi(out)).not.toContain("α + β");
  });
});

describe("mathText / 开关控制", () => {
  afterEach(() => {
    setMathRenderingEnabled(true);
  });

  test("/math off 关闭转写兜底", () => {
    setMathRenderingEnabled(false);
    expect(isMathRenderingEnabled()).toBe(false);
    expect(transpileLatexToUnicode("\\alpha + \\beta")).toBe("\\alpha + \\beta");

    const out = formatAssistantDisplay("公式 $\\alpha + \\beta = \\gamma$");
    expect(out).toContain("\\alpha + \\beta = \\gamma");

    setMathRenderingEnabled(true);
    expect(isMathRenderingEnabled()).toBe(true);
    expect(transpileLatexToUnicode("\\alpha + \\beta")).toBe("α + β");

    const outOn = formatAssistantDisplay("公式 $\\alpha + \\beta = \\gamma$");
    expect(outOn).toContain("α + β = γ");
  });
});

describe("mathText / 流式安全与一致性", () => {
  beforeEach(() => {
    setMathRenderingEnabled(true);
  });

  test("流式未闭合 $$ 不半渲染", () => {
    const emitted: string[] = [];
    const writer = createRenderAwareStreamWriter({ write: (c) => emitted.push(c) });

    // push opening fence
    writer.push("$$\n");
    // 尚未闭合，不应输出公式内容
    expect(emitted.filter((e) => e.includes("∑")).length).toBe(0);

    // push middle content
    writer.push("\\sum_{i=1}^n x_i\n");
    expect(emitted.filter((e) => e.includes("∑")).length).toBe(0);

    // push closing fence
    writer.push("$$\n");
    // 现在闭合了，公式被完整输出
    const full = emitted.join("");
    expect(full).toContain("∑ᵢ₌₁ⁿ xᵢ");
  });

  test("批量与流式渲染逐字节一致", () => {
    const cases = [
      "质能方程：$E = mc^2$\n",
      "$$\n\\sum_{i=1}^n x_i\n$$\n",
      "行内公式 $\\alpha + \\beta = \\gamma$ 与代码 `x = 1` 混合\n",
      "价格 $100 到 $200 与公式 $x^2 + y^2 = z^2$\n",
      "$$\n\\frac{a^2 + b^2}{c^2 + d^2}\n$$\n",
    ];

    for (const [idx, text] of cases.entries()) {
      const batch = formatAssistantDisplay(text, { trimEdges: false });

      const streamChunks: string[] = [];
      const writer = createRenderAwareStreamWriter({ write: (c) => streamChunks.push(c) });
      for (const char of text) {
        writer.push(char);
      }
      writer.flush();
      const stream = streamChunks.join("");

      expect(stream).toBe(batch);
    }
  });
});
