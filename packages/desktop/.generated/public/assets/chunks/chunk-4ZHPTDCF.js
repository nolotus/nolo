import {
  __name,
  getConfig2,
  select_default
} from "/public/assets/chunks/chunk-5CK6AOYX.js";

// node_modules/mermaid/dist/chunks/mermaid.core/chunk-7B677QYD.mjs
var selectSvgElement = /* @__PURE__ */ __name((id) => {
  const { securityLevel } = getConfig2();
  let root = select_default("body");
  if (securityLevel === "sandbox") {
    const sandboxElement = select_default(`#i${id}`);
    const doc = sandboxElement.node()?.contentDocument ?? document;
    root = select_default(doc.body);
  }
  const svg = root.select(`#${id}`);
  return svg;
}, "selectSvgElement");

export {
  selectSvgElement
};
