export type UserDataLoadDecision = "load" | "skip" | "queue";

export const getUserDataLoadDecision = ({
  loading,
  sameParams,
  forceRefresh,
}: {
  loading: boolean;
  sameParams: boolean;
  forceRefresh?: boolean;
}): UserDataLoadDecision => {
  if (forceRefresh) {
    return loading ? "queue" : "load";
  }

  return loading || sameParams ? "skip" : "load";
};
