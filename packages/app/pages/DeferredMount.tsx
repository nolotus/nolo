// 文件路径: packages/app/pages/DeferredMount.tsx

import { useEffect, useRef, useState, type ReactNode } from "react";

type DeferredMountProps = {
  children: ReactNode;
  /** 提前多少距离开始加载（进入该范围即挂载）。默认 200px。 */
  rootMargin?: string;
  /** 占位高度，避免延迟挂载造成布局跳动。 */
  minHeight?: number;
  className?: string;
};

/**
 * 进入视口（含 rootMargin 预加载区）后才挂载子节点。
 *
 * 用途：访客首页中部那些「挂载即拉一堆图标与 SVG 并起动画」的演示区块。它们不在
 * 首屏，先挂载等于让所有人提前付下载与渲染成本。
 *
 * 行为边界：
 * - 服务端与客户端**首帧都不渲染 children**（SSR 输出占位 div），因此不会有
 *   hydration 不一致；代价是该区块的内容不参与服务端 HTML。
 * - 没有 `IntersectionObserver`（或它抛错）时**立刻挂载**，宁可多下载也不留空白。
 * - 一旦挂载就不再卸载：来回滚动不会反复触发下载与动画重启。
 */
const DeferredMount = ({
  children,
  rootMargin = "200px",
  minHeight,
  className,
}: DeferredMountProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    // observer 置 null 有两个作用：清理后让已排队的旧回调失效（不再 setState），
    // 以及在 observe() 抛错时能安全断开已创建的实例。
    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (!observer) return;
          if (entries.some((entry) => entry.isIntersecting)) {
            setMounted(true);
            observer.disconnect();
            observer = null;
          }
        },
        { rootMargin },
      );
      observer.observe(element);
    } catch {
      // 观察器参数非法或 observe 失败：断开已建实例并直接挂载，不把内容永久藏起来。
      observer?.disconnect();
      observer = null;
      setMounted(true);
      return;
    }
    return () => {
      observer?.disconnect();
      observer = null;
    };
  }, [mounted, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={mounted || minHeight === undefined ? undefined : { minHeight }}
    >
      {mounted ? children : null}
    </div>
  );
};

export default DeferredMount;
