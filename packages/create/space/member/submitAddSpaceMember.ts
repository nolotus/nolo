// create/space/member/submitAddSpaceMember.ts
//
// 客户端只发一个命令：/rpc/addSpaceMember。
//
// 服务端在**同一个 batch** 里提交 membership 行与 space body 的 members，因此
// 客户端不再需要「先 A 后 B 再补 ACK / 回滚」。这里只做三件事：
//   1. 生成 operationId（服务端据此做幂等：同 id 参数相同 -> 回放结果，参数不同 -> 冲突）；
//   2. 有界等待（超时是「结果未确认」，不是失败——重试必须可能命中已提交的结果）；
//   3. 把服务端错误码翻成用户能懂的话。

import { selectSpaceRemoteAuth } from "create/space/spaceAccess";
import type { MemberRole } from "app/types";

export const ADD_SPACE_MEMBER_TIMEOUT_MS = 10_000;

// 未确认的提交要复用同一个 operationId，服务端才能把「其实已经提交」的结果回放
// 回来。成功或被明确拒绝后清除；「结果未确认」保留给下一次重试。
const pendingOperations = new Map<string, string>();

export type SubmitAddSpaceMemberOutcome =
  | { ok: true; result: any }
  | { ok: false; code: "no-server" | "unconfirmed" | "rejected"; message: string };

const newOperationId = (): string => {
  const uuid = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
    ?.randomUUID;
  if (typeof uuid === "function") return uuid.call(globalThis.crypto);
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const messageForErrorCode = (code: unknown, fallback: string): string => {
  switch (code) {
    case "conflict":
      return "这次操作与之前的提交冲突，请刷新空间后重试";
    case "forbidden":
      return "你没有权限给这个空间添加成员";
    case "not_found":
      return "空间不存在或已被删除";
    case "invalid_input":
      return "加成员参数不完整";
    default:
      return fallback;
  }
};

export const submitAddSpaceMember = async (options: {
  spaceId: string;
  targetUserId: string;
  role?: MemberRole;
  state: any;
  /** 测试注入点；生产不传 */
  operationId?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<SubmitAddSpaceMemberOutcome> => {
  const { token, servers } = selectSpaceRemoteAuth(options.state);
  if (!token || servers.length === 0) {
    return {
      ok: false,
      code: "no-server",
      message: "没有可用的服务器，成员关系未提交",
    };
  }

  const operationKey = `${options.spaceId}:${options.targetUserId}`;
  const operationId =
    options.operationId ?? pendingOperations.get(operationKey) ?? newOperationId();
  if (!options.operationId && !pendingOperations.has(operationKey)) {
    pendingOperations.set(operationKey, operationId);
  }
  const timeoutMs = options.timeoutMs ?? ADD_SPACE_MEMBER_TIMEOUT_MS;
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(`${servers[0]}/rpc/addSpaceMember`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        spaceId: options.spaceId,
        targetUserId: options.targetUserId,
        operationId,
        ...(options.role ? { role: options.role } : null),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const raw =
        payload && typeof payload === "object"
          ? (payload as { message?: string; code?: string })
          : null;
      // 明确被拒绝：这次 operationId 已定论，不必留着重试。
      pendingOperations.delete(operationKey);
      return {
        ok: false,
        code: "rejected",
        message: messageForErrorCode(
          raw?.code,
          raw?.message || "服务端拒绝了这次加成员操作"
        ),
      };
    }

    const result = await response.json();
    pendingOperations.delete(operationKey);
    return { ok: true, result };
  } catch (error) {
    // 超时/网络中断：提交可能已经成功，所以不能说失败。用同一 operationId
    // 重试可以拿回真实结果（见服务端幂等记录）。
    return {
      ok: false,
      code: "unconfirmed",
      message: `成员关系提交结果未确认（${operationId}）：网络或服务端未在时限内响应，请重试`,
    };
  } finally {
    clearTimeout(timer);
  }
};
