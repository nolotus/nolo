// app/layout/workbenchLayoutPreference.ts — Workbench 布局偏好（local-first）。
// 保存抽象比例与方位，不写 chatWidth/artifactWidth 这类 surface 专属字段。
import { useSyncExternalStore } from "react";

export type WorkbenchPreferenceState = {
  /** 第二工作面占可用宽度的比例，0 ~ 1。 */
  secondaryFraction: number;
  /** primary 在分隔符的哪一侧（视觉主次）。 */
  placement: "primary-start" | "primary-end";
};

const STORAGE_KEY = "nolo.workbenchLayout.v1";
const DEFAULT_STATE: WorkbenchPreferenceState = {
  secondaryFraction: 0.4,
  placement: "primary-start",
};
const FRACTION_MIN = 0.1;
const FRACTION_MAX = 0.85;

const listeners = new Set<() => void>();
let version = 0;
let cached: WorkbenchPreferenceState = { ...DEFAULT_STATE };
let hydrated = false;

const clampFraction = (value: number): number =>
  Math.min(FRACTION_MAX, Math.max(FRACTION_MIN, value));

const parse = (raw: string | null): Partial<WorkbenchPreferenceState> | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    return value;
  } catch {
    return null;
  }
};

/** 只在浏览器环境读一次 localStorage；读写失败静默退回默认值。 */
const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  const parsed = parse(localStorage.getItem(STORAGE_KEY));
  if (parsed) {
    if (typeof parsed.secondaryFraction === "number" && Number.isFinite(parsed.secondaryFraction)) {
      // 存储里的越界值先 clamp 回合法区间，而不是整条丢弃——比默认值更接近用户意图。
      cached.secondaryFraction = clampFraction(parsed.secondaryFraction);
    }
    if (parsed.placement === "primary-start" || parsed.placement === "primary-end") {
      cached.placement = parsed.placement;
    }
  }
};

const commit = (): void => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

export function setWorkbenchSecondaryFraction(fraction: number): void {
  if (!Number.isFinite(fraction)) return;
  cached = { ...cached, secondaryFraction: clampFraction(fraction) };
  persist();
  commit();
}

export function setWorkbenchPlacement(placement: WorkbenchPreferenceState["placement"]): void {
  cached = { ...cached, placement };
  persist();
  commit();
}

function persist(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* storage full / blocked — keep in-memory only */
  }
}

export function getWorkbenchPreferenceSnapshot(): number {
  hydrate();
  return version;
}

export function getWorkbenchPreference(): WorkbenchPreferenceState {
  hydrate();
  return cached;
}

export function useWorkbenchPreference(): WorkbenchPreferenceState {
  useSyncExternalStore(
    subscribeWorkbenchPreference,
    getWorkbenchPreferenceSnapshot,
    getWorkbenchPreferenceSnapshot
  );
  return getWorkbenchPreference();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeWorkbenchPreference(listener: () => void): () => void {
  return subscribe(listener);
}

export function resetWorkbenchLayoutPreferenceForTests(): void {
  cached = { ...DEFAULT_STATE };
  hydrated = false;
  version = 0;
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  commit();
}