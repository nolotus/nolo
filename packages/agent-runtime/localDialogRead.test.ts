import { describe, expect, it, mock } from "bun:test";

import {
  LOCAL_READ_LOCK_TIMEOUT_MS,
  readDialogFromLocalDb,
  resolveLocalReadOpenOptions,
} from "./localDialogRead";

// 刻意不用 mock.module 替换 db / fetchMessages：那种替换在同一次 bun test
// 进程里无法可靠还原（mock.restore 只还原 spy，不还原模块注册表），会打挂
// 后续文件的用例（曾打挂 chat/messages 的 fetchMessages tombstone 用例）。
// 开库契约改由纯函数 resolveLocalReadOpenOptions 直接断言。

describe("resolveLocalReadOpenOptions", () => {
  it("默认用短锁预算且静默——不继承 server 部署重启的 90s 语义", () => {
    // 回归：readDialogFromLocalDb 曾调用无参 ensureServerDbOpen()，继承了 90s
    // 默认预算。抢锁对手是常驻 dev server，它不会让出 LOCK，等 90s 与等 3s
    // 同样失败，只是白白卡住用户一分半钟，并刷 90 行 warn。
    expect(resolveLocalReadOpenOptions()).toEqual({
      timeoutMs: LOCAL_READ_LOCK_TIMEOUT_MS,
      quiet: true,
    });
    expect(LOCAL_READ_LOCK_TIMEOUT_MS).toBeLessThanOrEqual(5_000);
    expect(LOCAL_READ_LOCK_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("允许调用方覆盖锁预算，但静默始终保持", () => {
    expect(resolveLocalReadOpenOptions(100)).toEqual({
      timeoutMs: 100,
      quiet: true,
    });
  });
});

describe("readDialogFromLocalDb", () => {
  it("传入 broker db 时直接读，不碰 ensureServerDbOpen（不抢 LOCK）", async () => {
    // 传 db 的分支不 import database-engine/db，因此无需 mock 任何模块。
    const db = {
      get: mock(async () => ({ id: "d1", title: "t" })),
      // fetchMessages 通过 db.iterator 读取消息；给出空区间即可，
      // 这里只验证 broker db 被直接使用、且没有触发开库。
      iterator: () => ({
        async *[Symbol.asyncIterator]() {},
        async close() {},
      }),
    };

    const result = await readDialogFromLocalDb({
      dialogKey: "dialog-u1-d1",
      dialogId: "d1",
      limit: 5,
      db,
    });

    expect(result.meta).toEqual({ id: "d1", title: "t" });
    expect(result.msgs).toEqual([]);
    expect(result.source).toBeUndefined();
    expect(db.get).toHaveBeenCalledWith("dialog-u1-d1");
  });
});
