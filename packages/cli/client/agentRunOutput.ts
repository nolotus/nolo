import type { LocalAgentToolEvent } from "../../agent-runtime/localLoop";
import type { AgentExecutionObservationEvent } from "../../agent-runtime/executionObservation";
import { createRenderAwareStreamWriter, formatAssistantDisplay, formatAssistantTextForCli } from "./assistantOutput";
import { STYLE } from "./inlineMarkdown";
import { createThinkParserState, processThinkChunk, flushThinkParser } from "../../agent-runtime/thinkTagParser";
import {
  createToolEventFormatter,
  formatConservativeActiveToolLabel,
} from "./toolOutput";
import { isLiveAgentRunObservation, parseAgentRunEvent } from "./agentRunSnapshot";
import { Spinner, formatElapsed, truncateThinkingHint } from "./agentRunSpinner";
import type { RunAgentTurnOptions } from "./agentRunTypes";
import { dimCliText } from "./terminalStyles";
import { t } from "../tui/i18n";
import { stripAnsi } from "../tui/tuiAnsi";

/**
 * 把一条 compaction 观测事件折叠成一行 dim 摘要（无压缩事件返回空串）。
 * 数字缺失时省略对应片段；savedTokens 缺失时只省略「省约」片段，不做
 * before-after 二次推导（契约：token 数字只来自事件字段，禁止重算）。
 * 输出示例：
 *   `已压缩上下文：生成历史摘要，省约 21k tokens`
 *   `自动上下文压缩失败：provider timeout，本轮以未压缩上下文继续。…`
 */
/**
 * Bare-CLI assistant identity label suffix: `<agentName> > `. The TUI is the
 * only consumer that suppresses this label (its history paints the single ◈
 * anchor instead); every other surface keeps the classic label.
 */
const IDENTITY_LABEL_SEPARATOR = " > ";

export const THINKING_PREVIEW_BUFFER_LIMIT = 512;
// Progress narration is intentionally allowed to be fairly long. Agent models
// often explain a plan in several sentences before the very next tool call;
// promoting that prose too early fragments the tool tree and recreates the
// noisy "text / tool / text / tool" stripe the TUI is trying to avoid.
const TUI_PROGRESS_BUFFER_LIMIT = 1200;

/**
 * Append a chunk of reasoning to the rolling preview buffer, keeping at most
 * the last `limit` characters (O(1) presentation-only buffer bound).
 */
export function appendThinkingPreview(
  current: string,
  chunk: string,
  limit: number = THINKING_PREVIEW_BUFFER_LIMIT,
): string {
  if (limit <= 0) return "";
  const combined = current + chunk;
  if (combined.length <= limit) return combined;
  return combined.slice(combined.length - limit);
}

export function formatCompactionSummaryLine(
  event: Extract<
    AgentExecutionObservationEvent,
    { kind: "compaction" }
  > | null,
): string {
  if (!event) return "";
  if (event.failed) {
    const reason = event.detail ? `：${event.detail}` : "";
    return `${STYLE.dim}自动上下文压缩失败${reason}，本轮以未压缩上下文继续。若反复出现可手动 /compact。${STYLE.reset}\n`;
  }
  if (event.skipped) {
    if (
      event.skipReason === "adapter-missing-summary-methods" ||
      event.skipReason === "load-summary-failed"
    ) {
      return `${STYLE.dim}自动上下文压缩不可用（${event.skipReason}），本轮不压缩。${STYLE.reset}\n`;
    }
    return "";
  }
  if (!event.summaryGenerated) return "";
  let detail = "生成历史摘要";
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

function shouldPromoteTuiNarration(text: string): boolean {
  if (text.length >= TUI_PROGRESS_BUFFER_LIMIT) return true;
  // Blank lines alone are not a durability signal. Agent models commonly emit
  // "I'll inspect this:\n\n" immediately before a tool call. Waiting for the
  // next event lets the tool call prove that segment was progress; finish()
  // still preserves it when it was actually the final answer.
  return /(^|\n)\s*(?:#{1,3}\s|```|[-*+]\s|\d+[.)]\s)/.test(text);
}

function narrationActivityLabel(text: string): string {
  const oneLine = stripAnsi(text).replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim();
  return truncateThinkingHint(oneLine, 60);
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

  const formatToolEvent = createToolEventFormatter(undefined, {
    tuiTrees: options.output.tuiTrees === true,
  });
  const eventMode = resolveAgentEventMode(options);
  const assistantLabelManaged = options.output.assistantLabelManaged === true;
  // TUI intentionally exposes no reasoning text or duration trace. Bare CLI
  // keeps the legacy explicit showThinking contract for compatibility.
  const showThinking = !assistantLabelManaged && options.showThinking !== false;

  let streamedAssistantText = false;
  let everStreamedAnyText = false;
  let printedAssistantLabel = false;
  let thinkState = createThinkParserState();
  let thinkingFirstAt: number | null = null;
  let thinkingPreview = "";

  const markThinkingDelta = (chunk: string) => {
    if (!showThinking) return;
    if (streamedAssistantText) return;

    if (thinkingFirstAt === null) {
      thinkingFirstAt = Date.now();
      thinkingPreview = "";
    }
    thinkingPreview = appendThinkingPreview(thinkingPreview, chunk);
    spinner.setThinkingHint(thinkingPreview);
    reportThinkingProgress();
  };

  const reportThinkingProgress = () => {
    if (!showThinking) return;
    const preview = truncateThinkingHint(thinkingPreview, 60);
    const label = preview
      ? t("thinkingActivePreview", preview)
      : t("thinkingActive");
    options.activityReporter?.(label);
  };

  const endThinkingPhase = () => {
    if (thinkingFirstAt === null) return;
    const seconds = Math.max(0, Math.round((Date.now() - thinkingFirstAt) / 1000));
    thinkingFirstAt = null;
    thinkingPreview = "";
    spinner.stop();
    options.activityReporter?.(null);
    if (seconds >= 1) {
      options.output.write(`${dimCliText(t("thinkingTraceLine", formatElapsed(seconds)))}\n`);
    }
  };

  let compactionEvent: Extract<
    AgentExecutionObservationEvent,
    { kind: "compaction" }
  > | null = null;

  const writeToolOutput = (chunk: string) => {
    if (!chunk) return;
    if (typeof options.output.writeToolBlock === "function") {
      if (!options.output.writeToolBlock(chunk)) formatToolEvent.reset?.();
    } else {
      options.output.write(chunk);
    }
  };

  const renderWriter = createRenderAwareStreamWriter({
    write: (chunk) => options.output.write(chunk),
  });

  // TUI-only narration gate. Short prose that is immediately followed by a
  // tool call is operational progress, not durable transcript content. It is
  // shown in the dock while current, then discarded when a tool starts. Final
  // prose and strongly structured/very long prose are promoted to transcript.
  let pendingTuiNarration = "";
  let tuiNarrationPromoted = false;

  const flushPendingTuiNarration = () => {
    if (!pendingTuiNarration) return;
    formatToolEvent.reset?.();
    renderWriter.push(pendingTuiNarration);
    pendingTuiNarration = "";
    tuiNarrationPromoted = true;
    streamedAssistantText = true;
    options.activityReporter?.(null);
  };

  const dropPendingTuiProgress = () => {
    pendingTuiNarration = "";
    tuiNarrationPromoted = false;
    options.activityReporter?.(null);
  };

  const writeVisibleAssistantChunk = (chunk: string) => {
    if (!chunk) return;
    if (!assistantLabelManaged) formatToolEvent.reset?.();
    const parsed = processThinkChunk(chunk, thinkState);
    thinkState = parsed.state;
    if (!parsed.content && !parsed.reasoning) return;
    if (parsed.reasoning) {
      markThinkingDelta(parsed.reasoning);
    }
    if (!parsed.content) return;
    endThinkingPhase();
    if (!printedAssistantLabel) {
      if (!assistantLabelManaged) {
        options.output.write(`\n${options.agentName}${IDENTITY_LABEL_SEPARATOR}`);
      }
      printedAssistantLabel = true;
    }
    everStreamedAnyText = true;

    if (assistantLabelManaged) {
      if (tuiNarrationPromoted) {
        renderWriter.push(parsed.content);
        streamedAssistantText = true;
        return;
      }
      pendingTuiNarration += parsed.content;
      if (shouldPromoteTuiNarration(pendingTuiNarration)) {
        flushPendingTuiNarration();
      } else {
        const label = narrationActivityLabel(pendingTuiNarration);
        if (label) options.activityReporter?.(label);
      }
      return;
    }

    streamedAssistantText = true;
    renderWriter.push(parsed.content);
  };

  const handleToolEvent = (event: LocalAgentToolEvent) => {
    if (eventMode === "jsonl") {
      const chunk = formatToolJsonEvent(event);
      options.output.write(chunk);
      if (options.onAgentRunStatus) {
        const parsed = parseAgentRunEvent(event);
        if (parsed) {
          options.onAgentRunStatus(parsed.snapshot);
        }
      }
      return;
    }

    if (event.type === "tool-call") {
      if (assistantLabelManaged && pendingTuiNarration) {
        dropPendingTuiProgress();
      }
      renderWriter.flush();
      formatToolEvent(event);
      endThinkingPhase();

      if (streamedAssistantText) {
        options.output.write("\n");
        streamedAssistantText = false;
      }
      if (assistantLabelManaged) tuiNarrationPromoted = false;

      const activeLabel = formatConservativeActiveToolLabel(event);
      spinner.show(activeLabel);
      options.activityReporter?.(activeLabel);
      return;
    }

    const parsedRunEvent = parseAgentRunEvent(event);
    if (options.onAgentRunStatus && parsedRunEvent) {
      options.onAgentRunStatus(parsedRunEvent.snapshot);
    }

    spinner.stop();
    options.activityReporter?.(null);

    if (isLiveAgentRunObservation(event, parsedRunEvent)) {
      formatToolEvent.consume?.(event);
      return;
    }

    const chunk = formatToolEvent(event);
    if (chunk) {
      writeToolOutput(chunk);
    }
  };

  return {
    spinner,
    eventMode,
    /**
     * Terminal cleanup for abort/error paths that never reach `finish()`.
     *
     * A user abort discards the transient TUI progress buffer: the user stopped
     * on purpose and the dock already showed that text as activity. A genuine
     * failure must not swallow prose that never got the chance to be *proven*
     * durable (only a following tool call proves "progress"), so it promotes the
     * pending buffer and flushes what was already promoted — otherwise a short
     * final answer followed by a transport error disappears from the transcript.
     */
    cancel(cleanup?: { preservePendingNarration?: boolean }) {
      if (assistantLabelManaged && cleanup?.preservePendingNarration) {
        flushPendingTuiNarration();
        if (streamedAssistantText) {
          renderWriter.flush();
          // Terminate the line like a normal turn end so the failure notice does
          // not run into the prose that was just rescued.
          options.output.write("\n");
        }
      }
      dropPendingTuiProgress();
    },
    pushText(chunk: string) {
      writeVisibleAssistantChunk(chunk);
    },
    pushThinking(chunk: string) {
      markThinkingDelta(chunk);
    },
    handleToolEvent,
    recordCompaction(
      event: Extract<AgentExecutionObservationEvent, { kind: "compaction" }>,
    ) {
      const significance = (
        e: Extract<AgentExecutionObservationEvent, { kind: "compaction" }>,
      ): number =>
        e.failed ? 4 : e.summaryGenerated ? 3 : e.compressed ? 2 : 1;
      if (!compactionEvent || significance(event) >= significance(compactionEvent)) {
        compactionEvent = event;
      }
    },
    showWorking(label?: string) {
      const activeLabel = label ?? workingLabel;
      spinner.show(activeLabel);
      options.activityReporter?.(activeLabel);
    },
    finish(fallbackContent?: string) {
      const flushedThink = flushThinkParser(thinkState);
      thinkState = flushedThink.state;
      if (flushedThink.content) {
        writeVisibleAssistantChunk(flushedThink.content);
      }
      if (assistantLabelManaged) flushPendingTuiNarration();
      endThinkingPhase();
      spinner.stop();
      options.activityReporter?.(null);
      if (streamedAssistantText) {
        renderWriter.flush();
        options.output.write("\n");
      } else if (everStreamedAnyText) {
        options.output.write("\n");
      } else {
        const content = fallbackContent
          ? formatAssistantResponseForCli(fallbackContent.trim())
          : "";
        if (content) {
          options.output.write(
            assistantLabelManaged
              ? `${content}\n`
              : `\n${options.agentName}${IDENTITY_LABEL_SEPARATOR}${content}\n`,
          );
        } else {
          options.output.write(
            assistantLabelManaged
              ? "(no text response)\n"
              : `\n${options.agentName}${IDENTITY_LABEL_SEPARATOR}(no text response)\n`,
          );
        }
      }
      const compactionLine = formatCompactionSummaryLine(compactionEvent);
      if (compactionLine) {
        options.output.write(compactionLine);
      }
    },
  };
}
