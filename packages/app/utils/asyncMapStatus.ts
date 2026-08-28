// 文件路径: app/utils/asyncMapStatus.ts
import type { Dispatch, SetStateAction } from "react";

export interface BaseAsyncStatus {
    processing: boolean;
    error?: string;
}

export async function withMapItemProcessing<K, S extends BaseAsyncStatus>(
    key: K,
    setMap: Dispatch<SetStateAction<Map<K, S>>>,
    task: () => Promise<void>
) {
    setMap((prev) => {
        const next = new Map(prev);
        const prevStatus = next.get(key) || ({ processing: false } as S);
        next.set(key, { ...prevStatus, processing: true, error: undefined });
        return next;
    });

    try {
        await task();
    } finally {
        setMap((prev) => {
            const next = new Map(prev);
            const prevStatus = next.get(key) || ({ processing: false } as S);
            next.set(key, { ...prevStatus, processing: false });
            return next;
        });
    }
}