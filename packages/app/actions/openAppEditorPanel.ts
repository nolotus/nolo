import { useCallback } from "react";
import type { RightSidebarApi } from "render/layout/RightSidebarContext";
import { useRightSidebarOptional } from "render/layout/RightSidebarContext";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { buildAppAssistantSidebarId } from "app/constants/appEditor";

/**
 * app「编辑」的唯一入口。
 *
 * 之前同一件事有两种交互：顶栏「对象助手」走右侧滑出面板（
 * `render/layout/useTopBarState.tsx` 的 app 分支），而详情页 / 卡片 / 部署卡片的
 * 「编辑」各自 `navigate(buildAppEditorPath(...))` 整页跳转。这里把「滑出面板」
 * 收敛成一个函数，四个入口都调它，副作用是同一个 app 只有**一个** sidebar id
 * （`buildAppAssistantSidebarId(appKey)`），点几次都不会开出两个面板。
 *
 * `open` 为空（没有 RightSidebar context：裸渲染、无 MainLayout 的壳、SSR）或
 * `open` 抛错时调 `onFallback()`——调用方传原来的 `navigate(editorPath)`，
 * 保证按钮永远不会点了没反应。「完整编辑器」深链接因此得以保留。
 */
export interface OpenAppEditorPanelArgs {
  open?: RightSidebarApi["open"] | null;
  appKey?: string | null;
  onFallback: () => void;
}

export const openAppEditorPanel = ({
  open,
  appKey,
  onFallback,
}: OpenAppEditorPanelArgs): void => {
  if (!open || !appKey) {
    onFallback();
    return;
  }
  try {
    openObjectAssistantSidebar(open, {
      kind: "app",
      contentKey: appKey,
      // 不传 width：MainLayout 在 requestedWidth 为 null 时用用户的右侧栏宽度偏好。
      sidebarId: buildAppAssistantSidebarId(appKey),
    });
  } catch {
    onFallback();
  }
};

/**
 * 组件侧薄封装：从 RightSidebar context 取 `open`（可选读取，不在壳里时为 null），
 * 其它逻辑全部落在 `openAppEditorPanel` 上。四个入口共用它，不各写一遍 if/else。
 */
export function useOpenAppEditorPanel(): (
  appKey: string | null | undefined,
  onFallback: () => void
) => void {
  const rightSidebar = useRightSidebarOptional();
  return useCallback(
    (appKey: string | null | undefined, onFallback: () => void) => {
      openAppEditorPanel({ open: rightSidebar?.open ?? null, appKey, onFallback });
    },
    [rightSidebar]
  );
}
