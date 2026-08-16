import { describe, expect, it } from "bun:test";

import { generateResponseRequestBody } from "./generateResponseRequestBody";
import {
  convertMessagesToResponsesInput,
  extractImagePartsFromResponseOutput,
  extractReasoningFromResponseOutput,
  extractTextFromResponseOutput,
  extractToolCallsFromResponseOutput,
  toResponsesTools,
} from "./responsesHelpers";
import { prepareTools } from "ai/tools/prepareTools";

describe("generateResponseRequestBody", () => {
  it("converts assistant tool history and tool outputs for the responses API", () => {
    const body = generateResponseRequestBody(
      {
        provider: "openai",
        model: "gpt-5.4",
        prompt: "You are helpful.",
      } as any,
      [
        { role: "user", content: "Read the page." },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call-read",
              type: "function",
              function: {
                name: "read",
                arguments: "{\"dbKey\":\"page-user-demo\"}",
              },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call-read",
          content: "{\"dbKey\":\"page-user-demo\",\"title\":\"Demo\"}",
        },
      ] as any
    );

    expect(body.instructions).toContain("You are helpful.");
    expect(body.input).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Read the page." }],
      },
      {
        type: "function_call",
        call_id: "call-read",
        name: "read",
        arguments: "{\"dbKey\":\"page-user-demo\"}",
      },
      {
        type: "function_call_output",
        call_id: "call-read",
        output: "{\"dbKey\":\"page-user-demo\",\"title\":\"Demo\"}",
      },
    ]);
  });

  it("replays DeepSeek reasoning as array content parts (OpenAI + DeepSeek Responses compatible)", () => {
    const body = generateResponseRequestBody(
      { provider: "nolo", model: "deepseek-v4-flash", prompt: "Be helpful." } as any,
      [
        {
          role: "assistant",
          content: "previous answer",
          reasoning_content: "Need to call the tool.",
        },
      ] as any,
    );

    expect(body.input).toEqual([
      {
        type: "reasoning",
        content: [{ type: "reasoning_text", text: "Need to call the tool." }],
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "previous answer" }],
      },
    ]);
  });

  it("replays assistant reasoning as array content parts for all providers", () => {
    const body = generateResponseRequestBody(
      { provider: "openai", model: "gpt-5.4", prompt: "Be helpful." } as any,
      [
        { role: "assistant", content: "", reasoning_content: "Need to call the tool." },
      ] as any,
    );

    expect(body.input).toEqual([
      {
        type: "reasoning",
        content: [{ type: "reasoning_text", text: "Need to call the tool." }],
      },
    ]);
  });

  it("can omit incompatible reasoning history while retaining assistant output", () => {
    expect(
      convertMessagesToResponsesInput(
        [
          {
            role: "assistant",
            content: "previous answer",
            reasoning_content: "historical reasoning",
          },
        ] as any,
        { stripReasoningContent: true },
      ),
    ).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "previous answer" }],
      },
    ]);
  });

  it("encodes assistant text history as output_text for responses API", () => {
    const body = generateResponseRequestBody(
      {
        provider: "openai",
        model: "gpt-5.4",
        prompt: "You are helpful.",
      } as any,
      [
        { role: "assistant", content: "先给我出生时辰。" },
        { role: "user", content: "公历1993 10 21" },
      ] as any
    );

    expect(body.input[0]).toEqual({
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "先给我出生时辰。" }],
    });
  });

  it("replays assistant-generated images as follow-up user image inputs", () => {
    const body = generateResponseRequestBody(
      {
        provider: "openai",
        model: "gpt-5.4",
        prompt: "You are helpful.",
      } as any,
      [
        {
          role: "assistant",
          content: [
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,QUJDRA==",
                detail: "low",
              },
            },
          ],
        },
        { role: "user", content: "把背景改成浅蓝色。" },
      ] as any
    );

    expect(body.input).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: "data:image/png;base64,QUJDRA==",
            detail: "low",
          },
        ],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "把背景改成浅蓝色。" }],
      },
    ]);
  });

  it("skips instructions when the runtime already injected system messages", () => {
    const body = generateResponseRequestBody(
      {
        provider: "openai",
        model: "gpt-5.4",
        prompt: "You are helpful.",
      } as any,
      [
        { role: "system", content: "RUNTIME_PROMPT" },
        { role: "user", content: "继续。" },
      ] as any,
      undefined,
      false
    );

    expect(body.instructions).toBeUndefined();
    expect(body.input[0]).toEqual({
      type: "message",
      role: "system",
      content: [{ type: "input_text", text: "RUNTIME_PROMPT" }],
    });
  });

  it("extracts text and tool calls from responses output", () => {
    const response = {
      output: [
        {
          type: "function_call",
          call_id: "call-read",
          name: "read",
          arguments: "{\"dbKey\":\"page-user-demo\"}",
        },
        {
          type: "message",
          role: "assistant",
          content: [
            { type: "output_text", text: "Need user confirmation before reading more." },
          ],
        },
      ],
    };

    expect(extractTextFromResponseOutput(response)).toBe(
      "Need user confirmation before reading more."
    );
    expect(extractToolCallsFromResponseOutput(response)).toEqual([
      {
        id: "call-read",
        type: "function",
        function: {
          name: "read",
          arguments: "{\"dbKey\":\"page-user-demo\"}",
        },
      },
    ]);
  });

  it("extracts plain and structured reasoning from responses output", () => {
    expect(
      extractReasoningFromResponseOutput({
        output: [
          { type: "reasoning", content: "first" },
          {
            type: "reasoning",
            content: [{ type: "reasoning_text", text: " second" }],
          },
        ],
      }),
    ).toBe("first second");
  });

  it("extracts generated images from responses output", () => {
    const response = {
      output: [
        {
          type: "image_generation_call",
          result: "QUJDRA==",
          output_format: "png",
          status: "completed",
        },
      ],
    };

    expect(extractImagePartsFromResponseOutput(response)).toEqual([
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,QUJDRA==",
        },
      },
    ]);
  });

  it("accepts already-normalized Responses tools without dropping their schema", () => {
    expect(toResponsesTools([
      {
        type: "function",
        name: "readFile",
        description: "Read a file",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      },
    ])).toEqual([{
      type: "function",
      name: "readFile",
      description: "Read a file",
      parameters: { type: "object", properties: { path: { type: "string" } } },
    }]);
  });

  it("drops top-level composition keywords from responses tool schemas", () => {
    const [appDeployTool, appPreflightTool] =
      toResponsesTools(
        prepareTools(["appDeploy", "appPreflight"], { provider: "openai" })
      ) ?? [];

    expect(appDeployTool.parameters.anyOf).toBeUndefined();
    expect(appPreflightTool.parameters.anyOf).toBeUndefined();
    expect(appDeployTool.parameters.type).toBe("object");
    expect(appDeployTool.parameters.properties.framework.enum).toEqual([
      "worker",
      "react-spa",
      "nolo-react",
    ]);
  });

  describe("optional state / compaction seam", () => {
    const baseAgent = {
      provider: "openai",
      model: "gpt-5.4",
      prompt: "You are helpful.",
    } as any;
    const baseMsgs = [{ role: "user", content: "hi" }] as any;

    it("omits state fields by default", () => {
      const body = generateResponseRequestBody(baseAgent, baseMsgs);
      expect(body.previous_response_id).toBeUndefined();
      expect(body.store).toBeUndefined();
      expect(body.context_management).toBeUndefined();
      expect(body.input).toBeDefined();
      expect(body.messages).toBeUndefined();
    });

    it("forwards explicitly supplied state fields", () => {
      const contextManagement = [
        { type: "compaction", compact_threshold: 120_000 },
      ];
      const body = generateResponseRequestBody(
        {
          ...baseAgent,
          previous_response_id: "resp_abc123",
          store: false,
          context_management: contextManagement,
        },
        baseMsgs,
      );
      expect(body.previous_response_id).toBe("resp_abc123");
      expect(body.store).toBe(false);
      expect(body.context_management).toEqual(contextManagement);
    });

    it("uses typed previous_response_id state and sends only the continuation items", () => {
      const body = generateResponseRequestBody(
        baseAgent,
        [
          { role: "user", content: "old turn" },
          { role: "assistant", content: "old answer" },
          { role: "user", content: "new turn" },
        ] as any,
        undefined,
        true,
        { provider: "openai", model: "gpt-5.4", responseId: "resp_123" },
      );

      expect(body.previous_response_id).toBe("resp_123");
      expect(body.context_management).toEqual([
        { type: "compaction", compact_threshold: 200_000 },
      ]);
      expect(body.input).toEqual([
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "new turn" }],
        },
      ]);
    });

    it("projects only tool outputs after an assistant tool call", () => {
      const body = generateResponseRequestBody(
        baseAgent,
        [
          { role: "user", content: "read" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call-read",
                type: "function",
                function: { name: "read", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "call-read", content: "ok" },
        ] as any,
        undefined,
        true,
        { provider: "openai", model: "gpt-5.4", responseId: "resp_123" },
      );

      expect(body.input).toEqual([
        {
          type: "function_call_output",
          call_id: "call-read",
          output: "ok",
        },
      ]);
    });

    it("keeps DeepSeek Responses stateless and omits OpenAI-only fields", () => {
      const body = generateResponseRequestBody(
        {
          provider: "deepseek",
          model: "deepseek-v4-flash",
          previous_response_id: "resp_should_not_send",
          context_management: [{ type: "compaction", compact_threshold: 200_000 }],
          store: true,
        } as any,
        baseMsgs,
        undefined,
        true,
        { provider: "deepseek", model: "deepseek-v4-flash", responseId: "resp_ds" },
      );

      expect(body.previous_response_id).toBeUndefined();
      expect(body.context_management).toBeUndefined();
      expect(body.store).toBeUndefined();
      expect(body.input).toEqual([
        { type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] },
      ]);
    });
  });
});
