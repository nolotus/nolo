import { describe, expect, it } from "bun:test";
import {
    extractReferenceKeysFromMessage,
    isLoadableReferenceKey,
} from "./extractReferenceKeys";
import type { Message } from "chat/messages/types";

describe("extractReferenceKeysFromMessage", () => {
    it("extracts pageKey and dialogKey from content parts (preserves legacy non-conforming keys)", () => {
        const msg: Message = {
            id: "m1",
            dbKey: "dialog-user-1-d1-msg-m1",
            role: "user",
            content: [
                { type: "text", text: "see this doc" },
                { type: "doc", name: "Spec", pageKey: "page-roadmap" } as never,
                { type: "dialog", name: "old", pageKey: "dialog-related-followup" } as never,
            ],
        };

        expect(extractReferenceKeysFromMessage(msg).sort()).toEqual([
            "dialog-related-followup",
            "page-roadmap",
        ]);
    });

    it("extracts keys from assistant tool_calls arguments (JSON string)", () => {
        const msg: Message = {
            id: "m2",
            dbKey: "dialog-user-1-d1-msg-m2",
            role: "assistant",
            content: "",
            tool_calls: [
                {
                    id: "tc1",
                    type: "function",
                    function: {
                        name: "readDoc",
                        arguments: JSON.stringify({ pageKey: "page-user-01SPEC" }),
                    },
                },
                {
                    id: "tc2",
                    type: "function",
                    function: {
                        name: "queryDialogsBySubjectRef",
                        arguments: JSON.stringify({ rowDbKey: "meta-tenant-t1" }),
                    },
                },
                {
                    id: "tc3",
                    type: "function",
                    function: {
                        name: "readAgent",
                        // agentKey is not a loadable reference type → filtered out
                        arguments: JSON.stringify({ agentKey: "agent-user-01AGENT" }),
                    },
                },
            ],
        };

        expect(extractReferenceKeysFromMessage(msg).sort()).toEqual([
            "meta-tenant-t1",
            "page-user-01SPEC",
        ]);
    });

    it("extracts keys from tool result toolPayload.input", () => {
        const msg: Message = {
            id: "m3",
            dbKey: "dialog-user-1-d1-msg-m3",
            role: "tool",
            content: '{"ok":true}',
            toolName: "readDoc",
            toolPayload: {
                toolName: "readDoc",
                status: "succeeded",
                input: { pageKey: "page-user-01DOC", dialogKey: "dialog-user-01OLD" },
            },
        };

        expect(extractReferenceKeysFromMessage(msg).sort()).toEqual([
            "dialog-user-01OLD",
            "page-user-01DOC",
        ]);
    });

    it("extracts keys from toolPayload.rawToolCall.function.arguments fallback", () => {
        const msg: Message = {
            id: "m4",
            dbKey: "dialog-user-1-d1-msg-m4",
            role: "tool",
            content: "",
            toolName: "readTable",
            toolPayload: {
                toolName: "readTable",
                status: "succeeded",
                input: undefined,
                rawToolCall: {
                    function: {
                        name: "readTable",
                        arguments: JSON.stringify({ table: "meta-tenant-t2" }),
                    },
                },
            } as never,
        };

        expect(extractReferenceKeysFromMessage(msg)).toEqual(["meta-tenant-t2"]);
    });

    it("returns empty for messages with no references", () => {
        const msg: Message = {
            id: "m5",
            dbKey: "dialog-user-1-d1-msg-m5",
            role: "user",
            content: "just plain text",
        };

        expect(extractReferenceKeysFromMessage(msg)).toEqual([]);
    });

    it("deduplicates keys across sources", () => {
        const msg: Message = {
            id: "m6",
            dbKey: "dialog-user-1-d1-msg-m6",
            role: "assistant",
            content: [{ type: "doc", name: "x", pageKey: "page-user-01DUP" } as never],
            tool_calls: [
                {
                    id: "tc1",
                    type: "function",
                    function: {
                        name: "readDoc",
                        arguments: JSON.stringify({ pageKey: "page-user-01DUP" }),
                    },
                },
            ],
        };

        expect(extractReferenceKeysFromMessage(msg)).toEqual(["page-user-01DUP"]);
    });
});

describe("isLoadableReferenceKey", () => {
    it("accepts page, dialog record, and table meta keys", () => {
        expect(isLoadableReferenceKey("page-user-01PAGE0000000000000001")).toBe(true);
        expect(isLoadableReferenceKey("dialog-user-01DIALOGSUMMARY0000001")).toBe(true);
        expect(isLoadableReferenceKey("meta-tenant-t1")).toBe(true);
    });

    it("rejects agent, space, file, and dialog message keys", () => {
        expect(isLoadableReferenceKey("agent-user-01AGENT0000000000000001")).toBe(false);
        expect(isLoadableReferenceKey("space-user-01SPACE0000000000000001")).toBe(false);
        expect(isLoadableReferenceKey("file-user-01FILE0000000000000001")).toBe(false);
        expect(isLoadableReferenceKey("dialog-01DIALOG-msg-01MSG")).toBe(false);
    });
});