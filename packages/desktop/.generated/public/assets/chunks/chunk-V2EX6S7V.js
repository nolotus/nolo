import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  createUserKey,
  fetchSpace,
  normalizeUserId,
  read,
  selectCurrentSpace,
  selectEntities
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  createSpaceKey
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/hooks/useSpaceData.tsx
var import_react = __toESM(require_react(), 1);
var MEMBER_FETCH_CONCURRENCY = 4;
var useSpaceData = (spaceId) => {
  const dispatch = useAppDispatch();
  const currentSpace = useAppSelector(selectCurrentSpace);
  const dbEntities = useAppSelector(selectEntities);
  const [spaceLoading, setSpaceLoading] = (0, import_react.useState)(true);
  const [memberLoading, setMemberLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const memberFetchInFlightRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const normalizedSpaceId = (0, import_react.useMemo)(
    () => spaceId.startsWith("space-") ? spaceId.slice(6) : spaceId,
    [spaceId]
  );
  (0, import_react.useEffect)(() => {
    if (spaceId) {
      setSpaceLoading(true);
      setError(null);
      dispatch(fetchSpace({ spaceId, fresh: true })).unwrap().catch((err) => setError(err)).finally(() => setSpaceLoading(false));
    }
  }, [spaceId, dispatch]);
  const isCorrectSpace = (0, import_react.useMemo)(
    () => !!currentSpace && (currentSpace.id === normalizedSpaceId || currentSpace.id === `space-${normalizedSpaceId}` || `space-${currentSpace.id}` === spaceId),
    [currentSpace, normalizedSpaceId, spaceId]
  );
  const memberIdsSignature = (0, import_react.useMemo)(() => {
    if (!isCorrectSpace || !currentSpace?.members?.length) return "";
    return currentSpace.members.join("|");
  }, [isCorrectSpace, currentSpace?.members]);
  const memberLookupItems = (0, import_react.useMemo)(() => {
    if (!isCorrectSpace || !currentSpace?.members?.length) return [];
    return currentSpace.members.map((memberId) => {
      const normalizedMemberId = normalizeUserId(memberId);
      return {
        memberId,
        normalizedMemberId,
        memberKey: createSpaceKey.member(normalizedMemberId, normalizedSpaceId),
        profileKey: createUserKey.profile(normalizedMemberId)
      };
    });
  }, [isCorrectSpace, memberIdsSignature, currentSpace?.members, normalizedSpaceId]);
  const missingReadKeys = (0, import_react.useMemo)(() => {
    const missing = /* @__PURE__ */ new Set();
    memberLookupItems.forEach((item) => {
      if (!dbEntities[item.memberKey]) {
        missing.add(item.memberKey);
      }
      if (!dbEntities[item.profileKey]) {
        missing.add(item.profileKey);
      }
    });
    return Array.from(missing);
  }, [memberLookupItems, dbEntities]);
  const enrichedMembers = (0, import_react.useMemo)(() => {
    return memberLookupItems.map((item) => {
      const memberData = dbEntities[item.memberKey];
      const userProfile = dbEntities[item.profileKey];
      return {
        id: item.memberId,
        name: userProfile?.nickname || item.memberId,
        email: userProfile?.email || "",
        role: memberData?.role || "member" /* MEMBER */,
        joinedAt: new Date(memberData?.joinedAt || Date.now()).toISOString(),
        avatar: userProfile?.avatar || void 0
      };
    });
  }, [memberLookupItems, dbEntities]);
  (0, import_react.useEffect)(() => {
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
              await dispatch(read({
                dbKey: key
              })).unwrap();
            } catch {
            } finally {
              memberFetchInFlightRef.current.delete(key);
            }
          }
        }
      );
      await Promise.all(workers);
      setMemberLoading(memberFetchInFlightRef.current.size > 0);
    };
    void fetchMissingMembers();
    return () => {
      cancelled = true;
    };
  }, [isCorrectSpace, missingReadKeys, dispatch]);
  const spaceDataWithMembers = (0, import_react.useMemo)(
    () => isCorrectSpace ? { ...currentSpace, members: enrichedMembers } : null,
    [isCorrectSpace, currentSpace, enrichedMembers]
  );
  return {
    spaceData: spaceDataWithMembers,
    loading: spaceLoading || memberLoading,
    error: spaceDataWithMembers ? null : error
  };
};

export {
  useSpaceData
};
