// create/space/spaceReset.ts
// Wave E: 原 spaceSlice.resetSpace reducer。逻辑照抄：重置 4 个 module store。
// 调用形态从 dispatch(resetSpace()) 变为 resetSpace()。
import { resetSpaceUiState } from "./spaceUiStore";
import { resetSpaceDialogState } from "./spaceDialogStore";
import { resetSpaceMembershipState } from "./spaceMembershipStore";
import { resetSpaceCurrentState } from "./spaceCurrentStore";

export function resetSpace(): void {
  resetSpaceUiState();
  resetSpaceDialogState();
  resetSpaceMembershipState();
  resetSpaceCurrentState();
}
