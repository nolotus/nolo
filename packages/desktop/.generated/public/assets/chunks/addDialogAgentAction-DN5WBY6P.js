import {
  addDialogAgentIds,
  formatISO,
  patch,
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

// packages/chat/dialog/actions/addDialogAgentAction.ts
var addDialogAgentAction = async (agentIds, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const currentDialogKey = getActiveDialogKey();
  if (!currentDialogKey) {
    throw new Error("No current dialog selected");
  }
  const dialogConfig = selectById(state, currentDialogKey);
  if (!dialogConfig) {
    throw new Error("Dialog configuration not found");
  }
  const idsToAdd = Array.isArray(agentIds) ? agentIds : [agentIds];
  if (idsToAdd.length === 0) {
    throw new Error("No agent IDs provided");
  }
  const validIds = idsToAdd.filter((id) => id && typeof id === "string");
  if (validIds.length === 0) {
    throw new Error("No valid agent IDs provided");
  }
  const updatedAgents = addDialogAgentIds(dialogConfig.cybots || [], validIds);
  const changes = {
    cybots: updatedAgents,
    updatedAt: formatISO(/* @__PURE__ */ new Date())
  };
  const updatedConfig = await dispatch(
    patch({ dbKey: currentDialogKey, changes })
  ).unwrap();
  return updatedConfig;
};
export {
  addDialogAgentAction
};
