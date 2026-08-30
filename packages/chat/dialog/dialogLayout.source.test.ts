import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 原 DialogPage.css 已 1:1 迁出：组件自有样式进 dialogPageStyles.ts
//（StyleX），滚动条伪元素 / html[data-nolo-desktop] / 跨组件后代覆盖
// 进 dialogStylexEscapeHatch.css（unlayered 逃生舱）。布局契约断言
// 语义不变，载体改为两份新源文件拼接。
const dialogPageStylesSource = readFileSync(
  join(import.meta.dir, "dialogPageStyles.ts"),
  "utf-8"
);
const escapeHatchSource = readFileSync(
  join(import.meta.dir, "dialogStylexEscapeHatch.css"),
  "utf-8"
);
const dialogPageSource = dialogPageStylesSource + escapeHatchSource;

describe("dialog layout source contract", () => {
  it("keeps DialogPage root full width instead of content constrained", () => {
    expect(dialogPageStylesSource).toContain('maxWidth: "none !important"');
    expect(dialogPageStylesSource).toContain('width: "100%"');
    expect(dialogPageStylesSource).toContain('overflow: "hidden"');
  });

  it("keeps dialog width constraints on inner wrappers instead of the root", () => {
    expect(escapeHatchSource).toContain(
      ".DialogPage__messages > .chat-messages__list-wrapper {"
    );
    expect(escapeHatchSource).toContain(
      "max-width: min(760px, var(--dialog-content-max-width));"
    );
    expect(escapeHatchSource).toContain("margin: 0 auto;");
  });

  it("forces the dialog composer to use in-flow layout instead of sticky overlay", () => {
    expect(escapeHatchSource).toContain(
      '[data-hook~="dialog-esc-dp-root"] .message-input {'
    );
    expect(escapeHatchSource).toContain("position: static;");
    expect(escapeHatchSource).toContain("bottom: auto;");
  });

  it("keeps dialog quick scroll controls fixed above the composer on desktop", () => {
    const bottomResetIndex = escapeHatchSource.indexOf(
      '.DialogPage__messages .scroll-buttons {\n  bottom: 16px;'
    );
    const desktopFixedIndex = escapeHatchSource.indexOf(
      "@media (min-width: 1100px)"
    );

    expect(bottomResetIndex).toBeGreaterThan(-1);
    expect(desktopFixedIndex).toBeGreaterThan(bottomResetIndex);
    expect(escapeHatchSource).toContain(
      ".DialogPage__messages .scroll-buttons {"
    );
    expect(escapeHatchSource).toContain("position: fixed;");
    expect(escapeHatchSource).toContain(
      "right: calc(24px + env(safe-area-inset-right, 0px));"
    );
    expect(escapeHatchSource).toContain(
      "bottom: calc(var(--message-input-height, 80px) + 24px);"
    );
    expect(escapeHatchSource).toContain("margin-right: 0;");
  });

  it("uses hover-reveal overlay scrollbars and hides them in the desktop shell", () => {
    expect(dialogPageStylesSource).toContain(
      'scrollbarColor: "transparent transparent"'
    );
    expect(escapeHatchSource).toContain(
      ".DialogPage__messages:hover::-webkit-scrollbar-thumb"
    );
    expect(escapeHatchSource).toContain(
      'html[data-nolo-desktop="1"] .DialogPage__messages'
    );
    expect(escapeHatchSource).toContain("scrollbar-width: none;");
    expect(escapeHatchSource).toContain("display: none !important;");
  });
});
