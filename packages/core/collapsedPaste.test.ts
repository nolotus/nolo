import { describe, expect, test } from "bun:test";
import {
  allocateCollapsedPaste,
  buildCollapsedPastePreview,
  clearCollapsedPasteStore,
  COLLAPSED_PASTE_PLACEHOLDER_RE,
  countTextLines,
  createCollapsedPasteStore,
  expandCollapsedPastes,
  expandRangeToCollapsedPasteChips,
  findCollapsedPasteSpanAt,
  formatCollapsedPasteLabel,
  formatCollapsedPasteModelReference,
  formatCollapsedPastePlaceholder,
  formatPasteByteSize,
  releaseCollapsedPasteReferences,
  replaceCollapsedPastesWithReferences,
  shouldCollapsePaste,
  stripOrphanCollapsedPastePlaceholders,
} from "./collapsedPaste";

describe("collapsedPaste", () => {
  test("countTextLines handles empty, single, and multiline", () => {
    expect(countTextLines("")).toBe(0);
    expect(countTextLines("hello")).toBe(1);
    expect(countTextLines("a\nb")).toBe(2);
    expect(countTextLines("a\nb\n")).toBe(3);
  });

  test("shouldCollapsePaste trips on line or char threshold", () => {
    expect(shouldCollapsePaste("short")).toBe(false);
    expect(shouldCollapsePaste("a\n".repeat(7).trimEnd())).toBe(false);
    expect(shouldCollapsePaste("a\n".repeat(8).trimEnd())).toBe(true);
    expect(shouldCollapsePaste("x".repeat(400))).toBe(true);
    expect(shouldCollapsePaste("x".repeat(399))).toBe(false);
  });

  test("formatPasteByteSize and placeholder/label formatting", () => {
    expect(formatPasteByteSize(500)).toBe("500 B");
    expect(formatPasteByteSize(2048)).toBe("2.0 KB");
    // chip 现在带首行预览段（US：粘贴折叠 chip 首行预览）。
    expect(formatCollapsedPastePlaceholder(3, "a\nb\nc")).toBe(
      "[paste #3 · 3 lines · a]",
    );
    expect(
      formatCollapsedPasteLabel({ id: 1, text: "hello", locale: "en" }),
    ).toContain("Pasted text #1");
    expect(
      formatCollapsedPasteLabel({ id: 1, text: "hello", locale: "zh" }),
    ).toContain("已粘贴文本 #1");
  });

  test("allocate / expand round-trips the full paste body", () => {
    const store = createCollapsedPasteStore();
    const body = Array.from({ length: 20 }, (_, i) => `line-${i}`).join("\n");
    const { placeholder } = allocateCollapsedPaste(store, body);
    const buffer = `prefix ${placeholder} suffix`;
    expect(expandCollapsedPastes(buffer, store)).toBe(
      `prefix ${body} suffix`,
    );
  });

  test("replaces a UI chip with a compact model reference and expands it on demand", () => {
    const store = createCollapsedPasteStore();
    const body = Array.from({ length: 12 }, (_, i) => `line-${i}`).join("\n");
    const { id, placeholder } = allocateCollapsedPaste(store, body);
    const reference = formatCollapsedPasteModelReference(id, body, store.scope);

    expect(replaceCollapsedPastesWithReferences(`before ${placeholder}`, store)).toBe(
      `before ${reference}`,
    );
    expect(expandCollapsedPastes(reference, store)).toBe(body);
  });

  test("releases only paste bodies referenced by a submitted buffer", () => {
    const store = createCollapsedPasteStore();
    const first = allocateCollapsedPaste(store, "first\nbody");
    const second = allocateCollapsedPaste(store, "second\nbody");
    const reference = formatCollapsedPasteModelReference(first.id, "first\nbody", store.scope);

    releaseCollapsedPasteReferences(`send ${reference}`, store);

    expect(store.items.has(first.id)).toBe(false);
    expect(store.items.has(second.id)).toBe(true);
  });

  test("expand leaves unknown placeholders untouched", () => {
    const store = createCollapsedPasteStore();
    const orphan = "[paste #99 · 2 lines]";
    expect(expandCollapsedPastes(orphan, store)).toBe(orphan);
  });

  test("findCollapsedPasteSpanAt prefers left on backspace at end", () => {
    const store = createCollapsedPasteStore();
    const { placeholder, id } = allocateCollapsedPaste(store, "a\nb\nc\nd\ne\nf\ng\nh");
    const buffer = `xx${placeholder}yy`;
    const start = 2;
    const end = start + placeholder.length;
    expect(findCollapsedPasteSpanAt(buffer, start + 3)).toEqual({
      id,
      start,
      end,
    });
    expect(
      findCollapsedPasteSpanAt(buffer, end, { preferLeft: true }),
    ).toEqual({ id, start, end });
    expect(findCollapsedPasteSpanAt(buffer, 0)).toBeNull();
  });

  test("clear and orphan strip helpers", () => {
    const store = createCollapsedPasteStore();
    const { placeholder } = allocateCollapsedPaste(store, "a\n".repeat(10));
    clearCollapsedPasteStore(store);
    expect(store.items.size).toBe(0);
    expect(store.nextId).toBe(1);
    expect(
      stripOrphanCollapsedPastePlaceholders(`keep ${placeholder}`, store),
    ).toBe("keep ");
  });

  test("expandRangeToCollapsedPasteChips expands partial chip coverage", () => {
    const store = createCollapsedPasteStore();
    const { placeholder } = allocateCollapsedPaste(
      store,
      Array.from({ length: 10 }, (_, i) => `L${i}`).join("\n"),
    );
    const buffer = `aa${placeholder}bb`;
    const chipStart = 2;
    const chipEnd = chipStart + placeholder.length;
    expect(
      expandRangeToCollapsedPasteChips(buffer, chipStart + 3, chipStart + 6),
    ).toEqual({ start: chipStart, end: chipEnd });
    expect(expandRangeToCollapsedPasteChips(buffer, 0, 2)).toEqual({
      start: 0,
      end: 2,
    });
  });

  test("scope rotation and legacy reference guard", () => {
    const store = createCollapsedPasteStore();
    const oldBody = "old paste body content";
    const { id: oldId, placeholder: oldPlaceholder } = allocateCollapsedPaste(store, oldBody);
    const oldRef = replaceCollapsedPastesWithReferences(oldPlaceholder, store);

    // Rotate scope by clearing store
    const initialScope = store.scope;
    clearCollapsedPasteStore(store);
    expect(store.scope).not.toBe(initialScope);

    // Allocate a new paste in the rotated store, reusing ID 1
    const newBody = "new paste body content";
    const { id: newId, placeholder: newPlaceholder } = allocateCollapsedPaste(store, newBody);
    const newRef = replaceCollapsedPastesWithReferences(newPlaceholder, store);

    expect(newId).toBe(oldId); // Number ID reused

    // 1. Current scope model reference expands properly
    expect(expandCollapsedPastes(newRef, store)).toBe(newBody);

    // The pasteId inside the recovery tool reference is the lookup authority;
    // a stale display label must not change which body is recovered.
    const mismatchedDisplayRef = newRef.replace(
      `[paste #${newId}`,
      "[paste #999",
    );
    expect(expandCollapsedPastes(mismatchedDisplayRef, store)).toBe(newBody);

    // 2. Old scope model reference does NOT expand (must stay as-is for durable fallback)
    expect(expandCollapsedPastes(oldRef, store)).toBe(oldRef);

    // 3. Legacy reference without scope does NOT expand
    const legacyRef = `[paste #${newId} · 5 lines · 100 B; full content available via readPastedText(pasteId=${newId})]`;
    expect(expandCollapsedPastes(legacyRef, store)).toBe(legacyRef);

    // 4. Stale reference does NOT release current store item with reused ID
    releaseCollapsedPasteReferences(oldRef, store);
    expect(store.items.has(newId)).toBe(true);

    // 5. Current model reference and current placeholder CAN release items
    releaseCollapsedPasteReferences(newRef, store);
    expect(store.items.has(newId)).toBe(false);

    // Placeholder release check
    const { id: phId, placeholder: ph } = allocateCollapsedPaste(store, "ph text");
    expect(store.items.has(phId)).toBe(true);
    releaseCollapsedPasteReferences(ph, store);
    expect(store.items.has(phId)).toBe(false);
  });
});

describe("collapsedPaste chip first-line preview", () => {
  test("preview 取首个非空行并折叠连续空白", () => {
    expect(formatCollapsedPastePlaceholder(1, "\n\n  hello   world  \nrest\n")).toBe(
      "[paste #1 · 5 lines · hello world]",
    );
    expect(buildCollapsedPastePreview("   lead spaces kept as one")).toBe(
      "lead spaces kept as one",
    );
  });

  test("preview 截断到 24 字符并以 … 结尾", () => {
    const long = "x".repeat(30);
    const preview = buildCollapsedPastePreview(long);
    expect(preview).toBe(`${"x".repeat(24)}…`);
    expect(preview).toContain("…");
    // 24 字符整不截断、不加省略号。
    expect(buildCollapsedPastePreview("x".repeat(24))).toBe("x".repeat(24));
    // 截断按码点（CJK 不被拆成坏代理对）。
    expect(buildCollapsedPastePreview("汉".repeat(30))).toBe(
      `${"汉".repeat(24)}…`,
    );
  });

  test("preview 去掉全部 ] 与控制字符，placeholder 保持单行", () => {
    // \r / \n 都按行分隔：首个非空行是 "a]b"，\x00/\x7f 是行内控制字符。
    const text = "a]b\rc\x00d\x7fe\nnext";
    const preview = buildCollapsedPastePreview(text);
    expect(preview).toBe("ab");
    expect(preview).not.toContain("]");
    expect(preview).not.toMatch(/[\n\r\x00-\x1f\x7f]/);
    // 行内控制字符被清除（契约顺序：先折叠空白后剥离，剥离不产生的新连续
    // 空白不再二次折叠，这里用不产生连续空格的输入断言主路径）。
    expect(buildCollapsedPastePreview("x\x00y\x7fz")).toBe("xyz");
    const placeholder = formatCollapsedPastePlaceholder(2, "a]b\x00d\nnext");
    expect(placeholder).toBe("[paste #2 · 2 lines · abd]");
    expect(placeholder).not.toMatch(/[\n\r]/);
    // preview 不含 ] 时正则能原样匹配回来（捕获到同一 preview）。
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
    const match = COLLAPSED_PASTE_PLACEHOLDER_RE.exec(placeholder);
    expect(match?.[1]).toBe("2");
    expect(match?.[3]).toBe("abd");
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
  });

  test("纯空白文本省略 preview 段（保持旧格式）", () => {
    const whitespaceOnly = `${" ".repeat(200)}\n${"\t".repeat(200)}`;
    expect(formatCollapsedPastePlaceholder(4, whitespaceOnly)).toBe(
      "[paste #4 · 2 lines]",
    );
  });

  test("旧格式 chip 仍被正则匹配，preview 段可选", () => {
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
    const oldFormat = "[paste #7 · 12 lines]";
    const match = COLLAPSED_PASTE_PLACEHOLDER_RE.exec(oldFormat);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe("7");
    expect(match?.[2]).toBe("12");
    expect(match?.[3]).toBeUndefined();
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
    const newFormat = "[paste #7 · 12 lines · some preview]";
    const match2 = COLLAPSED_PASTE_PLACEHOLDER_RE.exec(newFormat);
    expect(match2?.[1]).toBe("7");
    expect(match2?.[3]).toBe("some preview");
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
  });

  test("legacy 无 scope 模型引用不会被误认成 chip（durable fallback 不变）", () => {
    const legacyRef = "[paste #1 · 5 lines · 100 B; full content available via readPastedText(pasteId=1)]";
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
    expect(COLLAPSED_PASTE_PLACEHOLDER_RE.test(legacyRef)).toBe(false);
    COLLAPSED_PASTE_PLACEHOLDER_RE.lastIndex = 0;
    // end-to-end：即使 id 撞上当前 store，legacy 引用也原样保留。
    const store = createCollapsedPasteStore();
    allocateCollapsedPaste(store, "current body".repeat(40));
    expect(expandCollapsedPastes(legacyRef, store)).toBe(legacyRef);
    expect(replaceCollapsedPastesWithReferences(legacyRef, store)).toBe(legacyRef);
  });

  test("span 原子定位对新格式（含 preview）生效", () => {
    const store = createCollapsedPasteStore();
    const { placeholder, id } = allocateCollapsedPaste(
      store,
      Array.from({ length: 10 }, (_, i) => `L${i}`).join("\n"),
    );
    expect(placeholder).toContain(" · L0]");
    const buffer = `xx${placeholder}yy`;
    const start = 2;
    const end = start + placeholder.length;
    expect(findCollapsedPasteSpanAt(buffer, start + 3)).toEqual({ id, start, end });
    expect(findCollapsedPasteSpanAt(buffer, end, { preferLeft: true })).toEqual({
      id,
      start,
      end,
    });
    // 范围删除把 chip 视为原子。
    expect(expandRangeToCollapsedPasteChips(buffer, start + 3, start + 6)).toEqual({
      start,
      end,
    });
  });

  test("提交引用替换不受 preview 影响（新格式 chip → 模型引用 → 展开）", () => {
    const store = createCollapsedPasteStore();
    const body = "real ]tricky] x\nsecond line";
    const { id, placeholder } = allocateCollapsedPaste(store, body);
    // preview 清洗后不含 ]（chip 自身的闭合 ] 除外），可被完整匹配。
    expect(placeholder).toBe("[paste #1 · 2 lines · real tricky x]");
    const reference = formatCollapsedPasteModelReference(id, body, store.scope);
    expect(replaceCollapsedPastesWithReferences(`before ${placeholder}`, store)).toBe(
      `before ${reference}`,
    );
    expect(expandCollapsedPastes(reference, store)).toBe(body);
    // chip 直接展开（不走引用）同样还原全文。
    expect(expandCollapsedPastes(`before ${placeholder}`, store)).toBe(
      `before ${body}`,
    );
  });

  test("preview 含分号/括号等标点的 chip 仍可正常匹配与展开", () => {
    const store = createCollapsedPasteStore();
    const body = `const x = 1; // note\n${"pad\n".repeat(30)}`;
    const { placeholder } = allocateCollapsedPaste(store, body);
    expect(placeholder).toContain("const x = 1; // note");
    expect(expandCollapsedPastes(placeholder, store)).toBe(body);
  });
});
