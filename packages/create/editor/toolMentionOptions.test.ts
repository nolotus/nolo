import { describe, expect, it } from "bun:test";

import { buildToolMentionOptions } from "./toolMentionOptions";

describe("buildToolMentionOptions", () => {
  it("includes readDoc and excludes legacy readPage from editor mentions", () => {
    const options = buildToolMentionOptions();
    const ids = options.map((option) => option.id);

    expect(ids).toContain("readDoc");
    expect(ids).not.toContain("readPage");
  });
});
