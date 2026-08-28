import { describe, expect, test } from "bun:test";
import {
  osc52SetClipboard,
  writeClipboard,
  type ClipboardTarget,
} from "./clipboard";

describe("clipboard - OSC 52", () => {
  test("osc52SetClipboard emits the correct base64 escape sequence", () => {
    const chunks: string[] = [];
    const output = { write: (c: string) => { chunks.push(c); } };
    osc52SetClipboard("hello", output);
    const b64 = Buffer.from("hello", "utf8").toString("base64");
    expect(chunks.join("")).toBe(`\x1b]52;c;${b64}\x07`);
  });

  test("writeClipboard calls system writer and OSC 52, and swallows system failure", async () => {
    const chunks: string[] = [];
    let systemCalls = 0;
    const target: ClipboardTarget = {
      systemWrite: async () => { systemCalls += 1; },
      output: { write: (c: string) => { chunks.push(c); } },
      sendOsc52: true,
    };
    await writeClipboard("abc", target);
    expect(systemCalls).toBe(1);
    const b64 = Buffer.from("abc", "utf8").toString("base64");
    expect(chunks.join("")).toContain(`\x1b]52;c;${b64}\x07`);
  });

  test("writeClipboard degrades gracefully when system writer throws", async () => {
    const chunks: string[] = [];
    const target: ClipboardTarget = {
      systemWrite: async () => { throw new Error("ENOENT: xclip"); },
      output: { write: (c: string) => { chunks.push(c); } },
      sendOsc52: true,
    };
    // Should not throw; OSC 52 still emitted.
    await expect(writeClipboard("data", target)).resolves.toBeUndefined();
    expect(chunks.join("")).toContain("52;c;");
  });

  test("writeClipboard skips OSC 52 when sendOsc52 is false", async () => {
    const chunks: string[] = [];
    const target: ClipboardTarget = {
      systemWrite: async () => {},
      output: { write: (c: string) => { chunks.push(c); } },
      sendOsc52: false,
    };
    await writeClipboard("data", target);
    expect(chunks.length).toBe(0);
  });

  test("unicode text is base64-encoded as UTF-8", () => {
    const chunks: string[] = [];
    osc52SetClipboard("你好世界", { write: (c: string) => { chunks.push(c); } });
    const expected = Buffer.from("你好世界", "utf8").toString("base64");
    expect(chunks.join("")).toBe(`\x1b]52;c;${expected}\x07`);
  });
});
