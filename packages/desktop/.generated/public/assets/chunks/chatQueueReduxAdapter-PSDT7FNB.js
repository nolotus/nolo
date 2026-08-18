import {
  handleSendMessage
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  clearPendingUserInputQueue,
  dequeueUserInput,
  enqueueUserInput,
  getLoopStopReason,
  getPendingUserInputQueue
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __publicField
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/core/chat/chatQueueMachine.ts
var initialChatQueueState = {
  running: false,
  queue: [],
  drainPaused: false,
  lastDrainError: null
};
function reduceChatQueue(state, event) {
  switch (event.type) {
    case "turn-start":
      if (state.running) return state;
      return { ...state, running: true, lastDrainError: null };
    case "turn-end": {
      if (!state.running) return state;
      if (event.aborted) {
        return {
          ...state,
          running: false,
          queue: [],
          lastDrainError: null
        };
      }
      return {
        ...state,
        running: false,
        ...event.ok ? {} : { lastDrainError: "previous turn failed" }
      };
    }
    case "enqueue": {
      const text = event.text;
      if (!text) return state;
      return { ...state, queue: [...state.queue, text], lastDrainError: null };
    }
    case "dequeue": {
      if (state.queue.length === 0) return state;
      return { ...state, queue: state.queue.slice(1) };
    }
    case "clear":
      if (state.queue.length === 0 && !state.lastDrainError) return state;
      return { ...state, queue: [], lastDrainError: null };
    case "pause-drain":
      if (state.drainPaused) return state;
      return { ...state, drainPaused: true };
    case "resume-drain":
      if (!state.drainPaused) return state;
      return { ...state, drainPaused: false };
    case "drain-error":
      return { ...state, lastDrainError: event.message };
    default: {
      const _exhaustive = event;
      return state;
    }
  }
}
function shouldDrainAfterTurnEnd(state, prevEndedOk) {
  return !state.running && !state.drainPaused && state.queue.length > 0 && prevEndedOk;
}
function applyChatQueueEvent(state, event) {
  const prevQueueLen = state.queue.length;
  const prevRunning = state.running;
  const prevPaused = state.drainPaused;
  const next = reduceChatQueue(state, event);
  const outgoing = [];
  if (next.queue.length !== prevQueueLen) {
    outgoing.push({ type: "queue-changed", length: next.queue.length });
  }
  if (next.running !== prevRunning) {
    outgoing.push({ type: "running-changed", running: next.running });
  }
  if (next.drainPaused !== prevPaused) {
    outgoing.push({ type: "drain-paused-changed", paused: next.drainPaused });
  }
  if (event.type === "turn-end" && !event.aborted && event.ok) {
    if (shouldDrainAfterTurnEnd(next, true)) {
      outgoing.push({ type: "drain-ready", text: next.queue[0] });
    }
  }
  return { state: next, outgoing };
}

// packages/core/chat/chatQueueRuntime.ts
function createChatQueueRuntime(initialState = initialChatQueueState) {
  let state = initialState;
  const listeners = /* @__PURE__ */ new Set();
  const dispatch = (events) => {
    for (const e of events) {
      for (const l of listeners) l(e);
    }
  };
  return {
    getState: () => state,
    send(event) {
      const result = applyChatQueueEvent(state, event);
      state = result.state;
      dispatch(result.outgoing);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    on(type, listener) {
      const wrapped = (e) => {
        if (e.type === type) {
          listener(e);
        }
      };
      listeners.add(wrapped);
      return () => {
        listeners.delete(wrapped);
      };
    },
    dispose() {
      listeners.clear();
      state = initialChatQueueState;
    }
  };
}

// packages/chat/queue/chatQueueReduxAdapter.ts
var ChatQueueReduxAdapter = class {
  constructor(store, opts = {}) {
    __publicField(this, "runtimes", /* @__PURE__ */ new Map());
    __publicField(this, "store");
    __publicField(this, "opts");
    /** Pending drain promises per dialog, so notifyTurnEnd can be awaited. */
    __publicField(this, "pendingDrains", /* @__PURE__ */ new Map());
    this.store = store;
    this.opts = opts;
  }
  /**
   * Get (or lazily create) the runtime for a dialog. The runtime is seeded from
   * dialogRuntimeStore `pendingUserInputQueue` so we don't lose queued items
   * written before the adapter existed.
   */
  getRuntime(dialogKey) {
    let rt = this.runtimes.get(dialogKey);
    if (rt) return rt;
    const legacyQueue = getPendingUserInputQueue(dialogKey);
    const seed = {
      running: false,
      queue: Array.isArray(legacyQueue) ? [...legacyQueue] : [],
      drainPaused: getLoopStopReason(dialogKey) === "pending",
      lastDrainError: null
    };
    rt = createChatQueueRuntime(seed);
    this.runtimes.set(dialogKey, rt);
    rt.on("drain-ready", ({ text }) => {
      const dispatch = this.store.dispatch;
      const runtime = rt;
      const promise = (async () => {
        try {
          if (this.opts.sendDrainedText) {
            await this.opts.sendDrainedText({ dialogKey, text, dispatch });
          } else {
            await dispatch(
              handleSendMessage({
                dialogKey,
                userInput: text
              })
            );
          }
          runtime.send({ type: "dequeue" });
          dequeueUserInput({ dialogKey });
        } catch (error) {
          const message = error instanceof Error ? error.message : typeof error === "string" ? error : "drain send failed";
          runtime.send({ type: "drain-error", message });
        } finally {
          this.pendingDrains.delete(dialogKey);
        }
      })();
      this.pendingDrains.set(dialogKey, promise);
    });
    return rt;
  }
  /** Drop a dialog's runtime (e.g. when the dialog is closed/deleted). */
  disposeRuntime(dialogKey) {
    const rt = this.runtimes.get(dialogKey);
    if (rt) {
      rt.dispose();
      this.runtimes.delete(dialogKey);
    }
  }
  /** Call when an agent turn starts streaming for this dialog. */
  notifyTurnStart(dialogKey) {
    this.getRuntime(dialogKey).send({ type: "turn-start" });
  }
  /**
   * Call when an agent turn ends for this dialog.
   * `ok` false without `aborted` keeps the queue (failure stop); `aborted`
   * clears the queue (user abandoned follow-ups) both in the core and in the
   * dialogRuntimeStore shadow.
   *
   * Returns a promise that resolves once any drain triggered by this turn-end
   * has committed (sent + dequeued) or failed. Callers that need to assert on
   * the post-drain state should await it.
   */
  notifyTurnEnd(dialogKey, outcome) {
    const rt = this.getRuntime(dialogKey);
    rt.send({ type: "turn-end", ...outcome });
    if (outcome.aborted) {
      clearPendingUserInputQueue({ dialogKey });
    }
    const pending = this.pendingDrains.get(dialogKey);
    return pending ? pending.then(() => void 0) : Promise.resolve();
  }
  /**
   * Enqueue a user input through the adapter. This writes to both the core
   * runtime and the dialogRuntimeStore queue so existing UI hooks keep working
   * during the migration.
   *
   * Order matters: we touch the runtime first (creating it if needed, seeded
   * from the *current* store shadow) and then mirror into the store. Doing it
   * the other way around would let the seed read back the value we just wrote
   * and double-count it.
   */
  enqueue(dialogKey, text) {
    this.getRuntime(dialogKey).send({ type: "enqueue", text });
    enqueueUserInput({ text, dialogKey });
  }
  /** Current queue snapshot (from the core runtime). */
  getQueue(dialogKey) {
    return this.getRuntime(dialogKey).getState().queue;
  }
  /** Reflect `loopStopReason === "pending"` into the runtime's pause flag. */
  syncDrainPause(dialogKey) {
    const paused = getLoopStopReason(dialogKey) === "pending";
    const rt = this.getRuntime(dialogKey);
    if (paused) rt.send({ type: "pause-drain" });
    else rt.send({ type: "resume-drain" });
  }
};
export {
  ChatQueueReduxAdapter
};
