import { describe, expect, test } from "bun:test";
import { createDialogHost, resolveDialogBottomRow } from "./dialogHost";

function createComposerSpy(inputLines = 2) {
  const calls: string[] = [];
  let paused = false;
  return {
    calls,
    composer: {
      pause() {
        paused = true;
        calls.push("pause");
      },
      resumeFromDialog() {
        paused = false;
        calls.push("resume");
      },
      getInputLines: () => inputLines,
      isPaused: () => paused,
    },
  };
}

const output = { rows: 30, write: () => true } as unknown as NodeJS.WritableStream;

describe("resolveDialogBottomRow", () => {
  test("stacks the frame just above the docked composer", () => {
    expect(resolveDialogBottomRow({ output: { rows: 30 }, inputLines: 2 })).toBe(28);
  });

  test("falls back to 24 rows when the stream reports no size", () => {
    expect(resolveDialogBottomRow({ output: {}, inputLines: 2 })).toBe(22);
  });

  test("never returns a row above the top of the screen", () => {
    expect(resolveDialogBottomRow({ output: { rows: 1 }, inputLines: 40 })).toBe(1);
  });
});

describe("createDialogHost", () => {
  test("pauses the composer around the dialog and anchors it", async () => {
    const { calls, composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    const anchor = await host.run(async (a) => a);

    expect(anchor.bottomAnchored).toBe(true);
    expect(anchor.bottomRow()).toBe(28);
    expect(calls).toEqual(["pause", "resume"]);
  });

  test("anchor resolves lazily so a terminal resize re-docks the dialog", async () => {
    // The picker used to capture bottomRow once at open; dragging the window
    // then left the frame frozen at the pre-resize rows instead of stacked
    // above the composer.
    const { composer } = createComposerSpy();
    const resizable = { rows: 30, write: () => true } as unknown as NodeJS.WritableStream;
    const host = createDialogHost({ composer, output: resizable });

    await host.run(async (anchor) => {
      expect(anchor.bottomRow()).toBe(28);
      (resizable as unknown as { rows: number }).rows = 20;
      expect(anchor.bottomRow()).toBe(18);
    });
  });

  test("reports paused while the dialog body runs", async () => {
    // This is what suppresses the transcript repaint underneath an open
    // dialog; if it were false mid-body, streaming tokens would erase the
    // frame — the exact failure that made the confirm prompt invisible.
    const { composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    let pausedDuringBody = false;
    await host.run(async () => {
      pausedDuringBody = composer.isPaused();
    });

    expect(pausedDuringBody).toBe(true);
    expect(composer.isPaused()).toBe(false);
  });

  test("restores the composer when the dialog throws", async () => {
    const { calls, composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    let thrown: unknown = null;
    try {
      await host.run(async () => {
        throw new Error("picker exploded");
      });
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error | null)?.message).toBe("picker exploded");

    expect(calls).toEqual(["pause", "resume"]);
    expect(composer.isPaused()).toBe(false);
  });
});

// Structural coverage for docs/plans/2026-08-31-dialoghost-complete.md: `run()`
// (and `withKeyboard()`, for the one non-framed modal) must be the *only*
// owner of keyboard claim + decoder drain + release. These tests exercise
// `dialogHost` directly — not any one call site — so any future modal that
// routes through `run()` is automatically covered, instead of needing its
// own copy of this regression test the way every call site used to need its
// own copy of the manual claim/drain/release code.
describe("createDialogHost — keyboard claim + decoder drain ownership", () => {
  test("isKeyboardClaimed() is false before run(), true for the whole body, false again after", async () => {
    const { composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    expect(host.isKeyboardClaimed()).toBe(false);

    let claimedDuringBody = false;
    await host.run(async () => {
      claimedDuringBody = host.isKeyboardClaimed();
    });

    expect(claimedDuringBody).toBe(true);
    expect(host.isKeyboardClaimed()).toBe(false);
  });

  test("run() releases the keyboard claim even when the body throws", async () => {
    const { composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    await host.run(async () => {
      throw new Error("picker exploded");
    }).catch(() => {});

    expect(host.isKeyboardClaimed()).toBe(false);
  });

  test("drains the decoder before releasing the keyboard claim — order is load-bearing (8952280c1 / b149133ee: getting this backwards shipped as two separate incidents)", async () => {
    const { composer } = createComposerSpy();
    const order: string[] = [];
    const host = createDialogHost({
      composer,
      output,
      drainDecoder: () => {
        order.push("drain");
        // The claim must still be held at the moment of draining — draining
        // after the flag already dropped would let a stray key slip through
        // the guard in the same tick the drain is supposed to be closing.
        expect(host.isKeyboardClaimed()).toBe(true);
      },
    });

    await host.run(async () => {
      order.push("body");
    });
    order.push("released");

    expect(order).toEqual(["body", "drain", "released"]);
    expect(host.isKeyboardClaimed()).toBe(false);
  });

  test("a debounced Enter buffered during the dialog does not leak into composer submit after close", async () => {
    // Simulates the composer's raw decoder (tuiRawInput.ts): an Enter
    // keypress is indistinguishable from the start of an unmarked paste, so
    // it sits in a ~40ms debounce buffer before being emitted as a submit
    // token. `destroy()` (what `drainDecoder` calls in production) discards
    // that buffer instead of letting the debounce fire later.
    let pendingEnter = true;
    const submittedLines: string[] = [];
    const decoder = {
      destroy: () => {
        pendingEnter = false;
      },
      // The debounce timer firing *after* the dialog has already closed —
      // this is the exact race both incidents shipped.
      fireDebounceIfStillPending: () => {
        if (pendingEnter) submittedLines.push("\r");
      },
    };
    const { composer } = createComposerSpy();
    const host = createDialogHost({
      composer,
      output,
      drainDecoder: () => decoder.destroy(),
    });

    await host.run(async () => "confirmed");
    decoder.fireDebounceIfStillPending();

    expect(submittedLines).toEqual([]);
  });

  test("withKeyboard() claims/releases the same contract without touching the composer (the handoff-gate raw prompt owns its own pause/resume)", async () => {
    const { calls, composer } = createComposerSpy();
    const drainCalls: string[] = [];
    const host = createDialogHost({
      composer,
      output,
      drainDecoder: () => drainCalls.push("drain"),
    });

    expect(host.isKeyboardClaimed()).toBe(false);
    let claimedDuringBody = false;
    const result = await host.withKeyboard(async () => {
      claimedDuringBody = host.isKeyboardClaimed();
      return "handoff-result";
    });

    expect(result).toBe("handoff-result");
    expect(claimedDuringBody).toBe(true);
    expect(host.isKeyboardClaimed()).toBe(false);
    expect(drainCalls).toEqual(["drain"]);
    // Unlike run(), withKeyboard() never pauses/resumes the composer — the
    // handoff-gate caller does that itself around its own wait window.
    expect(calls).toEqual([]);
  });

  test("withKeyboard() releases the claim even when the body throws", async () => {
    const { composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    await host
      .withKeyboard(async () => {
        throw new Error("handoff cancelled");
      })
      .catch(() => {});

    expect(host.isKeyboardClaimed()).toBe(false);
  });

  // Regression coverage for the /agent and /pick-dialog call sites
  // (tuiSlashRouter.ts:394 and :526): before this refactor, `dialogHost.run()`
  // never claimed the keyboard at all, so a picker's own `runSelectDialog`
  // raw-key reader and the composer's decoder were two parallel `data`
  // listeners on the same stdin — every arrow-key/Enter press was handled
  // twice. This reproduces that shape with `dialogHost` directly: a
  // "composer" listener guarded the way `readlineWorkspace.ts`'s
  // `handleInputToken` actually guards it (`if
  // (dialogHost.isKeyboardClaimed()) return;`), and a "picker" listener that
  // (like `runSelectDialog`) reads unconditionally. Now that `run()` claims
  // the keyboard for the whole picker lifetime, the composer listener must
  // stay silent for every key delivered while the picker is open.
  test("a run()-claimed dialog shields a guarded composer listener from double-processing the same stdin events (agent/dialog picker regression)", async () => {
    const { composer } = createComposerSpy();
    const host = createDialogHost({ composer, output });

    const composerDraft: string[] = [];
    const pickerKeysSeen: string[] = [];
    // Mirrors handleInputToken's actual guard (readlineWorkspace.ts).
    const deliverToComposer = (key: string) => {
      if (host.isKeyboardClaimed()) return;
      composerDraft.push(key);
    };

    await host.run(async () => {
      // The picker's own reader (runSelectDialog) has no such guard — it
      // just reads. Both "listeners" receive the same simulated keys.
      for (const key of ["\x1b[B", "\x1b[B", "\r"]) {
        pickerKeysSeen.push(key);
        deliverToComposer(key);
      }
      return "selected";
    });

    expect(pickerKeysSeen).toEqual(["\x1b[B", "\x1b[B", "\r"]);
    // None of the picker's navigation/confirm keys leaked into the composer
    // draft — pre-fix, all three would have landed here too.
    expect(composerDraft).toEqual([]);
  });
});
