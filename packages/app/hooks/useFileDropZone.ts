// 文件路径: packages/chat/hooks/useFileDropZone.ts

import { useCallback, useState } from "react";
import { extractFilesFromDataTransfer } from "app/utils/fileUtils";
import type { DragEvent, DragEventHandler } from "react";

function hasFileDrag(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types ?? []).includes("Files");
}

export function useFileDropZone<T extends HTMLElement = HTMLElement>(
    onFiles: (files: File[]) => void
) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver: DragEventHandler<T> = useCallback((event: DragEvent<T>) => {
        if (!hasFileDrag(event.dataTransfer)) return;
        event.preventDefault();
        // Own this gesture: ancestor drop zones (e.g. space FileDropZone)
        // must not also treat it as an upload-to-space.
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
    }, []);

    const handleDragLeave: DragEventHandler<T> = useCallback((event: DragEvent<T>) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
            return;
        }
        setIsDragOver(false);
    }, []);

    const handleDrop: DragEventHandler<T> = useCallback(
        (event: DragEvent<T>) => {
            if (!hasFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            setIsDragOver(false);

            const droppedFiles = extractFilesFromDataTransfer(event.dataTransfer);
            if (!droppedFiles.length) return;

            onFiles(droppedFiles);
        },
        [onFiles]
    );

    return {
        isDragOver,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}
