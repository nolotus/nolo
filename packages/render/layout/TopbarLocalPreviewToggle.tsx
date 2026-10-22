import React, { useEffect, useMemo, useState } from "react";
import { LuMonitor } from "react-icons/lu";

import { getIsDesktopApp } from "app/utils/env";
import {
  setPreviewOpen,
  useLocalPreviewOpen,
} from "app/appInspector/appInspectorStore";
import { useCurrentDialogKey } from "chat/dialog/dialogRuntimeStore";
import {
  DESKTOP_FOLDER_SELECTION_EVENT,
  readDialogFolderPath,
  readDialogProjectId,
  readSelectedDesktopFolderPath,
} from "chat/web/desktopFolderProjects";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";

/** localStorage 读取面；SSR、隐私模式、配额异常都不能把顶栏弄崩。 */
type PreviewRootStorage = Pick<Storage, "getItem">;

function desktopStorage(): PreviewRootStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface LocalPreviewRootSources {
  /** `getIsDesktopApp()`。false 时完全走改造前的 Space 字段路径。 */
  isDesktop: boolean;
  /** 决定优先级的对话；它的 Project 绑定优先于侧栏选中项。 */
  dialogKey?: string | null;
  /** 历史 Space 字段（网页端唯一来源）。新建/保存的 Space 已不再写它。 */
  legacySpaceBoundFolder?: string | null;
  storage?: PreviewRootStorage | null;
}

/**
 * 本地预览 root 的唯一解析口径——顶栏开关的显隐和面板取 root 必须同源，
 * 否则会出现「有入口但面板是空态」（或反过来）。
 *
 * 桌面端：对话绑定的 Project 目录 → 当前选中的 Project 目录 → null（空态）。
 *   对话绑定了 Project 但该 Project 已被删除时**不**退回选中项：绑定不能悄悄
 *   指向别的目录（见 desktopFolderProjects 的约定），此时同样是空态。
 * 网页端：只认历史 Space 字段，与改造前逐项一致（不读桌面本地 Project）。
 */
export function resolveLocalPreviewRoot(
  sources: LocalPreviewRootSources,
): string | null {
  const legacy = sources.legacySpaceBoundFolder || null;
  if (!sources.isDesktop) return legacy;
  const { storage } = sources;
  if (!storage) return null;
  try {
    const dialogKey = sources.dialogKey?.trim();
    if (dialogKey && readDialogProjectId(storage, dialogKey) !== null) {
      return readDialogFolderPath(storage, dialogKey);
    }
    return readSelectedDesktopFolderPath(storage) ?? null;
  } catch {
    // 存储读不出来时按「没有目录」处理，不猜一个可能不存在的路径。
    return null;
  }
}

/**
 * 入口的唯一判定：对话路由 + 能解析到本地 Project 目录。
 * 没有目录时点开也只有空态，所以不显示；非对话路由的分栏不存在，点了没反应。
 */
export function shouldShowLocalPreviewToggle(
  contentKeyType: string | undefined,
  root: string | null,
): boolean {
  return contentKeyType === "dialog" && !!root;
}

/** 侧栏「本地项目」改动后要重新解析：开关得立刻出现/消失，而不是等下次无关重渲染。 */
function useDesktopFolderSelectionVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!getIsDesktopApp() || typeof window === "undefined") return;
    const bump = () => setVersion((value) => value + 1);
    window.addEventListener(DESKTOP_FOLDER_SELECTION_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(DESKTOP_FOLDER_SELECTION_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return version;
}

/** 顶栏开关与 LocalPreviewPanel 共用：同样的输入必须得到同样的 root。 */
export function useLocalPreviewRoot(
  legacySpaceBoundFolder: string | null,
): string | null {
  const isDesktop = getIsDesktopApp();
  const dialogKey = useCurrentDialogKey();
  const selectionVersion = useDesktopFolderSelectionVersion();
  return useMemo(
    () =>
      resolveLocalPreviewRoot({
        isDesktop,
        dialogKey,
        legacySpaceBoundFolder,
        storage: isDesktop ? desktopStorage() : null,
      }),
    [dialogKey, isDesktop, legacySpaceBoundFolder, selectionVersion],
  );
}

/**
 * 顶栏的本地预览开关。
 *
 * 只在「对话页 + 能解析到本地 Project 目录」时出现（见 shouldShowLocalPreviewToggle）。
 */
export const TopbarLocalPreviewToggle: React.FC<{ contentKeyType?: string }> = ({
  contentKeyType,
}) => {
  const legacySpaceBoundFolder =
    useCurrentSpaceFromEntity()?.boundFolder ?? null;
  const root = useLocalPreviewRoot(legacySpaceBoundFolder);
  const previewOpen = useLocalPreviewOpen();

  if (!shouldShowLocalPreviewToggle(contentKeyType, root)) return null;

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