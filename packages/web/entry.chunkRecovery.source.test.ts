import { describe, expect, it } from "bun:test";

describe("web entry chunk recovery wiring", () => {
  it("installs chunk load recovery before bootstrapping the app", async () => {
    const source = await Bun.file("packages/web/entry.tsx").text();

    expect(source).toContain('import { installChunkLoadRecovery } from "./chunkLoadRecovery";');
    expect(source.indexOf("installChunkLoadRecovery();")).toBeLessThan(
      source.indexOf("const serverPreloadedState")
    );
  });
});
