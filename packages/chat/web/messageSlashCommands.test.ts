import { describe, expect, it } from "bun:test";

import {
  COMPACT_DIALOG_SLASH_COMMAND,
  FRESH_DIALOG_SLASH_COMMAND,
  isCompactDialogSlashCommand,
  isFreshDialogSlashCommand,
} from "./messageSlashCommands";

describe("message slash commands", () => {
  it("accepts exact /compact after trimming outer whitespace", () => {
    expect(COMPACT_DIALOG_SLASH_COMMAND).toBe("/compact");
    expect(isCompactDialogSlashCommand("/compact")).toBe(true);
    expect(isCompactDialogSlashCommand("   /compact   ")).toBe(true);
  });

  it("rejects /compact when extra text is present", () => {
    expect(isCompactDialogSlashCommand("/compact please")).toBe(false);
    expect(isCompactDialogSlashCommand("please /compact")).toBe(false);
    expect(isCompactDialogSlashCommand("")).toBe(false);
  });

  it("keeps /new matching unchanged", () => {
    expect(FRESH_DIALOG_SLASH_COMMAND).toBe("/new");
    expect(isFreshDialogSlashCommand("/new")).toBe(true);
  });
});
