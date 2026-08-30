import { convertMessagesToResponsesInput, toResponsesTools } from "./responsesHelpers";

/** Convert a chat-completions-shaped body into the public Responses wire body. */
export function buildResponsesRequestBody(
  body: Record<string, any>,
  model: string,
): Record<string, any> {
  const tools = Array.isArray(body.tools) ? toResponsesTools(body.tools) : undefined;
  const reasoningEffort =
    body.reasoning && typeof body.reasoning === "object"
      ? undefined
      : typeof body.reasoning_effort === "string" && body.reasoning_effort.trim()
        ? body.reasoning_effort
        : undefined;
  return {
    ...body,
    model,
    input:
      Array.isArray(body.input) && body.input.length > 0
        ? body.input
        : convertMessagesToResponsesInput(body.messages ?? []),
    ...(Array.isArray(body.tools) ? { tools: tools ?? undefined } : {}),
    ...(typeof body.max_tokens === "number"
      ? { max_output_tokens: body.max_tokens }
      : {}),
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    messages: undefined,
    max_tokens: undefined,
    reasoning_effort: undefined,
    tool_choice: undefined,
    // stream_options 是 chat.completions 专属参数；客户端按 chat 线构建的 body
    // 携带它（旧版本 runtime 或 wire 分流窗口期）经此处转 Responses 上游时必须
    // 剥离，否则 OpenAI 直接 400 Unknown parameter: 'stream_options.include_usage'。
    // Responses 线天然在流末返回 usage，无需 include_usage。
    stream_options: undefined,
  };
}
