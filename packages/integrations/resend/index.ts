import { parseEnvNumber } from "core/envValue";
import { asOptionalTrimmedString } from "core/optionalString";
import { parseRetryAfterHeaderMs } from "core/retryAfterMs";
import { isRetryableHttpStatus } from "core/retryableHttpStatus";
import { toTrimmedString } from "core/toTrimmedString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { isTransientNetworkError } from "core/transientNetworkError";

export interface ResendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  tag?: string;
}

export interface ResendBatchEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  tag?: string;
}

export interface ResendMarketingRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
}

export interface ResendMarketingBroadcastOptions {
  from?: string;
  segmentId: string;
  recipients: ResendMarketingRecipient[];
  previousRecipientEmails?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  tag?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_BATCH_API_URL = "https://api.resend.com/emails/batch";
const RESEND_CONTACTS_API_URL = "https://api.resend.com/contacts";
const RESEND_BROADCAST_API_URL = "https://api.resend.com/broadcasts";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const MAX_BATCH_SIZE = 100;
const MAX_RECIPIENTS_PER_EMAIL = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const normalizeTag = (tag?: string) => {
  const value = tag?.trim();
  if (!value) return undefined;
  return [{ name: "campaign", value }];
};

const normalizeRecipients = (to: string | string[]) => {
  const recipients = (Array.isArray(to) ? to : [to]).map((item) => toTrimmedString(item));
  if (recipients.length === 0) {
    throw new Error("At least one recipient email address is required");
  }
  if (recipients.length > MAX_RECIPIENTS_PER_EMAIL) {
    throw new Error(`Each email supports up to ${MAX_RECIPIENTS_PER_EMAIL} recipients`);
  }
  for (const recipient of recipients) {
    if (!EMAIL_PATTERN.test(recipient)) {
      throw new Error("Invalid recipient email address");
    }
  }
  return recipients;
};

const parseResponsePayload = async (response: Response) => {
  const payloadText = await response.text();
  if (!payloadText) return {};
  try {
    return JSON.parse(payloadText);
  } catch {
    return { message: payloadText };
  }
};

const getResendErrorMessage = (result: any) =>
  result?.error?.message || result?.message || "Unknown Resend error";

const createTimeoutSignal = (timeoutMs: number) =>
  typeof AbortSignal !== "undefined" &&
  typeof (AbortSignal as any).timeout === "function"
    ? (AbortSignal as any).timeout(timeoutMs)
    : undefined;

const normalizeEmailAddress = (value: string) => {
  const normalized = asTrimmedLowercaseString(value);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Invalid recipient email address");
  }
  return normalized;
};

const isResendErrorStatus = (error: unknown, status: number) =>
  error instanceof Error && error.message.includes(`Resend error (${status})`);

const isResendConflictError = (error: unknown) =>
  isResendErrorStatus(error, 409) ||
  (error instanceof Error && /already exists/i.test(error.message));

const requestResend = async (
  url: string,
  body: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST"
) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined");
  }

  const timeoutMs = parseEnvNumber(
    process.env.RESEND_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1_000
  );
  const maxRetryAttempts = parseEnvNumber(
    process.env.RESEND_MAX_RETRY_ATTEMPTS,
    DEFAULT_MAX_RETRY_ATTEMPTS,
    1
  );
  const retryBaseDelayMs = parseEnvNumber(
    process.env.RESEND_RETRY_BASE_DELAY_MS,
    DEFAULT_RETRY_BASE_DELAY_MS,
    100
  );

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetryAttempts; attempt += 1) {
    try {
      const payload =
        body === undefined || method === "DELETE" ? undefined : JSON.stringify(body);
      const response = await fetch(url, {
        method,
        signal: createTimeoutSignal(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: payload,
      });

      const result = await parseResponsePayload(response);
      if (response.ok) {
        return result;
      }

      const errorMessage = getResendErrorMessage(result);
      const canRetry =
        isRetryableHttpStatus(response.status) && attempt < maxRetryAttempts;
      if (canRetry) {
        const retryAfterMs = parseRetryAfterHeaderMs(
          response.headers.get("retry-after"),
        );
        const backoffMs =
          retryAfterMs ?? retryBaseDelayMs * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
        continue;
      }

      throw new Error(`Resend error (${response.status}): ${errorMessage}`);
    } catch (error: any) {
      lastError = error;
      if (isTransientNetworkError(error) && attempt < maxRetryAttempts) {
        const backoffMs = retryBaseDelayMs * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Resend request failed after retries");
};

export async function sendEmail({
  from,
  to,
  subject,
  textBody,
  htmlBody,
  tag,
}: ResendEmailOptions) {
  const defaultFrom = process.env.RESEND_FROM_EMAIL;
  const recipients = normalizeRecipients(to);

  const sender = from || defaultFrom;
  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is not defined");
  }

  if (!textBody && !htmlBody) {
    throw new Error("Either textBody or htmlBody is required");
  }

  return requestResend(RESEND_API_URL, {
    from: sender,
    to: recipients,
    subject,
    text: textBody,
    html: htmlBody,
    tags: normalizeTag(tag),
  });
}

export async function sendBatchEmails(emails: ResendBatchEmailOptions[]) {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("Batch emails payload is empty");
  }
  if (emails.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch send supports up to ${MAX_BATCH_SIZE} emails per request`);
  }

  const defaultFrom = process.env.RESEND_FROM_EMAIL;
  const batchPayload = emails.map((email) => {
    const sender = email.from || defaultFrom;
    if (!sender) {
      throw new Error("RESEND_FROM_EMAIL is not defined");
    }
    if (!email.textBody && !email.htmlBody) {
      throw new Error("Either textBody or htmlBody is required");
    }

    return {
      from: sender,
      to: normalizeRecipients(email.to),
      subject: email.subject,
      text: email.textBody,
      html: email.htmlBody,
      tags: normalizeTag(email.tag),
    };
  });

  return requestResend(RESEND_BATCH_API_URL, batchPayload);
}

export async function sendMarketingBroadcast({
  from,
  segmentId,
  recipients,
  previousRecipientEmails,
  subject,
  textBody,
  htmlBody,
  tag,
}: ResendMarketingBroadcastOptions) {
  const defaultFrom = process.env.RESEND_FROM_EMAIL;
  const sender = from || defaultFrom;
  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is not defined");
  }

  const normalizedSegmentId = toTrimmedString(segmentId);
  if (!normalizedSegmentId) {
    throw new Error("segmentId is required for marketing broadcast");
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Marketing broadcast recipients payload is empty");
  }
  if (!textBody && !htmlBody) {
    throw new Error("Either textBody or htmlBody is required");
  }

  const uniqueRecipients = new Map<string, ResendMarketingRecipient>();
  for (const recipient of recipients) {
    const email = normalizeEmailAddress(recipient.email);
    if (!uniqueRecipients.has(email)) {
      uniqueRecipients.set(email, { ...recipient, email });
    }
  }

  const encodedSegmentId = encodeURIComponent(normalizedSegmentId);
  const currentEmails = new Set(uniqueRecipients.keys());
  for (const recipient of uniqueRecipients.values()) {
    const contactPayload = {
      email: recipient.email,
      first_name: asOptionalTrimmedString(recipient.firstName),
      last_name: asOptionalTrimmedString(recipient.lastName),
      unsubscribed: Boolean(recipient.unsubscribed),
      segments: [{ id: normalizedSegmentId }],
    };
    try {
      await requestResend(RESEND_CONTACTS_API_URL, contactPayload);
    } catch (error) {
      if (!isResendConflictError(error)) {
        throw error;
      }
      await requestResend(
        `${RESEND_CONTACTS_API_URL}/${encodeURIComponent(recipient.email)}/segments/${encodedSegmentId}`,
        undefined
      );
    }
  }

  const staleRecipients = Array.from(
    new Set(
      (previousRecipientEmails || [])
        .map((value) => asTrimmedLowercaseString(value))
        .filter(Boolean)
    )
  ).filter((email) => !currentEmails.has(email));

  for (const email of staleRecipients) {
    try {
      await requestResend(
        `${RESEND_CONTACTS_API_URL}/${encodeURIComponent(email)}/segments/${encodedSegmentId}`,
        undefined,
        "DELETE"
      );
    } catch (error) {
      if (isResendErrorStatus(error, 404)) {
        continue;
      }
      throw error;
    }
  }

  return requestResend(RESEND_BROADCAST_API_URL, {
    name: tag ? `auto-${asTrimmedLowercaseString(tag)}-${Date.now()}` : undefined,
    segment_id: normalizedSegmentId,
    from: sender,
    subject,
    text: textBody,
    html: htmlBody,
    send: true,
  });
}
