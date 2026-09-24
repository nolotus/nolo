/**
 * useRechargeCreditWatch — 「确认中」余额轮询 + 到账广播。
 *
 * 设计：
 * - 纯 hook、可挂在任何页面；Recharge 用它做 confirming→credited/delayed，
 *   全局（如 MainLayout）也可复用做「余额增加 → toast」。
 * - 轮询不依赖 Redux：直接调 fetchAccountProfile 拿最新余额，命中后由
 *   onCredited 决定是否 updateAccountProfile（避免与 useAccountProfileRefresh
 *   的写入语义重复）。
 * - 每 3s 一次、最多 13 次（≈40s），与 rechargeOrderState 的常量一致。
 */

import { useEffect, useRef } from "react";

import { fetchAccountProfile } from "identity/accountProfile";
import { useAccountSessionService, useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useUserId } from "identity";

export interface CreditWatchOptions {
  /** 为 true 时启动/继续轮询 */
  active: boolean;
  /** 基线余额；轮询中余额 > baseline 即判定到账 */
  baseline?: number;
  intervalMs?: number;
  maxAttempts?: number;
  /** 命中到账：参数为新余额与增量 */
  onCredited?: (balance: number, delta: number) => void;
  /** 次数用尽仍未到账 */
  onTimeout?: () => void;
}

export const useRechargeCreditWatch = (options: CreditWatchOptions): void => {
  const {
    active,
    baseline,
    intervalMs = 3_000,
    maxAttempts = 13,
    onCredited,
    onTimeout,
  } = options;
  const accountSession = useAccountSessionService();
  const userId = useUserId();
  const serverUrl = useAppSelector(selectRemoteServer);
  // 回调用 ref 持有，避免父组件每次渲染重建导致轮询重启
  const callbacksRef = useRef({ onCredited, onTimeout });
  callbacksRef.current = { onCredited, onTimeout };

  useEffect(() => {
    if (!active || !accountSession || !userId) return;
    const token = accountSession.getSnapshot().activeToken;
    if (!token || !serverUrl) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const profile = await fetchAccountProfile({
          serverUrl,
          token,
          userId,
        });
        if (cancelled) return;
        const next = profile?.balance;
        if (
          typeof next === "number" &&
          typeof baseline === "number" &&
          next > baseline
        ) {
          accountSession.updateAccountProfile(profile);
          callbacksRef.current.onCredited?.(next, next - baseline);
          return;
        }
      } catch {
        /* 单次失败静默，继续下一轮 */
      }
      if (cancelled) return;
      if (attempts >= maxAttempts) {
        callbacksRef.current.onTimeout?.();
        return;
      }
      timer = setTimeout(tick, intervalMs);
    };

    timer = setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [accountSession, active, baseline, intervalMs, maxAttempts, serverUrl, userId]);
};
