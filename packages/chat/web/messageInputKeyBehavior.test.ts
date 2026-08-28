import { describe, expect, it } from "bun:test";
import { decideMessageInputKeyAction } from "./messageInputKeyBehavior";

describe("decideMessageInputKeyAction", () => {
  it("does not let mention menu steal Enter while IME composition is active", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: true,
        shouldDeferEnterForIme: true,
      })
    ).toBe("none");
  });

  it("selects mention on Enter when IME is not blocking", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: true,
        shouldDeferEnterForIme: false,
      })
    ).toBe("mention-select");
  });

  it("sends on desktop Enter when mention is closed and IME is idle", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: false,
        shouldDeferEnterForIme: false,
      })
    ).toBe("send");
  });

  it("does not send while IME composition is still settling", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: false,
        shouldDeferEnterForIme: true,
      })
    ).toBe("none");
  });

  it("does not send on Enter when a modal or confirm dialog is active", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: false,
        shouldDeferEnterForIme: false,
        hasActiveModal: true,
      })
    ).toBe("none");
  });

  it("allows Shift+Enter for newlines even when a modal is active", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: true,
        isMobile: false,
        hasMentionMenu: false,
        shouldDeferEnterForIme: false,
        hasActiveModal: true,
      })
    ).toBe("none");
  });

  it("suppresses mention selection on Enter when a modal is active", () => {
    expect(
      decideMessageInputKeyAction({
        key: "Enter",
        shiftKey: false,
        isMobile: false,
        hasMentionMenu: true,
        shouldDeferEnterForIme: false,
        hasActiveModal: true,
      })
    ).toBe("none");
  });
});

