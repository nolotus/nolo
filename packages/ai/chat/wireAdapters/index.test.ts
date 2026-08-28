import { describe, expect, test } from "bun:test";
import {
  chatWireAdapters,
  getChatWireAdapter,
  registerChatWireAdapter,
  resolveChatAdapter,
} from "./index";
import { anthropicAdapter } from "./anthropicAdapter";
import { codexAdapter } from "./codexAdapter";

describe("wireAdapters index", () => {
  test("default registry contains browser-safe responses/completions only", () => {
    // anthropic/codex are NOT statically registered: they transitively import
    // node:crypto and would break the web (browser) build.
    expect(Object.keys(chatWireAdapters).sort()).toEqual(
      ["completions", "responses"].sort(),
    );
  });

  test("getChatWireAdapter returns registered adapters", () => {
    expect(getChatWireAdapter("responses")).toBe(chatWireAdapters.responses);
    expect(getChatWireAdapter("completions")).toBe(chatWireAdapters.completions);
  });

  test("unregistered wire throws with a registration hint", () => {
    expect(() => getChatWireAdapter("codex")).toThrow(/registerChatWireAdapter/);
  });

  test("registerChatWireAdapter enables node-side wires", () => {
    registerChatWireAdapter("anthropic", anthropicAdapter);
    registerChatWireAdapter("codex", codexAdapter);
    expect(getChatWireAdapter("anthropic")).toBe(anthropicAdapter);
    expect(getChatWireAdapter("codex")).toBe(codexAdapter);
  });

  test("registerChatWireAdapter rejects wire/adapter mismatch", () => {
    expect(() => registerChatWireAdapter("responses", anthropicAdapter)).toThrow(
      /adapter\.wire/,
    );
  });

  test("resolveChatAdapter resolves wire and gets adapter", () => {
    const adapter = resolveChatAdapter({ cliProvider: "codex" });
    expect(adapter.wire).toBe("codex");

    const anthropicAdapterResolved = resolveChatAdapter({ provider: "anthropic" });
    expect(anthropicAdapterResolved.wire).toBe("anthropic");
  });
});
