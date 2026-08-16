import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (name: string) =>
  readFileSync(join(import.meta.dir, name), "utf-8");

describe("MessageInput OPT-FE-02 split / memo isolation contract", () => {
  it("keeps MessageInputContainer as a thin permission gate", () => {
    const container = read("MessageInputContainer.tsx");
    const lines = container.split("\n").length;
    expect(lines).toBeLessThan(800);
    expect(container).toContain('from "./MessageInputCore"');
    expect(container).toContain('from "./MessageInputShell"');
    expect(container).not.toContain("decideMessageInputKeyAction");
  });

  it("memoizes composer, controls, and context panels", () => {
    expect(read("MessageInputComposer.tsx")).toContain("memo(function MessageInputComposer");
    expect(read("MessageInputControlsBar.tsx")).toContain(
      "memo(function MessageInputControlsBar"
    );
    expect(read("MessageInputContextPanels.tsx")).toContain(
      "memo(\n  function MessageInputAttachmentsPanel"
    );
    expect(read("MessageInputConfirmBar.tsx")).toContain(
      "memo(function MessageInputConfirmBar"
    );
    expect(read("AgentMentionMenu.tsx")).toContain("memo(AgentMentionMenuComponent)");
  });

  it("isolates send path so sendMessage can avoid text dependency churn", () => {
    const send = read("useMessageInputSend.ts");
    expect(send).toContain("textRef");
    expect(send).toContain("latestRef.current");
    expect(send).toContain("sendingGuardRef");
    expect(send).toContain("startFreshOnNextSendRef");
    // sendMessage deps must not list bare `text` / send-pending state churn
    const depsMatch = send.match(
      /const sendMessage = useCallback\(async \(overrideText\?: string\) => \{[\s\S]*?\}, \[([\s\S]*?)\]\);/
    );
    expect(depsMatch).toBeTruthy();
    const deps = depsMatch![1];
    expect(deps).not.toMatch(/(^|[\s,])text([\s,]|$)/);
    expect(deps).not.toMatch(/(^|[\s,])isSending([\s,]|$)/);
    expect(deps).not.toMatch(/(^|[\s,])startFreshOnNextSend([\s,]|$)/);
  });
});

