import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  LuX,
  LuCircleCheck as LuCheckCircle2,
  LuCircleAlert as LuAlertCircle,
  LuLoaderCircle as LuLoader2,
} from "react-icons/lu";
import { toastStyles } from "./toast.styles";
import {
  toastManager,
  type InternalToast,
  type ToastType,
} from "./toastStore";

export type { ToastType } from "./toastStore";

const TYPE_ICONS: Partial<Record<ToastType, typeof LuCheckCircle2>> = {
  success: LuCheckCircle2,
  error: LuAlertCircle,
  loading: LuLoader2,
};

// Toast 状态存储已拆至 ./toastStore（非 UI 下游只接 store，不接 StyleX 载体）。
// 兼容既有 import 路径（App.tsx / app/utils/toast.ts 之外的直接引用）。
export { toastManager } from "./toastStore";

function ToastItem({ toast }: { toast: InternalToast }) {
  const type = toast.type;
  const TypeIcon = type ? TYPE_ICONS[type] : undefined;
  const icon = toast.icon;

  return (
    <div
      className={`toast-root ${stylex.props(toastStyles.root).className ?? ""}`}
      data-starting-style={toast.phase === "entering" ? "" : undefined}
      data-ending-style={toast.phase === "exiting" ? "" : undefined}
      data-type={type}
      data-positioned={toast.position ? "" : undefined}
      style={
        toast.position
          ? { position: "fixed", left: `${toast.position.x}px`, top: `${toast.position.y}px` }
          : undefined
      }
    >
      <div {...stylex.props(toastStyles.content)}>
        {icon ? (
          <span {...stylex.props(toastStyles.icon)} aria-hidden="true">
            {icon}
          </span>
        ) : (
          TypeIcon && (
            <TypeIcon
              {...stylex.props(
                toastStyles.icon,
                type === "success" && toastStyles.iconSuccess,
                type === "error" && toastStyles.iconError,
                type === "loading" && toastStyles.iconLoading,
              )}
              aria-hidden="true"
            />
          )
        )}
        <div {...stylex.props(toastStyles.textWrapper)}>
          <div {...stylex.props(toastStyles.title)}>{toast.title}</div>
          {toast.description && (
            <div {...stylex.props(toastStyles.description)}>{toast.description}</div>
          )}
          {toast.action && (
            <button
              type="button"
              className={`toast-action ${stylex.props(toastStyles.action).className ?? ""}`.trim()}
              disabled={toast.phase === "exiting"}
              onClick={() => {
                if (toast.phase === "exiting") return;
                toastManager.close(toast.id);
                toast.action?.onClick();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={`toast-close ${stylex.props(toastStyles.close).className ?? ""}`.trim()}
        aria-label="Close"
        onClick={() => toastManager.close(toast.id)}
      >
        <LuX size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function ToastList() {
  const toasts = useSyncExternalStore(
    (cb) => toastManager.subscribe(cb),
    () => toastManager.getSnapshot(),
    // getServerSnapshot：缺了会在 hydration 期抛 "Missing getServerSnapshot"。
    () => toastManager.getSnapshot(),
  );
  return toasts.map((item) => <ToastItem key={item.id} toast={item} />);
}

export function MyToastRegion() {
  // 只在 hydration 结束后再挂 portal：SSR 时 body 里没有 toast-viewport，
  // 若在 hydration 阶段就 createPortal(document.body)，React 会拿 toast-viewport
  // 去匹配 body 里已有的 app 容器，导致整棵 root 的 hydration 被丢弃重渲染。
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(
    <div {...stylex.props(toastStyles.viewport)}>
      <ToastList />
    </div>,
    document.body,
  );
}
