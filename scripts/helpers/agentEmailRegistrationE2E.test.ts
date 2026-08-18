import { describe, expect, it } from "bun:test";

import type { EmailRecord } from "../../packages/database/email";

import {
  runAgentEmailRegistrationE2E,
  waitForVerificationEmail,
} from "./agentEmailRegistrationE2E";

function buildEmail(overrides: Partial<EmailRecord> = {}): EmailRecord {
  return {
    dbKey: "email-agent-owner-1",
    type: "email" as any,
    ownerType: "agent",
    ownerId: "agent-owner",
    tenantId: "tenant-1",
    mailbox: "inbox",
    status: "received",
    from: { email: "verify@nolo.chat" },
    to: [{ email: "agent-e2e@nolo.chat" }],
    subject: "Nolo Agent Email Registration E2E Code",
    text: "Your verification code is 482901",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("agentEmailRegistrationE2E helper", () => {
  it("waits for the first matching verification email and extracts the code", async () => {
    let pollCount = 0;

    const result = await waitForVerificationEmail(
      {
        listEmails: async () => {
          pollCount += 1;
          if (pollCount < 3) return [];
          return [
            buildEmail({ subject: "Unrelated message", text: "hello" }),
            buildEmail({ text: "Use verification code 913700 to finish sign-in." }),
          ];
        },
        sleep: async () => {},
      },
      {
        ownerId: "agent-owner",
        subjectIncludes: "Registration E2E Code",
        timeoutMs: 1000,
        pollIntervalMs: 1,
      }
    );

    expect(pollCount).toBe(3);
    expect(result.email.subject).toContain("Registration E2E Code");
    expect(result.artifacts.primaryCode).toBe("913700");
  });

  it("drives the self-hosted page through registration and verification", async () => {
    const operations: string[] = [];
    let readCount = 0;
    let emailPollCount = 0;

    const result = await runAgentEmailRegistrationE2E(
      {
        provisionIdentity: async ({ agentId, purpose }) => {
          operations.push(`provision:${agentId}:${purpose}`);
          return { emailAddress: "agent-e2e@nolo.chat" };
        },
        openSession: async (url) => {
          operations.push(`open:${url}`);
          return "session-1";
        },
        typeText: async ({ selector, text }) => {
          operations.push(`type:${selector}:${text}`);
        },
        click: async ({ selector }) => {
          operations.push(`click:${selector}`);
        },
        readContent: async ({ selector }) => {
          readCount += 1;
          operations.push(`read:${selector}:${readCount}`);
          if (readCount === 1) return "Ready";
          if (readCount === 2) {
            return JSON.stringify({
              success: true,
              registrationId: "reg-123",
              email: "agent-e2e@nolo.chat",
              username: "agent-e2e-user",
            });
          }
          return JSON.stringify({
            success: true,
            status: "verified",
            email: "agent-e2e@nolo.chat",
            username: "agent-e2e-user",
          });
        },
        listEmails: async () => {
          emailPollCount += 1;
          if (emailPollCount < 2) return [];
          return [buildEmail({ text: "Your code is 654321" })];
        },
        sleep: async () => {},
      },
      {
        agentId: "agent-user-1-01TESTAGENT00000000000000",
        appUrl: "https://us.nolo.chat/dev/agent-email-registration-e2e",
        password: "generated-password-123",
        username: "agent-e2e-user",
      }
    );

    expect(result).toMatchObject({
      emailAddress: "agent-e2e@nolo.chat",
      registrationId: "reg-123",
      verificationCode: "654321",
      verified: true,
      username: "agent-e2e-user",
    });
    expect(operations).toEqual([
      "provision:agent-user-1-01TESTAGENT00000000000000:registration-e2e",
      "open:https://us.nolo.chat/dev/agent-email-registration-e2e",
      "type:input[name=\"email\"]:agent-e2e@nolo.chat",
      "type:input[name=\"username\"]:agent-e2e-user",
      "type:input[name=\"password\"]:generated-password-123",
      "click:#start-form button[type=\"submit\"]",
      "read:#result:1",
      "read:#result:2",
      "type:#verify-form input[name=\"code\"]:654321",
      "click:#verify-form button[type=\"submit\"]",
      "read:#result:3",
    ]);
  });
});
