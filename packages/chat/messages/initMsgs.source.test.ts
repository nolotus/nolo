import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageSliceSource = readFileSync(
  join(import.meta.dir, "messageSlice.ts"),
  "utf-8"
);

describe("initMsgs source contract", () => {
  it("still fetches bootstrap history for new dialogs while only clearing empty buckets in pending", () => {
    expect(messageSliceSource).not.toContain(
      "// 新建对话无需从本地/远程拉取历史消息"
    );
    expect(messageSliceSource).toContain("if (isNew) {");
    expect(messageSliceSource).toContain("resolveInitMsgsFulfilledWriteMode");
    expect(messageSliceSource).toContain(
      'if (writeMode === "upsert")'
    );
    expect(messageSliceSource).toContain("upsertManyMessages(dialogState, action.payload);");
  });

  it("setMessages defaults to merge; replace is opt-in", () => {
    expect(messageSliceSource).toContain("earlyReturned");
    expect(messageSliceSource).toContain("replace?: boolean");
    // earlyReturned revalidate must not pass replace:true
    const earlyBlockStart = messageSliceSource.indexOf("if (earlyReturned)");
    const earlyBlock = messageSliceSource.slice(earlyBlockStart, earlyBlockStart + 900);
    expect(earlyBlock).toContain("setMessages({");
    expect(earlyBlock).not.toContain("replace: true");
  });
});
