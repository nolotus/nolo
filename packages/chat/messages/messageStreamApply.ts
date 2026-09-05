// Wave11 — pure core for assembling a streaming-message upsert payload.
//
// This mirrors the legacy `messageStreaming` reducer in messageSlice:
//
//   upsertOneMessage(dialogState, {
//     isStreaming: true,
//     content: "",
//     thinkContent: "",
//     ...messageChunk,
//   })
//
// i.e. start from the fixed streaming defaults (`isStreaming: true`, empty
// content/think), then let the chunk overwrite on top. Entity-adapter
// `upsertOne` is a whole-object REPLACE (not a field merge), so the legacy
// reducer did NOT preserve any fields from the existing record — the new
// object simply replaced it. This helper reproduces that exact behaviour:
// `existing` is accepted in the signature for future use but intentionally
// NOT merged, matching `upsertOneMessage(dialogState, { isStreaming:true,
// content:"", thinkContent:"", ...message })`.
//
// Keeping this logic in a Redux-free core lets non-Redux hosts (TUI / CLI /
// server) build the same streaming message shape without dispatching.

import type { Message } from "./types";

/**
 * Build the streaming-message upsert payload for `messageStreaming`.
 *
 * The chunk is whatever the stream producer emitted (the fields of
 * `DialogScopedStreamingMessage` minus `dialogId`). It is applied on top of
 * the fixed streaming defaults (`isStreaming: true`, empty content/think),
 * so `isStreaming` stays `true` regardless of whether the chunk carries it.
 *
 * @param existing Optional previous message record. The entity-adapter upsert
 *   REPLACES the whole record (no field merge), so fields the chunk omits fall
 *   back to the streaming defaults. The only exception is the narrow monotonic
 *   text guard below: assistant *textual* streaming must not lose
 *   already-streamed body text to a metadata-only or transiently-shorter
 *   chunk (retry progress, image-generation stage updates, reset buffers).
 */
export function applyMessageStreamingUpsert(
  existing: Message | undefined,
  chunk: Partial<Message> & { id: string },
): Message {
  // Entity-adapter upsert = whole-object replace, not a field merge. `existing`
  // is only read by the narrow monotonic guard below; everything else keeps
  // the exact replace semantics of the legacy reducer.
  const merged = {
    isStreaming: true,
    content: "",
    thinkContent: "",
    ...chunk,
  } as Message;

  // isStreaming is authoritative for streaming upserts; never let a chunk turn
  // it off mid-stream (the old reducer hard-coded it true).
  merged.isStreaming = true;

  // Monotonic text guard (narrow, not a general field merge):
  // - applies only to assistant records with plain-string content;
  // - only when the incoming string content is a strict, shorter PREFIX of
  //   what is already there (transient shrink — e.g. `content: ""` carried by
  //   a retry-progress or image-stage update);
  // - longer/append updates and non-prefix replacements still go through
  //   untouched, so deliberate segment replacements and corrections surface.
  // Tool/image/part-array messages keep the exact whole-object replace
  // semantics they always had. Reasoning is protected separately and more
  // narrowly: metadata-only snapshots materialize the streaming default ""
  // but must not erase reasoning already accumulated for this assistant turn.
  if (
    existing &&
    existing.role === "assistant" &&
    merged.role === "assistant" &&
    typeof existing.content === "string" &&
    existing.content.length > 0 &&
    typeof merged.content === "string" &&
    merged.content.length < existing.content.length &&
    existing.content.startsWith(merged.content)
  ) {
    merged.content = existing.content;
  }

  if (
    existing &&
    existing.role === "assistant" &&
    merged.role === "assistant" &&
    typeof existing.thinkContent === "string" &&
    existing.thinkContent.length > 0 &&
    typeof merged.thinkContent === "string" &&
    merged.thinkContent.length < existing.thinkContent.length &&
    existing.thinkContent.startsWith(merged.thinkContent)
  ) {
    merged.thinkContent = existing.thinkContent;
  }

  return merged;
}