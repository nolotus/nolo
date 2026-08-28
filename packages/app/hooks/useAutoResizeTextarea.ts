// 文件路径: app/hooks/useAutoResizeTextarea.ts
import { useCallback, useEffect } from "react";

interface UseAutoResizeTextareaParams {
    maxHeight: number;
    onTextChange: (value: string) => void;
    value?: string;
    ref?: React.RefObject<HTMLTextAreaElement | null>;
}

export function useAutoResizeTextarea({
    maxHeight,
    onTextChange,
    value,
    ref,
}: UseAutoResizeTextareaParams) {
    const adjustHeight = useCallback(
        (el: HTMLTextAreaElement | null) => {
            if (!el) return;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        },
        [maxHeight]
    );

    useEffect(() => {
        if (ref?.current) {
            adjustHeight(ref.current);
        }
    }, [adjustHeight, ref, value]);

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> =
        useCallback(
            (event) => {
                const val = event.target.value;
                onTextChange(val);
                adjustHeight(event.target);
            },
            [adjustHeight, onTextChange]
        );

    return { handleChange, adjustHeight };
}