import {
  package_default
} from "/public/assets/chunks/chunk-7OD6ETJB.js";
import {
  selectSvgElement
} from "/public/assets/chunks/chunk-4ZHPTDCF.js";
import {
  parse
} from "/public/assets/chunks/chunk-I5HH3N4P.js";
import "/public/assets/chunks/chunk-GZQMGFRR.js";
import "/public/assets/chunks/chunk-KHX6JFHP.js";
import "/public/assets/chunks/chunk-JVGCXD2N.js";
import "/public/assets/chunks/chunk-R2WXQB5Z.js";
import "/public/assets/chunks/chunk-VY6NPFKO.js";
import {
  __name,
  configureSvgSize,
  log
} from "/public/assets/chunks/chunk-5CK6AOYX.js";
import "/public/assets/chunks/chunk-VSEP5TAO.js";
import "/public/assets/chunks/chunk-TBAVFAKQ.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-PH2N3AL5.mjs
var parser = {
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};
var DEFAULT_INFO_DB = { version: package_default.version };
var getVersion = /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = /* @__PURE__ */ __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
