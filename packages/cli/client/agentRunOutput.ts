import type { LocalAgentToolEvent } from "../../agent-runtime/localLoop";
import type { AgentExecutionObservationEvent } from "../../agent-runtime/executionObservation";
import { createRenderAwareStreamWriter, formatAssistantDisplay, formatAssistantTextForCli } from "./assistantOutput";
import { STYLE } from "./inlineMarkdown";
import { createThinkParserState, processThinkChunk, flushThinkParser } from "../../agent-runtime/thinkTagParser";
import {
  createToolEventFormatter,
  formatActiveToolLabel,
  resolveToolDisplayMode,
  shouldEmitToolEvents,
} from "./toolOutput";
import { parseAgentRunEvent } from "./agentRunSnapshot";
import { Spinner } from "./agentRunSpinner";
import type { RunAgentTurnOptions } from "./agentRunTypes";

/**
 * 把一条 compaction 观测事件折叠成一行 dim 摘要（无压缩事件返回空串）。
 * 数字缺失时省略对应片段；savedTokens 缺失时只省略「省约」片段，不做
 * before-after 二次推导（契约：token 数字只来自事件字段，禁止重算）。
 * 输出示例：
 *   `已压缩上下文：stub 12 条工具输出，省约 8.4k tokens`
 *   `已压缩上下文：生成历史摘要，省约 21k tokens`
 */
export function formatCompactionSummaryLine(
  event: Extract<
    AgentExecutionObservationEvent,
    { kind: "compaction" }
  > | null,
): string {
  if (!event) return "";
  const action =
    event.reason === "tool_stub"
      ? "stub 工具输出"
      : "生成历史摘要";
  let detail = action;
  if (typeof event.stubbedCount === "number") {
    detail = `stub ${event.stubbedCount} 条工具输出`;
  }
  const saved =
    typeof event.savedTokens === "number"
      ? event.savedTokens
      : undefined;
  let line = `已压缩上下文：${detail}`;
  if (saved !== undefined) {
    let k: string;
    if (saved >= 1000) {
      const v = (saved / 1000).toFixed(1);
      k = v.replace(/\.0$/, "") + "k";
    } else {
      k = String(saved);
    }
    line += `，省约 ${k} tokens`;
  }
  line += "\n";
  return `${STYLE.dim}${line}${STYLE.reset}`;
}

export interface CliTurnOutputOptions {
  options: RunAgentTurnOptions;
  workingLabel?: string;
  spinner?: Spinner;
}

export function formatAssistantResponseForCli(text: string) {
  return formatAssistantDisplay(
    formatAssistantTextForCli(text),
  );
}

export function resolveAgentEventMode(options: RunAgentTurnOptions): "text" | "jsonl" {
  if (options.eventsMode === "jsonl") return "jsonl";
  return options.env.NOLO_AGENT_EVENTS === "jsonl" ? "jsonl" : "text";
}

function formatToolJsonEvent(event: LocalAgentToolEvent) {
  return `${JSON.stringify({
    schemaVersion: 1,
    type: event.type,
    round: event.round + 1,
    tool: event.toolName,
    toolCallId: event.toolCallId,
    ...(event.argumentsPreview ? { argsPreview: event.argumentsPreview } : {}),
    ...(typeof event.elapsedMs === "number"
      ? { elapsedMs: event.elapsedMs }
      : {}),
    ...(event.summary ? { summary: event.summary } : {}),
    ...(event.message ? { message: event.message } : {}),
    ...(event.metadata ? { metadata: event.metadata } : {}),
  })}\n`;
}

/**
 * CLI turn output coordinator: owns the spinner, streaming text writer,
 * thinking sink, and tool-event formatter for one agent turn. Both the local
 * runtime path and the HTTP/SSE path share this so chrome behavior stays
 * consistent.
 */
export function createCliTurnOutput(params: CliTurnOutputOptions) {
  const { options } = params;
  const workingLabel = params.workingLabel ?? `${options.agentName} -> working`;
  const spinner =
    params.spinner ??
    new Spinner(options.output, workingLabel, Boolean(options.activityReporter));

  const toolDisplayMode = resolveToolDisplayMode(options.env);
  const traceLocalTools = shouldEmitToolEvents(toolDisplayMode);
  // 有 dock 订阅者（TUI）时，run 的实时进展由 composer 上方的面板呈现，
  // 进行中的 controlAgentRun status 轮询不再往 transcript 印进展卡
  // （终态/报错/日志变化仍印）。裸 CLI 没有订阅者，行为完全不变。
  const formatToolEvent = createToolEventFormatter(toolDisplayMode, undefined, {
    suppressRunProgressCards: typeof options.onAgentRunStatus === "function",
  });
  const eventMode = resolveAgentEventMode(options);

  let streamedAssistantText = false;
  let everStreamedAnyText = false;
  let printedAssistantLabel = false;
  let thinkState = createThinkParserState();
  // 压缩观测事件：一个 turn 至多渲染一行摘要。记录最后一条 compaction 事件，
  // 在 finish() 统一输出（保持与既有逐字节输出行为一致，无压缩事件零输出）。
  let compactionEvent: Extract<
    AgentExecutionObservationEvent,
    { kind: "compaction" }
  > | null = null;

  const renderWriter = createRenderAwareStreamWriter({
    write: (chunk) => options.output.write(chunk),
  });

  const writeVisibleAssistantChunk = (chunk: string) => {
    if (!chunk) return;
    // Strip inline think tags from streaming content (some models emit
    // thinking inline in content instead of as separate thinking events).
    const parsed = processThinkChunk(chunk, thinkState);
    thinkState = parsed.state;
    if (!parsed.content && !parsed.reasoning) return;
    // Reasoning from inline think tags goes to the spinner hint, not visible content.
    if (parsed.reasoning) {
      spinner.setThinkingHint(parsed.reasoning);
    }
    if (!parsed.content) return;
    spinner.stop();
    options.activityReporter?.(null);
    if (!printedAssistantLabel) {
      options.output.write(`\n${options.agentName} > `);
      printedAssistantLabel = true;
    }
    streamedAssistantText = true;
    everStreamedAnyText = true;
    renderWriter.push(parsed.content);
  };

  const handleToolEvent = (event: LocalAgentToolEvent) => {
    if (!traceLocalTools) return;

    const chunk =
      eventMode === "jsonl"
        ? formatToolJsonEvent(event)
        : formatToolEvent(event);

    if (eventMode === "jsonl") {
      options.output.write(chunk);
      return;
    }

    // A tool-call interrupts assistant text streaming. Flush any buffered
    // render text so it appears before the tool chrome. This must
    // happen before we stop the spinner for the tool chunk, because
    // writeVisibleAssistantChunk (called by the flush) manages its own
    // spinner stop + label writing. Tool-result events don't interrupt
    // text (it was already flushed by the preceding tool-call).
    if (event.type === "tool-call") {
      renderWriter.flush();
    }

    // ── Stop spinner before writing tool content ───────────────────
    // The spinner's \r clear must hit the spinner's own line, not a line
    // we are about to emit. The old code placed `spinner.stop()` after
    // `if (!chunk) return`, so buffered-class tool-results (chunk="")
    // returned early and left the `· Read xxx (0s)` frame permanently in
    // the transcript. Stopping unconditionally here also makes stop() a
    // no-op when no spinner is active (see agentRunSpinner.ts).
    spinner.stop();
    options.activityReporter?.(null);

    // Mid-stream tool-calls interrupt assistant text. Break onto a new
    // line when assistant text was just flushed in this same event
    // (streamedAssistantText is set by writeVisibleAssistantChunk via
    // renderWriter.flush, and reset right after the newline). This
    // ensures exactly ONE separator between a text segment and the first
    // tool that follows it. Subsequent buffered tool-calls (chunk="")
    // do not re-trigger the newline because streamedAssistantText is
    // already false — that was the source of the ~19 stray blank lines.
    // Note: `printedAssistantLabel` is intentionally excluded: it stays
    // true for the entire turn and would re-trigger "\n" on every call.
    if (event.type === "tool-call" && streamedAssistantText) {
      options.output.write("\n");
      streamedAssistantText = false;
    }

    // Write tree / compact content. For buffered tools (read/search/run/
    // fetch) the formatter accumulates internally and returns ""; the tree
    // is flushed later when a non-buffered tool arrives or at finish().
    if (chunk) {
      options.output.write(chunk);
    }

    // ── Post-write: start spinner for in-flight tool-calls ──────────
    if (
      toolDisplayMode === "compact" &&
      event.type === "tool-call"
    ) {
      const activeLabel = formatActiveToolLabel(event);
      spinner.show(activeLabel);
      options.activityReporter?.(activeLabel);
    }

    // Feed the docked run panel. `controlAgentRun` matters as much as
    // `startAgentRun` here: subscribing to the fork alone pinned the panel to
    // the run's first status, so it kept showing `running` for the rest of the
    // turn no matter what the polls reported.
    //
    // A `gone` run is forwarded as its `not_found` snapshot rather than as
    // `null`: the dock holds several runs at once now, so "the server has never
    // heard of run X" has to name X. Sending null would have wiped the panel —
    // including the sibling runs that are still very much alive.
    if (options.onAgentRunStatus) {
      const parsed = parseAgentRunEvent(event);
      if (parsed) {
        options.onAgentRunStatus(parsed.snapshot);
      }
    }
  };

  return {
    spinner,
    toolDisplayMode,
    traceLocalTools,
    eventMode,
    pushText(chunk: string) {
      // Buffered-class tools (read/search/run/fetch/webSearch) accumulate
      // their tree inside formatToolEvent and only flush when a non-buffered
      // tool arrives or at finish(). Without this, a turn that is all
      // read/search calls streams all text first and the tool tree pops in
      // at the very end. Flush the pending tree before each text delta so
      // tools and text stay interleaved in natural order.
      if (eventMode !== "jsonl" && formatToolEvent.flush) {
        const pendingToolOutput = formatToolEvent.flush();
        if (pendingToolOutput) {
          options.output.write(pendingToolOutput);
        }
      }
      writeVisibleAssistantChunk(chunk);
    },
    pushThinking(chunk: string) {
      // Thinking content scrolls live on the spinner line instead of
      // being written as separate output. The spinner shows a truncated
      // hint of what the model is currently reasoning about.
      spinner.setThinkingHint(chunk);
    },
    handleToolEvent,
    /** 记录一条 compaction 观测事件（TUI 在 turn 结束时渲染一行 dim 摘要）。 */
    recordCompaction(
      event: Extract<AgentExecutionObservationEvent, { kind: "compaction" }>,
    ) {
      compactionEvent = event;
    },
    showWorking(label?: string) {
      const activeLabel = label ?? workingLabel;
      spinner.show(activeLabel);
      options.activityReporter?.(activeLabel);
    },
    finish(fallbackContent?: string) {
      spinner.stop();
      options.activityReporter?.(null);
      // Flush any residual think-tag buffer.
      const flushedThink = flushThinkParser(thinkState);
      thinkState = flushedThink.state;
      if (flushedThink.content) {
        writeVisibleAssistantChunk(flushedThink.content);
      }
      const pendingToolOutput = formatToolEvent.flush ? formatToolEvent.flush() : "";
      if (pendingToolOutput) {
        options.output.write(pendingToolOutput);
      }
      if (streamedAssistantText) {
        renderWriter.flush();
        options.output.write("\n");
      } else if (everStreamedAnyText) {
        // Text was streamed earlier but reset by a tool-call event; the last
        // segment (if any) was already flushed. Don't re-render the full
        // result.content — that would duplicate the streamed output.
        options.output.write("\n");
      } else {
        const content = fallbackContent
          ? formatAssistantResponseForCli(fallbackContent.trim())
          : "";
        if (content) {
          options.output.write(`\n${options.agentName} > ${content}\n`);
        } else {
          options.output.write(`\n${options.agentName} > (no text response)\n`);
        }
      }
      // 压缩摘要行（dim，一行折叠展示）。无压缩事件 → 零输出。
      const compactionLine = formatCompactionSummaryLine(compactionEvent);
      if (compactionLine) {
        options.output.write(compactionLine);
      }
    },
  };
}

