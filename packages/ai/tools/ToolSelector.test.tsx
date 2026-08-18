import { describe, expect, it } from "bun:test";

import { toolDescriptions } from "./index";
import { HIDDEN_TOOL_IDS, isToolVisibleInUi } from "./toolVisibility";

describe("ToolSelector", () => {
  it("keeps readDoc visible while hiding legacy readPage via the shared visibility gate", async () => {
    const source = await Bun.file(new URL("./ToolSelector.tsx", import.meta.url)).text();

    expect(toolDescriptions.readDoc?.name).toBe("readDoc");
    expect(toolDescriptions.readPage?.name).toBe("readPage");
    expect(HIDDEN_TOOL_IDS.has("readPage")).toBe(true);
    expect(isToolVisibleInUi("readDoc")).toBe(true);
    expect(isToolVisibleInUi("readPage")).toBe(false);
    expect(source).toContain("if (!isToolVisibleInUi(id)) return;");
  });
});
