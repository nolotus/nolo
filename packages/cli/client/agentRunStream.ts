import { toErrorMessage } from "core/errorMessage";
import {
  attachStreamFrameErrorFields,
  describeClientVersionTooOldFailure,
  isClientVersionTooOldFailure,
} from "./clientVersionTooOldFailure";
import { createSseToolEventAdapter } from "./toolOutput";
import {
  buildTurnTokenUsage,
  formatUsage,
  platformCreditsFromUsage,
  shouldShowUsage,
} from "./tokenUsage";
import { Spinner } from "./agentRunSpinner";
import { createCliTurnOutput } from "./agentRunOutput";
import type { RunAgentTurnOptions, RunAgentTurnResult } from "./agentRunTypes";

/**
 * 读取 agent run 的 SSE 流并渲染到终端。Esc-to-stop 兜底：
 * abortSignal 触发后立刻 cancel reader，让 reader.read() 循环不用等
 * 下一个 SSE chunk 到达就返回/抛错，避免"按 Esc 后仍要等一会"。
 */
export async function readStreamingAgentRun(
  options: RunAgentTurnOptions,
  res: Response,
  existingSpinner: Spinner | undefined,
): Promise<RunAgentTurnResult> {
  const reader = res.body?.getReader();
  if (!reader) {
    existingSpinner?.stop();
    options.output.write(
      "[nolo] Agent stream response did not include a readable body.\n",
    );
    return { exitCode: 1 };
  }

  // Esc-to-stop 的即时兜底：abortSignal 触发后立刻 cancel reader，
  // 让下面 reader.read() 循环不用等下一个 SSE chunk 到达就返回/抛错。
  // 否则用户按 Esc 后仍要等到上游推送下一条事件才会退出"等一会"。
  options.abortSignal?.addEventListener(
    "abort",
    () => {
      reader.cancel("user-stop").catch(() => {});
    },
    { once: true },
  );

  const decoder = new TextDecoder();
  const turnOutput = createCliTurnOutput({
    options,
    workingLabel: `${options.agentName} -> working`,
    spinner: existingSpinner,
  });

  const sseAdapter = createSseToolEventAdapter((evt) => {
    turnOutput.handleToolEvent(evt);
  });

  let buffer = "";
  let content = "";
  let dialogId: string | undefined;
  let usage: any;

  const handlePayload = (payload: any) => {
    if (typeof payload?.dialogId === "string" && payload.dialogId.trim()) {
      dialogId = payload.dialogId;
    }
    if (payload?.error || payload?.type === "error") {
      // 结构化字段透传（三层贯通第 2→3 层）：server 的版本闸门拒绝帧带
      // code + detail，挂到 Error 上供 describeClientVersionTooOldFailure /
      // describeLocalRunFailure 渲染可操作提示。其余错误帧不带这些字段，
      // 行为不变。
      throw attachStreamFrameErrorFields(
        new Error(String(payload.error || payload.message || "Agent stream failed")),
        payload,
      );
    }
    if (payload?.type === "done") {
      usage = payload.usage;
      return;
    }
    if (payload?.type === "dialog" || payload?.type === "status") {
      return;
    }
    if (payload?.type === "turn_warning") {
      // Silence turn_warning SSE events because their fallback/explanatory content
      // arrives as standard text events; displaying both would create noisy duplicate warnings.
      return;
    }
    if (payload?.type === "thinking") {
      const thinkChunk =
        typeof payload.content === "string"
          ? payload.content
          : typeof payload.chunk === "string"
            ? payload.chunk
            : "";
      if (thinkChunk) {
        turnOutput.pushThinking(thinkChunk);
      }
      return;
    }
    if (payload?.type === "tool_start") {
      sseAdapter.onToolStart(payload.calls ?? payload);
      return;
    }
    if (payload?.type === "tool_result") {
      sseAdapter.onToolResult(payload);
      return;
    }
    if (payload?.type === "tool_end") {
      sseAdapter.onToolEnd();
      turnOutput.showWorking();
      return;
    }
    const chunk =
      payload?.type === "text"
        ? payload.content
        : typeof payload?.chunk === "string"
          ? payload.chunk
          : "";
    if (!chunk) return;
    content += chunk;
    turnOutput.pushText(chunk);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const dataLines = event
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .filter(Boolean);
        for (const raw of dataLines) {
          handlePayload(JSON.parse(raw));
        }
      }
    }
    if (buffer.trim()) {
      const raw = buffer
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (raw) handlePayload(JSON.parse(raw));
    }
  } catch (error) {
    turnOutput.spinner.stop();
    if (options.abortSignal?.aborted) {
      // User-initiated stop; the server may still finish the dialog.
      return {
        exitCode: 0,
        ...(dialogId ? { dialogId } : {}),
        streamInterrupted: true,
      };
    }
    const message = toErrorMessage(error);
    if (dialogId) {
      options.output.write(
        `\n[nolo] Agent stream transport interrupted after dialog ${dialogId} was created: ${message}\n`,
      );
      options.output.write(
        "[nolo] The agent run may still finish on the server; read the dialog before retrying.\n",
      );
      return { exitCode: 0, dialogId, streamInterrupted: true };
    }
    if (isClientVersionTooOldFailure(message, error)) {
      // 版本闸门拒绝：渲染含升级指引的可操作文案，而不是裸的
      // "Agent stream failed"。dialog 已建时仍走下方保留现场分支（闸门拒绝
      // 理论上发生在 dialog 创建前，这里只是防御）。
      options.output.write(`\n${describeClientVersionTooOldFailure(message, error)}`);
      return { exitCode: 1 };
    }
    options.output.write(`\n[nolo] Agent stream failed: ${message}\n`);
    return { exitCode: 1 };
  }

  turnOutput.finish(content);
  const usageText = formatUsage(usage, dialogId);
  if (usageText && shouldShowUsage(options.env))
    options.output.write(`${usageText}\n`);
  // server 派发的 done 帧里，cost 已由 runBilling 汇总成整个 run 的总额，
  // 不像本地 loop 需要逐次相加。
  const turnCredits = platformCreditsFromUsage(usage);
  return {
    exitCode: 0,
    ...(dialogId ? { dialogId } : {}),
    turnTokens: buildTurnTokenUsage(usage, options.agentKey),
    ...(turnCredits !== undefined ? { turnCredits } : {}),
  };
}