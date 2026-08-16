import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dialogPageSource = readFileSync(
  join(import.meta.dir, "DialogPage.css"),
  "utf-8"
);

describe("dialog layout source contract", () => {
  it("keeps DialogPage root full width instead of content constrained", () => {
    expect(dialogPageSource).toContain("max-width: none !important;");
    expect(dialogPageSource).toContain("width: 100%;");
    expect(dialogPageSource).toContain("overflow: hidden;");
  });

  it("keeps dialog width constraints on inner wrappers instead of the root", () => {
    expect(dialogPageSource).toContain(
      ".DialogPage__messages > .chat-messages__list-wrapper {"
    );
    expect(dialogPageSource).toContain(
      "max-width: min(760px, var(--dialog-content-max-width));"
    );
    expect(dialogPageSource).toContain("margin: 0 auto;");
  });

  it("forces the dialog composer to use in-flow layout instead of sticky overlay", () => {
    expect(dialogPageSource).toContain(".DialogPage-root .message-input {");
    expect(dialogPageSource).toContain("position: static;");
    expect(dialogPageSource).toContain("bottom: auto;");
  });

  it("keeps dialog quick scroll controls fixed above the composer on desktop", () => {
    const bottomResetIndex = dialogPageSource.indexOf(
      ".DialogPage__messages .scroll-buttons {\n            bottom: 16px;"
    );
    const desktopFixedIndex = dialogPageSource.indexOf(
      "@media (min-width: 1100px)"
    );

    expect(bottomResetIndex).toBeGreaterThan(-1);
    expect(desktopFixedIndex).toBeGreaterThan(bottomResetIndex);
    expect(dialogPageSource).toContain(
      ".DialogPage__messages .scroll-buttons {"
    );
    expect(dialogPageSource).toContain("position: fixed;");
    expect(dialogPageSource).toContain(
      "right: calc(24px + env(safe-area-inset-right, 0px));"
    );
    expect(dialogPageSource).toContain(
      "bottom: calc(var(--message-input-height, 80px) + 24px);"
    );
    expect(dialogPageSource).toContain("margin-right: 0;");
  });

  it("uses hover-reveal overlay scrollbars and hides them in the desktop shell", () => {
    expect(dialogPageSource).toContain(
      "scrollbar-color: transparent transparent;"
    );
    expect(dialogPageSource).toContain(
      ".DialogPage__messages:hover::-webkit-scrollbar-thumb"
    );
    expect(dialogPageSource).toContain(
      'html[data-nolo-desktop="1"] .DialogPage__messages'
    );
    expect(dialogPageSource).toContain("scrollbar-width: none;");
    expect(dialogPageSource).toContain("display: none !important;");
  });
});
