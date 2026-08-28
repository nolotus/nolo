/**
 * SSR 安全的 localStorage 读写助手。
 *
 * - 无 window 环境（SSR / 服务端测试）直接返回默认值，不抛错。
 * - 所有访问包 try/catch，容忍隐私模式、存储满、SecurityError 等异常。
 * - JSON helper 用于结构化状态，flag helper 用于 "1" 哨兵值的布尔标记。
 */

export function readStorageJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorageJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

export function readStorageFlag(key: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return fallback;
  }
}

export function writeStorageFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch { /* storage full or unavailable */ }
}
