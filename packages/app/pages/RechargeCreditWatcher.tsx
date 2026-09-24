import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import toast from "app/utils/toast";
import { useLocation } from "app/routing";
import { useRechargeCreditWatch } from "app/hooks/useRechargeCreditWatch";
import {
  readOrderSnapshot,
  updateOrderSnapshot,
  clearOrderSnapshot,
  resolveCreditWatch,
  subscribeOrderSnapshot,
} from "app/pages/rechargeOrderState";

/**
 * E2：到账反馈全局化。
 *
 * 用户完成支付后通常直接回到聊天页（不在 /recharge），"到账"这一关键正反馈
 * 必须追着用户出现。本组件挂在 MainLayout（任意页面生效）：
 * - 仅当本地存在「刚下单/等待确认」的订单快照时启动轮询（避免常驻轮询）；
 * - **独占**：/recharge 页内有自己的 confirming 轮询，本组件在该路由下不启动，
 *   避免同一快照被两处同时轮询（双 toast / clear 竞态）；
 * - 快照状态每次路由变化、快照写入/清除、跨标签页 storage 事件时重新同步
 *   （MainLayout 常驻不卸载，下单发生在挂载之后，只读一次会永久失效）；
 * - 余额超过快照基线 → 弹全局 toast「+N 积分已到账」并清理快照；
 * - 轮询超时 → 把快照标记为 delayed（Recharge 页据此展示延迟态），
 *   避免重挂/刷新后对着同一个陈旧快照反复轮询。
 */
export const RechargeCreditWatcher: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const onRechargePage = (location?.pathname ?? "").startsWith("/recharge");
  const [watch, setWatch] = useState<{ active: boolean; baseline?: number }>({
    active: false,
  });

  const pathname = location?.pathname ?? "";

  useEffect(() => {
    const sync = () => {
      const resolved = resolveCreditWatch(readOrderSnapshot());
      setWatch((current) => {
        if (!resolved) {
          // 快照被清除 / 进入终态 → 停止轮询
          return current.active ? { active: false } : current;
        }
        return current.active && current.baseline === resolved.baseline
          ? current
          : { active: true, baseline: resolved.baseline };
      });
    };

    sync();
    const unsubscribe = subscribeOrderSnapshot(sync);
    // sessionStorage 为每标签页独立存储，跨标签页不会同步；这里兜住同一标签页
    // 内其他文档（iframe 等）写入的快照，保证不会对着旧状态轮询
    window.addEventListener("storage", sync);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", sync);
    };
    // pathname 变化（含离开 /recharge）时重新同步：本组件的轮询由
    // onRechargePage 门控，离开充值页后需要一份最新的快照状态才可能启动
  }, [pathname]);

  useRechargeCreditWatch({
    active: watch.active && !onRechargePage,
    baseline: watch.baseline,
    onCredited: (balance, delta) => {
      setWatch({ active: false });
      clearOrderSnapshot();
      toast.success(
        t("recharge_page.orderState.credited", { delta, balance })
      );
    },
    onTimeout: () => {
      setWatch({ active: false });
      // 标记 delayed：既保留给 /recharge 页展示延迟态，又让本组件不再对它轮询
      updateOrderSnapshot({ phase: "delayed" });
    },
  });

  return null;
};

export default RechargeCreditWatcher;
