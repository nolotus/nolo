import { describe, expect, it } from "bun:test";

import { applyMessageStreamingUpsert } from "./messageStreamApply";
import type { Message } from "./types";

const baseMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "msg-1",
  dbKey: "dialog-key-msg-1",
  role: "assistant",
  content: "",
  ...overrides,
});

describe("applyMessageStreamingUpsert", () => {
  it("creates a streaming upsert payload with empty content when no existing record", () => {
    const payload = applyMessageStreamingUpsert(undefined, {
      id: "msg-1",
      dbKey: "dialog-key-msg-1",
      role: "assistant",
      content: "hello",
    });

    expect(payload.id).toBe("msg-1");
    expect(payload.isStreaming).toBe(true);
    expect(payload.content).toBe("hello");
    expect(payload.thinkContent).toBe("");
  });

  it("keeps isStreaming true even if the chunk tries to set it false", () => {
    const payload = applyMessageStreamingUpsert(undefined, {
      id: "msg-1",
      dbKey: "k",
      role: "assistant",
      content: "chunk",
      isStreaming: false,
    });

    expect(payload.isStreaming).toBe(true);
  });

  it("lets a chunk overwrite content while matching whole-object replace (no field merge)", () => {
    const existing = baseMessage({ content: "old", thinkContent: "prev-thought" });
    // Entity-adapter upsert is a whole-object replace, so the legacy reducer
    // did NOT preserve fields the chunk omitted — thinkContent falls back to "".
    const payload = applyMessageStreamingUpsert(existing, {
      id: "msg-1",
      content: "new chunk text",
    });

    expect(payload.content).toBe("new chunk text");
    // chunk omitted dbKey/role but did NOT carry them either — legacy replace
    // behaviour: only the defaults + chunk survive. id comes from the chunk.
    expect(payload.id).toBe("msg-1");
    // thinkContent omitted by chunk → streaming default "" (existing not merged)
    expect(payload.thinkContent).toBe("");
    expect(payload.isStreaming).toBe(true);
  });

  it("defaults content and thinkContent to empty strings when chunk omits them", () => {
    const payload = applyMessageStreamingUpsert(undefined, {
      id: "msg-1",
      dbKey: "k",
      role: "assistant",
    });

    expect(payload.content).toBe("");
    expect(payload.thinkContent).toBe("");
    expect(payload.isStreaming).toBe(true);
  });

  it("overwrites existing thinkContent when the chunk provides one", () => {
    const existing = baseMessage({ thinkContent: "old-thought" });
    const payload = applyMessageStreamingUpsert(existing, {
      id: "msg-1",
      thinkContent: "new-thought",
    });

    expect(payload.thinkContent).toBe("new-thought");
  });
});