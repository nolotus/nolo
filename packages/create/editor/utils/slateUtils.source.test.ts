import { describe, expect, it } from "bun:test";
import { splitSlateTitleAndBody } from "./slateUtils";

describe("splitSlateTitleAndBody", () => {
  it("preserves explicit empty string title when user clears input", () => {
    const slateData = [
      {
        type: "paragraph",
        children: [{ text: "这是正文第一行" }],
      },
    ];

    // When title is explicitly "", splitSlateTitleAndBody must return "" instead of falling back to body first line
    const result = splitSlateTitleAndBody(slateData, "");
    expect(result.title).toBe("");
  });

  it("falls back to first non-empty text when explicitTitle is null or undefined", () => {
    const slateData = [
      {
        type: "paragraph",
        children: [{ text: "这是正文第一行" }],
      },
    ];

    const resultWithNull = splitSlateTitleAndBody(slateData, null);
    expect(resultWithNull.title).toBe("这是正文第一行");

    const resultWithUndefined = splitSlateTitleAndBody(slateData, undefined);
    expect(resultWithUndefined.title).toBe("这是正文第一行");
  });
});
