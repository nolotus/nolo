import { randomBytes, randomUUID } from "node:crypto";
import { DEVIN_CONNECT_URL } from "../devinOAuth";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeResult,
} from "../types";
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
  role: "system" | "user" | "assistant";
  text: string;
}): Buffer {
  // source: 1 = USER, 2 = ASSISTANT
  const source = msg.role === "assistant" ? 2 : 1;
  return Buffer.concat([
    writeStringField(1, randomUUID()),
    writeVarint(2, source),
    writeStringField(3, msg.text),
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
  temperature?: number;
  topP?: number;
}): Buffer {
  const maxTokens = params?.maxTokens ?? 4096;
  const temp = params?.temperature ?? 0.4;
  const topP = params?.topP ?? 0.95;
  return Buffer.concat([
    writeVarint(1, 1),
    writeVarint(2, maxTokens),
    writeVarint(3, 128000),
    writeFixed64Field(5, temp),
    writeVarint(7, 40),
    writeFixed64Field(8, topP),
  ]);
}

export function buildGetChatMessageRequest(params: {
  token: string;
  messages: AgentRuntimeChatMessage[];
  model: string;
}): Buffer {
  const { token, messages, model } = params;

  const metadata = encodeDevinClientMetadata(token);

  let systemPrompt = "";
  const filteredMessages: Array<{ role: "user" | "assistant"; text: string }> = [];

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
    } else if (m.role === "user" || m.role === "assistant") {
      filteredMessages.push({ role: m.role, text });
    }
  }

  // Coalesce consecutive same-role messages to avoid upstream validation error
  const coalesced: Array<{ role: "user" | "assistant"; text: string }> = [];
  for (const item of filteredMessages) {
    const last = coalesced[coalesced.length - 1];
    if (last && last.role === item.role) {
      last.text = `${last.text}\n\n${item.text}`;
    } else {
      coalesced.push({ ...item });
    }
  }

  const chatMessageBuffers = coalesced.map((m) => encodeDevinChatMessage(m));

  const completionConfig = buildCompletionConfig();

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

export type DevinDecodedDelta = {
  content: string;
  reasoning: string;
  finishReason: string | null;
  events: Array<{ type: "content" | "reasoning"; text: string }>;
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
        finishReason = val === 2 ? "stop" : "length";
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
      }
    } else {
      // Unknown wire type, cannot safely skip without full schema parser
      break;
    }
  }

  return { content, reasoning, finishReason, events };
}

// --- Provider Implementation ---

export function createDevinProvider(options: {
  token: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): AgentRuntimeProvider {
  const { token, model = "swe-2", fetchImpl = fetch } = options;

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

            text += delta.content;
            reasoning += delta.reasoning;
            for (const event of delta.events) {
              if (event.type === "reasoning") {
                opts?.onReasoningDelta?.(event.text);
              } else {
                opts?.onTextDelta?.(event.text);
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
      if (!text && !reasoning) {
        throw new Error("Devin Connect upstream completed without content");
      }

      return {
        content: text,
        model: selectedModel,
        provider: "devin",
        reasoning_content: reasoning || undefined,
      };
    },
  };
}
