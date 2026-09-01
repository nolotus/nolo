import { describe, expect, test } from "bun:test";

import { createTurnInjectionInbox, appendStreamSafeNotice } from "./turnInjectionInbox";
import { runOneAgentTurn, type AgentTurnContext } from "./tuiTurnRunner";
import {
  createTurnHistory,
  startTurn,
  finalizeCurrentTurn,
  appendLocalTurn,
  createHistoryOutputStream,
  buildHistoryLines,
} from "./tuiHistory";
import type { ChildRunCompletedTurnEvent } from "core/chat/internalTurnEvent";

describe("createTurnInjectionInbox", () => {
  test("drain 取走并清空全部文本", () => {
    const inbox = createTurnInjectionInbox<string>();
    expect(inbox.push({ text: "a", fallback: "a" })).toBe(true);
    expect(inbox.push({ text: "b", fallback: "b" })).toBe(true);
    expect(inbox.size).toBe(2);
    expect(inbox.drain()).toEqual(["a", "b"]);
    expect(inbox.size).toBe(0);
    expect(inbox.drain()).toEqual([]);
  });

  test("空白文本不入箱", () => {
    const inbox = createTurnInjectionInbox<string>();
    expect(inbox.push({ text: "   ", fallback: "x" })).toBe(false);
    expect(inbox.size).toBe(0);
  });

  test("close 之后拒收，并交还未消化的残留条目（含 fallback 原载荷）", () => {
    const inbox = createTurnInjectionInbox<{ id: string }>();
    inbox.push({ text: "pending", fallback: { id: "run-1" } });
    const leftover = inbox.close();
    expect(leftover).toEqual([{ text: "pending", fallback: { id: "run-1" } }]);
    expect(inbox.closed).toBe(true);
    // 关闭后到达的注入必须被拒收，调用方据此落回 chat 队列。
    expect(inbox.push({ text: "late", fallback: { id: "run-2" } })).toBe(false);
  });
});

// DoD(c)：turn abort 时收件箱残留 → 落回 chat 队列（断言 binding.enqueue 被调）。
describe("runOneAgentTurn 注入收件箱兜底", () => {
  function makeWakeEvent(runId: string): ChildRunCompletedTurnEvent {
    return {
      kind: "child-run-completed",
      runs: [{ runId, agentName: "Worker", status: "done" }],
      text: `后台 run ${runId} 已到终态 done（全文摘要）`,
      displayText: `[run ${runId} done]`,
    } as ChildRunCompletedTurnEvent;
  }

  /**
   * 用最小 ctx 直接驱动 runOneAgentTurn：agentRunner 在跑到一半时往
   * ctx.turnInjectionInbox 投一条唤醒（模拟 busy 期间的 runWakeHandler），
   * 然后 abort 本轮 —— loop 没机会消化，finally 必须把它落回 chat 队列。
   */
  function buildCtx(options: {
    onRun: (ctx: AgentTurnContext) => Promise<any>;
    enqueued: unknown[];
  }): AgentTurnContext {
    const history = createTurnHistory();
    const noop = () => {};
    const binding = {
      enqueue: (input: unknown) => {
        options.enqueued.push(input);
        return {} as any;
      },
    };
    const ctx: any = {
      state: {
        agentKey: "agent-x",
        agentName: "X",
        serverUrl: "",
        dialogId: "dlg-1",
        cwd: process.cwd(),
        attachedSkills: [],
        runtimeMode: "local",
      },
      forcedStop: false,
      forcedStopEpoch: 0,
      turnEpoch: 0,
      activeTurnAbort: null,
      activeTurnEpoch: 0,
      modalOwnsKeyboard: false,
      composerDecoderDrain: null,
      // 预置 binding，ensureChatQueueBinding 会直接复用它（不再新建）。
      chatQueueBinding: binding,
      turnInjectionInbox: null,
      sessionEnded: false,
      buffer: "",
      cursorPos: 0,
      options: {
        scriptDir: "",
        env: {},
        // agentRunner 由 runAgentChat 透传调用。
        agentRunner: async () => ctx.__runResult,
      },
      effectiveEnv: {},
      history,
      fixedInput: { active: false, isPaused: () => false, repaint: noop },
      activityIndicator: {
        stop: noop,
        updateAgentRun: noop,
        clearAgentRun: noop,
      },
      activityReporter: noop,
      runRegistryPoller: { beginHold: noop, endHold: noop, ensureRunning: noop },
      runCompletionWatcher: { markAcknowledged: noop },
      pasteStore: undefined,
      dialogHost: null,
      input: { isTTY: false } as any,
      output: { write: noop } as any,
      syncWindowTitle: noop,
      renderHistoryToOutput: noop,
      scheduleRender: noop,
      flushPendingRender: noop,
      refreshDialogTotalCredits: noop,
      emitCommandOutput: noop,
    };
    ctx.options.agentRunner = async () => options.onRun(ctx as AgentTurnContext);
    return ctx as AgentTurnContext;
  }

  test("turn 被 abort 时收件箱残留的唤醒落回 chat 队列（不丢消息）", async () => {
    const enqueued: unknown[] = [];
    const wake = makeWakeEvent("run-abort-1");

    const ctx = buildCtx({
      enqueued,
      onRun: async (c) => {
        // turn 进行中：模拟 busy 期间到达的终态唤醒被直投当前 loop 收件箱。
        expect(c.turnInjectionInbox).not.toBeNull();
        expect(
          c.turnInjectionInbox!.push({ text: wake.text, fallback: wake }),
        ).toBe(true);
        // 本轮被中断，loop 没有 drain 的机会。
        c.activeTurnAbort?.abort();
        return { exitCode: 0, dialogId: "dlg-1", streamInterrupted: true };
      },
    });

    await runOneAgentTurn(ctx, "user says hi", [], async () => undefined);

    // 兜底：残留条目以「原始唤醒事件」形态落回队列，保留 displayText 与
    // markAcknowledged 过滤所需的结构。
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toBe(wake);
    // 收件箱在 turn 结束时被摘除并关闭。
    expect(ctx.turnInjectionInbox).toBeNull();
  });

  test("被 loop 消化掉的注入不会重复落回队列", async () => {
    const enqueued: unknown[] = [];
    const wake = makeWakeEvent("run-consumed-1");

    const ctx = buildCtx({
      enqueued,
      onRun: async (c) => {
        c.turnInjectionInbox!.push({ text: wake.text, fallback: wake });
        // 模拟 local loop 的 drainInjections 把它取走消化了。
        expect(c.turnInjectionInbox!.drain()).toEqual([wake.text]);
        return { exitCode: 0, dialogId: "dlg-1" };
      },
    });

    await runOneAgentTurn(ctx, "user says hi", [], async () => undefined);

    expect(enqueued).toHaveLength(0);
  });
});

// ── 回归：流式 assistant 段进行中插入注入状态行 ───────────────────────────
//
// 历史缺陷（review HIGH）：状态行走 emitCommandOutput → appendLocalTurn，
// 后者 finalizeCurrentTurn 把 history.currentRole 置 null；而
// createHistoryOutputStream.write 只调 applyOutputChunkToCurrentTurn，不会把
// currentRole 设回 assistant。于是注入之后模型继续流出的文本写进
// currentContent 却因 currentRole===null 被 finalizeCurrentTurn 早退丢弃
// —— 后续 assistant 输出被静默吞掉（不保存也不渲染）。
describe("appendStreamSafeNotice（流式中插入状态行不吞输出）", () => {
  const deps = { appendLocalTurn, startTurn };

  test("assistant 流式进行中注入 → 后续 chunks 仍被保存与渲染", () => {
    const history = createTurnHistory();
    startTurn(history, "assistant");
    const stream = createHistoryOutputStream(history, () => {}) as any;

    stream.write("PART-A before wake. ");
    // 唤醒到达，插入紧凑状态行。
    appendStreamSafeNotice(history, "[run r1 done]", deps);
    // 关键不变式：流式段必须立刻重开，后续 chunk 才有处可去。
    expect(history.currentRole).toBe("assistant");
    stream.write("PART-B after wake.");
    finalizeCurrentTurn(history);

    // 时间顺序正确的三段：assistant(前半) → 状态行 → assistant(后半)。
    expect(history.turns.map((t) => t.role)).toEqual([
      "assistant",
      "local",
      "assistant",
    ]);
    const all = history.turns.map((t) => String(t.content)).join("\n");
    expect(all).toContain("PART-A before wake.");
    expect(all).toContain("run r1 done");
    // 这一条就是缺陷的直接断言：修复前 PART-B 会被静默吞掉。
    expect(all).toContain("PART-B after wake.");

    // 渲染层同样能看到后半段（不只是留在数据结构里）。
    const rendered = buildHistoryLines(history, 80).join("\n");
    expect(rendered).toContain("PART-B after wake.");
  });

  test("注入发生在 assistant 段尚无内容时不产生空 assistant turn", () => {
    const history = createTurnHistory();
    startTurn(history, "assistant");
    const stream = createHistoryOutputStream(history, () => {}) as any;

    // 一个字都还没流出就来了唤醒。
    appendStreamSafeNotice(history, "[run r2 done]", deps);
    expect(history.currentRole).toBe("assistant");
    stream.write("only content after wake.");
    finalizeCurrentTurn(history);

    // 不应出现内容为空的 assistant turn。
    expect(history.turns.map((t) => t.role)).toEqual(["local", "assistant"]);
    expect(String(history.turns.at(-1)!.content)).toContain("only content after wake.");
  });

  test("没有进行中的流式段时行为与普通 appendLocalTurn 一致", () => {
    const history = createTurnHistory();
    appendStreamSafeNotice(history, "[run r3 done]", deps);
    // 不凭空开一个 assistant 段。
    expect(history.currentRole).toBeNull();
    expect(history.turns.map((t) => t.role)).toEqual(["local"]);
  });

  test("连续多次注入不丢中间的 assistant 内容", () => {
    const history = createTurnHistory();
    startTurn(history, "assistant");
    const stream = createHistoryOutputStream(history, () => {}) as any;

    stream.write("A1.");
    appendStreamSafeNotice(history, "[wake-1]", deps);
    stream.write("A2.");
    appendStreamSafeNotice(history, "[wake-2]", deps);
    stream.write("A3.");
    finalizeCurrentTurn(history);

    const all = history.turns.map((t) => String(t.content)).join("\n");
    for (const fragment of ["A1.", "wake-1", "A2.", "wake-2", "A3."]) {
      expect(all).toContain(fragment);
    }
  });
});
