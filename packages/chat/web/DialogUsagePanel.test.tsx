import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { DialogUsagePanel } from "./DialogUsagePanel";

describe("DialogUsagePanel", () => {
  it("uses a flat headline + io row without nested section card", () => {
    const html = renderToStaticMarkup(
      <DialogUsagePanel
        tokenStats={{ inputTokens: 9640, outputTokens: 122, totalCost: 0.0005 }}
        contextWindow={128_000}
        compressionCount={0}
      />
    );
    expect(html).toContain("dialog-usage-panel__headline");
    expect(html).toContain("dialog-usage-panel__row--main");
    expect(html).toContain("9,762");
    expect(html).toContain("128k");
    expect(html).toContain("↑9,640");
    expect(html).toContain("↓122");
    expect(html).not.toContain("输入");
    expect(html).not.toContain("dialog-usage-panel__section--usage");
    expect(html).not.toContain("dialog-usage-panel__billing-inline");
    expect(html).not.toContain("dialog-usage-panel__subrow");
  });

  it("formats million-token windows as 1M not 1000k", () => {
    const html = renderToStaticMarkup(
      <DialogUsagePanel
        tokenStats={{ inputTokens: 6876, outputTokens: 195, totalCost: 0.0065 }}
        contextWindow={1_000_000}
        compressionCount={0}
      />
    );
    expect(html).toContain("7,071");
    expect(html).toContain("1M");
    expect(html).not.toContain("1000k");
  });

  it("renders context usage with a thin RAC Meter (not hand-rolled progressbar)", () => {
    const html = renderToStaticMarkup(
      <DialogUsagePanel
        tokenStats={{ inputTokens: 6876, outputTokens: 195, totalCost: 0.0065 }}
        contextWindow={1_000_000}
        compressionCount={0}
      />
    );
    expect(html).toContain("react-aria-Meter");
    expect(html).toContain("nolo-meter-track");
    expect(html).toContain("nolo-meter-fill");
    expect(html).toContain("dialog-usage-panel__meter");
    expect(html).toContain('role="meter');
    expect(html).not.toContain("dialog-usage-panel__context-track");
    expect(html).not.toContain("dialog-usage-panel__context-bar");
  });
});