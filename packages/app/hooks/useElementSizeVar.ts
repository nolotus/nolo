// 文件路径: app/hooks/useElementSizeVar.ts
import { useEffect } from "react";

const defaultGetSize = (rect: DOMRectReadOnly) => rect.height;

export function useElementSizeVar(
    ref: React.RefObject<HTMLElement>,
    cssVarName: string,
    getSize: (rect: DOMRectReadOnly) => number = defaultGetSize
) {
    useEffect(() => {
        if (typeof window === "undefined") return;
        const el = ref.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const size = getSize(entry.contentRect);
            document.documentElement.style.setProperty(cssVarName, `${size}px`);
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, [ref, cssVarName, getSize]);
}