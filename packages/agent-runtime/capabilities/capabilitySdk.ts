import type { AgentRuntimeToolResult } from "../hostAdapter";
import type { CapabilityExecutionContext, ExecutableCapability } from "./capability";
import { evaluateCapabilityPolicy } from "./capabilityPolicy";
import { execShellCapability, execShellExecutionBinding } from "./execShellCapability";

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

  const authority = ctx.execShellApproval;
  const binding = authority && capability.name === "execShell"
    ? execShellExecutionBinding(normalizedInput, ctx) : undefined;
  const signal = ctx.abortSignal;
  const confirm = ctx.confirmDestructiveAction;

  // 2. Capability Policy Evaluation
  const hostExecutedResult = await evaluateCapabilityPolicy(capability, normalizedInput, ctx);
  if (hostExecutedResult) {
    // 宿主已在确认回调里代为执行该命令：直接返回它的真实结果，不再 spawn。
    return hostExecutedResult as O;
  }

  // 3. Audit / hook (invoked only after policy approval and before execution)
  if (ctx.onInvoke) {
    await ctx.onInvoke(capability.name, normalizedInput);
  }

  if (binding !== undefined && (ctx.execShellApproval !== authority || ctx.abortSignal !== signal || ctx.confirmDestructiveAction !== confirm ||
      signal?.aborted || execShellExecutionBinding(normalizedInput, ctx) !== binding)) {
    throw new Error("Shell approval input changed during policy/hook");
  }

  // 4. Low-level capability execution
  return capability.invoke(ctx, normalizedInput);
}
