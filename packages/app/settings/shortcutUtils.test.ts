import { describe, expect, it } from "bun:test";
import { parseShortcut, matchShortcut, formatShortcut } from "./shortcutUtils";

describe("shortcutUtils", () => {
  describe("parseShortcut", () => {
    it("should parse standard shortcut string", () => {
      const parsed = parseShortcut("ctrl+shift+delete");
      expect(parsed.ctrl).toBe(true);
      expect(parsed.shift).toBe(true);
      expect(parsed.meta).toBe(false);
      expect(parsed.alt).toBe(false);
      expect(parsed.key).toBe("delete");
    });

    it("should map cmd/command/⌘ to meta", () => {
      expect(parseShortcut("cmd+backspace").meta).toBe(true);
      expect(parseShortcut("command+backspace").meta).toBe(true);
      expect(parseShortcut("⌘+backspace").meta).toBe(true);
    });

    it("should map option/opt/alt to alt", () => {
      expect(parseShortcut("alt+d").alt).toBe(true);
      expect(parseShortcut("option+d").alt).toBe(true);
      expect(parseShortcut("opt+d").alt).toBe(true);
    });
  });

  describe("matchShortcut", () => {
    it("should match event with shortcut", () => {
      const event = {
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        key: "Backspace",
      } as KeyboardEvent;

      expect(matchShortcut(event, "ctrl+backspace")).toBe(true);
      expect(matchShortcut(event, "ctrl+delete")).toBe(false);
      expect(matchShortcut(event, "meta+backspace")).toBe(false);
    });

    it("should match lowercase/uppercase keys case-insensitively", () => {
      const event = {
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        key: "d",
      } as KeyboardEvent;

      expect(matchShortcut(event, "ctrl+shift+d")).toBe(true);
    });
  });

  describe("formatShortcut", () => {
    it("should format shortcut strings correctly for mac and non-mac", () => {
      expect(formatShortcut("ctrl+shift+delete", false)).toBe("Ctrl + Shift + Delete");
      expect(formatShortcut("meta+backspace", true)).toBe("⌘ + ⌫");
      expect(formatShortcut("ctrl+backspace", false)).toBe("Ctrl + Backspace");
      expect(formatShortcut("ctrl+alt+a", true)).toBe("Ctrl + Option + A");
      expect(formatShortcut("ctrl+alt+a", false)).toBe("Ctrl + Alt + A");
    });
  });
});
