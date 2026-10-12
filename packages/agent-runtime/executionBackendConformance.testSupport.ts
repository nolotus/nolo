import { describe, expect, test } from "bun:test";
import type {
  ExecutionBackend,
  ExecutionLease,
  ExecutionRequest,
  ExecutionTicket,
} from "./executionBackend";

/**
 * Reusable lifecycle conformance tests for concrete backend implementations.
 * A provider supplies a fresh backend per test and a Ticket it can satisfy.
 *
 * This suite verifies the observable protocol; it does NOT certify operating
 * system isolation, symlink containment, network restrictions or process
 * cleanup. Each backend needs additional platform-specific adversarial tests.
 */
export function testExecutionBackendConformance(args: {
  name: string;
  createBackend: () => ExecutionBackend;
  ticket: () => ExecutionTicket;
  request: () => ExecutionRequest;
  /** Platform fixture must implement a successful, harmless command/tool. */
}): void {
  describe(`ExecutionBackend conformance: ${args.name}`, () => {
    test("prepare returns a lease bound to the exact Ticket and backend", async () => {
      const backend = args.createBackend();
      const ticket = args.ticket();
      const lease = await backend.prepare(ticket);
      try {
        expect(lease.leaseId.length).toBeGreaterThan(0);
        expect(lease.backendId).toBe(backend.describe().id);
        expect(lease.ticketId).toBe(ticket.ticketId);
        expect(lease.grantId).toBe(ticket.grantId);
        expect(Number.isFinite(lease.createdAt)).toBe(true);
      } finally {
        await backend.release(lease, "completed");
      }
    });

    test("execute emits consistent execution identity and release works", async () => {
      const backend = args.createBackend();
      const lease = await backend.prepare(args.ticket());
      try {
        const events: Array<{ executionId: string }> = [];
        const result = await backend.execute(lease, args.request(), (event) => {
          events.push(event);
        });
        expect(result.executionId.length).toBeGreaterThan(0);
        expect(events.every((event) => event.executionId === result.executionId)).toBe(true);
      } finally {
        await backend.release(lease, "completed");
      }
    });

    test("release is idempotent", async () => {
      const backend = args.createBackend();
      const lease = await backend.prepare(args.ticket());
      await backend.release(lease, "cancelled");
      await backend.release(lease, "cancelled");
    });

    test("rejects tampered lease identity before executing", async () => {
      const backend = args.createBackend();
      const lease = await backend.prepare(args.ticket());
      try {
        const tampered: ExecutionLease = {
          ...lease,
          ticketId: `${lease.ticketId}-forged`,
        };
        await expect(backend.execute(tampered, args.request())).rejects.toThrow();
      } finally {
        await backend.release(lease, "failed");
      }
    });

    test("refuses execute after release", async () => {
      const backend = args.createBackend();
      const lease = await backend.prepare(args.ticket());
      await backend.release(lease, "completed");
      await expect(backend.execute(lease, args.request())).rejects.toThrow();
    });
  });
}
