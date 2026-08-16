import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dialogSource = readFileSync(
  join(import.meta.dir, "AgentPublishDialog.tsx"),
  "utf8",
);
const pageSource = readFileSync(join(import.meta.dir, "AgentPage.tsx"), "utf8");
const formSource = readFileSync(join(import.meta.dir, "AgentForm.tsx"), "utf8");

describe("AgentPublishDialog source contract", () => {
  it("keeps publish editing separate from the broad model editor", () => {
    expect(pageSource).toContain("<AgentPublishDialog");
    expect(formSource).not.toContain("PublishSettingsTab");
  });

  it("uses accessible shared controls for visibility, pricing, and whitelist input", () => {
    expect(dialogSource).toContain("<Switch");
    expect(dialogSource).toContain("<NumberField");
    expect(dialogSource).toContain("<WhitelistInput");
  });

  it("does not present a timer-backed local heuristic as a compliance scan", () => {
    expect(dialogSource).not.toContain("setTimeout");
    expect(dialogSource).not.toContain("深度内容合规");
    expect(dialogSource).toContain("基于当前设置实时更新");
  });
});
