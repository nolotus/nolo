import type { DayStats } from "./types";

export function createInitialDayStats(
  userId: string,
  dateKey: string
): DayStats {
  const initial: DayStats = {
    userId,
    period: "day",
    timeKey: dateKey,
    total: {
      count: 0,
      tokens: {
        input: 0,
        output: 0,
      },
      cost: 0,
    },
    models: {},
    providers: {},
  };
  return initial;
}
