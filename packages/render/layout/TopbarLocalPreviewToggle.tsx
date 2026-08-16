import React from "react";
import { LuMonitor } from "react-icons/lu";

import { useAppSelector } from "app/store";
import { selectCurrentSpace } from "create/space/spaceSlice";
import {
  setPreviewOpen,
  useLocalPreviewOpen,
} from "app/appInspector/appInspectorStore";

/**
 * 顶栏的本地预览开关。
 *
 * 只在「对话页 + 当前空间绑定了本地文件夹」时出现——分栏只存在于对话路由，
 * 在别处显示会点了没反应。
 */
export const TopbarLocalPreviewToggle: React.FC<{ contentKeyType?: string }> = ({
  contentKeyType,
}) => {
  // selectCurrentSpace 在 space state 缺失时会抛（读 space.viewMode），所以先探一手。
  const boundFolder = useAppSelector((state: any) =>
    state?.space ? selectCurrentSpace(state)?.boundFolder : undefined,
  );
  const previewOpen = useLocalPreviewOpen();

  if (contentKeyType !== "dialog" || !boundFolder) return null;

  const label = previewOpen ? "关闭本地预览" : "本地预览";

  return (
    <button
      type="button"
      className={`topbar__button ${previewOpen ? "is-active" : ""}`}
      onClick={() => setPreviewOpen(!previewOpen)}
      title={label}
      aria-label={label}
      aria-pressed={previewOpen}
    >
      <LuMonitor size={16} aria-hidden="true" />
    </button>
  );
};

export default TopbarLocalPreviewToggle;
