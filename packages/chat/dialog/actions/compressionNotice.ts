// chat/dialog/actions/compressionNotice.ts

/**
 * 自动压缩的用户可见通知（web/desktop toast）。
 *
 * toast 实现（render/web/ui/toastStore）依赖 StyleX 编译期载体，在 bun 裸
 * 运行时（单测 / 非浏览器环境）调用即崩——通知是纯观测旁路，绝不能让
 * 「提示用户」这件事反过来弄坏压缩主流程，所以这里统一 try/catch 收口。
 */

import { toast } from "app/utils/toast";
import i18n from "app/i18n";

export function notifyCompressionSuccess(): void {
  try {
    toast.success(
      i18n.t("chat:contextAutoCompressed", "已自动压缩上下文"),
    );
  } catch {
    // 无 UI 层运行环境：跳过通知
  }
}

export function notifyCompressionFailure(error: unknown): void {
  try {
    toast.error(i18n.t("chat:contextAutoCompressFailed", "上下文自动压缩失败"), {
      description:
        error instanceof Error && error.message
          ? error.message.slice(0, 200)
          : undefined,
    });
  } catch {
    // 无 UI 层运行环境：跳过通知
  }
}
