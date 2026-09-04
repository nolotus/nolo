import { describe, expect, test } from "bun:test";
import {
  TURN_COMPLETION_ATTENTION_THRESHOLD_MS,
  clearTerminalAttentionProgress,
  emitTerminalAttention,
  emitTerminalBell,
  isWindowsTerminal,
  runWithInputRequiredAttention,
  shouldEmitTerminalBell,
} from "./terminalNotification";

const WT_ENV = { WT_SESSION: "test-session" };

function createCapturingOutput() {
  let written = "";
  return {
    output: {
      write(chunk: string) {
        written += chunk;
        return true;
      },
    } as unknown as NodeJS.WritableStream,
    written: () => written,
  };
}

describe("terminal turn notification — turn-completed decision", () => {
  test.each([
    [
      "long successful interactive turn",
      { wasAborted: false, exitCode: 0, interactive: true, durationMs: 10_000 },
      true,
    ],
    [
      "turn exactly at the threshold",
      { wasAborted: false, exitCode: 0, interactive: true, durationMs: TURN_COMPLETION_ATTENTION_THRESHOLD_MS },
      true,
    ],
    [
      "short success turn (below threshold)",
      { wasAborted: false, exitCode: 0, interactive: true, durationMs: 300 },
      false,
    ],
    [
      "missing durationMs counts as too short",
      { wasAborted: false, exitCode: 0, interactive: true },
      false,
    ],
    [
      "aborted turn",
      { wasAborted: true, exitCode: 0, interactive: true, durationMs: 10_000 },
      false,
    ],
    [
      "stream interruption",
      { wasAborted: false, streamInterrupted: true, exitCode: 0, interactive: true, durationMs: 10_000 },
      false,
    ],
    [
      "failed turn",
      { wasAborted: false, exitCode: 1, interactive: true, durationMs: 10_000 },
      false,
    ],
    [
      "non-interactive completion",
      { wasAborted: false, exitCode: 0, interactive: false, durationMs: 10_000 },
      false,
    ],
  ])("%s", (_name, decision, expected) => {
    expect(shouldEmitTerminalBell(decision)).toBe(expected);
  });
});

describe("terminal turn notification — BEL base protocol", () => {
  test("writes a BEL without adding layout text", () => {
    let received = "";
    emitTerminalBell({
      write(chunk: string) {
        received += chunk;
        return true;
      },
    });
    expect(received).toBe("\x07");
  });

  test("does not throw when the terminal rejects the notification", () => {
    expect(() =>
      emitTerminalBell({
        write() {
          throw new Error("closed");
        },
      }),
    ).not.toThrow();
  });
});

describe("isWindowsTerminal — env.WT_SESSION feature detection", () => {
  test("detects WT_SESSION regardless of platform string", () => {
    expect(isWindowsTerminal({ WT_SESSION: "abc" })).toBe(true);
    expect(isWindowsTerminal({})).toBe(false);
    expect(isWindowsTerminal({ WT_SESSION: "" })).toBe(false);
    expect(isWindowsTerminal(undefined)).toBe(false);
  });
});

describe("emitTerminalAttention", () => {
  test("input-required outside Windows Terminal: BEL only, no OSC 9;4", () => {
    const { output, written } = createCapturingOutput();
    emitTerminalAttention({ output, env: {}, reason: "input-required" });
    expect(written()).toBe("\x07");
  });

  test("input-required in Windows Terminal: BEL then OSC 9;4 indeterminate", () => {
    const { output, written } = createCapturingOutput();
    emitTerminalAttention({ output, env: WT_ENV, reason: "input-required" });
    expect(written()).toBe("\x07\x1b]9;4;3;0\x07");
  });

  test("turn-completed in Windows Terminal: BEL then OSC 9;4 clear", () => {
    const { output, written } = createCapturingOutput();
    emitTerminalAttention({ output, env: WT_ENV, reason: "turn-completed" });
    expect(written()).toBe("\x07\x1b]9;4;0;0\x07");
  });

  test("turn-completed outside Windows Terminal: BEL only", () => {
    const { output, written } = createCapturingOutput();
    emitTerminalAttention({ output, env: {}, reason: "turn-completed" });
    expect(written()).toBe("\x07");
  });

  test("never throws when the output rejects the sequences", () => {
    const throwing = {
      write() {
        throw new Error("closed");
      },
    } as unknown as NodeJS.WritableStream;
    expect(() =>
      emitTerminalAttention({ output: throwing, env: WT_ENV, reason: "input-required" }),
    ).not.toThrow();
    expect(() =>
      emitTerminalAttention({ output: throwing, env: WT_ENV, reason: "turn-completed" }),
    ).not.toThrow();
  });
});

describe("clearTerminalAttentionProgress", () => {
  test("Windows Terminal: writes OSC 9;4 clear", () => {
    const { output, written } = createCapturingOutput();
    clearTerminalAttentionProgress({ output, env: WT_ENV });
    expect(written()).toBe("\x1b]9;4;0;0\x07");
  });

  test("outside Windows Terminal: writes nothing", () => {
    const { output, written } = createCapturingOutput();
    clearTerminalAttentionProgress({ output, env: {} });
    expect(written()).toBe("");
  });

  test("never throws when the output rejects the clear", () => {
    expect(() =>
      clearTerminalAttentionProgress({
        output: {
          write() {
            throw new Error("closed");
          },
        } as unknown as NodeJS.WritableStream,
        env: WT_ENV,
      }),
    ).not.toThrow();
  });
});

describe("runWithInputRequiredAttention", () => {
  test("emits attention on entry and clears after the body resolves", async () => {
    const { output, written } = createCapturingOutput();
    const result = await runWithInputRequiredAttention({ output, env: WT_ENV }, async () => "ok");
    expect(result).toBe("ok");
    expect(written()).toBe("\x07\x1b]9;4;3;0\x07\x1b]9;4;0;0\x07");
  });

  test("clears even when the body throws (exception path)", async () => {
    const { output, written } = createCapturingOutput();
    await expect(
      runWithInputRequiredAttention({ output, env: WT_ENV }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(written()).toBe("\x07\x1b]9;4;3;0\x07\x1b]9;4;0;0\x07");
  });

  test("outside Windows Terminal: BEL on entry, no sequences on cleanup", async () => {
    const { output, written } = createCapturingOutput();
    await runWithInputRequiredAttention({ output, env: {} }, async () => "ok");
    expect(written()).toBe("\x07");
  });
});
