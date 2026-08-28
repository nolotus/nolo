import { describe, expect, it } from "bun:test";
import {
  getMyContentBatchDeleteCopy,
  getMyContentBatchItemNoun,
  shouldIncludeAttachmentsOnBatchDelete,
} from "./myContentBatchManage";

const t = ((key: string, defaultValue?: string) => defaultValue ?? key) as any;

describe("myContentBatchManage", () => {
  it("resolves batch nouns and delete copy per tab", () => {
    expect(getMyContentBatchItemNoun("table", t)).toBe("表格");
    expect(getMyContentBatchItemNoun("image", t)).toBe("图片");
    expect(getMyContentBatchItemNoun("attachment", t)).toBe("附件");
    expect(getMyContentBatchDeleteCopy("table", 2, t).message).toContain("2");
    expect(getMyContentBatchDeleteCopy("attachment", 3, t).message).toContain("附件");
    expect(shouldIncludeAttachmentsOnBatchDelete("dialog")).toBe(true);
    expect(shouldIncludeAttachmentsOnBatchDelete("page")).toBe(false);
  });
});