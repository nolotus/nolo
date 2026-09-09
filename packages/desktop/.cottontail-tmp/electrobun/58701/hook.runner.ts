import * as hookModule from "/Users/nolotus/bun-nolo/.worktrees/electrobun-2-spike/packages/desktop/./scripts/pre-build.ts";

const maybeHook = hookModule.default;

if (typeof maybeHook === "function") {
  const result = maybeHook();
  if (result && typeof result.then === "function") {
    await result;
  }
}
