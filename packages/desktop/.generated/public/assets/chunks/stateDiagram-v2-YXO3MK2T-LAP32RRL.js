import {
  StateDB,
  stateDiagram_default,
  stateRenderer_v3_unified_default,
  styles_default
} from "/public/assets/chunks/chunk-OTHGKY7N.js";
import "/public/assets/chunks/chunk-YCPM6HOO.js";
import "/public/assets/chunks/chunk-G7MJPZCV.js";
import "/public/assets/chunks/chunk-2436555J.js";
import "/public/assets/chunks/chunk-4C3NGDWU.js";
import "/public/assets/chunks/chunk-HQOMWVQC.js";
import "/public/assets/chunks/chunk-QZTUNOBJ.js";
import "/public/assets/chunks/chunk-5WY6C33V.js";
import "/public/assets/chunks/chunk-KH2IFGKF.js";
import "/public/assets/chunks/chunk-UXCRBQZP.js";
import "/public/assets/chunks/chunk-7LIPHKCS.js";
import {
  __name
} from "/public/assets/chunks/chunk-5CK6AOYX.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/mermaid/dist/chunks/mermaid.core/stateDiagram-v2-YXO3MK2T.mjs
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
