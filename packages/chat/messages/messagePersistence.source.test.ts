import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageSliceSource = readFileSync(
  join(import.meta.dir, "messageSlice.ts"),
  "utf-8"
);

describe("message persistence source contract", () => {
  it("persists user and assistant messages through dbSlice.write", () => {
    expect(messageSliceSource).toContain("prepareAndPersistMessage: create.asyncThunk(");
    expect(messageSliceSource).toContain("messageActions.addUserMessage");
    expect(messageSliceSource).toContain("write({");
    expect(messageSliceSource).toContain("type: DataType.MSG");
  });

  it("awaits terminal assistant write before messageStreamEnd fulfills", () => {
    expect(messageSliceSource).toContain("messageStreamEnd: create.asyncThunk(");
    // Must await write().unwrap() so the thunk cannot fulfill before persistence settles.
    const streamEndIdx = messageSliceSource.indexOf(
      "messageStreamEnd: create.asyncThunk("
    );
    const nextThunkIdx = messageSliceSource.indexOf(
      "deleteMessage: create.asyncThunk(",
      streamEndIdx + 1
    );
    expect(streamEndIdx).toBeGreaterThanOrEqual(0);
    expect(nextThunkIdx).toBeGreaterThan(streamEndIdx);
    const streamEndBody = messageSliceSource.slice(streamEndIdx, nextThunkIdx);
    expect(streamEndBody).toContain("await dispatch(");
    expect(streamEndBody).toContain("...messageToWrite, type: DataType.MSG");
    expect(streamEndBody).toContain("customKey: msgKey");
    expect(streamEndBody).toContain(").unwrap()");
  });

  it("deletes messages through dbSlice.remove", () => {
    expect(messageSliceSource).toContain("deleteMessage: create.asyncThunk(");
    expect(messageSliceSource).toContain("await dispatch(remove(dbKey));");
    expect(messageSliceSource).toContain("await dispatch(remove(extraRemoveDbKey));");
  });

  it("routes tool durability through shared persistToolMessage (web + desktop)", () => {
    const toolThunksSource = readFileSync(
      join(import.meta.dir, "toolThunks.ts"),
      "utf-8"
    );
    const persistSource = readFileSync(
      join(import.meta.dir, "persistToolMessage.ts"),
      "utf-8"
    );
    expect(toolThunksSource).toContain(
      'import { persistToolMessage } from "./persistToolMessage"'
    );
    expect(toolThunksSource).toContain("await persistToolMessage(dispatch,");
    expect(toolThunksSource).not.toContain('type: DataType.MSG');
    expect(persistSource).toContain("role: \"tool\"");
    expect(persistSource).toContain("type: DataType.MSG");
    expect(persistSource).toContain("export async function persistToolMessages");
    // Web handleToolCalls must persist tool rows with soft:true so a LevelDB
    // write failure cannot flip an already-executed tool into a failed row
    // (regression guard for the previous `await dispatch(write)` semantics).
    const softCount = (toolThunksSource.match(/soft: true/g) ?? []).length;
    const persistCount = (toolThunksSource.match(/await persistToolMessage\(dispatch,/g) ?? []).length;
    expect(softCount).toBeGreaterThanOrEqual(persistCount);
  });

  it("keeps assistant content shaping behind shared message-contract helpers", () => {
    expect(messageSliceSource).toContain("finalizeAssistantMessageContent(");
    expect(messageSliceSource).toContain("appendSaveFailureToContent(");
    // 重构后：finalizeAssistantMessageContent 解构出 finalVisibleContent（内容序列化护栏）
    expect(messageSliceSource).toContain("visibleContent: finalVisibleContent");
    // 重构后：titleEligible 收敛为 updateTitle 布尔（resolveStreamEndBillingUsages 输出）
    expect(messageSliceSource).toContain("if (updateTitle) {");
    expect(messageSliceSource).toContain(
      "dispatch((updateDialogTitle as any)({ dialogKey, agentConfig }))"
    );
    expect(messageSliceSource).not.toContain("selectAutoSummarizeTitle");
    expect(messageSliceSource).not.toContain("shouldScheduleDialogTitleUpdate");
    expect(messageSliceSource).not.toContain("(normalContent || '').trim()");
    expect(messageSliceSource).not.toContain(
      "(dialogState.msgs.entities[messageId]?.content || \"\") +"
    );
  });
});
