import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const dir = import.meta.dir;
const baseModal = readFileSync(join(dir, "BaseModal.tsx"), "utf8");
const dialog = readFileSync(join(dir, "Dialog.tsx"), "utf8");
const useFocusTrap = readFileSync(join(dir, "useFocusTrap.ts"), "utf8");
const focusTrap = readFileSync(join(dir, "focusTrap.ts"), "utf8");

describe("BaseModal focus trap source contract", () => {
  it("wires useFocusTrap while open and keeps transition unmount delay", () => {
    expect(baseModal).toContain('import { useFocusTrap } from "./useFocusTrap"');
    expect(baseModal).toContain("useFocusTrap(Boolean(isOpen && shouldRender), contentRef, onClose)");
    expect(baseModal).toContain("const MODAL_TRANSITION_DURATION = 300");
    expect(baseModal).toContain("tabIndex={-1}");
    expect(baseModal).toContain("contentRef");
  });

  it("implements trap, restore, and topmost-only Escape without new deps", () => {
    expect(useFocusTrap).toContain("pushModalLayer");
    expect(useFocusTrap).toContain("restoreFocus");
    expect(useFocusTrap).toContain("handleTabKey");
    expect(useFocusTrap).toContain('event.key === "Escape"');
    expect(useFocusTrap).toContain("isTopModalLayer");
    expect(useFocusTrap).toContain("focusInitial");
    expect(useFocusTrap).toContain("addEventListener(\"keydown\", handleKeyDown, true)");

    expect(focusTrap).toContain("FOCUSABLE_SELECTOR");
    expect(focusTrap).toContain("getFocusableElements");
    expect(focusTrap).toContain("handleTabKey");
    expect(focusTrap).toContain("restoreFocus");
    expect(focusTrap).not.toContain("focus-trap");
    expect(focusTrap).not.toContain("react-focus-lock");
    expect(focusTrap).not.toContain("@radix-ui");
  });

  it("Dialog keeps non-stealing initial focus for actions / autofocus", () => {
    expect(dialog).toContain("dialogEl.contains(document.activeElement)");
    expect(dialog).toContain("last.focus()");
    expect(dialog).toContain("onEnterPress");
    expect(dialog).toContain('textarea, select, [contenteditable="true"]');
    expect(dialog).toContain('import { BaseModal } from "./BaseModal"');
  });
});
