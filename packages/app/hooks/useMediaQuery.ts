// 文件路径: app/hooks/useMediaQuery.ts
//
// Shared SSR-safe matchMedia hook. useHoverCapable / useIsMobile build on this
// so the matchMedia boilerplate (SSR guard + initial sync + change listener)
// lives in one place — do not copy it into a third hook, reuse this one.

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. Returns whether it currently matches.
 * SSR-safe: returns false on the server / when matchMedia is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const queryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 初始同步一次
    setMatches(queryList.matches);

    queryList.addEventListener("change", handleChange);
    return () => {
      queryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}