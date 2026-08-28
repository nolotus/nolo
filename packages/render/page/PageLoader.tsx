import React, { lazy, Suspense } from "react";
import { useParams, useSearchParams } from "app/routing";
import PageLoading from "render/web/ui/PageLoading";
import NoMatch from "../NoMatch";

// 核心对话页面：静态导入
import DialogPage from "chat/dialog/DialogPage";
import LocalPreviewSplit from "app/pages/LocalPreviewSplit";

// 懒加载其他页面类型
const RenderPage = lazy(() => import("./RenderPage"));
const AgentPage = lazy(() => import("ai/agent/web/AgentPage"));
const TablePage = lazy(() => import("render/table/TablePage"));
const FilePage = lazy(() => import("./FilePage"));
const AppDetailPage = lazy(() => import("app/pages/AppDetailPage"));
const AppEditorPage = lazy(() => import("app/pages/AppEditorPage"));
const TaskPage = lazy(() => import("chat/task/TaskPage"));

const PageLoader: React.FC = () => {
  const { pageKey, spaceId } = useParams<"pageKey" | "spaceId">();
  const [params] = useSearchParams();
  const isEditMode = params.get("edit") === "true";

  if (!pageKey) return <NoMatch message="请选择一个页面或对话。" />;

  // 1. 核心对话页面：无延迟直接渲染。外层的分栏容器常驻，只在打开本地预览时
  //    把对话收窄到右侧，不改变对话在树里的位置（否则会卸载重挂）。
  if (pageKey.startsWith("dialog")) {
    return (
      <LocalPreviewSplit>
        <DialogPage key={pageKey} pageKey={pageKey} routeSpaceId={spaceId ?? null} />
      </LocalPreviewSplit>
    );
  }

  // 2. 其它类型页面统一用 Suspense 包装
  let Component: React.ReactNode = null;

  if (pageKey.startsWith("page")) {
    Component = <RenderPage pageKey={pageKey} />;
  } else if (pageKey.startsWith("app-")) {
    Component = isEditMode ? <AppEditorPage /> : <AppDetailPage />;
  } else if (pageKey.startsWith("agent")) {
    Component = <AgentPage agentKey={pageKey} />;
  } else if (pageKey.startsWith("meta-")) {
    Component = <TablePage tableKey={pageKey} />;
  } else if (pageKey.startsWith("file") || pageKey.startsWith("image")) {
    Component = <FilePage pageKey={pageKey} />;
  } else if (pageKey.startsWith("task")) {
    Component = <TaskPage taskKey={pageKey} />;
  } else {
    return <NoMatch message={`无法识别的页面类型: ${pageKey}`} />;
  }

  return <Suspense fallback={<PageLoading />}>{Component}</Suspense>;
};

export default PageLoader;
