import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const writeActionSource = readFileSync(new URL("./write.ts", import.meta.url), "utf8");
const uploadActionSource = readFileSync(new URL("./upload.ts", import.meta.url), "utf8");
const patchActionSource = readFileSync(new URL("./patch.ts", import.meta.url), "utf8");
const removeActionSource = readFileSync(new URL("./remove.ts", import.meta.url), "utf8");
const readActionSource = readFileSync(new URL("./read.ts", import.meta.url), "utf8");
const readAndWaitActionSource = readFileSync(
  new URL("./readAndWait.ts", import.meta.url),
  "utf8"
);

describe("database action runtime planning source contracts", () => {
  it("routes write/upload/patch/remove through runtime server context", () => {
    for (const source of [
      writeActionSource,
      uploadActionSource,
      patchActionSource,
      removeActionSource,
    ]) {
      expect(source).toContain(
        'import { getRuntimeServerContext } from "database/runtimeServerContext"'
      );
      expect(source).toContain("getRuntimeServerContext(state)");
      expect(source).not.toContain("selectRuntimeSnapshot(state)");
    }
  });

  it("routes read-side planning through runtime server context", () => {
    expect(readActionSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(readActionSource).toContain(
      "getRuntimeServerContext(state, preferredServerOrigin)"
    );
    expect(readActionSource).not.toContain("selectRuntimeSnapshot(state)");
    expect(readActionSource).not.toContain("getAllServers(");

    expect(readAndWaitActionSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(readAndWaitActionSource).toContain(
      "getRuntimeServerContext(state, preferredServerOrigin)"
    );
    expect(readAndWaitActionSource).not.toContain("selectRuntimeSnapshot(state)");
    expect(readAndWaitActionSource).not.toContain("getAllServers(");
  });
});
