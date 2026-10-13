import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import { mapAnthropicStopReason } from "./anthropicMessagesProvider";

type Json = Record<string, unknown>;
export type CloudflareUsage = {
  prompt_tokens: number; input_tokens: number; completion_tokens: number; output_tokens: number;
  total_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number;
  billing_estimated?: true;
};
export type CloudflareStreamResult = { usage?: CloudflareUsage; failed: boolean; completed: boolean };
const obj = (x: unknown): Json => x && typeof x === "object" ? x as Json : {};
const numeric = (x: unknown): number => typeof x === "number" && Number.isFinite(x) ? x : 0;

/**
 * OpenAI tool_choice -> Anthropic Messages tool_choice. Anthropic has no "none";
 * every unmappable value is an explicit error instead of a silently dropped field.
 */
export function toAnthropicToolChoice(value: unknown): Json {
  if (value === "auto") return { type: "auto" };
  if (value === "required") return { type: "any" };
  const v = obj(value);
  if (v.type === "auto" || v.type === "any") return { type: v.type };
  const name = typeof v.name === "string" ? v.name : obj(v.function).name;
  if (v.type === "function" || v.type === "tool") {
    if (typeof name !== "string" || !name) throw new TypeError("Unsupported tool_choice for Cloudflare Claude: tool name missing");
    return { type: "tool", name };
  }
  throw new TypeError(`Unsupported tool_choice for Cloudflare Claude: ${JSON.stringify(value) ?? String(value)}`);
}

/** Convert OpenAI chat messages to Cloudflare's Claude Messages API request body. */
export function buildCloudflareClaudeMessagesBody(agentConfig: AgentRuntimeAgentConfig, openAiBody: Json, upstreamModelId: string): Json {
  const system: string[] = [];
  const configPrompt = typeof agentConfig.prompt === "string" ? agentConfig.prompt : "";
  const messages: Json[] = [];
  for (const raw of Array.isArray(openAiBody.messages) ? openAiBody.messages : []) {
    const m = obj(raw), role = String(m.role ?? "");
    if (role === "system" || role === "developer") {
      if (typeof m.content === "string") system.push(m.content);
      else if (Array.isArray(m.content)) system.push(m.content.map(part => {
        const p = obj(part);
        if ((p.type === "text" || p.type === "input_text") && typeof p.text === "string") return p.text;
        throw new TypeError("Unsupported non-text system content for Cloudflare Claude");
      }).join(""));
      else if (m.content != null) throw new TypeError("Unsupported system content for Cloudflare Claude");
      continue;
    }
    if (role === "tool") {
      messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "") }] });
      continue;
    }
    if (role !== "user" && role !== "assistant") continue;
    const content: Json[] = [];
    if (typeof m.content === "string" && m.content) content.push({ type: "text", text: m.content });
    else if (Array.isArray(m.content)) for (const part of m.content) {
      const p = obj(part);
      if ((p.type === "text" || p.type === "input_text") && typeof p.text === "string") content.push({ type: "text", text: p.text });
      else if (p.type === "image_url") {
        const url = typeof p.image_url === "string" ? p.image_url : obj(p.image_url).url;
        if (typeof url !== "string" || !url) throw new TypeError("Unsupported image_url content");
        const match = /^data:([^;,]+);base64,(.+)$/s.exec(url);
        content.push({ type: "image", source: match ? { type: "base64", media_type: match[1], data: match[2] } : { type: "url", url } });
      } else throw new TypeError(`Unsupported message content block: ${String(p.type)}`);
    }
    if (role === "assistant" && Array.isArray(m.tool_calls)) for (const rawCall of m.tool_calls) {
      const call = obj(rawCall), fn = obj(call.function); let input: unknown = {};
      try { input = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments ?? {}; }
      catch { throw new TypeError("Invalid assistant tool-call JSON arguments"); }
      if (typeof fn.name === "string") content.push({ type: "tool_use", id: call.id, name: fn.name, input });
    }
    if (content.length) messages.push({ role, content });
  }
  if (configPrompt && !system.includes(configPrompt)) system.unshift(configPrompt);
  const body: Json = {
    model: upstreamModelId, messages,
    max_tokens: numeric(openAiBody.max_completion_tokens ?? openAiBody.max_tokens) || numeric(agentConfig.max_tokens) || 8192,
    stream: true,
    ...(system.length ? { system: system.join("\n\n") } : {}),
  };
  if (Array.isArray(openAiBody.tools)) body.tools = openAiBody.tools.flatMap(raw => {
    const fn = obj(obj(raw).function);
    return typeof fn.name === "string" ? [{ name: fn.name, ...(fn.description ? { description: fn.description } : {}), input_schema: fn.parameters ?? { type: "object", properties: {} } }] : [];
  });
  if (openAiBody.temperature !== undefined) body.temperature = openAiBody.temperature;
  if (openAiBody.tool_choice !== undefined) body.tool_choice = toAnthropicToolChoice(openAiBody.tool_choice);
  const effort = String(openAiBody.reasoning_effort ?? agentConfig.reasoning_effort ?? "").toLowerCase();
  if (["minimal", "low", "medium", "high", "xhigh"].includes(effort)) body.output_config = { effort };
  // A single 5m breakpoint on the first actual stable user text block (no 1h TTL).
  const firstText = messages.filter(m => m.role === "user").flatMap(m => m.content as Json[]).find(b => b.type === "text");
  if (firstText) firstText.cache_control = { type: "ephemeral" };
  return body;
}

/**
 * Anthropic SSE -> OpenAI chat-completion SSE. Usage snapshots replace prior values
 * per field. Success/[DONE] requires message_stop and all usage fields. Incomplete
 * callback delivers estimated partial usage for errors, EOF, missing usage and cancel.
 */
export function adaptCloudflareClaudeMessagesStream(args: {
  body: ReadableStream<Uint8Array>; providerCallId: string; onCancel?: () => void;
  onUsageComplete?: (usage: CloudflareUsage) => void;
  onIncomplete?: (result: CloudflareStreamResult) => void;
  onResult?: (result: CloudflareStreamResult) => void;
}): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let result: CloudflareStreamResult = { failed: false, completed: false };
  let parts = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  const usageSeen = new Set<string>();
  let cancelled = false;
  const out = new ReadableStream<Uint8Array>({
    start(controller) {
      reader = args.body.getReader();
      const blocks = new Map<number, Json>();
      let buf = "";
      const decoder = new TextDecoder();
      let toolN = 0;
      // Anthropic 内容块 index ≠ OpenAI tool_calls 序号：thinking/text 块也在
      // 同一个 index 空间里。参数分片必须落在同一个工具上，否则会产出悬空/
      // 错位的 tool_calls（客户端拼出空参数工具调用）。
      const toolOrdinals = new Map<number, number>();
      let stopReason = "";
      let sawToolUse = false;
      const emit = (x: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(x)}\n\n`));
      const updateUsage = (v: unknown) => {
        const u = obj(v);
        for (const k of Object.keys(parts) as (keyof typeof parts)[]) {
          if (typeof u[k] === "number" && Number.isFinite(u[k]) && (u[k] as number) >= 0) {
            parts[k] = u[k] as number;
            usageSeen.add(k);
          }
        }
      };
      const settle = (failed: boolean, stopSeen: boolean) => {
        if (result.completed || result.failed) return;
        const input = parts.input_tokens + parts.cache_creation_input_tokens + parts.cache_read_input_tokens;
        const completeUsage = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"].every(k => usageSeen.has(k));
        const completed = stopSeen && completeUsage;
        const usage: CloudflareUsage = {
          prompt_tokens: input, input_tokens: input, completion_tokens: parts.output_tokens,
          output_tokens: parts.output_tokens, total_tokens: input + parts.output_tokens,
          cache_creation_input_tokens: parts.cache_creation_input_tokens,
          cache_read_input_tokens: parts.cache_read_input_tokens,
          ...(!completed ? { billing_estimated: true as const } : {}),
        };
        result = { usage, failed: failed || (stopSeen && !completeUsage), completed };
        if (completed) args.onUsageComplete?.(usage);
        else args.onIncomplete?.(result);
        args.onResult?.(result);
      };
      const emitFailure = (message: string, type: string) => {
        settle(true, false);
        emit({ error: { message, type, metadata: { billing_estimated: true, failed: true, usage: result.usage } } });
      };
      const processEvent = (event: Json) => {
        const index = numeric(event.index), delta = obj(event.delta);
        if (event.type === "message_start") {
          const message = obj(event.message);
          updateUsage(message.usage);
          if (typeof message.stop_reason === "string") stopReason = message.stop_reason;
          return;
        }
        if (event.type === "message_delta") {
          // Anthropic carries stop_reason on message_delta, not on message_stop.
          if (typeof delta.stop_reason === "string") stopReason = delta.stop_reason;
          updateUsage(event.usage);
          return;
        }
        if (event.type === "content_block_start") {
          const block = obj(event.content_block);
          blocks.set(index, block);
          if (block.type === "tool_use") {
            sawToolUse = true;
            const ordinal = toolN++;
            toolOrdinals.set(index, ordinal);
            emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: { tool_calls: [{ index: ordinal, id: block.id, type: "function", function: { name: block.name, arguments: "" } }] }, finish_reason: null }] });
          }
          if (block.type === "text" && typeof block.text === "string" && block.text) emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: block.text }, finish_reason: null }] });
          return;
        }
        if (event.type === "content_block_delta") {
          if (delta.type === "text_delta" && typeof delta.text === "string") emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: delta.text }, finish_reason: null }] });
          if (delta.type === "thinking_delta" && typeof delta.thinking === "string") emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: { reasoning_content: delta.thinking }, finish_reason: null }] });
          if (delta.type === "input_json_delta") {
            const ordinal = toolOrdinals.get(index);
            if (ordinal === undefined) {
              // 未知 index 的参数分片 = 协议错位：显式失败，绝不产出挂错序号的
              // tool_calls（宁可整轮标失败，也不把错误的工具参数交给客户端）。
              emitFailure(`Cloudflare tool argument fragment for unknown content block index ${index}`, "tool_fragment_unknown_index");
              return;
            }
            emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: { tool_calls: [{ index: ordinal, function: { arguments: String(delta.partial_json ?? "") } }] }, finish_reason: null }] });
          }
          return;
        }
        if (event.type === "error") {
          const error = obj(event.error);
          emitFailure(String(error.message ?? "Cloudflare stream error"), String(error.type ?? "upstream_error"));
          return;
        }
        if (event.type === "message_stop") {
          settle(false, true);
          if (!result.completed) {
            emit({ error: { message: "Cloudflare stream ended without complete usage", type: "usage_incomplete", metadata: { billing_estimated: true, failed: true, usage: result.usage } } });
            return;
          }
          const reason = typeof delta.stop_reason === "string" ? delta.stop_reason : stopReason;
          const finishReason = mapAnthropicStopReason(reason, sawToolUse);
          emit({ id: args.providerCallId, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: finishReason }] });
          emit("[DONE]");
        }
      };
      const parse = (chunk: string) => {
        buf += chunk;
        let boundary: number;
        while ((boundary = buf.search(/\r?\n\r?\n/)) >= 0) {
          const raw = buf.slice(0, boundary);
          buf = buf.slice(boundary).replace(/^\r?\n\r?\n/, "");
          const data = raw.replace(/\r\n/g, "\n").split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
          if (data && data !== "[DONE]") try { processEvent(obj(JSON.parse(data))); } catch { /* malformed frame ignored */ }
        }
      };
      void (async () => {
        try {
          while (!cancelled) {
            const next = await reader!.read();
            if (next.done || cancelled) break;
            parse(decoder.decode(next.value, { stream: true }));
          }
          parse(decoder.decode());
          if (!cancelled && !result.completed && !result.failed) emitFailure("Cloudflare stream ended before message_stop", "stream_truncated");
          if (!cancelled) controller.close();
        } catch (error) {
          if (!cancelled && !result.completed && !result.failed) emitFailure(String(error), "upstream_error");
          try { controller.close(); } catch { /* consumer cancelled */ }
        }
      })();
    },
    cancel() {
      cancelled = true;
      args.onCancel?.();
      void reader?.cancel();
      if (!result.completed && !result.failed) {
        const input = parts.input_tokens + parts.cache_creation_input_tokens + parts.cache_read_input_tokens;
        const usage: CloudflareUsage = { prompt_tokens: input, input_tokens: input, completion_tokens: parts.output_tokens, output_tokens: parts.output_tokens, total_tokens: input + parts.output_tokens, cache_creation_input_tokens: parts.cache_creation_input_tokens, cache_read_input_tokens: parts.cache_read_input_tokens, billing_estimated: true };
        result = { usage, failed: true, completed: false };
        args.onIncomplete?.(result);
        args.onResult?.(result);
      }
    },
  });
  return out;
}
