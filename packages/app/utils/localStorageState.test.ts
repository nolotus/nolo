import { describe, expect, it } from "bun:test";
import {
  readStorageFlag,
  readStorageJSON,
  writeStorageFlag,
  writeStorageJSON,
} from "./localStorageState";

const createLocalStorageStub = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
};

describe("localStorageState", () => {
  it("returns defaults without throwing when window is undefined", () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = undefined;
      expect(readStorageJSON("k")).toBeNull();
      expect(readStorageFlag("k")).toBe(false);
      expect(readStorageFlag("k", true)).toBe(true);
      expect(() => writeStorageJSON("k", { a: 1 })).not.toThrow();
      expect(() => writeStorageFlag("k")).not.toThrow();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("round-trips JSON values through window.localStorage", () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { localStorage: createLocalStorageStub() };
      expect(readStorageJSON("missing")).toBeNull();
      writeStorageJSON("k", { a: 1, b: "x" });
      expect(readStorageJSON<{ a: number; b: string }>("k")).toEqual({ a: 1, b: "x" });
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("returns null for malformed JSON instead of throwing", () => {
    const originalWindow = (globalThis as any).window;
    try {
      const localStorage = createLocalStorageStub();
      (globalThis as any).window = { localStorage };
      localStorage.setItem("bad", "{not-json");
      expect(readStorageJSON("bad")).toBeNull();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("reads and writes flag values", () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { localStorage: createLocalStorageStub() };
      expect(readStorageFlag("seen")).toBe(false);
      writeStorageFlag("seen");
      expect(readStorageFlag("seen")).toBe(true);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("returns the provided fallback when storage access throws", () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        localStorage: {
          getItem: () => {
            throw new Error("denied");
          },
        },
      };
      expect(readStorageFlag("seen")).toBe(false);
      expect(readStorageFlag("seen", true)).toBe(true);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
