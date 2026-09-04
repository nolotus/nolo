import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import React, { act } from "react";
import { renderInDom } from "../../../testing/domRender";
import { buildToolCallPresentation } from "./toolCallPresentation";

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
