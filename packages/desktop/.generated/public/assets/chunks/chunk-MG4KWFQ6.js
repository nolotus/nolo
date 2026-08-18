import {
  __name
} from "/public/assets/chunks/chunk-5CK6AOYX.js";

// node_modules/mermaid/dist/chunks/mermaid.core/chunk-4BMEZGHF.mjs
function populateCommonDb(ast, db) {
  if (ast.accDescr) {
    db.setAccDescription?.(ast.accDescr);
  }
  if (ast.accTitle) {
    db.setAccTitle?.(ast.accTitle);
  }
  if (ast.title) {
    db.setDiagramTitle?.(ast.title);
  }
}
__name(populateCommonDb, "populateCommonDb");

export {
  populateCommonDb
};
