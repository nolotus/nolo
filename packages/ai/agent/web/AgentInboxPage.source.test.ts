import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "AgentInboxPage.tsx"), "utf8");

describe("AgentInboxPage source contract", () => {
  it("loads inbox via listAgentInboxEmails helper", () => {
    expect(source).toContain("listAgentInboxEmails");
    expect(source).toContain("app/email/agentEmailRpc");
    expect(source).toContain("agentId: agentKey");
  });

  it("renders untrusted HTML mail in a sandboxed iframe, not via dangerouslySetInnerHTML", () => {
    expect(source).toContain("sandbox=");
    expect(source).toContain("srcDoc={selectedEmail.html}");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});