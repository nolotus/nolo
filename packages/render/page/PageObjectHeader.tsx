import React from "react";
import { VersionHistoryPanel } from "create/version/VersionHistoryPanel";
import { useTopBarStateContext } from "render/layout/TopBarStateContext";

/**
 * 内容对象页的浮层宿主：目前只有 VersionHistoryPanel（版本历史）。
 * 对象动作本身由各页面自己承载（表格 / App / 文件页用 PageObjectActions，
 * 文档页并入标题行，对话页是右上角悬浮菜单），这里不再渲染任何头部条。
 */
const PageObjectHeader: React.FC = () => {
  const s = useTopBarStateContext();
  if (!s) return null;

  return (
    <>
      {s.showVersionPanel && s.contentKeyType === "app" && s.appDetail?.appId && (
        <VersionHistoryPanel
          type="app"
          entityId={s.appDetail.appId}
          sourceServerOrigin={s.appDetail.versionServerOrigin ?? s.appDetail.serverOrigin}
          onClose={() => s.setShowVersionPanel(false)}
          onRestore={() => {
            void s.refetchApp();
            window.dispatchEvent(new CustomEvent("app-editor-refresh"));
          }}
        />
      )}
      {s.showVersionPanel && s.contentKeyType !== "app" && s.pageKey && (
        <VersionHistoryPanel
          type="doc"
          entityId={s.pageKey}
          onClose={() => s.setShowVersionPanel(false)}
        />
      )}
    </>
  );
};

export default PageObjectHeader;
