import {
  Mono_default as Mono_default2
} from "/public/assets/chunks/chunk-JO5FS3NY.js";
import "/public/assets/chunks/chunk-XWXIZWZ4.js";
import {
  TITLE
} from "/public/assets/chunks/chunk-G6TY5GOM.js";
import {
  Mono_default as Mono_default3
} from "/public/assets/chunks/chunk-FFWVGYQX.js";
import "/public/assets/chunks/chunk-N7VWNVTL.js";
import {
  Mono_default as Mono_default4
} from "/public/assets/chunks/chunk-PFDNN2TY.js";
import "/public/assets/chunks/chunk-N6CV4ZUQ.js";
import {
  Mono_default
} from "/public/assets/chunks/chunk-DHRR54FN.js";
import "/public/assets/chunks/chunk-D2F5OKD3.js";
import {
  LuAppWindow,
  LuBrain,
  LuLayoutDashboard,
  LuMessageSquare,
  LuVideo,
  LuZap
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/@lobehub/icons/es/Gemini/components/Mono.js
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
var _excluded = ["size", "style"];
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : String(i);
}
function _toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
var Icon = /* @__PURE__ */ (0, import_react.memo)(function(_ref) {
  var _ref$size = _ref.size, size = _ref$size === void 0 ? "1em" : _ref$size, style = _ref.style, rest = _objectWithoutProperties(_ref, _excluded);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", _objectSpread(_objectSpread({
    fill: "currentColor",
    fillRule: "evenodd",
    height: size,
    style: _objectSpread({
      flex: "none",
      lineHeight: 1
    }, style),
    viewBox: "0 0 24 24",
    width: size,
    xmlns: "http://www.w3.org/2000/svg"
  }, rest), {}, {
    children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", {
      children: TITLE
    }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
      d: "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
    })]
  }));
});
var Mono_default5 = Icon;

// node_modules/@lobehub/icons/es/Antigravity/components/Mono.js
var import_react2 = __toESM(require_react());

// node_modules/@lobehub/icons/es/Antigravity/style.js
var TITLE2 = "Antigravity";

// node_modules/@lobehub/icons/es/Antigravity/components/Mono.js
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
function _typeof2(o) {
  "@babel/helpers - typeof";
  return _typeof2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof2(o);
}
var _excluded2 = ["size", "style"];
function ownKeys2(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys2(Object(t), true).forEach(function(r2) {
      _defineProperty2(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys2(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty2(obj, key, value) {
  key = _toPropertyKey2(key);
  if (key in obj) {
    Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey2(t) {
  var i = _toPrimitive2(t, "string");
  return "symbol" == _typeof2(i) ? i : String(i);
}
function _toPrimitive2(t, r) {
  if ("object" != _typeof2(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof2(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _objectWithoutProperties2(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose2(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _objectWithoutPropertiesLoose2(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
var Icon2 = /* @__PURE__ */ (0, import_react2.memo)(function(_ref) {
  var _ref$size = _ref.size, size = _ref$size === void 0 ? "1em" : _ref$size, style = _ref.style, rest = _objectWithoutProperties2(_ref, _excluded2);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("svg", _objectSpread2(_objectSpread2({
    fill: "currentColor",
    fillRule: "evenodd",
    height: size,
    style: _objectSpread2({
      flex: "none",
      lineHeight: 1
    }, style),
    viewBox: "0 0 24 24",
    width: size,
    xmlns: "http://www.w3.org/2000/svg"
  }, rest), {}, {
    children: [/* @__PURE__ */ (0, import_jsx_runtime3.jsx)("title", {
      children: TITLE2
    }), /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", {
      d: "M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z"
    })]
  }));
});
var Mono_default6 = Icon2;

// node_modules/@lobehub/icons/es/Codex/components/Mono.js
var import_react3 = __toESM(require_react());

// node_modules/@lobehub/icons/es/Codex/style.js
var TITLE3 = "Codex";

// node_modules/@lobehub/icons/es/Codex/components/Mono.js
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var import_jsx_runtime6 = __toESM(require_jsx_runtime());
function _typeof3(o) {
  "@babel/helpers - typeof";
  return _typeof3 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof3(o);
}
var _excluded3 = ["size", "style"];
function ownKeys3(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread3(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys3(Object(t), true).forEach(function(r2) {
      _defineProperty3(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys3(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty3(obj, key, value) {
  key = _toPropertyKey3(key);
  if (key in obj) {
    Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey3(t) {
  var i = _toPrimitive3(t, "string");
  return "symbol" == _typeof3(i) ? i : String(i);
}
function _toPrimitive3(t, r) {
  if ("object" != _typeof3(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof3(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _objectWithoutProperties3(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose3(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _objectWithoutPropertiesLoose3(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
var Icon3 = /* @__PURE__ */ (0, import_react3.memo)(function(_ref) {
  var _ref$size = _ref.size, size = _ref$size === void 0 ? "1em" : _ref$size, style = _ref.style, rest = _objectWithoutProperties3(_ref, _excluded3);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("svg", _objectSpread3(_objectSpread3({
    fill: "currentColor",
    fillRule: "evenodd",
    height: size,
    style: _objectSpread3({
      flex: "none",
      lineHeight: 1
    }, style),
    viewBox: "0 0 24 24",
    width: size,
    xmlns: "http://www.w3.org/2000/svg"
  }, rest), {}, {
    children: [/* @__PURE__ */ (0, import_jsx_runtime5.jsx)("title", {
      children: TITLE3
    }), /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", {
      clipRule: "evenodd",
      d: "M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
    })]
  }));
});
var Mono_default7 = Icon3;

// packages/app/pages/WelcomeOrchestrationDiagram.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime());
var DIAGRAM_CONFIGS = {
  coding: {
    viewBox: "0 0 940 360",
    tracks: [
      { d: "M 120 120 C 190 120, 190 180, 260 180" },
      { d: "M 120 240 C 190 240, 190 180, 260 180" },
      { d: "M 260 180 C 330 180, 330 120, 400 120" },
      { d: "M 260 180 C 330 180, 330 240, 400 240" },
      { d: "M 400 120 C 470 120, 470 180, 540 180" },
      { d: "M 400 240 C 470 240, 470 180, 540 180" },
      { d: "M 540 180 L 700 180" },
      { d: "M 700 180 L 840 180" },
      { d: "M 540 160 Q 470 60 400 90", className: "t-reject" },
      { d: "M 540 200 Q 470 300 400 270", className: "t-reject" }
    ],
    packets: [
      { d: "M 120 120 C 190 120, 190 180, 260 180", className: "wf-data-packet p-chat" },
      { d: "M 120 240 C 190 240, 190 180, 260 180", className: "wf-data-packet p-form" },
      { d: "M 260 180 C 330 180, 330 120, 400 120", className: "wf-data-packet p-pm-fe" },
      { d: "M 260 180 C 330 180, 330 240, 400 240", className: "wf-data-packet p-pm-be" },
      { d: "M 400 120 C 470 120, 470 180, 540 180", className: "wf-data-packet p-fe-rev1" },
      { d: "M 400 240 C 470 240, 470 180, 540 180", className: "wf-data-packet p-be-rev1" },
      { d: "M 540 160 Q 470 60 400 90", className: "wf-data-packet p-reject-fe" },
      { d: "M 540 200 Q 470 300 400 270", className: "wf-data-packet p-reject-be" },
      { d: "M 400 120 C 470 120, 470 180, 540 180", className: "wf-data-packet p-fe-rev2" },
      { d: "M 400 240 C 470 240, 470 180, 540 180", className: "wf-data-packet p-be-rev2" },
      { d: "M 540 180 L 700 180", className: "wf-data-packet p-release" },
      { d: "M 700 180 L 840 180", className: "wf-data-packet p-website" }
    ],
    svgLabels: [
      { x: 180, y: 135, textKey: "welcomeSection.showcase.input" },
      { x: 310, y: 130, textKey: "welcomeSection.showcase.dispatch" },
      { x: 460, y: 130, textKey: "welcomeSection.showcase.submit" },
      { x: 610, y: 170, className: "text-pass", textKey: "welcomeSection.showcase.pass" },
      { x: 470, y: 70, className: "text-refactor", textKey: "welcomeSection.showcase.refactor" }
    ],
    nodes: [
      {
        className: "n-start-chat",
        top: "120px",
        left: "120px",
        label: { type: "t", key: "welcomeSection.showcase.chat" },
        icon: "message-square",
        iconSize: 18
      },
      {
        className: "n-start-form",
        top: "240px",
        left: "120px",
        label: { type: "t", key: "welcomeSection.showcase.taskboard" },
        icon: "layout-dashboard",
        iconSize: 18
      },
      {
        className: "n-pm",
        top: "180px",
        left: "260px",
        label: { type: "t", key: "welcomeSection.showcase.pm" },
        icon: "minimax",
        iconSize: 22
      },
      {
        className: "n-fe",
        top: "120px",
        left: "400px",
        label: { type: "t", key: "welcomeSection.showcase.fe" },
        icon: "antigravity",
        iconSize: 22
      },
      {
        className: "n-be",
        top: "240px",
        left: "400px",
        label: { type: "t", key: "welcomeSection.showcase.be" },
        icon: "codex",
        iconSize: 22
      },
      {
        className: "n-rev",
        top: "180px",
        left: "540px",
        label: { type: "t", key: "welcomeSection.showcase.reviewer" },
        icon: "codex",
        iconSize: 22
      },
      {
        className: "n-rel",
        top: "180px",
        left: "700px",
        label: { type: "t", key: "welcomeSection.showcase.release" },
        icon: "zap",
        iconSize: 20
      },
      {
        className: "n-web",
        top: "180px",
        left: "840px",
        label: { type: "t", key: "welcomeSection.showcase.website" },
        icon: "app-window",
        iconSize: 20
      }
    ]
  },
  brainstorm: {
    stageModifier: "brainstorm",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseBrainstorm.question",
    tracks: [
      { d: "M 118 168 C 220 168, 280 98, 337 98" },
      { d: "M 118 168 H 337" },
      { d: "M 118 168 C 220 168, 280 238, 337 238" }
    ],
    packets: [
      { d: "M 118 168 C 220 168, 280 98, 337 98", className: "wf-data-packet p-b-gpt" },
      { d: "M 118 168 H 337", className: "wf-data-packet p-b-grok" },
      { d: "M 118 168 C 220 168, 280 238, 337 238", className: "wf-data-packet p-b-gemini" }
    ],
    packetsClassName: "wf-packets--brainstorm",
    nodes: [
      {
        className: "n-b-orchestrator",
        top: "168px",
        left: "95px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "minimax",
        iconSize: 22
      },
      {
        className: "n-b-gpt",
        top: "98px",
        left: "360px",
        label: { type: "text", value: "GPT" },
        icon: "openai",
        iconSize: 20,
        iconClassName: "is-brand-openai"
      },
      {
        className: "n-b-grok",
        top: "168px",
        left: "360px",
        label: { type: "text", value: "Grok" },
        icon: "grok",
        iconSize: 20,
        iconClassName: "is-brand-grok"
      },
      {
        className: "n-b-gemini",
        top: "238px",
        left: "360px",
        label: { type: "text", value: "Gemini" },
        icon: "gemini",
        iconSize: 20,
        iconClassName: "is-brand-gemini"
      }
    ]
  },
  consensus: {
    stageModifier: "consensus",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseConsensus.question",
    tracks: [
      { d: "M 173 108 C 250 108, 320 150, 367 175" },
      { d: "M 390 131 V 175" },
      { d: "M 607 108 C 530 108, 460 150, 413 175" },
      { d: "M 390 221 V 255" }
    ],
    packets: [
      { d: "M 173 108 C 250 108, 320 150, 367 175", className: "wf-data-packet p-c-gpt" },
      { d: "M 390 131 V 175", className: "wf-data-packet p-c-grok" },
      { d: "M 607 108 C 530 108, 460 150, 413 175", className: "wf-data-packet p-c-gemini" },
      { d: "M 390 221 V 255", className: "wf-data-packet p-c-output" }
    ],
    packetsClassName: "wf-packets--consensus",
    showConsensusOutput: true,
    nodes: [
      {
        className: "n-c-gpt",
        top: "108px",
        left: "150px",
        label: { type: "text", value: "GPT" },
        icon: "openai",
        iconSize: 20,
        iconClassName: "is-brand-openai"
      },
      {
        className: "n-c-grok",
        top: "108px",
        left: "390px",
        label: { type: "text", value: "Grok" },
        icon: "grok",
        iconSize: 20,
        iconClassName: "is-brand-grok"
      },
      {
        className: "n-c-gemini",
        top: "108px",
        left: "630px",
        label: { type: "text", value: "Gemini" },
        icon: "gemini",
        iconSize: 20,
        iconClassName: "is-brand-gemini"
      },
      {
        className: "n-c-brain",
        top: "198px",
        left: "390px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "brain",
        iconSize: 20,
        iconClassName: "is-orchestrator"
      }
    ]
  },
  video: {
    stageModifier: "video",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseVideo.brief",
    tracks: [
      { d: "M 118 158 C 165 158, 185 118, 217 88" },
      { d: "M 118 158 H 402" },
      { d: "M 118 158 C 165 158, 185 198, 287 228" },
      { d: "M 263 88 C 360 88, 430 120, 562 158" },
      { d: "M 448 158 H 562" },
      { d: "M 333 228 C 430 228, 430 188, 562 158" },
      { d: "M 608 158 H 687" }
    ],
    tracksClassName: "wf-tracks--video",
    packets: [
      { d: "M 118 158 C 165 158, 185 118, 217 88", className: "wf-data-packet p-v-script" },
      { d: "M 118 158 H 402", className: "wf-data-packet p-v-storyboard" },
      { d: "M 118 158 C 165 158, 185 198, 287 228", className: "wf-data-packet p-v-visual" },
      { d: "M 263 88 C 360 88, 430 120, 562 158", className: "wf-data-packet p-v-script-edit" },
      { d: "M 448 158 H 562", className: "wf-data-packet p-v-storyboard-edit" },
      { d: "M 333 228 C 430 228, 430 188, 562 158", className: "wf-data-packet p-v-visual-edit" },
      { d: "M 608 158 H 687", className: "wf-data-packet p-v-deliver" }
    ],
    packetsClassName: "wf-packets--video",
    nodes: [
      {
        className: "n-video-orchestrator",
        top: "158px",
        left: "95px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "minimax",
        iconSize: 22
      },
      {
        className: "n-video-script",
        top: "88px",
        left: "240px",
        label: { type: "videoAgent", key: "script" },
        icon: "claude",
        iconSize: 22
      },
      {
        className: "n-video-storyboard",
        top: "158px",
        left: "425px",
        label: { type: "videoAgent", key: "storyboard" },
        icon: "gemini",
        iconSize: 22
      },
      {
        className: "n-video-visual",
        top: "228px",
        left: "310px",
        label: { type: "videoAgent", key: "visual" },
        icon: "openai",
        iconSize: 22
      },
      {
        className: "n-video-editor",
        top: "158px",
        left: "585px",
        label: { type: "videoAgent", key: "editor" },
        icon: "zap",
        iconSize: 20
      },
      {
        className: "n-video-deliver",
        top: "158px",
        left: "710px",
        label: { type: "videoAgent", key: "deliver" },
        icon: "video",
        iconSize: 20,
        iconClassName: "is-deliver"
      }
    ]
  }
};
var resolveNodeLabel = (label, t, videoAgentLabels) => {
  if (label.type === "t") {
    return t(label.key);
  }
  if (label.type === "videoAgent") {
    return videoAgentLabels[label.key];
  }
  return label.value;
};
var DiagramIcon = ({ kind, size }) => {
  switch (kind) {
    case "message-square":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuMessageSquare, { size, "aria-hidden": "true" });
    case "layout-dashboard":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuLayoutDashboard, { size, "aria-hidden": "true" });
    case "brain":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuBrain, { size, "aria-hidden": "true" });
    case "zap":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuZap, { size, "aria-hidden": "true" });
    case "video":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuVideo, { size, "aria-hidden": "true" });
    case "app-window":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuAppWindow, { size, "aria-hidden": "true" });
    case "openai":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default, { size });
    case "claude":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default2, { size });
    case "gemini":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default5, { size });
    case "grok":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default3, { size });
    case "minimax":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default4, { size });
    case "antigravity":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default6, { size });
    case "codex":
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Mono_default7, { size });
    default:
      return null;
  }
};
var parseViewBoxSize = (viewBox) => {
  const [, , width = 780, height = 300] = viewBox.trim().split(/\s+/).map(Number);
  return { width, height };
};
var stageClassName = (modifier) => modifier ? `wf-stage-tech wf-stage-tech--${modifier}` : "wf-stage-tech";
var stageCanvasStyle = (viewBox) => {
  const { width, height } = parseViewBoxSize(viewBox);
  return {
    "--wf-stage-width": `${width}px`,
    "--wf-stage-height": `${height}px`,
    "--wf-stage-aspect": `${width} / ${height}`
  };
};
var nodePositionStyle = (top, left, viewBox) => {
  const { width, height } = parseViewBoxSize(viewBox);
  const topPx = Number.parseFloat(top);
  const leftPx = Number.parseFloat(left);
  return {
    top: `${topPx / height * 100}%`,
    left: `${leftPx / width * 100}%`
  };
};
var ConsensusOutput = ({ labels }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "wf-consensus-output", children: [
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "wf-consensus-pill wf-consensus-pill-primary", children: labels.consensus }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "wf-consensus-pill", children: labels.disagreements }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "wf-consensus-pill", children: labels.nextStep })
] });
var DesktopTracksSvg = ({
  config,
  t
}) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
  "svg",
  {
    className: "wf-svg-lines",
    viewBox: config.viewBox,
    "aria-hidden": config.svgAriaHidden ? true : void 0,
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("g", { className: config.tracksClassName ? `wf-tracks ${config.tracksClassName}` : "wf-tracks", children: config.tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: track.d, className: track.className }, track.d)) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("g", { className: config.packetsClassName ? `wf-packets ${config.packetsClassName}` : "wf-packets", children: config.packets.map((packet) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: packet.d, className: packet.className }, `${packet.className}-${packet.d}`)) }),
      config.svgLabels ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("g", { className: "wf-svg-labels", children: config.svgLabels.map((label) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "text",
        {
          x: label.x,
          y: label.y,
          className: label.className ? `wf-svg-text ${label.className}` : "wf-svg-text",
          children: t(label.textKey)
        },
        `${label.textKey}-${label.x}-${label.y}`
      )) }) : null
    ]
  }
);
var DesktopNodes = ({
  nodes,
  t,
  videoAgentLabels,
  viewBox
}) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: nodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
  "div",
  {
    className: `wf-node-tech ${node.className}`,
    style: nodePositionStyle(node.top, node.left, viewBox),
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "wf-glass-ring" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: `wf-icon-core${node.iconClassName ? ` ${node.iconClassName}` : ""}`, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DiagramIcon, { kind: node.icon, size: node.iconSize ?? 20 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "wf-node-label", children: resolveNodeLabel(node.label, t, videoAgentLabels) })
    ]
  },
  node.className
)) });
var MobileTracksSvg = ({ config }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
  "svg",
  {
    className: "wf-svg-lines wf-svg-lines--mobile",
    viewBox: config.viewBox,
    "aria-hidden": config.svgAriaHidden ?? true,
    preserveAspectRatio: "xMidYMid meet",
    children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("g", { className: config.tracksClassName ? `wf-tracks ${config.tracksClassName}` : "wf-tracks", children: config.tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: track.d, className: track.className }, track.d)) })
  }
);
var MobileNodes = ({
  nodes,
  t,
  videoAgentLabels,
  viewBox
}) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: nodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
  "div",
  {
    className: `wf-node-tech wf-node-tech--mobile ${node.className}`,
    style: nodePositionStyle(node.top, node.left, viewBox),
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: `wf-icon-core${node.iconClassName ? ` ${node.iconClassName}` : ""}`, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DiagramIcon, { kind: node.icon, size: node.iconSize ? Math.max(14, node.iconSize - 6) : 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "wf-node-label", children: resolveNodeLabel(node.label, t, videoAgentLabels) })
    ]
  },
  node.className
)) });
var WelcomeOrchestrationDiagram = ({
  tab,
  t,
  videoAgentLabels,
  consensusOutputLabels
}) => {
  const config = DIAGRAM_CONFIGS[tab];
  const brief = config.briefKey ? t(config.briefKey) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "wf-stage-scroll wf-stage-scroll--desktop", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: stageClassName(config.stageModifier), style: stageCanvasStyle(config.viewBox), children: [
      brief ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "ws-orchestration-brief", children: brief }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DesktopTracksSvg, { config, t }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        DesktopNodes,
        {
          nodes: config.nodes,
          t,
          videoAgentLabels,
          viewBox: config.viewBox
        }
      ),
      config.showConsensusOutput ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ConsensusOutput, { labels: consensusOutputLabels }) : null
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "wf-stage-mobile", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: stageClassName(config.stageModifier), style: stageCanvasStyle(config.viewBox), children: [
      brief ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "ws-orchestration-brief", children: brief }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "wf-stage-mobile-canvas", style: stageCanvasStyle(config.viewBox), children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(MobileTracksSvg, { config }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          MobileNodes,
          {
            nodes: config.nodes,
            t,
            videoAgentLabels,
            viewBox: config.viewBox
          }
        )
      ] }),
      config.showConsensusOutput ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ConsensusOutput, { labels: consensusOutputLabels }) : null
    ] }) })
  ] });
};
export {
  WelcomeOrchestrationDiagram
};
