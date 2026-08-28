import { describe, expect, it } from "bun:test";

import {
  buildSpaceContextLayer,
  type TurnContextLayer,
  type TurnContextSource,
} from "./turnContext";

/**
 * TurnContextSource contract — the parity guarantee behind unified turn
 * context assembly.
 *
 * This file is deliberately host-neutral: it must not import renderer, server
 * or desktop modules. `packages/agent-runtime` is shared by CLI, server,
 * desktop host and the web/RN renderer, so a test that reaches into any one of
 * them both inverts the dependency direction and drags that host's whole type
 * graph into this package's typecheck project.
 *
 * Parity is therefore expressed as a *contract* every adapter must satisfy:
 *
 *   1. record present        → resolve the record
 *   2. record missing        → resolve null
 *   3. read genuinely failed → throw (never resolve null)
 *
 * Rule 3 is the load-bearing one. An adapter that swallows I/O errors into
 * null makes a database outage indistinguishable from "this space does not
 * exist", which is precisely the silent degradation this work removed. Given
 * conforming adapters, the layer semantics below hold identically on every
 * surface, because they all share one builder.
 *
 * Per-adapter conformance is verified where each adapter lives:
 * - renderer → packages/ai/agent/buildStaticContexts.space.test.ts
 * - desktop  → packages/server/handlers/desktopAgentRuntimeTurnService.test.ts
 * - server   → packages/server/handlers/agentRun/runtimeSystemMessages.test.ts
 */

const SPACE_ID = "01KW6ZY7V3MC9GCAJZDNRBX1Y0";
const SPACE_KEY = `space-${SPACE_ID}`;

const spaceRecord = (): Record<string, unknown> => ({
  id: SPACE_ID,
  name: "契约空间",
  description: "parity fixture",
  categories: { "cat-plan": { name: "规划", order: 1 } },
  contents: {
    "doc-roadmap": {
      title: "路线图",
      type: "page",
      contentKey: "doc-roadmap",
      categoryId: "cat-plan",
      updatedAt: 100,
    },
  },
});

/** Rule 1 + 2: present resolves, missing resolves null. */
const conformingSource = (
  records: Map<string, Record<string, unknown>>,
): TurnContextSource => ({
  readRecord: async (dbKey) => records.get(dbKey) ?? null,
});

/** Rule 3: a genuine read failure propagates. */
const failingSource = (message: string): TurnContextSource => ({
  readRecord: async () => {
    throw new Error(message);
  },
});

/**
 * A non-conforming adapter that swallows failures into null — the shape the
 * contract forbids. Used to prove the contract is observable: it degrades a
 * named cause into the generic "unreachable" wording.
 */
const swallowingSource = (): TurnContextSource => ({
  readRecord: async () => null,
});

const withSpace = () => new Map([[SPACE_KEY, spaceRecord()]]);

describe("TurnContextSource contract: layer semantics shared by all surfaces", () => {
  it("resolves a success layer with the fields every surface relies on", async () => {
    const layer = await buildSpaceContextLayer({
      source: conformingSource(withSpace()),
      spaceId: SPACE_ID,
    });

    expect(layer).not.toBeNull();
    expect(layer!.content).toContain("本对话属于以下 Space");
    expect(layer!.content).toContain("Space Title: 契约空间");
    expect(layer!.content).toContain(`Space ID: ${SPACE_ID}`);
    expect(layer!.content).toContain("路线图");
  });

  it("emits one stable layer shape (id / owner / cacheScope)", async () => {
    const shapeOf = (layer: TurnContextLayer) => ({
      id: layer.id,
      owner: layer.owner,
      cacheScope: layer.cacheScope,
    });
    const expected = {
      id: "space-context" as const,
      owner: "runtime" as const,
      cacheScope: "turn" as const,
    };

    const success = await buildSpaceContextLayer({
      source: conformingSource(withSpace()),
      spaceId: SPACE_ID,
    });
    const missing = await buildSpaceContextLayer({
      source: conformingSource(new Map()),
      spaceId: SPACE_ID,
    });
    const failed = await buildSpaceContextLayer({
      source: failingSource("db unreachable"),
      spaceId: SPACE_ID,
    });

    // Shape must not vary with outcome: hosts append these layers blindly.
    expect(shapeOf(success!)).toEqual(expected);
    expect(shapeOf(missing!)).toEqual(expected);
    expect(shapeOf(failed!)).toEqual(expected);
  });

  it("keeps identity fields independent of each surface's recent-content budget", async () => {
    const titleAndId = (layer: TurnContextLayer) =>
      layer.content
        .split("\n")
        .filter((line) => line.startsWith("Space Title:") || line.startsWith("Space ID:"));

    // Desktop, renderer and server each compute their own recent-content limit;
    // the identity of the space must not drift because of that budget.
    const [wide, narrow, none] = await Promise.all(
      [10, 1, 0].map((recentContentLimit) =>
        buildSpaceContextLayer({
          source: conformingSource(withSpace()),
          spaceId: SPACE_ID,
          recentContentLimit,
        }),
      ),
    );

    expect(titleAndId(wide!)).toEqual(titleAndId(narrow!));
    expect(titleAndId(narrow!)).toEqual(titleAndId(none!));
    expect(none!.content).not.toContain("路线图");
  });
});

describe("TurnContextSource contract: failure must stay visible", () => {
  it("T11: a missing space record still yields the explicit failure layer", async () => {
    const layer = await buildSpaceContextLayer({
      source: conformingSource(new Map()),
      spaceId: SPACE_ID,
    });

    expect(layer).not.toBeNull();
    expect(layer!.content).toContain(`声明属于 Space ${SPACE_ID}`);
    expect(layer!.content).toContain("不要声称对话不属于任何空间");
  });

  it("T11: a propagated read failure names its cause in the layer", async () => {
    const layer = await buildSpaceContextLayer({
      source: failingSource("db unreachable"),
      spaceId: SPACE_ID,
    });

    expect(layer!.content).toContain("db unreachable");
    expect(layer!.content).toContain("不要声称对话不属于任何空间");
  });

  it("shows why rule 3 matters: swallowing errors loses the cause", async () => {
    const swallowed = await buildSpaceContextLayer({
      source: swallowingSource(),
      spaceId: SPACE_ID,
    });
    const propagated = await buildSpaceContextLayer({
      source: failingSource("db unreachable"),
      spaceId: SPACE_ID,
    });

    // Both still surface a failure layer, so the model never claims "no space".
    for (const layer of [swallowed, propagated]) {
      expect(layer!.content).toContain("不要声称对话不属于任何空间");
    }
    // But only the conforming adapter can tell the user what actually broke.
    expect(propagated!.content).toContain("db unreachable");
    expect(swallowed!.content).toContain("记录不存在或不可达");
    expect(swallowed!.content).not.toContain("db unreachable");
  });

  it("returns no layer at all when the dialog genuinely has no spaceId", async () => {
    expect(
      await buildSpaceContextLayer({
        source: conformingSource(withSpace()),
        spaceId: null,
      }),
    ).toBeNull();
  });
});
