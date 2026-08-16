import { describe, expect, it } from "bun:test";
import { DataType } from "create/types";
import {
  buildDialogAgentListIndexDeleteOps,
  buildDialogAgentListIndexOps,
  collectDialogAgentListIndexAgentKeys,
  createDialogAgentListIndexKey,
  createDialogAgentListIndexRange,
  createDialogKey,
  createDialogMessageKeyAndId,
  dialogMessageKey,
  dialogMessagePrefix,
  dialogMessageRange,
  expandDialogAgentListIndexAliases,
  isDialogAgentListIndexable,
  isDialogKey,
  isDialogRecordKey,
  isDialogRecordKeyForId,
  parseDialogUpdatedAtMs,
  toDialogListInvertedTimestamp,
} from "./keys";

describe("dialog keys", () => {
  it("creates user-scoped dialog keys and range", () => {
    expect(String(DataType.DIALOG)).toBe("dialog");

    const created = createDialogKey("user-a");
    expect(created).toStartWith("dialog-user-a-");
    expect(isDialogKey(created)).toBe(true);
    expect(isDialogRecordKey(created)).toBe(true);

    const single = createDialogKey.single("user-a", "01DIALOGID000000000000001");
    expect(single).toBe("dialog-user-a-01DIALOGID000000000000001");
    expect(isDialogRecordKeyForId(single, "01DIALOGID000000000000001")).toBe(true);

    const range = createDialogKey.rangeOfUser("user-a");
    expect(range).toEqual({
      start: "dialog-user-a-",
      end: "dialog-user-a-\uffff",
    });
    expect(single >= range.start && single <= range.end).toBe(true);
  });

  it("distinguishes dialog record keys from message keys", () => {
    const dialogId = "01DIALOGID000000000000002";
    const recordKey = createDialogKey.single("user-b", dialogId);
    const { key: messageKey } = createDialogMessageKeyAndId(dialogId, () => "01MSGID000000000000000001");
    const msgRange = dialogMessageRange(dialogId);

    expect(dialogMessagePrefix(dialogId)).toBe(`dialog-${dialogId}-msg`);
    expect(dialogMessageKey(dialogId, "01MSGID000000000000000001")).toBe(messageKey);

    expect(isDialogKey(recordKey)).toBe(true);
    expect(isDialogKey(messageKey)).toBe(true);

    expect(isDialogRecordKey(recordKey)).toBe(true);
    expect(isDialogRecordKey(messageKey)).toBe(false);

    expect(isDialogRecordKeyForId(recordKey, dialogId)).toBe(true);
    expect(isDialogRecordKeyForId(messageKey, dialogId)).toBe(false);
    expect(isDialogRecordKeyForId(recordKey, "other")).toBe(false);

    expect(messageKey >= msgRange.start && messageKey <= msgRange.end).toBe(true);
    expect(recordKey >= msgRange.start && recordKey <= msgRange.end).toBe(false);
  });

  it("rejects non-dialog keys", () => {
    expect(isDialogRecordKey("agent-user-a-01")).toBe(false);
    expect(isDialogRecordKey("dialog")).toBe(false);
    expect(isDialogRecordKeyForId("dialog-user-a-01ABC", "")).toBe(false);
  });
});

describe("dialog agent list index keys", () => {
  it("inverts updatedAt so newer sorts first lexicographically", () => {
    const newer = toDialogListInvertedTimestamp(2_000);
    const older = toDialogListInvertedTimestamp(1_000);
    expect(newer < older).toBe(true);
    expect(parseDialogUpdatedAtMs("1970-01-01T00:00:00.020Z")).toBe(20);
  });

  it("builds agent-scoped reverse-chrono keys and range", () => {
    const dialogId = "01DIALOGID000000000000010";
    const newer = createDialogAgentListIndexKey({
      userId: "user-a",
      agentKey: "agent-user-a-pm",
      updatedAt: 2_000,
      dialogId,
    });
    const older = createDialogAgentListIndexKey({
      userId: "user-a",
      agentKey: "agent-user-a-pm",
      updatedAt: 1_000,
      dialogId: "01DIALOGID000000000000011",
    });
    expect(newer).toStartWith("dialogidx-agent-user-a-agent-user-a-pm-");
    expect(newer < older).toBe(true);

    const range = createDialogAgentListIndexRange("user-a", "agent-user-a-pm");
    expect(newer >= range.start && newer <= range.end).toBe(true);
    expect(older >= range.start && older <= range.end).toBe(true);

    const otherAgent = createDialogAgentListIndexKey({
      userId: "user-a",
      agentKey: "agent-user-a-other",
      updatedAt: 2_000,
      dialogId,
    });
    expect(otherAgent >= range.start && otherAgent <= range.end).toBe(false);
  });

  it("normalizes agent keys without aliases", () => {
    expect(expandDialogAgentListIndexAliases("agent-user-a-pm")).toEqual([
      "agent-user-a-pm",
    ]);
    const keys = collectDialogAgentListIndexAgentKeys({
      primaryAgentKey: "agent-user-a-pm",
      cybots: ["agent-user-a-other", "agent-user-a-pm"],
    });
    expect(keys).toContain("agent-user-a-pm");
    expect(keys).toContain("agent-user-a-other");
  });

  it("skips automation dialogs for indexability", () => {
    expect(isDialogAgentListIndexable({ primaryAgentKey: "a" })).toBe(true);
    expect(
      isDialogAgentListIndexable({
        primaryAgentKey: "a",
        triggerType: "automation_run",
      }),
    ).toBe(false);
    expect(
      isDialogAgentListIndexable({
        primaryAgentKey: "a",
        parentTaskKey: "task-1",
      }),
    ).toBe(false);
  });

  it("builds put/del ops when updatedAt or agent membership changes", () => {
    const dialogKey = createDialogKey.single("user-a", "01D000000000000000000001");
    const previous = {
      id: "01D000000000000000000001",
      primaryAgentKey: "agent-user-a-pm",
      cybots: ["agent-user-a-pm"],
      updatedAt: 1_000,
    };
    const next = {
      ...previous,
      updatedAt: 2_000,
    };
    const ops = buildDialogAgentListIndexOps({
      userId: "user-a",
      dialogKey,
      nextRecord: next,
      previousRecord: previous,
    });
    const dels = ops.filter((op) => op.type === "del");
    const puts = ops.filter((op) => op.type === "put");
    // one agent key under old ts deleted; same under new ts put
    expect(dels.length).toBe(1);
    expect(puts.length).toBe(1);
    expect(puts.every((op) => op.type === "put" && op.value.dialogKey === dialogKey)).toBe(
      true,
    );

    const staleRemoved = buildDialogAgentListIndexOps({
      userId: "user-a",
      dialogKey,
      nextRecord: {
        ...next,
        triggerType: "automation_run",
      },
      previousRecord: next,
    });
    expect(staleRemoved.every((op) => op.type === "del")).toBe(true);
    expect(staleRemoved.length).toBe(1);
  });

  it("buildDialogAgentListIndexDeleteOps removes all previous agent index keys", () => {
    const dialogKey = "dialog-user-a-01D000000000000000000001";
    const previous = {
      id: "01D000000000000000000001",
      primaryAgentKey: "agent-user-a-pm",
      cybots: ["agent-user-a-pm"],
      updatedAt: 2_000,
    };
    const dels = buildDialogAgentListIndexDeleteOps({
      userId: "user-a",
      dialogKey,
      previousRecord: previous,
    });
    expect(dels.length).toBe(1);
    expect(dels.every((op) => op.type === "del")).toBe(true);
    expect(dels.every((op) => op.key.startsWith("dialogidx-agent-user-a-"))).toBe(
      true,
    );
  });
});
