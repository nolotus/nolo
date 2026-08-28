import type { DataType } from "create/types";

export type EmailOwnerType = "user" | "agent";
export type EmailMailbox = "inbox" | "sent" | "archive" | "trash" | "drafts";
export type EmailStatus =
  | "received"
  | "draft"
  | "queued"
  | "sent"
  | "failed";

export type EmailParticipant = {
  email: string;
  name?: string;
};

export type EmailRecord = {
  dbKey: string;
  type: DataType.EMAIL;
  ownerType: EmailOwnerType;
  ownerId: string;
  tenantId: string;
  spaceId?: string | null;
  mailbox: EmailMailbox;
  status: EmailStatus;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  replyTo?: EmailParticipant[];
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  tags?: string[];
  meta?: Record<string, unknown>;
  createdAt: string | number;
  updatedAt: string | number;
};
