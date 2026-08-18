import {
  formatISO,
  patch,
  selectById
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  getActiveDialogKey
} from "/public/assets/chunks/chunk-JOOBQBMM.js";

// packages/chat/dialog/actions/setDialogExtraReferencesAction.ts
var setDialogExtraReferencesAction = async (extraReferences, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const currentDialogKey = getActiveDialogKey();
  if (!currentDialogKey) {
    throw new Error("No current dialog selected");
  }
  const dialogConfig = selectById(
    state,
    currentDialogKey
  );
  if (!dialogConfig) {
    throw new Error("Dialog configuration not found");
  }
  return await dispatch(
    patch({
      dbKey: currentDialogKey,
      changes: {
        extraReferences: extraReferences ?? [],
        updatedAt: formatISO(/* @__PURE__ */ new Date())
      }
    })
  ).unwrap();
};

export {
  setDialogExtraReferencesAction
};
