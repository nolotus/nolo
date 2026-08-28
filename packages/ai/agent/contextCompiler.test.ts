import { describe, expect, it } from "bun:test";
import { compileContextLayers } from "./contextCompiler";

describe("contextCompiler", () => {
  it("preserves layer order and joins non-empty content like the legacy prompt builder", () => {
    const compiled = compileContextLayers([
      { id: "identity", owner: "platform", content: "IDENTITY" },
      { id: "empty", owner: "runtime", content: "" },
      { id: "memory", owner: "runtime", content: "MEMORY" },
      { id: "missing", owner: "user", content: null },
      { id: "input", owner: "user", content: "INPUT" },
    ]);

    expect(compiled.content).toBe("IDENTITY\n\nMEMORY\n\nINPUT");
    expect(compiled.layers.map((layer) => layer.id)).toEqual([
      "identity",
      "memory",
      "input",
    ]);
    expect(compiled.layers[1]).toEqual({
      id: "memory",
      owner: "runtime",
      content: "MEMORY",
      cacheScope: "turn",
      charCount: 6,
      estimatedTokens: 2,
      tokenBudget: undefined,
      budgetStatus: undefined,
    });
  });

  it("reports token budget status without trimming content", () => {
    const compiled = compileContextLayers([
      { id: "short", owner: "platform", content: "12345678", tokenBudget: 2 },
      { id: "long", owner: "runtime", content: "123456789", tokenBudget: 2 },
    ]);

    expect(compiled.content).toBe("12345678\n\n123456789");
    expect(compiled.layers[0]?.estimatedTokens).toBe(2);
    expect(compiled.layers[0]?.budgetStatus).toBe("within-budget");
    expect(compiled.layers[1]?.estimatedTokens).toBe(3);
    expect(compiled.layers[1]?.budgetStatus).toBe("over-budget");
  });

  // -------------------------------------------------------------------
  // stable prefix break semantics — contextCompiler.ts lines 86-90
  //
  //   for (const layer of compiledLayers) {
  //     if (layer.cacheScope === "turn") break;
  //     stablePrefixLayers.push(layer);
  //   }
  //
  // This is a *first-occurrence break*: stable prefix is the contiguous
  // leading run of non-turn layers. The first "turn" stops the loop, and
  // every layer after that first turn is excluded from the stable prefix
  // even if it is static/session — because the cache key only sees a
  // contiguous string prefix of the joined content.
  //
  // The break only affects cacheProfile.stablePrefix*. `compiled.content`
  // and `compiled.layers` always include every layer.
  // -------------------------------------------------------------------

  // Scenario 1: every layer is turn-scoped.
  it("all turn layers → stable prefix is empty; full content is still joined", () => {
    const compiled = compileContextLayers([
      { id: "a", owner: "platform", content: "A", cacheScope: "turn" },
      { id: "b", owner: "agent", content: "B", cacheScope: "turn" },
      { id: "c", owner: "user", content: "C", cacheScope: "turn" },
    ]);

    // The join in compiled.content has no break.
    expect(compiled.content).toBe("A\n\nB\n\nC");
    expect(compiled.layers.map((l) => l.id)).toEqual(["a", "b", "c"]);

    // But the very first iteration hits `break`, so the prefix is empty.
    expect(compiled.cacheProfile.stablePrefixLayerIds).toEqual([]);
    expect(compiled.cacheProfile.stablePrefixCharCount).toBe(0);
    expect(compiled.cacheProfile.stablePrefixEstimatedTokens).toBe(0);
    // FNV-1a of the empty string, padded to 8 hex chars.
    expect(compiled.cacheProfile.stablePrefixHash).toBe("811c9dc5");
  });

  // Scenario 2: no layer is turn-scoped.
  it("all static/session layers → the whole prompt is the stable prefix", () => {
    const layers = [
      { id: "a", owner: "platform" as const, content: "AAAA", cacheScope: "static" as const },
      { id: "b", owner: "agent" as const, content: "BBBB", cacheScope: "session" as const },
      { id: "c", owner: "user" as const, content: "CCCC", cacheScope: "static" as const },
    ];
    const compiled = compileContextLayers(layers);

    // Loop never breaks: every layer is pushed.
    expect(compiled.cacheProfile.stablePrefixLayerIds).toEqual(["a", "b", "c"]);
    // The stable prefix IS the full content, since there's no turn boundary.
    expect(compiled.cacheProfile.stablePrefixCharCount).toBe(
      compiled.content.length,
    );
    expect(compiled.cacheProfile.stablePrefixEstimatedTokens).toBe(
      Math.ceil(compiled.content.length / 4),
    );
    // And the hash has the FNV-1a shape, and is not the empty-string hash.
    expect(compiled.cacheProfile.stablePrefixHash).toMatch(/^[0-9a-f]{8}$/);
    expect(compiled.cacheProfile.stablePrefixHash).not.toBe("811c9dc5");
  });

  // Scenario 3: mixed [turn, static] — the break is "first turn wins, drop
  // the rest". Two sub-cases to nail this down.
  it("[turn, static] → first turn drops everything, including trailing non-turn", () => {
    const compiled = compileContextLayers([
      { id: "input", owner: "user", content: "INPUT", cacheScope: "turn" },
      {
        id: "tail-static",
        owner: "platform",
        content: "TAIL_STATIC",
        cacheScope: "static",
      },
    ]);

    // Full content is preserved regardless of the break.
    expect(compiled.content).toBe("INPUT\n\nTAIL_STATIC");
    expect(compiled.layers.map((l) => l.id)).toEqual(["input", "tail-static"]);

    // But the first `turn` triggers the break; the trailing `static`
    // is silently excluded from the stable prefix.
    expect(compiled.cacheProfile.stablePrefixLayerIds).toEqual([]);
    expect(compiled.cacheProfile.stablePrefixCharCount).toBe(0);
    expect(compiled.cacheProfile.stablePrefixEstimatedTokens).toBe(0);
    expect(compiled.cacheProfile.stablePrefixHash).toBe("811c9dc5");

    // 排在 turn 层之后的 static 层被静默排除——这正是 misorderedLayerIds 要暴露的。
    expect(compiled.cacheProfile.misorderedLayerIds).toEqual(["tail-static"]);
  });

  it("[static, turn, static] → only the leading run is stable; the break is one-shot", () => {
    const head = compileContextLayers([
      { id: "sys", owner: "platform", content: "SYS", cacheScope: "static" },
      { id: "turn", owner: "user", content: "TURN", cacheScope: "turn" },
      { id: "tail", owner: "agent", content: "TAIL", cacheScope: "session" },
    ]);
    const truncated = compileContextLayers([
      { id: "sys", owner: "platform", content: "SYS", cacheScope: "static" },
      { id: "turn", owner: "user", content: "TURN", cacheScope: "turn" },
    ]);

    // Full content differs between the two inputs (TAIL is present vs absent),
    // confirming the break in the loop is the only thing keeping `tail`
    // out of the stable prefix.
    expect(head.content).toBe("SYS\n\nTURN\n\nTAIL");
    expect(truncated.content).toBe("SYS\n\nTURN");

    // Both produce the same stable prefix — and it stops at the first turn.
    expect(head.cacheProfile.stablePrefixLayerIds).toEqual(["sys"]);
    expect(truncated.cacheProfile.stablePrefixLayerIds).toEqual(["sys"]);
    expect(head.cacheProfile.stablePrefixHash).toBe(
      truncated.cacheProfile.stablePrefixHash,
    );
    expect(head.cacheProfile.stablePrefixCharCount).toBe(3);

    // `tail` 标了 session 却排在 turn 之后 → 计入错序；truncated 无尾层则为空。
    expect(head.cacheProfile.misorderedLayerIds).toEqual(["tail"]);
    expect(truncated.cacheProfile.misorderedLayerIds).toEqual([]);
  });

  it("正确排序（static/session 全在 turn 之前）时 misorderedLayerIds 为空", () => {
    const compiled = compileContextLayers([
      { id: "sys", owner: "platform", content: "SYS", cacheScope: "static" },
      { id: "persona", owner: "agent", content: "P", cacheScope: "session" },
      { id: "input", owner: "user", content: "IN", cacheScope: "turn" },
      { id: "time", owner: "platform", content: "T", cacheScope: "turn" },
    ]);

    expect(compiled.cacheProfile.stablePrefixLayerIds).toEqual(["sys", "persona"]);
    expect(compiled.cacheProfile.misorderedLayerIds).toEqual([]);
  });

  it("a layer without explicit cacheScope defaults to 'turn' and breaks the prefix", () => {
    // Default scope is "turn" (contextCompiler.ts line 78). Forgetting to
    // tag a static layer makes it behave like scenario 1 from the break's
    // point of view, even when real static layers follow.
    const compiled = compileContextLayers([
      { id: "implicit-turn", owner: "runtime", content: "X" }, // no cacheScope
      {
        id: "explicit-static",
        owner: "platform",
        content: "Y",
        cacheScope: "static",
      },
    ]);

    expect(compiled.cacheProfile.stablePrefixLayerIds).toEqual([]);
    expect(compiled.cacheProfile.stablePrefixCharCount).toBe(0);
  });
});

it("中文层按中文感知估算——平铺 chars/4 会低估约 6 倍", () => {
  const compiled = compileContextLayers([
    { id: "cn", owner: "platform", cacheScope: "session", content: "中".repeat(100) },
  ]);
  // 中文 1.5 tok/字 → 150；平铺 /4 只会得到 25
  expect(compiled.layers[0]?.estimatedTokens).toBe(150);
  expect(compiled.cacheProfile.stablePrefixEstimatedTokens).toBe(150);
});
