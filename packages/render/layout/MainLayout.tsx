// 文件路径: render/layout/MainLayout.tsx
import { useIsLoggedIn } from "identity";
import { cloudLazy } from "identity/cloudLazy";
import ChatErrorBoundary from "chat/web/ChatErrorBoundary";
import { useDragResize } from "app/hooks/useDragResize";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
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
import {
  useRightSidebarPreferredWidth,
  setRightSidebarPreferredWidth,
  DEFAULT_RIGHT_SIDEBAR_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
} from "app/layout/rightSidebarPreference";
import { useNavigationPlacement } from "app/layout/navigationPlacementPreference";
import { useCompanionPlacement } from "app/layout/companionPlacementPreference";
import {
  resolveCompanionEffectiveWidth,
  pointerXToCompanionWidth,
  resolveCompanionKeyboardDelta,
  MAIN_CONTENT_MIN_WIDTH,
} from "./rightSidebarGeometry";
import { pointerXToNavigationWidth } from "./navigationGeometry";
import { useIsMobile } from "app/hooks/useIsMobile";
import { RechargeCreditWatcher } from "app/pages/RechargeCreditWatcher";
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
import { getGuestNaturePage } from "./guestNaturePages";
import { SidebarToggleContext } from "./SidebarToggleContext";
import "./layout.css";
import "./sidebarContextToggle.css";

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

interface RightSidebarState {
  isOpen: boolean;
  content: React.ReactNode | null;
  requestedWidth: number | null;
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
  // Keep the first client render identical to SSR; media-query behavior starts after mount.
  const shouldRenderMobileLayout = hasMounted && isMobile;

  const sidebarRef = useRef<HTMLElement | null>(null);
  const mainLayoutRef = useRef<HTMLDivElement | null>(null);
  const rightSidebarRef = useRef<HTMLElement | null>(null);
  const lastWidthRef = useRef(sidebarWidth);
  /** 用户主动折叠后，All-View 恢复 effect 不能把折叠态静默展开。 */
  const userCollapsedRef = useRef(false);
  const autoClosedByViewportRef = useRef(false);
  // 移动端抽屉只认用户主动打开：登录后服务端设置回填的 sidebarWidth 不算。
  const mobileUserOpenedRef = useRef(false);
  const hasRestoredAllViewSidebar = useRef(false);
  const bodyOverflowRef = useRef<string | null>(null);

  const [rightSidebar, setRightSidebar] = useState<RightSidebarState>({
    isOpen: false,
    content: null,
    requestedWidth: null,
    closeOnRouteChange: true,
    id: undefined,
  });
  const [mainSidebar, setMainSidebar] = useState<MainSidebarState>({
    content: null,
    id: undefined,
  });

  const contentRowRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const isSidebarTransitioningRef = useRef(false);
  // The marker must live in React state: the same render that flips
  // railOnly/is-open rewrites the className attribute, which would wipe a
  // manually added classList flag and collapse the context column at t=0.
  const [isSidebarTransitioning, setIsSidebarTransitioning] = useState(false);
  const pendingContainerWidthRef = useRef<number | null>(null);
  /** 折叠请求中、尚未提交到 store 的侧栏宽度（用于连续点击时判断方向）。 */
  const pendingSidebarWidthRef = useRef<number | null>(null);
  /** 本次过渡的目标宽度：用于忽略上一次切换残留的 transitionend。 */
  const transitionTargetWidthRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishSidebarTransition = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (!isSidebarTransitioningRef.current) return;
    isSidebarTransitioningRef.current = false;
    setIsSidebarTransitioning(false);
    // 侧栏短动画结束一次收敛：应用动画期间暂缓的最新测量值
    if (pendingContainerWidthRef.current !== null) {
      const finalW = pendingContainerWidthRef.current;
      pendingContainerWidthRef.current = null;
      setContainerWidth(finalW);
    }
  }, []);

  const preferredWidth = useRightSidebarPreferredWidth();
  const navigationPlacement = useNavigationPlacement();
  const companionPlacement = useCompanionPlacement();
  const targetPreferred = rightSidebar.requestedWidth ?? preferredWidth;
  const geometry = resolveCompanionEffectiveWidth({
    preferredWidth: targetPreferred,
    containerWidth,
  });
  const effectiveWidth = geometry.effectiveWidth;

  const isRightOpen = rightSidebar.isOpen;

  // 监听 contentRow 容器尺寸变化（Navigation 折叠/展开或窗口 resize），动态适配 effectiveWidth
  // 动画期间暂缓测量更新，避免 ResizeObserver 逐帧 setContainerWidth 带来的 React 重复渲染，动画结束一次收敛
  useEffect(() => {
    const el = contentRowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          if (isSidebarTransitioningRef.current) {
            pendingContainerWidthRef.current = w;
          } else {
            setContainerWidth(w);
          }
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 监听侧栏宽度 transition 结束事件
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== "width") return;
      // 连续切换时，上一次动画的 transitionend 可能先到：只在当前宽度已经
      // 落到本次目标宽度时才收敛，否则会把过渡标记提前摘掉、动画中途闪断。
      const target = transitionTargetWidthRef.current;
      const current = Number.parseFloat(el.style.width);
      if (target !== null && Number.isFinite(current) && current !== target) {
        return;
      }
      finishSidebarTransition();
    };
    el.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      el.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [finishSidebarTransition]);

  useEffect(() => {
    if (sidebarWidth > 0) {
      lastWidthRef.current = sidebarWidth;
      // 任何程序性展开都视为用户已接受展开，清除折叠标记。
      userCollapsedRef.current = false;
    }
  }, [sidebarWidth]);

  // Wave A: viewMode 的 localStorage 读写已由 spaceUiStore 处理，
  // 这里不再手动 setItem / restore。初始值在 module store 创建时从 localStorage 读，
  // SSR-safe（window 不存在时默认 "all"）。

  const useAllViewSidebar = isAllViewRoutePath(location.pathname);
  const isSpaceRoute = isSpaceRoutePath(location.pathname);
  const isLifeRoute = location.pathname.startsWith("/life");
  const isDesktopApp = getIsDesktopApp();
  // 登录后首页是工作区视图，不渲染页脚（法务入口在侧栏用户菜单）。
  const renderSiteFooter = shouldRenderSiteFooter(location.pathname, {
    isLoggedIn,
  });
  // Guest nature pages (home landing + auth entry pages) own their look:
  // topbar over the sky, nature palette, no app-canvas white.
  const guestNaturePage = getGuestNaturePage(location.pathname, {
    isLoggedIn,
    isDesktop: isDesktopApp,
  });
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
    if (userCollapsedRef.current) return;
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
  const hasRail = !isMobile && renderChatSidebar && mainSidebar.content === null;
  const railOnly = hasRail && sidebarWidth <= 0;

  const toggleSidebar = useCallback(() => {
    // 用 pending 宽度判断方向：宽度被推迟一帧提交，连续点击时方向才不会算错。
    const currentWidth = pendingSidebarWidthRef.current ?? sidebarWidth;
    const isOpening = currentWidth <= 0;
    mobileUserOpenedRef.current = isOpening;
    const newWidth = isOpening ? lastWidthRef.current || 280 : 0;
    userCollapsedRef.current = !isOpening;

    const prefersReducedMotion =
      !isMobile &&
      hasRail &&
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

    if (!isMobile && hasRail && !prefersReducedMotion) {
      isSidebarTransitioningRef.current = true;
      setIsSidebarTransitioning(true);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      // 约 180-220ms 减速过渡，加少量裕量 240ms 兜底收敛
      transitionTimerRef.current = setTimeout(() => {
        finishSidebarTransition();
      }, 240);
      // 先让浏览器提交一帧「带过渡属性」的样式，再改宽度。宽度与过渡在同一帧
      // 生效时浏览器没有旧值可比较，动画不会发生（折叠看起来就是硬切）。
      pendingSidebarWidthRef.current = newWidth;
      // 折叠时 DOM 的目标宽度是 rail 的 52px（railOnly 时内联 width 取 52），
      // 不是 store 里的 0；记录错会让本次 transitionend 被当成残留事件丢弃。
      transitionTargetWidthRef.current = newWidth <= 0 ? 52 : newWidth;
      // 先提交一帧带过渡属性的样式再改宽度，动画才会发生；rAF 在后台标签页
      // 会被浏览器挂起，所以再加一个定时器兜底，保证折叠在任何情况下都生效。
      let committed = false;
      const commitWidth = () => {
        if (committed) return;
        committed = true;
        pendingSidebarWidthRef.current = null;
        dispatch(setSidebarWidth(newWidth));
      };
      requestAnimationFrame(commitWidth);
      setTimeout(commitWidth, 32);
      return;
    }

    dispatch(setSidebarWidth(newWidth));
  }, [dispatch, isMobile, hasRail, sidebarWidth, finishSidebarTransition]);

  const openRightSidebar = useCallback(
    (content: React.ReactNode, options?: RightSidebarOptions) => {
      setRightSidebar({
        isOpen: true,
        content,
        requestedWidth: options?.width ?? null,
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
    onStart: () => {
      if (isSidebarTransitioningRef.current) {
        finishSidebarTransition();
      }
      setIsResizing(true);
    },
    onMove: (clientX) => {
      requestAnimationFrame(() => {
        const rootEl = mainLayoutRef.current;
        const domRect = rootEl?.getBoundingClientRect();
        const rect =
          domRect && domRect.width > 0
            ? domRect
            : {
                left: 0,
                right: typeof window !== "undefined" ? window.innerWidth : 1200,
                width: typeof window !== "undefined" ? window.innerWidth : 1200,
              };
        const rawWidth = pointerXToNavigationWidth({
          clientX,
          containerRect: rect,
          placement: navigationPlacement,
        });
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(rawWidth)));
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
        const rowEl = contentRowRef.current;
        const domRect = rowEl?.getBoundingClientRect();
        const rect =
          domRect && domRect.width > 0 && domRect.right > 0
            ? domRect
            : {
                // 兜底与 Navigation 侧一致：以视口为容器，left=0 保证 start placement 不静默错位
                left: 0,
                right: typeof window !== "undefined" ? window.innerWidth : 1200,
                width: typeof window !== "undefined" ? window.innerWidth : 1200,
              };
        const rawWidth = pointerXToCompanionWidth({
          clientX,
          containerRect: rect,
          placement: companionPlacement,
        });
        const { effectiveWidth: clamped } = resolveCompanionEffectiveWidth({
          preferredWidth: rawWidth,
          containerWidth: rect.width,
        });
        if (rightSidebarRef.current) {
          rightSidebarRef.current.style.width = `${clamped}px`;
        }
      });
    },
    onStop: () => {
      if (rightSidebarRef.current) {
        const finalWidth = parseInt(rightSidebarRef.current.style.width, 10);
        rightSidebarRef.current.style.width = "";
        if (!isNaN(finalWidth)) {
          setRightSidebarPreferredWidth(finalWidth);
          setRightSidebar((prev) => ({ ...prev, requestedWidth: null }));
        }
      }
      setIsRightResizing(false);
    },
  });

  const handleRightResizeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        e.preventDefault();
        let next = targetPreferred;
        const delta = resolveCompanionKeyboardDelta({
          key: e.key,
          placement: companionPlacement,
        });
        if (delta !== null) {
          next = targetPreferred + delta;
        } else if (e.key === "Home") {
          next = DEFAULT_RIGHT_SIDEBAR_WIDTH;
        } else if (e.key === "End") {
          next = geometry.maxWidth;
        }
        const { effectiveWidth: finalClamped } = resolveCompanionEffectiveWidth({
          preferredWidth: next,
          containerWidth,
        });
        setRightSidebarPreferredWidth(finalClamped);
        setRightSidebar((prev) => ({ ...prev, requestedWidth: null }));
      }
    },
    [companionPlacement, containerWidth, geometry.maxWidth, targetPreferred]
  );

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

  // 路由切换时，如有需要自动关闭右侧栏；若处于侧栏动画中，立即收敛并清理
  useEffect(() => {
    if (isSidebarTransitioningRef.current) {
      finishSidebarTransition();
    }
    setRightSidebar((prev) => {
      if (!prev.isOpen || !prev.closeOnRouteChange) return prev;
      return { ...prev, isOpen: false };
    });
  }, [location.pathname, finishSidebarTransition]);

  // 组件卸载时清理过渡兜底定时器
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

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

  const placementClass =
    navigationPlacement === "end" ? "MainLayout--navigation-end" : "";

  const isDesktop = !shouldRenderMobileLayout;
  const sidebarToggleValue = useMemo(
    () => ({
      toggleSidebar,
      isOpen: hasSidebar ? isOpen : false,
      isDesktop,
      hasRail,
    }),
    [toggleSidebar, hasSidebar, isOpen, isDesktop, hasRail]
  );

  return (
    <SidebarToggleContext.Provider value={sidebarToggleValue}>
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
        <div
          ref={mainLayoutRef}
          className={`MainLayout ${placementClass} ${isResizing ? "is-resizing" : ""} ${guestNaturePage ? `MainLayout--guest-nature MainLayout--guest-${guestNaturePage}` : ""}`.trim()}
        >
        {/* 左侧常驻侧边栏 */}
        {hasSidebar && (
          <aside
            ref={sidebarRef}
            className={`MainLayout__sidebar ${isOpen ? "is-open" : ""} ${railOnly ? "MainLayout__sidebar--rail-only" : ""} ${hasRail ? "MainLayout__sidebar--has-rail" : ""} ${isSidebarTransitioning ? "is-transitioning" : ""}`}
            style={
              shouldRenderMobileLayout
                ? undefined
                : {
                    width: railOnly ? 52 : sidebarWidth,
                    ["--sidebar-shell-width" as any]: `${lastWidthRef.current || 280}px`,
                  }
            }
          >
            <div className="MainLayout__sidebarContent">{sidebarContent}</div>
            {/* ChatSidebar owns its Rail footer; non-Chat sidebars keep the legacy footer. */}
            {isLoggedIn && (!renderChatSidebar || mainSidebar.content !== null) && (
              <Suspense fallback={null}>
                <SidebarUserSection />
              </Suspense>
            )}
            {!shouldRenderMobileLayout && !railOnly && (
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
              hasRail={hasRail}
            />
          </Suspense>

          <div
            ref={contentRowRef}
            className={`MainLayout__contentRow ${companionPlacement === "start" ? "MainLayout__contentRow--companion-start" : ""}`.trim()}
          >
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
                shouldRenderMobileLayout
                  ? undefined
                  : {
                    width: isRightOpen ? effectiveWidth : 0,
                  }
              }
              aria-hidden={!isRightOpen}
            >
              {!shouldRenderMobileLayout && isRightOpen && (
                <div
                  className="MainLayout__rightResizeHandle"
                  role="separator"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-valuenow={effectiveWidth}
                  aria-valuemin={geometry.minWidth}
                  aria-valuemax={geometry.maxWidth}
                  aria-label="调整侧边栏宽度"
                  onPointerDown={startRightResizing}
                  onKeyDown={handleRightResizeKeyDown}
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
        {shouldRenderMobileLayout && ((hasSidebar && isOpen) || isRightOpen) && (
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
        {/* E2：到账反馈全局化——支付后回到任意页面都能收到「+N 积分已到账」 */}
        <RechargeCreditWatcher />
        </div>
      </RightSidebarContext.Provider>
    </MainSidebarContext.Provider>
  </SidebarToggleContext.Provider>
  );
};

export default MainLayout;
