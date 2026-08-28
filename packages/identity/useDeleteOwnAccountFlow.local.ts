// useDeleteOwnAccountFlow: local edition no-op（无账号可删）。
// cloud edition 委托 auth/hooks/useDeleteOwnAccountFlow。
import { useCallback } from "react";

export const useDeleteOwnAccountFlow = () => ({
  deleteAccount: useCallback(async () => ({}), []),
  // 与 auth/hooks/useDeleteOwnAccountFlow 私有实现的返回字段对齐
  // （公开 local 版为 no-op，无账号可删，故恒为 false）。
  isDeletingAccount: false,
});
export default useDeleteOwnAccountFlow;