import { describe, expect, test } from "bun:test";
import {
  allocateCollapsedPaste,
  clearCollapsedPasteStore,
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
    expect(formatCollapsedPastePlaceholder(3, "a\nb\nc")).toBe(
      "[paste #3 · 3 lines]",
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
