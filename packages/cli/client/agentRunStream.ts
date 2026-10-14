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
import { t } from "../tui/i18n";

/**
 * antigravity 上游拒绝模型生成的工具调用：finishReason 走
 * MALFORMED_FUNCTION_CALL，经 provider 变成 `LLM API error (502): {...}` 抛到
 * 这里（antigravityCloudCodeProvider.ts:295）。它不可重试也不该让用户去改凭证，
 * 但裸 message 是整段 provider JSON dump，所以按语义映射成可操作文案。
 */
export function isMalformedFunctionCallFailure(message: string): boolean {
  return message.includes("MALFORMED_FUNCTION_CALL");
}

/** 原始 JSON 细节只在既有 debug 开关下附加，与 agentRun.ts 的开关保持一致。 */
function shouldAppendStreamRawErrorDetail(
  env: RunAgentTurnOptions["env"],
): boolean {
  return env?.NOLO_DEBUG === "1" || env?.NOLO_CLI_DEBUG_DETAIL === "1";
}

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
  // The server's `done` frame is the protocol terminator: once it lands the
  // answer is complete, so a late abort must not be read as "discard in flight".
  let sawDone = false;

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
      sawDone = true;
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
    // Abort/transport failure bypasses finish(). A user stop drops the transient
    // TUI progress buffer; a real failure preserves whatever prose arrived, since
    // it may be the answer the user never got to see.
    turnOutput.cancel({
      preservePendingNarration: !options.abortSignal?.aborted,
    });
    if (options.abortSignal?.aborted) {
      // User-initiated stop; the server may still finish the dialog.
      return {
        exitCode: 0,
        ...(dialogId ? { dialogId } : {}),
        streamInterrupted: true,
      };
    }
    const message = toErrorMessage(error);
    // antigravity 502 MALFORMED_FUNCTION_CALL 的裸 message 是整段 provider
    // JSON dump（`LLM API error (502): {"error":{...}}`），对用户零信息量。
    // 先识别这类已知 provider failure，换成单行可操作文案；原始 JSON 只在既有
    // NOLO_DEBUG / NOLO_CLI_DEBUG_DETAIL 开关下附加（与 agentRun.ts 同款开关）。
    const malformedToolCall = isMalformedFunctionCallFailure(message);
    const rawDetail = shouldAppendStreamRawErrorDetail(options.env)
      ? t("agentRunStream.rawErrorDetail", message)
      : null;
    if (dialogId) {
      if (malformedToolCall) {
        // 前导 \n 与其余 catch 文案一致：非 TTY 下不与上一段输出粘成一行。
        options.output.write(`\n${t("agentRunStream.malformedToolCallRejected", dialogId)}\n`);
        if (rawDetail) options.output.write(rawDetail);
        return { exitCode: 0, dialogId, streamInterrupted: true };
      }
      options.output.write(t("agentRunStream.interruptedAfterDialog", dialogId, message));
      options.output.write(t("agentRunStream.mayStillFinishOnServer"));
      return { exitCode: 0, dialogId, streamInterrupted: true };
    }
    if (isClientVersionTooOldFailure(message, error)) {
      // 版本闸门拒绝：渲染含升级指引的可操作文案，而不是裸的
      // "Agent stream failed"。dialog 已建时仍走下方保留现场分支（闸门拒绝
      // 理论上发生在 dialog 创建前，这里只是防御）。
      options.output.write(`\n${describeClientVersionTooOldFailure(message, error)}`);
      return { exitCode: 1 };
    }
    if (malformedToolCall) {
      options.output.write(`\n${t("agentRunStream.malformedToolCallRejectedNoDialog")}\n`);
      if (rawDetail) options.output.write(rawDetail);
      return { exitCode: 1 };
    }
    // 未知错误：友好包裹 + 本地化，但保留原 message 便于排查。
    options.output.write(t("agentRunStream.failed", message));
    return { exitCode: 1 };
  }

  // Esc-to-stop cancels the reader, and a Web stream resolves the *pending*
  // read as EOF instead of throwing — so the loop above exits "normally" for a
  // user stop. Settling through finish() here would promote the transient TUI
  // progress text a stop is supposed to drop, so a stop takes the same exit as
  // the throwing abort branch in the catch above.
  if (options.abortSignal?.aborted && !sawDone) {
    turnOutput.spinner.stop();
    turnOutput.cancel();
    return {
      exitCode: 0,
      ...(dialogId ? { dialogId } : {}),
      streamInterrupted: true,
    };
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
    // 结论载体与 local / 非流式 HTTP 路径同契约：流式分支已经把 assistant
    // 正文累加在 content 里，不随行则 server 流式 run 的结算也拿不到结论。
    ...(content ? { finalText: content } : {}),
    turnTokens: buildTurnTokenUsage(usage, options.agentKey),
    ...(turnCredits !== undefined ? { turnCredits } : {}),
  };
}