import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";

/**
 * 邮件外发的一次性确认凭证（owner 当次确认）。
 *
 * 与 media 计费确认同风格（见 `chat/web/mediaJobs.ts` 的 authorizeMediaJob）：只由确认卡的
 * 点击处理器调用，模型工具永远调不到——签发端点要求 cookie 鉴权 + 同源 Origin + 确认头，
 * 且显式拒绝 Authorization 头；agent 工具一律走 bearer，因此拿不到凭证。
 *
 * 头名与 `packages/server/mediaAllowance.ts` 的 USER_CONFIRMATION_HEADER 保持一致；
 * 前端不 import packages/server（避免把服务端模块拉进浏览器包），沿用 mediaJobs 的字面量做法。
 */
export const EMAIL_OUTBOUND_CONFIRMATION_HEADER = "x-media-user-confirmation";

/** 签发端点：POST /api/email/outbound-authorization → { confirmationToken } */
export const EMAIL_OUTBOUND_AUTHORIZATION_PATH = "/api/email/outbound-authorization";

/** 确认卡持有的 run.input（email_send）形状。 */
export interface EmailOutboundDraftInput {
  agentId?: string;
  fromEmail?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject?: string;
  text?: string;
  html?: string;
}

export interface EmailOutboundAuthorizationPayload {
  agentId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
}

/** 收件人规范化（小写去空白），与服务端绑定摘要的规范化保持一致。 */
const normalizeRecipients = (value?: string[]): string[] =>
  asTrimmedNonEmptyStringArray(value).map((email) => email.toLowerCase());

/**
 * 把确认卡的 run.input 映射成签发请求体：from 用 fromEmail，收件人规范化后原样提交。
 * text/html 只在「模型确实提供了字符串」时带键（含空串）——服务端绑定摘要按
 * `text?: string` 原样入摘要，而 emailSendFunc 透传的就是 args.text，两边必须同为
 * 「带空串的键」或「都不带键」，否则摘要不一致会 403。
 */
export function buildEmailOutboundAuthorizationPayload(
  input: EmailOutboundDraftInput
): EmailOutboundAuthorizationPayload {
  const to = normalizeRecipients(input?.to);
  const cc = normalizeRecipients(input?.cc);
  const bcc = normalizeRecipients(input?.bcc);
  const replyTo = normalizeRecipients(input?.replyTo);
  return {
    agentId: asOptionalTrimmedString(input?.agentId) ?? "",
    from: asOptionalTrimmedString(input?.fromEmail) ?? "",
    to,
    ...(cc.length > 0 ? { cc } : {}),
    ...(bcc.length > 0 ? { bcc } : {}),
    ...(replyTo.length > 0 ? { replyTo } : {}),
    subject: typeof input?.subject === "string" ? input.subject : "",
    ...(typeof input?.text === "string" ? { text: input.text } : {}),
    ...(typeof input?.html === "string" ? { html: input.html } : {}),
  };
}

/**
 * 签发外发确认凭证；失败即抛错（调用方不得在失败时执行发送）。
 * cookie 同源请求，不带 Authorization 头。
 */
export async function authorizeEmailOutbound(
  input: EmailOutboundDraftInput
): Promise<string> {
  const response = await fetch(EMAIL_OUTBOUND_AUTHORIZATION_PATH, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      [EMAIL_OUTBOUND_CONFIRMATION_HEADER]: "1",
    },
    body: JSON.stringify(buildEmailOutboundAuthorizationPayload(input)),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? `邮件外发授权失败（HTTP ${response.status}）`
    );
  }

  const confirmationToken = body?.confirmationToken;
  if (typeof confirmationToken !== "string" || confirmationToken.length === 0) {
    throw new Error("邮件外发授权响应缺少 confirmationToken");
  }
  return confirmationToken;
}
