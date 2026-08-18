import {
  cleanupCliSessionForDialog,
  formatISO,
  getPrimaryDialogAgentId,
  patch,
  replacePrimaryDialogAgentId,
  selectById
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  getActiveDialogKey
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/dialog/actions/setPrimaryDialogAgentAction.ts
var setPrimaryDialogAgentAction = async (agentId, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const currentDialogKey = getActiveDialogKey();
  if (!currentDialogKey) {
    throw new Error("No current dialog selected");
  }
  if (typeof agentId !== "string") {
    throw new Error("No valid agent ID provided");
  }
  const dialogConfig = selectById(
    state,
    currentDialogKey
  );
  if (!dialogConfig) {
    throw new Error("Dialog configuration not found");
  }
  const currentPrimaryAgentId = getPrimaryDialogAgentId(dialogConfig);
  if (currentPrimaryAgentId && currentPrimaryAgentId !== agentId) {
    await cleanupCliSessionForDialog({ dispatch, getState }, dialogConfig);
  }
  const changes = agentId ? {
    agentMode: "fixed",
    primaryAgentKey: agentId,
    cybots: replacePrimaryDialogAgentId(
      dialogConfig.cybots || [],
      agentId
    ),
    updatedAt: formatISO(/* @__PURE__ */ new Date())
  } : {
    agentMode: "auto",
    primaryAgentKey: void 0,
    cybots: [],
    updatedAt: formatISO(/* @__PURE__ */ new Date())
  };
  return await dispatch(
    patch({
      dbKey: currentDialogKey,
      changes
    })
  ).unwrap();
};
export {
  setPrimaryDialogAgentAction
};
