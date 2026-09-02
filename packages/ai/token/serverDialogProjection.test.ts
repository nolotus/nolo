import { describe, expect, it, mock } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import { createTestAuthorityStore } from "database-engine/testAuthorityStore";
import { createKey } from "database/keys";
import { DataType } from "create/types";

describe("server dialog token projection", () => {
  it("atomically marks a stable projection so retries do not add the delta twice", async () => {
    const db = new MemoryDB();
    const store = createTestAuthorityStore(db as any);
    mock.module("database-engine/db", () => ({
      getServerAuthorityStore: () => store,
    }));
    const { applyServerDialogProjectionDelta } = await import(
      `./serverDialogProjection.ts?stable-marker=${Date.now()}`
    );
    mock.restore();

    const dialogKey = createKey(DataType.DIALOG, "user-1", "dialog-1");
    await db.put(dialogKey, {
      id: "dialog-1",
      userId: "user-1",
      inputTokens: 10,
      outputTokens: 2,
      totalCost: 0.25,
    });
    const projection = {
      userId: "user-1",
      dialogId: "dialog-1",
      inputTokensDelta: 5,
      outputTokensDelta: 1,
      costDelta: 0.5,
      projectionId: "token-user-1-1000-call-a",
    };

    await applyServerDialogProjectionDelta(projection);
    await applyServerDialogProjectionDelta(projection);

    expect(await db.get(dialogKey)).toMatchObject({
      inputTokens: 15,
      outputTokens: 3,
      totalCost: 0.75,
    });
    const markerKey = createKey(
      "dialog-token-projection",
      "user-1",
      "dialog-1",
      projection.projectionId,
    );
    expect(await db.get(markerKey)).toMatchObject({ projectionId: projection.projectionId });
  });

  it("dedupes a CLI sync after the server projected the same stable call while accumulating a different call", async () => {
    const db = new MemoryDB();
    const store = createTestAuthorityStore(db as any);
    mock.module("database-engine/db", () => ({
      getServerAuthorityStore: () => store,
    }));
    const { applyServerDialogProjectionDelta } = await import(
      `./serverDialogProjection.ts?server-cli-shared-marker=${Date.now()}`
    );
    mock.restore();

    const userId = "user-shared";
    const dialogId = "dialog-shared";
    const dialogKey = createKey(DataType.DIALOG, userId, dialogId);
    await db.put(dialogKey, {
      id: dialogId,
      userId,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });

    const stableTokenKey = "token-user-shared-call-provider-a";
    const firstCall = {
      userId,
      dialogId,
      inputTokensDelta: 100,
      outputTokensDelta: 20,
      costDelta: 1.25,
      projectionId: stableTokenKey,
    };

    // Server token writer projects first; the later CLI sync uses the same
    // stable token key/provider call id and must be a no-op.
    await applyServerDialogProjectionDelta(firstCall);
    await applyServerDialogProjectionDelta(firstCall);

    // A genuinely different provider call has a different stable token key
    // and must still contribute to the dialog totals.
    await applyServerDialogProjectionDelta({
      userId,
      dialogId,
      inputTokensDelta: 40,
      outputTokensDelta: 8,
      costDelta: 0.5,
      projectionId: "token-user-shared-call-provider-b",
    });

    expect(await db.get(dialogKey)).toMatchObject({
      inputTokens: 140,
      outputTokens: 28,
      totalCost: 1.75,
    });
  });

  it("treats an undefined dialog read as a missing record", async () => {
    const puts: Array<[string, unknown]> = [];
    const store = {
      get: mock(async () => undefined),
      put: mock(async (key: string, value: unknown) => {
        puts.push([key, value]);
      }),
    };
    mock.module("database-engine/db", () => ({
      getServerAuthorityStore: () => store,
    }));
    const { applyServerDialogProjectionDelta } = await import(
      `./serverDialogProjection.ts?undefined-dialog=${Date.now()}`
    );
    mock.restore();

    await expect(
      applyServerDialogProjectionDelta({
        userId: "user-1",
        dialogId: "chat-proxy",
        inputTokensDelta: 3,
        outputTokensDelta: 1,
        costDelta: 0.2,
      }),
    ).resolves.toBeUndefined();

    expect(puts).toEqual([]);
  });

  it("leaves the stable marker unwritten when the dialog record is missing, so a later writer can still project", async () => {
    // CLI 本地对话：聊天代理中途计费时 dialog 记录还没同步到服务端权威库，
    // 这一笔当场投影不了。若此时写下幂等 marker，稍后 CLI 明细同步带着同一个
    // provider call 回来重投会直接撞 marker 返回，dialog.totalCost 永久少一笔。
    const db = new MemoryDB();
    const store = createTestAuthorityStore(db as any);
    mock.module("database-engine/db", () => ({
      getServerAuthorityStore: () => store,
    }));
    const { applyServerDialogProjectionDelta } = await import(
      `./serverDialogProjection.ts?missing-dialog-retry=${Date.now()}`
    );
    mock.restore();

    const projection = {
      userId: "user-1",
      dialogId: "dialog-late",
      inputTokensDelta: 5,
      outputTokensDelta: 1,
      costDelta: 0.5,
      projectionId: "token-user-1-1000-call-late",
    };
    const markerKey = createKey(
      "dialog-token-projection",
      "user-1",
      "dialog-late",
      projection.projectionId,
    );

    // 第一次：dialog 记录还不存在 → 跳过，且不留 marker。
    await applyServerDialogProjectionDelta(projection);
    expect(await db.get(markerKey).catch(() => null)).toBeFalsy();

    // dialog 随 saveTurn 落地后，同一笔重投必须真正加上去。
    const dialogKey = createKey(DataType.DIALOG, "user-1", "dialog-late");
    await db.put(dialogKey, {
      id: "dialog-late",
      userId: "user-1",
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });
    await applyServerDialogProjectionDelta(projection);
    expect(await db.get(dialogKey)).toMatchObject({
      inputTokens: 5,
      outputTokens: 1,
      totalCost: 0.5,
    });

    // 补投之后 marker 就位，第三次不再重复累加。
    await applyServerDialogProjectionDelta(projection);
    expect(await db.get(dialogKey)).toMatchObject({ totalCost: 0.5 });
  });
});
