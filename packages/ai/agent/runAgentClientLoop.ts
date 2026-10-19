// packages/ai/agent/runAgentClientLoop.ts
//
// 客户端多轮 Agent 循环：复现服务端 runAgentLoop 的逻辑
// - 出站 wire 由 generateRequestBody 决定（chat.completions 或 Responses）；
//   本 loop 的解析与多轮累积都按**同一条 wire**走（见 parseCompletionByOutboundWire）
// - 工具执行通过 executeToolCall 在客户端完成
// - 每轮：调 LLM → 有 tool_calls → 执行工具 → 追加 tool 消息 → 继续

import type { RootState } from "app/store";
import { Agent, Message } from "app/types";
import { read } from "database/dbSlice";
import { fetchAgentContexts } from "ai/agent/fetchAgentContexts";
import { generateRequestBody } from "ai/llm/generateRequestBody";
import { mergeReferences } from "./referenceUtils";
import { getApiEndpoint } from "ai/llm/providers";
import { selectCurrentServer } from "app/settings/serverSelectors";
import { selectIdentityToken } from "identity/selectors";
import { performFetchRequest } from "ai/chat/fetchUtils";
import { sanitizeOutboundBody } from "ai/chat/toolCallArgumentGuard";
import { executeToolCall } from "ai/agent/executeToolCall";
import { extractCustomId } from "core/prefix";
import { updateAgentTokens } from "./updateAgentTokens";
import {
  recordConsecutiveToolFailure,
  type ToolFailureGuardState,
} from "ai/agent/toolFailureGuard";
import {
  resolveAgentCallPlan,
  resolveClientWire,
} from "agent-runtime/agentCallPlan";
import { responsesJsonToChatCompletions } from "integrations/openai/responsesJsonToChatCompletions";
import { convertMessagesToResponsesInput } from "integrations/openai/responsesHelpers";

/**
 * 按**本次实际发出的 wire** 解析非流式回包（与出站构造同源）。
 *
 * 出站形状由 `generateRequestBody` 决定：它用
 * `resolveClientWire(resolveAgentCallPlan(agentConfig))`（见
 * generateRequestBody.ts :155-157）选 Responses 形状（body.input）或 chat 形状
 * （body.messages）。解析必须用**同一个判定**——Responses wire 的回包是原生
 * Responses JSON（`object:"response"` / `output:[…]`），只认 `choices[0]` 就会把
 * 「模型确实回了内容」误判成空响应（2026-10-13 事故）。
 *
 * 为什么不用 resolveChatWire：它对 codex-OAuth（DB 实存形状
 * `provider:"openai" + apiKeyRef:"chatgpt"`）返回 "responses"，但该 agent 实际发出的
 * 是 chat.completions（oauth:chatgpt 由服务端 codex 翻译器转换，回包是 choices 形状，
 * 见 providerRoutingContract.test.ts 的 INTENDED EXCEPTION 与 chatCodexOAuth.ts）。
 * 用它会把 chat 回包当 Responses 解析。两者在其余 wire 上一致。
 *
 * Responses wire：复用服务端**同一份**转换真值 `responsesJsonToChatCompletions`
 * （绝不复制第二份实现）。它返回 null（error 帧 / status 非 completed / 缺 output /
 * 已是 chat 形状）时本函数返回 null，由调用方走既有错误路径报错，绝不静默当成功。
 */
const parseCompletionByOutboundWire = (
  raw: unknown,
  agentConfig: Agent
): { chatJson: any; responsesWire: boolean } => {
  const responsesWire =
    resolveClientWire(resolveAgentCallPlan(agentConfig as any)) === "responses";
  if (!responsesWire) return { chatJson: raw, responsesWire };
  return { chatJson: responsesJsonToChatCompletions(raw), responsesWire };
};

/** 回包形状线索（只用于排障信息，不参与判定）。 */
const describeResponseShape = (raw: unknown): string => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return `type=${Array.isArray(raw) ? "array" : typeof raw}`;
  }
  const record = raw as Record<string, unknown>;
  return [
    `object=${typeof record.object === "string" ? record.object : "-"}`,
    `status=${typeof record.status === "string" ? record.status : "-"}`,
    `output=${Array.isArray(record.output) ? "array" : typeof record.output}`,
    `choices=${Array.isArray(record.choices) ? "array" : typeof record.choices}`,
    `keys=${Object.keys(record).slice(0, 8).join("|")}`,
  ].join(" ");
};

export interface RunAgentClientLoopArgs {
  agentKey: string;
  content: any;
  parentMessageId?: string;
  billingDialogKey?: string;
  extraReferences?: import("app/types").ReferenceItem[];
}

export interface RunAgentClientLoopResult {
  content: string;
  toolCallCount: number;
}

/**
 * 客户端多轮 Agent 执行循环。
 *
 * 使用场景：startAgentRun（同步 wait:true）的 client 模式、runAgent thunk。
 * 不适合需要流式输出的场景（请用 runStreamingAgent）。
 */
export async function runAgentClientLoop(
  args: RunAgentClientLoopArgs,
  thunkApi: any
): Promise<RunAgentClientLoopResult> {
  const { agentKey, content, parentMessageId, billingDialogKey } = args;
  const { getState, dispatch } = thunkApi;
  const state = getState() as RootState;

  // 1. 加载 Agent 配置
  const agentConfig = await dispatch(read({ dbKey: agentKey })).unwrap();

  // 2. 加载 Agent 上下文（知识库 / references）
  const agentContexts = await fetchAgentContexts(
    mergeReferences(agentConfig.references, args.extraReferences),
    dispatch
  );

  // 3. 构造首轮 body（generateRequestBody 会注入 system prompt）。
  //
  // 本 loop 明确走**无状态** Responses：显式传 `responsesState: null`，即使 agent 上带
  // 旧 `responsesState` 或 `previous_response_id` 也一律不采用 ——
  // generateResponseRequestBody 只在 responsesState 为 `undefined` 时才回落到这两个
  // 来源（:64-70 的 typed state、:119-126 的旧显式 seam），显式 null 让两条路都关闭。
  // 为什么必须无状态：带旧 response id 续轮时它只发 continuation（最近 assistant 之后
  // 的消息，见 selectResponsesContinuationMessages），而本 loop 每轮都在本地累积新的
  // assistant 工具调用 —— 第二轮就会变成「旧 ID + 孤立 function_call_output」：既没有
  // 产生该工具调用的新 response，也没有对应的 function_call，上游无法继续该工具轮次。
  // 无状态 + 每轮完整回放（用户消息 + assistant function_call + function_call_output）
  // 语义自洽，也正是无状态 wire（平台 DeepSeek Responses）已在走的形状；原生 stateful
  // 续轮的对齐留作后续事项（见事故文档遗留项）。
  const initialMessages: Message[] = [{ role: "user", content }];
  const body = generateRequestBody({
    agentConfig,
    messages: initialMessages,
    userInput: typeof content === "string" ? content : JSON.stringify(content),
    contexts: agentContexts,
    responsesState: null,
  });
  body.stream = false; // 多轮模式不用流式

  // body.messages 包含 system 消息 + 用户消息，后续累积 tool 结果入此数组。
  // Responses wire 的 body 只有 input/instructions（见 generateRequestBody :155-164），
  // 没有 messages：本地起一个累积数组（首轮 = 用户消息），回写目标见循环内的 wire 分支。
  const chatWireMessages = Array.isArray(body.messages)
    ? (body.messages as Message[])
    : null;
  const messages: Message[] = chatWireMessages ?? [...initialMessages];

  const api = getApiEndpoint(agentConfig);
  const currentServer = selectCurrentServer(state);
  const token = selectIdentityToken(state) ?? "";

  let finalContent = "";
  let toolCallCount = 0;
  const toolFailureGuard: ToolFailureGuardState = {
    signature: null,
    count: 0,
  };

  // 4. 多轮循环
  loop:
  for (;;) {
    // 把累积的 assistant / tool 消息回写到**本 wire 自己的会话字段**：
    // - chat wire（body.messages）：沿用既有行为，messages 原样回写；
    // - Responses wire（body.input）：本 loop 无状态（首轮已传 responsesState:null），
    //   每轮用既有真值 convertMessagesToResponsesInput **完整回放**累积消息
    //   （用户消息 + assistant function_call + function_call_output）。不回写就会让
    //   工具结果永远发不回上游 → 同一工具调用无限重复。
    //   绝不发 continuation / 旧 previous_response_id：旧 ID 配本地新工具调用会构成
    //   「旧 ID + 孤立 function_call_output」（见首轮构造处注释）。这里防御性删除，
    //   即使 body 被别的路径塞了旧 ID 也一并不发。
    // 绝不把 messages 掺进 Responses body：body 形状本身就是服务端 wire 判据
    // （chatHandler 的 Array.isArray(body.input)），掺进去会改变上游收到的 wire。
    if (chatWireMessages) {
      body.messages = messages;
    } else if (Array.isArray(body.input)) {
      delete body.previous_response_id;
      body.input = convertMessagesToResponsesInput(messages);
    }

    // 防护 B：出站清洗。多轮累积的 messages 里可能含被截断的 tool_calls
    // 或孤立代理字符/残缺 hex 转义，provider 会直接拒绝。发送前对纯文本
    // content 与 tool_calls 做清洗，避免 UPSTREAM_400。
    // 守卫：仅当 body 含 messages 数组时才注入清洗结果，避免注入空 messages。
    const sanitizedBody = sanitizeOutboundBody(body);

    const response = await performFetchRequest({
      agentConfig,
      api,
      bodyData: sanitizedBody as any,
      currentServer,
      token,
      dialogId: billingDialogKey
        ? extractCustomId(billingDialogKey) || undefined
        : undefined,
    });

    const rawData = await response.json();
    // 按本次实际发出的 wire 解析回包（同源判定见 parseCompletionByOutboundWire）。
    const { chatJson: data, responsesWire } = parseCompletionByOutboundWire(
      rawData,
      agentConfig
    );

    // 计费读数：转换成功用归一后的 usage（保留上游全部字段 + chat 别名）；
    // 转换失败（null）时沿用既有行为读原样回包，不回退本轮之前的计费。
    const usageSource = data ?? rawData;

    if (billingDialogKey && usageSource?.usage) {
      await updateAgentTokens(
        {
          dialogId: extractCustomId(billingDialogKey),
          dialogKey: billingDialogKey,
          usage: usageSource.usage,
          agentConfig,
        },
        thunkApi
      );
    }

    if (responsesWire && !data) {
      console.warn(
        `[runAgentClientLoop] Responses wire 回包无法归一成 chat 形状（error 帧 / status 非 completed / 缺 output），停止：${describeResponseShape(rawData)}`
      );
      break;
    }

    const choice = data?.choices?.[0];

    if (!choice) {
      console.warn(
        `[runAgentClientLoop] 响应中找不到 choices[0]，停止：${describeResponseShape(data)}`
      );
      break;
    }

    const assistantMsg = choice.message;
    const finishReason: string = choice.finish_reason ?? "";

    // 追加 assistant 消息
    messages.push(assistantMsg);

    // 记录文本内容
    if (typeof assistantMsg.content === "string" && assistantMsg.content) {
      finalContent = assistantMsg.content;
    }

    // 无工具调用 or 模型明确 stop → 结束
    if (!assistantMsg.tool_calls?.length || finishReason === "stop") {
      break;
    }

    // 5. 执行工具调用
    for (const tc of assistantMsg.tool_calls) {
      toolCallCount++;
      const toolStartTime = Date.now();
      const toolResultContent = await executeToolCall(tc, thunkApi, {
        parentMessageId,
        agentKey,
      });
      const toolExecutionMs = Date.now() - toolStartTime;
      if (typeof process !== "undefined" ? process.env?.NOLO_CACHE_OPT_DEBUG : false) {
        console.log(`[cache-opt] toolExecutionMs=${toolExecutionMs}`);
      }

      const stopReason = recordConsecutiveToolFailure(
        toolFailureGuard,
        tc,
        toolResultContent
      );
      if (stopReason) {
        finalContent = stopReason;
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResultContent,
        } as any);
        break loop;
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: toolResultContent,
      } as any);
    }
  }

  return { content: finalContent, toolCallCount };
}
