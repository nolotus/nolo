import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CanvasRenderer } from "./CanvasRenderer";
import type { CanvasNode } from "./types";

describe("CanvasRenderer interactions", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost/dialog-test",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("runs safe button actions in browsing mode", () => {
    const node: CanvasNode = {
      id: "root",
      type: "Stack",
      props: { part: "root" },
      children: [
        {
          id: "details",
          type: "List",
          props: {
            part: "details",
            title: "展开明细",
            stateKey: "detailsOpen",
            visibleWhen: true,
            items: ["一条明细"],
          },
        },
        {
          id: "toggle-details",
          type: "Button",
          props: {
            part: "toggle-details",
            label: "展开明细",
            action: { type: "toggle", key: "detailsOpen" },
          },
        },
      ],
    };

    act(() => {
      root.render(
        <CanvasRenderer node={node} />
      );
    });

    expect(container.textContent).not.toContain("一条明细");

    act(() => {
      container.querySelector("button")?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
    });

    expect(container.textContent).toContain("一条明细");
  });

  it("selects nodes instead of running button actions in editing mode", () => {
    const node: CanvasNode = {
      id: "root",
      type: "Stack",
      props: { part: "root" },
      children: [
        {
          id: "details",
          type: "List",
          props: {
            part: "details",
            title: "展开明细",
            stateKey: "detailsOpen",
            visibleWhen: true,
            items: ["一条明细"],
          },
        },
        {
          id: "toggle-details",
          type: "Button",
          props: {
            part: "toggle-details",
            label: "展开明细",
            action: { type: "toggle", key: "detailsOpen" },
          },
        },
      ],
    };
    const selectedNodes: string[] = [];

    act(() => {
      root.render(
        <CanvasRenderer
          node={node}
          onSelectNode={(selectedNode) => selectedNodes.push(selectedNode.id)}
        />
      );
    });

    act(() => {
      container.querySelector("button")?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
    });

    expect(container.textContent).not.toContain("一条明细");
    expect(selectedNodes).toEqual(["toggle-details"]);
  });

  it("reveals card value content after setState actions", () => {
    const node: CanvasNode = {
      id: "root",
      type: "Stack",
      props: { part: "root" },
      children: [
        {
          id: "next-step",
          type: "Button",
          props: {
            part: "next-step",
            label: "下一步",
            action: { type: "setState", key: "tutorialStep", value: 2 },
          },
        },
        {
          id: "step-two",
          type: "Card",
          props: {
            part: "step-two",
            title: "第二步",
            value: "录入你的第一个客户",
            stateKey: "tutorialStep",
            visibleWhen: 2,
          },
        },
      ],
    };

    act(() => {
      root.render(<CanvasRenderer node={node} />);
    });

    expect(container.textContent).not.toContain("录入你的第一个客户");

    act(() => {
      container.querySelector("button")?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
    });

    expect(container.textContent).toContain("录入你的第一个客户");
  });

  it("renders common card text props from generated canvas events", () => {
    const node: CanvasNode = {
      id: "card",
      type: "Card",
      props: {
        part: "card",
        title: "步骤 1",
        text: "使用企业邮箱登录 CRM。",
      },
    };

    act(() => {
      root.render(<CanvasRenderer node={node} />);
    });

    expect(container.textContent).toContain("使用企业邮箱登录 CRM。");
  });
});
