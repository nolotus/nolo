import { describe, expect, it } from "bun:test";

import { createBillingAdminAuditEvent } from "./billingAdminAuditEvent";
import { writeBillingAdminAuditEvent } from "./billingAdminAuditEventWriter";

describe("writeBillingAdminAuditEvent", () => {
  it("writes audit events append-only", async () => {
    const store = createMemoryStore();
    const event = createBillingAdminAuditEvent({
      eventId: "evt_01",
      actorId: "usage-manager",
      action: "dry_run_viewed",
      anomalyId: "anom_01",
      planId: "plan_01",
      inputSetHash: "sha256:abc",
      createdAt: "2026-05-26T10:00:00.000Z",
    });

    const result = await writeBillingAdminAuditEvent({ store, event });

    expect(result.key).toBe("billing-admin-audit-event-evt_01");
    expect(store.rows.get(result.key)).toEqual(event);
  });

  it("refuses to overwrite an existing audit event", async () => {
    const store = createMemoryStore();
    const event = createBillingAdminAuditEvent({
      eventId: "evt_01",
      actorId: "usage-manager",
      action: "dry_run_viewed",
      anomalyId: "anom_01",
      planId: "plan_01",
      inputSetHash: "sha256:abc",
      createdAt: "2026-05-26T10:00:00.000Z",
    });
    await writeBillingAdminAuditEvent({ store, event });

    await expect(writeBillingAdminAuditEvent({ store, event })).rejects.toThrow(
      "billing admin audit event already exists"
    );
  });
});

function createMemoryStore() {
  const rows = new Map<string, unknown>();
  return {
    rows,
    get: async (key: string) => {
      if (!rows.has(key)) {
        const error = new Error("NotFound") as Error & { code?: string };
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      }
      return rows.get(key);
    },
    put: async (key: string, value: unknown) => {
      rows.set(key, value);
    },
  };
}
