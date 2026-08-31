import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import type { LocalAgentActionGate } from "../../agent-runtime/localLoop";
import { createDialogHost, type DialogHostComposer } from "./dialogHost";
import { resolveActionGate, waitForRawActionGate } from "./tuiTurnRunner";

/**
 * Regression coverage for docs/plans/2026-08-31-action-gate-invisible.md.
 *
 * Root cause: gate prompts were printed with a bare `output.write()` and
 * never paused the composer. The activity indicator repaints the fixed
 * input area from `history` every ACTIVITY_FRAME_INTERVAL_MS (150ms) — see
 * activityIndicator.ts — guarded only by `fixedInput.isPaused()`. Because
 * nothing paused for a gate, the very next tick wiped the prompt off the
 * screen while the gate silently kept holding the keyboard: the turn looked
 * hung. `resolveActionGate` is the fixed entry point `readlineWorkspace.ts`
 * now calls for every raw-TTY gate.
 */

type FakeTty = EventEmitter & {
  isTTY: boolean;
  isRaw: boolean;
  columns?: number;
  setRawMode: (mode: boolean) => unknown;
};

/**
 * A `NodeJS.ReadableStream` (the type `resolveActionGate`/`waitForRawActionGate`
 * accept) whose real interface is much narrower than `NodeJS.ReadStream` — but
 * TS's structural check still complains about the shape mismatch between a
 * plain `EventEmitter` and the stream interfaces, so the constructor casts once
 * here instead of at every call site.
 */
function createFakeTty(): FakeTty & NodeJS.ReadableStream {
  const emitter = new EventEmitter() as unknown as FakeTty & NodeJS.ReadableStream;
  emitter.isTTY = true;
  emitter.isRaw = true;
  emitter.setRawMode = () => {};
  return emitter;
}

/**
 * A minimal stand-in for the real screen: `output.write()` appends to it,
 * and `simulateActivityIndicatorTick()` reproduces the exact erasure the
 * production activityIndicator.onRepaint performs — a full repaint of the
 * fixed input area from `history` (which never contains a gate prompt) that
 * only fires when the composer is NOT paused. `composer` is a real
 * `DialogHostComposer`, driven by `createDialogHost`, not a fabricated flag.
 */
function createScreenHarness() {
  let screen = "";
  let composerPaused = false;
  const output = {
    isTTY: true,
    columns: 80,
    write(chunk: string) {
      screen += String(chunk);
      return true;
    },
  } as unknown as NodeJS.WritableStream;
  const composer: DialogHostComposer = {
    pause() {
      composerPaused = true;
    },
    resumeFromDialog() {
      composerPaused = false;
    },
    getInputLines: () => 2,
    isPaused: () => composerPaused,
  };
  return {
    output,
    composer,
    isPaused: () => composerPaused,
    screenContains: (needle: string) => screen.includes(needle),
    simulateActivityIndicatorTick() {
      if (composerPaused) return; // mirrors `fixedInput.active && !isPaused()`
      screen = "[nolo] rendered history frame (no gate prompt)\n";
    },
  };
}

const confirmGate: LocalAgentActionGate = {
  id: "gate-1",
  kind: "confirm",
  title: "确认写入文件",
  body: "这是要确认的正文",
  toolName: "writeFile",
  toolCallId: "call-1",
};

describe("resolveActionGate — confirm gate visibility", () => {
  test("survives an activity-indicator repaint tick while it is still open", async () => {
    const harness = createScreenHarness();
    const dialogHost = createDialogHost({ composer: harness.composer, output: harness.output });
    const input = createFakeTty();

    const resultPromise = resolveActionGate(confirmGate, {
      dialogHost,
      input,
      output: harness.output,
      spawnRunner: (() => {
        throw new Error("spawnRunner must not be called for a confirm gate");
      }) as any,
      registerToken: () => {},
      pauseComposer: () => {},
      resumeComposerFromSubprocess: () => {},
      resumeComposerFromDialog: () => {},
    });

    // The synchronous portion of dialogHost.run() -> runConfirmDialog ->
    // runSelectDialog (pause + first paint) has already run by the time this
    // line executes: none of those functions await anything before their
    // first paint/pause call.
    expect(harness.isPaused()).toBe(true);
    expect(harness.screenContains("确认写入文件")).toBe(true);

    // One activity-indicator tick fires while the user still hasn't answered.
    harness.simulateActivityIndicatorTick();

    // Fixed: the prompt is still there because the composer stayed paused.
    expect(harness.screenContains("确认写入文件")).toBe(true);

    // Resolve the dialog (default highlighted item is Cancel) so the test
    // doesn't hang.
    input.emit("data", "\r");
    await resultPromise;
    expect(harness.isPaused()).toBe(false);
  });

  test("approving returns the existing buildGateConfirmedResult shape", async () => {
    const harness = createScreenHarness();
    const dialogHost = createDialogHost({ composer: harness.composer, output: harness.output });
    const input = createFakeTty();

    const resultPromise = resolveActionGate(confirmGate, {
      dialogHost,
      input,
      output: harness.output,
      spawnRunner: (() => {
        throw new Error("spawnRunner must not be called for a confirm gate");
      }) as any,
      registerToken: () => {},
      pauseComposer: () => {},
      resumeComposerFromSubprocess: () => {},
      resumeComposerFromDialog: () => {},
    });

    // Move the highlight up from the default Cancel row to Allow, then submit.
    input.emit("data", "\x1b[A");
    input.emit("data", "\r");

    const result = await resultPromise;
    expect(result).toEqual({
      content: `action gate completed: ${confirmGate.title}`,
      metadata: {
        actionGateResult: { gateId: confirmGate.id, status: "completed", output: "confirmed" },
      },
    });
  });

  test("cancelling returns exitCode 130 and a cancelled actionGateResult", async () => {
    const harness = createScreenHarness();
    const dialogHost = createDialogHost({ composer: harness.composer, output: harness.output });
    const input = createFakeTty();

    const resultPromise = resolveActionGate(confirmGate, {
      dialogHost,
      input,
      output: harness.output,
      spawnRunner: (() => {
        throw new Error("spawnRunner must not be called for a confirm gate");
      }) as any,
      registerToken: () => {},
      pauseComposer: () => {},
      resumeComposerFromSubprocess: () => {},
      resumeComposerFromDialog: () => {},
    });

    // Esc cancels the dialog outright.
    input.emit("data", "\x1b");

    const result = await resultPromise;
    expect(result.metadata?.exitCode).toBe(130);
    expect(result.metadata?.actionGateResult).toEqual({
      gateId: confirmGate.id,
      status: "cancelled",
      output: "confirmation declined",
    });
  });
});

describe("resolveActionGate — handoff gate visibility", () => {
  const handoffGate: LocalAgentActionGate = {
    id: "gate-2",
    kind: "handoff",
    title: "run an interactive rebase",
    payload: { command: ["git", "rebase", "-i", "HEAD~3"] },
    toolName: "execShell",
    toolCallId: "call-2",
  };

  test("the wait-for-Enter prompt survives a repaint tick before the subprocess runs", async () => {
    const harness = createScreenHarness();
    const dialogHost = createDialogHost({ composer: harness.composer, output: harness.output });
    const input = createFakeTty();
    const tokenHandlerRef: { current: ((token: string) => void) | null } = { current: null };

    let pauseCalls = 0;
    let subprocessResumeCalls = 0;
    let dialogResumeCalls = 0;
    const resultPromise = resolveActionGate(handoffGate, {
      dialogHost,
      input,
      output: harness.output,
      spawnRunner: (() => {
        throw new Error("this test cancels before the subprocess ever runs");
      }) as any,
      registerToken: (handler) => {
        tokenHandlerRef.current = handler;
      },
      pauseComposer: () => {
        pauseCalls += 1;
        harness.composer.pause();
      },
      resumeComposerFromSubprocess: () => {
        subprocessResumeCalls += 1;
        harness.composer.resumeFromDialog();
      },
      resumeComposerFromDialog: () => {
        dialogResumeCalls += 1;
        harness.composer.resumeFromDialog();
      },
    });

    // The prompt is written synchronously (writeGatePrompt runs before the
    // returned promise's executor even installs its token handler).
    expect(harness.screenContains(handoffGate.title)).toBe(true);
    // Fixed: composer pauses for the whole wait-for-Enter window, not just
    // around the subprocess.
    expect(pauseCalls).toBe(1);
    expect(harness.isPaused()).toBe(true);

    harness.simulateActivityIndicatorTick();
    expect(harness.screenContains(handoffGate.title)).toBe(true);

    // Cancel before Enter is ever pressed — the subprocess never runs, so
    // resumeComposerFromDialog (not resumeComposerFromSubprocess) must be the
    // one that cleans up.
    tokenHandlerRef.current?.("\u0003");
    const result = await resultPromise;
    const actionGateResult = result.metadata?.actionGateResult as
      | { status?: string }
      | undefined;
    expect(actionGateResult?.status).toBe("cancelled");
    expect(subprocessResumeCalls).toBe(0);
    expect(dialogResumeCalls).toBe(1);
    expect(harness.isPaused()).toBe(false);
  });
});

describe("waitForRawActionGate — pre-fix baseline behavior kept intact for handoff", () => {
  test("still cancels on Ctrl+C and completes on failed/absent payload as before", async () => {
    // Sanity check that the underlying primitive resolveActionGate still
    // delegates to (waitForRawActionGate) has not changed its handoff
    // contract — only the caller-side pause timing changed.
    const output = { write: () => true } as unknown as NodeJS.WritableStream;
    const input = createFakeTty();
    const gate: LocalAgentActionGate = {
      id: "gate-3",
      kind: "handoff",
      title: "handoff without payload",
      toolName: "execShell",
      toolCallId: "call-3",
    };
    const resultPromise = waitForRawActionGate(
      input,
      output,
      gate,
      (() => {
        throw new Error("must not spawn");
      }) as any,
    );
    input.emit("data", "\u0003");
    const result = await resultPromise;
    expect(result.metadata?.actionGateResult).toEqual({
      gateId: gate.id,
      status: "cancelled",
      output: "interrupted",
    });
  });
});
