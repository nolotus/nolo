import { updateTokensAction } from "chat/dialog/actions/updateTokensAction";
import { applyUpdateTokensFulfilled } from "chat/dialog/dialogRuntimeStore";

/** Keep agent billing unchanged while publishing the same runtime telemetry as updateTokens. */
export async function updateAgentTokens(
  args: Parameters<typeof updateTokensAction>[0],
  thunkApi: Parameters<typeof updateTokensAction>[1],
) {
  const observedAt = Date.now();
  const payload = await updateTokensAction(args, thunkApi);
  if (args?.dialogKey && payload) {
    applyUpdateTokensFulfilled({
      observedAt,
      authoritative: args?.contextUsageAuthoritative !== false &&
        (args?.usageRecord?.usage ?? args?.usage)?.billing_estimated !== true,
      dialogKey: args.dialogKey,
      input_tokens: payload.input_tokens,
      output_tokens: payload.output_tokens,
      cost: payload.cost,
    });
  }
  return payload;
}
