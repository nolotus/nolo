// 文件: packages/chat/dialog/hooks/useStreamingSymbol.ts
import { useEffect, useMemo, useState } from "react";
import {
  STREAMING_SYMBOLS,
  STREAMING_SYMBOL_INTERVAL_MS,
} from "app/constants/animationSets";

const STEP_COUNT = STREAMING_SYMBOLS.length;
const INTERVAL_MS = STREAMING_SYMBOL_INTERVAL_MS;

// Universal interval handler that works in both Web (SSR-safe) and Native
const setUniversalInterval = (callback: () => void, ms: number) => {
    // In React Native or modern browsers, setInterval returns a number or object that is valid for clearInterval
    // But for strict SSR safety (Node.js environment where window is undefined), we check global/window.
    if (typeof window !== "undefined") {
        return window.setInterval(callback, ms);
    }
    // Fallback for Node.js / Native environments if they have global setInterval
    return setInterval(callback, ms);
};

const clearUniversalInterval = (id: any) => {
    if (typeof window !== "undefined") {
        window.clearInterval(id);
    } else {
        clearInterval(id);
    }
};

export const useStreamingSymbol = (opts: {
    id?: string | null;
    active: boolean;
}) => {
    const { id, active } = opts;
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!active) {
            setStep(0);
            return;
        }

        const timerId = setUniversalInterval(() => {
            setStep((prev) => (prev + 1) % STEP_COUNT);
        }, INTERVAL_MS);

        return () => clearUniversalInterval(timerId);
    }, [active, id]);

    const symbol = useMemo(() => {
        if (!active) return "";
        return STREAMING_SYMBOLS[step] ?? STREAMING_SYMBOLS[0];
    }, [active, step]);

    return symbol;
};
