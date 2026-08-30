import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "MessageActions.tsx"),
  "utf-8",
);
const escapeHatchCss = readFileSync(
  join(import.meta.dir, "messagesStylexEscapeHatch.css"),
  "utf-8"
);
const stylesSource = readFileSync(
  join(import.meta.dir, "messageActionsStyles.ts"),
  "utf-8"
);

describe("MessageActions source contract", () => {
  it("does not offer per-message TTS / playSpeech on the action bar", () => {
    expect(source).not.toContain("playSpeech");
    expect(source).not.toContain("handleSpeak");
    expect(source).not.toContain("LuVolume2");
    expect(source).not.toContain("cf-text-to-speech");
    expect(source).not.toContain("speechSynthesis");
    expect(source).not.toContain("SpeechSynthesisUtterance");
    expect(source).not.toContain("activeSpeechAudio");
    expect(source).not.toContain('key: "speak"');
  });

  it("includes an edit action that seeds message text into the input", () => {
    expect(source).toContain("LuPencilLine");
    expect(source).toContain("publishChatInputSeed");
    expect(source).toContain("handleEdit");
    expect(source).toContain('mode: "replace"');
    expect(source).toContain("editMessageId: message?.id");
  });

  it("offers a destructive delete action with confirmation for user and assistant messages", () => {
    expect(source).not.toContain("abortAllMessages");
    expect(source).not.toContain("LuChevronDown");
    // delete action is now present on the standard message action bar
    expect(source).toContain("LuTrash2");
    expect(source).toContain('key: "delete"');
    expect(source).toContain('label: t("deleteMessage"');
    // gate: hidden while streaming or before persist (no dbKey)
    expect(source).toContain("!isStreaming && dbKey");
    // delegates delete+confirm wiring to the shared useMessageDelete hook
    expect(source).toContain("useMessageDelete");
    expect(source).toContain('confirmMessageKey: "delConfirmMessage"');
    expect(source).toContain("deleteConfirmModal");
    // no inline delete thunk / modal wiring remains in this component
    expect(source).not.toContain("deleteMessage(dbKey)");
    expect(source).not.toContain("<ConfirmModal");
    expect(source).not.toContain("handleConfirmDelete");
    // uses a message-specific confirm copy, NOT the tool-output delConfirm key
    expect(source).not.toContain('t("delConfirm"');
  });

  it("offers branching for assistant messages using the dialog fork action", () => {
    expect(source).toContain("compactDialogAndForkAction");
    expect(source).toContain("LuGitBranch");
    expect(source).toContain("handler: handleBranch");
  });

  it("offers copy for both assistant and user messages", () => {
    expect(source).toContain("icon: copied ? LuCheck : LuCopy");
    expect(source).not.toContain(
      "!isSelf && {\n      icon: copied ? LuCheck : LuCopy",
    );
    expect(source).toContain('key: "edit"');
    expect(source).toContain("icon: LuPencilLine");
  });

  it("does not show the edit action on assistant messages", () => {
    expect(source).not.toContain(
      'type !== "other" && {\n      icon: LuPencilLine',
    );
    expect(source).not.toContain("isRobot && {\n      icon: LuPencilLine");
  });

  it("uses a single label/tooltip field for both desktop and mobile action bars", () => {
    expect(source).toContain('label: t("copyContent")');
    expect(source).toContain("content={label}");
  });

  it("guards async save/branch against double-dispatch with busy + disabled", () => {
    expect(source).toContain("const [isSaving, setIsSaving]");
    expect(source).toContain("const [isBranching, setIsBranching]");
    expect(source).toContain("isSavingRef.current");
    expect(source).toContain("isBranchingRef.current");
    expect(source).not.toContain("isSpeechLoadingRef");
    expect(source).toContain("setIsSaving(true)");
    expect(source).toContain("setIsBranching(true)");
    expect(source).toContain("setIsSaving(false)");
    expect(source).toContain("setIsBranching(false)");
    expect(source).toContain("aria-busy={busy || undefined}");
    expect(source).toContain("disabled={disabled || undefined}");
    expect(source).toContain('t("savingContent", "保存中…")');
    expect(source).toContain('t("branchingMessage", "分叉中…")');
    expect(source).toContain("action-spinner");
  });

  it("keeps copy success feedback and showActions force-visible class", () => {
    expect(source).toContain("setCopied(true)");
    expect(source).toContain("setTimeout(() => setCopied(false), 2000)");
    expect(source).toContain('showActions ? "show" : ""');
    expect(source).toContain("icon: copied ? LuCheck : LuCopy");
  });

  it("stops mobile overlay dismiss via backdrop and stops panel/button propagation", () => {
    expect(source).toContain("overlay-backdrop");
    expect(source).toContain("onDismissActions");
    expect(source).toContain("e.stopPropagation()");
    expect(source).toContain("actions-panel");
  });
});

describe("MessageActions CSS contract", () => {
  it("shows desktop actions on shared hover parent and showActions class", () => {
    expect(escapeHatchCss).toContain(".msg-hover-target:hover .actions.desktop");
    expect(escapeHatchCss).toContain(
      ".msg-hover-target.is-actions-hover .actions.desktop",
    );
    expect(escapeHatchCss).toContain(".msg:hover .actions.desktop");
    expect(escapeHatchCss).toContain("opacity: 1");
    expect(escapeHatchCss).toContain("visibility: visible");
    expect(stylesSource).toContain("opacity: 0");
    expect(stylesSource).toContain('visibility: "hidden"');
  });

  it("places desktop actions in a horizontal bar under the message body", () => {
    const desktopBlock = stylesSource.slice(
      stylesSource.indexOf("actionsDesktop: {"),
      stylesSource.indexOf("actionBtn: {"),
    );
    expect(desktopBlock).toContain('flexDirection: "row"');
    expect(desktopBlock).toContain('pointerEvents: "none"');
    expect(desktopBlock).toContain('position: "static"');
    expect(desktopBlock).not.toContain('position: "absolute"');
    expect(escapeHatchCss).toContain("pointer-events: auto");
  });

  it("keeps focus-within and focus-visible discoverability without MessageList changes", () => {
    expect(escapeHatchCss).toContain(":focus-within");
    expect(escapeHatchCss).toContain(":focus-visible");
  });

  it("uses in-flow shared hover parent (no absolute slot / margin bridges)", () => {
    expect(escapeHatchCss).toContain(".msg-hover-target:hover .actions.desktop");
    expect(escapeHatchCss).toContain(
      ".msg-hover-target.is-actions-hover .actions.desktop",
    );
    const desktopBlock = stylesSource.slice(
      stylesSource.indexOf("actionsDesktop: {"),
      stylesSource.indexOf("actionBtn: {"),
    );
    expect(desktopBlock).not.toContain('position: "absolute"');
  });

  it("styles busy/disabled buttons and loading spinner", () => {
    expect(stylesSource).toContain("actionBtnDisabled");
    expect(stylesSource).toContain("actionBtnBusy");
    expect(stylesSource).toContain("actionSpinner");
    expect(stylesSource).toContain("actionSpin");
  });

  it("respects prefers-reduced-motion for overlay and spinner", () => {
    expect(escapeHatchCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(escapeHatchCss).toContain("animation: none");
  });
});
