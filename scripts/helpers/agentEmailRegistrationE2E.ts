import type { EmailRecord } from "../../packages/database/email";
import { extractEmailVerificationArtifacts } from "../../packages/ai/tools/emailTools";
import { isRecord } from "core/isRecord";
import { asTrimmedString } from "core/trimmedString";

type ProvisionIdentityResult = {
  emailAddress: string;
};

type JsonResult = Record<string, unknown>;

type WaitForVerificationEmailDeps = {
  listEmails: (args: {
    ownerId: string;
    mailbox?: "inbox";
    limit?: number;
  }) => Promise<EmailRecord[]>;
  sleep: (ms: number) => Promise<void>;
};

type RunAgentEmailRegistrationE2EDeps = WaitForVerificationEmailDeps & {
  provisionIdentity: (args: {
    agentId: string;
    purpose: string;
  }) => Promise<ProvisionIdentityResult>;
  openSession: (url: string) => Promise<string>;
  typeText: (args: { sessionId: string; selector: string; text: string }) => Promise<void>;
  click: (args: { sessionId: string; selector: string }) => Promise<void>;
  readContent: (args: { sessionId: string; selector: string }) => Promise<string>;
};

type WaitForVerificationEmailOptions = {
  ownerId: string;
  subjectIncludes?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  limit?: number;
};

type RunAgentEmailRegistrationE2EOptions = {
  agentId: string;
  appUrl: string;
  username: string;
  password: string;
  emailPurpose?: string;
  emailSubjectIncludes?: string;
  resultSelector?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;
const DEFAULT_RESULT_SELECTOR = "#result";
const DEFAULT_EMAIL_SUBJECT = "Registration E2E Code";

function includesCaseInsensitive(haystack: string, needle?: string) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function parseJsonObject(text: string): JsonResult | null {
  try {
    const parsed = JSON.parse(text);
    if (isRecord(parsed)) {
      return parsed as JsonResult;
    }
  } catch {}
  return null;
}

function normalizeVerificationArtifacts(
  artifacts: ReturnType<typeof extractEmailVerificationArtifacts>
) {
  const preferredCode =
    artifacts.codes.find((code) => /\d/.test(code)) ||
    artifacts.codes.find((code) => /[A-Z0-9]{4,10}/i.test(code)) ||
    artifacts.primaryCode ||
    null;

  return {
    ...artifacts,
    primaryCode: preferredCode,
  };
}

async function waitForJsonResult(
  deps: Pick<RunAgentEmailRegistrationE2EDeps, "readContent" | "sleep">,
  args: {
    sessionId: string;
    selector: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
    accept: (result: JsonResult) => boolean;
  }
): Promise<JsonResult> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = args.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const text = await deps.readContent({
      sessionId: args.sessionId,
      selector: args.selector,
    });
    const result = parseJsonObject(text);
    if (result && args.accept(result)) {
      return result;
    }
    await deps.sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for page result at ${args.selector}`);
}

export async function waitForVerificationEmail(
  deps: WaitForVerificationEmailDeps,
  options: WaitForVerificationEmailOptions
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const emails = await deps.listEmails({
      ownerId: options.ownerId,
      mailbox: "inbox",
      limit: options.limit ?? 20,
    });

    for (const email of emails) {
      if (!includesCaseInsensitive(asTrimmedString(email.subject), options.subjectIncludes)) {
        continue;
      }
      const artifacts = extractEmailVerificationArtifacts({
        text: email.text,
        html: email.html,
      });
      const normalizedArtifacts = normalizeVerificationArtifacts(artifacts);
      if (normalizedArtifacts.primaryCode || normalizedArtifacts.primaryLink) {
        return { email, artifacts: normalizedArtifacts };
      }
    }

    await deps.sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for verification email for ${options.ownerId}`);
}

export async function runAgentEmailRegistrationE2E(
  deps: RunAgentEmailRegistrationE2EDeps,
  options: RunAgentEmailRegistrationE2EOptions
) {
  const provisioned = await deps.provisionIdentity({
    agentId: options.agentId,
    purpose: options.emailPurpose ?? "registration-e2e",
  });
  const emailAddress = asTrimmedString(provisioned.emailAddress);
  if (!emailAddress) {
    throw new Error("Provisioned identity did not return an email address");
  }

  const sessionId = await deps.openSession(options.appUrl);

  await deps.typeText({
    sessionId,
    selector: 'input[name="email"]',
    text: emailAddress,
  });
  await deps.typeText({
    sessionId,
    selector: 'input[name="username"]',
    text: options.username,
  });
  await deps.typeText({
    sessionId,
    selector: 'input[name="password"]',
    text: options.password,
  });
  await deps.click({
    sessionId,
    selector: '#start-form button[type="submit"]',
  });

  const startResult = await waitForJsonResult(deps, {
    sessionId,
    selector: options.resultSelector ?? DEFAULT_RESULT_SELECTOR,
    timeoutMs: options.timeoutMs,
    pollIntervalMs: options.pollIntervalMs,
    accept: (result) => !!asTrimmedString(result.registrationId) && result.success === true,
  });

  const registrationId = asTrimmedString(startResult.registrationId);
  if (!registrationId) {
    throw new Error("Registration page did not return registrationId");
  }

  const verification = await waitForVerificationEmail(deps, {
    ownerId: options.agentId,
    subjectIncludes: options.emailSubjectIncludes ?? DEFAULT_EMAIL_SUBJECT,
    timeoutMs: options.timeoutMs,
    pollIntervalMs: options.pollIntervalMs,
  });
  const verificationCode = asTrimmedString(verification.artifacts.primaryCode);
  if (!verificationCode) {
    throw new Error("Verification email did not include a usable code");
  }

  await deps.typeText({
    sessionId,
    selector: '#verify-form input[name="code"]',
    text: verificationCode,
  });
  await deps.click({
    sessionId,
    selector: '#verify-form button[type="submit"]',
  });

  const verifyResult = await waitForJsonResult(deps, {
    sessionId,
    selector: options.resultSelector ?? DEFAULT_RESULT_SELECTOR,
    timeoutMs: options.timeoutMs,
    pollIntervalMs: options.pollIntervalMs,
    accept: (result) =>
      result.success === true && asTrimmedString(result.status).toLowerCase() === "verified",
  });

  return {
    agentId: options.agentId,
    emailAddress,
    username: options.username,
    registrationId,
    verificationCode,
    verified: true,
    verificationEmail: verification.email,
    verificationArtifacts: verification.artifacts,
    startResult,
    verifyResult,
  };
}
