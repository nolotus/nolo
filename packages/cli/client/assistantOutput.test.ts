import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getActiveThemeName, resolveTuiBrightness, setActiveThemeName, themeColorSequence } from "../tui/theme";
import { displayWidth, stripAnsi } from "../tui/tuiAnsi";
import {
  convertMarkdownTablesForTerminal,
  createRenderAwareStreamWriter,
  formatAssistantDisplay,
  polishAssistantStructure,
} from "./assistantOutput";

describe("assistantOutput", () => {
  test("adds spacing around markdown headings", () => {
    // Both sides: a heading flush against its own body read as one block.
    expect(polishAssistantStructure("intro\n## Title\nbody")).toBe(
      "intro\n\n## Title\n\nbody"
    );
    // Existing spacing is preserved, not doubled.
    expect(polishAssistantStructure("intro\n\n## Title\n\nbody")).toBe(
      "intro\n\n## Title\n\nbody"
    );
  });

  test("converts markdown tables into real box-drawn tables", () => {
    const table = [
      "| 目录 | 说明 |",
      "|---|---|",
      "| `packages/` | Monorepo 核心包 |",
      "| `docs/` | 文档 |",
    ].join("\n");
    const out = convertMarkdownTablesForTerminal(table);
    const lines = out.split("\n");
    // 完整框线：┌ 顶、├ 表头分隔、└ 底，每行等宽。
    expect(lines[0]).toMatch(/^┌─+┬─+┐$/);
    expect(lines[2]).toMatch(/^├─+┼─+┤$/);
    expect(lines[lines.length - 2]).toMatch(/^└─+┴─+┘$/);
    for (const l of lines.slice(0, lines.length - 1)) {
      if (l === "") continue;
      expect(displayWidth(l)).toBe(displayWidth(lines[0]));
    }
    // 内容完整，原始管道不再出现。
    const stripped = stripAnsi(out).replace(/\u200b/g, "");
    expect(stripped).toContain("目录");
    expect(stripped).toContain("packages/");
    expect(stripped).toContain("Monorepo 核心包");
    expect(stripped).toContain("docs/");
    expect(stripped).toContain("文档");
    expect(stripped).not.toContain("|");
    // 表头 bold + 主题色（跟随 /theme，不硬编码）。
    const headerLine = lines[1];
    expect(headerLine).toContain("\x1b[1m");
    expect(headerLine).toContain(
      themeColorSequence("chrome", process.env, resolveTuiBrightness()),
    );
  });

  test("orphan table row renders as a record box, orphan separator vanishes", () => {
    const out = convertMarkdownTablesForTerminal("| 97220 | native host |");
    const stripped = stripAnsi(out).replace(/\u200b/g, "");
    expect(stripped).toContain("97220");
    expect(stripped).toContain("native host");
    expect(stripped).toMatch(/┌─/);
    expect(convertMarkdownTablesForTerminal("|---|---|")).toBe("");
  });

  test("rich mode styles headings and bold text", () => {
    const rich = formatAssistantDisplay("## Title\n这是 **Nolo** 工作区");
    const brightness = resolveTuiBrightness();
    // Headings are bold + warning at every level; bold-only is inline **bold**.
    expect(rich).toContain(
      `\x1b[1m${themeColorSequence("warning", process.env, brightness)}Title\x1b[0m`
    );
    expect(rich).toContain("\x1b[1mNolo\x1b[0m");
  });

  test("converts orphan table rows and drops orphan separators", () => {
    const stripped = stripAnsi(
      convertMarkdownTablesForTerminal("| 97220 | native host |")
    ).replace(/\u200b/g, "");
    // Orphan row degrades to a record box (first cell = record name).
    expect(stripped).toMatch(/┌─/);
    expect(stripped).toContain("record");
    expect(stripped).toContain("97220");
    expect(stripped).toContain("native host");
    expect(convertMarkdownTablesForTerminal("|---|---|")).toBe("");
    // Prose with pipes is not a table row.
    expect(convertMarkdownTablesForTerminal("a | b")).toBe("a | b");
  });

  test("normalizes unordered list markers to bullet", () => {
    expect(convertMarkdownTablesForTerminal("- first\n* second\n+ third")).toBe(
      "• first\n• second\n• third"
    );
  });

  test("preserves ordered list numbers", () => {
    expect(convertMarkdownTablesForTerminal("1. first\n2. second\n3. third")).toBe(
      "1. first\n2. second\n3. third"
    );
  });

  test("preserves nested list indentation", () => {
    const nested = [
      "- top",
      "  - child",
      "    - grandchild",
      "1. ordered top",
      "  2. ordered child",
    ].join("\n");
    expect(convertMarkdownTablesForTerminal(nested)).toBe(
      [
        "• top",
        "  • child",
        "    • grandchild",
        "1. ordered top",
        "  2. ordered child",
      ].join("\n")
    );
  });

  test("leaves non-list lines untouched", () => {
    expect(convertMarkdownTablesForTerminal("just plain text")).toBe("just plain text");
    expect(convertMarkdownTablesForTerminal("- not a list-dash in mid")).toBe(
      "• not a list-dash in mid"
    );
    // Lines with dash not at start are not list items
    expect(convertMarkdownTablesForTerminal("text - with dash")).toBe("text - with dash");
  });

  test("converts task list checkboxes to symbols", () => {
    expect(convertMarkdownTablesForTerminal("- [ ] undone")).toBe("☐ undone");
    expect(convertMarkdownTablesForTerminal("- [x] done")).toBe("☑ done");
    expect(convertMarkdownTablesForTerminal("* [X] capital done")).toBe("☑ capital done");
    // Nested task list keeps indentation
    expect(convertMarkdownTablesForTerminal("  - [ ] nested")).toBe("  ☐ nested");
    // Task list takes priority over unordered marker normalization
    expect(convertMarkdownTablesForTerminal("- [ ] a\n- [x] b")).toBe("☐ a\n☑ b");
  });

  test("leaves fenced code blocks untouched", () => {
    const text = [
      "```ts",
      "| a | b |",
      "  indented();",
      "```",
    ].join("\n");
    expect(convertMarkdownTablesForTerminal(text)).toBe(text);
    const rich = formatAssistantDisplay(text);
    // Code-block syntax highlighting now interleaves ANSI between characters,
    // so a contiguous-content substring assertion is no longer possible. The
    // intent these assertions guard (indentation preserved, table-like lines
    // NOT converted to bullets) still holds — verify against the ANSI-stripped
    // text instead of the raw colored output.
    const stripped = rich.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toContain("| a | b |");
    expect(stripped).toContain("  indented();");
    expect(rich).toContain("\x1b[2m```ts\x1b[0m");
  });

  test("rich mode styles inline code spans with the muted token, not info", () => {
    const rich = formatAssistantDisplay("run `nolo update` now");
    const brightness = resolveTuiBrightness();
    // Pin the actual token. The previous version of this test only checked
    // that the text survived and that some reset was emitted, so it stayed
    // green while inline code was rendered in the same bright info hue as
    // code blocks — the regression this assertion exists to catch.
    expect(rich).toContain(
      `${themeColorSequence("muted", process.env, brightness)}nolo update\x1b[0m`
    );
    expect(rich).not.toContain(themeColorSequence("info", process.env, brightness));
  });

  test("rich mode renders markdown links as OSC 8 clickable hyperlinks", () => {
    const rich = formatAssistantDisplay("See [docs](https://nolo.chat/docs) here");
    // OSC 8 escape wraps the visible text — Cmd/Ctrl-Click opens the URL in
    // supporting terminals (iTerm2, Ghostty, WezTerm, etc.).
    expect(rich).toContain("\x1b]8;;https://nolo.chat/docs\x1b\\");
    expect(rich).toContain("docs (https://nolo.chat/docs)");
    expect(rich).toContain("\x1b]8;;\x1b\\");
  });

  test("stream writer never leaks raw table pipes", () => {
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });

    writer.push("| pid | 说明 |\n");
    writer.push("|---|---|\n");
    writer.push("| 97220 | native host |\n");
    writer.push("done\n");
    writer.flush();

    const output = chunks.join("");
    const stripped = stripAnsi(output).replace(/\u200b/g, "");
    // 框线表一次性整体渲染：内容完整、原始管道不泄漏、无半表。
    expect(stripped).toContain("97220");
    expect(stripped).toContain("native host");
    expect(stripped).toContain("┌─");
    expect(stripped).toContain("└─");
    expect(stripped).not.toContain("| pid |");
    // 表格未闭合（只有 header + 分隔行，无 body / 无终止行）前不画框线，
    // 避免流式过程中出现半表抖动；flush 时整块一起渲染。
    const early: string[] = [];
    const w2 = createRenderAwareStreamWriter({
      write: (chunk) => early.push(chunk),
    });
    w2.push("| pid | 说明 |\n");
    w2.push("|---|---|\n");
    // 未闭合：此刻不输出任何框线。
    expect(early.join("")).not.toContain("┌");
    w2.flush();
    const earlyStripped = stripAnsi(early.join("")).replace(/\u200b/g, "");
    // 半表不画框；未闭合内容原样保留，由后续完整块重绘。
    expect(earlyStripped).not.toContain("┌");
    expect(earlyStripped).toContain("| pid |");
  });

  test("stream writer passes fenced code through with indentation", () => {
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });

    writer.push("```ts\n  const x = 1;\n| not a table |\n```\n");
    writer.flush();

    const output = chunks.join("");
    // Code-block syntax highlighting now interleaves ANSI between characters,
    // so a contiguous-content substring assertion is no longer possible. The
    // intent (indentation preserved, table-like lines inside fences not
    // converted) still holds — verify against ANSI-stripped output.
    const stripped = output.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toContain("  const x = 1;");
    expect(stripped).toContain("| not a table |");
  });

  test("render-aware stream writer applies rich formatting while streaming", () => {
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });

    writer.push("## Title\n");
    writer.push("这是 **Nolo**");
    writer.flush();

    const output = chunks.join("");
    expect(output).toContain(
      `\x1b[1m${themeColorSequence("warning", process.env, resolveTuiBrightness())}Title\x1b[0m`
    );
    expect(output).toContain("\x1b[1mNolo\x1b[0m");
  });

  test("stream writer flushes long prose before the model sends a newline", () => {
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });

    writer.push("这是一段足够长的普通文本，模型可能很久才发送换行，因此不能等到整轮结束才显示。继续输出更多内容来超过增量刷新阈值。");

    // The partial line must already be visible before flush(), while the
    // remaining tail is emitted normally when the turn ends.
    const partial = chunks.join("");
    expect(partial).not.toBe("");
    writer.flush();
    const output = chunks.join("").replace(/\x1b\[[0-9;]*m/g, "");
    expect(output).toContain("这是一段足够长的普通文本");
    expect(output).toContain("继续输出更多内容");
    expect(output).toBe(
      "这是一段足够长的普通文本，模型可能很久才发送换行，因此不能等到整轮结束才显示。继续输出更多内容来超过增量刷新阈值。"
    );
  });

  test("partially flushes ordinary English punctuation", () => {
    const chunks: string[] = [];
    const text = "This is a long sentence (with punctuation)! It should remain visibly incremental.";
    const writer = createRenderAwareStreamWriter({ write: (chunk) => chunks.push(chunk) });
    writer.push(text);
    expect(chunks.join("")).not.toBe("");
    writer.flush();
    expect(chunks.join("").replace(/\x1b\[[0-9;]*m/g, "")).toBe(text);
  });

  test("uses grapheme-safe partial flushes for plain text with emoji", () => {
    const chunks: string[] = [];
    const text = "普通文本 ".repeat(7) + "👍🏽 继续输出更多内容来超过阈值。";
    const writer = createRenderAwareStreamWriter({ write: (chunk) => chunks.push(chunk) });
    writer.push(text);
    expect(chunks.join("")).not.toBe("");
    writer.flush();
    const output = chunks.join("").replace(/\x1b\[[0-9;]*m/g, "");
    expect(output).toBe(text);
    expect(output).toContain("👍🏽");
  });

  test("does not partially flush markdown syntax or split emoji", () => {
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({ write: (chunk) => chunks.push(chunk) });
    writer.push("这是 **一段很长的加粗文本**，以及 inline `code` 和链接 [docs](https://nolo.chat)。👍🏽");
    expect(chunks).toEqual([]);
    writer.flush();
    const output = chunks.join("");
    expect(output).not.toContain("**");
    expect(output).toContain("👍🏽");
  });

  test("stream writer inserts blank line between list block and following prose", () => {
    // Live TUI streams one finished line at a time — without stream-path
    // breathing, polishAssistantStructure never sees the list↔prose pair and
    // the dense wall the owner reported stays dense. Strip ANSI and assert
    // the same blank the whole-message path inserts.
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });
    writer.push("intro\n");
    writer.push("- one\n");
    writer.push("- two\n");
    writer.push("next paragraph\n");
    writer.flush();
    const stripped = chunks.join("").replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toBe("intro\n\n• one\n• two\n\nnext paragraph\n");
  });

  test("inserts blank line between list block and following prose", () => {
    // A bullet list run-on into the next paragraph is the core readability
    // problem this task targets; the polish step inserts one blank line.
    expect(polishAssistantStructure("• one\n• two\nnext paragraph")).toBe(
      "• one\n• two\n\nnext paragraph"
    );
    expect(polishAssistantStructure("1. first\n2. second\nthen prose")).toBe(
      "1. first\n2. second\n\nthen prose"
    );
  });

  test("inserts blank line between prose and following list block", () => {
    // Symmetric: prose running straight into a list is just as unreadable.
    expect(polishAssistantStructure("intro\n• one\n• two")).toBe(
      "intro\n\n• one\n• two"
    );
    expect(polishAssistantStructure("intro\n1. first\n2. second")).toBe(
      "intro\n\n1. first\n2. second"
    );
  });

  test("does not insert blank lines between consecutive list items", () => {
    // Siblings keep their tight grouping — no blank between `• one` and
    // `• two`, including with nesting indentation.
    expect(polishAssistantStructure("• one\n• two\n• three")).toBe(
      "• one\n• two\n• three"
    );
    expect(polishAssistantStructure("• top\n • child\n • grandchild")).toBe(
      "• top\n • child\n • grandchild"
    );
    expect(polishAssistantStructure("1. first\n2. second")).toBe(
      "1. first\n2. second"
    );
  });

  test("treats circled-number ①-⑳ section markers as list-like for breathing", () => {
    // ①-⑳ (U+2460–U+2473) are used as section markers like `①CLI 自动 bump`.
    // They must join the list↔prose breathing so a ① block is separated from
    // adjacent prose by one blank line, while consecutive ① lines stay tight.
    // Note: the circled number is followed directly by text with NO space, so
    // the list-like check must not require `\s` after it.
    expect(polishAssistantStructure("intro\n①CLI 自动 bump\n②docs\nnext")).toBe(
      "intro\n\n①CLI 自动 bump\n②docs\n\nnext"
    );
    // Consecutive ① siblings keep tight grouping (no blank between them).
    expect(polishAssistantStructure("①one\n②two\n③three")).toBe(
      "①one\n②two\n③three"
    );
    // ① block breathing is symmetric: prose → ① also gets a blank line.
    expect(polishAssistantStructure("prose here\n①first\n②second")).toBe(
      "prose here\n\n①first\n②second"
    );
  });

  test("does not alter spacing inside fenced code that looks like a list", () => {
    // Fence interior masking means `•`/`1.` inside a code block never get
    // blank lines inserted around them.
    const input = "```ts\n• not a real list\n1. not ordered\ncode();\n```";
    expect(polishAssistantStructure(input)).toBe(input);
    // List immediately before a fence gets a blank line (list↔fence-line is
    // list↔prose); the fence interior stays untouched.
    const mixed = "• one\n• two\n```ts\n1. inside\n```";
    expect(polishAssistantStructure(mixed)).toBe(
      "• one\n• two\n\n```ts\n1. inside\n```"
    );
  });

  test("styles ordered list markers with chrome, not accent", () => {
    // `1.` is structural chrome — it labels the item, it is not the content.
    // Accent made a numbered list read as a column of saturated blue digits
    // competing with the prose (owner feedback 2026-08-02).
    const rich = formatAssistantDisplay("1. first step");
    const brightness = resolveTuiBrightness();
    expect(rich).toContain(
      `${themeColorSequence("chrome", process.env, brightness)}1.\x1b[0m`
    );
    expect(rich).not.toContain(
      `${themeColorSequence("accent", process.env, brightness)}1.\x1b[0m`
    );
    expect(rich).toContain("first step");
  });

  test("styles task list checkbox markers with accent", () => {
    // ☐/☑ markers get the same accent as • so task lists scan like bullets.
    const brightness = resolveTuiBrightness();
    const todo = formatAssistantDisplay("☐ undone");
    const done = formatAssistantDisplay("☑ done");
    expect(todo).toContain(
      `${themeColorSequence("accent", process.env, brightness)}☐\x1b[0m`
    );
    expect(done).toContain(
      `${themeColorSequence("accent", process.env, brightness)}☑\x1b[0m`
    );
  });

  test("rich mode renders italic markers as dim without leaking asterisks", () => {
    // *italic* should lose the asterisks and gain dim styling. **bold** must
    // still take priority — a single bold run should not be half-consumed by
    // the italic rule.
    const rich = formatAssistantDisplay("this is *important* text");
    expect(rich).toContain("\x1b[2mimportant\x1b[0m");
    expect(rich).not.toContain("*important*");
    // Bold is untouched by the italic pass.
    const bold = formatAssistantDisplay("**bold** and *italic*");
    expect(bold).toContain("\x1b[1mbold\x1b[0m");
    expect(bold).toContain("\x1b[2mitalic\x1b[0m");
  });

  test("rich mode does not corrupt snake_case identifiers as italic", () => {
    // _italic_ is intentionally NOT supported (CommonMark intra-word rule).
    // snake_case variables like foo_bar_baz must pass through untouched —
    // no dim styling injected on the middle segment.
    const snake = formatAssistantDisplay("call foo_bar_baz here");
    expect(snake).not.toContain("\x1b[2mbar\x1b[0m");
    expect(snake).toContain("foo_bar_baz");
  });

  test("rich mode renders strikethrough markers as dim+strike without leaking tildes", () => {
    const rich = formatAssistantDisplay("this is ~~removed~~ text");
    expect(rich).toContain("\x1b[2m\x1b[9mremoved");
    expect(rich).not.toContain("~~removed~~");
  });

  test("rich mode dims the 进入 nolo-plan status line with chrome", () => {
    // Repo convention forces every reply to start with "进入 nolo-plan…"；
    // back-to-back replies stack these into visual noise. The status line is
    // downgraded to chrome + dim so it sits below body text. Must match
    // highlightMarkdown in tui/theme.ts (stream vs history repaint parity).
    const brightness = resolveTuiBrightness();
    const rich = formatAssistantDisplay("进入 nolo-plan（4 项串行小改）。");
    expect(rich).toContain(
      `${themeColorSequence("chrome", process.env, brightness)}\x1b[2m进入 nolo-plan（4 项串行小改）。`
    );
    // Not bold (body text isn't, and it must read as de-emphasized).
    expect(rich).not.toContain("\x1b[1m");
  });

  describe("polishAssistantStructure code fence masking", () => {
    test("1. shell comments in code fence are not expanded with blank lines", () => {
      const input = "```sh\n# setup\necho ok\n```";
      expect(polishAssistantStructure(input)).toBe(input);
    });

    test("2. multi-level heading inside py block stays intact", () => {
      const input = "```py\n### section\nx=1\n```";
      expect(polishAssistantStructure(input)).toBe(input);
    });

    test("3. real heading outside code fence still receives blank lines", () => {
      expect(polishAssistantStructure("intro\n## Title\nbody")).toBe(
        "intro\n\n## Title\n\nbody"
      );
    });

    test("4. mixed scenario: heading outside gets blank lines, comment inside does not", () => {
      const input = "intro\n## Real\n```sh\n# fake\nls\n```\ntail";
      const expected = "intro\n\n## Real\n\n```sh\n# fake\nls\n```\ntail";
      expect(polishAssistantStructure(input)).toBe(expected);
    });

    test("5. consecutive blank lines inside code fence are preserved", () => {
      const input = "```sh\nline1\n\n\n\n\nline2\n```";
      expect(polishAssistantStructure(input)).toBe(input);
    });

    test("6. unclosed fence masks comments through end of text", () => {
      const input = "intro\n```sh\n# setup\necho ok";
      const expected = "intro\n```sh\n# setup\necho ok";
      expect(polishAssistantStructure(input)).toBe(expected);
    });

    test("7. zero regression for text without code fences", () => {
      const input = "paragraph 1\n## Heading 1\nsome text\n### Heading 2\n\nfinal text";
      const expected = "paragraph 1\n\n## Heading 1\n\nsome text\n\n### Heading 2\n\nfinal text";
      expect(polishAssistantStructure(input)).toBe(expected);
    });

    test("8. a literal NUL in code content cannot be mistaken for a mask sentinel", () => {
      // The mask encodes fence interiors as \x00F<n>\x00. Content that already
      // contained that shape would be restored as the wrong line, so NUL is
      // stripped before masking rather than trusting callers to sanitize.
      const NUL = String.fromCharCode(0);
      const source = ["```sh", `${NUL}F0${NUL}`, "# a", "echo ok", "```"].join("\n");
      const out = polishAssistantStructure(source, { trimEdges: false });
      expect(out).not.toContain(NUL);
      // The fence protection still holds: the comment is not padded.
      expect(out).not.toContain("\n\n# a");
      expect(out).toContain("echo ok");
    });
  });
});

describe("code block syntax highlighting", () => {
  // Pin trail so accent ≠ info; catppuccin and iris map both tokens to the
  // same sequence, which makes the keyword-vs-identifier assertion vacuous
  // and order-dependent on whatever theme a prior file left active.
  let prevTheme: string;
  beforeAll(() => {
    prevTheme = getActiveThemeName();
    setActiveThemeName("trail");
  });
  afterAll(() => setActiveThemeName(prevTheme));

  const brightness = resolveTuiBrightness();
  const seq = (token: "accent" | "success" | "chrome" | "warning" | "info") =>
    themeColorSequence(token, process.env, brightness);
  const fence = (lang: string, body: string) => ["```" + lang, body, "```"].join("\n");
  /** The rendered line for `body`, i.e. everything between the fence rows. */
  const codeLine = (lang: string, body: string) =>
    formatAssistantDisplay(fence(lang, body)).split("\n")[1] ?? "";

  test("an unlabeled fence is left exactly as it was before highlighting", () => {
    // Zero-regression guarantee: blocks with no language tag must keep the old
    // single-color treatment, so nothing changes for the majority of replies
    // that omit the tag.
    const line = codeLine("", "const plain = 2;");
    expect(line).toBe(`${seq("info")}const plain = 2;\x1b[0m`);
  });

  test("keywords are accented while identifiers stay in the base color", () => {
    const line = codeLine("ts", "const answer = 1;");
    expect(line).toContain(`${seq("accent")}const`);
    // The identifier must not be keyword-colored.
    expect(line).not.toContain(`${seq("accent")}answer`);
    expect(line).toContain(`${seq("warning")}1`);
  });

  test("keywords inside a string are not highlighted as keywords", () => {
    // The classic failure of a naive highlighter: matching keywords before
    // carving out string regions paints "def" inside the quoted text.
    const line = codeLine("py", 'x = "def not_a_keyword"');
    expect(line).toContain(`${seq("success")}"def not_a_keyword"`);
    expect(line).not.toContain(`${seq("accent")}def`);
  });

  test("trailing comments are dimmed chrome", () => {
    const line = codeLine("sh", "echo hi # comment");
    expect(line).toContain(`${seq("chrome")}\x1b[2m# comment`);
  });

  test("streaming and whole-message rendering agree on code lines", () => {
    // The two renderers have separate fence bookkeeping; if they drift, a reply
    // looks different while streaming than it does after /resume replays it.
    const source = fence("ts", "const x = 1; // note");
    const chunks: string[] = [];
    const writer = createRenderAwareStreamWriter({
      write: (chunk) => chunks.push(chunk),
    });
    for (const char of source) writer.push(char);
    writer.flush();
    const streamedCode = chunks
      .join("")
      .split("\n")
      .find((line) => line.includes("const"));
    expect(streamedCode).toBe(codeLine("ts", "const x = 1; // note"));
  });
});

describe("diff fence rendering", () => {
  const DIFF_BODY = [
    "@@ -1,2 +1,3 @@",
    "-old line",
    "+new line",
    " context line",
    "+++ b/file",
    "--- a/file",
  ];

  /** Run `fn` with a controlled env, restoring the previous env afterwards. */
  const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
    const prev = new Map<string, string | undefined>();
    for (const [k, v] of Object.entries(env)) {
      prev.set(k, process.env[k]);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      fn();
    } finally {
      for (const [k, v] of prev) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  const truecolorEnv = { COLORTERM: "truecolor", NOLO_TUI_THEME: "dark" };

  test("streamed diff lines are byte-identical to a whole-message redraw", () => {
    // The stream path (createRenderAwareStreamWriter → highlightCodeLine) and
    // the redraw path (formatAssistantDisplay → highlightCodeLine) must paint
    // the same escape sequences per line, or a reply recolors on scroll-back.
    withEnv(truecolorEnv, () => {
      const source = ["```diff", ...DIFF_BODY, "```"].join("\n");

      const redraw = formatAssistantDisplay(source);

      const chunks: string[] = [];
      const writer = createRenderAwareStreamWriter({
        write: (chunk) => chunks.push(chunk),
      });
      for (const line of source.split("\n")) writer.push(line + "\n");
      writer.flush();

      // Fence interior only (indices 1..6).
      expect(chunks.join("").split("\n").slice(1, 7)).toEqual(
        redraw.split("\n").slice(1, 7)
      );
    });
  });

  test("truecolor diff lines carry a background tint (48;2)", () => {
    withEnv(truecolorEnv, () => {
      const line =
        formatAssistantDisplay("```diff\n+new line\n```").split("\n")[1] ?? "";
      expect(line).toContain("\x1b[48;2"); // background tint
      expect(line).toContain("\x1b[38;2"); // foreground color
    });
  });

  test("diff lines end with \\x1b[0m so the tint never leaks", () => {
    withEnv(truecolorEnv, () => {
      const lines = formatAssistantDisplay(
        ["```diff", "-gone", "+added", "```"].join("\n")
      ).split("\n");
      for (const line of lines.slice(1, 3)) {
        expect(line).toMatch(/\x1b\[0m$/); // full reset (fg + bg)
        expect(line.endsWith("\x1b[39m")).toBe(false); // fg-only reset would leak the tint
      }
    });
  });

  test("+++ / --- headers are context, not added/removed", () => {
    withEnv(truecolorEnv, () => {
      const lines = formatAssistantDisplay(
        ["```diff", "+++ b/file", "--- a/file", "+real add", "-real del", "```"].join("\n")
      ).split("\n");
      // +++/--- headers share the exact context wrapper (no fg, no bg)…
      expect(lines[1]!.replace("+++ b/file", "--- a/file")).toBe(lines[2]);
      expect(lines[1]).not.toContain("38;2");
      expect(lines[1]).not.toContain("48;2");
      // …while genuine added/removed rows carry fg + bg colors.
      expect(lines[3]).toContain("38;2");
      expect(lines[3]).toContain("48;2");
      expect(lines[4]).toContain("38;2");
      expect(lines[4]).toContain("48;2");
    });
  });

  test("non-truecolor diff lines have no background (no 48;2)", () => {
    withEnv(
      {
        COLORTERM: "xterm-256color",
        NOLO_TUI_TRUECOLOR: "0",
        NOLO_TUI_THEME: "dark",
      },
      () => {
        const lines = formatAssistantDisplay(
          ["```diff", "+added", "-removed", "```"].join("\n")
        ).split("\n");
        expect(lines[1]).not.toContain("48;2");
        expect(lines[2]).not.toContain("48;2");
        // Degraded path still colors the foreground (ANSI-16 fallback).
        expect(lines[1]).toMatch(/\x1b\[3[0-9]m/);
        expect(lines[2]).toMatch(/\x1b\[3[0-9]m/);
      }
    );
  });
});

describe("mermaid in assistantOutput", () => {
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const md = "说明\n\n```mermaid\nflowchart TD\nA[\"开始\"] --> B[\"处理\"]\n```\n\n结尾";

  test("formatAssistantDisplay renders mermaid diagram", () => {
    const out = strip(formatAssistantDisplay(md));
    expect(out).toContain("开始");
    expect(out).toContain("处理");
    expect(out).toContain("▼");
  });

  test("stream writer renders mermaid diagram on close fence", () => {
    let acc = "";
    const w = createRenderAwareStreamWriter({ write: (c) => (acc += c) });
    const lines = md.split("\n");
    for (let i = 0; i < lines.length; i++) {
      w.push(lines[i]);
      if (i < lines.length - 1) w.push("\n");
    }
    w.flush();
    const out = strip(acc);
    expect(out).toContain("开始");
    expect(out).toContain("处理");
    expect(out).toContain("▼");
  });

  test("non-flowchart mermaid falls back to raw block", () => {
    const src = "```mermaid\nsequenceDiagram\nA->>B: hi\n```";
    const out = strip(formatAssistantDisplay(src));
    expect(out).toContain("sequenceDiagram");
    expect(out).toContain("A->>B: hi");
  });
});

describe("mermaid unclosed fence flush", () => {
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

  test("flush() renders an unclosed mermaid block (no content lost)", () => {
    let acc = "";
    const w = createRenderAwareStreamWriter({ write: (c) => (acc += c) });
    const src = "```mermaid\nflowchart TD\nA[\"开始\"] --> B[\"处理\"]\n";
    for (const line of src.split("\n")) {
      w.push(line);
      w.push("\n");
    }
    w.flush();
    const out = strip(acc);
    expect(out).toContain("开始");
    expect(out).toContain("处理");
    expect(out).toContain("▼");
  });
});

// ─── 批量 / 流式一致性 ─────────────────────────────────────────────────────
// 批量路径（formatAssistantDisplay，走 convertMarkdownTablesForTerminal）与
// 流式路径（createRenderAwareStreamWriter，逐 chunk push + flush）必须调用
// 同一套表格识别/解析函数（markdownTable 单一真值）。任何一类的输入在两条
// 路径下都应产出逐字节一致的渲染结果，否则流式输出会与整轮渲染不一致。
describe("assistantOutput / 表格批量与流式渲染一致性", () => {
  const streamOutput = (text: string): string => {
    const chunks: string[] = [];
    const w = createRenderAwareStreamWriter({ write: (c) => chunks.push(c) });
    w.push(text);
    w.flush();
    return chunks.join("");
  };

  const batchOutput = (text: string): string =>
    formatAssistantDisplay(text, { trimEdges: false });

  // 5 类关键输入：含空单元格的行、\| 转义、code span 竖线、|-|-| 短分隔、
  // -+ 形式分隔行。每条都在批量/流式下渲染并断言逐字节一致。
  const cases: string[] = [
    // 空单元格（首行 `|  |`）：新 parser 保留空单元格，两条路径应一致。
    "|  | b |\n|-|-|\n|  | x |\n| y | z |",
    // \| 转义竖线：新 parser 正确处理，不被当作分隔符切分。
    "| a | b |\n|--|--|\n| x\\|y | z |",
    // code span 内竖线：`` `p|q` `` 的 | 不是分隔符。
    "| a | b |\n|-|-|\n| `p|q` | r |",
    // |-|-| 短分隔行：新 parser 接受（旧 parser 要求至少 3 个 -）。
    "| a | b |\n|-|-|\n| x | y |",
    // -+ 形式分隔行：新 parser 接受。
    "| a | b |\n|---+---|\n| x | y |",
  ];

  for (const [idx, text] of cases.entries()) {
    test(`case ${idx + 1} 批量与流式渲染逐字节一致`, () => {
      const batch = batchOutput(text);
      const stream = streamOutput(text);
      expect(stream).toBe(batch);
      // 同时确认确实渲染成了表格（不是原样裸 markdown）。
      expect(stripAnsi(batch).replace(/\u200b/g, "")).toMatch(/┌─/);
    });
  }
});

