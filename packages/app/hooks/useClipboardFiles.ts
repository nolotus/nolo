// 文件路径: packages/chat/hooks/useClipboardFiles.ts

import { useCallback } from "react";
import type { ClipboardEvent, ClipboardEventHandler } from "react";

export function deduplicateFiles<
    T extends { name: string; size: number; type: string; lastModified?: number }
>(files: T[] | FileList): T[] {
    const fileArray = Array.from(files) as T[];
    const seen = new Set<string>();
    const result: T[] = [];

    for (const file of fileArray) {
        const signature = `${file.name}-${file.size}-${file.type}-${file.lastModified ?? 0}`;
        if (!seen.has(signature)) {
            seen.add(signature);
            result.push(file);
        }
    }
    return result;
}

export function useClipboardFiles<T extends HTMLElement = HTMLElement>(
    onFiles: (files: File[]) => void
) {
    const handlePaste: ClipboardEventHandler<T> = useCallback(
        (event: ClipboardEvent<T>) => {
            const rawFiles = event.clipboardData?.files;
            if (rawFiles && rawFiles.length > 0) {
                event.stopPropagation();
                const uniqueFiles = deduplicateFiles(rawFiles);
                if (uniqueFiles.length > 0) {
                    onFiles(uniqueFiles);
                }
            }
        },
        [onFiles]
    );

    return { handlePaste };
}
