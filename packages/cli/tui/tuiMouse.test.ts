import { describe, expect, test } from "bun:test";
import {
  consumeSgrMouseSequence,
  parseSgrMouseEvent,
  type TuiMouseEvent,
} from "./tuiMouse";

describe("tuiMouse parser", () => {
  test("parses left button press", () => {
    const seq = "\x1b[<0;20;10M";
    const ev = parseSgrMouseEvent(seq);
    expect(ev).toEqual({
      kind: "press",
      button: "left",
      x: 20,
      y: 10,
      shift: false,
      alt: false,
      ctrl: false,
    });
  });

  test("parses button release", () => {
    const seq = "\x1b[<0;25;12m";
    const ev = parseSgrMouseEvent(seq);
    expect(ev).toEqual({
      kind: "release",
      button: "left",
      x: 25,
      y: 12,
      shift: false,
      alt: false,
      ctrl: false,
    });
  });

  test("parses mouse drag (button + motion)", () => {
    // 32 = motion with left button (0 + 32)
    const seq = "\x1b[<32;40;15M";
    const ev = parseSgrMouseEvent(seq);
    expect(ev).toEqual({
      kind: "drag",
      button: "left",
      x: 40,
      y: 15,
      shift: false,
      alt: false,
      ctrl: false,
    });
  });

  test("parses wheel up and down", () => {
    const upSeq = "\x1b[<64;10;5M";
    const upEv = parseSgrMouseEvent(upSeq);
    expect(upEv).toEqual({
      kind: "wheel",
      button: "none",
      x: 10,
      y: 5,
      shift: false,
      alt: false,
      ctrl: false,
      wheelDirection: "up",
    });

    const downSeq = "\x1b[<65;10;5M";
    const downEv = parseSgrMouseEvent(downSeq);
    expect(downEv).toEqual({
      kind: "wheel",
      button: "none",
      x: 10,
      y: 5,
      shift: false,
      alt: false,
      ctrl: false,
      wheelDirection: "down",
    });
  });

  test("parses modifiers (Shift, Alt, Ctrl)", () => {
    // Left drag (32) + Shift (4) + Alt (8) + Ctrl (16) = 60
    const seq = "\x1b[<60;30;8M";
    const ev = parseSgrMouseEvent(seq);
    expect(ev).toEqual({
      kind: "drag",
      button: "left",
      x: 30,
      y: 8,
      shift: true,
      alt: true,
      ctrl: true,
    });
  });

  test("consumeSgrMouseSequence handles buffering correctly", () => {
    expect(consumeSgrMouseSequence("\x1b[<0;10;5M")).toBe("\x1b[<0;10;5M");
    expect(consumeSgrMouseSequence("\x1b[<0;10;5")).toBeUndefined();
    expect(consumeSgrMouseSequence("\x1b[A")).toBeNull();
    expect(consumeSgrMouseSequence("hello")).toBeNull();
  });

  test("returns only the first report from a chunk with many reports", () => {
    // A single wheel/trackpad gesture delivers dozens of SGR reports in one
    // stdin chunk. consumeSgrMouseSequence must return exactly the first
    // complete report and leave the remainder untouched, so the caller can
    // keep parsing the rest one by one instead of treating the burst as
    // garbage (which used to cancel the dialog).
    const chunk =
      "\x1b[<64;10;5M\x1b[<64;10;6M\x1b[<65;10;7M\x1b[<65;10;8M";
    expect(consumeSgrMouseSequence(chunk)).toBe("\x1b[<64;10;5M");

    // Feed the remainder back in to confirm the whole burst is consumed one
    // report at a time.
    const rest = chunk.slice("\x1b[<64;10;5M".length);
    expect(consumeSgrMouseSequence(rest)).toBe("\x1b[<64;10;6M");
    const rest2 = rest.slice("\x1b[<64;10;6M".length);
    expect(consumeSgrMouseSequence(rest2)).toBe("\x1b[<65;10;7M");
    const rest3 = rest2.slice("\x1b[<65;10;7M".length);
    expect(consumeSgrMouseSequence(rest3)).toBe("\x1b[<65;10;8M");
    // Empty remainder (all reports consumed) is not a mouse sequence.
    expect(consumeSgrMouseSequence(rest3.slice("\x1b[<65;10;8M".length))).toBeNull();
  });

  test("parses a 50-report wheel burst report-by-report", () => {
    // Regression: 50 wheel reports in one chunk. Previously the first `M`
    // was not at the buffer end → returned null → the dialog loop read it as
    // a closed stream → cancel. Now each report must parse cleanly.
    const reports = Array.from(
      { length: 50 },
      (_, i) => `\x1b[<${i % 2 === 0 ? 64 : 65};10;${i + 1}M`,
    );
    const chunk = reports.join("");
    let remaining = chunk;
    const parsed: string[] = [];
    while (remaining.length > 0) {
      const one = consumeSgrMouseSequence(remaining);
      expect(one).not.toBeNull();
      expect(one).not.toBeUndefined();
      parsed.push(one as string);
      remaining = remaining.slice((one as string).length);
    }
    expect(parsed).toEqual(reports);
  });
});
