import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dispatchStreamEndBilling } from "./messageStreamEndBillingDispatch";

const billingCoreSource = readFileSync(
  fileURLToPath(new URL("./messageStreamEndBilling.ts", import.meta.url)),
  "utf8"
);
const billingDispatchSource = readFileSync(
  fileURLToPath(new URL("./messageStreamEndBillingDispatch.ts", import.meta.url)),
  "utf8"
);
const messageSliceSource = readFileSync(
  fileURLToPath(new URL("./messageSlice.ts", import.meta.url)),
  "utf8"
);

describe("messageStreamEnd billing source contract", () => {
  it("counts generated image outputs in the billing core", () => {
    expect(billingCoreSource).toContain(
      "countImageGenerationOutputsInContent(finalVisibleContent)"
    );
  });

  it("adds image_generation_count only for OpenAI built-in image generation agents", () => {
    expect(billingCoreSource).toContain(
      "isOpenAIBuiltInImageGenerationAgent(agentConfig)"
    );
    expect(billingCoreSource).toContain(
      "withImageGenerationCount(totalUsage, imageGenerationCount)"
    );
    expect(billingCoreSource).toContain(
      "withImageGenerationCount(estimatedUsage, imageGenerationCount)"
    );
  });

  it("passes billed usage through updateTokens from messageStreamEndBillingDispatch", () => {
    // resolveStreamEndBillingUsages still runs in the thunk (shapes usage);
    // the dispatch loop moved to messageStreamEndBillingDispatch (Wave21).
    expect(messageSliceSource).toContain("resolveStreamEndBillingUsages");
    expect(messageSliceSource).toContain("dispatchStreamEndBilling");
    expect(billingDispatchSource).toContain("billingUsageRecords?.length");
    expect(billingDispatchSource).toContain("for (const usageRecord of usageRecords)");
    expect(billingDispatchSource).toContain("await dispatch(");
    expect(billingDispatchSource).toContain(").unwrap();");
    expect(billingDispatchSource).toContain("usage: billedEstimatedUsage");
  });

  it("recovers stable callId from billedUsage.provider_call_id in fallback single-record reported dispatch", async () => {
    const dispatchedActions: any[] = [];
    const updateTokensAction = mock((payload: any) => ({
      type: "updateTokens",
      payload,
    }));
    const dispatch = mock((action: any) => {
      dispatchedActions.push(action);
      return { unwrap: async () => undefined };
    });

    await dispatchStreamEndBilling({
      dispatch,
      updateTokensAction,
      billingMode: "reported",
      billingUsageRecords: undefined,
      billedUsage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        provider_call_id: "pcall-dispatch-recovered-123",
      },
      billedEstimatedUsage: null,
      dialogId: "dialog-1",
      dialogKey: "dialog-user-1-1",
      agentConfig: { provider: "deepseek", model: "deepseek-v4-flash" },
    });

    expect(updateTokensAction).toHaveBeenCalledTimes(1);
    const calledPayload = updateTokensAction.mock.calls[0][0];
    expect(calledPayload.usageRecord).toEqual({
      callId: "pcall-dispatch-recovered-123",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        provider_call_id: "pcall-dispatch-recovered-123",
      },
    });
  });

  it("does not dispatch updateTokens or an estimated token report when billing is skipped", async () => {
    const updateTokensAction = mock((payload: any) => ({ type: "updateTokens", payload }));
    const dispatch = mock(() => ({ unwrap: async () => undefined }));

    await dispatchStreamEndBilling({
      dispatch,
      updateTokensAction,
      billingMode: "skip",
      billedUsage: { provider_call_id: "pcall-cancelled-before-usage" },
      billedEstimatedUsage: { input_tokens: 12, output_tokens: 3 },
      dialogId: "dialog-1",
      dialogKey: "dialog-user-1-1",
      agentConfig: { provider: "openrouter", model: "gpt-4o" },
    });

    expect(updateTokensAction).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
