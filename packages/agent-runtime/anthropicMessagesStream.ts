// agent-runtime/anthropicMessagesStream.ts
//
// Anthropic Messages SSE（stream:true）→ 聚合回与非流式一次性 JSON 相同形状的
// Anthropic message payload，交给既有 mapAnthropicMessageToOpenAi 复用。
//
// 存在理由：Claude OAuth 路径此前恒为 stream:false，按 providerCallTiming 契约
// 非流式不得伪造 firstOutputMs，导致 Claude 系 token 记录 firstOutputMs 恒缺。
// 流式聚合时在「首个有效输出」（text / thinking 非空 delta、tool_use 块开始或
// 非空 input_json_delta）调用 onMeaningfulOutput，由调用方喂给 timing tracker
// （first-write-wins 在 tracker 内保证）。signature_delta / ping / usage-only
// 事件不算有效输出。

type JsonRecord = Record<string, unknown>;

export type AnthropicStreamAggregateResult =
  | { ok: true; payload: JsonRecord }
  | { ok: false; status: number; body: JsonRecord };

const ANTHROPIC_STREAM_ERROR_STATUS: Record<string, number> = {
  overloaded_error: 529,
  rate_limit_error: 429,
  api_error: 500,
  invalid_request_error: 400,
  authentication_error: 401,
  permission_error: 403,
  not_found_error: 404,
  request_too_large: 413,
};

const mergeUsage = (target: JsonRecord, source: unknown): JsonRecord => {
  if (!source || typeof source !== "object") return target;
  const next = { ...target };
  for (const [key, value] of Object.entries(source as JsonRecord)) {
    // message_delta.usage 里的 null 表示「本帧未给」，不能覆盖 message_start 的值。
    if (value === null || value === undefined) continue;
    next[key] = value;
  }
  return next;
};

/** 把一段 SSE 事件块（以空行分隔）解析成 data JSON；非 JSON / 无 data 返回 null。 */
const parseSseEventBlock = (block: string): JsonRecord | null => {
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  if (dataLines.length === 0) return null;
  const data = dataLines.join("\n");
  if (!data || data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" ? (parsed as JsonRecord) : null;
  } catch {
    return null;
  }
};

export async function aggregateAnthropicMessageStream(
  body: ReadableStream<Uint8Array>,
  onMeaningfulOutput: () => void,
): Promise<AnthropicStreamAggregateResult> {
  let payload: JsonRecord | null = null;
  let usage: JsonRecord = {};
  const blocks: JsonRecord[] = [];
  const partialJson = new Map<number, string>();
  let stopped = false;
  let streamError: AnthropicStreamAggregateResult | null = null;

  const blockAt = (index: unknown): JsonRecord | undefined =>
    typeof index === "number" ? blocks[index] : undefined;

  const handleEvent = (event: JsonRecord): void => {
    switch (event.type) {
      case "message_start": {
        const message = (event.message as JsonRecord | undefined) ?? {};
        payload = { ...message, content: [] };
        usage = mergeUsage({}, message.usage);
        return;
      }
      case "content_block_start": {
        if (typeof event.index !== "number") return;
        const start = { ...((event.content_block as JsonRecord | undefined) ?? {}) };
        if (start.type === "tool_use") {
          start.input = {};
          partialJson.set(event.index, "");
          if (typeof start.name === "string" && start.name) onMeaningfulOutput();
        }
        if (start.type === "text" && typeof start.text === "string" && start.text) onMeaningfulOutput();
        if (start.type === "thinking" && typeof start.thinking === "string" && start.thinking) {
          onMeaningfulOutput();
        }
        blocks[event.index] = start;
        return;
      }
      case "content_block_delta": {
        const block = blockAt(event.index);
        const delta = (event.delta as JsonRecord | undefined) ?? {};
        if (!block) return;
        if (delta.type === "text_delta" && typeof delta.text === "string") {
          block.text = `${typeof block.text === "string" ? block.text : ""}${delta.text}`;
          if (delta.text) onMeaningfulOutput();
        } else if (delta.type === "thinking_delta" && typeof delta.thinking === "string") {
          block.thinking = `${typeof block.thinking === "string" ? block.thinking : ""}${delta.thinking}`;
          if (delta.thinking) onMeaningfulOutput();
        } else if (delta.type === "input_json_delta" && typeof delta.partial_json === "string") {
          const index = event.index as number;
          partialJson.set(index, `${partialJson.get(index) ?? ""}${delta.partial_json}`);
          if (delta.partial_json) onMeaningfulOutput();
        } else if (delta.type === "signature_delta" && typeof delta.signature === "string") {
          block.signature = `${typeof block.signature === "string" ? block.signature : ""}${delta.signature}`;
        }
        return;
      }
      case "content_block_stop": {
        const block = blockAt(event.index);
        if (!block || block.type !== "tool_use") return;
        const raw = partialJson.get(event.index as number) ?? "";
        if (raw.trim()) {
          try {
            block.input = JSON.parse(raw);
          } catch {
            block.input = {};
          }
        }
        return;
      }
      case "message_delta": {
        const delta = (event.delta as JsonRecord | undefined) ?? {};
        if (payload) {
          if (delta.stop_reason !== undefined) payload.stop_reason = delta.stop_reason;
          if (delta.stop_sequence !== undefined) payload.stop_sequence = delta.stop_sequence;
        }
        usage = mergeUsage(usage, event.usage);
        return;
      }
      case "message_stop":
        stopped = true;
        return;
      case "error": {
        const error = (event.error as JsonRecord | undefined) ?? { message: "Anthropic stream error" };
        const errorType = typeof error.type === "string" ? error.type : "";
        streamError = {
          ok: false,
          status: ANTHROPIC_STREAM_ERROR_STATUS[errorType] ?? 500,
          body: { type: "error", error },
        };
        return;
      }
      default:
        return; // ping 及未知事件忽略
    }
  };

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const drain = (final: boolean): void => {
    const normalized = buffer.replace(/\r\n/g, "\n");
    const parts = normalized.split("\n\n");
    buffer = final ? "" : (parts.pop() ?? "");
    for (const part of parts) {
      if (streamError) return;
      const event = parseSseEventBlock(part);
      if (event) handleEvent(event);
    }
  };
  try {
    while (!streamError) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      drain(false);
    }
    buffer += decoder.decode();
    if (!streamError) drain(true);
  } finally {
    if (streamError) await reader.cancel().catch(() => {});
    reader.releaseLock?.();
  }

  if (streamError) return streamError;
  if (!payload || !stopped) {
    return {
      ok: false,
      status: 502,
      body: {
        type: "error",
        error: {
          type: "stream_truncated",
          message: "Anthropic stream ended before message_stop",
        },
      },
    };
  }
  const finalPayload = payload as JsonRecord;
  return {
    ok: true,
    payload: { ...finalPayload, content: blocks.filter(Boolean), usage },
  };
}
