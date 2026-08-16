import { describe, expect, it } from "bun:test";
import {
  TYPE_STORAGE_PREFIXES,
  inferTypeFromDbKey,
  SEPARATOR,
} from "./keys";
import { DataType } from "create/types";
import { getUserDataPrefixes } from "./queryPrefixes";

describe("TYPE_STORAGE_PREFIXES — type→prefix 单一权威映射", () => {
  it("每种 DataType 都有显式注册的 storage prefix", () => {
    const requiredTypes = [
      DataType.APP,
      DataType.DOC,
      DataType.DIALOG,
      DataType.IMAGE,
      DataType.FILE,
      DataType.TABLE,
      DataType.AGENT,
    ];
    for (const type of requiredTypes) {
      const prefixes = TYPE_STORAGE_PREFIXES[type];
      expect(prefixes).toBeDefined();
      expect(prefixes!.length).toBeGreaterThan(0);
    }
  });

  it("table 同时映射到 meta- 和 table- 两个 prefix", () => {
    expect(TYPE_STORAGE_PREFIXES[DataType.TABLE]).toEqual(["meta", "table"]);
  });

  it("getUserDataPrefixes 从 TYPE_STORAGE_PREFIXES 读取，不自己维护别名", () => {
    // 验证 queryPrefixes 的行为和 TYPE_STORAGE_PREFIXES 一致
    expect(getUserDataPrefixes("table", "u1")).toEqual([
      "meta-u1-",
      "table-u1-",
    ]);
    expect(getUserDataPrefixes("dialog", "u1")).toEqual(["dialog-u1-"]);
    expect(getUserDataPrefixes("agent", "u1")).toEqual(["agent-u1-"]);
  });
});

describe("inferTypeFromDbKey — 从 dbKey 反推 type", () => {
  it("meta- prefix 推断为 table", () => {
    expect(inferTypeFromDbKey("meta-u1-tableA")).toBe(DataType.TABLE);
  });

  it("table- prefix 推断为 table", () => {
    expect(inferTypeFromDbKey("table-u1-legacy")).toBe(DataType.TABLE);
  });

  it("dialog- prefix 推断为 dialog", () => {
    expect(inferTypeFromDbKey("dialog-u1-abc123")).toBe(DataType.DIALOG);
  });

  it("agent- prefix 推断为 agent", () => {
    expect(inferTypeFromDbKey("agent-u1-bot01")).toBe(DataType.AGENT);
  });

  it("page- prefix 推断为 page (DOC)", () => {
    expect(inferTypeFromDbKey("page-u1-doc01")).toBe(DataType.DOC);
  });

  it("未知 prefix 返回 null", () => {
    expect(inferTypeFromDbKey("unknown-u1-xyz")).toBeNull();
    expect(inferTypeFromDbKey("")).toBeNull();
    expect(inferTypeFromDbKey("noprefix")).toBeNull();
  });

  it("基础设施 key（row/idx/view）返回 null（不属于用户内容 type）", () => {
    expect(inferTypeFromDbKey("row-u1-t1-r1")).toBeNull();
    expect(inferTypeFromDbKey("idx-u1-t1-name-key-r1")).toBeNull();
  });
});