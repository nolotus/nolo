// 文件路径: render/layout/MainLayout.tsx
import { useIsLoggedIn } from "identity";
import { cloudLazy } from "identity/cloudLazy";
import ChatErrorBoundary from "chat/web/ChatErrorBoundary";
import { useDragResize } from "app/hooks/useDragResize";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
} from "react";
import { Outlet, useLocation } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { zIndex } from "render/styles/zIndex";
import { setSidebarWidth, selectSidebarWidth } from "app/settings/settingSlice";
import { useViewMode, setViewMode } from "create/space/spaceCurrentStore";
import PageContentErrorBoundary from "./PageContentErrorBoundary";
import PageLoading from "../web/ui/PageLoading";

import RightSidebarContext, {
  RightSidebarOptions,
} from "./RightSidebarContext";
import MainSidebarContext from "./MainSidebarContext";
import { useIsMobile } from "app/hooks/useIsMobile";
import { useHasMounted } from "app/hooks/useHasMounted";
import { shouldRenderChatSidebar } from "./mainLayoutSidebar";
import { shouldRenderSiteFooter } from "./siteFooterRoutes";
import {
  isAllViewRoutePath,
  isSpaceRoutePath,
  shouldForceCategoriesViewMode,
} from "./mainLayoutViewMode";
import { MobileDownloadBanner } from "./MobileDownloadBanner";
import { getIsDesktopApp } from "app/utils/env";
import "./layout.css";

const TopBar = lazy(() => import("./TopBar"));
// 页脚只出现在内容型路由，懒加载避免拖累工作区首屏
const SiteFooter = lazy(() => import("./SiteFooter"));
const chatSidebarImport = () => import("chat/web/ChatSidebar");
const ChatSidebar = lazy(chatSidebarImport);
// life 包在公开集不存在；cloudLazy 用变量路径绕过 esbuild static resolution。
const LifeSidebar = cloudLazy("life/LifeSidebar", () => null);
// Desktop shell only: bell + avatar live in the sidebar footer instead of the topbar.
const SidebarUserSection = lazy(
  () => import("chat/web/sidebar/SidebarUserSection")
);

// Warm the sidebar chunk as soon as the shell mounts so first open is not cold.
// TopBar stays lazy-only: eager import races layout unit tests (mock.restore timing)
// and the Suspense slot below already reserves full --topbar-height (0px height jump).
if (typeof window !== "undefined") {
  void chatSidebarImport();
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 360;
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 360;
const RIGHT_SIDEBAR_MIN_WIDTH = 280;
const RIGHT_SIDEBAR_MAX_WIDTH = 640;

interface RightSidebarState {
  isOpen: boolean;
  content: React.ReactNode | null;
  width: number;
  closeOnRouteChange: boolean;
  id?: string;
}

interface MainSidebarState {
  content: React.ReactNode | null;
  id?: string;
}

const MainLayout: React.FC = () => {
  const location = useLocation();
  const isLoggedIn = useIsLoggedIn();
  const dispatch = useAppDispatch();
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const viewMode = useViewMode();
  const isOpen = sidebarWidth > 0;
  const hasMounted = useHasMounted();

  const [isResizing, setIsResizing] = useState(false);
  const [isRightResizing, setIsRightResizing] = useState(false);
  const isMobile = useIsMobile(768);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const rightSidebarRef = useRef<HTMLElement | null>(null);
  const lastWidthRef = useRef(sidebarWidth);
  const autoClosedByViewportRef = useRef(false);
  // 移动端抽屉只认用户主动打开：登录后服务端设置回填的 sidebarWidth 不算。
  const mobileUserOpenedRef = useRef(false);
  const hasRestoredAllViewSidebar = useRef(false);
  const bodyOverflowRef = useRef<string | null>(null);

  const [rightSidebar, setRightSidebar] = useState<RightSidebarState>({
    isOpen: false,
    content: null,
    width: RIGHT_SIDEBAR_DEFAULT_WIDTH,
    closeOnRouteChange: true,
    id: undefined,
  });
  const [mainSidebar, setMainSidebar] = useState<MainSidebarState>({
    content: null,
    id: undefined,
  });

  const isRightOpen = rightSidebar.isOpen;

  useEffect(() => {
    if (sidebarWidth > 0) {
      lastWidthRef.current = sidebarWidth;
    }
  }, [sidebarWidth]);

  // Wave A: viewMode 的 localStorage 读写已由 spaceUiStore 处理，
  // 这里不再手动 setItem / restore。初始值在 module store 创建时从 localStorage 读，
  // SSR-safe（window 不存在时默认 "all"）。

  const useAllViewSidebar = isAllViewRoutePath(location.pathname);
  const isSpaceRoute = isSpaceRoutePath(location.pathname);
  const isLifeRoute = location.pathname.startsWith("/life");
  const isDesktopApp = getIsDesktopApp();
  const renderSiteFooter = shouldRenderSiteFooter(location.pathname);
  const renderChatSidebar = shouldRenderChatSidebar({
    isLoggedIn,
    hasMounted,
    useAllViewSidebar,
    isLifeRoute,
    pathname: location.pathname,
    isDesktopApp,
  });

  useEffect(() => {
    if (shouldForceCategoriesViewMode(location.pathname, viewMode)) {
      setViewMode("categories");
    }
  }, [location.pathname, viewMode]);

  useEffect(() => {
    if (isMobile) return;
    if (!useAllViewSidebar) {
      hasRestoredAllViewSidebar.current = false;
      return;
    }
    if (sidebarWidth > 0 || hasRestoredAllViewSidebar.current) return;
    hasRestoredAllViewSidebar.current = true;
      dispatch(setSidebarWidth(lastWidthRef.current || 280));
  }, [dispatch, isMobile, sidebarWidth, useAllViewSidebar]);

  const defaultSidebarContent = useAllViewSidebar ? (
    renderChatSidebar ? (
      <ChatErrorBoundary fallbackMessage="侧栏加载出错">
        <ChatSidebar />
      </ChatErrorBoundary>
    ) : null
  ) : isLifeRoute ? (
    <LifeSidebar />
  ) : renderChatSidebar ? (
    <ChatErrorBoundary fallbackMessage="侧栏加载出错">
      <ChatSidebar />
    </ChatErrorBoundary>
  ) : null;

  const sidebarContent = mainSidebar.content ?? defaultSidebarContent;

  const hasSidebar = sidebarContent !== null;

  const toggleSidebar = useCallback(() => {
    const isOpening = sidebarWidth <= 0;
    mobileUserOpenedRef.current = isOpening;
    const newWidth = isOpening ? lastWidthRef.current || 280 : 0;
    dispatch(setSidebarWidth(newWidth));
  }, [dispatch, sidebarWidth]);

  const openRightSidebar = useCallback(
    (content: React.ReactNode, options?: RightSidebarOptions) => {
      setRightSidebar({
        isOpen: true,
        content,
        width: options?.width ?? RIGHT_SIDEBAR_DEFAULT_WIDTH,
        closeOnRouteChange: options?.closeOnRouteChange ?? true,
        id: options?.id,
      });
    },
    []
  );

  const closeRightSidebar = useCallback(() => {
    setRightSidebar((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const setMainSidebarContent = useCallback(
    (content: React.ReactNode, options?: { id?: string }) => {
      setMainSidebar({
        content,
        id: options?.id,
      });
    },
    []
  );

  const clearMainSidebarContent = useCallback((id?: string) => {
    setMainSidebar((prev) => {
      if (id && prev.id !== id) {
        return prev;
      }
      return {
        content: null,
        id: undefined,
      };
    });
  }, []);

  const { handlePointerDown: startResizing } = useDragResize({
    cursor: "col-resize",
    onStart: () => setIsResizing(true),
    onMove: (clientX) => {
      requestAnimationFrame(() => {
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, clientX));
        if (sidebarRef.current) {
          sidebarRef.current.style.width = `${newWidth}px`;
        }
      });
    },
    onStop: () => {
      if (sidebarRef.current) {
        const finalWidth = parseInt(sidebarRef.current.style.width, 10);
        sidebarRef.current.style.width = "";
        if (!isNaN(finalWidth)) {
          dispatch(setSidebarWidth(finalWidth));
        }
      }
      setIsResizing(false);
    },
  });

  const { handlePointerDown: startRightResizing } = useDragResize({
    cursor: "col-resize",
    onStart: () => setIsRightResizing(true),
    onMove: (clientX) => {
      requestAnimationFrame(() => {
        const newWidth = Math.min(
          RIGHT_SIDEBAR_MAX_WIDTH,
          Math.max(RIGHT_SIDEBAR_MIN_WIDTH, window.innerWidth - clientX)
        );
        if (rightSidebarRef.current) {
          rightSidebarRef.current.style.width = `${newWidth}px`;
        }
      });
    },
    onStop: () => {
      if (rightSidebarRef.current) {
        const finalWidth = parseInt(rightSidebarRef.current.style.width, 10);
        rightSidebarRef.current.style.width = "";
        if (!isNaN(finalWidth)) {
          setRightSidebar((prev) => ({ ...prev, width: finalWidth }));
        }
      }
      setIsRightResizing(false);
    },
  });

  // 快捷键：Ctrl/Cmd + B 切换左侧栏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b" && hasSidebar) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidebar, hasSidebar]);

  // 视口跨过移动断点：收窄时自动收起左侧栏，重新变宽时恢复自动收起前的宽度。
  // 移动端还要盯住 sidebarWidth 本身：登录成功后服务端设置回填 280，
  // 抽屉会盖住首页——只有用户点开（toggleSidebar）才算主动打开。
  useEffect(() => {
    if (!isMobile) {
      if (autoClosedByViewportRef.current) {
        autoClosedByViewportRef.current = false;
        dispatch(setSidebarWidth(lastWidthRef.current || 280));
      }
      mobileUserOpenedRef.current = false;
      return;
    }
    if (sidebarWidth > 0 && !mobileUserOpenedRef.current) {
      autoClosedByViewportRef.current = true;
      dispatch(setSidebarWidth(0));
    }
  }, [isMobile, sidebarWidth, dispatch]);

  // 路由切换时，如有需要自动关闭右侧栏
  useEffect(() => {
    setRightSidebar((prev) => {
      if (!prev.isOpen || !prev.closeOnRouteChange) return prev;
      return { ...prev, isOpen: false };
    });
  }, [location.pathname]);

  // 移动端锁 body 滚动（仅在我们需要时改为 hidden，并在结束时恢复）
  useEffect(() => {
    const shouldLockScroll =
      isMobile && ((hasSidebar && isOpen) || isRightOpen);

    if (shouldLockScroll) {
      if (bodyOverflowRef.current == null) {
        bodyOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
    } else if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }

    return () => {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
    };
  }, [isOpen, isMobile, hasSidebar, isRightOpen]);

  return (
    <MainSidebarContext.Provider
      value={{
        setContent: setMainSidebarContent,
        clearContent: clearMainSidebarContent,
        currentId: mainSidebar.id,
      }}
    >
      <RightSidebarContext.Provider
        value={{
          open: openRightSidebar,
          close: closeRightSidebar,
          isOpen: isRightOpen,
          currentId: rightSidebar.id,
        }}
      >
        <div className={`MainLayout ${isResizing ? "is-resizing" : ""}`}>
        {/* 左侧常驻侧边栏 */}
        {hasSidebar && (
          <aside
            ref={sidebarRef}
            className={`MainLayout__sidebar ${isOpen ? "is-open" : ""}`}
            style={isMobile ? undefined : { width: sidebarWidth }}
          >
            <div className="MainLayout__sidebarContent">{sidebarContent}</div>
            {isLoggedIn && (
              <Suspense fallback={null}>
                <SidebarUserSection />
              </Suspense>
            )}
            {!isMobile && (
              <div
                className="MainLayout__resizeHandle"
                onPointerDown={startResizing}
              />
            )}
          </aside>
        )}

        {/* 中心区域：TopBar + (Outlet 内容 + 右侧栏) */}
        <div className="MainLayout__center">
          <Suspense
            fallback={
              <div
                className="MainLayout__topbarSlot"
                aria-hidden="true"
              />
            }
          >
            <TopBar
              toggleSidebar={hasSidebar ? toggleSidebar : undefined}
              isSidebarOpen={hasSidebar ? isOpen : false}
            />
          </Suspense>

          <div className="MainLayout__contentRow">
            {/* 中间主内容：这里滚动 */}
            <main className="MainLayout__main">
              <PageContentErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Outlet />
                </Suspense>
              </PageContentErrorBoundary>
              {renderSiteFooter && (
                <Suspense fallback={null}>
                  <SiteFooter />
                </Suspense>
              )}
            </main>

            {/* 右侧临时侧边栏：只挤压 Outlet，不挤压 TopBar */}
            <aside
              ref={rightSidebarRef}
              className={`MainLayout__rightSidebar ${isRightOpen ? "is-open" : ""} ${isRightResizing ? "is-right-resizing" : ""}`}
              style={
                isMobile
                  ? undefined
                  : {
                    width: isRightOpen ? rightSidebar.width : 0,
                  }
              }
              aria-hidden={!isRightOpen}
            >
              {!isMobile && isRightOpen && (
                <div
                  className="MainLayout__rightResizeHandle"
                  onPointerDown={startRightResizing}
                />
              )}
              {rightSidebar.content && (
                <div className="MainLayout__sidebarContent MainLayout__sidebarContent--right">
                  <Suspense fallback={<div className="MainLayout__sidebar-loading" />}>
                    {rightSidebar.content}
                  </Suspense>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* 移动端遮罩：任一侧栏打开就显示 */}
        {isMobile && ((hasSidebar && isOpen) || isRightOpen) && (
          <button
            type="button"
            className="MainLayout__backdrop"
            aria-label="关闭侧栏"
            onClick={() => {
              if (hasSidebar && isOpen) toggleSidebar();
              if (isRightOpen) closeRightSidebar();
            }}
          />
        )}

        {/* 移动端悬浮客户端下载提示条 */}
        <MobileDownloadBanner />
        </div>
      </RightSidebarContext.Provider>
    </MainSidebarContext.Provider>
  );
};

export default MainLayout;
