import { readSseFrames } from "../../agent-runtime/sseFrames";
import { parseSseDataLineObject } from "../../agent-runtime/sseDataLine";

type Obj = Record<string, any>;
const record = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Protocol projection only: billing observes the original stream outside this adapter.
 * Pull-driven generators bound read-ahead; cancellation also interrupts a pending upstream read.
 * A finish chunk is not a transport terminator: keep reading through the trailing usage to [DONE].
 */
export function chatCompletionsToResponsesStream(
  stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) { controller.error(error); }
    },
    cancel: (reason) => reader.cancel(reason),
  }, { highWaterMark: 0 });
  const encoder = new TextEncoder();

  async function* project(): AsyncGenerator<Obj> {
    let id = "chat-response";
    let model: string | undefined;
    let created: number | undefined;
    let started = false;
    let finish: string | undefined;
    let usage: Obj | undefined;
    const output: Obj[] = [];
    const tools = new Map<number, Obj>();
    let message: Obj | undefined;
    let reasoning: Obj | undefined;
    const envelope = (status: string): Obj => ({
      id, object: "response", status,
      ...(model !== undefined ? { model } : {}),
      ...(created !== undefined ? { created_at: created } : {}),
      output,
      ...(usage ? { usage } : {}),
    });
    const addItem = (item: Obj) => {
      const output_index = output.length;
      output.push(item);
      return { type: "response.output_item.added", output_index, item: { ...item } };
    };
    const failure = (error: Obj) => ({
      type: "response.failed", response: { ...envelope("failed"), error },
    });
    try {
      for await (const frame of readSseFrames(new Response(source))) {
        for (const line of frame.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          if (trimmed.slice(5).trim() === "[DONE]") {
            if (!finish) {
              yield failure({ code: "stream_truncated", message: "Chat stream ended without finish_reason." });
              return;
            }
            const incomplete = !["stop", "tool_calls"].includes(finish);
            if (!incomplete) {
              for (const tool of tools.values()) {
                if (!tool.call_id?.trim() || !tool.name?.trim()) throw new Error("Chat tool call is missing id or name.");
                if ([...tools.values()].filter(other => other.call_id === tool.call_id).length !== 1) throw new Error("Duplicate Chat tool call id.");
                try { JSON.parse(tool.arguments); }
                catch { throw new Error("Chat tool call arguments are not complete JSON."); }
              }
              if ((finish === "tool_calls" || finish === "function_call") && !tools.size) {
                throw new Error("Chat tool finish_reason has no tool calls.");
              }
            }
            for (let index = 0; index < output.length; index++) {
              const item = output[index]!;
              item.status = incomplete ? "incomplete" : "completed";
              if (item.type === "function_call") {
                // Chat identity/name may themselves be split across frames. Do not expose
                // provisional identities: existing consumers key tools by call_id OR item_id.
                item.id = item.call_id || item.id;
                yield { type: "response.output_item.added", output_index: index, item: { ...item, status: "in_progress", arguments: "" } };
                if (item.arguments) yield { type: "response.function_call_arguments.delta", item_id: item.id, call_id: item.call_id, name: item.name, output_index: index, delta: item.arguments };
                yield { type: "response.function_call_arguments.done", item_id: item.id, call_id: item.call_id, name: item.name, output_index: index, arguments: item.arguments };
              } else if (item.type === "message") {
                yield { type: "response.output_text.done", item_id: item.id, output_index: index, content_index: 0, text: item.content[0].text };
              } else {
                yield { type: "response.reasoning_text.done", item_id: item.id, output_index: index, content_index: 0, text: item.content[0].text };
              }
              yield { type: "response.output_item.done", output_index: index, item };
            }
            yield incomplete
              ? { type: "response.incomplete", response: { ...envelope("incomplete"), incomplete_details: { reason: finish === "length" ? "max_output_tokens" : finish } } }
              : { type: "response.completed", response: envelope("completed") };
            return;
          }
          if (!trimmed.slice(5).trim()) continue;
          const chunk = parseSseDataLineObject(line);
          if (!record(chunk)) throw new Error("Invalid Chat completions SSE data.");
          if (chunk.error) {
            yield failure(record(chunk.error) ? chunk.error : { message: String(chunk.error) });
            return;
          }
          if (typeof chunk.id === "string") id = chunk.id;
          if (typeof chunk.model === "string") model = chunk.model;
          if (finite(chunk.created)) created = chunk.created;
          if (!started) {
            started = true;
            yield { type: "response.created", response: { ...envelope("in_progress"), output: [] } };
          }
          if (record(chunk.usage)) {
            // Snapshots, never increments. Keep cost/cache/provider extensions untouched.
            usage = { ...usage, ...chunk.usage };
            if (!finite(chunk.usage.input_tokens) && finite(chunk.usage.prompt_tokens)) usage.input_tokens = chunk.usage.prompt_tokens;
            if (!finite(chunk.usage.output_tokens) && finite(chunk.usage.completion_tokens)) usage.output_tokens = chunk.usage.completion_tokens;
            if (!finite(usage.total_tokens) && finite(usage.input_tokens) && finite(usage.output_tokens)) usage.total_tokens = usage.input_tokens + usage.output_tokens;
            if (!record(usage.input_tokens_details) && record(usage.prompt_tokens_details)) usage.input_tokens_details = usage.prompt_tokens_details;
            if (!record(usage.output_tokens_details) && record(usage.completion_tokens_details)) usage.output_tokens_details = usage.completion_tokens_details;
          }
          // Proxy extension frames are independent of Chat choices. Identity-only
          // usage must remain visible to existing clients; token snapshots are held
          // for the terminal envelope so they are never emitted twice as increments.
          if (record(chunk.billing)) yield { billing: chunk.billing };
          if (record(chunk.usage) && typeof chunk.usage.provider_call_id === "string") {
            const identity: Obj = {};
            for (const key of ["provider_call_id", "billing_provider", "billing_model"]) {
              if (chunk.usage[key] !== undefined) identity[key] = chunk.usage[key];
            }
            yield { usage: identity };
          }
          if (chunk.choices === undefined && (record(chunk.usage) || record(chunk.billing))) continue;
          if (!Array.isArray(chunk.choices)) throw new Error("Chat SSE chunk is missing choices.");
          if (chunk.choices.length > 1) throw new Error("Multiple Chat choices cannot be projected into one Response.");
          for (const choice of chunk.choices) {
            if (!record(choice) || (choice.index !== undefined && choice.index !== 0)) throw new Error("Unsupported Chat choice index.");
            const delta = choice.delta ?? {};
            if (!record(delta)) throw new Error("Invalid Chat delta.");
            if (finish && Object.keys(delta).length) throw new Error("Chat delta received after finish_reason.");
            for (const [field, type] of [["content", "message"], ["reasoning_content", "reasoning"], ["reasoning", "reasoning"]] as const) {
              const text = delta[field];
              if (text == null || text === "") continue;
              if (typeof text !== "string") throw new Error(`Unsupported Chat ${field} delta.`);
              let item = type === "message" ? message : reasoning;
              if (!item) {
                item = { id: `chat-item-${output.length}`, type, status: "in_progress", ...(type === "message" ? { role: "assistant" } : {}), content: [{ type: type === "message" ? "output_text" : "reasoning_text", text: "" }] };
                yield addItem(item);
                if (type === "message") message = item; else reasoning = item;
              }
              item.content[0].text += text;
              yield { type: type === "message" ? "response.output_text.delta" : "response.reasoning_text.delta", item_id: item.id, output_index: output.indexOf(item), content_index: 0, delta: text };
            }
            if (delta.refusal) throw new Error("Chat refusal cannot be represented as successful text.");
            if (delta.function_call) throw new Error("Legacy Chat function_call has no tool call id.");
            if (delta.tool_calls !== undefined && !Array.isArray(delta.tool_calls)) throw new Error("Invalid Chat tool_calls.");
            for (const part of delta.tool_calls ?? []) {
              if (!record(part) || !Number.isInteger(part.index) || part.index < 0) throw new Error("Chat tool call is missing a valid index.");
              let tool = tools.get(part.index);
              if (!tool) {
                tool = { id: `chat-item-${output.length}`, type: "function_call", status: "in_progress", call_id: "", name: "", arguments: "" };
                tools.set(part.index, tool);
                output.push(tool);
              }
              for (const [value, key] of [[part.id, "call_id"], [part.function?.name, "name"], [part.function?.arguments, "arguments"]] as const) {
                if (value == null) continue;
                if (typeof value !== "string") throw new Error(`Invalid Chat tool ${key}.`);
                tool[key] += value;
                // Buffer until the complete identity is known; arguments are emitted once
                // under that identity, never under a provisional key that creates ghost tools.
              }
            }
            if (choice.finish_reason != null) {
              if (typeof choice.finish_reason !== "string" || (finish && finish !== choice.finish_reason)) throw new Error("Conflicting Chat finish_reason.");
              finish = choice.finish_reason;
            }
          }
        }
      }
      yield failure({ code: "stream_truncated", message: "Chat stream ended before [DONE]." });
    } catch (error) {
      if (!cancelled) yield failure({ code: "chat_stream_error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      try { await reader.cancel(); } catch { /* preserve upstream failure */ }
      reader.releaseLock();
    }
  }
  const events = project();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await events.next();
        if (cancelled) return;
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(`${next.value.type ? `event: ${next.value.type}\n` : ""}data: ${JSON.stringify(next.value)}\n\n`));
      } catch (error) { if (!cancelled) controller.error(error); }
    },
    async cancel(reason) {
      cancelled = true;
      try { await reader.cancel(reason); }
      finally {
        await events.return(undefined);
        // An unstarted async generator never enters its finally block.
        try { reader.releaseLock(); } catch { /* already released */ }
      }
    },
  }, { highWaterMark: 0 });
}
