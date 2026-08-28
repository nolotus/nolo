import { describe, expect, test } from "bun:test";
import { summarizeToolArguments } from "./summarizeToolArguments";

describe("summarizeToolArguments", () => {
  test("prefers path over dumping raw JSON", () => {
    expect(
      summarizeToolArguments(
        "globFiles",
        JSON.stringify({ path: ".", maxDepth: 2, maxResults: 80 }),
      ),
    ).toBe(".");
  });

  test("prefers command for shell tools", () => {
    expect(
      summarizeToolArguments(
        "execShell",
        JSON.stringify({ command: "bun test", cwd: "/tmp" }),
      ),
    ).toBe("bun test");
  });

  test("prefers query for search tools", () => {
    expect(
      summarizeToolArguments(
        "codeSearch",
        JSON.stringify({ query: "onToolEvent", path: "packages" }),
      ),
    ).toBe("onToolEvent");
  });

  test("returns empty for empty/invalid args", () => {
    expect(summarizeToolArguments("readFile", "")).toBe("");
    expect(summarizeToolArguments("readFile", "{")).toBe("");
  });
});
