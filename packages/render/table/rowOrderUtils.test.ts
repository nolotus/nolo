// 文件: render/table/rowOrderUtils.test.ts
import { describe, expect, test } from "bun:test";

import { anchorForInsertAbove, insertKeyIntoOrder } from "./rowOrderUtils";

describe("insertKeyIntoOrder", () => {
  test("order 为 null 时先物化可见行顺序，再插到锚点之后", () => {
    const visible = ["a", "b", "c"];
    const next = insertKeyIntoOrder(null, visible, "new", {
      type: "after",
      key: "b",
    });
    expect(next).toEqual(["a", "b", "new", "c"]);
  });

  test("order 为 null + top：物化后插到最前", () => {
    const next = insertKeyIntoOrder(null, ["a", "b"], "new", { type: "top" });
    expect(next).toEqual(["new", "a", "b"]);
  });

  test("after 末尾行：插到数组末尾", () => {
    const next = insertKeyIntoOrder(["a", "b"], ["a", "b"], "new", {
      type: "after",
      key: "b",
    });
    expect(next).toEqual(["a", "b", "new"]);
  });

  test("bottom：追加到末尾", () => {
    const next = insertKeyIntoOrder(["b", "a"], ["a", "b"], "new", {
      type: "bottom",
    });
    expect(next).toEqual(["b", "a", "new"]);
  });

  test("top：已有 order 时插到最前", () => {
    const next = insertKeyIntoOrder(["b", "a"], ["a", "b"], "new", {
      type: "top",
    });
    expect(next).toEqual(["new", "b", "a"]);
  });

  test("锚点不存在时兜底追加末尾", () => {
    const next = insertKeyIntoOrder(["a", "b"], ["a", "b"], "new", {
      type: "after",
      key: "ghost",
    });
    expect(next).toEqual(["a", "b", "new"]);
  });

  test("newKey 已存在时先移除再插入，不产生重复", () => {
    const next = insertKeyIntoOrder(["a", "new", "b"], ["a", "b"], "new", {
      type: "after",
      key: "b",
    });
    expect(next).toEqual(["a", "b", "new"]);
  });

  test("order 为 null 且可见行为空：仍能插入", () => {
    const next = insertKeyIntoOrder(null, [], "new", { type: "top" });
    expect(next).toEqual(["new"]);
  });
});

describe("anchorForInsertAbove", () => {
  test("目标在中间：锚点为前一行的 after", () => {
    expect(anchorForInsertAbove(["a", "b", "c"], "c")).toEqual({
      type: "after",
      key: "b",
    });
  });

  test("目标是第一行：退化为 top", () => {
    expect(anchorForInsertAbove(["a", "b", "c"], "a")).toEqual({
      type: "top",
    });
  });

  test("targetKey 不存在：兜底 bottom（与 insertKeyIntoOrder 未知锚点追加末尾一致）", () => {
    expect(anchorForInsertAbove(["a", "b"], "ghost")).toEqual({
      type: "bottom",
    });
  });
});
