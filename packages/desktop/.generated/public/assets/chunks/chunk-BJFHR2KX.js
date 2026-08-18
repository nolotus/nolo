import {
  __name
} from "/public/assets/chunks/chunk-5CK6AOYX.js";

// node_modules/mermaid/dist/chunks/mermaid.core/chunk-XZIHB7SX.mjs
var _a;
var ImperativeState = (_a = class {
  /**
   * @param init - Function that creates the default state.
   */
  constructor(init) {
    this.init = init;
    this.records = this.init();
  }
  reset() {
    this.records = this.init();
  }
}, __name(_a, "ImperativeState"), _a);

export {
  ImperativeState
};
