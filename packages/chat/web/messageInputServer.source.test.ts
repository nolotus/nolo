import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageInputCoreSource = readFileSync(
  join(import.meta.dir, "MessageInputCore.tsx"),
  "utf-8"
);
const messageInputSendSource = readFileSync(
  join(import.meta.dir, "useMessageInputSend.ts"),
  "utf-8"
);
const messageInputFilesSource = readFileSync(
  join(import.meta.dir, "useMessageInputFiles.ts"),
  "utf-8"
);
const messageInputChipSource = readFileSync(
  join(import.meta.dir, "MessageInputContextPanels.tsx"),
  "utf-8"
);
const messageInputControlsSource = readFileSync(
  join(import.meta.dir, "MessageInputControlsBar.tsx"),
  "utf-8"
);

describe("message input server planning source contract", () => {
  it("derives document processing server context from the runtime snapshot", () => {
    expect(messageInputCoreSource).toContain(
      'import { selectRuntimeSnapshot } from "app/stateViews/runtime"'
    );
    expect(messageInputCoreSource).toContain(
      "const { currentServer, currentToken: token } ="
    );
    expect(messageInputFilesSource).toContain("ocrRequest: {");
    expect(messageInputFilesSource).toContain("serverOrigin: currentServer");
    expect(messageInputFilesSource).toContain("accessToken: token");
    expect(messageInputCoreSource).not.toContain("selectCurrentServer");
    expect(messageInputCoreSource).not.toContain("selectCurrentToken");
  });

  it("passes image option overrides through the agent runtime contract", () => {
    expect(messageInputSendSource).toContain("imageConfigOverride: {");
    expect(messageInputSendSource).toContain(
      "...snap.runtimeOptions?.imageConfigOverride"
    );
    expect(messageInputSendSource).toContain(
      "aspectRatio: snap.imageAspectRatio"
    );
    expect(messageInputSendSource).toContain("imageSize: snap.imageSize");
    expect(messageInputSendSource).toContain(
      "imageModelOverride: snap.selectedImageProfile?.imageModelOverride"
    );
    expect(messageInputSendSource).not.toContain("imageGeneration: {");
    expect(messageInputSendSource).not.toContain("size: imageSize");
  });

  it("passes the active dialog key into the send action", () => {
    expect(messageInputCoreSource).toContain(
      "const currentDialogKey = useCurrentDialogKey();"
    );
    expect(messageInputSendSource).toMatch(
      /sendFirstMessage\(\{\s*text: trimmed,[\s\S]*?dialogKey: snap\.currentDialogKey \?\? undefined/
    );
  });

  it("passes selected canvas node context through runtime editingTarget instead of visible user text", () => {
    expect(messageInputCoreSource).toContain("useCanvasEditSelection");
    expect(messageInputSendSource).toContain("buildCanvasNodeEditingTarget");
    expect(messageInputSendSource).toContain("markPendingCanvasEditSelection");
    expect(messageInputSendSource).toContain(
      "editingTarget: buildCanvasNodeEditingTarget(snap.canvasEditSelection)"
    );
    expect(messageInputSendSource).toContain(
      "markPendingCanvasEditSelection(snap.canvasEditSelection)"
    );
    expect(messageInputSendSource).toContain(
      "markPendingCanvasEditSelection(null)"
    );
    expect(messageInputChipSource).toContain("message-input__canvas-edit-chip");
  });

  it("keeps the textarea editable while only blocking send/upload during pending sends", () => {
    expect(messageInputSendSource).toContain(
      "const isSendPending = isSending && !hasStreamingMessage && !isLoopRunning;"
    );
    expect(messageInputSendSource).toContain(
      "const isSendBlocked = processingCount > 0 || isSendPending;"
    );
    expect(messageInputSendSource).toContain(
      "const fileUploadDisabled = processingCount > 0 || isSendPending;"
    );
    expect(messageInputCoreSource).toContain(
      "fileUploadDisabled={fileUploadDisabled}"
    );
    expect(messageInputCoreSource).toContain(
      'processingCount > 0 ? t("waitForProcessing") : t("messageOrFileHere")'
    );
    expect(messageInputCoreSource).not.toContain("disabled={isDisabled}");
    expect(messageInputControlsSource).toContain(
      "disabled={fileUploadDisabled}"
    );
  });

  it("keeps the voice button hidden while the textarea is focused or generating", () => {
    expect(messageInputCoreSource).toContain(
      "const [isTextareaFocused, setIsTextareaFocused] = useState(false);"
    );
    expect(messageInputCoreSource).toContain(
      "!hasContent && !isSendBlocked && !isTextareaFocused && !isGenerating"
    );
    expect(messageInputCoreSource).toContain("setIsTextareaFocused(true);");
    expect(messageInputCoreSource).toContain("setIsTextareaFocused(false);");
  });

  it("keeps agent creation out of the dialog composer shortcuts", () => {
    expect(messageInputCoreSource).not.toContain(
      "const showAgentCreationChip ="
    );
    expect(messageInputCoreSource).not.toContain('source: "composer"');
    expect(messageInputCoreSource).not.toContain(
      "message-input__agent-create-chip"
    );
    expect(messageInputCoreSource).not.toContain(
      "createDialog({ cybots: [BUILTIN_AGENT_CREATOR_AGENT_KEY]"
    );
    expect(messageInputSendSource).not.toContain(
      "createDialog({ cybots: [BUILTIN_AGENT_CREATOR_AGENT_KEY]"
    );
  });

  it("keeps slash-command execution local to MessageInput send path while delegating parsing to the resolver", () => {
    expect(messageInputSendSource).toContain('from "./messageSlashCommands"');
    expect(messageInputSendSource).toContain(
      'import { resolveMessageInputSendDecision } from "./messageInputSendResolver";'
    );
    expect(messageInputSendSource).toContain("isCompactDialogSlashCommand");
    expect(messageInputSendSource).toContain(
      "const [startFreshOnNextSend, setStartFreshOnNextSend] = useState(false);"
    );
    expect(messageInputSendSource).toContain(
      "Started a fresh dialog. Next message will open a new chat."
    );
    expect(messageInputSendSource).toContain(
      "const decision = resolveMessageInputSendDecision({"
    );
    expect(messageInputSendSource).toContain("isFreshDialogSlashCommand,");
    expect(messageInputSendSource).toContain("isCompactDialogSlashCommand,");
    expect(messageInputSendSource).toContain('case "arm-fresh-dialog":');
    expect(messageInputSendSource).toContain("armFreshDialogSend();");
    expect(messageInputSendSource).toContain(
      "createDialog({ cybots: [nextAgentKey], skipGreeting: true })"
    );
    expect(messageInputSendSource).toContain("markStartFreshOnNextSend(true);");
    expect(messageInputSendSource).toContain(
      'import { compactDialogAndForkAction } from "chat/dialog/actions/compactDialogAndForkAction";'
    );
    expect(messageInputSendSource).toContain('case "compact-blocked":');
    expect(messageInputSendSource).toContain(
      "Wait for the current response to finish before using /compact."
    );
    expect(messageInputSendSource).toContain('case "compact-dialog":');
    expect(messageInputSendSource).toContain(
      'if (decision.kind === "compact-dialog") {'
    );
    expect(messageInputSendSource).toContain(
      "compactDialogAndForkAction({ dialogKey: currentDialogKey })"
    );
    expect(messageInputSendSource).toContain(
      'toast.success("Compacted this chat and switched to a new dialog.");'
    );
  });
});
