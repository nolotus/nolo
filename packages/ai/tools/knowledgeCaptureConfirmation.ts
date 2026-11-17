import { read } from "database/dbSlice";
import { createSpaceKey } from "create/space/spaceKeys";
import { checkSpaceMembership } from "create/space/utils/permissions";
import { selectIdentityUserId } from "identity/selectors";
import { ToolResultError } from "./toolResultError";

/** Canonical JSON binds the existing trusted replay field to the exact operation. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function requireKnowledgeCaptureConfirmation(
  args: { __confirmedKnowledgeCapture?: unknown },
  operation: string,
  input: Record<string, unknown>,
  preview: Record<string, unknown> = input,
): void {
  const binding = canonical({ operation, input, preview });
  if (args.__confirmedKnowledgeCapture === binding) return;
  const confirmationInput = { ...input, __confirmedKnowledgeCapture: binding };
  throw new ToolResultError("保存前请确认内容与目标空间。", {
    code: "knowledge_capture_requires_confirmation",
    retryable: false,
    displayData: "确认保存？请核对本次完整内容与目标空间。",
    rawData: {
      error: "knowledge_capture_requires_confirmation",
      operation,
      confirmationInput,
      preview,
    },
  });
}

/** Reuse the normal space mutation ACL immediately before persistence. */
export async function checkKnowledgeCaptureTarget(spaceId: string | undefined, api: any): Promise<void> {
  if (!spaceId) return;
  const space = await api.dispatch(read({ dbKey: createSpaceKey.space(spaceId) })).unwrap();
  checkSpaceMembership(space, selectIdentityUserId(api.getState()));
}
