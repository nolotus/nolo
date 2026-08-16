import { buildCodexRequestBody } from "agent-runtime/codexResponsesProvider";
import { updateTotalUsage } from "../updateTotalUsage";
import type { ChatWireAdapter, ChatWireAdapterBuildArgs } from "./types";

export const codexAdapter: ChatWireAdapter = {
  wire: "codex",
  buildRequest(args: ChatWireAdapterBuildArgs): Record<string, unknown> {
    const rawMessages = Array.isArray(args.messages) ? args.messages : [];
    const openAiBody: Record<string, unknown> = {
      messages: rawMessages,
      model: args.agent?.model,
    };
    if (args.tools && args.tools.length > 0) {
      openAiBody.tools = args.tools;
    }
    return buildCodexRequestBody({
      agentConfig: (args.agent ?? {}) as any,
      accessToken: "",
      openAiBody,
    });
  },
  normalizeUsage(raw: unknown): any | null {
    if (!raw) return null;
    const usageChunk = (raw as any)?.usage ?? raw;
    return updateTotalUsage(null, usageChunk as any);
  },
};
