import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");

describe("composer collapsed paste (web)", () => {
  test("MessageInputCore collapses oversized text pastes into chips", () => {
    const source = readFileSync(
      join(root, "packages/chat/web/MessageInputCore.tsx"),
      "utf8",
    );
    expect(source).toContain("shouldCollapsePaste");
    expect(source).toContain("WEB_PASTE_THRESHOLD");
    expect(source).toContain("pastedBlocks");
    expect(source).toContain("composeOutgoingText");
    expect(source).toContain("message-input__paste-chips");
    expect(source).toContain("expandPastedBlock");
    // Direct-send order must match expand-then-send: typed text first.
    expect(source).toMatch(
      /const parts = \[\s*baseText\.trim\(\) \? baseText : ""\s*,\s*\.\.\.pastedBlocks/,
    );
  });

  test("locale keys cover paste chip copy", () => {
    const locale = readFileSync(
      join(root, "packages/chat/chat.locale.ts"),
      "utf8",
    );
    expect(locale).toContain("pastedTextChip");
    expect(locale).toContain("removePastedText");
    expect(locale).toContain("expandPastedText");
  });
});
