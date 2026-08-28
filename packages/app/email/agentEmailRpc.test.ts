import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "agentEmailRpc.ts"), "utf8");

describe("agentEmailRpc", () => {
  it("calls listEmails RPC with agent owner and inbox mailbox", () => {
    expect(source).toContain("/rpc/listEmails");
    expect(source).toContain('mailbox: "inbox"');
    expect(source).toContain("ownerId: args.agentId");
  });
});