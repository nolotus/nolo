/**
 * 单个工具调用事务（localLoop 拆分第二批）。
 *
 * 承载 runLocalAgentTurn 主循环中「执行一个 tool_call」的完整事务：
 *   参数截断无损补全 / 毒丸诊断 → 写文件会话确认门 → adapter.executeTool
 *   （abort/timeout 级联）→ action gate → tool-start/tool-end 观测事件与
 *   legacy onToolEvent 桥接 → 错误转工具结果。
 *
 * 循环侧（localLoop.ts）只保留状态机决策：推入 tool 消息、
 * executedToolResults 累计与 progressGuard 熔断。
 *
 * 行为契约：全部逻辑从 localLoop.ts 逐字迁入，运行行为零变化。
 */
import { clipCompactText } from "core/clipCompactText";
import { toErrorMessage } from "core/errorMessage";
import { runAbortableWithTimeout } from "./abortableKernel";
import type { LocalLoopObservationBoundary } from "./observationStream";
import type { LocalLoopTiming } from "./loopTiming";
import type { LocalAgentToolEvent } from "./localLoopContract";
import type {
  AgentRuntimeHostAdapter,
  AgentRuntimeToolResult,
} from "./hostAdapter";
import { readActionGate, readCommandActionGatePayload } from "./actionGate";
import { evaluateFileWritePolicy } from "./fileWritePolicy";
import type { AgentRuntimeToolCall } from "./types";
import { hasParsableObjectArguments, repairTruncatedToolArguments } from "./outboundHistorySanitize";
import { summarizeToolArguments } from "./summarizeToolArguments";
import { buildToolArgumentsFingerprint } from "./toolArgumentsFingerprint";
import type { AgentExecutionObservationEvent } from "./executionObservation";
import type { LocalAgentActionGate, LocalAgentTurnInput } from "./localLoop";
import { unwrapToolArguments } from "./inboundCredentialVault";
import { isCommandExecutingTool } from "./localToolPolicy";

type LocalAgentLoopEvent = AgentExecutionObservationEvent;

export const LOCAL_TURN_ABORTED_CODE = "LOCAL_TURN_ABORTED";

export function buildAbortedError(): Error & { code?: string } {
  const error = new Error("local agent turn aborted by user") as Error & {
    code?: string;
  };
  error.code = LOCAL_TURN_ABORTED_CODE;
  return error;
}

export function throwIfAborted(input: LocalAgentTurnInput) {
  if (input.abortSignal?.aborted) throw buildAbortedError();
}

export async function runAbortableToolTask<T>(
  input: LocalAgentTurnInput,
  task: Promise<T>,
  pendingToolName?: string,
): Promise<T> {
  if (!input.abortSignal) return task;
  const outcome = await runAbortableWithTimeout({
    task,
    abortSignal: input.abortSignal,
    runtime: input.effectRuntime,
  });
  if (outcome.kind === "done") return outcome.value;
  if (outcome.kind === "failed") throw outcome.error;
  if (outcome.kind === "aborted") {
    const error = buildAbortedError() as Error & { pendingToolName?: string };
    if (pendingToolName) error.pendingToolName = pendingToolName;
    throw error;
  }
  // timeout outcome is impossible without timeoutMs
  throw buildAbortedError();
}

function formatToolExecutionError(args: {
  toolName: string;
  error: unknown;
}) {
  const message = toErrorMessage(args.error);
  return `${args.toolName} failed: ${message}`;
}

function formatStructuredToolExecutionError(args: {
  toolName: string;
  error: unknown;
}) {
  if (!args.error || typeof args.error !== "object") return null;
  const error = args.error as {
    code?: unknown;
    message?: unknown;
    policy?: unknown;
    permissionRequest?: unknown;
  };
  if (typeof error.code !== "string") return null;
  return JSON.stringify({
    error: error.code,
    message:
      typeof error.message === "string"
        ? error.message
        : formatToolExecutionError(args),
    ...(error.policy && typeof error.policy === "object"
      ? { policy: error.policy }
      : {}),
    ...(error.permissionRequest && typeof error.permissionRequest === "object"
      ? { permissionRequest: error.permissionRequest }
      : {}),
  });
}

function shouldReturnToolExecutionErrors(adapter: AgentRuntimeHostAdapter) {
  return adapter.capabilities.includes("local-tools");
}

/**
 * Canonical observation event 唯一出口（收敛经由 observationBoundary 发射）。
 *
 * - 发送给 Queue/Stream（当 Stream 被监听时）形成单一真相源。
 * - 自动单向投影给 legacy 回调（onLoopEvent / onToolEvent 等，fail-open）。
 * - 纯净分离：bridge 不再混入 canonical event 对象，杜绝 onLoopEvent payload 污染。
 */
export function emitLoopEvent(
  boundary: LocalLoopObservationBoundary,
  event: LocalAgentLoopEvent,
  bridge?: LocalAgentToolEvent,
) {
  boundary.emit(bridge ? { event, bridge } : { event });
}

function clip(value: string, max = 240) {
  return clipCompactText(value, max);
}

/**
 * 提取安全观测 metadata：只保留结构化标量（exitCode / command / path / lineCount 等），
 * 并且对字符串字段做最大长度裁剪（<= 240 字符），绝不透传未经裁剪的原始 tool payload / 敏感 token / 内部对象。
 */
function projectSafeToolObservationMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const safe: Record<string, unknown> = {};
  if (typeof metadata.exitCode === "number") safe.exitCode = metadata.exitCode;
  if (typeof metadata.actionGate === "string") safe.actionGate = clip(metadata.actionGate, 240);
  if (typeof metadata.command === "string") safe.command = clip(metadata.command, 240);
  if (typeof metadata.path === "string") safe.path = clip(metadata.path, 240);
  if (typeof metadata.truncated === "boolean") safe.truncated = metadata.truncated;
  if (typeof metadata.byteCount === "number") safe.byteCount = metadata.byteCount;
  if (typeof metadata.lineCount === "number") safe.lineCount = metadata.lineCount;
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function summarizeToolResult(content: unknown, metadata?: Record<string, unknown>) {
  const parts: string[] = [];
  const exitCode = metadata?.exitCode;
  if (typeof exitCode === "number") parts.push(`exit=${exitCode}`);
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed) {
      const lines = trimmed.split(/\r?\n/).length;
      parts.push(`${lines} line${lines === 1 ? "" : "s"}`);
      parts.push(`${trimmed.length} chars`);
      const tail = clip(trimmed.slice(-160), 160);
      if (tail) parts.push(`tail="${tail}"`);
    } else {
      parts.push("empty");
    }
  }
  return parts.join(" ");
}

function buildActionGate(args: {
  toolName: string;
  toolCallId: string;
  metadata?: Record<string, unknown>;
}): LocalAgentActionGate | null {
  const gate = readActionGate(args.metadata?.actionGate);
  if (!gate) return null;
  if (gate.kind === "handoff" && !readCommandActionGatePayload(gate.payload)) return null;
  return {
    ...gate,
    toolName: args.toolName,
    toolCallId: args.toolCallId,
  };
}

function isCompletedActionGateResult(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { status?: unknown }).status === "completed",
  );
}

const fileWriteSessionApproval = new WeakMap<object, { approved: boolean }>();
const fileWriteSessionKeys = new Map<string, object>();

function getFileWriteSessionApproval(input: LocalAgentTurnInput): { approved: boolean } {
  if (input.fileWriteSessionId) {
    let key = fileWriteSessionKeys.get(input.fileWriteSessionId);
    if (!key) {
      key = {};
      fileWriteSessionKeys.set(input.fileWriteSessionId, key);
    }
    const existing = fileWriteSessionApproval.get(key);
    if (existing) return existing;
    const created = { approved: false };
    fileWriteSessionApproval.set(key, created);
    return created;
  }
  const key = input.adapter as unknown as object;
  const existing = fileWriteSessionApproval.get(key);
  if (existing) return existing;
  const created = { approved: false };
  fileWriteSessionApproval.set(key, created);
  return created;
}

function readToolPathForWriteGate(argumentsValue: string): string {
  try {
    const parsed = JSON.parse(argumentsValue) as Record<string, unknown>;
    return typeof parsed.path === "string" && parsed.path.trim()
      ? parsed.path.trim()
      : "the requested file";
  } catch {
    return "the requested file";
  }
}

/** executeToolCall 的返回值：工具结果 + 工具本体执行耗时（gate 等待不计入）。 */
export type ToolCallTransactionResult = {
  toolResult: AgentRuntimeToolResult;
  toolExecMs: number | undefined;
};

/**
 * 执行单个 tool_call 的完整事务。行为与拆分前 localLoop 内联实现逐字节一致：
 *
 * - 入口先 throwIfAborted（循环每轮/每工具的取消检查在调用方，这里保留工具级检查）；
 * - tool-start 事件（含 argumentsPreview / argumentsFingerprint）唯一 canonical
 *   出口，桥接 legacy onToolEvent；fingerprint 刻意在截断补全之前计算；
 * - 毒丸参数：先试内容零损失尾补全，补全不成立抛显式诊断走统一 tool-error 路径；
 * - 写文件会话确认门（模块级 WeakMap/Map 会话态，fail-safe 默认开启）；
 * - adapter.executeTool 经 runAbortableToolTask 级联 abort；
 * - 工具结果 metadata 上的 actionGate 询问（如危险命令确认）；
 * - tool-end 事件（ok / summary / 安全裁剪 metadata）；异常路径 tool-end(ok:false)
 *   + tool-error 桥接；abort 错误原样上抛，其余按宿主能力转工具结果或上抛。
 */
export async function executeToolCall(args: {
  input: LocalAgentTurnInput;
  toolCall: AgentRuntimeToolCall;
  round: number;
  boundary: LocalLoopObservationBoundary;
  loopTiming: LocalLoopTiming;
  userInputText: string;
  runToolNames?: string[];
}): Promise<ToolCallTransactionResult> {
  const { input, toolCall, round, boundary, loopTiming, userInputText } = args;
  throwIfAborted(input);
  const toolName = toolCall.function.name;
  let toolResult: AgentRuntimeToolResult | undefined;
  /**
   * 工具本体执行耗时（ms）。只包住 adapter.executeTool 这一段，**不含**
   * action gate 的人工确认等待——否则被门控的工具会记成用户的思考时间。
   * 流内已执行（result 已填充）与被 gate 取消的分支不产生该值。
   *
   * 为什么要记：历史里 11.3% 的轮次带多个工具、总计约 20% 的工具调用本可
   * 并行，但 tool metadata 从来没记过耗时，导致「轮内并行值不值得做」这个
   * 决定一直是瞎的（快工具 15–45ms 的话只省 ~1.8s/300 次，慢命令则可能是
   * 分钟级）。先把数据攒起来，再谈要不要并行。
   */
  let toolExecMs: number | undefined;
  const startedAt = Date.now();
  loopTiming.mark("toolCallStart", round);
  const argumentsPreview = summarizeToolArguments(toolName, toolCall.function.arguments);
  // Identity of the arguments AS EMITTED by the model. Deliberately
  // computed before the truncated-argument repair below rewrites
  // `toolCall.function.arguments`: the fingerprint means "the same payload
  // was emitted again", which is the repeat we care about detecting.
  // The one consequence is that the same logical call emitted once intact
  // and once truncated gets two identities — a missed repeat, never a
  // false one.
  const argumentsFingerprint = buildToolArgumentsFingerprint(toolCall.function.arguments);
  // 唯一 canonical 出口：emitLoopEvent 发 tool-start，并桥接投影给 legacy onToolEvent。
  emitLoopEvent(
    boundary,
    {
      kind: "tool-start",
      round,
      toolCallId: toolCall.id,
      toolName,
      atMs: startedAt,
      ...(argumentsPreview ? { argumentsPreview } : {}),
      ...(argumentsFingerprint ? { argumentsFingerprint } : {}),
    },
    {
      type: "tool-call",
      round,
      toolCallId: toolCall.id,
      toolName,
      ...(argumentsPreview ? { argumentsPreview } : {}),
    },
  );
  try {
    // 毒丸参数拦截（配合发送 seam 的 downgradeUnparsableToolCalls）：
    // arguments 非空 string 但 JSON.parse 失败（典型成因：上游流式截断，
    // 如 GLM 并行 tool_call 丢结尾 `"}]}`）时，执行器只能拿到空对象并
    // 误报"缺少 xxx 参数"（参数明明生成了），模型无法自纠。这里提前抛出
    // 明确诊断，走统一 tool-error 路径，tool result 直接指示重新调用。
    const rawPoisonArguments = toolCall.function?.arguments;
    if (
      typeof rawPoisonArguments === "string" &&
      rawPoisonArguments.trim() !== "" &&
      !hasParsableObjectArguments(rawPoisonArguments)
    ) {
      // 先尝试「内容零损失」的尾补全（只补 `}`/`]`，见 repairTruncatedToolArguments）：
      // 上游丢尾且截断点落在字符串外时无需再让模型重试一轮；补全不成立才走显式报错。
      const repairedArguments =
        repairTruncatedToolArguments(rawPoisonArguments);
      if (repairedArguments) {
        console.log(
          `[tool-args-repair] ${toolName}: 补全被截断的 arguments（${rawPoisonArguments.length} → ${repairedArguments.length} 字符，内容零损失）`,
        );
        toolCall.function.arguments = repairedArguments;
      } else {
        throw new Error(
          `模型生成的 tool_call arguments 不是合法 JSON（疑似上游流式截断，原始长度 ${rawPoisonArguments.length}）。请重新完整调用 ${toolName}，确保 arguments 是闭合的 JSON 对象；若因参数过长被截断，先精简参数（不要内嵌 diff/日志等大段文本，改传路径让对方自行读取）再重试。`,
        );
      }
    }
    const writeTool = toolName === "writeFile" || toolName === "editFile";
    // Only interactive hosts can approve the session gate. Headless/background
    // runs retain the pre-gate behavior and execute writes directly.
    // `fileWriteGateEnabled === false` is the explicit escape hatch
    // (NOLO_CLI_WRITE_GATE=off, resolved by the CLI); any other value,
    // including undefined, keeps the gate active — fail-safe default.
    if (writeTool && input.onActionGate && input.fileWriteGateEnabled !== false) {
      const writeSession = getFileWriteSessionApproval(input);
      const policy = evaluateFileWritePolicy({
        tool: toolName,
        path: readToolPathForWriteGate(toolCall.function.arguments),
        sessionApproved: writeSession.approved,
      });
      if (policy.permissionDecision === "ask") {
        const gate: LocalAgentActionGate = {
          ...policy.permissionRequest,
          id: `${policy.permissionRequest.id}-${toolCall.id}`,
          kind: "confirm",
          toolName,
          toolCallId: toolCall.id,
        };
        const replacement = await runAbortableToolTask(
          input,
          input.onActionGate(gate),
          `${toolName} confirmation`,
        );
        const gateResult = replacement?.metadata?.actionGateResult;
        if (
          replacement !== undefined &&
          isCompletedActionGateResult(gateResult)
        ) {
          writeSession.approved = true;
        } else {
          toolResult = replacement ?? {
            content: `${toolName} cancelled: user declined file write confirmation.`,
            metadata: {
              cancelled: true,
              actionGateResult: { gateId: gate.id, status: "cancelled" },
            },
          };
        }
      }
    }
    if (!toolResult) {
      const rawArguments = toolCall.function.arguments;
      let unwrappedArguments = rawArguments;

      if (
        typeof rawArguments === "string" &&
        rawArguments.includes("$nolo_cred:") &&
        input.adapter.credentialBroker
      ) {
        // [Security F1] 任何能执行命令的工具都不许在命令行里展明文：间接注入
        // 只要能把 `$nolo_cred:` 塞进命令行，就能借 broker 的手把密钥送到任意
        // 目标。判据与派发器共用同一套归一化（见 isCommandExecutingTool）。
        if (isCommandExecutingTool(toolName)) {
          throw new Error(
            `[security] 拒绝在 ${toolName} 命令行中直接解包凭证引用 ($nolo_cred:)，以防御提示词注入外泄风险。请使用受控认证通道。`,
          );
        }
        unwrappedArguments = await unwrapToolArguments(rawArguments, input.adapter.credentialBroker);
      }

      const executePromise = input.adapter.executeTool({
        id: toolCall.id,
        name: toolName,
        arguments: unwrappedArguments,
        ...(userInputText ? { userInput: userInputText } : {}),
        ...(input.runtimeContext
          ? { runtimeContext: input.runtimeContext }
          : {}),
        ...(args.runToolNames
          ? { runToolNames: args.runToolNames }
          : {}),
        ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
      }, {
        ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
        ...(input.runtimeContext
          ? { runtimeContext: input.runtimeContext }
          : {}),
      });
      const execStartedAtMs = Date.now();
      toolResult = await runAbortableToolTask(input, executePromise, toolName);
      toolExecMs = Date.now() - execStartedAtMs;
    }
    const actionGate = buildActionGate({
      toolName,
      toolCallId: toolCall.id,
      metadata: toolResult.metadata,
    });
    if (actionGate && input.onActionGate) {
      const replacement = await runAbortableToolTask(input, input.onActionGate(actionGate), `${toolName} action gate`);
      if (replacement) {
        // truthy 检查不剔除 void（TS 窄化规则），这里断言回工具结果类型；
        // 运行时 truthy 即真实对象，与拆分前隐式 any 行为一致。
        toolResult = replacement as AgentRuntimeToolResult;
      }
    }
    const finishedAt = Date.now();
    const summary = summarizeToolResult(toolResult.content, toolResult.metadata);
    const safeMetadata = projectSafeToolObservationMetadata(toolResult.metadata);
    loopTiming.mark("toolExecute", round);
    emitLoopEvent(
      boundary,
      {
        kind: "tool-end",
        round,
        toolCallId: toolCall.id,
        toolName,
        atMs: finishedAt,
        ok: toolResult.metadata?.cancelled !== true &&
          (toolResult.metadata?.actionGateResult as { status?: unknown } | undefined)?.status !== "cancelled" &&
          (toolResult.metadata?.actionGateResult as { status?: unknown } | undefined)?.status !== "failed",
        elapsedMs: Math.max(0, finishedAt - startedAt),
        ...(summary ? { summary } : {}),
        ...(safeMetadata ? { metadata: safeMetadata } : {}),
      },
      {
        type: "tool-result",
        round,
        toolCallId: toolCall.id,
        toolName,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        ...(summary ? { summary } : {}),
        ...(typeof toolResult.content === "string"
          ? { content: toolResult.content }
          : {}),
        metadata: toolResult.metadata,
      },
    );
  } catch (error) {
    const finishedAt = Date.now();
    emitLoopEvent(
      boundary,
      {
        kind: "tool-end",
        round,
        toolCallId: toolCall.id,
        toolName,
        atMs: finishedAt,
        ok: false,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        errorMessage: toErrorMessage(error),
      },
      {
        type: "tool-error",
        round,
        toolCallId: toolCall.id,
        toolName,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        message: toErrorMessage(error),
      },
    );
    // abort 优先：race 赢后必须原样上抛（error 上带 pendingToolName），
    // 不能被 shouldReturnToolExecutionErrors 转成 tool result 吞掉。
    if (
      error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === LOCAL_TURN_ABORTED_CODE
    ) {
      throw error;
    }
    if (!shouldReturnToolExecutionErrors(input.adapter)) throw error;
    toolResult = {
      content:
        formatStructuredToolExecutionError({ toolName, error }) ??
        formatToolExecutionError({ toolName, error }),
      metadata: {
        error: true,
        toolName,
        message: toErrorMessage(error),
        ...(
          error &&
          typeof error === "object" &&
          typeof (error as { code?: unknown }).code === "string"
            ? { code: (error as { code: string }).code }
            : {}
        ),
      },
    };
  }
  return { toolResult: toolResult!, toolExecMs };
}
