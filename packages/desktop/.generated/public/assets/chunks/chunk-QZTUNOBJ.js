import {
  __name
} from "/public/assets/chunks/chunk-5CK6AOYX.js";

// node_modules/mermaid/dist/chunks/mermaid.core/chunk-K557N5IZ.mjs
var getSubGraphTitleMargins = /* @__PURE__ */ __name(({
  flowchart
}) => {
  const subGraphTitleTopMargin = flowchart?.subGraphTitleMargin?.top ?? 0;
  const subGraphTitleBottomMargin = flowchart?.subGraphTitleMargin?.bottom ?? 0;
  const subGraphTitleTotalMargin = subGraphTitleTopMargin + subGraphTitleBottomMargin;
  return {
    subGraphTitleTopMargin,
    subGraphTitleBottomMargin,
    subGraphTitleTotalMargin
  };
}, "getSubGraphTitleMargins");

export {
  getSubGraphTitleMargins
};
