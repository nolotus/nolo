import React, { lazy, Suspense } from "react";
import { useParams } from "app/routing";
import PageLoading from "render/web/ui/PageLoading";
import NoMatch from "../NoMatch";
import PageObjectHeader from "./PageObjectHeader";
import { TopBarStateProvider } from "render/layout/TopBarStateProvider";

// 核心对话页面：静态导入
import DialogPage from "chat/dialog/DialogPage";
import LocalPreviewSplit from "app/pages/LocalPreviewSplit";

// 懒加载其他页面类型
const RenderPage = lazy(() => import("./RenderPage"));
const AgentPage = lazy(() => import("ai/agent/web/AgentPage"));
const TablePage = lazy(() => import("render/table/TablePage"));
const FilePage = lazy(() => import("./FilePage"));
const AppDetailPage = lazy(() => import("app/pages/AppDetailPage"));
const TaskPage = lazy(() => import("chat/task/TaskPage"));

const PageLoader: React.FC = () => {
  const { pageKey, spaceId } = useParams<"pageKey" | "spaceId">();

  if (!pageKey) return <NoMatch message="请选择一个页面或对话。" />;

  // 1. 核心对话页面：无延迟直接渲染。外层的分栏容器常驻，只在打开本地预览时
  //    把对话收窄到右侧，不改变对话在树里的位置（否则会卸载重挂）。
  if (pageKey.startsWith("dialog")) {
    // 对话页也带对象动作条（DialogMenu / 分享 / 收藏 / 删除）。分栏容器与对话
    // 组件保持原有树结构与挂载位置：给两者加稳定 key，新增的兄弟节点不会让
    // 对话被卸载重挂。
    return (
      <TopBarStateProvider>
        <PageObjectHeader key="page-object-header" />
        <LocalPreviewSplit key="dialog-split">
          <DialogPage key={pageKey} pageKey={pageKey} routeSpaceId={spaceId ?? null} />
        </LocalPreviewSplit>
      </TopBarStateProvider>
    );
  }

  // 2. 其它类型页面统一用 Suspense 包装
  let Component: React.ReactNode = null;

  if (pageKey.startsWith("page")) {
    Component = <RenderPage pageKey={pageKey} />;
  } else if (pageKey.startsWith("app-")) {
    Component = <AppDetailPage />;
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

  return (
    <TopBarStateProvider>
      <PageObjectHeader key="page-object-header" />
      <Suspense fallback={<PageLoading />}>{Component}</Suspense>
    </TopBarStateProvider>
  );
};

export default PageLoader;
