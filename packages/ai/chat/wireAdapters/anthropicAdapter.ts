import { buildAnthropicMessagesBody } from "agent-runtime/anthropicMessagesProvider";
import { updateTotalUsage } from "../updateTotalUsage";
import type { ChatWireAdapter, ChatWireAdapterBuildArgs } from "./types";

export const anthropicAdapter: ChatWireAdapter = {
  wire: "anthropic",
  buildRequest(args: ChatWireAdapterBuildArgs): Record<string, unknown> {
    const rawMessages = Array.isArray(args.messages) ? args.messages : [];
    const openAiBody: Record<string, unknown> = {
      messages: rawMessages,
      model: args.agent?.model,
    };
    if (args.tools && args.tools.length > 0) {
      openAiBody.tools = args.tools;
    }
    return buildAnthropicMessagesBody({
      agentConfig: (args.agent ?? {}) as any,
      openAiBody,
    });
  },
  normalizeUsage(raw: unknown): any | null {
    if (!raw) return null;
    const usageChunk = (raw as any)?.usage ?? raw;
    return updateTotalUsage(null, usageChunk as any);
  },
};
