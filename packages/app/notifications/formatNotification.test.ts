import { describe, expect, it } from "bun:test";
import { DataType } from "create/types";
import { notificationRecordToAppNotification } from "./formatNotification";
import type { NotificationRecord } from "./model";

const t = (_key: string, fallback?: string) => fallback ?? "";

describe("notificationRecordToAppNotification", () => {
  it("formats agent notice notifications from payload title and message", () => {
    const record: NotificationRecord = {
      dbKey: "NOTIFICATION-user-a-agent-notice-1",
      type: DataType.NOTIFICATION,
      userId: "user-a",
      notificationId: "agent-notice-1",
      kind: "agent_notice",
      createdAt: 1,
      updatedAt: 1,
      payload: {
        title: "Gemini usage alert",
        message: "Today crossed the threshold.",
      },
    };

    const item = notificationRecordToAppNotification(record, t);

    expect(item.kind).toBe("agent_notice");
    expect(item.title).toBe("Gemini usage alert");
    expect(item.message).toBe("Today crossed the threshold.");
  });
});
