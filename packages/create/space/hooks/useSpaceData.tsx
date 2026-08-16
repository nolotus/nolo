// useSpaceData.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { read, selectEntities } from "database/dbSlice";
import { createSpaceKey } from "create/space/spaceKeys";
import { createUserKey } from "database/keys";
import { MemberRole, SpaceData } from "app/types";
import { normalizeUserId } from "core/userId";
import { selectCurrentSpace, fetchSpace } from "../spaceSlice";

export interface Member {
  id: string;
  name: string; // 从 userProfile.nickname 获取，或使用 id 作为默认值
  email: string; // 从 userProfile.email 获取，或默认值
  role: MemberRole;
  joinedAt: string;
  avatar?: string; // 从 userProfile.avatar 获取，或默认值
}

interface MemberLookupItem {
  memberId: string;
  normalizedMemberId: string;
  memberKey: string;
  profileKey: string;
}

interface SpaceDataWithMembers extends Omit<SpaceData, "members"> {
  members: Member[]; // 重定义 members 为完整数据
}

const MEMBER_FETCH_CONCURRENCY = 4;

export const useSpaceData = (spaceId: string) => {
  const dispatch = useAppDispatch();
  const currentSpace = useAppSelector(selectCurrentSpace);
  const dbEntities = useAppSelector(selectEntities);
  const [spaceLoading, setSpaceLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const memberFetchInFlightRef = useRef<Set<string>>(new Set());
  const normalizedSpaceId = useMemo(
    () => (spaceId.startsWith("space-") ? spaceId.slice(6) : spaceId),
    [spaceId]
  );

  // 1. Fetch space data into Redux store
  useEffect(() => {
    if (spaceId) {
      setSpaceLoading(true);
      setError(null);
      (dispatch as (action: any) => any)(fetchSpace({ spaceId, fresh: true }))
        .unwrap()
        .catch((err: any) => setError(err as Error))
        .finally(() => setSpaceLoading(false));
    }
  }, [spaceId, dispatch]);

  // Normalize IDs for comparison
  const isCorrectSpace = useMemo(
    () =>
      !!currentSpace &&
      (currentSpace.id === normalizedSpaceId ||
        currentSpace.id === `space-${normalizedSpaceId}` ||
        `space-${currentSpace.id}` === spaceId),
    [currentSpace, normalizedSpaceId, spaceId]
  );

  const memberIdsSignature = useMemo(() => {
    if (!isCorrectSpace || !currentSpace?.members?.length) return "";
    return currentSpace.members.join("|");
  }, [isCorrectSpace, currentSpace?.members]);

  const memberLookupItems = useMemo(() => {
    if (!isCorrectSpace || !currentSpace?.members?.length) return [];
    return currentSpace.members.map((memberId: string) => {
      const normalizedMemberId = normalizeUserId(memberId);
      return {
        memberId,
        normalizedMemberId,
        memberKey: createSpaceKey.member(normalizedMemberId, normalizedSpaceId),
        profileKey: createUserKey.profile(normalizedMemberId),
      };
    });
  }, [isCorrectSpace, memberIdsSignature, currentSpace?.members, normalizedSpaceId]);

  const missingReadKeys = useMemo(() => {
    const missing = new Set<string>();
    memberLookupItems.forEach((item: MemberLookupItem) => {
      if (!dbEntities[item.memberKey]) {
        missing.add(item.memberKey);
      }
      if (!dbEntities[item.profileKey]) {
        missing.add(item.profileKey);
      }
    });
    return Array.from(missing);
  }, [memberLookupItems, dbEntities]);

  const enrichedMembers = useMemo(() => {
    return memberLookupItems.map((item: MemberLookupItem) => {
      const memberData = dbEntities[item.memberKey] as any;
      const userProfile = dbEntities[item.profileKey] as any;
      return {
        id: item.memberId,
        name: userProfile?.nickname || item.memberId,
        email: userProfile?.email || "",
        role: memberData?.role || MemberRole.MEMBER,
        joinedAt: new Date(memberData?.joinedAt || Date.now()).toISOString(),
        avatar: userProfile?.avatar || undefined,
      } as Member;
    });
  }, [memberLookupItems, dbEntities]);

  // 2. Fetch only missing member/profile entities
  useEffect(() => {
    let cancelled = false;

    const fetchMissingMembers = async () => {
      if (!isCorrectSpace) {
        if (!cancelled) setMemberLoading(false);
        return;
      }

      if (missingReadKeys.length === 0) {
        if (!cancelled) setMemberLoading(false);
        return;
      }

      setMemberLoading(true);
      const queue = missingReadKeys.filter(
        (key) => !memberFetchInFlightRef.current.has(key)
      );

      if (queue.length === 0) {
        // 不检查 cancelled：保证 Effect N 的 workers 完成后 in-flight 清零时能被响应
        setMemberLoading(memberFetchInFlightRef.current.size > 0);
        return;
      }

      const workers = Array.from(
        { length: Math.min(MEMBER_FETCH_CONCURRENCY, queue.length) },
        async () => {
          while (queue.length > 0) {
            const key = queue.shift();
            if (!key) continue;
            memberFetchInFlightRef.current.add(key);
            try {
              await (dispatch as any)(read({
                dbKey: key
              })).unwrap();
            } catch {
              // ignore member/profile fetch failures for UI resilience
            } finally {
              memberFetchInFlightRef.current.delete(key);
            }
          }
        }
      );

      await Promise.all(workers);
      // 不检查 cancelled：即使 effect 已被取消，in-flight 归零后必须更新 loading 状态
      // 否则 Effect N+1 在 queue 为空但 in-flight > 0 时提前返回，
      // 而 Effect N 的 workers 完成后无人负责将 memberLoading 重置为 false
      setMemberLoading(memberFetchInFlightRef.current.size > 0);
    };

    void fetchMissingMembers();
    return () => {
      cancelled = true;
    };
  }, [isCorrectSpace, missingReadKeys, dispatch]);

  const spaceDataWithMembers: SpaceDataWithMembers | null = useMemo(
    () => (isCorrectSpace ? { ...currentSpace!, members: enrichedMembers } : null),
    [isCorrectSpace, currentSpace, enrichedMembers]
  );

  return {
    spaceData: spaceDataWithMembers,
    loading: spaceLoading || memberLoading,
    error: spaceDataWithMembers ? null : error,
  };
};
