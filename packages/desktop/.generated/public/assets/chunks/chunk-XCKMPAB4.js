// packages/share/types.ts
var SHARE_TYPE_LABELS = {
  ["page" /* DOC */]: "\u6587\u7AE0",
  ["dialog" /* DIALOG */]: "\u5BF9\u8BDD",
  ["image" /* IMAGE */]: "\u56FE\u7247",
  cybot: "AI",
  ["app" /* APP */]: "\u5E94\u7528",
  ["table" /* TABLE */]: "\u8868\u683C"
};
var getShareTypeLabel = (type) => SHARE_TYPE_LABELS[type] ?? "\u672A\u77E5";

export {
  getShareTypeLabel
};
