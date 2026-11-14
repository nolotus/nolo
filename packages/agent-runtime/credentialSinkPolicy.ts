// packages/agent-runtime/credentialSinkPolicy.ts
//
// `$nolo_cred:` 引用在工具参数中的「汇点（sink）」三分类：
//   - "command"  ：能执行任意命令的工具，命令行解包等于外带明文，硬拒绝；
//   - "confirm"  ：其余工具，参数携带凭据需一次宿主确认才解包（仅本次调用）；
//   - "allow"    ：受控通道白名单（当前为空，仅留扩展位），可直接解包。
// 纯函数、零副作用；不抛异常、不做 IO。

import type { PermissionRequest } from "./actionGate";
import { isCommandExecutingTool } from "./localToolPolicy";

export type CredentialRefSinkClass = "command" | "confirm" | "allow";

/**
 * 受控通道白名单：命中即视为「允许解包」的 sink。
 * 当前为空集合，只留扩展位；测试可通过函数参数注入覆盖。
 */
export const CREDENTIAL_REF_ALLOWED_SINKS: ReadonlySet<string> = new Set<string>();

/**
 * 三分类规则：
 *   1. isCommandExecutingTool 命中 → "command"（判据与派发器共用同一套归一化）；
 *   2. 命中注入的白名单 → "allow"；
 *   3. 其余 → "confirm"。
 */
export function classifyCredentialRefSink(
  toolName: string,
  allowlist: ReadonlySet<string> = CREDENTIAL_REF_ALLOWED_SINKS,
): CredentialRefSinkClass {
  if (isCommandExecutingTool(toolName)) return "command";
  if (allowlist.has(toolName)) return "allow";
  return "confirm";
}

/**
 * 非命令类工具的凭据解包确认请求：用户看到的是「工具参数要带凭据」，
 * 与命令行凭据（shell_command_credential_use）、破坏性命令分开表达。
 * scope 仍为 once：批准只覆盖本次调用，不落任何跨调用状态。
 */
export function buildCredentialSinkPermissionRequest(toolName: string): PermissionRequest {
  return {
    id: `permission-credential-sink-${toolName}`,
    tool: toolName,
    action: "credential_unwrap_tool_use",
    title: "确认在工具参数中使用凭据",
    body: `该工具（${toolName}）的参数要携带凭据，确认后仅本次调用解包；明文不会写入历史或记录。`,
    suggestedRule: {
      scope: "once",
      pattern: { capability: "credential_use", target: "tool_arguments" },
    },
  };
}
