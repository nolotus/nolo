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
});
