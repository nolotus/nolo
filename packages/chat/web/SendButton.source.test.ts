import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sendButtonSource = readFileSync(
  join(import.meta.dir, "SendButton.tsx"),
  "utf-8"
);

describe("send button source contract", () => {
  it("prevents mouse clicks from stealing textarea focus", () => {
    expect(sendButtonSource).toContain("const handleMouseDown = useCallback<");
    expect(sendButtonSource).toContain("event.preventDefault();");
    expect(sendButtonSource).toContain("onMouseDown={handleMouseDown}");
  });

  it("uses a thin up arrow for send, not a paper plane or fat big-arrow", () => {
    expect(sendButtonSource).toContain("LuArrowUp");
    expect(sendButtonSource).not.toContain("LuSend");
    expect(sendButtonSource).not.toContain("LuArrowBigUp");
  });
});
