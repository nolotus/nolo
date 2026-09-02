import type { ReactNode } from "react";
// Web toast adapter — react-hot-toast style API, backed by render/web/ui/Toast.
// The .native.ts variant handles React Native separately.

// 只接 store（纯 TS）：Toast.tsx 静态携带 StyleX 编译期载体
// （toast.styles.ts），bun 裸运行时（CLI / agent run worker）加载即崩。
import { toastManager, type ToastType } from "render/web/ui/toastStore";

type ToastOptions = {
  /** Auto-dismiss timeout in ms (react-hot-toast alias `duration` supported) */
  timeout?: number;
  duration?: number;
  /** Toast key — reusing an id updates the existing toast in place */
  id?: string;
  /** Custom icon node — overrides the type default */
  icon?: ReactNode;
  /** Optional description rendered below the title */
  description?: ReactNode;
  /** Optional action button rendered below the message */
  action?: { label: string; onClick: () => void };
  /** Optional fixed viewport position (x,y in px). When set, toast detaches from the bottom-right viewport and pins to this point. */
  position?: { x: number; y: number };
};

const DEFAULT_TIMEOUT = 4000;

function add(
  message: ReactNode,
  type: ToastType,
  options?: ToastOptions,
): string {
  const timeout = options?.timeout ?? options?.duration;
  return toastManager.add({
    id: options?.id,
    title: message,
    type,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    position: options?.position,
    // loading toasts stay until explicitly replaced/closed (timeout=0)
    timeout: type === "loading" ? (timeout ?? 0) : (timeout ?? DEFAULT_TIMEOUT),
  });
}

export const toast = Object.assign(
  (message: ReactNode, options?: ToastOptions) =>
    add(message, "default", options),
  {
    success: (message: ReactNode, options?: ToastOptions) =>
      add(message, "success", options),
    error: (message: ReactNode, options?: ToastOptions) =>
      add(message, "error", options),
    info: (message: ReactNode, options?: ToastOptions) =>
      add(message, "default", options),
    loading: (message: ReactNode, options?: ToastOptions) =>
      add(message, "loading", options),
    dismiss: (id?: string) => toastManager.close(id),
  },
);

export default toast;
