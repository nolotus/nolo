import { describe, expect, it } from "bun:test";

import { DataType } from "../../packages/create/types";
import {
  buildWebShareUrl,
  parseShareTarget,
  sanitizeDialogMessages,
} from "./shareResourceHelpers";

describe("parseShareTarget", () => {
  it("parses dialog URLs into dialog targets", () => {
    expect(
      parseShareTarget(
        "http://127.0.0.1:38123/space/demo/dialog-user-1-01KPNPXTP68QECBRKJ9A9THJER"
      )
    ).toMatchObject({
      type: DataType.DIALOG,
      base: "http://127.0.0.1:38123",
      dialogKey: "dialog-user-1-01KPNPXTP68QECBRKJ9A9THJER",
    });
  });

  it("parses page keys and page URLs into page targets", () => {
    expect(parseShareTarget("page-user-1-01SKABCDEFGHIJKLMN", "page")).toMatchObject({
      type: DataType.DOC,
      pageKey: "page-user-1-01SKABCDEFGHIJKLMN",
    });

    expect(
      parseShareTarget("http://127.0.0.1:38123/page-user-1-01SKABCDEFGHIJKLMN")
    ).toMatchObject({
      type: DataType.DOC,
      base: "http://127.0.0.1:38123",
      pageKey: "page-user-1-01SKABCDEFGHIJKLMN",
    });
  });
});

describe("sanitizeDialogMessages", () => {
  it("drops transient controller fields and keeps message payloads intact", () => {
    expect(
      sanitizeDialogMessages([
        { id: "m1", role: "assistant", content: "hello", controller: { abort() {} } },
        { id: "m2", role: "user", content: "world" },
      ])
    ).toEqual([
      { id: "m1", role: "assistant", content: "hello" },
      { id: "m2", role: "user", content: "world" },
    ]);
  });
});

describe("buildWebShareUrl", () => {
  it("normalizes trailing slashes", () => {
    expect(buildWebShareUrl("http://127.0.0.1:38123/", "abc123")).toBe(
      "http://127.0.0.1:38123/share/abc123"
    );
  });
});
