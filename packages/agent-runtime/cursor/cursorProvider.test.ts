import { describe, expect, test } from "bun:test";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { executeLocalToolWithPolicy } from "../localToolPolicy";
import {
  createLocalWorkspaceToolExecutors,
  internalSearchWorkspace,
  internalListWorkspaceEntries,
} from "../localWorkspaceTools";

import {
  AgentClientMessageSchema,
  AgentRunRequestSchema,
  AgentServerMessageSchema,
  ConversationActionSchema,
  InteractionUpdateSchema,
  UserMessageActionSchema,
  UserMessageSchema,
} from "./agent_pb";

import {
  buildCursorRunRequestBytes,
  processCursorServerMessage,
  createCursorProvider,
  createStreamState,
  endCurrentTextBlock,
  endCurrentThinkingBlock,
  isCursorOAuthAgent,
  buildMcpToolDefinitions,
  buildReadResultFromToolResult,
  buildShellResultFromToolResult,
  handleExecServerMessage,
  resolveCursorWireModelId,
  CURSOR_API_URL,
  CURSOR_CLIENT_VERSION,
  type CursorProviderOptions,
} from "./cursorProvider";
import type { AgentRuntimeChatMessage } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessages(text: string): AgentRuntimeChatMessage[] {
  return [{ role: "user", content: text }];
}

function makeMultiTurnMessages(): AgentRuntimeChatMessage[] {
  return [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    { role: "user", content: "How are you?" },
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cursorProvider", () => {
  // ── isCursorOAuthAgent ──

  test("isCursorOAuthAgent detects cursor apiKeyRef", () => {
    expect(isCursorOAuthAgent({ apiKeyRef: "cursor" })).toBe(true);
    expect(isCursorOAuthAgent({ apiKeyRef: "CURSOR" })).toBe(true);
    expect(isCursorOAuthAgent({ apiKeyRef: " cursor " })).toBe(true);
    expect(isCursorOAuthAgent({ apiKeyRef: "claude" })).toBe(false);
    expect(isCursorOAuthAgent({ apiKeyRef: undefined })).toBe(false);
  });

  // ── buildCursorRunRequestBytes ──

  test("buildCursorRunRequestBytes produces valid protobuf AgentClientMessage", () => {
    const { requestBytes, blobStore } = buildCursorRunRequestBytes({
      model: "gpt-4",
      systemPrompt: "You are a helpful assistant.",
      messages: makeMessages("say hi"),
    });

    // Should decode back as AgentClientMessage
    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    expect(clientMsg.message.case).toBe("runRequest");

    const runReq = clientMsg.message.value as any;
    expect(runReq.conversationId).toBeTruthy();
    expect(runReq.modelDetails.modelId).toBe("gpt-4");
    expect(runReq.requestedModel.modelId).toBe("gpt-4");

    // Action should be userMessageAction when there is user text
    expect(runReq.action.action.case).toBe("userMessageAction");
    const userAction = runReq.action.action.value as any;
    expect(userAction.userMessage.text).toBe("say hi");

    // blobStore should have entries (system prompt + history)
    expect(blobStore.size).toBeGreaterThan(0);
  });

  test("buildCursorRunRequestBytes uses resumeAction when no user text", () => {
    const { requestBytes } = buildCursorRunRequestBytes({
      model: "gpt-4",
      messages: [{ role: "assistant", content: "previous response" }],
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.action.action.case).toBe("resumeAction");
  });

  test("buildCursorRunRequestBytes builds multi-turn history with rootPromptMessagesJson and turns", () => {
    const messages = makeMultiTurnMessages();
    const { requestBytes, blobStore } = buildCursorRunRequestBytes({
      model: "gpt-4",
      systemPrompt: "Be concise.",
      messages,
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;

    // rootPromptMessagesJson should have: system prompt + user "Hello" + assistant "Hi there!"
    // (excludes the active user message "How are you?")
    expect(runReq.conversationState.rootPromptMessagesJson.length).toBeGreaterThanOrEqual(3);

    // turns should have 1 turn (the "Hello" → "Hi there!" exchange)
    expect(runReq.conversationState.turns.length).toBe(1);

    // Active user message "How are you?" should be in the action
    expect(runReq.action.action.case).toBe("userMessageAction");
    const userAction = runReq.action.action.value as any;
    expect(userAction.userMessage.text).toBe("How are you?");

    // blobStore should have entries for all blobs
    expect(blobStore.size).toBeGreaterThan(2);
  });

  test("buildCursorRunRequestBytes uses deterministic conversationId when provided", () => {
    const { requestBytes } = buildCursorRunRequestBytes({
      model: "gpt-4",
      messages: makeMessages("hi"),
      conversationId: "fixed-conv-id",
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.conversationId).toBe("fixed-conv-id");
  });

  test("resolveCursorWireModelId maps legacy catalog ids onto GetUsableModels wire ids", () => {
    // First-party Cursor Models pool — bare ids must NOT go to the wire.
    expect(resolveCursorWireModelId("cursor-grok-4.5")).toBe("cursor-grok-4.5-high");
    expect(resolveCursorWireModelId("cursor-grok-4.5-fast")).toBe(
      "cursor-grok-4.5-high-fast",
    );
    expect(resolveCursorWireModelId("cursor-composer-2.5")).toBe("composer-2.5-fast");
    expect(resolveCursorWireModelId("grok-4.5")).toBe("cursor-grok-4.5-high");
    // Already-correct wire ids pass through.
    expect(resolveCursorWireModelId("cursor-grok-4.5-high")).toBe(
      "cursor-grok-4.5-high",
    );
    expect(resolveCursorWireModelId("composer-2.5-fast")).toBe("composer-2.5-fast");
    // Third-party convenience aliases.
    expect(resolveCursorWireModelId("cursor-claude-4.6-sonnet")).toBe(
      "claude-4.6-sonnet-medium",
    );
    expect(resolveCursorWireModelId("cursor-gemini-3.1-pro")).toBe("gemini-3.1-pro");
  });

  test("buildCursorRunRequestBytes remaps legacy cursor-grok-4.5 onto cursor-grok-4.5-high", () => {
    const { requestBytes } = buildCursorRunRequestBytes({
      model: "cursor-grok-4.5",
      messages: makeMessages("say hi"),
    });
    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.modelDetails.modelId).toBe("cursor-grok-4.5-high");
    expect(runReq.requestedModel.modelId).toBe("cursor-grok-4.5-high");
  });

  // ── image input ──

  test("buildCursorRunRequestBytes packs image_url parts into userMessage.selectedContext.selectedImages", () => {
    // 8×8 transparent PNG, base64-encoded
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsMJTgAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;

    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "what is in this image?" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ];

    const { requestBytes } = buildCursorRunRequestBytes({
      model: "cursor-grok-4.5",
      messages,
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.action.action.case).toBe("userMessageAction");
    const userAction = runReq.action.action.value as any;
    expect(userAction.userMessage.text).toBe("what is in this image?");
    // image_url must survive into selectedContext.selectedImages, not be dropped
    const selectedImages = userAction.userMessage.selectedContext?.selectedImages ?? [];
    expect(selectedImages.length).toBe(1);
    const img = selectedImages[0];
    expect(img.mimeType).toBe("image/png");
    // data case carries the raw bytes; blobId case would mean the data was not inlined
    expect(img.dataOrBlobId.case).toBe("data");
  });

  test("buildCursorRunRequestBytes packs an image-only user message (no text part)", () => {
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsMJTgAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    // Pure-image message — the most direct form of the bug being fixed: an
    // image with no accompanying text must still be packed, not dropped.
    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: dataUrl } }],
      },
    ];

    const { requestBytes } = buildCursorRunRequestBytes({
      model: "cursor-grok-4.5",
      messages,
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.action.action.case).toBe("userMessageAction");
    const userAction = runReq.action.action.value as any;
    // No text part means userMessage.text is empty, but the image still lands
    // in selectedContext.selectedImages — proving image-only messages survive.
    expect(userAction.userMessage.text).toBe("");
    const selectedImages = userAction.userMessage.selectedContext?.selectedImages ?? [];
    expect(selectedImages.length).toBe(1);
    expect(selectedImages[0].mimeType).toBe("image/png");
  });

  test("buildCursorRunRequestBytes keeps image_url in historical user turns via ConversationTurn", () => {
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsMJTgAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "remember this image" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
      { role: "assistant", content: "got it" },
      { role: "user", content: "now describe it" },
    ];

    const { requestBytes, blobStore } = buildCursorRunRequestBytes({
      model: "cursor-grok-4.5",
      messages,
    });

    const clientMsg = fromBinary(AgentClientMessageSchema, requestBytes);
    const runReq = clientMsg.message.value as any;
    expect(runReq.conversationState.turns.length).toBe(1);
    expect(runReq.action.action.case).toBe("userMessageAction");

    // Robust assertion: at least one stored blob carries the image mime type,
    // which only happens if the historical-turn image was packed (pure-text
    // turns never emit "image/png"). This guards against the historical-turn
    // image being silently dropped. Scanning for the ASCII string "image/png"
    // in a protobuf blob is safe because non-fatal UTF-8 decoding preserves
    // all-ASCII byte sequences even among non-UTF-8 bytes.
    const hasImageBlob = Array.from(blobStore.values()).some((bytes) =>
      new TextDecoder("utf-8", { fatal: false }).decode(bytes).includes("image/png"),
    );
    expect(hasImageBlob).toBe(true);
  });

  // ── processCursorServerMessage ──

  test("processCursorServerMessage accumulates textDelta", () => {
    const state = createStreamState();
    const deltas: string[] = [];

    // Build an AgentServerMessage with interactionUpdate → textDelta
    const update = create(InteractionUpdateSchema, {
      message: {
        case: "textDelta",
        value: { text: "Hello" },
      },
    } as any);
    const serverMsg = create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });

    processCursorServerMessage(serverMsg, state, (d) => deltas.push(d));
    // The text delta opens a currentTextBlock but does not close it until a
    // boundary (thinkingDelta/tool/turnEnded) arrives.
    expect(state.currentTextBlock?.text).toBe("Hello");
    expect(deltas).toEqual(["Hello"]);
  });

  test("processCursorServerMessage accumulates thinkingDelta", () => {
    const state = createStreamState();
    const reasoning: string[] = [];

    const update = create(InteractionUpdateSchema, {
      message: {
        case: "thinkingDelta",
        value: { text: "hmm" },
      },
    } as any);
    const serverMsg = create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });

    processCursorServerMessage(serverMsg, state, undefined, (r) => reasoning.push(r));
    expect(state.currentThinkingBlock?.thinking).toBe("hmm");
    expect(reasoning).toEqual(["hmm"]);
  });

  test("processCursorServerMessage handles turnEnded", () => {
    const state = createStreamState();

    const update = create(InteractionUpdateSchema, {
      message: { case: "turnEnded", value: {} },
    } as any);
    const serverMsg = create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });

    processCursorServerMessage(serverMsg, state);
    expect(state.done).toBe(true);
    expect(state.stopReason).toBe("stop");
  });

  test("processCursorServerMessage accumulates tokenDelta for usage", () => {
    const state = createStreamState();

    const update = create(InteractionUpdateSchema, {
      message: { case: "tokenDelta", value: { tokens: 42 } },
    } as any);
    const serverMsg = create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });

    processCursorServerMessage(serverMsg, state);
    expect(state.outputTokens).toBe(42);
  });

  test("processCursorServerMessage ignores non-interactionUpdate messages", () => {
    const state = createStreamState();
    const serverMsg = create(AgentServerMessageSchema, {
      message: { case: "conversationCheckpointUpdate", value: {} as any },
    });

    processCursorServerMessage(serverMsg, state);
    expect(state.blocks).toEqual([]); // unchanged
  });

  // ── createCursorProvider ──

  test("createCursorProvider returns AgentRuntimeProvider with model and complete", () => {
    const provider = createCursorProvider({
      accessToken: "test-token",
      model: "gpt-4",
    });
    expect(provider.model).toBe("gpt-4");
    expect(typeof provider.complete).toBe("function");
  });

  // ── Constants ──

  test("CURSOR_API_URL points to api2.cursor.sh", () => {
    expect(CURSOR_API_URL).toBe("https://api2.cursor.sh");
  });

  test("CURSOR_CLIENT_VERSION starts with cli-", () => {
    expect(CURSOR_CLIENT_VERSION.startsWith("cli-")).toBe(true);
  });

  // ── Protobuf round-trip ──

  test("AgentServerMessage can be encoded and decoded", () => {
    const update = create(InteractionUpdateSchema, {
      message: { case: "textDelta", value: { text: "test" } },
    } as any);
    const msg = create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });
    const bytes = toBinary(AgentServerMessageSchema, msg);
    const back = fromBinary(AgentServerMessageSchema, bytes);
    expect(back.message.case).toBe("interactionUpdate");
  });

  test("UserMessageSchema encodes text and messageId", () => {
    const userMsg = create(UserMessageSchema, {
      text: "hello world",
      messageId: "msg-123",
    });
    const bytes = toBinary(UserMessageSchema, userMsg);
    const back = fromBinary(UserMessageSchema, bytes);
    expect(back.text).toBe("hello world");
    expect(back.messageId).toBe("msg-123");
  });

  // ── buildMcpToolDefinitions ──

  test("buildMcpToolDefinitions converts OpenAI tools to McpToolDefinition[]", () => {
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "readFile",
          description: "Read a file",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          },
        },
      },
    ];
    const defs = buildMcpToolDefinitions(tools);
    expect(defs).toHaveLength(1);
    const def = defs[0];
    expect(def.name).toBe("readFile");
    expect(def.toolName).toBe("readFile");
    expect(def.providerIdentifier).toBe("nolo");
    expect(def.description).toBe("Read a file");
    expect(def.inputSchema.length).toBeGreaterThan(0);
  });

  test("buildMcpToolDefinitions returns empty array for no tools", () => {
    expect(buildMcpToolDefinitions(undefined)).toEqual([]);
    expect(buildMcpToolDefinitions([])).toEqual([]);
  });

  // ── buildXxxResultFromToolResult ──

  test("buildReadResultFromToolResult builds success ReadResult", () => {
    const result = buildReadResultFromToolResult("/tmp/a.txt", {
      content: "hello\nworld",
      metadata: { totalLines: 2, truncated: false },
    });
    expect(result.result.case).toBe("success");
    if (result.result.case === "success") {
      const success = result.result.value;
      expect(success.path).toBe("/tmp/a.txt");
      expect(success.totalLines).toBe(2);
      if (success.output.case === "content") {
        expect(success.output.value).toBe("hello\nworld");
      }
    }
  });

  test("buildReadResultFromToolResult builds error ReadResult when metadata.error set", () => {
    const result = buildReadResultFromToolResult("/tmp/missing.txt", {
      content: "not found",
      metadata: { error: "ENOENT" },
    });
    expect(result.result.case).toBe("error");
    if (result.result.case === "error") {
      expect(result.result.value.path).toBe("/tmp/missing.txt");
      expect(result.result.value.error).toBe("not found");
    }
  });

  test("buildShellResultFromToolResult builds success ShellResult", () => {
    const result = buildShellResultFromToolResult(
      { command: "ls", workingDirectory: "/tmp" },
      { content: "file1\nfile2", metadata: { exitCode: 0 } },
    );
    expect(result.result.case).toBe("success");
    if (result.result.case === "success") {
      const success = result.result.value;
      expect(success.exitCode).toBe(0);
      expect(success.stdout).toBe("file1\nfile2");
    }
  });

  test("buildShellResultFromToolResult builds failure ShellResult on non-zero exit", () => {
    const result = buildShellResultFromToolResult(
      { command: "false", workingDirectory: "/tmp" },
      { content: "boom", metadata: { exitCode: 1 } },
    );
    expect(result.result.case).toBe("failure");
    if (result.result.case === "failure") {
      const failure = result.result.value;
      expect(failure.exitCode).toBe(1);
      expect(failure.stderr).toBe("boom");
    }
  });

  // ── handleExecServerMessage exec bridge ──

  function makeMockH2Request() {
    const written: Buffer[] = [];
    return {
      stream: {
        write(buf: Buffer) {
          written.push(buf);
        },
        closed: false,
      },
      written,
      lastExecClientMessage(): any {
        const frame = written[written.length - 1];
        if (!frame) return null;
        // frame = 1 byte flags + 4 byte len + payload (AgentClientMessage)
        const payload = frame.subarray(5);
        const clientMsg = fromBinary(AgentClientMessageSchema, payload);
        return clientMsg.message.value as any;
      },
    };
  }

  function makeExecMsg(messageCase: string, value: any): any {
    return {
      id: 1,
      execId: "exec-1",
      message: { case: messageCase, value },
    };
  }

  /**
   * Build a CursorExecContext with a fresh stream state + blocks array so
   * tests exercise the real block-array path (synthesizeCursorExecToolCall
   * pushes onto `blocks` and closes any open text/thinking block on `state`).
   */
  function makeExecCtx(
    executeTool: any,
    toolCalls: any[] = [],
    tools: any[] = [],
    onToolEvent?: any,
    toolEventRound?: number,
    callbacks?: {
      searchWorkspace?: any;
      listWorkspaceEntries?: any;
    },
  ) {
    const state = createStreamState();
    return {
      tools,
      executeTool,
      toolCalls,
      blocks: state.blocks,
      state,
      ...(callbacks?.searchWorkspace ? { searchWorkspace: callbacks.searchWorkspace } : {}),
      ...(callbacks?.listWorkspaceEntries ? { listWorkspaceEntries: callbacks.listWorkspaceEntries } : {}),
      ...(onToolEvent ? { onToolEvent } : {}),
      ...(typeof toolEventRound === "number" ? { toolEventRound } : {}),
    };
  }

  test("handleExecServerMessage bridges readArgs to readFile tool call", async () => {
    const mock = makeMockH2Request();
    const toolCalls: any[] = [];
    const executeTool = async (call: any) => {
      expect(call.name).toBe("readFile");
      expect(JSON.parse(call.arguments)).toEqual({ path: "/tmp/a.txt" });
      return { content: "hello\nworld", metadata: { totalLines: 2 } };
    };
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/a.txt", toolCallId: "tc-1" }),
      mock.stream as any,
      makeExecCtx(executeTool, toolCalls),
    );
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe("readFile");
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("readResult");
    const readResult = execClient.message.value;
    expect(readResult.result.case).toBe("success");
    expect(readResult.result.value.path).toBe("/tmp/a.txt");
  });

  test("handleExecServerMessage bridges shellArgs to execShell tool call", async () => {
    const mock = makeMockH2Request();
    const toolCalls: any[] = [];
    const executeTool = async (call: any) => {
      expect(call.name).toBe("execShell");
      expect(JSON.parse(call.arguments).command).toBe("ls");
      return { content: "file1\nfile2", metadata: { exitCode: 0 } };
    };
    await handleExecServerMessage(
      makeExecMsg("shellArgs", {
        command: "ls",
        workingDirectory: "/tmp",
        toolCallId: "tc-2",
      }),
      mock.stream as any,
      makeExecCtx(executeTool, toolCalls),
    );
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe("execShell");
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("shellResult");
    expect(execClient.message.value.result.case).toBe("success");
  });

  test("handleExecServerMessage bridges grepArgs to searchWorkspace callback", async () => {
    const mock = makeMockH2Request();
    const toolCalls: any[] = [];
    const searchWorkspace = async (args: any) => {
      expect(args.query).toBe("hello");
      expect(args.path).toBe("/tmp");
      return { content: "/tmp/a.txt:3:hello", metadata: {} };
    };
    await handleExecServerMessage(
      makeExecMsg("grepArgs", {
        pattern: "hello",
        path: "/tmp",
        toolCallId: "tc-3",
      }),
      mock.stream as any,
      makeExecCtx(undefined, toolCalls, [], undefined, undefined, { searchWorkspace }),
    );
    expect(toolCalls[0].function.name).toBe("searchWorkspace");
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("grepResult");
    expect(execClient.message.value.result.case).toBe("success");
  });

  // P2b-Cursor：穿透验收（onActionGate → options → execCtx → 写入门）。
  // 契约：未批准（cancelled）→ executeTool 不执行；批准 → 同 ctx 后续写静默。
  test("handleExecServerMessage writeArgs fires onActionGate; unapproved write is blocked", async () => {
    const mock = makeMockH2Request();
    let executeToolCalls = 0;
    let gateCalled = 0;
    const executeTool = async () => {
      executeToolCalls += 1;
      return { content: "ok" };
    };
    const ctx = {
      ...makeExecCtx(executeTool, []),
      onActionGate: async (gate: any) => {
        gateCalled += 1;
        expect(gate.toolName).toBe("writeFile");
        expect(gate.kind).toBe("confirm");
        return { content: "denied", metadata: { actionGateResult: { status: "cancelled" } } };
      },
    };
    await handleExecServerMessage(
      makeExecMsg("writeArgs", { path: "/tmp/gate.txt", content: "x", toolCallId: "tc-w1" }),
      mock.stream as any,
      ctx,
    );
    expect(gateCalled).toBe(1);
    expect(executeToolCalls).toBe(0);
  });

  test("handleExecServerMessage writeArgs: session-approved ctx skips the gate on subsequent writes", async () => {
    const mock = makeMockH2Request();
    let executeToolCalls = 0;
    let gateCalled = 0;
    const executeTool = async () => {
      executeToolCalls += 1;
      return { content: "ok" };
    };
    const ctx = {
      ...makeExecCtx(executeTool, []),
      onActionGate: async (gate: any) => {
        gateCalled += 1;
        return { content: "approved", metadata: { actionGateResult: { status: "completed" } } };
      },
    };
    await handleExecServerMessage(
      makeExecMsg("writeArgs", { path: "/tmp/gate1.txt", content: "1", toolCallId: "tc-1" }),
      mock.stream as any,
      ctx,
    );
    expect(executeToolCalls).toBe(1);
    expect(gateCalled).toBe(1);
    await handleExecServerMessage(
      makeExecMsg("writeArgs", { path: "/tmp/gate2.txt", content: "2", toolCallId: "tc-2" }),
      mock.stream as any,
      ctx,
    );
    // ctx 级会话放行：第二次写不再询问
    expect(executeToolCalls).toBe(2);
    expect(gateCalled).toBe(1);
  });

  test("handleExecServerMessage bridges mcpArgs to nolo tool call", async () => {
    const mock = makeMockH2Request();
    const toolCalls: any[] = [];
    // Build a McpArgs with args map encoded as protobuf Value (string).
    const { ValueSchema } = require("@bufbuild/protobuf/wkt");
    const { toBinary, fromJson } = require("@bufbuild/protobuf");
    const argBytes = toBinary(ValueSchema, fromJson(ValueSchema, "value-1"));
    const executeTool = async (call: any) => {
      expect(call.name).toBe("myCustomTool");
      expect(JSON.parse(call.arguments).key).toBe("value-1");
      return { content: "ok", metadata: {} };
    };
    await handleExecServerMessage(
      makeExecMsg("mcpArgs", {
        name: "myCustomTool",
        toolName: "myCustomTool",
        toolCallId: "tc-4",
        providerIdentifier: "nolo",
        args: { key: argBytes },
      }),
      mock.stream as any,
      makeExecCtx(executeTool, toolCalls),
    );
    expect(toolCalls[0].function.name).toBe("myCustomTool");
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("mcpResult");
    expect(execClient.message.value.result.case).toBe("success");
  });

  test("handleExecServerMessage requestContextArgs includes injected tools", async () => {
    const mock = makeMockH2Request();
    const tools = buildMcpToolDefinitions([
      {
        type: "function",
        function: {
          name: "readFile",
          description: "read",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        },
      },
    ]);
    await handleExecServerMessage(
      makeExecMsg("requestContextArgs", {}),
      mock.stream as any,
      makeExecCtx(undefined, [], tools),
    );
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("requestContextResult");
    const ctx = execClient.message.value.result.value.requestContext;
    expect(ctx.tools.length).toBe(1);
    expect(ctx.tools[0].name).toBe("readFile");
  });

  test("handleExecServerMessage rejected path when executeTool absent (readArgs)", async () => {
    const mock = makeMockH2Request();
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/x.txt", toolCallId: "tc-5" }),
      mock.stream as any,
      makeExecCtx(undefined),
    );
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.value.result.case).toBe("rejected");
  });

  test("handleExecServerMessage error path when executeTool throws (shellArgs)", async () => {
    const mock = makeMockH2Request();
    const executeTool = async () => {
      throw new Error("boom");
    };
    const ctx = makeExecCtx(executeTool);
    await handleExecServerMessage(
      makeExecMsg("shellArgs", { command: "bad", workingDirectory: "/tmp", toolCallId: "tc-6" }),
      mock.stream as any,
      ctx,
    );
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.value.result.case).toBe("failure");
    expect(execClient.message.value.result.value.stderr).toBe("boom");
    // Critical: catch path must stamp block.result so localLoop does not throw
    // "unexecuted toolCall".
    expect(ctx.blocks).toHaveLength(1);
    expect(ctx.blocks[0].type).toBe("toolCall");
    expect((ctx.blocks[0] as any).result?.content).toBe("boom");
    expect((ctx.blocks[0] as any).result?.metadata?.error).toBe(true);
  });

  test("handleExecServerMessage mcpArgs editFile throw still fills block.result (no unexecuted toolCall)", async () => {
    const mock = makeMockH2Request();
    const executeTool = async (call: any) => {
      expect(call.name).toBe("editFile");
      throw new Error("editFile failed: expectedReplacements mismatch");
    };
    const ctx = makeExecCtx(executeTool);
    await handleExecServerMessage(
      makeExecMsg("mcpArgs", {
        toolName: "editFile",
        toolCallId: "call-editfile-1",
        args: {},
      }),
      mock.stream as any,
      ctx,
    );
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.value.result.case).toBe("error");
    expect(ctx.blocks).toHaveLength(1);
    expect(ctx.blocks[0].type).toBe("toolCall");
    expect((ctx.blocks[0] as any).toolCall.function.name).toBe("editFile");
    expect((ctx.blocks[0] as any).result?.content).toContain("expectedReplacements mismatch");
    expect((ctx.blocks[0] as any).result?.metadata?.error).toBe(true);
  });

  test("handleExecServerMessage mcpArgs without executeTool fills block.result (toolNotFound)", async () => {
    const mock = makeMockH2Request();
    const ctx = makeExecCtx(undefined);
    await handleExecServerMessage(
      makeExecMsg("mcpArgs", {
        toolName: "editFile",
        toolCallId: "call-editfile-2",
        args: {},
      }),
      mock.stream as any,
      ctx,
    );
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.value.result.case).toBe("toolNotFound");
    expect(ctx.blocks).toHaveLength(1);
    expect((ctx.blocks[0] as any).result?.metadata?.error).toBe(true);
    expect((ctx.blocks[0] as any).result?.metadata?.reason).toBe("toolNotFound");
  });

  // ---------------------------------------------------------------------------
  // Block ordering — text→tool→text interleaving (ported from oh-my-pi :2092/:2141)
  // ---------------------------------------------------------------------------

  function makeTextDeltaMsg(text: string): any {
    const update = create(InteractionUpdateSchema, {
      message: { case: "textDelta", value: { text } },
    } as any);
    return create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });
  }

  function makeThinkingDeltaMsg(text: string): any {
    const update = create(InteractionUpdateSchema, {
      message: { case: "thinkingDelta", value: { text } },
    } as any);
    return create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });
  }

  function makeThinkingCompletedMsg(): any {
    const update = create(InteractionUpdateSchema, {
      message: { case: "thinkingCompleted", value: {} },
    } as any);
    return create(AgentServerMessageSchema, {
      message: { case: "interactionUpdate", value: update },
    });
  }

  test("processCursorServerMessage creates text block on first textDelta", () => {
    const state = createStreamState();
    processCursorServerMessage(makeTextDeltaMsg("Hello"), state);
    expect(state.currentTextBlock).not.toBeNull();
    expect(state.currentTextBlock!.text).toBe("Hello");
    // block not yet pushed — stays current until a boundary
    expect(state.blocks).toHaveLength(0);
  });

  test("processCursorServerMessage appends subsequent textDelta to current block", () => {
    const state = createStreamState();
    processCursorServerMessage(makeTextDeltaMsg("Hello"), state);
    processCursorServerMessage(makeTextDeltaMsg(" world"), state);
    expect(state.currentTextBlock!.text).toBe("Hello world");
    expect(state.blocks).toHaveLength(0);
  });

  test("endCurrentTextBlock pushes and clears current text block", () => {
    const state = createStreamState();
    processCursorServerMessage(makeTextDeltaMsg("Hello"), state);
    endCurrentTextBlock(state);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual({ type: "text", text: "Hello" });
    expect(state.currentTextBlock).toBeNull();
    // idempotent
    endCurrentTextBlock(state);
    expect(state.blocks).toHaveLength(1);
  });

  test("processCursorServerMessage ends text block when thinkingDelta arrives", () => {
    const state = createStreamState();
    processCursorServerMessage(makeTextDeltaMsg("answer"), state);
    processCursorServerMessage(makeThinkingDeltaMsg("reasoning"), state);
    // text block closed and pushed; thinking now current
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual({ type: "text", text: "answer" });
    expect(state.currentThinkingBlock!.thinking).toBe("reasoning");
    expect(state.currentTextBlock).toBeNull();
  });

  test("processCursorServerMessage ends thinking block when textDelta arrives", () => {
    const state = createStreamState();
    processCursorServerMessage(makeThinkingDeltaMsg("hmm"), state);
    processCursorServerMessage(makeTextDeltaMsg("reply"), state);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual({ type: "thinking", thinking: "hmm" });
    expect(state.currentTextBlock!.text).toBe("reply");
    expect(state.currentThinkingBlock).toBeNull();
  });

  test("thinkingCompleted closes the thinking block", () => {
    const state = createStreamState();
    processCursorServerMessage(makeThinkingDeltaMsg("hmm"), state);
    processCursorServerMessage(makeThinkingCompletedMsg(), state);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual({ type: "thinking", thinking: "hmm" });
    expect(state.currentThinkingBlock).toBeNull();
  });

  test("synthesizeCursorExecToolCall ends current text block before inserting toolCall", async () => {
    const mock = makeMockH2Request();
    const executeTool = async () => ({ content: "ok", metadata: {} });
    const ctx = makeExecCtx(executeTool);

    // simulate text streaming first
    processCursorServerMessage(makeTextDeltaMsg("Let me read the file."), ctx.state);
    expect(ctx.state.currentTextBlock).not.toBeNull();

    // then exec readArgs arrives → synthesize ends text block, pushes toolCall
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/a.txt", toolCallId: "tc-1" }),
      mock.stream as any,
      ctx,
    );

    // block order: [text, toolCall] — text before tool, preserving temporal order
    expect(ctx.state.blocks).toHaveLength(2);
    expect(ctx.state.blocks[0]).toEqual({ type: "text", text: "Let me read the file." });
    expect(ctx.state.blocks[1].type).toBe("toolCall");
    expect(ctx.state.currentTextBlock).toBeNull();
  });

  test("synthesizeCursorExecToolCall ends current thinking block before inserting toolCall", async () => {
    const mock = makeMockH2Request();
    const executeTool = async () => ({ content: "ok", metadata: {} });
    const ctx = makeExecCtx(executeTool);

    processCursorServerMessage(makeThinkingDeltaMsg("pondering"), ctx.state);
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/a.txt", toolCallId: "tc-1" }),
      mock.stream as any,
      ctx,
    );

    expect(ctx.state.blocks).toHaveLength(2);
    expect(ctx.state.blocks[0]).toEqual({ type: "thinking", thinking: "pondering" });
    expect(ctx.state.blocks[1].type).toBe("toolCall");
    expect(ctx.state.currentThinkingBlock).toBeNull();
  });

  test("handleExecServerMessage fills block result after inline exec (readArgs)", async () => {
    const mock = makeMockH2Request();
    const executeTool = async () => ({ content: "file contents", metadata: { totalLines: 3 } });
    const ctx = makeExecCtx(executeTool);

    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/a.txt", toolCallId: "tc-1" }),
      mock.stream as any,
      ctx,
    );

    expect(ctx.state.blocks).toHaveLength(1);
    const block = ctx.state.blocks[0];
    expect(block.type).toBe("toolCall");
    if (block.type === "toolCall") {
      expect(block.result).toBeDefined();
      expect(block.result!.content).toBe("file contents");
      expect(block.result!.metadata).toEqual({ totalLines: 3 });
      expect(block.toolCall.function.name).toBe("readFile");
      expect(block.toolCall.id).toBe("tc-1");
    }
  });

  test("handleExecServerMessage fills block result after inline exec (mcpArgs)", async () => {
    const mock = makeMockH2Request();
    const { ValueSchema } = require("@bufbuild/protobuf/wkt");
    const { toBinary, fromJson } = require("@bufbuild/protobuf");
    const argBytes = toBinary(ValueSchema, fromJson(ValueSchema, "v"));
    const executeTool = async () => ({ content: "mcp ok", metadata: {} });
    const ctx = makeExecCtx(executeTool);

    await handleExecServerMessage(
      makeExecMsg("mcpArgs", {
        toolName: "myTool",
        toolCallId: "tc-mcp",
        args: { k: argBytes },
      }),
      mock.stream as any,
      ctx,
    );

    const block = ctx.state.blocks[0];
    expect(block.type).toBe("toolCall");
    if (block.type === "toolCall") {
      expect(block.result?.content).toBe("mcp ok");
      expect(block.toolCall.function.name).toBe("myTool");
    }
  });

  test("text→tool→text→tool ordering preserved across multiple exec", async () => {
    const mock = makeMockH2Request();
    const executeTool = async () => ({ content: "r", metadata: {} });
    const ctx = makeExecCtx(executeTool);

    // text1
    processCursorServerMessage(makeTextDeltaMsg("first text"), ctx.state);
    // tool1 (readArgs)
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/a", toolCallId: "tc-1" }),
      mock.stream as any,
      ctx,
    );
    // text2
    processCursorServerMessage(makeTextDeltaMsg("second text"), ctx.state);
    // tool2 (lsArgs)
    await handleExecServerMessage(
      makeExecMsg("lsArgs", { path: "/b", toolCallId: "tc-2" }),
      mock.stream as any,
      ctx,
    );
    // flush trailing text
    endCurrentTextBlock(ctx.state);

    // [text, toolCall, text, toolCall]
    expect(ctx.state.blocks).toHaveLength(4);
    expect(ctx.state.blocks[0]).toEqual({ type: "text", text: "first text" });
    expect(ctx.state.blocks[1].type).toBe("toolCall");
    expect(ctx.state.blocks[2]).toEqual({ type: "text", text: "second text" });
    expect(ctx.state.blocks[3].type).toBe("toolCall");
  });

  test("streamCursorChat serialization: content joins text blocks, tool_calls from toolCall blocks", () => {
    // Simulate the serialization logic streamCursorChat uses, without a real
    // HTTP/2 stream: build the state, run deltas + exec-free blocks, then
    // apply the same filter/join the provider does.
    const state = createStreamState();
    processCursorServerMessage(makeTextDeltaMsg("A"), state);
    endCurrentTextBlock(state);
    // manually push a toolCall block (bypass exec) to test serialization
    state.blocks.push({
      type: "toolCall",
      toolCall: { id: "x", type: "function", function: { name: "t", arguments: "{}" } },
    });
    processCursorServerMessage(makeTextDeltaMsg("B"), state);
    endCurrentTextBlock(state);

    const content = state.blocks
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    const tool_calls = state.blocks
      .filter(
        (b): b is { type: "toolCall"; toolCall: any; result?: any } => b.type === "toolCall",
      )
      .map((b) => b.toolCall);

    expect(content).toBe("AB");
    expect(tool_calls).toHaveLength(1);
    expect(tool_calls[0].id).toBe("x");
  });

  // ── mid-stream onToolEvent ──

  test("handleExecServerMessage emits tool-call then tool-result around executeTool (readArgs)", async () => {
    const mock = makeMockH2Request();
    const events: any[] = [];
    let executeCallCount = 0;
    const executeTool = async () => {
      executeCallCount += 1;
      // At the moment executeTool is running, only the tool-call event
      // should have been emitted — tool-result must come after.
      expect(events.filter((e) => e.type === "tool-result")).toHaveLength(0);
      return { content: "hello", metadata: { totalLines: 1 } };
    };
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/a.txt", toolCallId: "tc-ev-1" }),
      mock.stream as any,
      makeExecCtx(
        executeTool,
        [],
        [],
        (e: any) => events.push(e),
        3,
      ),
    );
    expect(executeCallCount).toBe(1);
    expect(events.map((e) => e.type)).toEqual(["tool-call", "tool-result"]);
    expect(events[0]).toMatchObject({
      type: "tool-call",
      round: 3,
      toolCallId: "tc-ev-1",
      toolName: "readFile",
    });
    expect(events[0].argumentsPreview).toBe("/tmp/a.txt");
    expect(events[1]).toMatchObject({
      type: "tool-result",
      round: 3,
      toolCallId: "tc-ev-1",
      toolName: "readFile",
      content: "hello",
    });
    expect(events[1].metadata).toEqual({ totalLines: 1 });
  });

  test("handleExecServerMessage emits tool-error when executeTool throws (shellArgs)", async () => {
    const mock = makeMockH2Request();
    const events: any[] = [];
    const executeTool = async () => {
      throw new Error("boom");
    };
    await handleExecServerMessage(
      makeExecMsg("shellArgs", {
        command: "bad",
        workingDirectory: "/tmp",
        toolCallId: "tc-ev-2",
      }),
      mock.stream as any,
      makeExecCtx(
        executeTool,
        [],
        [],
        (e: any) => events.push(e),
        0,
      ),
    );
    expect(events.map((e) => e.type)).toEqual(["tool-call", "tool-error"]);
    expect(events[1]).toMatchObject({
      type: "tool-error",
      toolCallId: "tc-ev-2",
      toolName: "execShell",
      message: "boom",
    });
  });

  test("handleExecServerMessage does NOT emit tool-call for requestContextArgs", async () => {
    const mock = makeMockH2Request();
    const events: any[] = [];
    await handleExecServerMessage(
      makeExecMsg("requestContextArgs", {}),
      mock.stream as any,
      makeExecCtx(undefined, [], [], (e: any) => events.push(e), 0),
    );
    expect(events).toEqual([]);
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.case).toBe("requestContextResult");
  });

  test("handleExecServerMessage does NOT emit tool-call when executeTool absent (rejected path)", async () => {
    const mock = makeMockH2Request();
    const events: any[] = [];
    await handleExecServerMessage(
      makeExecMsg("readArgs", { path: "/tmp/x.txt", toolCallId: "tc-ev-3" }),
      mock.stream as any,
      makeExecCtx(undefined, [], [], (e: any) => events.push(e), 0),
    );
    // No executeTool → no real tool UX → no tool events.
    expect(events).toEqual([]);
    const execClient = mock.lastExecClientMessage();
    expect(execClient.message.value.result.case).toBe("rejected");
  });

  test("onToolEvent defaults round to 0 when toolEventRound omitted", async () => {
    const mock = makeMockH2Request();
    const events: any[] = [];
    const listWorkspaceEntries = async () => ({ content: "ok", metadata: {} });
    await handleExecServerMessage(
      makeExecMsg("lsArgs", { path: "/tmp", toolCallId: "tc-ev-4" }),
      mock.stream as any,
      makeExecCtx(undefined, [], [], (e: any) => events.push(e), undefined, { listWorkspaceEntries }),
    );
    expect(events[0].round).toBe(0);
    expect(events[1].round).toBe(0);
  });

  // ── Dedicated internal callbacks integration (Cursor exec bridge) ──

  test("grepArgs searches a real workspace via searchWorkspace callback", async () => {
    const mock = makeMockH2Request();
    const root = await mkdtemp(join(tmpdir(), "nolo-cursor-grep-"));
    try {
      await mkdir(join(root, "src"), { recursive: true });
      await writeFile(join(root, "a.ts"), "hello world\nsecond line\n", "utf-8");
      await writeFile(join(root, "src", "b.ts"), "no match here\n", "utf-8");
      const searchWorkspace = (args: any) =>
        internalSearchWorkspace({
          workspaceRoot: root,
          ...args,
        });
      await handleExecServerMessage(
        makeExecMsg("grepArgs", {
          pattern: "hello",
          path: ".",
          toolCallId: "tc-real-grep",
        }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { searchWorkspace }),
      );
      const execClient = mock.lastExecClientMessage();
      expect(execClient.message.case).toBe("grepResult");
      const grepResult = execClient.message.value.result;
      expect(grepResult.case).toBe("success");
      // a.ts is hit; src/b.ts is not.
      const text = JSON.stringify(grepResult);
      expect(text).toContain("a.ts");
      expect(text).not.toContain("b.ts");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("lsArgs lists direct children of src via listWorkspaceEntries callback", async () => {
    const mock = makeMockH2Request();
    const root = await mkdtemp(join(tmpdir(), "nolo-cursor-ls-"));
    try {
      await mkdir(join(root, "src", "components"), { recursive: true });
      await writeFile(join(root, "src", "a.ts"), "export const a = 1;\n", "utf-8");
      await writeFile(join(root, "src", "components", "Button.tsx"), "export const Button = () => null;\n", "utf-8");
      const listWorkspaceEntries = (args: any) =>
        internalListWorkspaceEntries({
          workspaceRoot: root,
          ...args,
        });
      await handleExecServerMessage(
        makeExecMsg("lsArgs", { path: "src", toolCallId: "tc-real-ls" }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { listWorkspaceEntries }),
      );
      const execClient = mock.lastExecClientMessage();
      expect(execClient.message.case).toBe("lsResult");
      const lsResult = execClient.message.value.result;
      expect(lsResult.case).toBe("success");
      const rootNode = lsResult.value.directoryTreeRoot;
      // internalListWorkspaceEntries emits direct children relative to the
      // requested dir, so files are "a.ts" and dirs "components/". maxDepth=1
      // keeps Button.tsx out of src's direct children.
      const fileNames = (rootNode.childrenFiles ?? []).map((f: any) => f.name);
      const dirPaths = (rootNode.childrenDirs ?? []).map((d: any) => d.absPath);
      expect(fileNames).toContain("a.ts");
      expect(dirPaths).toContain("src/components");
      // Button.tsx must NOT be a direct child of src (maxDepth=1).
      expect(fileNames).not.toContain("Button.tsx");
      expect(JSON.stringify(rootNode)).not.toContain("Button.tsx");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("mcpArgs cannot invoke internalSearchWorkspace or internalListWorkspaceEntries through generic tool path", async () => {
    const mock = makeMockH2Request();
    const root = await mkdtemp(join(tmpdir(), "nolo-cursor-mcp-"));
    try {
      const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
      const executeTool = async (call: any) =>
        executeLocalToolWithPolicy({
          env: process.env as any,
          agentToolNames: ["readFile"],
          call,
          executors: executors as any,
        });
      for (const internalTool of ["internalSearchWorkspace", "internalListWorkspaceEntries"]) {
        await handleExecServerMessage(
          makeExecMsg("mcpArgs", {
            toolName: internalTool,
            args: {},
            toolCallId: `tc-mcp-${internalTool}`,
          }),
          mock.stream as any,
          makeExecCtx(executeTool),
        );
        const execClient = mock.lastExecClientMessage();
        expect(execClient.message.case).toBe("mcpResult");
        const mcpResult = execClient.message.value;
        expect(mcpResult.result.case).toBe("error");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("grepArgs external path confirmation blocks when declined and passes when confirmed", async () => {
    const mock = makeMockH2Request();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "nolo-ws-"));
    const outsideRoot = await mkdtemp(join(tmpdir(), "nolo-ext-"));
    try {
      await writeFile(join(outsideRoot, "secret.ts"), "secret_token_12345\n", "utf-8");

      let confirmDecision = false;
      const confirmExternalFileAccess = async () => confirmDecision;

      const searchWorkspace = (args: any) =>
        internalSearchWorkspace({
          workspaceRoot,
          confirmExternalFileAccess,
          ...args,
        });

      // 1. Rejected confirmation -> grep error
      await handleExecServerMessage(
        makeExecMsg("grepArgs", {
          pattern: "secret_token",
          path: outsideRoot,
          toolCallId: "tc-ext-grep-reject",
        }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { searchWorkspace }),
      );
      const rejectClient = mock.lastExecClientMessage();
      expect(rejectClient.message.case).toBe("grepResult");
      expect(rejectClient.message.value.result.case).toBe("error");

      // 2. Allowed confirmation -> grep success
      confirmDecision = true;
      await handleExecServerMessage(
        makeExecMsg("grepArgs", {
          pattern: "secret_token",
          path: outsideRoot,
          toolCallId: "tc-ext-grep-allow",
        }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { searchWorkspace }),
      );
      const allowClient = mock.lastExecClientMessage();
      expect(allowClient.message.case).toBe("grepResult");
      expect(allowClient.message.value.result.case).toBe("success");
      expect(JSON.stringify(allowClient.message.value.result)).toContain("secret.ts");
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  test("lsArgs external path confirmation blocks when declined and passes when confirmed", async () => {
    const mock = makeMockH2Request();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "nolo-ws-"));
    const outsideRoot = await mkdtemp(join(tmpdir(), "nolo-ext-"));
    try {
      await writeFile(join(outsideRoot, "secret.ts"), "secret_token_12345\n", "utf-8");

      let confirmDecision = false;
      const confirmExternalFileAccess = async () => confirmDecision;

      const listWorkspaceEntries = (args: any) =>
        internalListWorkspaceEntries({
          workspaceRoot,
          confirmExternalFileAccess,
          ...args,
        });

      // 1. Rejected confirmation -> ls error
      await handleExecServerMessage(
        makeExecMsg("lsArgs", {
          path: outsideRoot,
          toolCallId: "tc-ext-ls-reject",
        }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { listWorkspaceEntries }),
      );
      const rejectClient = mock.lastExecClientMessage();
      expect(rejectClient.message.case).toBe("lsResult");
      expect(rejectClient.message.value.result.case).toBe("error");

      // 2. Allowed confirmation -> ls success
      confirmDecision = true;
      await handleExecServerMessage(
        makeExecMsg("lsArgs", {
          path: outsideRoot,
          toolCallId: "tc-ext-ls-allow",
        }),
        mock.stream as any,
        makeExecCtx(undefined, [], [], undefined, undefined, { listWorkspaceEntries }),
      );
      const allowClient = mock.lastExecClientMessage();
      expect(allowClient.message.case).toBe("lsResult");
      expect(allowClient.message.value.result.case).toBe("success");
      expect(JSON.stringify(allowClient.message.value.result)).toContain("secret.ts");
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});