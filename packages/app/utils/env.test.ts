import { describe, expect, it } from "bun:test";
describe("env", () => {
  it("does not throw when process is unavailable at module load time", async () => {
    const originalProcess = globalThis.process;
    try {
      (globalThis as any).process = undefined;
      const output = await import(`./env.ts?test=${Date.now()}`);

      expect(output.isProduction).toBe(false);
      expect(output.isDevelopment).toBe(true);
    } finally {
      (globalThis as any).process = originalProcess;
    }
  });

  it("treats React Native release bundles as production", async () => {
    const originalDev = (globalThis as any).__DEV__;
    try {
      (globalThis as any).__DEV__ = false;
      const output = await import(`./env.ts?rnRelease=${Date.now()}`);

      expect(output.isProduction).toBe(true);
      expect(output.isDevelopment).toBe(false);
    } finally {
      (globalThis as any).__DEV__ = originalDev;
    }
  });
});
