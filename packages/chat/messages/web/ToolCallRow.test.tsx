import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import React, { act } from "react";
import { renderInDom } from "../../../testing/domRender";
import { buildToolCallPresentation } from "./toolCallPresentation";
import { toolMessageStyles } from "./toolMessageStyles";

const rowSource = readFileSync(new URL("./ToolCallRow.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(
  new URL("./toolMessageStyles.ts", import.meta.url),
  "utf8"
);

// ToolMessageContent pulls redux / editor machinery; rows only render it as a
// detail body. Mock it out exactly like ToolMessageGroup.test.tsx does so the
// mount works without a Provider (its rendering is covered elsewhere).
mock.module("./ToolMessageContent", () => ({
  default: () => null,
}));

let ToolCallRow: any;
beforeAll(async () => {
  ({ ToolCallRow } = await import("./ToolCallRow"));
});

const t = (key: string, options?: any) => String(key ?? "");

function rowFor(presentationInput: any) {
  return (
    <ToolCallRow
      presentation={buildToolCallPresentation(presentationInput)}
      message={presentationInput}
      t={t}
    />
  );
}

describe("ToolCallRow", () => {
  let view: Awaited<ReturnType<typeof renderInDom>> | null = null;

  afterEach(async () => {
    if (view) {
      await view.cleanup();
    }
    view = null;
  });

  async function mount(node: React.ReactElement) {
    view = await renderInDom(node);
    return view.container;
  }

  it("renders a native button header with verb, target, context and real duration", async () => {
    const container = await mount(
      rowFor({
        id: "row-1",
        role: "tool",
        toolName: "readFile",
        toolPayload: {
          input: { path: "README.md" },
          startedAt: 1000,
          finishedAt: 1450,
        },
        content: JSON.stringify({ ok: true, startLine: 3, endLine: 7 }),
      })
    );

    const header = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLButtonElement | null;
    expect(header?.tagName).toBe("BUTTON");
    expect(header?.getAttribute("type")).toBe("button");
    // Contract fields drive the row: verb + target + grounded context + duration.
    expect(container.querySelector(".tool-call-row__label")?.textContent).toBe("读取");
    expect(container.querySelector(".tool-call-row__detail")?.textContent).toBe("README.md");
    expect(container.querySelector(".tool-call-row__context")?.textContent).toBe("L3–L7");
    expect(container.querySelector(".tool-call-row__duration")?.textContent).toBe("450ms");
    // Raw API names never leak.
    expect(container.textContent).not.toContain("readFile");
  });

  it("keeps verb/context/meta/duration/chevron intrinsic while the target flexes and truncates", async () => {
    const container = await mount(
      rowFor({
        id: "row-flex",
        role: "tool",
        toolName: "execShell",
        toolPayload: {
          input: { cmd: "bun test", cwd: "packages/chat" },
          startedAt: 1000,
          finishedAt: 1250,
        },
        content: "{}",
      })
    );

    const header = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLElement | null;
    expect(header).toBeTruthy();
    // DOM contract: fixed segments plus the flexible target, in stable order.
    // (SVG nodes expose className as SVGAnimatedString — read the attribute.)
    const segments = Array.from(header!.querySelectorAll("[class]")).map((el) =>
      (el.getAttribute("class") ?? "")
        .split(" ")
        .find((c) => c.startsWith("tool-call-row__"))
    );
    const position = (name: string) => segments.findIndex((c) => c === name);
    expect(position("tool-call-row__label")).toBeGreaterThanOrEqual(0);
    expect(position("tool-call-row__context")).toBeGreaterThan(
      position("tool-call-row__label")
    );
    expect(position("tool-call-row__detail")).toBeGreaterThan(
      position("tool-call-row__context")
    );
    expect(position("tool-call-row__duration")).toBeGreaterThan(
      position("tool-call-row__detail")
    );
    expect(position("tool-call-row__chevron")).toBeGreaterThan(
      position("tool-call-row__duration")
    );
    // Truncation classes stay wired on both text segments.
    expect(header!.querySelector(".tool-call-row__detail")?.className).toContain(
      "u-truncate"
    );
    expect(header!.querySelector(".tool-call-row__label")?.className).toContain(
      "u-truncate"
    );

    // Style contract (P0.5), asserted on the style/row SOURCE: bun's stylex
    // pipeline compiles create() into hashed class maps at test time and
    // never injects the stylesheet, so the uncompiled declarations are the
    // stable truth. Fixed segments never shrink.
    expect(stylesSource).toMatch(/rowLabel: \{\s*flexShrink: 0,/);
    expect(stylesSource).toContain("rowContext: { flexShrink: 0 }");
    expect(stylesSource).toMatch(/rowTarget: \{\s*flex: 1,\s*minWidth: 0,\s*\}/);
    expect(stylesSource).toMatch(/duration: \{[^}]*flexShrink: 0/);
    expect(stylesSource).toMatch(/actionChevron: \{[^}]*flexShrink: 0/);
    // HIGH review fix: the shared `truncate` entry is the single clipping
    // source and really carries nowrap + hidden + ellipsis (rowTarget alone
    // has no clipping — a long no-space target would overflow its flex box).
    expect(stylesSource).toMatch(
      /truncate: \{\s*whiteSpace: "nowrap",\s*overflow: "hidden",\s*textOverflow: "ellipsis",?\s*\}/
    );
    // …and the row wires exactly these entries onto its segments — the
    // target span mounts BOTH the flexible rowTarget AND the clipping
    // truncate entry (no duplicated declarations between the two).
    expect(rowSource).toContain("toolStyles.rowLabel");
    expect(rowSource).toContain("toolStyles.rowContext");
    expect(rowSource).toMatch(
      /"tool-call-row__detail u-truncate",\s*toolStyles\.rowTarget,\s*toolStyles\.truncate/
    );

    // DOM wiring proof: every compiled class from rowTarget AND truncate is
    // physically present on the mounted target element.
    const detail = header!.querySelector(
      ".tool-call-row__detail"
    ) as HTMLElement | null;
    expect(detail).toBeTruthy();
    const detailClasses = (detail!.getAttribute("class") ?? "").split(" ");
    for (const entry of [toolMessageStyles.rowTarget, toolMessageStyles.truncate]) {
      for (const cls of Object.values(entry as Record<string, unknown>)) {
        if (typeof cls === "string") expect(detailClasses).toContain(cls);
      }
    }
  });

  it("renders diff meta only when the message really carries added/removed", async () => {
    const container = await mount(
      rowFor({
        id: "row-meta",
        role: "tool",
        toolName: "replaceWorkspaceText",
        toolPayload: { input: { path: "a.ts" } },
        content: JSON.stringify({ added: 4, removed: 2 }),
      })
    );
    const diff = container.querySelector('[data-hook="messages-esc-tool-call-row-meta-diff"]');
    expect(diff).toBeTruthy();
    expect(diff?.textContent).toContain("+4");
    expect(diff?.textContent).toContain("−2");

    const plain = await mount(
      rowFor({
        id: "row-no-meta",
        role: "tool",
        toolName: "readFile",
        toolPayload: { input: { path: "a.ts" } },
        content: "{\"ok\":true}",
      })
    );
    expect(
      plain.querySelector('[data-hook="messages-esc-tool-call-row-meta-diff"]')
    ).toBeNull();
  });

  it("keeps settled rows folded and toggles via click with aria-expanded wiring", async () => {
    const container = await mount(
      rowFor({ id: "row-2", toolName: "writeFile", content: "{\"ok\":true}" })
    );

    const header = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLButtonElement | null;
    expect(header?.getAttribute("aria-expanded")).toBe("false");
    const controlsId = header?.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    // Folded row renders no detail body yet (aria-controls target absent).
    expect(container.ownerDocument.getElementById(controlsId ?? "")).toBeNull();
    expect(container.querySelector(".tool-call-row__body")).toBeNull();

    await act(async () => {
      header?.click();
    });

    const headerAfter = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLButtonElement | null;
    expect(headerAfter?.getAttribute("aria-expanded")).toBe("true");
    const body = container.querySelector(".tool-call-row__body") as HTMLElement | null;
    expect(body).toBeTruthy();
    expect(body?.id).toBe(controlsId);

    await act(async () => {
      headerAfter?.click();
    });
    expect(
      (container.querySelector(".tool-call-row__header") as HTMLButtonElement | null)
        ?.getAttribute("aria-expanded")
    ).toBe("false");
    expect(container.querySelector(".tool-call-row__body")).toBeNull();
  });

  it("auto-expands running rows and keeps user toggles authoritative", async () => {
    const container = await mount(
      rowFor({ id: "row-3", toolName: "execShell", isStreaming: true, content: "{}" })
    );
    const header = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLButtonElement | null;
    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".tool-call-row__body")).toBeTruthy();

    // User folds the running row — the toggle must win over the auto-open rule.
    await act(async () => {
      header?.click();
    });
    expect(
      (container.querySelector(".tool-call-row__header") as HTMLButtonElement | null)
        ?.getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("marks failed rows and echoes the error as the status dot tooltip", async () => {
    const container = await mount(
      rowFor({
        id: "row-4",
        toolName: "execShell",
        toolPayload: { status: "failed", error: "command failed" },
        content: "{\"error\":\"command failed\"}",
      })
    );
    const row = container.querySelector(".tool-call-row");
    expect(row?.className).toContain("tool-call-row--failed");
    const dot = container.querySelector(".status-dot") as HTMLElement | null;
    expect(dot?.getAttribute("title")).toBe("command failed");
  });

  it("settles cancelled rows neutral-muted without a failure tooltip", async () => {
    const container = await mount(
      rowFor({
        id: "row-cancelled",
        toolName: "execShell",
        toolPayload: { input: { cmd: "sleep 30" }, status: "cancelled" },
        content: "{}",
      })
    );
    expect(container.querySelector(".tool-call-row")?.className).toContain(
      "tool-call-row--cancelled"
    );
    const dot = container.querySelector(".status-dot") as HTMLElement | null;
    expect(dot?.className).toContain("icon-muted");
    expect(dot?.getAttribute("title")).toBeNull();
  });

  it("disables toggling for non-row modes (expandable=false)", async () => {
    const container = await mount(
      rowFor({ id: "row-ask", toolName: "ask_user", content: "{\"question\":\"?\"}" })
    );
    const header = container.querySelector(
      ".tool-call-row__header"
    ) as HTMLButtonElement | null;
    expect(header?.disabled).toBe(true);
    expect(header?.getAttribute("aria-expanded")).toBeNull();
    expect(header?.getAttribute("aria-controls")).toBeNull();
    expect(container.querySelector(".tool-call-row__chevron")).toBeNull();

    await act(async () => {
      header?.click();
    });
    expect(container.querySelector(".tool-call-row__body")).toBeNull();
  });
});
