// useDeleteOwnAccountFlow: local edition no-op（无账号可删）。
// cloud edition 委托 auth/hooks/useDeleteOwnAccountFlow。
import { useCallback } from "react";

export const useDeleteOwnAccountFlow = () => ({
  deleteAccount: useCallback(async () => ({}), []),
  isDeleting: false,
});
export default useDeleteOwnAccountFlow;