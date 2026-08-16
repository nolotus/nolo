import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { DialogUsageGaugeIcon } from "./DialogUsageGaugeIcon";

describe("DialogUsageGaugeIcon", () => {
  it("renders a visible arc fill instead of a tiny needle", () => {
    const html = renderToStaticMarkup(<DialogUsageGaugeIcon fillPercent={8} />);
    expect(html).toContain("dialog-usage-gauge-icon__fill");
    expect(html).toContain("stroke-dasharray");
    expect(html).toContain("stroke-dasharray");
  });
});