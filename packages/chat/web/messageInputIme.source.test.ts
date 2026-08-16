import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const quickChatRuntimeSource = readFileSync(
  join(import.meta.dir, "..", "..", "app", "pages", "QuickChatRuntime.tsx"),
  "utf-8"
);
const messageInputCoreSource = readFileSync(
  join(import.meta.dir, "MessageInputCore.tsx"),
  "utf-8"
);
const messageInputKeyBehaviorSource = readFileSync(
  join(import.meta.dir, "messageInputKeyBehavior.ts"),
  "utf-8"
);

describe("message input IME source contract", () => {
  it("routes quick-chat enter handling through the shared IME guard", () => {
    expect(quickChatRuntimeSource).toContain(
      'import { shouldDeferEnterForIme } from "app/utils/ime";'
    );
    expect(quickChatRuntimeSource).toContain(
      'import { useMessageInputFiles } from "chat/web/useMessageInputFiles";'
    );
    expect(quickChatRuntimeSource).toContain("useFileDropZone(processFiles)");
    expect(quickChatRuntimeSource).toContain("shouldDeferEnterForIme({");
    expect(quickChatRuntimeSource).toContain(
      "onCompositionStart={handleCompositionStart}"
    );
    expect(quickChatRuntimeSource).toContain(
      "lastCompositionEndAtRef.current = Date.now();"
    );
  });

  it("keeps the main message input on the same IME guard path", () => {
    expect(messageInputCoreSource).toContain(
      'import { shouldDeferEnterForIme } from "app/utils/ime";'
    );
    expect(messageInputCoreSource).toContain("shouldDeferEnterForIme({");
    expect(messageInputCoreSource).toContain(
      "lastCompositionEndAtRef.current = Date.now();"
    );
    expect(messageInputCoreSource).toContain(
      "onCompositionStart={handleCompositionStart}"
    );
    expect(messageInputCoreSource).toContain(
      "onCompositionEnd={handleCompositionEnd}"
    );
  });

  it("checks IME deferral before mention enter selection", () => {
    expect(messageInputKeyBehaviorSource).toContain('if (key === "Enter") {');
    expect(messageInputKeyBehaviorSource).toContain(
      "if (shouldDeferEnterForIme) {"
    );
    expect(messageInputKeyBehaviorSource).toContain('return "none";');
    expect(messageInputKeyBehaviorSource).toContain(
      'return "mention-select";'
    );
  });
});
