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
});
