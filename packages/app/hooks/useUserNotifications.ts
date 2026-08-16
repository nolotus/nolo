import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { subscribeSharedSse } from "app/realtime/sharedSse";
import { selectRuntimeRemoteServers, selectRuntimeSnapshot } from "app/stateViews/runtime";
import { useAppDispatch, useAppSelector } from "app/store";
import { fetchUserDataThunk } from "database/actions/fetchUserData";
import { cacheMergedUserDataThunk } from "database/actions/cacheMergedUserData";
import { DataType } from "create/types";
import { mergeAndDedupUserData } from "database/userDataMerge";
import {
  NOTIFICATION_LIMIT,
  createNotificationRecord,
  type NotificationEventPayload,
  type NotificationRecord,
} from "app/notifications/model";
import {
  addNotification,
  replaceNotifications,
  useNotificationsHydrated,
} from "app/notifications/notificationStore";
import {
  notificationRecordToAppNotification,
  normalizeNotificationTimestamp,
} from "app/notifications/formatNotification";

const isNotificationRecord = (value: unknown): value is NotificationRecord => {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as NotificationRecord).notificationId === "string" &&
    typeof (value as NotificationRecord).userId === "string" &&
    typeof (value as NotificationRecord).dbKey === "string" &&
    typeof (value as NotificationRecord).kind === "string"
  );
};

const isNotificationEventPayload = (
  value: Record<string, unknown>
): value is NotificationEventPayload & Record<string, unknown> =>
  value.type === "notification.upsert" && isNotificationRecord(value.notification);

const loadRemoteNotifications = async ({
  serverOrigin,
  token,
}: {
  serverOrigin: string;
  token?: string;
}) => {
  const response = await fetch(
    `${serverOrigin}/api/notifications?limit=${NOTIFICATION_LIMIT}`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { data: { data: [] as NotificationRecord[] } };
    }
    throw new Error(`Failed to load notifications from ${serverOrigin}`);
  }
  const json = (await response.json()) as { data?: NotificationRecord[] };
  const data = Array.isArray(json.data)
    ? json.data.map((record) => ({ ...record, serverOrigin }))
    : [];
  return { data: { data } };
};

const buildLegacySpaceMemberRecord = (
  event: Record<string, unknown>
): NotificationRecord | null => {
  const notificationId =
    typeof event.notificationId === "string" ? event.notificationId : null;
  const spaceId = typeof event.spaceId === "string" ? event.spaceId : null;
  const userId =
    typeof event.memberUserId === "string" ? event.memberUserId : null;
  if (!notificationId || !spaceId || !userId) return null;
  const createdAt = normalizeNotificationTimestamp(event.createdAt);
  return createNotificationRecord({
    userId,
    notificationId,
    kind: "space_member_added",
    createdAt,
    updatedAt: createdAt,
    href: `/space/${encodeURIComponent(spaceId)}`,
    spaceId,
    sourceUserId:
      typeof event.addedByUserId === "string" ? event.addedByUserId : undefined,
    payload: {
      role: event.role,
      spaceName:
        typeof event.spaceName === "string" ? event.spaceName : spaceId,
    },
  });
};

// 模块级 in-flight promise：多组件同一 render cycle 并发挂载时，
// hydrated flag 来不及翻 true，用此 promise 让第二个调用复用第一个的请求。
let hydrateInFlight: Promise<void> | null = null;

export function useUserNotifications() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentServer, currentToken, currentUserId } =
    useAppSelector(selectRuntimeSnapshot);
  const remoteServers = useAppSelector(selectRuntimeRemoteServers);
  // 多个组件（TopbarNotificationBell + SidebarUserSection）会各自挂载此 hook，
  // 用 hydrated flag 去重，避免重复远端拉取（3 server × 2 组件 = 6 次请求 → 3 次）。
  const hydrated = useNotificationsHydrated();

  const hydrateNotifications = useCallback(async () => {
    if (!currentUserId) {
      replaceNotifications([]);
      return Promise.resolve();
    }
    // 已 hydrate 过则跳过远端拉取；SSE 实时事件仍会增量更新。
    if (hydrated) return Promise.resolve();
    // 多组件同一 render cycle 并发挂载时，hydrated flag 来不及在首个请求完成前
    // 翻 true，用模块级 in-flight promise 去重：第二个调用复用第一个的 promise。
    if (hydrateInFlight) return hydrateInFlight;

    hydrateInFlight = (async () => {
      const localRecords = (await dispatch(
        fetchUserDataThunk({
          types: DataType.NOTIFICATION,
          userId: currentUserId,
        })
      ).unwrap()) as NotificationRecord[];

    const remoteResults = await Promise.all(
      remoteServers.map((serverOrigin) =>
        loadRemoteNotifications({ serverOrigin, token: currentToken }).catch(
          (error) => {
            console.warn(
              "[notifications] failed to load remote notifications",
              serverOrigin,
              error
            );
            return { data: { data: [] as NotificationRecord[] } };
          }
        )
      )
    );

    const merged = mergeAndDedupUserData(localRecords, remoteResults)
      .filter(isNotificationRecord)
      .sort(
        (left, right) =>
          normalizeNotificationTimestamp(right.updatedAt) -
          normalizeNotificationTimestamp(left.updatedAt)
      )
      .slice(0, NOTIFICATION_LIMIT);

    if (merged.length > 0) {
      await dispatch(
        cacheMergedUserDataThunk({ records: merged as any })
      ).unwrap();
    }

    replaceNotifications(
      merged.map((record) => notificationRecordToAppNotification(record, t as any))
    );
    })().finally(() => {
      hydrateInFlight = null;
    });
  }, [currentToken, currentUserId, dispatch, remoteServers, t, hydrated]);

  useEffect(() => {
    void hydrateNotifications().catch((error) => {
      console.warn("[notifications] failed to hydrate notifications", error);
    });
  }, [hydrateNotifications]);

  useEffect(() => {
    if (!currentUserId || !currentServer) return;

    const channel = `user-${currentUserId}`;
    const dispose = subscribeSharedSse({
      key: `${currentServer}:${channel}`,
      url: `${currentServer}/api/events/${channel}`,
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined,
      onEvent: (event) => {
        let notificationRecord: NotificationRecord | null = null;
        if (isNotificationEventPayload(event)) {
          notificationRecord = event.notification;
        } else if (event.type === "space.member_added") {
          notificationRecord = buildLegacySpaceMemberRecord(event);
        }
        if (!notificationRecord) return;
        void (async () => {
          await dispatch(
            cacheMergedUserDataThunk({ records: [notificationRecord as any] })
          )
            .unwrap()
            .catch((error) => {
              console.warn(
                "[notifications] failed to cache live notification",
                error
              );
            });
          addNotification(
            notificationRecordToAppNotification(notificationRecord, t as any)
          );
        })();
      },
    });

    return () => {
      dispose();
    };
  }, [currentServer, currentToken, currentUserId, dispatch, t]);
}
