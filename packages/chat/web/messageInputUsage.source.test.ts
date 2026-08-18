import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("MessageInputContainer usage trigger contract", () => {
  const controlsSource = readFileSync(
    new URL("./MessageInputControlsBar.tsx", import.meta.url),
    "utf8"
  );

  it("places the dialog usage trigger beside send controls", () => {
    expect(controlsSource).toContain(
      'import { DialogUsageTrigger } from "./DialogUsageTrigger"'
    );
    expect(controlsSource).toContain("<DialogUsageTrigger />");
    expect(controlsSource).toContain("message-input__controls-right");
  });

  it("uses a ring arc gauge without a primary-colored percent badge", () => {
    const triggerSource = readFileSync(
      new URL("./DialogUsageTrigger.tsx", import.meta.url),
      "utf8"
    );
    const gaugeSource = readFileSync(
      new URL("./DialogUsageGaugeIcon.tsx", import.meta.url),
      "utf8"
    );
    expect(triggerSource).toContain("DialogUsageGaugeIcon");
    expect(triggerSource).not.toContain("dialog-usage-trigger__badge");
    expect(gaugeSource).toContain("dialog-usage-gauge-icon__fill");
  });

  it("anchors the usage panel with DialogTrigger + RAC Popover", () => {
    const triggerSource = readFileSync(
      new URL("./DialogUsageTrigger.tsx", import.meta.url),
      "utf8"
    );
    expect(triggerSource).toContain("DialogTrigger");
    expect(triggerSource).toContain("Popover");
    expect(triggerSource).toContain('placement="top end"');
    expect(triggerSource).not.toContain("createPortal");
    expect(triggerSource).not.toContain("anchorRect");
    expect(triggerSource).not.toContain('position: "fixed"');
  });
});

