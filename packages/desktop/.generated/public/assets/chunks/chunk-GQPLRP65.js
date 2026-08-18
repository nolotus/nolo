import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/react-icons/lib/iconBase.mjs
var import_react2 = __toESM(require_react(), 1);

// node_modules/react-icons/lib/iconContext.mjs
var import_react = __toESM(require_react(), 1);
var DefaultContext = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
};
var IconContext = import_react.default.createContext && /* @__PURE__ */ import_react.default.createContext(DefaultContext);

// node_modules/react-icons/lib/iconBase.mjs
var _excluded = ["attr", "size", "title"];
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
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
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
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /* @__PURE__ */ import_react2.default.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return (props) => /* @__PURE__ */ import_react2.default.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = (conf) => {
    var {
      attr,
      size,
      title
    } = props, svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /* @__PURE__ */ import_react2.default.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /* @__PURE__ */ import_react2.default.createElement("title", null, title), props.children);
  };
  return IconContext !== void 0 ? /* @__PURE__ */ import_react2.default.createElement(IconContext.Consumer, null, (conf) => elem(conf)) : elem(DefaultContext);
}

// node_modules/react-icons/lu/index.mjs
function LuActivity(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" }, "child": [] }] })(props);
}
function LuAlarmClock(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "13", "r": "8" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 9v4l2 2" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 3 2 6" }, "child": [] }, { "tag": "path", "attr": { "d": "m22 6-3-3" }, "child": [] }, { "tag": "path", "attr": { "d": "M6.38 18.7 4 21" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.64 18.67 20 21" }, "child": [] }] })(props);
}
function LuAlignCenter(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M17 12H7" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 18H5" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 6H3" }, "child": [] }] })(props);
}
function LuAlignJustify(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 12h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 18h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 6h18" }, "child": [] }] })(props);
}
function LuAlignLeft(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 12H3" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 18H3" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 6H3" }, "child": [] }] })(props);
}
function LuAlignRight(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 12H9" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 18H7" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 6H3" }, "child": [] }] })(props);
}
function LuAppWindow(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "x": "2", "y": "4", "width": "20", "height": "16", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 4v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 8h20" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 4v4" }, "child": [] }] })(props);
}
function LuApple(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 2c1 .5 2 2 2 5" }, "child": [] }] })(props);
}
function LuArchiveRestore(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "5", "x": "2", "y": "3", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 8v11a2 2 0 0 0 2 2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 8v11a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 15 3-3 3 3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 12v9" }, "child": [] }] })(props);
}
function LuArchive(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "5", "x": "2", "y": "3", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 12h4" }, "child": [] }] })(props);
}
function LuArrowDownFromLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19 3H5" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 21V7" }, "child": [] }, { "tag": "path", "attr": { "d": "m6 15 6 6 6-6" }, "child": [] }] })(props);
}
function LuArrowDownToLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 17V3" }, "child": [] }, { "tag": "path", "attr": { "d": "m6 11 6 6 6-6" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 21H5" }, "child": [] }] })(props);
}
function LuArrowDown(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 5v14" }, "child": [] }, { "tag": "path", "attr": { "d": "m19 12-7 7-7-7" }, "child": [] }] })(props);
}
function LuArrowLeftFromLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m9 6-6 6 6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 12h14" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 19V5" }, "child": [] }] })(props);
}
function LuArrowLeft(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m12 19-7-7 7-7" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 12H5" }, "child": [] }] })(props);
}
function LuArrowRightFromLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 5v14" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 12H7" }, "child": [] }, { "tag": "path", "attr": { "d": "m15 18 6-6-6-6" }, "child": [] }] })(props);
}
function LuArrowRight(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M5 12h14" }, "child": [] }, { "tag": "path", "attr": { "d": "m12 5 7 7-7 7" }, "child": [] }] })(props);
}
function LuArrowUpDown(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m21 16-4 4-4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 20V4" }, "child": [] }, { "tag": "path", "attr": { "d": "m3 8 4-4 4 4" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 4v16" }, "child": [] }] })(props);
}
function LuArrowUpFromLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m18 9-6-6-6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 3v14" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 21h14" }, "child": [] }] })(props);
}
function LuArrowUp(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m5 12 7-7 7 7" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 19V5" }, "child": [] }] })(props);
}
function LuAtom(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" }, "child": [] }] })(props);
}
function LuAudioLines(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 10v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 6v11" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 8v7" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 5v13" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 10v3" }, "child": [] }] })(props);
}
function LuAward(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "8", "r": "6" }, "child": [] }] })(props);
}
function LuBadgeCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 12 2 2 4-4" }, "child": [] }] })(props);
}
function LuBadgeDollarSign(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18V6" }, "child": [] }] })(props);
}
function LuBan(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.9 4.9 14.2 14.2" }, "child": [] }] })(props);
}
function LuBanknote(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "12", "x": "2", "y": "6", "rx": "2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 12h.01M18 12h.01" }, "child": [] }] })(props);
}
function LuBatteryCharging(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" }, "child": [] }, { "tag": "path", "attr": { "d": "m11 7-3 5h4l-3 5" }, "child": [] }, { "tag": "line", "attr": { "x1": "22", "x2": "22", "y1": "11", "y2": "13" }, "child": [] }] })(props);
}
function LuBean(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M5.341 10.62a4 4 0 1 0 5.279-5.28" }, "child": [] }] })(props);
}
function LuBell(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }, "child": [] }, { "tag": "path", "attr": { "d": "M10.3 21a1.94 1.94 0 0 0 3.4 0" }, "child": [] }] })(props);
}
function LuBlocks(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "7", "height": "7", "x": "14", "y": "3", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" }, "child": [] }] })(props);
}
function LuBluetooth(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m7 7 10 10-5 5V2l5 5L7 17" }, "child": [] }] })(props);
}
function LuBold(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" }, "child": [] }] })(props);
}
function LuBookOpen(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 7v14" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }, "child": [] }] })(props);
}
function LuBook(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }, "child": [] }] })(props);
}
function LuBookmark(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }, "child": [] }] })(props);
}
function LuBot(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 8V4H8" }, "child": [] }, { "tag": "rect", "attr": { "width": "16", "height": "12", "x": "4", "y": "8", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 14h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 14h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 13v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 13v2" }, "child": [] }] })(props);
}
function LuBox(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }, "child": [] }, { "tag": "path", "attr": { "d": "m3.3 7 8.7 5 8.7-5" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 22V12" }, "child": [] }] })(props);
}
function LuBoxes(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" }, "child": [] }, { "tag": "path", "attr": { "d": "m7 16.5-4.74-2.85" }, "child": [] }, { "tag": "path", "attr": { "d": "m7 16.5 5-3" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 16.5v5.17" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" }, "child": [] }, { "tag": "path", "attr": { "d": "m17 16.5-5-3" }, "child": [] }, { "tag": "path", "attr": { "d": "m17 16.5 4.74-2.85" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 16.5v5.17" }, "child": [] }, { "tag": "path", "attr": { "d": "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8 7.26 5.15" }, "child": [] }, { "tag": "path", "attr": { "d": "m12 8 4.74-2.85" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 13.5V8" }, "child": [] }] })(props);
}
function LuBrain(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.599 6.5a3 3 0 0 0 .399-1.375" }, "child": [] }, { "tag": "path", "attr": { "d": "M6.003 5.125A3 3 0 0 0 6.401 6.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M3.477 10.896a4 4 0 0 1 .585-.396" }, "child": [] }, { "tag": "path", "attr": { "d": "M19.938 10.5a4 4 0 0 1 .585.396" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 18a4 4 0 0 1-1.967-.516" }, "child": [] }, { "tag": "path", "attr": { "d": "M19.967 17.484A4 4 0 0 1 18 18" }, "child": [] }] })(props);
}
function LuBriefcase(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" }, "child": [] }, { "tag": "rect", "attr": { "width": "20", "height": "14", "x": "2", "y": "6", "rx": "2" }, "child": [] }] })(props);
}
function LuBug(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m8 2 1.88 1.88" }, "child": [] }, { "tag": "path", "attr": { "d": "M14.12 3.88 16 2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 20v-9" }, "child": [] }, { "tag": "path", "attr": { "d": "M6.53 9C4.6 8.8 3 7.1 3 5" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 13H2" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 21c0-2.1 1.7-3.9 3.8-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M20.97 5c0 2.1-1.6 3.8-3.5 4" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 13h-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.2 17c2.1.1 3.8 1.9 3.8 4" }, "child": [] }] })(props);
}
function LuCake(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 21h20" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 8v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 8v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 4h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 4h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 4h.01" }, "child": [] }] })(props);
}
function LuCalendarClock(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 10h5" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.5 17.5 16 16.3V14" }, "child": [] }, { "tag": "circle", "attr": { "cx": "16", "cy": "16", "r": "6" }, "child": [] }] })(props);
}
function LuCalendarDays(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M8 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 2v4" }, "child": [] }, { "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "4", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 10h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 14h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 14h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 14h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 18h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 18h.01" }, "child": [] }] })(props);
}
function LuCalendar(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M8 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 2v4" }, "child": [] }, { "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "4", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 10h18" }, "child": [] }] })(props);
}
function LuCamera(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "13", "r": "3" }, "child": [] }] })(props);
}
function LuCar(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "7", "cy": "17", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 17h6" }, "child": [] }, { "tag": "circle", "attr": { "cx": "17", "cy": "17", "r": "2" }, "child": [] }] })(props);
}
function LuChartBar(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 3v16a2 2 0 0 0 2 2h16" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 16h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 11h12" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 6h3" }, "child": [] }] })(props);
}
function LuChartColumnBig(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 3v16a2 2 0 0 0 2 2h16" }, "child": [] }, { "tag": "rect", "attr": { "x": "15", "y": "5", "width": "4", "height": "12", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "x": "7", "y": "8", "width": "4", "height": "9", "rx": "1" }, "child": [] }] })(props);
}
function LuChartLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 3v16a2 2 0 0 0 2 2h16" }, "child": [] }, { "tag": "path", "attr": { "d": "m19 9-5 5-4-4-3 3" }, "child": [] }] })(props);
}
function LuCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 6 9 17l-5-5" }, "child": [] }] })(props);
}
function LuChevronDown(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m6 9 6 6 6-6" }, "child": [] }] })(props);
}
function LuChevronLeft(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m15 18-6-6 6-6" }, "child": [] }] })(props);
}
function LuChevronRight(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m9 18 6-6-6-6" }, "child": [] }] })(props);
}
function LuChevronUp(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m18 15-6-6-6 6" }, "child": [] }] })(props);
}
function LuCircleAlert(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "8", "y2": "12" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12.01", "y1": "16", "y2": "16" }, "child": [] }] })(props);
}
function LuCircleCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 12 2 2 4-4" }, "child": [] }] })(props);
}
function LuCircleDollarSign(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18V6" }, "child": [] }] })(props);
}
function LuCircleHelp(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 17h.01" }, "child": [] }] })(props);
}
function LuCircleUserRound(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M18 20a6 6 0 0 0-12 0" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "10", "r": "4" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }] })(props);
}
function LuCircleUser(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "10", "r": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" }, "child": [] }] })(props);
}
function LuCircleX(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "m15 9-6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 9 6 6" }, "child": [] }] })(props);
}
function LuCircle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }] })(props);
}
function LuClipboardCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "8", "height": "4", "x": "8", "y": "2", "rx": "1", "ry": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 14 2 2 4-4" }, "child": [] }] })(props);
}
function LuClipboardList(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "8", "height": "4", "x": "8", "y": "2", "rx": "1", "ry": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 11h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 11h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 16h.01" }, "child": [] }] })(props);
}
function LuClipboard(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "8", "height": "4", "x": "8", "y": "2", "rx": "1", "ry": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }, "child": [] }] })(props);
}
function LuClock3(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "polyline", "attr": { "points": "12 6 12 12 16.5 12" }, "child": [] }] })(props);
}
function LuClock(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "polyline", "attr": { "points": "12 6 12 12 16 14" }, "child": [] }] })(props);
}
function LuCloudRain(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 14v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 14v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16v6" }, "child": [] }] })(props);
}
function LuCloudSun(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.93 4.93 1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 12h2" }, "child": [] }, { "tag": "path", "attr": { "d": "m19.07 4.93-1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M15.947 12.65a4 4 0 0 0-5.925-4.128" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" }, "child": [] }] })(props);
}
function LuCloudUpload(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 13v8" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 17 4-4 4 4" }, "child": [] }] })(props);
}
function LuCloud(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }, "child": [] }] })(props);
}
function LuClover(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16.17 7.83 2 22" }, "child": [] }, { "tag": "path", "attr": { "d": "M4.02 12a2.827 2.827 0 1 1 3.81-4.17A2.827 2.827 0 1 1 12 4.02a2.827 2.827 0 1 1 4.17 3.81A2.827 2.827 0 1 1 19.98 12a2.827 2.827 0 1 1-3.81 4.17A2.827 2.827 0 1 1 12 19.98a2.827 2.827 0 1 1-4.17-3.81A1 1 0 1 1 4 12" }, "child": [] }, { "tag": "path", "attr": { "d": "m7.83 7.83 8.34 8.34" }, "child": [] }] })(props);
}
function LuCode(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "16 18 22 12 16 6" }, "child": [] }, { "tag": "polyline", "attr": { "points": "8 6 2 12 8 18" }, "child": [] }] })(props);
}
function LuCoffee(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 2v2" }, "child": [] }] })(props);
}
function LuCoins(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "8", "cy": "8", "r": "6" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.09 10.37A6 6 0 1 1 10.34 18" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 6h1v4" }, "child": [] }, { "tag": "path", "attr": { "d": "m16.71 13.88.7.71-2.82 2.82" }, "child": [] }] })(props);
}
function LuColumns3(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 3v18" }, "child": [] }] })(props);
}
function LuCommand(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" }, "child": [] }] })(props);
}
function LuCompass(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }] })(props);
}
function LuConstruction(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "x": "2", "y": "6", "width": "20", "height": "8", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 14v7" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 14v7" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 3v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 3v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 14 2.3 6.3" }, "child": [] }, { "tag": "path", "attr": { "d": "m14 6 7.7 7.7" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 6 8 8" }, "child": [] }] })(props);
}
function LuContact(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 2v2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "11", "r": "3" }, "child": [] }, { "tag": "rect", "attr": { "x": "3", "y": "4", "width": "18", "height": "18", "rx": "2" }, "child": [] }] })(props);
}
function LuCopy(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "14", "height": "14", "x": "8", "y": "8", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }, "child": [] }] })(props);
}
function LuCornerDownLeft(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "9 10 4 15 9 20" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 4v7a4 4 0 0 1-4 4H4" }, "child": [] }] })(props);
}
function LuCpu(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "16", "height": "16", "x": "4", "y": "4", "rx": "2" }, "child": [] }, { "tag": "rect", "attr": { "width": "6", "height": "6", "x": "9", "y": "9", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 20v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 15h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 9h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 15h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 9h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 20v2" }, "child": [] }] })(props);
}
function LuCreditCard(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "14", "x": "2", "y": "5", "rx": "2" }, "child": [] }, { "tag": "line", "attr": { "x1": "2", "x2": "22", "y1": "10", "y2": "10" }, "child": [] }] })(props);
}
function LuCrown(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 21h14" }, "child": [] }] })(props);
}
function LuDatabase(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "ellipse", "attr": { "cx": "12", "cy": "5", "rx": "9", "ry": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 5V19A9 3 0 0 0 21 19V5" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 12A9 3 0 0 0 21 12" }, "child": [] }] })(props);
}
function LuDelete(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" }, "child": [] }, { "tag": "path", "attr": { "d": "m12 9 6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "m18 9-6 6" }, "child": [] }] })(props);
}
function LuDiamond(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" }, "child": [] }] })(props);
}
function LuDot(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12.1", "cy": "12.1", "r": "1" }, "child": [] }] })(props);
}
function LuDownload(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }, "child": [] }, { "tag": "polyline", "attr": { "points": "7 10 12 15 17 10" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "15", "y2": "3" }, "child": [] }] })(props);
}
function LuDroplets(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" }, "child": [] }] })(props);
}
function LuDumbbell(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14.4 14.4 9.6 9.6" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" }, "child": [] }, { "tag": "path", "attr": { "d": "m21.5 21.5-1.4-1.4" }, "child": [] }, { "tag": "path", "attr": { "d": "M3.9 3.9 2.5 2.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" }, "child": [] }] })(props);
}
function LuEarth(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21.54 15H17a2 2 0 0 0-2 2v4.54" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }] })(props);
}
function LuEllipsisVertical(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "5", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "19", "r": "1" }, "child": [] }] })(props);
}
function LuEllipsis(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "19", "cy": "12", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "5", "cy": "12", "r": "1" }, "child": [] }] })(props);
}
function LuEraser(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 21H7" }, "child": [] }, { "tag": "path", "attr": { "d": "m5 11 9 9" }, "child": [] }] })(props);
}
function LuExternalLink(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 3h6v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 14 21 3" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }, "child": [] }] })(props);
}
function LuEyeOff(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" }, "child": [] }, { "tag": "path", "attr": { "d": "M14.084 14.158a3 3 0 0 1-4.242-4.242" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" }, "child": [] }, { "tag": "path", "attr": { "d": "m2 2 20 20" }, "child": [] }] })(props);
}
function LuEye(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "3" }, "child": [] }] })(props);
}
function LuFileArchive(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 12v-1" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 18v-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 7V6" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 .274 1.01" }, "child": [] }, { "tag": "circle", "attr": { "cx": "10", "cy": "20", "r": "2" }, "child": [] }] })(props);
}
function LuFileCode2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "m5 12-3 3 3 3" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 18 3-3-3-3" }, "child": [] }] })(props);
}
function LuFileCode(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 12.5 8 15l2 2.5" }, "child": [] }, { "tag": "path", "attr": { "d": "m14 12.5 2 2.5-2 2.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }, "child": [] }] })(props);
}
function LuFileDiff(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 10h6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 13V7" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 17h6" }, "child": [] }] })(props);
}
function LuFileImage(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "circle", "attr": { "cx": "10", "cy": "12", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" }, "child": [] }] })(props);
}
function LuFileSpreadsheet(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 13h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 13h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 17h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 17h2" }, "child": [] }] })(props);
}
function LuFileText(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 9H8" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 13H8" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 17H8" }, "child": [] }] })(props);
}
function LuFileType(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 13v-1h6v1" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 12v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 18h2" }, "child": [] }] })(props);
}
function LuFileWarning(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 9v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 17h.01" }, "child": [] }] })(props);
}
function LuFile(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 2v4a2 2 0 0 0 2 2h4" }, "child": [] }] })(props);
}
function LuFilm(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 7.5h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 12h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 16.5h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 7.5h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 16.5h4" }, "child": [] }] })(props);
}
function LuFilter(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polygon", "attr": { "points": "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }, "child": [] }] })(props);
}
function LuFingerprint(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 13.12c0 2.38 0 6.38-1 8.88" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.29 21.02c.12-.6.43-2.3.5-3.02" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 12a10 10 0 0 1 18-6" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 16h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M21.8 16c.2-2 .131-5.354 0-6" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M8.65 22c.21-.66.45-1.32.57-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 6.8a6 6 0 0 1 9 5.2v2" }, "child": [] }] })(props);
}
function LuFlag(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" }, "child": [] }, { "tag": "line", "attr": { "x1": "4", "x2": "4", "y1": "22", "y2": "15" }, "child": [] }] })(props);
}
function LuFlame(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" }, "child": [] }] })(props);
}
function LuFlaskConical(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" }, "child": [] }, { "tag": "path", "attr": { "d": "M8.5 2h7" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 16h10" }, "child": [] }] })(props);
}
function LuFlower2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "8", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 10v12" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" }, "child": [] }] })(props);
}
function LuFlower(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 7.5V9" }, "child": [] }, { "tag": "path", "attr": { "d": "M7.5 12H9" }, "child": [] }, { "tag": "path", "attr": { "d": "M16.5 12H15" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16.5V15" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 8 1.88 1.88" }, "child": [] }, { "tag": "path", "attr": { "d": "M14.12 9.88 16 8" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 16 1.88-1.88" }, "child": [] }, { "tag": "path", "attr": { "d": "M14.12 14.12 16 16" }, "child": [] }] })(props);
}
function LuFolderKanban(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 10v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 10v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 10v6" }, "child": [] }] })(props);
}
function LuFolderOpen(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" }, "child": [] }] })(props);
}
function LuFolderOutput(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 7.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-1.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 13h10" }, "child": [] }, { "tag": "path", "attr": { "d": "m5 10-3 3 3 3" }, "child": [] }] })(props);
}
function LuFolderPlus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 10v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 13h6" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }, "child": [] }] })(props);
}
function LuFolderSymlink(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 16 3-3-3-3" }, "child": [] }] })(props);
}
function LuFolder(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }, "child": [] }] })(props);
}
function LuGamepad2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "6", "x2": "10", "y1": "11", "y2": "11" }, "child": [] }, { "tag": "line", "attr": { "x1": "8", "x2": "8", "y1": "9", "y2": "13" }, "child": [] }, { "tag": "line", "attr": { "x1": "15", "x2": "15.01", "y1": "12", "y2": "12" }, "child": [] }, { "tag": "line", "attr": { "x1": "18", "x2": "18.01", "y1": "10", "y2": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" }, "child": [] }] })(props);
}
function LuGauge(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m12 14 4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M3.34 19a10 10 0 1 1 17.32 0" }, "child": [] }] })(props);
}
function LuGem(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 3h12l4 6-10 13L2 9Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 3 8 9l4 13 4-13-3-6" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 9h20" }, "child": [] }] })(props);
}
function LuGift(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "x": "3", "y": "8", "width": "18", "height": "4", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8v13" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" }, "child": [] }, { "tag": "path", "attr": { "d": "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" }, "child": [] }] })(props);
}
function LuGitBranch(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "6", "x2": "6", "y1": "3", "y2": "15" }, "child": [] }, { "tag": "circle", "attr": { "cx": "18", "cy": "6", "r": "3" }, "child": [] }, { "tag": "circle", "attr": { "cx": "6", "cy": "18", "r": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 9a9 9 0 0 1-9 9" }, "child": [] }] })(props);
}
function LuGlobe(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 12h20" }, "child": [] }] })(props);
}
function LuGraduationCap(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 10v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }, "child": [] }] })(props);
}
function LuGrid2X2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 12h18" }, "child": [] }, { "tag": "rect", "attr": { "x": "3", "y": "3", "width": "18", "height": "18", "rx": "2" }, "child": [] }] })(props);
}
function LuGripVertical(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "9", "cy": "12", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "5", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "19", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "15", "cy": "12", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "15", "cy": "5", "r": "1" }, "child": [] }, { "tag": "circle", "attr": { "cx": "15", "cy": "19", "r": "1" }, "child": [] }] })(props);
}
function LuHammer(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" }, "child": [] }, { "tag": "path", "attr": { "d": "m18 15 4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" }, "child": [] }] })(props);
}
function LuHandshake(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m11 17 2 2a1 1 0 1 0 3-3" }, "child": [] }, { "tag": "path", "attr": { "d": "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" }, "child": [] }, { "tag": "path", "attr": { "d": "m21 3 1 11h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 4h8" }, "child": [] }] })(props);
}
function LuHardDrive(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "22", "x2": "2", "y1": "12", "y2": "12" }, "child": [] }, { "tag": "path", "attr": { "d": "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" }, "child": [] }, { "tag": "line", "attr": { "x1": "6", "x2": "6.01", "y1": "16", "y2": "16" }, "child": [] }, { "tag": "line", "attr": { "x1": "10", "x2": "10.01", "y1": "16", "y2": "16" }, "child": [] }] })(props);
}
function LuHash(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "4", "x2": "20", "y1": "9", "y2": "9" }, "child": [] }, { "tag": "line", "attr": { "x1": "4", "x2": "20", "y1": "15", "y2": "15" }, "child": [] }, { "tag": "line", "attr": { "x1": "10", "x2": "8", "y1": "3", "y2": "21" }, "child": [] }, { "tag": "line", "attr": { "x1": "16", "x2": "14", "y1": "3", "y2": "21" }, "child": [] }] })(props);
}
function LuHeading1(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 12h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 18V6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18V6" }, "child": [] }, { "tag": "path", "attr": { "d": "m17 12 3-2v8" }, "child": [] }] })(props);
}
function LuHeading2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 12h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 18V6" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18V6" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" }, "child": [] }] })(props);
}
function LuHeading(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 12h12" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 20V4" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 20V4" }, "child": [] }] })(props);
}
function LuHeadphones(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" }, "child": [] }] })(props);
}
function LuHeart(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" }, "child": [] }] })(props);
}
function LuHistory(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 3v5h5" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 7v5l4 2" }, "child": [] }] })(props);
}
function LuHospital(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 6v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 14h-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 18h-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 8h-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" }, "child": [] }] })(props);
}
function LuHouse(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }, "child": [] }] })(props);
}
function LuImagePlus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 5h6" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 2v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }, "child": [] }, { "tag": "path", "attr": { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "9", "r": "2" }, "child": [] }] })(props);
}
function LuImage(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "9", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }, "child": [] }] })(props);
}
function LuInbox(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "22 12 16 12 14 15 10 15 8 12 2 12" }, "child": [] }, { "tag": "path", "attr": { "d": "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" }, "child": [] }] })(props);
}
function LuInfo(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16v-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8h.01" }, "child": [] }] })(props);
}
function LuItalic(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "19", "x2": "10", "y1": "4", "y2": "4" }, "child": [] }, { "tag": "line", "attr": { "x1": "14", "x2": "5", "y1": "20", "y2": "20" }, "child": [] }, { "tag": "line", "attr": { "x1": "15", "x2": "9", "y1": "4", "y2": "20" }, "child": [] }] })(props);
}
function LuKanban(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 5v11" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 5v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 5v14" }, "child": [] }] })(props);
}
function LuKeyRound(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "16.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }, "child": [] }] })(props);
}
function LuKey(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" }, "child": [] }, { "tag": "path", "attr": { "d": "m21 2-9.6 9.6" }, "child": [] }, { "tag": "circle", "attr": { "cx": "7.5", "cy": "15.5", "r": "5.5" }, "child": [] }] })(props);
}
function LuLanguages(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m5 8 6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "m4 14 6-6 2-3" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 5h12" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 2h1" }, "child": [] }, { "tag": "path", "attr": { "d": "m22 22-5-10-5 10" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 18h6" }, "child": [] }] })(props);
}
function LuLaptop(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" }, "child": [] }] })(props);
}
function LuLayers(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" }, "child": [] }, { "tag": "path", "attr": { "d": "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" }, "child": [] }, { "tag": "path", "attr": { "d": "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" }, "child": [] }] })(props);
}
function LuLayoutDashboard(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "7", "height": "9", "x": "3", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "5", "x": "14", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "9", "x": "14", "y": "12", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "5", "x": "3", "y": "16", "rx": "1" }, "child": [] }] })(props);
}
function LuLayoutGrid(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "7", "height": "7", "x": "3", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "7", "x": "14", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "7", "x": "14", "y": "14", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "7", "height": "7", "x": "3", "y": "14", "rx": "1" }, "child": [] }] })(props);
}
function LuLeaf(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }, "child": [] }] })(props);
}
function LuLibrary(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m16 6 4 14" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 6v14" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 8v12" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 4v16" }, "child": [] }] })(props);
}
function LuLightbulb(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 18h6" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 22h4" }, "child": [] }] })(props);
}
function LuLink2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M9 17H7A5 5 0 0 1 7 7h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 7h2a5 5 0 1 1 0 10h-2" }, "child": [] }, { "tag": "line", "attr": { "x1": "8", "x2": "16", "y1": "12", "y2": "12" }, "child": [] }] })(props);
}
function LuLink(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }, "child": [] }] })(props);
}
function LuListOrdered(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 12h11" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 18h11" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 6h11" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 10h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 6h1v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" }, "child": [] }] })(props);
}
function LuListTodo(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "x": "3", "y": "5", "width": "6", "height": "6", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "m3 17 2 2 4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 6h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 12h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 18h8" }, "child": [] }] })(props);
}
function LuList(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 12h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 18h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 6h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 12h13" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 18h13" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 6h13" }, "child": [] }] })(props);
}
function LuLoaderCircle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 12a9 9 0 1 1-6.219-8.56" }, "child": [] }] })(props);
}
function LuLoader(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "m16.2 7.8 2.9-2.9" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 12h4" }, "child": [] }, { "tag": "path", "attr": { "d": "m16.2 16.2 2.9 2.9" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18v4" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.9 19.1 2.9-2.9" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 12h4" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.9 4.9 2.9 2.9" }, "child": [] }] })(props);
}
function LuLockKeyhole(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "16", "r": "1" }, "child": [] }, { "tag": "rect", "attr": { "x": "3", "y": "10", "width": "18", "height": "12", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 10V7a5 5 0 0 1 10 0v3" }, "child": [] }] })(props);
}
function LuLock(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "11", "x": "3", "y": "11", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 11V7a5 5 0 0 1 10 0v4" }, "child": [] }] })(props);
}
function LuLogIn(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" }, "child": [] }, { "tag": "polyline", "attr": { "points": "10 17 15 12 10 7" }, "child": [] }, { "tag": "line", "attr": { "x1": "15", "x2": "3", "y1": "12", "y2": "12" }, "child": [] }] })(props);
}
function LuLogOut(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }, "child": [] }, { "tag": "polyline", "attr": { "points": "16 17 21 12 16 7" }, "child": [] }, { "tag": "line", "attr": { "x1": "21", "x2": "9", "y1": "12", "y2": "12" }, "child": [] }] })(props);
}
function LuMail(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "16", "x": "2", "y": "4", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }, "child": [] }] })(props);
}
function LuMapPin(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "10", "r": "3" }, "child": [] }] })(props);
}
function LuMap(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 5.764v15" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 3.236v15" }, "child": [] }] })(props);
}
function LuMaximize2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "15 3 21 3 21 9" }, "child": [] }, { "tag": "polyline", "attr": { "points": "9 21 3 21 3 15" }, "child": [] }, { "tag": "line", "attr": { "x1": "21", "x2": "14", "y1": "3", "y2": "10" }, "child": [] }, { "tag": "line", "attr": { "x1": "3", "x2": "10", "y1": "21", "y2": "14" }, "child": [] }] })(props);
}
function LuMedal(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 12 5.12 2.2" }, "child": [] }, { "tag": "path", "attr": { "d": "m13 12 5.88-9.8" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 7h8" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "17", "r": "5" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18v-2h-.5" }, "child": [] }] })(props);
}
function LuMegaphone(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m3 11 18-5v12L3 14v-3z" }, "child": [] }, { "tag": "path", "attr": { "d": "M11.6 16.8a3 3 0 1 1-5.8-1.6" }, "child": [] }] })(props);
}
function LuMessageCircle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }, "child": [] }] })(props);
}
function LuMessageSquareMore(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 10h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 10h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 10h.01" }, "child": [] }] })(props);
}
function LuMessageSquarePlus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 7v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 10h6" }, "child": [] }] })(props);
}
function LuMessageSquare(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }, "child": [] }] })(props);
}
function LuMessagesSquare(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" }, "child": [] }] })(props);
}
function LuMicOff(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "2", "x2": "22", "y1": "2", "y2": "22" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 10v2a7 7 0 0 0 12 5" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 9.34V5a3 3 0 0 0-5.68-1.33" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 9v3a3 3 0 0 0 5.12 2.12" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "19", "y2": "22" }, "child": [] }] })(props);
}
function LuMic(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 10v2a7 7 0 0 1-14 0v-2" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "19", "y2": "22" }, "child": [] }] })(props);
}
function LuMinus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M5 12h14" }, "child": [] }] })(props);
}
function LuMonitor(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "14", "x": "2", "y": "3", "rx": "2" }, "child": [] }, { "tag": "line", "attr": { "x1": "8", "x2": "16", "y1": "21", "y2": "21" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "17", "y2": "21" }, "child": [] }] })(props);
}
function LuMoon(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }, "child": [] }] })(props);
}
function LuMountain(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m8 3 4 8 5-5 5 15H2L8 3z" }, "child": [] }] })(props);
}
function LuMousePointer2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" }, "child": [] }] })(props);
}
function LuMousePointerClick(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14 4.1 12 6" }, "child": [] }, { "tag": "path", "attr": { "d": "m5.1 8-2.9-.8" }, "child": [] }, { "tag": "path", "attr": { "d": "m6 12-1.9 2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7.2 2.2 8 5.1" }, "child": [] }, { "tag": "path", "attr": { "d": "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" }, "child": [] }] })(props);
}
function LuMusic(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M9 18V5l12-2v13" }, "child": [] }, { "tag": "circle", "attr": { "cx": "6", "cy": "18", "r": "3" }, "child": [] }, { "tag": "circle", "attr": { "cx": "18", "cy": "16", "r": "3" }, "child": [] }] })(props);
}
function LuNetwork(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "x": "16", "y": "16", "width": "6", "height": "6", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "x": "2", "y": "16", "width": "6", "height": "6", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "x": "9", "y": "2", "width": "6", "height": "6", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 12V8" }, "child": [] }] })(props);
}
function LuNewspaper(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 14h-8" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 18h-5" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 6h8v4h-8V6Z" }, "child": [] }] })(props);
}
function LuNotebook(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 6h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 10h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 14h4" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 18h4" }, "child": [] }, { "tag": "rect", "attr": { "width": "16", "height": "20", "x": "4", "y": "2", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 2v20" }, "child": [] }] })(props);
}
function LuOctagonAlert(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 16h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z" }, "child": [] }] })(props);
}
function LuOption(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 3h6l6 18h6" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 3h7" }, "child": [] }] })(props);
}
function LuPackage(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 22V12" }, "child": [] }, { "tag": "path", "attr": { "d": "m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" }, "child": [] }, { "tag": "path", "attr": { "d": "m7.5 4.27 9 5.15" }, "child": [] }] })(props);
}
function LuPaintbrush(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m14.622 17.897-10.68-2.913" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15" }, "child": [] }] })(props);
}
function LuPalette(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "13.5", "cy": "6.5", "r": ".5", "fill": "currentColor" }, "child": [] }, { "tag": "circle", "attr": { "cx": "17.5", "cy": "10.5", "r": ".5", "fill": "currentColor" }, "child": [] }, { "tag": "circle", "attr": { "cx": "8.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }, "child": [] }, { "tag": "circle", "attr": { "cx": "6.5", "cy": "12.5", "r": ".5", "fill": "currentColor" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" }, "child": [] }] })(props);
}
function LuPanelLeftClose(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "m16 15-3-3 3-3" }, "child": [] }] })(props);
}
function LuPanelLeftOpen(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 3v18" }, "child": [] }, { "tag": "path", "attr": { "d": "m14 9 3 3-3 3" }, "child": [] }] })(props);
}
function LuPaperclip(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" }, "child": [] }] })(props);
}
function LuPenTool(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" }, "child": [] }, { "tag": "path", "attr": { "d": "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" }, "child": [] }, { "tag": "path", "attr": { "d": "m2.3 2.3 7.286 7.286" }, "child": [] }, { "tag": "circle", "attr": { "cx": "11", "cy": "11", "r": "2" }, "child": [] }] })(props);
}
function LuPencilLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 20h9" }, "child": [] }, { "tag": "path", "attr": { "d": "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" }, "child": [] }, { "tag": "path", "attr": { "d": "m15 5 3 3" }, "child": [] }] })(props);
}
function LuPencil(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }, "child": [] }, { "tag": "path", "attr": { "d": "m15 5 4 4" }, "child": [] }] })(props);
}
function LuPhoneOff(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" }, "child": [] }, { "tag": "line", "attr": { "x1": "22", "x2": "2", "y1": "2", "y2": "22" }, "child": [] }] })(props);
}
function LuPhone(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" }, "child": [] }] })(props);
}
function LuPinOff(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 17v5" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" }, "child": [] }, { "tag": "path", "attr": { "d": "m2 2 20 20" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" }, "child": [] }] })(props);
}
function LuPin(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 17v5" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" }, "child": [] }] })(props);
}
function LuPlane(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" }, "child": [] }] })(props);
}
function LuPlay(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polygon", "attr": { "points": "6 3 20 12 6 21 6 3" }, "child": [] }] })(props);
}
function LuPlus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M5 12h14" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 5v14" }, "child": [] }] })(props);
}
function LuPrinter(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }, "child": [] }, { "tag": "rect", "attr": { "x": "6", "y": "14", "width": "12", "height": "8", "rx": "1" }, "child": [] }] })(props);
}
function LuPuzzle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" }, "child": [] }] })(props);
}
function LuQrCode(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "5", "height": "5", "x": "3", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "5", "height": "5", "x": "16", "y": "3", "rx": "1" }, "child": [] }, { "tag": "rect", "attr": { "width": "5", "height": "5", "x": "3", "y": "16", "rx": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 16h-3a2 2 0 0 0-2 2v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 21v.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 7v3a2 2 0 0 1-2 2H7" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 12h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 3h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16v.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 12h1" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 12v.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 21v-1" }, "child": [] }] })(props);
}
function LuQuote(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" }, "child": [] }] })(props);
}
function LuRadar(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19.07 4.93A10 10 0 0 0 6.99 3.34" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 6h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M2.29 9.62A10 10 0 1 0 21.31 8.35" }, "child": [] }, { "tag": "path", "attr": { "d": "M16.24 7.76A6 6 0 1 0 8.23 16.67" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.99 11.66A6 6 0 0 1 15.77 16.67" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "m13.41 10.59 5.66-5.66" }, "child": [] }] })(props);
}
function LuReceipt(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 17.5v-11" }, "child": [] }] })(props);
}
function LuRecycle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" }, "child": [] }, { "tag": "path", "attr": { "d": "m14 16-3 3 3 3" }, "child": [] }, { "tag": "path", "attr": { "d": "M8.293 13.596 7.196 9.5 3.1 10.598" }, "child": [] }, { "tag": "path", "attr": { "d": "m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" }, "child": [] }, { "tag": "path", "attr": { "d": "m13.378 9.633 4.096 1.098 1.097-4.096" }, "child": [] }] })(props);
}
function LuRefreshCw(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 3v5h-5" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 16H3v5" }, "child": [] }] })(props);
}
function LuRocket(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" }, "child": [] }, { "tag": "path", "attr": { "d": "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }, "child": [] }] })(props);
}
function LuRotateCcw(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 3v5h5" }, "child": [] }] })(props);
}
function LuRoute(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "6", "cy": "19", "r": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" }, "child": [] }, { "tag": "circle", "attr": { "cx": "18", "cy": "5", "r": "3" }, "child": [] }] })(props);
}
function LuRows3(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 9H3" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 15H3" }, "child": [] }] })(props);
}
function LuSave(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 3v4a1 1 0 0 0 1 1h7" }, "child": [] }] })(props);
}
function LuScanLine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 7V5a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 3h2a2 2 0 0 1 2 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 12h10" }, "child": [] }] })(props);
}
function LuScanSearch(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 7V5a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 3h2a2 2 0 0 1 2 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "3" }, "child": [] }, { "tag": "path", "attr": { "d": "m16 16-1.9-1.9" }, "child": [] }] })(props);
}
function LuScanText(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 7V5a2 2 0 0 1 2-2h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M17 3h2a2 2 0 0 1 2 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 8h8" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 12h10" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 16h6" }, "child": [] }] })(props);
}
function LuSchool(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14 22v-4a2 2 0 1 0-4 0v4" }, "child": [] }, { "tag": "path", "attr": { "d": "m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 5v17" }, "child": [] }, { "tag": "path", "attr": { "d": "m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6" }, "child": [] }, { "tag": "path", "attr": { "d": "M6 5v17" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "9", "r": "2" }, "child": [] }] })(props);
}
function LuSearch(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "11", "cy": "11", "r": "8" }, "child": [] }, { "tag": "path", "attr": { "d": "m21 21-4.3-4.3" }, "child": [] }] })(props);
}
function LuSend(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" }, "child": [] }, { "tag": "path", "attr": { "d": "m21.854 2.147-10.94 10.939" }, "child": [] }] })(props);
}
function LuServer(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "20", "height": "8", "x": "2", "y": "2", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "rect", "attr": { "width": "20", "height": "8", "x": "2", "y": "14", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "line", "attr": { "x1": "6", "x2": "6.01", "y1": "6", "y2": "6" }, "child": [] }, { "tag": "line", "attr": { "x1": "6", "x2": "6.01", "y1": "18", "y2": "18" }, "child": [] }] })(props);
}
function LuSettings2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 7h-9" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 17H5" }, "child": [] }, { "tag": "circle", "attr": { "cx": "17", "cy": "17", "r": "3" }, "child": [] }, { "tag": "circle", "attr": { "cx": "7", "cy": "7", "r": "3" }, "child": [] }] })(props);
}
function LuSettings(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "3" }, "child": [] }] })(props);
}
function LuShare2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "18", "cy": "5", "r": "3" }, "child": [] }, { "tag": "circle", "attr": { "cx": "6", "cy": "12", "r": "3" }, "child": [] }, { "tag": "circle", "attr": { "cx": "18", "cy": "19", "r": "3" }, "child": [] }, { "tag": "line", "attr": { "x1": "8.59", "x2": "15.42", "y1": "13.51", "y2": "17.49" }, "child": [] }, { "tag": "line", "attr": { "x1": "15.41", "x2": "8.59", "y1": "6.51", "y2": "10.49" }, "child": [] }] })(props);
}
function LuShell(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44" }, "child": [] }] })(props);
}
function LuShieldAlert(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 8v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 16h.01" }, "child": [] }] })(props);
}
function LuShieldCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 12 2 2 4-4" }, "child": [] }] })(props);
}
function LuShield(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }, "child": [] }] })(props);
}
function LuShip(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 10.189V14" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" }, "child": [] }] })(props);
}
function LuShoppingBag(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 6h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 10a4 4 0 0 1-8 0" }, "child": [] }] })(props);
}
function LuSiren(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7 18v-6a5 5 0 1 1 10 0v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 12h1" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.5 4.5 18 5" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 12h1" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2v1" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.929 4.929.707.707" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 12v6" }, "child": [] }] })(props);
}
function LuSlidersHorizontal(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "21", "x2": "14", "y1": "4", "y2": "4" }, "child": [] }, { "tag": "line", "attr": { "x1": "10", "x2": "3", "y1": "4", "y2": "4" }, "child": [] }, { "tag": "line", "attr": { "x1": "21", "x2": "12", "y1": "12", "y2": "12" }, "child": [] }, { "tag": "line", "attr": { "x1": "8", "x2": "3", "y1": "12", "y2": "12" }, "child": [] }, { "tag": "line", "attr": { "x1": "21", "x2": "16", "y1": "20", "y2": "20" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "3", "y1": "20", "y2": "20" }, "child": [] }, { "tag": "line", "attr": { "x1": "14", "x2": "14", "y1": "2", "y2": "6" }, "child": [] }, { "tag": "line", "attr": { "x1": "8", "x2": "8", "y1": "10", "y2": "14" }, "child": [] }, { "tag": "line", "attr": { "x1": "16", "x2": "16", "y1": "18", "y2": "22" }, "child": [] }] })(props);
}
function LuSmartphone(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "14", "height": "20", "x": "5", "y": "2", "rx": "2", "ry": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 18h.01" }, "child": [] }] })(props);
}
function LuSmile(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 14s1.5 2 4 2 4-2 4-2" }, "child": [] }, { "tag": "line", "attr": { "x1": "9", "x2": "9.01", "y1": "9", "y2": "9" }, "child": [] }, { "tag": "line", "attr": { "x1": "15", "x2": "15.01", "y1": "9", "y2": "9" }, "child": [] }] })(props);
}
function LuSnowflake(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "2", "x2": "22", "y1": "12", "y2": "12" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "2", "y2": "22" }, "child": [] }, { "tag": "path", "attr": { "d": "m20 16-4-4 4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "m4 8 4 4-4 4" }, "child": [] }, { "tag": "path", "attr": { "d": "m16 4-4 4-4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 20 4-4 4 4" }, "child": [] }] })(props);
}
function LuSparkles(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 3v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 5h-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 17v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 18H3" }, "child": [] }] })(props);
}
function LuSprout(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M7 20h10" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 20c5.5-2.5.8-6.4 3-10" }, "child": [] }, { "tag": "path", "attr": { "d": "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" }, "child": [] }, { "tag": "path", "attr": { "d": "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" }, "child": [] }] })(props);
}
function LuSquareCheck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "m9 12 2 2 4-4" }, "child": [] }] })(props);
}
function LuSquareTerminal(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m7 11 2-2-2-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M11 13h4" }, "child": [] }, { "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2", "ry": "2" }, "child": [] }] })(props);
}
function LuSquare(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }] })(props);
}
function LuStar(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" }, "child": [] }] })(props);
}
function LuStore(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 7h20" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" }, "child": [] }] })(props);
}
function LuSun(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 20v2" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.93 4.93 1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "m17.66 17.66 1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 12h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 12h2" }, "child": [] }, { "tag": "path", "attr": { "d": "m6.34 17.66-1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "m19.07 4.93-1.41 1.41" }, "child": [] }] })(props);
}
function LuSunrise(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 2v8" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.93 10.93 1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 18h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 18h2" }, "child": [] }, { "tag": "path", "attr": { "d": "m19.07 10.93-1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 22H2" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 6 4-4 4 4" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 18a4 4 0 0 0-8 0" }, "child": [] }] })(props);
}
function LuSunset(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 10V2" }, "child": [] }, { "tag": "path", "attr": { "d": "m4.93 10.93 1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 18h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 18h2" }, "child": [] }, { "tag": "path", "attr": { "d": "m19.07 10.93-1.41 1.41" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 22H2" }, "child": [] }, { "tag": "path", "attr": { "d": "m16 6-4 4-4-4" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 18a4 4 0 0 0-8 0" }, "child": [] }] })(props);
}
function LuTable2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" }, "child": [] }] })(props);
}
function LuTable(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 3v18" }, "child": [] }, { "tag": "rect", "attr": { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 9h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 15h18" }, "child": [] }] })(props);
}
function LuTag(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "7.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }, "child": [] }] })(props);
}
function LuTags(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19" }, "child": [] }, { "tag": "path", "attr": { "d": "M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z" }, "child": [] }, { "tag": "circle", "attr": { "cx": "6.5", "cy": "9.5", "r": ".5", "fill": "currentColor" }, "child": [] }] })(props);
}
function LuTarget(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "10" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "6" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "2" }, "child": [] }] })(props);
}
function LuTelescope(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" }, "child": [] }, { "tag": "path", "attr": { "d": "m13.56 11.747 4.332-.924" }, "child": [] }, { "tag": "path", "attr": { "d": "m16 21-3.105-6.21" }, "child": [] }, { "tag": "path", "attr": { "d": "M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" }, "child": [] }, { "tag": "path", "attr": { "d": "m6.158 8.633 1.114 4.456" }, "child": [] }, { "tag": "path", "attr": { "d": "m8 21 3.105-6.21" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "13", "r": "2" }, "child": [] }] })(props);
}
function LuTerminal(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "4 17 10 11 4 5" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "20", "y1": "19", "y2": "19" }, "child": [] }] })(props);
}
function LuTicket(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 5v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 17v2" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 11v2" }, "child": [] }] })(props);
}
function LuTimer(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "line", "attr": { "x1": "10", "x2": "14", "y1": "2", "y2": "2" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "15", "y1": "14", "y2": "11" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "14", "r": "8" }, "child": [] }] })(props);
}
function LuTrash2(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M3 6h18" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }, "child": [] }, { "tag": "path", "attr": { "d": "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }, "child": [] }, { "tag": "line", "attr": { "x1": "10", "x2": "10", "y1": "11", "y2": "17" }, "child": [] }, { "tag": "line", "attr": { "x1": "14", "x2": "14", "y1": "11", "y2": "17" }, "child": [] }] })(props);
}
function LuTreePine(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 22v-3" }, "child": [] }] })(props);
}
function LuTrees(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 16v6" }, "child": [] }, { "tag": "path", "attr": { "d": "M13 19v3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5" }, "child": [] }] })(props);
}
function LuTrendingUp(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "22 7 13.5 15.5 8.5 10.5 2 17" }, "child": [] }, { "tag": "polyline", "attr": { "points": "16 7 22 7 22 13" }, "child": [] }] })(props);
}
function LuTriangleAlert(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 9v4" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 17h.01" }, "child": [] }] })(props);
}
function LuTriangle(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }, "child": [] }] })(props);
}
function LuTrophy(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" }, "child": [] }, { "tag": "path", "attr": { "d": "M4 22h16" }, "child": [] }, { "tag": "path", "attr": { "d": "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" }, "child": [] }, { "tag": "path", "attr": { "d": "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" }, "child": [] }, { "tag": "path", "attr": { "d": "M18 2H6v7a6 6 0 0 0 12 0V2Z" }, "child": [] }] })(props);
}
function LuTruck(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }, "child": [] }, { "tag": "path", "attr": { "d": "M15 18H9" }, "child": [] }, { "tag": "path", "attr": { "d": "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" }, "child": [] }, { "tag": "circle", "attr": { "cx": "17", "cy": "18", "r": "2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "7", "cy": "18", "r": "2" }, "child": [] }] })(props);
}
function LuType(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "polyline", "attr": { "points": "4 7 4 4 20 4 20 7" }, "child": [] }, { "tag": "line", "attr": { "x1": "9", "x2": "15", "y1": "20", "y2": "20" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "4", "y2": "20" }, "child": [] }] })(props);
}
function LuUmbrella(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M22 12a10.06 10.06 1 0 0-20 0Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 12v8a2 2 0 0 0 4 0" }, "child": [] }, { "tag": "path", "attr": { "d": "M12 2v1" }, "child": [] }] })(props);
}
function LuUnderline(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M6 4v6a6 6 0 0 0 12 0V4" }, "child": [] }, { "tag": "line", "attr": { "x1": "4", "x2": "20", "y1": "20", "y2": "20" }, "child": [] }] })(props);
}
function LuUpload(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }, "child": [] }, { "tag": "polyline", "attr": { "points": "17 8 12 3 7 8" }, "child": [] }, { "tag": "line", "attr": { "x1": "12", "x2": "12", "y1": "3", "y2": "15" }, "child": [] }] })(props);
}
function LuUserPlus(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "7", "r": "4" }, "child": [] }, { "tag": "line", "attr": { "x1": "19", "x2": "19", "y1": "8", "y2": "14" }, "child": [] }, { "tag": "line", "attr": { "x1": "22", "x2": "16", "y1": "11", "y2": "11" }, "child": [] }] })(props);
}
function LuUser(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "7", "r": "4" }, "child": [] }] })(props);
}
function LuUsers(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "9", "cy": "7", "r": "4" }, "child": [] }, { "tag": "path", "attr": { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }, "child": [] }, { "tag": "path", "attr": { "d": "M16 3.13a4 4 0 0 1 0 7.75" }, "child": [] }] })(props);
}
function LuVegan(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M16 8q6 0 6-6-6 0-6 6" }, "child": [] }, { "tag": "path", "attr": { "d": "M17.41 3.59a10 10 0 1 0 3 3" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 2a26.6 26.6 0 0 1 10 20c.9-6.82 1.5-9.5 4-14" }, "child": [] }] })(props);
}
function LuVideo(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" }, "child": [] }, { "tag": "rect", "attr": { "x": "2", "y": "6", "width": "14", "height": "12", "rx": "2" }, "child": [] }] })(props);
}
function LuView(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" }, "child": [] }, { "tag": "path", "attr": { "d": "M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" }, "child": [] }, { "tag": "circle", "attr": { "cx": "12", "cy": "12", "r": "1" }, "child": [] }, { "tag": "path", "attr": { "d": "M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0" }, "child": [] }] })(props);
}
function LuWallet(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }, "child": [] }, { "tag": "path", "attr": { "d": "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }, "child": [] }] })(props);
}
function LuWheat(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M2 22 16 8" }, "child": [] }, { "tag": "path", "attr": { "d": "M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" }, "child": [] }, { "tag": "path", "attr": { "d": "M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" }, "child": [] }] })(props);
}
function LuWifi(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M12 20h.01" }, "child": [] }, { "tag": "path", "attr": { "d": "M2 8.82a15 15 0 0 1 20 0" }, "child": [] }, { "tag": "path", "attr": { "d": "M5 12.859a10 10 0 0 1 14 0" }, "child": [] }, { "tag": "path", "attr": { "d": "M8.5 16.429a5 5 0 0 1 7 0" }, "child": [] }] })(props);
}
function LuWorkflow(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "rect", "attr": { "width": "8", "height": "8", "x": "3", "y": "3", "rx": "2" }, "child": [] }, { "tag": "path", "attr": { "d": "M7 11v4a2 2 0 0 0 2 2h4" }, "child": [] }, { "tag": "rect", "attr": { "width": "8", "height": "8", "x": "13", "y": "13", "rx": "2" }, "child": [] }] })(props);
}
function LuWrench(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }, "child": [] }] })(props);
}
function LuX(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M18 6 6 18" }, "child": [] }, { "tag": "path", "attr": { "d": "m6 6 12 12" }, "child": [] }] })(props);
}
function LuZap(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "2", "strokeLinecap": "round", "strokeLinejoin": "round" }, "child": [{ "tag": "path", "attr": { "d": "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" }, "child": [] }] })(props);
}

export {
  LuActivity,
  LuAlarmClock,
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuAppWindow,
  LuApple,
  LuArchiveRestore,
  LuArchive,
  LuArrowDownFromLine,
  LuArrowDownToLine,
  LuArrowDown,
  LuArrowLeftFromLine,
  LuArrowLeft,
  LuArrowRightFromLine,
  LuArrowRight,
  LuArrowUpDown,
  LuArrowUpFromLine,
  LuArrowUp,
  LuAtom,
  LuAudioLines,
  LuAward,
  LuBadgeCheck,
  LuBadgeDollarSign,
  LuBan,
  LuBanknote,
  LuBatteryCharging,
  LuBean,
  LuBell,
  LuBlocks,
  LuBluetooth,
  LuBold,
  LuBookOpen,
  LuBook,
  LuBookmark,
  LuBot,
  LuBox,
  LuBoxes,
  LuBrain,
  LuBriefcase,
  LuBug,
  LuCake,
  LuCalendarClock,
  LuCalendarDays,
  LuCalendar,
  LuCamera,
  LuCar,
  LuChartBar,
  LuChartColumnBig,
  LuChartLine,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleDollarSign,
  LuCircleHelp,
  LuCircleUserRound,
  LuCircleUser,
  LuCircleX,
  LuCircle,
  LuClipboardCheck,
  LuClipboardList,
  LuClipboard,
  LuClock3,
  LuClock,
  LuCloudRain,
  LuCloudSun,
  LuCloudUpload,
  LuCloud,
  LuClover,
  LuCode,
  LuCoffee,
  LuCoins,
  LuColumns3,
  LuCommand,
  LuCompass,
  LuConstruction,
  LuContact,
  LuCopy,
  LuCornerDownLeft,
  LuCpu,
  LuCreditCard,
  LuCrown,
  LuDatabase,
  LuDelete,
  LuDiamond,
  LuDot,
  LuDownload,
  LuDroplets,
  LuDumbbell,
  LuEarth,
  LuEllipsisVertical,
  LuEllipsis,
  LuEraser,
  LuExternalLink,
  LuEyeOff,
  LuEye,
  LuFileArchive,
  LuFileCode2,
  LuFileCode,
  LuFileDiff,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
  LuFileType,
  LuFileWarning,
  LuFile,
  LuFilm,
  LuFilter,
  LuFingerprint,
  LuFlag,
  LuFlame,
  LuFlaskConical,
  LuFlower2,
  LuFlower,
  LuFolderKanban,
  LuFolderOpen,
  LuFolderOutput,
  LuFolderPlus,
  LuFolderSymlink,
  LuFolder,
  LuGamepad2,
  LuGauge,
  LuGem,
  LuGift,
  LuGitBranch,
  LuGlobe,
  LuGraduationCap,
  LuGrid2X2,
  LuGripVertical,
  LuHammer,
  LuHandshake,
  LuHardDrive,
  LuHash,
  LuHeading1,
  LuHeading2,
  LuHeading,
  LuHeadphones,
  LuHeart,
  LuHistory,
  LuHospital,
  LuHouse,
  LuImagePlus,
  LuImage,
  LuInbox,
  LuInfo,
  LuItalic,
  LuKanban,
  LuKeyRound,
  LuKey,
  LuLanguages,
  LuLaptop,
  LuLayers,
  LuLayoutDashboard,
  LuLayoutGrid,
  LuLeaf,
  LuLibrary,
  LuLightbulb,
  LuLink2,
  LuLink,
  LuListOrdered,
  LuListTodo,
  LuList,
  LuLoaderCircle,
  LuLoader,
  LuLockKeyhole,
  LuLock,
  LuLogIn,
  LuLogOut,
  LuMail,
  LuMapPin,
  LuMap,
  LuMaximize2,
  LuMedal,
  LuMegaphone,
  LuMessageCircle,
  LuMessageSquareMore,
  LuMessageSquarePlus,
  LuMessageSquare,
  LuMessagesSquare,
  LuMicOff,
  LuMic,
  LuMinus,
  LuMonitor,
  LuMoon,
  LuMountain,
  LuMousePointer2,
  LuMousePointerClick,
  LuMusic,
  LuNetwork,
  LuNewspaper,
  LuNotebook,
  LuOctagonAlert,
  LuOption,
  LuPackage,
  LuPaintbrush,
  LuPalette,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPaperclip,
  LuPenTool,
  LuPencilLine,
  LuPencil,
  LuPhoneOff,
  LuPhone,
  LuPinOff,
  LuPin,
  LuPlane,
  LuPlay,
  LuPlus,
  LuPrinter,
  LuPuzzle,
  LuQrCode,
  LuQuote,
  LuRadar,
  LuReceipt,
  LuRecycle,
  LuRefreshCw,
  LuRocket,
  LuRotateCcw,
  LuRoute,
  LuRows3,
  LuSave,
  LuScanLine,
  LuScanSearch,
  LuScanText,
  LuSchool,
  LuSearch,
  LuSend,
  LuServer,
  LuSettings2,
  LuSettings,
  LuShare2,
  LuShell,
  LuShieldAlert,
  LuShieldCheck,
  LuShield,
  LuShip,
  LuShoppingBag,
  LuSiren,
  LuSlidersHorizontal,
  LuSmartphone,
  LuSmile,
  LuSnowflake,
  LuSparkles,
  LuSprout,
  LuSquareCheck,
  LuSquareTerminal,
  LuSquare,
  LuStar,
  LuStore,
  LuSun,
  LuSunrise,
  LuSunset,
  LuTable2,
  LuTable,
  LuTag,
  LuTags,
  LuTarget,
  LuTelescope,
  LuTerminal,
  LuTicket,
  LuTimer,
  LuTrash2,
  LuTreePine,
  LuTrees,
  LuTrendingUp,
  LuTriangleAlert,
  LuTriangle,
  LuTrophy,
  LuTruck,
  LuType,
  LuUmbrella,
  LuUnderline,
  LuUpload,
  LuUserPlus,
  LuUser,
  LuUsers,
  LuVegan,
  LuVideo,
  LuView,
  LuWallet,
  LuWheat,
  LuWifi,
  LuWorkflow,
  LuWrench,
  LuX,
  LuZap
};
