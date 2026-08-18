import { afterEach, expect, test, describe, mock } from "bun:test";
import { Agent, Message } from "app/types";

let moduleVersion = 0;

const loadGenerateOpenAIRequestBody = async () => {
    mock.module("ai/agent/generatePrompt", () => ({
        generatePrompt: () => "System Prompt Content",
        buildSystemPromptContext: () => ({
            content: "System Prompt Content",
            stablePrefixContent: "System Prompt Content",
            dynamicContent: "",
        }),
    }));

    return import(`../generateOpenAIRequestBody`);
};

afterEach(() => {
    mock.restore();
});

describe("generateOpenAIRequestBody cache and stableMessages", () => {
    const mockAgent: Agent = {
        dbKey: "agent-1",
        name: "Test Agent",
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        prompt: "Test Prompt",
    } as any;

    const dynamicMessages: Message[] = [
        { role: "user", content: "Hello", id: "msg-2" } as any,
    ];

    const stableMessages: Message[] = [
        { role: "user", content: "Historical message", id: "msg-1" } as any,
    ];

    test("should apply cache_control to Claude system message and last stable message", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            stableMessages
        );

        // 1. Check System Message Cache
        const systemMsg = result.messages.find((m: any) => m.role === "system");
        expect(systemMsg.content).toEqual([
            { type: "text", text: "System Prompt Content", cache_control: { type: "ephemeral" } },
        ]);

        // 2. Check Stable Message Cache (Historical message)
        const histMsg = result.messages.find((m: any) => m.role === "user" && Array.isArray(m.content) && m.content[0]?.text === "Historical message");
        expect(histMsg.content).toEqual([
            { type: "text", text: "Historical message", cache_control: { type: "ephemeral" } },
        ]);

        // 3. Check Dynamic Message (No cache)
        const userMsg = result.messages.find((m: any) => m.role === "user" && m.content === "Hello");
        expect(userMsg).toBeDefined();
        expect(userMsg.content).toBe("Hello");
    });

    test("should NOT apply cache_control for non-Claude models", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const gptAgent = { ...mockAgent, model: "gpt-4o", provider: "openai" };
        const result = generateOpenAIRequestBody(
            gptAgent,
            "openai",
            dynamicMessages,
            {},
            stableMessages
        );

        const systemMsg = result.messages.find((m: any) => m.role === "system");
        expect(systemMsg.content).toBe("System Prompt Content");

        const histMsg = result.messages.find((m: any) => m.role === "user" && m.content === "Historical message");
        expect(histMsg.content).toBe("Historical message");
    });

    test("should strip id field from all messages in final request body", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            stableMessages
        );

        result.messages.forEach((m: any) => {
            expect(m.id).toBeUndefined();
        });
    });

    test("should stringify object-valued message content for chat completions", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const result = generateOpenAIRequestBody(
            { ...mockAgent, model: "gpt-5.4", provider: "openai" } as any,
            "openai",
            [
                {
                    role: "tool",
                    content: {
                        type: "ask_user",
                        question: "pick one",
                        choices: [{ id: "a", label: "A" }],
                    },
                    tool_call_id: "call-1",
                    id: "msg-tool",
                } as any,
            ],
            {},
            []
        );

        const toolMessage = result.messages.find((m: any) => m.role === "tool");
        expect(toolMessage).toBeDefined();
        expect(toolMessage.content).toBe(
            JSON.stringify({
                type: "ask_user",
                question: "pick one",
                choices: [{ id: "a", label: "A" }],
            })
        );
    });

    test("should handle empty stableMessages gracefully", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            []
        );

        const systemMsg = result.messages.find((m: any) => m.role === "system");
        expect(systemMsg.content).toEqual([
            { type: "text", text: "System Prompt Content", cache_control: { type: "ephemeral" } },
        ]);

        expect(result.messages.length).toBe(2); // System + 1 User
    });

    test("should handle stableMessages.length === 1 with only one cache breakpoint on stable messages", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const singleStable: Message[] = [
            { role: "user", content: "Only stable message", id: "msg-1" } as any,
        ];
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            singleStable
        );

        const histMsg = result.messages.find((m: any) => m.role === "user" && Array.isArray(m.content) && m.content[0]?.text === "Only stable message");
        expect(histMsg).toBeDefined();
        expect(histMsg.content).toEqual([
            { type: "text", text: "Only stable message", cache_control: { type: "ephemeral" } },
        ]);
    });

    test("should handle stableMessages.length === 2 with two cache breakpoints on stable messages", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const twoStable: Message[] = [
            { role: "user", content: "Msg 1", id: "msg-1" } as any,
            { role: "assistant", content: "Msg 2", id: "msg-2" } as any,
        ];
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            twoStable
        );

        const msg1 = result.messages.find((m: any) => Array.isArray(m.content) && m.content[0]?.text === "Msg 1");
        expect(msg1).toBeDefined();
        expect(msg1.content).toEqual([
            { type: "text", text: "Msg 1", cache_control: { type: "ephemeral" } },
        ]);

        const msg2 = result.messages.find((m: any) => Array.isArray(m.content) && m.content[0]?.text === "Msg 2");
        expect(msg2).toBeDefined();
        expect(msg2.content).toEqual([
            { type: "text", text: "Msg 2", cache_control: { type: "ephemeral" } },
        ]);
    });

    test("should not apply cache_control for empty string content messages and not throw error", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const emptyContentStable: Message[] = [
            { role: "assistant", content: "", tool_calls: [{ id: "call-1" }], id: "msg-1" } as any,
        ];
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            emptyContentStable
        );

        const assistantMsg = result.messages.find((m: any) => m.role === "assistant");
        expect(assistantMsg).toBeDefined();
        expect(assistantMsg.content).toBe("");
    });

    test("should handle Array multi-part content and empty array in stableMessages", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const arrayPartStable: Message[] = [
            {
                role: "user",
                content: [
                    { type: "text", text: "Part 1" },
                    { type: "text", text: "Part 2" },
                ],
                id: "msg-1",
            } as any,
            {
                role: "user",
                content: [],
                id: "msg-2",
            } as any,
        ];
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            arrayPartStable
        );

        // msg-1 (array multi part) should have cache_control on its last part
        const msg1 = result.messages.find((m: any) => Array.isArray(m.content) && m.content.length === 2);
        expect(msg1).toBeDefined();
        expect(msg1.content).toEqual([
            { type: "text", text: "Part 1" },
            { type: "text", text: "Part 2", cache_control: { type: "ephemeral" } },
        ]);

        // msg-2 (empty array content) should remain empty array
        const msg2 = result.messages.find((m: any) => Array.isArray(m.content) && m.content.length === 0);
        expect(msg2).toBeDefined();
        expect(msg2.content).toEqual([]);
    });

    test("should apply cache_control to both second-to-last and last stable messages when multiple stable messages exist", async () => {
        const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
        const multiStableMessages: Message[] = [
            { role: "user", content: "Msg 1", id: "msg-1" } as any,
            { role: "assistant", content: "Msg 2", id: "msg-2" } as any,
            { role: "user", content: "Msg 3", id: "msg-3" } as any,
        ];
        const result = generateOpenAIRequestBody(
            mockAgent,
            "anthropic",
            dynamicMessages,
            {},
            multiStableMessages
        );

        // Msg 1 should NOT have cache_control
        const msg1 = result.messages.find((m: any) => m.content === "Msg 1");
        expect(msg1).toBeDefined();
        expect(msg1.content).toBe("Msg 1");

        // Msg 2 (second-to-last) should have cache_control
        const msg2 = result.messages.find((m: any) => Array.isArray(m.content) && m.content[0]?.text === "Msg 2");
        expect(msg2).toBeDefined();
        expect(msg2.content).toEqual([
            { type: "text", text: "Msg 2", cache_control: { type: "ephemeral" } },
        ]);

        // Msg 3 (last stable) should have cache_control
        const msg3 = result.messages.find((m: any) => Array.isArray(m.content) && m.content[0]?.text === "Msg 3");
        expect(msg3).toBeDefined();
        expect(msg3.content).toEqual([
            { type: "text", text: "Msg 3", cache_control: { type: "ephemeral" } },
        ]);
    });
});
