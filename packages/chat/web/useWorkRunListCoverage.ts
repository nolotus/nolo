import { useCallback, useEffect, useState } from "react";
import { useAgentRuns } from "./useAgentRuns";
import {
  isLiveServerRunStatus,
  readWorkRunListCoverage,
  readWorkRunListSnapshot,
  type WorkRunListCoverage,
  type WorkRunListSnapshot,
} from "./workRunListCoverage";

/** 快照多久刷新一次：让「仍在运行」的时间锚点不至于过期。 */
export const WORK_RUN_LIST_REFRESH_MS = 60_000;

/** Uses the *same* response that hydrates run state, not a separate request. */
export function useWorkRunListCoverage(userId: string) {
  const [state, setState] = useState<{
    userId: string;
    value: WorkRunListCoverage;
    snapshot?: WorkRunListSnapshot;
  }>({ userId, value: { status: "loading" } });
  // 切用户立即作废旧状态（A→B→A 快速切换时不能拿回上一轮的旧文案）。
  useEffect(() => {
    setState({ userId, value: { status: "loading" } });
  }, [userId]);
  const onListEvent = useCallback((payload: unknown | null) => {
    if (payload === null) {
      setState({ userId, value: { status: "error" } });
      return;
    }
    const receivedAt = Date.now();
    setState({
      userId,
      value: readWorkRunListCoverage(payload),
      snapshot: readWorkRunListSnapshot(payload, receivedAt, isLiveServerRunStatus),
    });
  }, [userId]);
  const runs = useAgentRuns({ userId }, onListEvent, { refreshIntervalMs: WORK_RUN_LIST_REFRESH_MS });
  // 切用户时旧快照立即作废（coverage 回到 loading），避免跨用户状态污染。
  const mine = state.userId === userId;
  return {
    runs,
    coverage: (mine ? state.value : { status: "loading" }) as WorkRunListCoverage,
    snapshot: mine ? state.snapshot : undefined,
  };
}
