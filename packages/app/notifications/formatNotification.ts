import { asOptionalFiniteNumber } from "core/optionalNumber";
import type { AppNotification } from "./notificationStore";
import type { NotificationRecord } from "./model";

type TranslateFn = (
  key: string,
  defaultValue?: string,
  options?: Record<string, unknown>
) => string;

export function parseNotificationSseChunk(
  chunk: string
): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const json = trimmed.slice(5).trim();
    if (!json) continue;
    try {
      results.push(JSON.parse(json));
    } catch {
      // Ignore non-JSON SSE control frames.
    }
  }
  return results;
}

export const normalizeNotificationTimestamp = (value: unknown): number => {
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== undefined) return asNumber;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const getSpaceName = (record: NotificationRecord): string => {
  const candidate = record.payload?.spaceName;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return record.spaceId ?? "space";
};

const getDialogTitle = (record: NotificationRecord, t: TranslateFn): string => {
  const candidate = record.payload?.dialogTitle;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return t("notifications.dialogFallbackTitle", "Conversation");
};

export const notificationRecordToAppNotification = (
  record: NotificationRecord,
  t: TranslateFn
): AppNotification => {
  const readAt = record.readAt;
  const base = {
    id: record.notificationId,
    kind: record.kind,
    createdAt: normalizeNotificationTimestamp(record.createdAt),
    updatedAt: normalizeNotificationTimestamp(record.updatedAt),
    read: asOptionalFiniteNumber(readAt) !== undefined,
    href: record.href,
    dialogId: record.dialogId,
    spaceId: record.spaceId,
    record,
  } as const;

  if (record.kind === "space_member_added") {
    const spaceName = getSpaceName(record);
    return {
      ...base,
      title: t("notifications.spaceAddedTitle", "You were added to a space"),
      message: t(
        "notifications.spaceAddedMessage",
        'You were added to "{{spaceName}}"',
        { spaceName }
      ),
    };
  }

  if (record.kind === "agent_notice") {
    const title = record.payload?.title;
    const message = record.payload?.message;
    return {
      ...base,
      title:
        typeof title === "string" && title.trim()
          ? title
          : t("notifications.agentNoticeTitle", "Agent notice"),
      message:
        typeof message === "string" && message.trim()
          ? message
          : t("notifications.agentNoticeMessage", "Your agent sent a notice"),
    };
  }

  const dialogTitle = getDialogTitle(record, t);
  const spaceName =
    typeof record.payload?.spaceName === "string" && record.payload.spaceName.trim()
      ? record.payload.spaceName
      : null;

  if (record.kind === "dialog_failed") {
    return {
      ...base,
      title: t("notifications.dialogFailedTitle", "Agent run failed"),
      message: spaceName
        ? t(
            "notifications.dialogFailedMessageWithSpace",
            '"{{title}}" failed in "{{spaceName}}"',
            { title: dialogTitle, spaceName }
          )
        : t(
            "notifications.dialogFailedMessage",
            '"{{title}}" failed',
            { title: dialogTitle }
          ),
    };
  }

  return {
    ...base,
    title: t("notifications.dialogDoneTitle", "Agent run finished"),
    message: spaceName
      ? t(
          "notifications.dialogDoneMessageWithSpace",
          '"{{title}}" finished in "{{spaceName}}"',
          { title: dialogTitle, spaceName }
        )
      : t(
          "notifications.dialogDoneMessage",
          '"{{title}}" finished',
          { title: dialogTitle }
        ),
  };
};
