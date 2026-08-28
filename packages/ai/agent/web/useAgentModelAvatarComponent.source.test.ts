import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "useAgentModelAvatarComponent.ts"),
  "utf8"
);

describe("useAgentModelAvatarComponent source contract", () => {
  it("stores async avatar components via a wrapped state setter and reacts to cli provider changes", () => {
    expect(source).toContain("setModelAvatarStyle(() => avatar);");
    expect(source).not.toContain("setModelAvatarStyle(avatar);");
    expect(source).toContain("[cliProvider, model, provider]");
  });
});
