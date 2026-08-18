// 路径: share/shareStore.test.ts
// 职责：验证 shareStore 的 set/get/subscribe/reset 与 SSR override 优先级。

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { DataType } from "create/types";
import type { ShareSummary } from "./types";
import {
  getSSRCommunityShares,
  getSnapshot,
  registerShareSSROverride,
  resetShareStoreForTests,
  setSSRCommunityShares,
  subscribe,
} from "./shareStore";
import type { ShareStoreState } from "./shareStore";

const sampleData: ShareSummary[] = [
  {
    token: "abc",
    type: DataType.DOC,
    title: "Hello",
    createdAt: 1,
    authorId: "u1",
  },
];

describe("shareStore", () => {
  beforeEach(() => {
    resetShareStoreForTests();
  });

  afterEach(() => {
    resetShareStoreForTests();
  });

  it("starts empty and returns data/nextCursor", () => {
    const got = getSSRCommunityShares();
    expect(got.data).toEqual([]);
    expect(got.nextCursor).toBeUndefined();
  });

  it("setSSRCommunityShares writes data/nextCursor and changes content snapshot", () => {
    const before = getSnapshot();
    setSSRCommunityShares({ data: sampleData, nextCursor: "cursor1" });
    expect(getSnapshot()).not.toBe(before);
    expect(getSnapshot()).toContain("cursor1");
    const got = getSSRCommunityShares();
    expect(got.data).toEqual(sampleData);
    expect(got.nextCursor).toBe("cursor1");
  });

  it("setSSRCommunityShares coerces non-array data to []", () => {
    // @ts-expect-error 故意传非法值验证防御
    setSSRCommunityShares({ data: "not-an-array" });
    expect(getSSRCommunityShares().data).toEqual([]);
  });

  it("subscribe is notified on mutation and unsubscribes cleanly", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls += 1;
    });
    setSSRCommunityShares({ data: sampleData });
    expect(calls).toBe(1);
    unsub();
    setSSRCommunityShares({ data: [] });
    expect(calls).toBe(1);
  });

  it("resetShareStoreForTests clears state and changes snapshot", () => {
    setSSRCommunityShares({ data: sampleData, nextCursor: "c" });
    const before = getSnapshot();
    resetShareStoreForTests();
    expect(getSnapshot()).not.toBe(before);
    const got = getSSRCommunityShares();
    expect(got.data).toEqual([]);
    expect(got.nextCursor).toBeUndefined();
  });

  it("SSR override wins over client state when registered and non-null", () => {
    setSSRCommunityShares({ data: sampleData, nextCursor: "client" });

    const ssrState: ShareStoreState = {
      communityShares: {
        loading: false,
        error: null,
        data: [
          {
            token: "ssr",
            type: DataType.TABLE,
            title: "SSR",
            createdAt: 2,
            authorId: "u2",
          },
        ],
        nextCursor: "ssr-cursor",
      },
    };
    registerShareSSROverride(() => ssrState);

    const got = getSSRCommunityShares();
    expect(got.data[0]).toMatchObject({ token: "ssr" });
    expect(got.nextCursor).toBe("ssr-cursor");
  });

  it("SSR override returning null falls back to client state", () => {
    setSSRCommunityShares({ data: sampleData, nextCursor: "client" });
    registerShareSSROverride(() => null);
    const got = getSSRCommunityShares();
    expect(got.data).toEqual(sampleData);
    expect(got.nextCursor).toBe("client");
  });
});
