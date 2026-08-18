import { describe, expect, test } from "bun:test";

import {
  findDialogConfigByDialogId,
  resolveInitMsgsSummaryResume,
} from "./messageInitMsgsSummaryResume";
import { DataType } from "create/types";

const DIALOG_ID = "dialog-abc";
const DIALOG_DBKEY = "dbkey-dialog-abc";

function makeDialogEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    type: DataType.DIALOG,
    id: DIALOG_ID,
    dbKey: DIALOG_DBKEY,
    summaryPending: true,
    ...overrides,
  };
}

describe("findDialogConfigByDialogId", () => {
  test("finds the matching dialog entity", () => {
    const entities = {
      a: makeDialogEntity(),
      b: { type: "page", id: "other" },
    };
    const found = findDialogConfigByDialogId(entities, DIALOG_ID);
    expect(found).toBeDefined();
    expect(found?.id).toBe(DIALOG_ID);
  });

  test("returns undefined when no entity matches", () => {
    const entities = {
      a: makeDialogEntity({ id: "other-dialog" }),
    };
    expect(findDialogConfigByDialogId(entities, DIALOG_ID)).toBeUndefined();
  });

  test("ignores non-DIALOG entities even if id matches", () => {
    const entities = {
      a: { type: "page", id: DIALOG_ID },
    };
    expect(findDialogConfigByDialogId(entities, DIALOG_ID)).toBeUndefined();
  });

  test("handles null/undefined entity maps", () => {
    expect(findDialogConfigByDialogId(null, DIALOG_ID)).toBeUndefined();
    expect(findDialogConfigByDialogId(undefined, DIALOG_ID)).toBeUndefined();
  });

  test("skips non-object entity values", () => {
    const entities = {
      a: null,
      b: "not-an-object",
      c: 42,
      d: makeDialogEntity(),
    };
    const found = findDialogConfigByDialogId(entities, DIALOG_ID);
    expect(found?.id).toBe(DIALOG_ID);
  });
});

describe("resolveInitMsgsSummaryResume", () => {
  test("resumes when summaryPending true and dbKey present", () => {
    const entities = { a: makeDialogEntity() };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: true, dialogKey: DIALOG_DBKEY });
  });

  test("no resume when dialog not found", () => {
    const entities = { a: makeDialogEntity({ id: "other-dialog" }) };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("no resume when summaryPending false", () => {
    const entities = { a: makeDialogEntity({ summaryPending: false }) };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("no resume when dbKey missing", () => {
    const entities = { a: makeDialogEntity({ dbKey: undefined }) };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("no resume when dbKey is empty string", () => {
    const entities = { a: makeDialogEntity({ dbKey: "" }) };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("ignores non-DIALOG entity with matching id", () => {
    const entities = {
      a: { type: "page", id: DIALOG_ID, summaryPending: true, dbKey: DIALOG_DBKEY },
    };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("ignores DIALOG entity with wrong id", () => {
    const entities = {
      a: makeDialogEntity({ id: "wrong-id" }),
    };
    const decision = resolveInitMsgsSummaryResume({
      entities,
      dialogId: DIALOG_ID,
    });
    expect(decision).toEqual({ resume: false });
  });

  test("handles null/undefined entities", () => {
    expect(
      resolveInitMsgsSummaryResume({ entities: null, dialogId: DIALOG_ID })
    ).toEqual({ resume: false });
    expect(
      resolveInitMsgsSummaryResume({ entities: undefined, dialogId: DIALOG_ID })
    ).toEqual({ resume: false });
  });
});