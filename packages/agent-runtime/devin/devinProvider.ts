import { randomBytes, randomUUID } from "node:crypto";
import { DEVIN_CONNECT_URL } from "../devinOAuth";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeResult,
  AgentRuntimeToolCall,
} from "../types";
import type { OpenAiCompatibleTool } from "../capabilities/capability";
import type {
  AgentRuntimeCompleteOptions,
  AgentRuntimeProvider,
} from "../hostAdapter";

export { DEVIN_CONNECT_URL };

const CLIENT_NAME = "chisel";
const CLIENT_VERSION = "2026.8.18";

// --- Minimal Protobuf Wire Helpers ---

export function writeVarint(fieldNum: number, value: number): Buffer {
  const tag = (fieldNum << 3) | 0;
  const bytes: number[] = [];

  let t = tag;
  while (t >= 0x80) {
    bytes.push((t & 0x7f) | 0x80);
    t >>>= 7;
  }
  bytes.push(t);

  let v = value;
  while (v >= 0x80) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);

  return Buffer.from(bytes);
}

export function writeLengthDelimited(fieldNum: number, content: Buffer): Buffer {
  const tag = (fieldNum << 3) | 2;
  const tagBytes: number[] = [];
  let t = tag;
  while (t >= 0x80) {
    tagBytes.push((t & 0x7f) | 0x80);
    t >>>= 7;
  }
  tagBytes.push(t);

  const lenBytes: number[] = [];
  let len = content.length;
  while (len >= 0x80) {
    lenBytes.push((len & 0x7f) | 0x80);
    len >>>= 7;
  }
  lenBytes.push(len);

  return Buffer.concat([Buffer.from(tagBytes), Buffer.from(lenBytes), content]);
}

export function writeStringField(fieldNum: number, str: string): Buffer {
  return writeLengthDelimited(fieldNum, Buffer.from(str, "utf8"));
}

export function writeMessageField(fieldNum: number, message: Buffer): Buffer {
  return writeLengthDelimited(fieldNum, message);
}

// --- Wire Encoders ---

export function generateFingerprint(): string {
  // Upstream requires exactly 732 hex characters (366 bytes)
  return randomBytes(366).toString("hex");
}

export function encodeDevinClientMetadata(token: string): Buffer {
  return Buffer.concat([
    writeStringField(1, CLIENT_NAME),
    writeStringField(2, CLIENT_VERSION),
    writeStringField(3, token),
    writeStringField(4, "en"),
    writeStringField(5, process.platform === "win32" ? "windows" : "linux"),
    writeStringField(7, CLIENT_VERSION),
    writeStringField(12, CLIENT_NAME),
    writeStringField(31, generateFingerprint()),
  ]);
}

export function encodeDevinChatMessage(msg: {
  role: "user" | "assistant" | "tool";
  text: string;
  toolCallId?: string;
  toolCalls?: AgentRuntimeToolCall[];
}): Buffer {
  // source: 1 = USER, 2 = ASSISTANT, 4 = TOOL_RESULT
  const source = msg.role === "assistant" ? 2 : msg.role === "tool" ? 4 : 1;
  return Buffer.concat([
    writeStringField(1, randomUUID()),
    writeVarint(2, source),
    writeStringField(3, msg.text),
    ...(msg.toolCalls ?? []).map((toolCall) =>
      writeMessageField(
        6,
        Buffer.concat([
          writeStringField(1, toolCall.id),
          writeStringField(2, toolCall.function.name),
          writeStringField(3, toolCall.function.arguments),
        ]),
      ),
    ),
    ...(msg.toolCallId ? [writeStringField(7, msg.toolCallId)] : []),
  ]);
}

export function encodeDevinToolDefinition(tool: OpenAiCompatibleTool): Buffer {
  const fn = tool.function ?? {};
  const name = typeof fn.name === "string" ? fn.name : "";
  const description = typeof fn.description === "string" ? fn.description : "";
  const parameters = fn.parameters ?? {};
  return Buffer.concat([
    writeStringField(1, name),
    writeStringField(2, description.length > 6_998 ? `${description.slice(0, 6_995)}...` : description),
    writeStringField(3, JSON.stringify(parameters)),
  ]);
}

export function writeFixed64Field(fieldNum: number, val: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeDoubleLE(val, 0);
  const tag = (fieldNum << 3) | 1;
  const tagBytes: number[] = [];
  let t = tag;
  while (t >= 0x80) {
    tagBytes.push((t & 0x7f) | 0x80);
    t >>>= 7;
  }
  tagBytes.push(t);
  return Buffer.concat([Buffer.from(tagBytes), b]);
}

export function buildCompletionConfig(params?: {
  maxTokens?: number;
  maxNewlines?: number;
  temperature?: number;
  topP?: number;
}): Buffer {
  // Field order mirrors the upstream client: 1 num_completions,
  // 2 max_tokens, 3 max_newlines, 5 temperature, 7 top_k, 8 top_p.
  // max_tokens used to default to 4096 while 128000 sat in max_newlines,
  // which silently capped every answer at ~4k tokens (observed: a review
  // report cut off mid-sentence with "输出达到长度上限被截断").
  // temperature matches the upstream client's 1.0. SWE-2 has no public API
  // and Cognition documents no sampling value (its knob is the effort
  // level), so the same-service agent client is the only reference; our old
  // 0.4 was an unverified local guess that could dampen effort behaviour.
  const maxTokens = params?.maxTokens ?? 128_000;
  const maxNewlines = params?.maxNewlines ?? 400;
  const temp = params?.temperature ?? 1.0;
  const topP = params?.topP ?? 0.95;
  return Buffer.concat([
    writeVarint(1, 1),
    writeVarint(2, maxTokens),
    writeVarint(3, maxNewlines),
    writeFixed64Field(5, temp),
    writeVarint(7, 40),
    writeFixed64Field(8, topP),
  ]);
}

export function buildGetChatMessageRequest(params: {
  token: string;
  messages: AgentRuntimeChatMessage[];
  model: string;
  tools?: OpenAiCompatibleTool[];
  temperature?: number;
}): Buffer {
  const { token, messages, model, tools = [], temperature } = params;

  const metadata = encodeDevinClientMetadata(token);

  let systemPrompt = "";
  const filteredMessages: Array<{
    role: "user" | "assistant" | "tool";
    text: string;
    toolCallId?: string;
    toolCalls?: AgentRuntimeToolCall[];
  }> = [];

  for (const m of messages) {
    const text =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
        ? m.content
            .filter((p: any) => p?.type === "text")
            .map((p: any) => p.text)
            .join("\n")
        : "";

    if (m.role === "system") {
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
    } else if (m.role === "user" || m.role === "assistant" || m.role === "tool") {
      filteredMessages.push({
        role: m.role,
        text,
        ...(m.tool_call_id ? { toolCallId: m.tool_call_id } : {}),
        ...(m.tool_calls?.length ? { toolCalls: m.tool_calls } : {}),
      });
    }
  }

  // Only plain adjacent user/assistant text can be coalesced. Tool boundaries
  // and assistant tool-call messages carry protocol identity and must survive.
  const coalesced: typeof filteredMessages = [];
  for (const item of filteredMessages) {
    const last = coalesced[coalesced.length - 1];
    if (
      last &&
      last.role === item.role &&
      item.role !== "tool" &&
      !last.toolCalls?.length &&
      !item.toolCalls?.length
    ) {
      last.text = `${last.text}\n\n${item.text}`;
    } else {
      coalesced.push({ ...item });
    }
  }

  const chatMessageBuffers = coalesced.map((m) => encodeDevinChatMessage(m));

  const completionConfig = buildCompletionConfig({ temperature });

  const modelConfig = Buffer.concat([
    writeStringField(1, randomUUID()),
    writeVarint(2, 1),
    writeVarint(3, 4),
  ]);

  return Buffer.concat([
    writeMessageField(1, metadata),
    writeStringField(2, systemPrompt),
    ...chatMessageBuffers.map((b) => writeMessageField(3, b)),
    writeVarint(7, 5),
    writeMessageField(8, completionConfig),
    ...tools.map((tool) => writeMessageField(10, encodeDevinToolDefinition(tool))),
    writeMessageField(15, modelConfig),
    writeStringField(16, randomUUID()),
    writeVarint(20, 1),
    writeStringField(21, model),
  ]);
}

// --- Connect-RPC Framing ---

export function buildDevinConnectFrame(payload: Buffer, flags = 0x00): Buffer {
  const header = Buffer.alloc(5);
  header[0] = flags & 0xff;
  header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

export function parseDevinConnectFrames(buffer: Buffer): {
  frames: Array<{ flags: number; payload: Buffer }>;
  remainder: Buffer;
} {
  const frames: Array<{ flags: number; payload: Buffer }> = [];
  let offset = 0;

  while (offset + 5 <= buffer.length) {
    const flags = buffer[offset];
    const length = buffer.readUInt32BE(offset + 1);

    if (offset + 5 + length > buffer.length) {
      break; // Incomplete frame
    }

    const payload = buffer.subarray(offset + 5, offset + 5 + length);
    frames.push({ flags, payload });
    offset += 5 + length;
  }

  return {
    frames,
    remainder: buffer.subarray(offset),
  };
}

// --- Response Parser ---

export type DevinDecodedEvent =
  | { type: "content"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call-start"; id: string; name: string }
  | { type: "tool-call-args"; argsDelta: string; id?: string };

/**
 * 响应 metadata 子消息（top-level field #7）里的真实 token 计数。
 *
 * Wire tag calibration（与 Windsurf/Devin 桌面客户端同一个上游服务
 * `server.codeium.com/…GetChatMessage`，社区逆向校准值）：
 *   #7.2 = prompt tokens（fresh input）
 *   #7.3 = completion tokens —— **只骑在收尾帧上**，中间帧没有
 *   #7.4 = cache write tokens
 *   #7.5 = cache read tokens
 *
 * proto3 不编码零值标量：字段没出现即 0 / 未观测。别把中间帧的
 * prompt 运行值当成终值——只有带 completion 的那一帧才是完整配对。
 */
export type DevinFrameUsage = {
  prompt: number;
  /** 仅收尾帧出现；缺失表示这一帧不是终帧。 */
  completion?: number;
  cacheRead: number;
  cacheWrite: number;
};

/**
 * 解析 #7 metadata 子消息中的 token 计数字段。
 * 只读已知 tag 的 varint，其他字段（如 #7.9 actual model）原样跳过；
 * 子消息解析失败（坏 protobuf）返回 null，调用方按「无 usage」处理，
 * 不往热路径上抛异常。
 */
export function parseDevinMetadataUsage(metaBytes: Buffer): DevinFrameUsage | null {
  let prompt = 0;
  let completion: number | undefined;
  let cacheRead = 0;
  let cacheWrite = 0;
  let sawAny = false;
  let offset = 0;

  while (offset < metaBytes.length) {
    let tag = 0;
    let shift = 0;
    while (offset < metaBytes.length) {
      const b = metaBytes[offset++];
      tag |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }

    const fieldNum = tag >>> 3;
    const wireType = tag & 0x07;

    if (wireType === 0) {
      let val = 0;
      let s = 0;
      while (offset < metaBytes.length) {
        const b = metaBytes[offset++];
        val |= (b & 0x7f) << s;
        if (!(b & 0x80)) break;
        s += 7;
      }
      if (fieldNum === 2) {
        prompt = val;
        sawAny = true;
      } else if (fieldNum === 3) {
        completion = val;
        sawAny = true;
      } else if (fieldNum === 4) {
        cacheWrite = val;
        sawAny = true;
      } else if (fieldNum === 5) {
        cacheRead = val;
        sawAny = true;
      }
    } else if (wireType === 2) {
      let len = 0;
      let s = 0;
      while (offset < metaBytes.length) {
        const b = metaBytes[offset++];
        len |= (b & 0x7f) << s;
        if (!(b & 0x80)) break;
        s += 7;
      }
      offset += len;
    } else {
      break;
    }
  }

  return sawAny ? { prompt, completion, cacheRead, cacheWrite } : null;
}

export type DevinDecodedDelta = {
  content: string;
  reasoning: string;
  finishReason: string | null;
  events: DevinDecodedEvent[];
  usage?: DevinFrameUsage | null;
};

export function parseDevinConnectTrailer(payload: Buffer): Error | null {
  const text = payload.toString("utf8").trim();
  if (!text || text === "{}") return null;
  try {
    const parsed = JSON.parse(text) as { error?: { code?: unknown; message?: unknown } };
    if (!parsed.error) {
      return new Error(`Devin Connect invalid terminal trailer: ${text}`);
    }
    const code = typeof parsed.error.code === "string" ? parsed.error.code : "unknown";
    const message = typeof parsed.error.message === "string" ? parsed.error.message : "Unknown error";
    return new Error(`Devin Connect upstream error ${code}: ${message}`);
  } catch {
    return new Error(`Devin Connect invalid terminal trailer: ${text}`);
  }
}

export function decodeDevinResponsePayload(payload: Buffer): DevinDecodedDelta {
  let offset = 0;
  let content = "";
  let reasoning = "";
  let finishReason: string | null = null;
  let usage: DevinFrameUsage | null = null;
  const events: DevinDecodedDelta["events"] = [];

  while (offset < payload.length) {
    // Read tag varint
    let tag = 0;
    let shift = 0;
    while (offset < payload.length) {
      const b = payload[offset++];
      tag |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }

    const fieldNum = tag >>> 3;
    const wireType = tag & 0x07;

    if (wireType === 0) {
      // Varint
      let val = 0;
      let s = 0;
      while (offset < payload.length) {
        const b = payload[offset++];
        val |= (b & 0x7f) << s;
        if (!(b & 0x80)) break;
        s += 7;
      }
      if (fieldNum === 5) {
        finishReason = val === 10 ? "tool_calls" : val === 1 || val === 3 ? "length" : "stop";
      }
    } else if (wireType === 2) {
      // Length-delimited
      let len = 0;
      let s = 0;
      while (offset < payload.length) {
        const b = payload[offset++];
        len |= (b & 0x7f) << s;
        if (!(b & 0x80)) break;
        s += 7;
      }

      const valBytes = payload.subarray(offset, offset + len);
      offset += len;

      if (fieldNum === 3) {
        const text = valBytes.toString("utf8");
        content += text;
        events.push({ type: "content", text });
      } else if (fieldNum === 9) {
        const text = valBytes.toString("utf8");
        reasoning += text;
        events.push({ type: "reasoning", text });
      } else if (fieldNum === 6) {
        // Upstream splits a tool call across frames: a start frame carrying
        // id + name, then one or more arg frames carrying only an args delta
        // (optionally re-tagged with the id). Emitting a complete call here
        // would drop every delta that arrives in its own frame, which is what
        // turned real calls into `bash: {}`.
        let nestedOffset = 0;
        let id: string | undefined;
        let name: string | undefined;
        let argsDelta: string | undefined;
        while (nestedOffset < valBytes.length) {
          let nestedTag = 0;
          let nestedShift = 0;
          while (nestedOffset < valBytes.length) {
            const b = valBytes[nestedOffset++];
            nestedTag |= (b & 0x7f) << nestedShift;
            if (!(b & 0x80)) break;
            nestedShift += 7;
          }
          const nestedField = nestedTag >>> 3;
          const nestedWire = nestedTag & 0x07;
          if (nestedWire !== 2) break;
          let nestedLength = 0;
          let lengthShift = 0;
          while (nestedOffset < valBytes.length) {
            const b = valBytes[nestedOffset++];
            nestedLength |= (b & 0x7f) << lengthShift;
            if (!(b & 0x80)) break;
            lengthShift += 7;
          }
          const nestedValue = valBytes.subarray(nestedOffset, nestedOffset + nestedLength);
          nestedOffset += nestedLength;
          const text = nestedValue.toString("utf8");
          if (nestedField === 1) id = text;
          else if (nestedField === 2) name = text;
          else if (nestedField === 3) argsDelta = (argsDelta ?? "") + text;
        }
        if (id !== undefined && name !== undefined) {
          events.push({ type: "tool-call-start", id, name });
        }
        if (argsDelta !== undefined) {
          events.push({ type: "tool-call-args", argsDelta, ...(id ? { id } : {}) });
        }
      } else if (fieldNum === 7) {
        // Metadata trailer: the only place real token counts ride the wire.
        // Skipping it (as we once did) left every devin turn with zero usage —
        // context usage fell back to estimation and real-usage compaction
        // triggers never saw a number.
        usage = parseDevinMetadataUsage(valBytes);
      }
    } else {
      // Unknown wire type, cannot safely skip without full schema parser
      break;
    }
  }

  return { content, reasoning, finishReason, events, usage };
}

// --- Provider Implementation ---

export function createDevinProvider(options: {
  token: string;
  model?: string;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  tools?: OpenAiCompatibleTool[];
  temperature?: number;
}): AgentRuntimeProvider {
  const { token, model = "swe-2-max", fetchImpl = fetch, tools = [], temperature } = options;

  return {
    model,
    async complete(
      messages: AgentRuntimeChatMessage[],
      opts?: AgentRuntimeCompleteOptions
    ): Promise<AgentRuntimeResult> {
      const selectedModel = model;
      const requestPayload = buildGetChatMessageRequest({
        token,
        messages,
        model: selectedModel,
        tools,
        temperature,
      });

      const frame = buildDevinConnectFrame(requestPayload);

      const response = await fetchImpl(DEVIN_CONNECT_URL, {
        method: "POST",
        headers: {
          "authorization": `Basic ${token}-${token}`,
          "content-type": "application/connect+proto",
          "connect-protocol-version": "1",
        },
        body: new Uint8Array(frame),
        signal: opts?.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `Devin Connect upstream returned error ${response.status}: ${errText}`
        );
      }

      if (!response.body) {
        throw new Error("Devin Connect response body is null");
      }

      let text = "";
      let reasoning = "";
      let finishReason: string | null = null;
      // Upstream token counts from the #7 metadata trailer. Completion rides
      // only the final frame, so the last frame carrying a completion count is
      // the terminal pair (intermediate frames may carry running prompt totals).
      let frameUsage: DevinFrameUsage | null = null;
      // Tool calls arrive as a start frame plus separate arg-delta frames, so
      // they must be assembled across frames in wire order.
      const toolCallOrder: string[] = [];
      const toolCallById = new Map<string, { id: string; name: string; argumentsText: string }>();
      let currentToolCallId: string | null = null;
      let buffer: Buffer = Buffer.alloc(0);
      let sawTrailer = false;

      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer = Buffer.concat([buffer, Buffer.from(value)]);
          const { frames, remainder } = parseDevinConnectFrames(buffer);
          buffer = Buffer.from(remainder);

          for (const f of frames) {
            if (sawTrailer) {
              throw new Error("Devin Connect received a frame after the terminal trailer");
            }

            // flags 0x02 indicates stream end/trailer
            if (f.flags & 0x02) {
              sawTrailer = true;
              const trailerError = parseDevinConnectTrailer(f.payload);
              if (trailerError) throw trailerError;
              continue;
            }

            const delta = decodeDevinResponsePayload(f.payload);

            // Only a frame that carries the completion count is terminal; the
            // completion riding the final metadata frame is what makes the
            // prompt/completion pair a real usage snapshot.
            if (delta.usage?.completion !== undefined) {
              frameUsage = delta.usage;
            }

            text += delta.content;
            reasoning += delta.reasoning;
            if (delta.finishReason) finishReason = delta.finishReason;
            for (const event of delta.events) {
              if (event.type === "reasoning") {
                opts?.onReasoningDelta?.(event.text);
              } else if (event.type === "content") {
                opts?.onTextDelta?.(event.text);
              } else if (event.type === "tool-call-start") {
                const existing = toolCallById.get(event.id);
                if (existing) {
                  existing.name = event.name;
                } else {
                  toolCallOrder.push(event.id);
                  toolCallById.set(event.id, {
                    id: event.id,
                    name: event.name,
                    argumentsText: "",
                  });
                }
                currentToolCallId = event.id;
              } else {
                // Arg frames may omit the id; they then extend the most
                // recently started call, mirroring the upstream client.
                const targetId = event.id ?? currentToolCallId;
                const target = targetId ? toolCallById.get(targetId) : undefined;
                if (target) target.argumentsText += event.argsDelta;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (buffer.length > 0) {
        throw new Error("Devin Connect upstream ended with an incomplete frame");
      }
      if (!sawTrailer) {
        throw new Error("Devin Connect upstream ended before the terminal trailer");
      }

      const toolCalls: AgentRuntimeToolCall[] = toolCallOrder.map((id) => {
        const call = toolCallById.get(id)!;
        return {
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: call.argumentsText || "{}",
          },
        };
      });

      if (!text && !reasoning && toolCalls.length === 0) {
        throw new Error("Devin Connect upstream completed without content or tool calls");
      }

      // OpenAI-shaped usage so normalizeUsage / usageRecords / context-usage
      // consumers treat devin like any other provider:
      //   prompt_tokens = fresh input + cache_read (cached is a subset detail)
      //   total_tokens includes cache_write (real billable cost)
      const usage = frameUsage
        ? {
            prompt_tokens: frameUsage.prompt + frameUsage.cacheRead,
            completion_tokens: frameUsage.completion ?? 0,
            total_tokens:
              frameUsage.prompt +
              frameUsage.cacheRead +
              (frameUsage.completion ?? 0) +
              frameUsage.cacheWrite,
            ...(frameUsage.cacheRead > 0
              ? { prompt_tokens_details: { cached_tokens: frameUsage.cacheRead } }
              : {}),
            ...(frameUsage.cacheWrite > 0
              ? { cache_creation_input_tokens: frameUsage.cacheWrite }
              : {}),
          }
        : undefined;

      return {
        content: text,
        model: selectedModel,
        provider: "devin",
        ...(usage ? { usage } : {}),
        ...(reasoning ? { reasoning_content: reasoning } : {}),
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        // The upstream finish event wins whenever it is present. A tool call
        // cut off by the length limit has to stay "length" instead of being
        // relabelled "tool_calls", so probes/telemetry and any downstream
        // consumer of the final finish_reason no longer see a truncated turn
        // mislabelled as a normal one. localLoop keeps its own truncation
        // gates and excludes tool-bearing turns from them.
        finish_reason: finishReason ?? (toolCalls.length > 0 ? "tool_calls" : "stop"),
        stream_complete: true,
      };
    },
  };
}
