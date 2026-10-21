// packages/agent-runtime/credentialExecTool.ts
//
// 把 credential exec broker 的客户端包成**工具处理器**。
//
// 这一刀仍然**不注册到工具面**：只产出 `handler(args)`，供后续切片在开启开关时挂上去。
// 这样既有工具面零变化，而「参数校验 → 调 broker → 结果整形」这段真实逻辑可以先被验证。
//
// 边界（与前两刀一致）：
// - 不在 agent 进程里解析凭据，值不经过 agent 可见的面；
// - 不做授权判断：broker 侧决定 ref 能不能用，这里只做**参数形状**校验；
// - 失败分两类：`invalid_request`（参数不对，调用方可修）与 broker/client 的固定错误码。

import { requestCredentialExec, type CredentialExecClientOptions } from "./credentialExecClient";
import type { CredentialExecResponse } from "./credentialExecBroker";

export type CredentialExecToolArgs = {
  /** 凭据引用（由 broker 侧 resolver 解释）。 */
  ref?: unknown;
  /** 命令与参数（不经 shell）。 */
  argv?: unknown;
  /** 工作目录。 */
  cwd?: unknown;
  /** 单次执行超时（毫秒），受 broker 侧上限约束。 */
  timeoutMs?: unknown;
};

export type CredentialExecToolResult = CredentialExecResponse;

// `ref` / `cwd` 是**标识**：纯空白没有意义，拒绝。
const isNonBlankString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

// `argv` 元素是**命令参数**：纯空白是合法参数（`echo " "`），只拒空串，且不改写原值。
const isNonEmptyArgvElement = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isValidArgv = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isNonEmptyArgvElement);

/**
 * 创建 handler。`options` 由宿主提供（socket 路径与 token 都属于执行器一侧，
 * **不要**从 agent 可控的参数或环境变量里读）。
 */
export function createCredentialExecHandler(
  options: CredentialExecClientOptions,
): (args: CredentialExecToolArgs) => Promise<CredentialExecToolResult> {
  return async (args) => {
    if (!isNonBlankString(args?.ref) || !isValidArgv(args?.argv)) {
      return { ok: false, error: "invalid_request" };
    }
    if (args.cwd !== undefined && !isNonBlankString(args.cwd)) {
      return { ok: false, error: "invalid_request" };
    }
    if (
      args.timeoutMs !== undefined &&
      (typeof args.timeoutMs !== "number" || !Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)
    ) {
      return { ok: false, error: "invalid_request" };
    }

    return requestCredentialExec(options, {
      ref: args.ref,
      argv: args.argv,
      ...(args.cwd !== undefined ? { cwd: args.cwd } : {}),
      ...(typeof args.timeoutMs === "number" ? { timeoutMs: args.timeoutMs } : {}),
    });
  };
}
