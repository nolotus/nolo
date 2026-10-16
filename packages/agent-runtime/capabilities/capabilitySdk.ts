import type { AgentRuntimeToolResult } from "../hostAdapter";
import type { CapabilityExecutionContext, ExecutableCapability } from "./capability";
import { evaluateCapabilityPolicy } from "./capabilityPolicy";
import { execShellCapability } from "./execShellCapability";

export const BUILTIN_CAPABILITIES: readonly ExecutableCapability<any, any>[] = [
  execShellCapability,
] as const;

export async function invokeCapability<I = unknown, O = AgentRuntimeToolResult>(
  capabilityOrName: string | ExecutableCapability<I, O>,
  input: unknown,
  ctx: CapabilityExecutionContext = {},
): Promise<O> {
  const capability: ExecutableCapability<I, O> | undefined =
    typeof capabilityOrName === "string"
      ? (BUILTIN_CAPABILITIES.find((c) => c.name === capabilityOrName) as ExecutableCapability<I, O> | undefined)
      : capabilityOrName;

  if (!capability) {
    throw new Error(`Capability "${String(capabilityOrName)}" not found.`);
  }

  // 1. Canonical input normalization & validation
  const normalizedInput = capability.normalizeInput(input);

  // 2. Capability Policy Evaluation
  await evaluateCapabilityPolicy(capability, normalizedInput, ctx);

  // 3. Audit / hook (invoked only after policy approval and before execution)
  if (ctx.onInvoke) {
    await ctx.onInvoke(capability.name, normalizedInput);
  }

  // 4. Low-level capability execution
  return capability.invoke(ctx, normalizedInput);
}
