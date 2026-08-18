import { describe, expect, test } from "bun:test";

import {
  DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS,
  HIGH_IMPACT_SELF_UPDATE_FIELDS,
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
  normalizeAgentUpdateFieldList,
} from "./selfUpdateFields";

describe("selfUpdateFields primary / default sets", () => {
  test("PRIMARY is greeting, introduction, tags", () => {
    expect([...PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS]).toEqual([
      "greeting",
      "introduction",
      "tags",
    ]);
  });

  test("DEFAULT matches PRIMARY (no drift)", () => {
    expect(DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS).toEqual([
      ...PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
    ]);
  });

  test("HIGH_IMPACT does not overlap PRIMARY", () => {
    const primary = new Set(PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS);
    for (const field of HIGH_IMPACT_SELF_UPDATE_FIELDS) {
      expect(primary.has(field)).toBe(false);
    }
  });

  test("normalizeAgentUpdateFieldList falls back to DEFAULT", () => {
    expect(normalizeAgentUpdateFieldList(undefined)).toEqual([
      ...DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS,
    ]);
    expect(normalizeAgentUpdateFieldList(["greeting", "prompt", "nope"])).toEqual([
      "greeting",
      "prompt",
    ]);
  });
});
