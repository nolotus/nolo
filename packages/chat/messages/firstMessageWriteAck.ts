// 文件路径: chat/messages/firstMessageWriteAck.ts
//
// 新对话首条消息的「先等对话记录落库，再发 run」闸门。
//
// 竞态：createDialogAction 的乐观返回/写 thunk 都只保证**本地**落库，
// 远程复制是即发即忘的。若在对话记录还没到服务端时就 POST /api/agent/run，
// 服务端 continueDialogContext 查不到记录，会退到 findDialogRecord 全库扫描
// （alpha 线上实测 TTFB 5.6–7.9s；带 key 且已落库 0.82s）。
//
// 复用而不是另建协议：await 的是 database/actions/writeAck 注册表里那条
// 已经发出的 POST /database/write/ 请求的响应，而且必须是**本次 run 目标**
// 那台服务器的那一次请求（run 打 currentServer，复制计划第一台是 authority，
// 两者在 authority override 下可能不是同一台）。

import {
  DEFAULT_WRITE_ACK_TIMEOUT_MS,
  waitForWriteAck,
  type WriteAckWaitResult,
  type WriteAckWaitTarget,
} from "database/actions/writeAck";

/**
 * 首条消息在发 run 前等待对话记录写入确认的上限。
 *
 * 默认 1500ms（见 writeAck.ts 中 DEFAULT_WRITE_ACK_TIMEOUT_MS 的取值理由：
 * 典型写往返数百毫秒，而服务端 miss 扫描要 5.6–7.9s，1500ms ≈ 3× 写往返
 * 且远小于最坏路径）。超时后**照旧发 run**，用户不会被卡住——最坏情况只是
 * 退回到修复前的时序。
 */
export const FIRST_MESSAGE_WRITE_ACK_TIMEOUT_MS = DEFAULT_WRITE_ACK_TIMEOUT_MS;

export interface FirstMessageAckWaitOptions {
  timeoutMs: number;
  /** 本次 run 请求的服务器；null 表示调用方不知道（按主目标处理）。 */
  targetServer: string | null;
}

export type FirstMessageAckWait = (
  dialogKey: string,
  options: FirstMessageAckWaitOptions
) => Promise<WriteAckWaitResult>;

export interface AwaitFirstMessageDialogWriteAckOptions {
  /** 注入只用于测试可控时序；生产走 writeAck 注册表，不轮询服务器。 */
  wait?: FirstMessageAckWait;
  timeoutMs?: number;
  /** 本次 run 请求的服务器（serverOwnedWebForegroundTurn 的 currentServer）。 */
  targetServer?: string | null;
}

const defaultWait: FirstMessageAckWait = (dialogKey, options) =>
  waitForWriteAck(dialogKey, {
    timeoutMs: options.timeoutMs,
    targetServer: options.targetServer,
  });

/**
 * 等待失败时的兜底结果：一律 fail-open（调用方照旧发 run），
 * 只把 outcome 记成 failed 供日志/诊断使用。
 */
const failedWaitResult = (): WriteAckWaitResult => ({
  outcome: { status: "failed" },
  timedOut: false,
  waitedMs: 0,
  waitTarget: "none",
});

const isWaitTarget = (value: unknown): value is WriteAckWaitTarget =>
  value === "run-target" ||
  value === "primary-fallback" ||
  value === "primary" ||
  value === "none";

/**
 * 把 wait 的返回值收敛成可安全读写的形状。
 *
 * 注入的 wait 是外部实现（测试/未来替身），可能返回 undefined、缺字段，
 * 甚至字段 getter 直接抛错；这里只做形状归一，任何异常都由调用方 catch
 * 后走 fail-open，绝不让异常外泄成发送失败。
 */
const normalizeWaitResult = (raw: unknown): WriteAckWaitResult => {
  if (!raw || typeof raw !== "object") {
    return failedWaitResult();
  }
  const value = raw as Partial<WriteAckWaitResult>;
  const status = value.outcome?.status;
  if (typeof status !== "string") {
    return failedWaitResult();
  }
  const waitedMs = value.waitedMs;
  const timedOut = value.timedOut;
  return {
    outcome: { status },
    timedOut: timedOut === true,
    waitedMs: typeof waitedMs === "number" && Number.isFinite(waitedMs)
      ? waitedMs
      : 0,
    waitTarget: isWaitTarget(value.waitTarget) ? value.waitTarget : "none",
  };
};

/**
 * 等该对话记录的服务端写入确认（有界）。
 *
 * - 该 dialogKey 上没有 in-flight 写入（例如已有对话的普通发送、或写早已确认）
 *   时，waitForWriteAck 立即返回，不引入任何延迟。
 * - `options.targetServer` 是本次 run 请求的服务器：等待的是**它**那份写请求的
 *   ACK；目标不在复制计划里时回退主目标（waitTarget=primary-fallback，带 warn）。
 * - **绝不 throw**：等待本身、结果归一化、诊断日志都被保护，任何异常都返回
 *   失败结果，让发送流程继续 dispatch run（fail-open）。
 */
export const awaitFirstMessageDialogWriteAck = async (
  dialogKey: string,
  options: AwaitFirstMessageDialogWriteAckOptions = {}
): Promise<WriteAckWaitResult> => {
  const timeoutMs = options.timeoutMs ?? FIRST_MESSAGE_WRITE_ACK_TIMEOUT_MS;
  const targetServer = options.targetServer ?? null;
  const wait = options.wait ?? defaultWait;

  let result: WriteAckWaitResult;
  try {
    result = normalizeWaitResult(
      await wait(dialogKey, { timeoutMs, targetServer })
    );
  } catch (error) {
    // 等待抛错/reject 不等于发送失败：记录后照旧发 run。
    try {
      console.warn(
        `[FirstMessageWriteAck] dialogKey=${dialogKey} wait failed, sending anyway: ${
          (error as { message?: string })?.message ?? String(error)
        }`
      );
    } catch {
      // 诊断日志本身也不允许影响发送。
    }
    return failedWaitResult();
  }

  try {
    // 连接器读 console 有 300 字符截断：dialogKey / waitedMs / timedOut 前置。
    console.info(
      `[FirstMessageWriteAck] dialogKey=${dialogKey} waitedMs=${Math.round(
        result.waitedMs
      )} timedOut=${result.timedOut} outcome=${
        result.outcome.status
      } ackTarget=${result.waitTarget} targetServer=${
        targetServer ?? "unknown"
      } timeoutMs=${timeoutMs}`
    );
  } catch {
    // 日志失败不影响已有的等待结果。
  }
  return result;
};
