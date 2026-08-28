import {
  convertOpenAiMessagesToGemini,
  convertOpenAiToolsToGemini,
  accumulateGeminiChunks,
  accumulateGeminiStream,
  isGemini3Model,
  SKIP_THOUGHT_SIGNATURE,
} from "./geminiNativeShared";

describe("geminiNativeShared", () => {
  describe("isGemini3Model", () => {
    test("matches gemini-3 variants", () => {
      expect(isGemini3Model("gemini-3.1-pro")).toBe(true);
      expect(isGemini3Model("gemini-3-flash-preview")).toBe(true);
      expect(isGemini3Model("gemini-3.5-flash")).toBe(true);
    });

    test("rejects non-gemini-3", () => {
      expect(isGemini3Model("gemini-2.5-flash")).toBe(false);
      expect(isGemini3Model("claude-3-opus")).toBe(false);
      expect(isGemini3Model("gpt-4")).toBe(false);
    });
  });

  describe("convertOpenAiMessagesToGemini", () => {
    test("combines assistant text and function calls in a single valid Gemini model turn without fake user turns", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "inspect" },
          {
            role: "assistant",
            content: "I will inspect first.",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "pwd", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "/workspace" },
          { role: "assistant", content: "Done inspecting." },
          { role: "user", content: "Next step" },
        ],
        { attachSkipThoughtSignature: true },
      );

      expect(contents.map((content) => content.role)).toEqual([
        "user",
        "model",
        "user",
        "model",
        "user",
      ]);
      expect(contents[1]?.parts).toEqual([
        { text: "I will inspect first." },
        {
          functionCall: { name: "pwd", args: {}, id: "c1" },
          thoughtSignature: SKIP_THOUGHT_SIGNATURE,
        },
      ]);
      expect(contents[2]?.parts[0]).toMatchObject({
        functionResponse: { name: "pwd", id: "c1", response: { output: "/workspace" } },
      });
      expect(contents[3]?.parts).toEqual([{ text: "Done inspecting." }]);
      expect(contents[4]?.parts).toEqual([{ text: "Next step" }]);
    });

    test("merges consecutive assistant records into a single model turn", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "inspect" },
          { role: "assistant", content: "I am going to check." },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "pwd", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "/workspace" },
          { role: "assistant", content: "Done." },
          { role: "user", content: "Great" },
        ],
        { attachSkipThoughtSignature: true },
      );

      expect(contents.map((content) => content.role)).toEqual([
        "user",
        "model",
        "user",
        "model",
        "user",
      ]);
      expect(contents[1]?.parts).toEqual([
        { text: "I am going to check." },
        {
          functionCall: { name: "pwd", args: {}, id: "c1" },
          thoughtSignature: SKIP_THOUGHT_SIGNATURE,
        },
      ]);
      expect(contents[2]?.parts[0]).toMatchObject({
        functionResponse: { name: "pwd", id: "c1", response: { output: "/workspace" } },
      });
    });

    test("flushes pending functionCalls with dummy response and preserves call id", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "calculate" },
          {
            role: "assistant",
            content: "Calling tool",
            tool_calls: [
              {
                id: "call_calc_99",
                type: "function",
                function: { name: "calc", arguments: "{}" },
              },
            ],
          },
          // No tool result provided; next message is directly a user turn
          { role: "user", content: "Nevermind" },
        ],
        { attachSkipThoughtSignature: true },
      );

      expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
      const lastUserParts = contents[2].parts;
      expect(lastUserParts.some((p) => "functionResponse" in p)).toBe(true);
      const fnResponsePart = lastUserParts.find((p) => "functionResponse" in p) as any;
      expect(fnResponsePart.functionResponse.name).toBe("calc");
      expect(fnResponsePart.functionResponse.id).toBe("call_calc_99");
      expect(fnResponsePart.functionResponse.response.output).toBe("{}");
    });

    test("prepends user placeholder turn when conversation starts with assistant model turn", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "readFile", arguments: '{"path":"a"}' },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "file content" },
        ],
        { attachSkipThoughtSignature: true },
      );

      expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
      expect(contents[0]?.parts).toEqual([{ text: "Continue the conversation." }]);
      expect(contents[1]?.parts[0]).toMatchObject({
        functionCall: { name: "readFile", id: "c1" },
      });
      expect(contents[2]?.parts[0]).toMatchObject({
        functionResponse: { name: "readFile", id: "c1", response: { output: "file content" } },
      });
    });

    test("prepends user placeholder turn when conversation starts with plain text assistant message", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [{ role: "assistant", content: "Hello, I am ready." }],
        { attachSkipThoughtSignature: true },
      );

      expect(contents.map((c) => c.role)).toEqual(["user", "model"]);
      expect(contents[0]?.parts).toEqual([{ text: "Continue the conversation." }]);
      expect(contents[1]?.parts).toEqual([{ text: "Hello, I am ready." }]);
    });

    test("drops orphaned tool results instead of creating an invalid user turn", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "continue" },
          { role: "tool", tool_call_id: "missing", content: "stale result" },
        ],
        { attachSkipThoughtSignature: true },
      );

      expect(contents).toEqual([{ role: "user", parts: [{ text: "continue" }] }]);
    });

    test("attaches sentinel to first functionCall when no real signature", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "run ls" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "execBash", arguments: '{"command":"ls"}' },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "file1\nfile2" },
          { role: "user", content: "next" },
        ],
        { attachSkipThoughtSignature: true },
      );

      const modelTurn = contents.find(
        (c) => c.role === "model" && c.parts.some((p) => "functionCall" in p),
      );
      expect(modelTurn).toBeDefined();
      const fnPart = modelTurn!.parts.find((p) => "functionCall" in p) as {
        functionCall: { name: string };
        thoughtSignature?: string;
      };
      expect(fnPart.thoughtSignature).toBe(SKIP_THOUGHT_SIGNATURE);
    });

    test("replays real thoughtSignature instead of sentinel", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "run ls" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "execBash", arguments: "{}" },
                thought_signature: "real-sig-123",
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "ok" },
          { role: "user", content: "next" },
        ],
        { attachSkipThoughtSignature: true },
      );

      const modelTurn = contents.find(
        (c) => c.role === "model" && c.parts.some((p) => "functionCall" in p),
      );
      const fnPart = modelTurn!.parts.find((p) => "functionCall" in p) as {
        thoughtSignature?: string;
      };
      expect(fnPart.thoughtSignature).toBe("real-sig-123");
      expect(fnPart.thoughtSignature).not.toBe(SKIP_THOUGHT_SIGNATURE);
    });

    test("does not attach sentinel when attachSkipThoughtSignature is false", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "hi" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "tool", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "ok" },
          { role: "user", content: "next" },
        ],
        { attachSkipThoughtSignature: false },
      );

      const modelTurn = contents.find(
        (c) => c.role === "model" && c.parts.some((p) => "functionCall" in p),
      );
      const fnPart = modelTurn!.parts.find((p) => "functionCall" in p) as {
        thoughtSignature?: string;
      };
      expect(fnPart.thoughtSignature).toBeUndefined();
    });

    test("only first functionCall in a turn gets sentinel", () => {
      const { contents } = convertOpenAiMessagesToGemini(
        [
          { role: "user", content: "run two" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "tool1", arguments: "{}" },
              },
              {
                id: "c2",
                type: "function",
                function: { name: "tool2", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "ok1" },
          { role: "tool", tool_call_id: "c2", content: "ok2" },
          { role: "user", content: "next" },
        ],
        { attachSkipThoughtSignature: true },
      );

      const modelTurn = contents.find(
        (c) => c.role === "model" && c.parts.some((p) => "functionCall" in p),
      );
      const fnParts = modelTurn!.parts.filter((p) => "functionCall" in p);
      expect(fnParts.length).toBe(2);
      expect((fnParts[0] as { thoughtSignature?: string }).thoughtSignature).toBe(
        SKIP_THOUGHT_SIGNATURE,
      );
      expect(
        (fnParts[1] as { thoughtSignature?: string }).thoughtSignature,
      ).toBeUndefined();
    });

    test("extracts system messages into systemTexts", () => {
      const { contents, systemTexts } = convertOpenAiMessagesToGemini(
        [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "hi" },
        ],
        { attachSkipThoughtSignature: false },
      );
      expect(systemTexts).toEqual(["You are helpful"]);
      expect(contents.length).toBe(1);
      expect(contents[0].role).toBe("user");
    });
  });

  describe("convertOpenAiToolsToGemini", () => {
    test("converts OpenAI tools to functionDeclarations", () => {
      const result = convertOpenAiToolsToGemini([
        {
          type: "function",
          function: {
            name: "execBash",
            description: "Run a shell command",
            parameters: { type: "object", properties: { command: { type: "string" } } },
          },
        },
      ]);
      expect(result).toBeDefined();
      expect(result![0].functionDeclarations[0].name).toBe("execBash");
      expect(result![0].functionDeclarations[0].description).toBe(
        "Run a shell command",
      );
    });

    test("returns undefined for empty tools", () => {
      expect(convertOpenAiToolsToGemini([])).toBeUndefined();
      expect(convertOpenAiToolsToGemini(undefined)).toBeUndefined();
    });
  });

  describe("accumulateGeminiChunks", () => {
    test("captures thoughtSignature from functionCall part directly", () => {
      const chunks = [
        {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: { name: "tool", args: {}, id: "c1" },
                      thoughtSignature: "sig-direct",
                    },
                  ],
                },
              },
            ],
          },
        },
      ];
      const { toolCalls } = accumulateGeminiChunks(chunks);
      expect(toolCalls[0].thought_signature).toBe("sig-direct");
    });

    test("captures thoughtSignature from preceding thought part", () => {
      const chunks = [
        {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    { text: "thinking...", thought: true, thoughtSignature: "sig-thought" },
                    { functionCall: { name: "loadSkill", args: { name: "review" }, id: "c1" } },
                  ],
                },
              },
            ],
          },
        },
      ];
      const { toolCalls } = accumulateGeminiChunks(chunks);
      expect(toolCalls[0].thought_signature).toBe("sig-thought");
    });

    test("does not attach signature when thought part has none", () => {
      const chunks = [
        {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    { text: "thinking...", thought: true },
                    { functionCall: { name: "tool", args: {}, id: "c1" } },
                  ],
                },
              },
            ],
          },
        },
      ];
      const { toolCalls } = accumulateGeminiChunks(chunks);
      expect(toolCalls[0].thought_signature).toBeUndefined();
    });

    test("extracts text from non-thought parts", () => {
      const chunks = [
        {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    { text: "thinking...", thought: true },
                    { text: "Hello world" },
                  ],
                },
              },
            ],
          },
        },
      ];
      const { text } = accumulateGeminiChunks(chunks);
      expect(text).toBe("Hello world");
    });

    test("parses usageMetadata", () => {
      const chunks = [
        {
          response: {
            candidates: [{ content: { parts: [{ text: "ok" }] } }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          },
        },
      ];
      const { usage } = accumulateGeminiChunks(chunks);
      expect(usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
    });

    test("invokes onTextDelta and onReasoningDelta callbacks per chunk", () => {
      const textDeltas: string[] = [];
      const reasoningDeltas: string[] = [];
      const chunks = [
        {
          response: {
            candidates: [
              { content: { parts: [{ text: "thinking 1", thought: true }] } },
            ],
          },
        },
        {
          response: {
            candidates: [
              { content: { parts: [{ text: "thinking 2", thought: true }] } },
            ],
          },
        },
        {
          response: {
            candidates: [
              { content: { parts: [{ text: "Hello " }] } },
            ],
          },
        },
        {
          response: {
            candidates: [
              { content: { parts: [{ text: "world" }] } },
            ],
          },
        },
      ];
      const result = accumulateGeminiChunks(chunks, {
        onTextDelta: (c) => textDeltas.push(c),
        onReasoningDelta: (c) => reasoningDeltas.push(c),
      });

      expect(result.text).toBe("Hello world");
      expect(textDeltas).toEqual(["Hello ", "world"]);
      expect(reasoningDeltas).toEqual(["thinking 1", "thinking 2"]);
    });

    test("accumulateGeminiStream yields deltas live over async iterable", async () => {
      const textDeltas: string[] = [];
      async function* generateChunks() {
        yield { response: { candidates: [{ content: { parts: [{ text: "part A " }] } }] } };
        yield { response: { candidates: [{ content: { parts: [{ text: "part B" }] } }] } };
      }
      const result = await accumulateGeminiStream(generateChunks(), {
        onTextDelta: (c) => textDeltas.push(c),
      });

      expect(result.text).toBe("part A part B");
      expect(textDeltas).toEqual(["part A ", "part B"]);
    });
  });
});