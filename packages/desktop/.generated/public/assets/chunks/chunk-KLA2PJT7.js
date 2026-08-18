import {
  useDragResize
} from "/public/assets/chunks/chunk-6Q7JCK5Q.js";
import {
  BaseTable,
  BaseTableCell,
  BaseTableRow
} from "/public/assets/chunks/chunk-QJUZO4YG.js";
import {
  Editor,
  Element as Element2,
  Node,
  Path,
  Point,
  Range,
  Scrubber,
  Text,
  Transforms
} from "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  SEPARATOR,
  addRow,
  createTable,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuDownload,
  LuFileText,
  LuTable,
  LuTable2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __commonJS,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/direction/index.js
var require_direction = __commonJS({
  "node_modules/direction/index.js"(exports, module) {
    "use strict";
    module.exports = direction;
    var RTL = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
    var LTR = "A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C\uFE00-\uFE6F\uFEFD-\uFFFF";
    var rtl = new RegExp("^[^" + LTR + "]*[" + RTL + "]");
    var ltr = new RegExp("^[^" + RTL + "]*[" + LTR + "]");
    function direction(value) {
      value = String(value || "");
      if (rtl.test(value)) {
        return "rtl";
      }
      if (ltr.test(value)) {
        return "ltr";
      }
      return "neutral";
    }
  }
});

// node_modules/lodash/isObject.js
var require_isObject = __commonJS({
  "node_modules/lodash/isObject.js"(exports, module) {
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    module.exports = isObject;
  }
});

// node_modules/lodash/_freeGlobal.js
var require_freeGlobal = __commonJS({
  "node_modules/lodash/_freeGlobal.js"(exports, module) {
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    module.exports = freeGlobal;
  }
});

// node_modules/lodash/_root.js
var require_root = __commonJS({
  "node_modules/lodash/_root.js"(exports, module) {
    var freeGlobal = require_freeGlobal();
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    module.exports = root;
  }
});

// node_modules/lodash/now.js
var require_now = __commonJS({
  "node_modules/lodash/now.js"(exports, module) {
    var root = require_root();
    var now = function() {
      return root.Date.now();
    };
    module.exports = now;
  }
});

// node_modules/lodash/_trimmedEndIndex.js
var require_trimmedEndIndex = __commonJS({
  "node_modules/lodash/_trimmedEndIndex.js"(exports, module) {
    var reWhitespace = /\s/;
    function trimmedEndIndex(string) {
      var index = string.length;
      while (index-- && reWhitespace.test(string.charAt(index))) {
      }
      return index;
    }
    module.exports = trimmedEndIndex;
  }
});

// node_modules/lodash/_baseTrim.js
var require_baseTrim = __commonJS({
  "node_modules/lodash/_baseTrim.js"(exports, module) {
    var trimmedEndIndex = require_trimmedEndIndex();
    var reTrimStart = /^\s+/;
    function baseTrim(string) {
      return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
    }
    module.exports = baseTrim;
  }
});

// node_modules/lodash/_Symbol.js
var require_Symbol = __commonJS({
  "node_modules/lodash/_Symbol.js"(exports, module) {
    var root = require_root();
    var Symbol2 = root.Symbol;
    module.exports = Symbol2;
  }
});

// node_modules/lodash/_getRawTag.js
var require_getRawTag = __commonJS({
  "node_modules/lodash/_getRawTag.js"(exports, module) {
    var Symbol2 = require_Symbol();
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var nativeObjectToString = objectProto.toString;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e3) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    module.exports = getRawTag;
  }
});

// node_modules/lodash/_objectToString.js
var require_objectToString = __commonJS({
  "node_modules/lodash/_objectToString.js"(exports, module) {
    var objectProto = Object.prototype;
    var nativeObjectToString = objectProto.toString;
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    module.exports = objectToString;
  }
});

// node_modules/lodash/_baseGetTag.js
var require_baseGetTag = __commonJS({
  "node_modules/lodash/_baseGetTag.js"(exports, module) {
    var Symbol2 = require_Symbol();
    var getRawTag = require_getRawTag();
    var objectToString = require_objectToString();
    var nullTag = "[object Null]";
    var undefinedTag = "[object Undefined]";
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    module.exports = baseGetTag;
  }
});

// node_modules/lodash/isObjectLike.js
var require_isObjectLike = __commonJS({
  "node_modules/lodash/isObjectLike.js"(exports, module) {
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    module.exports = isObjectLike;
  }
});

// node_modules/lodash/isSymbol.js
var require_isSymbol = __commonJS({
  "node_modules/lodash/isSymbol.js"(exports, module) {
    var baseGetTag = require_baseGetTag();
    var isObjectLike = require_isObjectLike();
    var symbolTag = "[object Symbol]";
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
    }
    module.exports = isSymbol;
  }
});

// node_modules/lodash/toNumber.js
var require_toNumber = __commonJS({
  "node_modules/lodash/toNumber.js"(exports, module) {
    var baseTrim = require_baseTrim();
    var isObject = require_isObject();
    var isSymbol = require_isSymbol();
    var NAN = 0 / 0;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    module.exports = toNumber;
  }
});

// node_modules/lodash/debounce.js
var require_debounce = __commonJS({
  "node_modules/lodash/debounce.js"(exports, module) {
    var isObject = require_isObject();
    var now = require_now();
    var toNumber = require_toNumber();
    var FUNC_ERROR_TEXT = "Expected a function";
    var nativeMax = Math.max;
    var nativeMin = Math.min;
    function debounce2(func, wait, options) {
      var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      wait = toNumber(wait) || 0;
      if (isObject(options)) {
        leading = !!options.leading;
        maxing = "maxWait" in options;
        maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      function invokeFunc(time2) {
        var args = lastArgs, thisArg = lastThis;
        lastArgs = lastThis = void 0;
        lastInvokeTime = time2;
        result = func.apply(thisArg, args);
        return result;
      }
      function leadingEdge(time2) {
        lastInvokeTime = time2;
        timerId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time2) : result;
      }
      function remainingWait(time2) {
        var timeSinceLastCall = time2 - lastCallTime, timeSinceLastInvoke = time2 - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
        return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
      }
      function shouldInvoke(time2) {
        var timeSinceLastCall = time2 - lastCallTime, timeSinceLastInvoke = time2 - lastInvokeTime;
        return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
      }
      function timerExpired() {
        var time2 = now();
        if (shouldInvoke(time2)) {
          return trailingEdge(time2);
        }
        timerId = setTimeout(timerExpired, remainingWait(time2));
      }
      function trailingEdge(time2) {
        timerId = void 0;
        if (trailing && lastArgs) {
          return invokeFunc(time2);
        }
        lastArgs = lastThis = void 0;
        return result;
      }
      function cancel() {
        if (timerId !== void 0) {
          clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = void 0;
      }
      function flush() {
        return timerId === void 0 ? result : trailingEdge(now());
      }
      function debounced() {
        var time2 = now(), isInvoking = shouldInvoke(time2);
        lastArgs = arguments;
        lastThis = this;
        lastCallTime = time2;
        if (isInvoking) {
          if (timerId === void 0) {
            return leadingEdge(lastCallTime);
          }
          if (maxing) {
            clearTimeout(timerId);
            timerId = setTimeout(timerExpired, wait);
            return invokeFunc(lastCallTime);
          }
        }
        if (timerId === void 0) {
          timerId = setTimeout(timerExpired, wait);
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }
    module.exports = debounce2;
  }
});

// node_modules/lodash/throttle.js
var require_throttle = __commonJS({
  "node_modules/lodash/throttle.js"(exports, module) {
    var debounce2 = require_debounce();
    var isObject = require_isObject();
    var FUNC_ERROR_TEXT = "Expected a function";
    function throttle2(func, wait, options) {
      var leading = true, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      if (isObject(options)) {
        leading = "leading" in options ? !!options.leading : leading;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      return debounce2(func, wait, {
        "leading": leading,
        "maxWait": wait,
        "trailing": trailing
      });
    }
    module.exports = throttle2;
  }
});

// node_modules/is-hotkey/lib/index.js
var require_lib = __commonJS({
  "node_modules/is-hotkey/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var IS_MAC = typeof window != "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
    var MODIFIERS = {
      alt: "altKey",
      control: "ctrlKey",
      meta: "metaKey",
      shift: "shiftKey"
    };
    var ALIASES = {
      add: "+",
      break: "pause",
      cmd: "meta",
      command: "meta",
      ctl: "control",
      ctrl: "control",
      del: "delete",
      down: "arrowdown",
      esc: "escape",
      ins: "insert",
      left: "arrowleft",
      mod: IS_MAC ? "meta" : "control",
      opt: "alt",
      option: "alt",
      return: "enter",
      right: "arrowright",
      space: " ",
      spacebar: " ",
      up: "arrowup",
      win: "meta",
      windows: "meta"
    };
    var CODES = {
      backspace: 8,
      tab: 9,
      enter: 13,
      shift: 16,
      control: 17,
      alt: 18,
      pause: 19,
      capslock: 20,
      escape: 27,
      " ": 32,
      pageup: 33,
      pagedown: 34,
      end: 35,
      home: 36,
      arrowleft: 37,
      arrowup: 38,
      arrowright: 39,
      arrowdown: 40,
      insert: 45,
      delete: 46,
      meta: 91,
      numlock: 144,
      scrolllock: 145,
      ";": 186,
      "=": 187,
      ",": 188,
      "-": 189,
      ".": 190,
      "/": 191,
      "`": 192,
      "[": 219,
      "\\": 220,
      "]": 221,
      "'": 222
    };
    for (f = 1; f < 20; f++) {
      CODES["f" + f] = 111 + f;
    }
    var f;
    function isHotkey2(hotkey, options, event) {
      if (options && !("byKey" in options)) {
        event = options;
        options = null;
      }
      if (!Array.isArray(hotkey)) {
        hotkey = [hotkey];
      }
      var array = hotkey.map(function(string) {
        return parseHotkey(string, options);
      });
      var check = function check2(e3) {
        return array.some(function(object) {
          return compareHotkey(object, e3);
        });
      };
      var ret = event == null ? check : check(event);
      return ret;
    }
    function isCodeHotkey(hotkey, event) {
      return isHotkey2(hotkey, event);
    }
    function isKeyHotkey(hotkey, event) {
      return isHotkey2(hotkey, { byKey: true }, event);
    }
    function parseHotkey(hotkey, options) {
      var byKey = options && options.byKey;
      var ret = {};
      hotkey = hotkey.replace("++", "+add");
      var values = hotkey.split("+");
      var length = values.length;
      for (var k in MODIFIERS) {
        ret[MODIFIERS[k]] = false;
      }
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = void 0;
      try {
        for (var _iterator = values[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var value = _step.value;
          var optional = value.endsWith("?") && value.length > 1;
          if (optional) {
            value = value.slice(0, -1);
          }
          var name = toKeyName(value);
          var modifier = MODIFIERS[name];
          if (value.length > 1 && !modifier && !ALIASES[value] && !CODES[name]) {
            throw new TypeError('Unknown modifier: "' + value + '"');
          }
          if (length === 1 || !modifier) {
            if (byKey) {
              ret.key = name;
            } else {
              ret.which = toKeyCode(value);
            }
          }
          if (modifier) {
            ret[modifier] = optional ? null : true;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
      return ret;
    }
    function compareHotkey(object, event) {
      for (var key in object) {
        var expected = object[key];
        var actual = void 0;
        if (expected == null) {
          continue;
        }
        if (key === "key" && event.key != null) {
          actual = event.key.toLowerCase();
        } else if (key === "which") {
          actual = expected === 91 && event.which === 93 ? 91 : event.which;
        } else {
          actual = event[key];
        }
        if (actual == null && expected === false) {
          continue;
        }
        if (actual !== expected) {
          return false;
        }
      }
      return true;
    }
    function toKeyCode(name) {
      name = toKeyName(name);
      var code = CODES[name] || name.toUpperCase().charCodeAt(0);
      return code;
    }
    function toKeyName(name) {
      name = name.toLowerCase();
      name = ALIASES[name] || name;
      return name;
    }
    exports.default = isHotkey2;
    exports.isHotkey = isHotkey2;
    exports.isCodeHotkey = isCodeHotkey;
    exports.isKeyHotkey = isKeyHotkey;
    exports.parseHotkey = parseHotkey;
    exports.compareHotkey = compareHotkey;
    exports.toKeyCode = toKeyCode;
    exports.toKeyName = toKeyName;
  }
});

// node_modules/slate-react/dist/index.es.js
var import_direction = __toESM(require_direction());
var import_debounce = __toESM(require_debounce());
var import_throttle = __toESM(require_throttle());
var import_react = __toESM(require_react());

// node_modules/compute-scroll-into-view/dist/index.js
var t = (t2) => "object" == typeof t2 && null != t2 && 1 === t2.nodeType;
var e = (t2, e3) => (!e3 || "hidden" !== t2) && ("visible" !== t2 && "clip" !== t2);
var n = (t2, n3) => {
  if (t2.clientHeight < t2.scrollHeight || t2.clientWidth < t2.scrollWidth) {
    const o3 = getComputedStyle(t2, null);
    return e(o3.overflowY, n3) || e(o3.overflowX, n3) || ((t3) => {
      const e3 = ((t4) => {
        if (!t4.ownerDocument || !t4.ownerDocument.defaultView) return null;
        try {
          return t4.ownerDocument.defaultView.frameElement;
        } catch (t5) {
          return null;
        }
      })(t3);
      return !!e3 && (e3.clientHeight < t3.scrollHeight || e3.clientWidth < t3.scrollWidth);
    })(t2);
  }
  return false;
};
var o = (t2, e3, n3, o3, l2, r2, i, s) => r2 < t2 && i > e3 || r2 > t2 && i < e3 ? 0 : r2 <= t2 && s <= n3 || i >= e3 && s >= n3 ? r2 - t2 - o3 : i > e3 && s < n3 || r2 < t2 && s > n3 ? i - e3 + l2 : 0;
var l = (t2) => {
  const e3 = t2.parentElement;
  return null == e3 ? t2.getRootNode().host || null : e3;
};
var r = (e3, r2) => {
  var i, s, d, h;
  if ("undefined" == typeof document) return [];
  const { scrollMode: c, block: f, inline: u, boundary: a, skipOverflowHiddenElements: g } = r2, p = "function" == typeof a ? a : (t2) => t2 !== a;
  if (!t(e3)) throw new TypeError("Invalid target");
  const m = document.scrollingElement || document.documentElement, w = [];
  let W = e3;
  for (; t(W) && p(W); ) {
    if (W = l(W), W === m) {
      w.push(W);
      break;
    }
    null != W && W === document.body && n(W) && !n(document.documentElement) || null != W && n(W, g) && w.push(W);
  }
  const b = null != (s = null == (i = window.visualViewport) ? void 0 : i.width) ? s : innerWidth, H = null != (h = null == (d = window.visualViewport) ? void 0 : d.height) ? h : innerHeight, { scrollX: y, scrollY: M } = window, { height: v, width: E, top: x, right: C, bottom: I, left: R } = e3.getBoundingClientRect(), { top: T, right: B, bottom: F, left: V } = ((t2) => {
    const e4 = window.getComputedStyle(t2);
    return { top: parseFloat(e4.scrollMarginTop) || 0, right: parseFloat(e4.scrollMarginRight) || 0, bottom: parseFloat(e4.scrollMarginBottom) || 0, left: parseFloat(e4.scrollMarginLeft) || 0 };
  })(e3);
  let k = "start" === f || "nearest" === f ? x - T : "end" === f ? I + F : x + v / 2 - T + F, D = "center" === u ? R + E / 2 - V + B : "end" === u ? C + B : R - V;
  const L = [];
  for (let t2 = 0; t2 < w.length; t2++) {
    const e4 = w[t2], { height: n3, width: l2, top: r3, right: i2, bottom: s2, left: d2 } = e4.getBoundingClientRect();
    if ("if-needed" === c && x >= 0 && R >= 0 && I <= H && C <= b && x >= r3 && I <= s2 && R >= d2 && C <= i2) return L;
    const h2 = getComputedStyle(e4), a2 = parseInt(h2.borderLeftWidth, 10), g2 = parseInt(h2.borderTopWidth, 10), p2 = parseInt(h2.borderRightWidth, 10), W2 = parseInt(h2.borderBottomWidth, 10);
    let T2 = 0, B2 = 0;
    const F2 = "offsetWidth" in e4 ? e4.offsetWidth - e4.clientWidth - a2 - p2 : 0, V2 = "offsetHeight" in e4 ? e4.offsetHeight - e4.clientHeight - g2 - W2 : 0, S = "offsetWidth" in e4 ? 0 === e4.offsetWidth ? 0 : l2 / e4.offsetWidth : 0, X = "offsetHeight" in e4 ? 0 === e4.offsetHeight ? 0 : n3 / e4.offsetHeight : 0;
    if (m === e4) T2 = "start" === f ? k : "end" === f ? k - H : "nearest" === f ? o(M, M + H, H, g2, W2, M + k, M + k + v, v) : k - H / 2, B2 = "start" === u ? D : "center" === u ? D - b / 2 : "end" === u ? D - b : o(y, y + b, b, a2, p2, y + D, y + D + E, E), T2 = Math.max(0, T2 + M), B2 = Math.max(0, B2 + y);
    else {
      T2 = "start" === f ? k - r3 - g2 : "end" === f ? k - s2 + W2 + V2 : "nearest" === f ? o(r3, s2, n3, g2, W2 + V2, k, k + v, v) : k - (r3 + n3 / 2) + V2 / 2, B2 = "start" === u ? D - d2 - a2 : "center" === u ? D - (d2 + l2 / 2) + F2 / 2 : "end" === u ? D - i2 + p2 + F2 : o(d2, i2, l2, a2, p2 + F2, D, D + E, E);
      const { scrollLeft: t3, scrollTop: h3 } = e4;
      T2 = 0 === X ? 0 : Math.max(0, Math.min(h3 + T2 / X, e4.scrollHeight - n3 / X + V2)), B2 = 0 === S ? 0 : Math.max(0, Math.min(t3 + B2 / S, e4.scrollWidth - l2 / S + F2)), k += h3 - T2, D += t3 - B2;
    }
    L.push({ el: e4, top: T2, left: B2 });
  }
  return L;
};

// node_modules/scroll-into-view-if-needed/dist/index.js
var o2 = (t2) => false === t2 ? { block: "end", inline: "nearest" } : ((t3) => t3 === Object(t3) && 0 !== Object.keys(t3).length)(t2) ? t2 : { block: "start", inline: "nearest" };
function e2(e3, r2) {
  if (!e3.isConnected || !((t2) => {
    let o3 = t2;
    for (; o3 && o3.parentNode; ) {
      if (o3.parentNode === document) return true;
      o3 = o3.parentNode instanceof ShadowRoot ? o3.parentNode.host : o3.parentNode;
    }
    return false;
  })(e3)) return;
  const n3 = ((t2) => {
    const o3 = window.getComputedStyle(t2);
    return { top: parseFloat(o3.scrollMarginTop) || 0, right: parseFloat(o3.scrollMarginRight) || 0, bottom: parseFloat(o3.scrollMarginBottom) || 0, left: parseFloat(o3.scrollMarginLeft) || 0 };
  })(e3);
  if (((t2) => "object" == typeof t2 && "function" == typeof t2.behavior)(r2)) return r2.behavior(r(e3, r2));
  const l2 = "boolean" == typeof r2 || null == r2 ? void 0 : r2.behavior;
  for (const { el: a, top: i, left: s } of r(e3, o2(r2))) {
    const t2 = i - n3.top + n3.bottom, o3 = s - n3.left + n3.right;
    a.scroll({ top: t2, left: o3, behavior: l2 });
  }
}

// node_modules/slate-dom/dist/index.es.js
var import_is_hotkey = __toESM(require_lib());
var DOMNode = globalThis.Node;
var DOMElement = globalThis.Element;
var DOMText = globalThis.Text;
var DOMRange = globalThis.Range;
var DOMSelection = globalThis.Selection;
var DOMStaticRange = globalThis.StaticRange;
var getDefaultView = (value) => {
  return value && value.ownerDocument && value.ownerDocument.defaultView || null;
};
var isDOMComment = (value) => {
  return isDOMNode(value) && value.nodeType === 8;
};
var isDOMElement = (value) => {
  return isDOMNode(value) && value.nodeType === 1;
};
var isDOMNode = (value) => {
  var window2 = getDefaultView(value);
  return !!window2 && value instanceof window2.Node;
};
var isDOMSelection = (value) => {
  var window2 = value && value.anchorNode && getDefaultView(value.anchorNode);
  return !!window2 && value instanceof window2.Selection;
};
var isDOMText = (value) => {
  return isDOMNode(value) && value.nodeType === 3;
};
var isPlainTextOnlyPaste = (event) => {
  return event.clipboardData && event.clipboardData.getData("text/plain") !== "" && event.clipboardData.types.length === 1;
};
var normalizeDOMPoint = (domPoint) => {
  var [node, offset] = domPoint;
  if (isDOMElement(node) && node.childNodes.length) {
    var isLast = offset === node.childNodes.length;
    var index = isLast ? offset - 1 : offset;
    [node, index] = getEditableChildAndIndex(node, index, isLast ? "backward" : "forward");
    isLast = index < offset;
    while (isDOMElement(node) && node.childNodes.length) {
      var i = isLast ? node.childNodes.length - 1 : 0;
      node = getEditableChild(node, i, isLast ? "backward" : "forward");
    }
    offset = isLast && node.textContent != null ? node.textContent.length : 0;
  }
  return [node, offset];
};
var hasShadowRoot = (node) => {
  var parent = node && node.parentNode;
  while (parent) {
    if (parent.toString() === "[object ShadowRoot]") {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
};
var getEditableChildAndIndex = (parent, index, direction) => {
  var {
    childNodes
  } = parent;
  var child = childNodes[index];
  var i = index;
  var triedForward = false;
  var triedBackward = false;
  while (isDOMComment(child) || isDOMElement(child) && child.childNodes.length === 0 || isDOMElement(child) && child.getAttribute("contenteditable") === "false") {
    if (triedForward && triedBackward) {
      break;
    }
    if (i >= childNodes.length) {
      triedForward = true;
      i = index - 1;
      direction = "backward";
      continue;
    }
    if (i < 0) {
      triedBackward = true;
      i = index + 1;
      direction = "forward";
      continue;
    }
    child = childNodes[i];
    index = i;
    i += direction === "forward" ? 1 : -1;
  }
  return [child, index];
};
var getEditableChild = (parent, index, direction) => {
  var [child] = getEditableChildAndIndex(parent, index, direction);
  return child;
};
var getPlainText = (domNode) => {
  var text = "";
  if (isDOMText(domNode) && domNode.nodeValue) {
    return domNode.nodeValue;
  }
  if (isDOMElement(domNode)) {
    for (var childNode of Array.from(domNode.childNodes)) {
      text += getPlainText(childNode);
    }
    var display = getComputedStyle(domNode).getPropertyValue("display");
    if (display === "block" || display === "list" || domNode.tagName === "BR") {
      text += "\n";
    }
  }
  return text;
};
var catchSlateFragment = /data-slate-fragment="(.+?)"/m;
var getSlateFragmentAttribute = (dataTransfer) => {
  var htmlData = dataTransfer.getData("text/html");
  var [, fragment] = htmlData.match(catchSlateFragment) || [];
  return fragment;
};
var getSelection = (root) => {
  if (root.getSelection != null) {
    return root.getSelection();
  }
  return document.getSelection();
};
var isTrackedMutation = (editor, mutation, batch) => {
  var {
    target
  } = mutation;
  if (isDOMElement(target) && target.matches('[contentEditable="false"]')) {
    return false;
  }
  var {
    document: document2
  } = DOMEditor.getWindow(editor);
  if (document2.contains(target)) {
    return DOMEditor.hasDOMNode(editor, target, {
      editable: true
    });
  }
  var parentMutation = batch.find((_ref) => {
    var {
      addedNodes,
      removedNodes
    } = _ref;
    for (var node of addedNodes) {
      if (node === target || node.contains(target)) {
        return true;
      }
    }
    for (var _node of removedNodes) {
      if (_node === target || _node.contains(target)) {
        return true;
      }
    }
  });
  if (!parentMutation || parentMutation === mutation) {
    return false;
  }
  return isTrackedMutation(editor, parentMutation, batch);
};
var getActiveElement = () => {
  var activeElement = document.activeElement;
  while ((_activeElement = activeElement) !== null && _activeElement !== void 0 && _activeElement.shadowRoot && (_activeElement$shadow = activeElement.shadowRoot) !== null && _activeElement$shadow !== void 0 && _activeElement$shadow.activeElement) {
    var _activeElement, _activeElement$shadow, _activeElement2;
    activeElement = (_activeElement2 = activeElement) === null || _activeElement2 === void 0 || (_activeElement2 = _activeElement2.shadowRoot) === null || _activeElement2 === void 0 ? void 0 : _activeElement2.activeElement;
  }
  return activeElement;
};
var isBefore = (node, otherNode) => Boolean(node.compareDocumentPosition(otherNode) & DOMNode.DOCUMENT_POSITION_PRECEDING);
var isAfter = (node, otherNode) => Boolean(node.compareDocumentPosition(otherNode) & DOMNode.DOCUMENT_POSITION_FOLLOWING);
var _navigator$userAgent$;
var _navigator$userAgent$2;
var IS_IOS = typeof navigator !== "undefined" && typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
var IS_APPLE = typeof navigator !== "undefined" && /Mac OS X/.test(navigator.userAgent);
var IS_ANDROID = typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
var IS_FIREFOX = typeof navigator !== "undefined" && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
var IS_WEBKIT = typeof navigator !== "undefined" && /AppleWebKit(?!.*Chrome)/i.test(navigator.userAgent);
var IS_EDGE_LEGACY = typeof navigator !== "undefined" && /Edge?\/(?:[0-6][0-9]|[0-7][0-8])(?:\.)/i.test(navigator.userAgent);
var IS_CHROME = typeof navigator !== "undefined" && /Chrome/i.test(navigator.userAgent);
var IS_CHROME_LEGACY = typeof navigator !== "undefined" && /Chrome?\/(?:[0-7][0-5]|[0-6][0-9])(?:\.)/i.test(navigator.userAgent);
var IS_ANDROID_CHROME_LEGACY = IS_ANDROID && typeof navigator !== "undefined" && /Chrome?\/(?:[0-5]?\d)(?:\.)/i.test(navigator.userAgent);
var IS_FIREFOX_LEGACY = typeof navigator !== "undefined" && /^(?!.*Seamonkey)(?=.*Firefox\/(?:[0-7][0-9]|[0-8][0-6])(?:\.)).*/i.test(navigator.userAgent);
var IS_UC_MOBILE = typeof navigator !== "undefined" && /.*UCBrowser/.test(navigator.userAgent);
var IS_WECHATBROWSER = typeof navigator !== "undefined" && /.*Wechat/.test(navigator.userAgent) && !/.*MacWechat/.test(navigator.userAgent);
var CAN_USE_DOM = !!(typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined");
typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && /Version\/(\d+)/.test(navigator.userAgent) && ((_navigator$userAgent$ = navigator.userAgent.match(/Version\/(\d+)/)) !== null && _navigator$userAgent$ !== void 0 && _navigator$userAgent$[1] ? parseInt((_navigator$userAgent$2 = navigator.userAgent.match(/Version\/(\d+)/)) === null || _navigator$userAgent$2 === void 0 ? void 0 : _navigator$userAgent$2[1], 10) < 17 : false);
var HAS_BEFORE_INPUT_SUPPORT = (!IS_CHROME_LEGACY || !IS_ANDROID_CHROME_LEGACY) && !IS_EDGE_LEGACY && // globalThis is undefined in older browsers
typeof globalThis !== "undefined" && globalThis.InputEvent && // @ts-ignore The `getTargetRanges` property isn't recognized.
typeof globalThis.InputEvent.prototype.getTargetRanges === "function";
function _typeof(o3) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o4) {
    return typeof o4;
  } : function(o4) {
    return o4 && "function" == typeof Symbol && o4.constructor === Symbol && o4 !== Symbol.prototype ? "symbol" : typeof o4;
  }, _typeof(o3);
}
function _toPrimitive(input, hint) {
  if (_typeof(input) !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input, hint || "default");
    if (_typeof(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return _typeof(key) === "symbol" ? key : String(key);
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
var n2 = 0;
var Key = class {
  constructor() {
    _defineProperty(this, "id", void 0);
    this.id = "".concat(n2++);
  }
};
var IS_NODE_MAP_DIRTY = /* @__PURE__ */ new WeakMap();
var NODE_TO_INDEX = /* @__PURE__ */ new WeakMap();
var NODE_TO_PARENT = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_WINDOW = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_ELEMENT = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_PLACEHOLDER_ELEMENT = /* @__PURE__ */ new WeakMap();
var ELEMENT_TO_NODE = /* @__PURE__ */ new WeakMap();
var NODE_TO_ELEMENT = /* @__PURE__ */ new WeakMap();
var NODE_TO_KEY = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_KEY_TO_ELEMENT = /* @__PURE__ */ new WeakMap();
var IS_READ_ONLY = /* @__PURE__ */ new WeakMap();
var IS_FOCUSED = /* @__PURE__ */ new WeakMap();
var IS_COMPOSING = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_USER_SELECTION = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_ON_CHANGE = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_SCHEDULE_FLUSH = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_PENDING_INSERTION_MARKS = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_USER_MARKS = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_PENDING_DIFFS = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_PENDING_ACTION = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_PENDING_SELECTION = /* @__PURE__ */ new WeakMap();
var EDITOR_TO_FORCE_RENDER = /* @__PURE__ */ new WeakMap();
var PLACEHOLDER_SYMBOL = Symbol("placeholder");
var MARK_PLACEHOLDER_SYMBOL = Symbol("mark-placeholder");
var DOMEditor = {
  androidPendingDiffs: (editor) => EDITOR_TO_PENDING_DIFFS.get(editor),
  androidScheduleFlush: (editor) => {
    var _EDITOR_TO_SCHEDULE_F;
    (_EDITOR_TO_SCHEDULE_F = EDITOR_TO_SCHEDULE_FLUSH.get(editor)) === null || _EDITOR_TO_SCHEDULE_F === void 0 || _EDITOR_TO_SCHEDULE_F();
  },
  blur: (editor) => {
    var el = DOMEditor.toDOMNode(editor, editor);
    var root = DOMEditor.findDocumentOrShadowRoot(editor);
    IS_FOCUSED.set(editor, false);
    if (root.activeElement === el) {
      el.blur();
    }
  },
  deselect: (editor) => {
    var {
      selection
    } = editor;
    var root = DOMEditor.findDocumentOrShadowRoot(editor);
    var domSelection = getSelection(root);
    if (domSelection && domSelection.rangeCount > 0) {
      domSelection.removeAllRanges();
    }
    if (selection) {
      Transforms.deselect(editor);
    }
  },
  findDocumentOrShadowRoot: (editor) => {
    var el = DOMEditor.toDOMNode(editor, editor);
    var root = el.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      return root;
    }
    return el.ownerDocument;
  },
  findEventRange: (editor, event) => {
    if ("nativeEvent" in event) {
      event = event.nativeEvent;
    }
    var {
      clientX: x,
      clientY: y,
      target
    } = event;
    if (x == null || y == null) {
      throw new Error("Cannot resolve a Slate range from a DOM event: ".concat(event));
    }
    var node = DOMEditor.toSlateNode(editor, event.target);
    var path = DOMEditor.findPath(editor, node);
    if (Element2.isElement(node) && Editor.isVoid(editor, node)) {
      var rect = target.getBoundingClientRect();
      var isPrev = editor.isInline(node) ? x - rect.left < rect.left + rect.width - x : y - rect.top < rect.top + rect.height - y;
      var edge = Editor.point(editor, path, {
        edge: isPrev ? "start" : "end"
      });
      var point = isPrev ? Editor.before(editor, edge) : Editor.after(editor, edge);
      if (point) {
        var _range = Editor.range(editor, point);
        return _range;
      }
    }
    var domRange;
    var {
      document: document2
    } = DOMEditor.getWindow(editor);
    if (document2.caretRangeFromPoint) {
      domRange = document2.caretRangeFromPoint(x, y);
    } else {
      var position = document2.caretPositionFromPoint(x, y);
      if (position) {
        domRange = document2.createRange();
        domRange.setStart(position.offsetNode, position.offset);
        domRange.setEnd(position.offsetNode, position.offset);
      }
    }
    if (!domRange) {
      throw new Error("Cannot resolve a Slate range from a DOM event: ".concat(event));
    }
    var range = DOMEditor.toSlateRange(editor, domRange, {
      exactMatch: false,
      suppressThrow: false
    });
    return range;
  },
  findKey: (editor, node) => {
    var key = NODE_TO_KEY.get(node);
    if (!key) {
      key = new Key();
      NODE_TO_KEY.set(node, key);
    }
    return key;
  },
  findPath: (editor, node) => {
    var path = [];
    var child = node;
    while (true) {
      var parent = NODE_TO_PARENT.get(child);
      if (parent == null) {
        if (Editor.isEditor(child)) {
          return path;
        } else {
          break;
        }
      }
      var i = NODE_TO_INDEX.get(child);
      if (i == null) {
        break;
      }
      path.unshift(i);
      child = parent;
    }
    throw new Error("Unable to find the path for Slate node: ".concat(Scrubber.stringify(node)));
  },
  focus: function focus(editor) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
      retries: 5
    };
    if (IS_FOCUSED.get(editor)) {
      return;
    }
    if (options.retries <= 0) {
      throw new Error("Could not set focus, editor seems stuck with pending operations");
    }
    if (editor.operations.length > 0) {
      setTimeout(() => {
        DOMEditor.focus(editor, {
          retries: options.retries - 1
        });
      }, 10);
      return;
    }
    var el = DOMEditor.toDOMNode(editor, editor);
    var root = DOMEditor.findDocumentOrShadowRoot(editor);
    if (root.activeElement !== el) {
      if (editor.selection && root instanceof Document) {
        var domSelection = getSelection(root);
        var domRange = DOMEditor.toDOMRange(editor, editor.selection);
        domSelection === null || domSelection === void 0 || domSelection.removeAllRanges();
        domSelection === null || domSelection === void 0 || domSelection.addRange(domRange);
      }
      if (!editor.selection) {
        Transforms.select(editor, Editor.start(editor, []));
      }
      IS_FOCUSED.set(editor, true);
      el.focus({
        preventScroll: true
      });
    }
  },
  getWindow: (editor) => {
    var window2 = EDITOR_TO_WINDOW.get(editor);
    if (!window2) {
      throw new Error("Unable to find a host window element for this editor");
    }
    return window2;
  },
  hasDOMNode: function hasDOMNode(editor, target) {
    var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    var {
      editable = false
    } = options;
    var editorEl = DOMEditor.toDOMNode(editor, editor);
    var targetEl;
    try {
      targetEl = isDOMElement(target) ? target : target.parentElement;
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Permission denied to access property "nodeType"')) {
        throw err;
      }
    }
    if (!targetEl) {
      return false;
    }
    return targetEl.closest("[data-slate-editor]") === editorEl && (!editable || targetEl.isContentEditable ? true : typeof targetEl.isContentEditable === "boolean" && // isContentEditable exists only on HTMLElement, and on other nodes it will be undefined
    // this is the core logic that lets you know you got the right editor.selection instead of null when editor is contenteditable="false"(readOnly)
    targetEl.closest('[contenteditable="false"]') === editorEl || !!targetEl.getAttribute("data-slate-zero-width"));
  },
  hasEditableTarget: (editor, target) => isDOMNode(target) && DOMEditor.hasDOMNode(editor, target, {
    editable: true
  }),
  hasRange: (editor, range) => {
    var {
      anchor,
      focus: focus2
    } = range;
    return Editor.hasPath(editor, anchor.path) && Editor.hasPath(editor, focus2.path);
  },
  hasSelectableTarget: (editor, target) => DOMEditor.hasEditableTarget(editor, target) || DOMEditor.isTargetInsideNonReadonlyVoid(editor, target),
  hasTarget: (editor, target) => isDOMNode(target) && DOMEditor.hasDOMNode(editor, target),
  insertData: (editor, data) => {
    editor.insertData(data);
  },
  insertFragmentData: (editor, data) => editor.insertFragmentData(data),
  insertTextData: (editor, data) => editor.insertTextData(data),
  isComposing: (editor) => {
    return !!IS_COMPOSING.get(editor);
  },
  isFocused: (editor) => !!IS_FOCUSED.get(editor),
  isReadOnly: (editor) => !!IS_READ_ONLY.get(editor),
  isTargetInsideNonReadonlyVoid: (editor, target) => {
    if (IS_READ_ONLY.get(editor)) return false;
    var slateNode = DOMEditor.hasTarget(editor, target) && DOMEditor.toSlateNode(editor, target);
    return Element2.isElement(slateNode) && Editor.isVoid(editor, slateNode);
  },
  setFragmentData: (editor, data, originEvent) => editor.setFragmentData(data, originEvent),
  toDOMNode: (editor, node) => {
    var KEY_TO_ELEMENT = EDITOR_TO_KEY_TO_ELEMENT.get(editor);
    var domNode = Editor.isEditor(node) ? EDITOR_TO_ELEMENT.get(editor) : KEY_TO_ELEMENT === null || KEY_TO_ELEMENT === void 0 ? void 0 : KEY_TO_ELEMENT.get(DOMEditor.findKey(editor, node));
    if (!domNode) {
      throw new Error("Cannot resolve a DOM node from Slate node: ".concat(Scrubber.stringify(node)));
    }
    return domNode;
  },
  toDOMPoint: (editor, point) => {
    var [node] = Editor.node(editor, point.path);
    var el = DOMEditor.toDOMNode(editor, node);
    var domPoint;
    if (Editor.void(editor, {
      at: point
    })) {
      point = {
        path: point.path,
        offset: 0
      };
    }
    var selector = "[data-slate-string], [data-slate-zero-width]";
    var texts = Array.from(el.querySelectorAll(selector));
    var start = 0;
    for (var i = 0; i < texts.length; i++) {
      var text = texts[i];
      var domNode = text.childNodes[0];
      if (domNode == null || domNode.textContent == null) {
        continue;
      }
      var {
        length
      } = domNode.textContent;
      var attr = text.getAttribute("data-slate-length");
      var trueLength = attr == null ? length : parseInt(attr, 10);
      var end = start + trueLength;
      var nextText = texts[i + 1];
      if (point.offset === end && nextText !== null && nextText !== void 0 && nextText.hasAttribute("data-slate-mark-placeholder")) {
        var _nextText$textContent;
        var domText = nextText.childNodes[0];
        domPoint = [
          // COMPAT: If we don't explicity set the dom point to be on the actual
          // dom text element, chrome will put the selection behind the actual dom
          // text element, causing domRange.getBoundingClientRect() calls on a collapsed
          // selection to return incorrect zero values (https://bugs.chromium.org/p/chromium/issues/detail?id=435438)
          // which will cause issues when scrolling to it.
          domText instanceof DOMText ? domText : nextText,
          (_nextText$textContent = nextText.textContent) !== null && _nextText$textContent !== void 0 && _nextText$textContent.startsWith("\uFEFF") ? 1 : 0
        ];
        break;
      }
      if (point.offset <= end) {
        var offset = Math.min(length, Math.max(0, point.offset - start));
        domPoint = [domNode, offset];
        break;
      }
      start = end;
    }
    if (!domPoint) {
      throw new Error("Cannot resolve a DOM point from Slate point: ".concat(Scrubber.stringify(point)));
    }
    return domPoint;
  },
  toDOMRange: (editor, range) => {
    var {
      anchor,
      focus: focus2
    } = range;
    var isBackward = Range.isBackward(range);
    var domAnchor = DOMEditor.toDOMPoint(editor, anchor);
    var domFocus = Range.isCollapsed(range) ? domAnchor : DOMEditor.toDOMPoint(editor, focus2);
    var window2 = DOMEditor.getWindow(editor);
    var domRange = window2.document.createRange();
    var [startNode, startOffset] = isBackward ? domFocus : domAnchor;
    var [endNode, endOffset] = isBackward ? domAnchor : domFocus;
    var startEl = isDOMElement(startNode) ? startNode : startNode.parentElement;
    var isStartAtZeroWidth = !!startEl.getAttribute("data-slate-zero-width");
    var endEl = isDOMElement(endNode) ? endNode : endNode.parentElement;
    var isEndAtZeroWidth = !!endEl.getAttribute("data-slate-zero-width");
    domRange.setStart(startNode, isStartAtZeroWidth ? 1 : startOffset);
    domRange.setEnd(endNode, isEndAtZeroWidth ? 1 : endOffset);
    return domRange;
  },
  toSlateNode: (editor, domNode) => {
    var domEl = isDOMElement(domNode) ? domNode : domNode.parentElement;
    if (domEl && !domEl.hasAttribute("data-slate-node")) {
      domEl = domEl.closest("[data-slate-node]");
    }
    var node = domEl ? ELEMENT_TO_NODE.get(domEl) : null;
    if (!node) {
      throw new Error("Cannot resolve a Slate node from DOM node: ".concat(domEl));
    }
    return node;
  },
  toSlatePoint: (editor, domPoint, options) => {
    var {
      exactMatch,
      suppressThrow,
      searchDirection = "backward"
    } = options;
    var [nearestNode, nearestOffset] = exactMatch ? domPoint : normalizeDOMPoint(domPoint);
    var parentNode = nearestNode.parentNode;
    var textNode = null;
    var offset = 0;
    if (parentNode) {
      var _domNode$textContent, _domNode$textContent2;
      var editorEl = DOMEditor.toDOMNode(editor, editor);
      var potentialVoidNode = parentNode.closest('[data-slate-void="true"]');
      var voidNode = potentialVoidNode && editorEl.contains(potentialVoidNode) ? potentialVoidNode : null;
      var potentialNonEditableNode = parentNode.closest('[contenteditable="false"]');
      var nonEditableNode = potentialNonEditableNode && editorEl.contains(potentialNonEditableNode) ? potentialNonEditableNode : null;
      var leafNode = parentNode.closest("[data-slate-leaf]");
      var domNode = null;
      if (leafNode) {
        textNode = leafNode.closest('[data-slate-node="text"]');
        if (textNode) {
          var window2 = DOMEditor.getWindow(editor);
          var range = window2.document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(nearestNode, nearestOffset);
          var contents = range.cloneContents();
          var removals = [...Array.prototype.slice.call(contents.querySelectorAll("[data-slate-zero-width]")), ...Array.prototype.slice.call(contents.querySelectorAll("[contenteditable=false]"))];
          removals.forEach((el) => {
            if (IS_ANDROID && !exactMatch && el.hasAttribute("data-slate-zero-width") && el.textContent.length > 0 && el.textContext !== "\uFEFF") {
              if (el.textContent.startsWith("\uFEFF")) {
                el.textContent = el.textContent.slice(1);
              }
              return;
            }
            el.parentNode.removeChild(el);
          });
          offset = contents.textContent.length;
          domNode = textNode;
        }
      } else if (voidNode) {
        var leafNodes = voidNode.querySelectorAll("[data-slate-leaf]");
        for (var index = 0; index < leafNodes.length; index++) {
          var current = leafNodes[index];
          if (DOMEditor.hasDOMNode(editor, current)) {
            leafNode = current;
            break;
          }
        }
        if (!leafNode) {
          offset = 1;
        } else {
          textNode = leafNode.closest('[data-slate-node="text"]');
          domNode = leafNode;
          offset = domNode.textContent.length;
          domNode.querySelectorAll("[data-slate-zero-width]").forEach((el) => {
            offset -= el.textContent.length;
          });
        }
      } else if (nonEditableNode) {
        var getLeafNodes = (node2) => node2 ? node2.querySelectorAll(
          // Exclude leaf nodes in nested editors
          "[data-slate-leaf]:not(:scope [data-slate-editor] [data-slate-leaf])"
        ) : [];
        var elementNode = nonEditableNode.closest('[data-slate-node="element"]');
        if (searchDirection === "forward") {
          var _leafNodes$find;
          var _leafNodes = [...getLeafNodes(elementNode), ...getLeafNodes(elementNode === null || elementNode === void 0 ? void 0 : elementNode.nextElementSibling)];
          leafNode = (_leafNodes$find = _leafNodes.find((leaf) => isAfter(nonEditableNode, leaf))) !== null && _leafNodes$find !== void 0 ? _leafNodes$find : null;
        } else {
          var _leafNodes2$findLast;
          var _leafNodes2 = [...getLeafNodes(elementNode === null || elementNode === void 0 ? void 0 : elementNode.previousElementSibling), ...getLeafNodes(elementNode)];
          leafNode = (_leafNodes2$findLast = _leafNodes2.findLast((leaf) => isBefore(nonEditableNode, leaf))) !== null && _leafNodes2$findLast !== void 0 ? _leafNodes2$findLast : null;
        }
        if (leafNode) {
          textNode = leafNode.closest('[data-slate-node="text"]');
          domNode = leafNode;
          if (searchDirection === "forward") {
            offset = 0;
          } else {
            offset = domNode.textContent.length;
            domNode.querySelectorAll("[data-slate-zero-width]").forEach((el) => {
              offset -= el.textContent.length;
            });
          }
        }
      }
      if (domNode && offset === domNode.textContent.length && // COMPAT: Android IMEs might remove the zero width space while composing,
      // and we don't add it for line-breaks.
      IS_ANDROID && domNode.getAttribute("data-slate-zero-width") === "z" && (_domNode$textContent = domNode.textContent) !== null && _domNode$textContent !== void 0 && _domNode$textContent.startsWith("\uFEFF") && // COMPAT: If the parent node is a Slate zero-width space, editor is
      // because the text node should have no characters. However, during IME
      // composition the ASCII characters will be prepended to the zero-width
      // space, so subtract 1 from the offset to account for the zero-width
      // space character.
      (parentNode.hasAttribute("data-slate-zero-width") || // COMPAT: In Firefox, `range.cloneContents()` returns an extra trailing '\n'
      // when the document ends with a new-line character. This results in the offset
      // length being off by one, so we need to subtract one to account for this.
      IS_FIREFOX && (_domNode$textContent2 = domNode.textContent) !== null && _domNode$textContent2 !== void 0 && _domNode$textContent2.endsWith("\n\n"))) {
        offset--;
      }
    }
    if (IS_ANDROID && !textNode && !exactMatch) {
      var node = parentNode.hasAttribute("data-slate-node") ? parentNode : parentNode.closest("[data-slate-node]");
      if (node && DOMEditor.hasDOMNode(editor, node, {
        editable: true
      })) {
        var _slateNode = DOMEditor.toSlateNode(editor, node);
        var {
          path: _path,
          offset: _offset
        } = Editor.start(editor, DOMEditor.findPath(editor, _slateNode));
        if (!node.querySelector("[data-slate-leaf]")) {
          _offset = nearestOffset;
        }
        return {
          path: _path,
          offset: _offset
        };
      }
    }
    if (!textNode) {
      if (suppressThrow) {
        return null;
      }
      throw new Error("Cannot resolve a Slate point from DOM point: ".concat(domPoint));
    }
    var slateNode = DOMEditor.toSlateNode(editor, textNode);
    var path = DOMEditor.findPath(editor, slateNode);
    return {
      path,
      offset
    };
  },
  toSlateRange: (editor, domRange, options) => {
    var _focusNode$textConten;
    var {
      exactMatch,
      suppressThrow
    } = options;
    var el = isDOMSelection(domRange) ? domRange.anchorNode : domRange.startContainer;
    var anchorNode;
    var anchorOffset;
    var focusNode;
    var focusOffset;
    var isCollapsed;
    if (el) {
      if (isDOMSelection(domRange)) {
        if (IS_FIREFOX && domRange.rangeCount > 1) {
          focusNode = domRange.focusNode;
          var firstRange = domRange.getRangeAt(0);
          var lastRange = domRange.getRangeAt(domRange.rangeCount - 1);
          if (focusNode instanceof HTMLTableRowElement && firstRange.startContainer instanceof HTMLTableRowElement && lastRange.startContainer instanceof HTMLTableRowElement) {
            let getLastChildren = function(element) {
              if (element.childElementCount > 0) {
                return getLastChildren(element.children[0]);
              } else {
                return element;
              }
            };
            var firstNodeRow = firstRange.startContainer;
            var lastNodeRow = lastRange.startContainer;
            var firstNode = getLastChildren(firstNodeRow.children[firstRange.startOffset]);
            var lastNode = getLastChildren(lastNodeRow.children[lastRange.startOffset]);
            focusOffset = 0;
            if (lastNode.childNodes.length > 0) {
              anchorNode = lastNode.childNodes[0];
            } else {
              anchorNode = lastNode;
            }
            if (firstNode.childNodes.length > 0) {
              focusNode = firstNode.childNodes[0];
            } else {
              focusNode = firstNode;
            }
            if (lastNode instanceof HTMLElement) {
              anchorOffset = lastNode.innerHTML.length;
            } else {
              anchorOffset = 0;
            }
          } else {
            if (firstRange.startContainer === focusNode) {
              anchorNode = lastRange.endContainer;
              anchorOffset = lastRange.endOffset;
              focusOffset = firstRange.startOffset;
            } else {
              anchorNode = firstRange.startContainer;
              anchorOffset = firstRange.endOffset;
              focusOffset = lastRange.startOffset;
            }
          }
        } else {
          anchorNode = domRange.anchorNode;
          anchorOffset = domRange.anchorOffset;
          focusNode = domRange.focusNode;
          focusOffset = domRange.focusOffset;
        }
        if (IS_CHROME && hasShadowRoot(anchorNode) || IS_FIREFOX) {
          isCollapsed = domRange.anchorNode === domRange.focusNode && domRange.anchorOffset === domRange.focusOffset;
        } else {
          isCollapsed = domRange.isCollapsed;
        }
      } else {
        anchorNode = domRange.startContainer;
        anchorOffset = domRange.startOffset;
        focusNode = domRange.endContainer;
        focusOffset = domRange.endOffset;
        isCollapsed = domRange.collapsed;
      }
    }
    if (anchorNode == null || focusNode == null || anchorOffset == null || focusOffset == null) {
      throw new Error("Cannot resolve a Slate range from DOM range: ".concat(domRange));
    }
    if (IS_FIREFOX && (_focusNode$textConten = focusNode.textContent) !== null && _focusNode$textConten !== void 0 && _focusNode$textConten.endsWith("\n\n") && focusOffset === focusNode.textContent.length) {
      focusOffset--;
    }
    var anchor = DOMEditor.toSlatePoint(editor, [anchorNode, anchorOffset], {
      exactMatch,
      suppressThrow
    });
    if (!anchor) {
      return null;
    }
    var focusBeforeAnchor = isBefore(anchorNode, focusNode) || anchorNode === focusNode && focusOffset < anchorOffset;
    var focus2 = isCollapsed ? anchor : DOMEditor.toSlatePoint(editor, [focusNode, focusOffset], {
      exactMatch,
      suppressThrow,
      searchDirection: focusBeforeAnchor ? "forward" : "backward"
    });
    if (!focus2) {
      return null;
    }
    var range = {
      anchor,
      focus: focus2
    };
    if (Range.isExpanded(range) && Range.isForward(range) && isDOMElement(focusNode) && Editor.void(editor, {
      at: range.focus,
      mode: "highest"
    })) {
      range = Editor.unhangRange(editor, range, {
        voids: true
      });
    }
    return range;
  }
};
function verifyDiffState(editor, textDiff) {
  var {
    path,
    diff
  } = textDiff;
  if (!Editor.hasPath(editor, path)) {
    return false;
  }
  var node = Node.get(editor, path);
  if (!Text.isText(node)) {
    return false;
  }
  if (diff.start !== node.text.length || diff.text.length === 0) {
    return node.text.slice(diff.start, diff.start + diff.text.length) === diff.text;
  }
  var nextPath = Path.next(path);
  if (!Editor.hasPath(editor, nextPath)) {
    return false;
  }
  var nextNode = Node.get(editor, nextPath);
  return Text.isText(nextNode) && nextNode.text.startsWith(diff.text);
}
function applyStringDiff(text) {
  for (var _len = arguments.length, diffs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    diffs[_key - 1] = arguments[_key];
  }
  return diffs.reduce((text2, diff) => text2.slice(0, diff.start) + diff.text + text2.slice(diff.end), text);
}
function longestCommonPrefixLength(str, another) {
  var length = Math.min(str.length, another.length);
  for (var i = 0; i < length; i++) {
    if (str.charAt(i) !== another.charAt(i)) {
      return i;
    }
  }
  return length;
}
function longestCommonSuffixLength(str, another, max) {
  var length = Math.min(str.length, another.length, max);
  for (var i = 0; i < length; i++) {
    if (str.charAt(str.length - i - 1) !== another.charAt(another.length - i - 1)) {
      return i;
    }
  }
  return length;
}
function normalizeStringDiff(targetText, diff) {
  var {
    start,
    end,
    text
  } = diff;
  var removedText = targetText.slice(start, end);
  var prefixLength = longestCommonPrefixLength(removedText, text);
  var max = Math.min(removedText.length - prefixLength, text.length - prefixLength);
  var suffixLength = longestCommonSuffixLength(removedText, text, max);
  var normalized = {
    start: start + prefixLength,
    end: end - suffixLength,
    text: text.slice(prefixLength, text.length - suffixLength)
  };
  if (normalized.start === normalized.end && normalized.text.length === 0) {
    return null;
  }
  return normalized;
}
function mergeStringDiffs(targetText, a, b) {
  var start = Math.min(a.start, b.start);
  var overlap = Math.max(0, Math.min(a.start + a.text.length, b.end) - b.start);
  var applied = applyStringDiff(targetText, a, b);
  var sliceEnd = Math.max(b.start + b.text.length, a.start + a.text.length + (a.start + a.text.length > b.start ? b.text.length : 0) - overlap);
  var text = applied.slice(start, sliceEnd);
  var end = Math.max(a.end, b.end - a.text.length + (a.end - a.start));
  return normalizeStringDiff(targetText, {
    start,
    end,
    text
  });
}
function targetRange(textDiff) {
  var {
    path,
    diff
  } = textDiff;
  return {
    anchor: {
      path,
      offset: diff.start
    },
    focus: {
      path,
      offset: diff.end
    }
  };
}
function normalizePoint(editor, point) {
  var {
    path,
    offset
  } = point;
  if (!Editor.hasPath(editor, path)) {
    return null;
  }
  var leaf = Node.get(editor, path);
  if (!Text.isText(leaf)) {
    return null;
  }
  var parentBlock = Editor.above(editor, {
    match: (n3) => Element2.isElement(n3) && Editor.isBlock(editor, n3),
    at: path
  });
  if (!parentBlock) {
    return null;
  }
  while (offset > leaf.text.length) {
    var entry = Editor.next(editor, {
      at: path,
      match: Text.isText
    });
    if (!entry || !Path.isDescendant(entry[1], parentBlock[1])) {
      return null;
    }
    offset -= leaf.text.length;
    leaf = entry[0];
    path = entry[1];
  }
  return {
    path,
    offset
  };
}
function normalizeRange(editor, range) {
  var anchor = normalizePoint(editor, range.anchor);
  if (!anchor) {
    return null;
  }
  if (Range.isCollapsed(range)) {
    return {
      anchor,
      focus: anchor
    };
  }
  var focus2 = normalizePoint(editor, range.focus);
  if (!focus2) {
    return null;
  }
  return {
    anchor,
    focus: focus2
  };
}
function transformPendingPoint(editor, point, op) {
  var pendingDiffs = EDITOR_TO_PENDING_DIFFS.get(editor);
  var textDiff = pendingDiffs === null || pendingDiffs === void 0 ? void 0 : pendingDiffs.find((_ref) => {
    var {
      path
    } = _ref;
    return Path.equals(path, point.path);
  });
  if (!textDiff || point.offset <= textDiff.diff.start) {
    return Point.transform(point, op, {
      affinity: "backward"
    });
  }
  var {
    diff
  } = textDiff;
  if (point.offset <= diff.start + diff.text.length) {
    var _anchor = {
      path: point.path,
      offset: diff.start
    };
    var _transformed = Point.transform(_anchor, op, {
      affinity: "backward"
    });
    if (!_transformed) {
      return null;
    }
    return {
      path: _transformed.path,
      offset: _transformed.offset + point.offset - diff.start
    };
  }
  var anchor = {
    path: point.path,
    offset: point.offset - diff.text.length + diff.end - diff.start
  };
  var transformed = Point.transform(anchor, op, {
    affinity: "backward"
  });
  if (!transformed) {
    return null;
  }
  if (op.type === "split_node" && Path.equals(op.path, point.path) && anchor.offset < op.position && diff.start < op.position) {
    return transformed;
  }
  return {
    path: transformed.path,
    offset: transformed.offset + diff.text.length - diff.end + diff.start
  };
}
function transformPendingRange(editor, range, op) {
  var anchor = transformPendingPoint(editor, range.anchor, op);
  if (!anchor) {
    return null;
  }
  if (Range.isCollapsed(range)) {
    return {
      anchor,
      focus: anchor
    };
  }
  var focus2 = transformPendingPoint(editor, range.focus, op);
  if (!focus2) {
    return null;
  }
  return {
    anchor,
    focus: focus2
  };
}
function transformTextDiff(textDiff, op) {
  var {
    path,
    diff,
    id
  } = textDiff;
  switch (op.type) {
    case "insert_text": {
      if (!Path.equals(op.path, path) || op.offset >= diff.end) {
        return textDiff;
      }
      if (op.offset <= diff.start) {
        return {
          diff: {
            start: op.text.length + diff.start,
            end: op.text.length + diff.end,
            text: diff.text
          },
          id,
          path
        };
      }
      return {
        diff: {
          start: diff.start,
          end: diff.end + op.text.length,
          text: diff.text
        },
        id,
        path
      };
    }
    case "remove_text": {
      if (!Path.equals(op.path, path) || op.offset >= diff.end) {
        return textDiff;
      }
      if (op.offset + op.text.length <= diff.start) {
        return {
          diff: {
            start: diff.start - op.text.length,
            end: diff.end - op.text.length,
            text: diff.text
          },
          id,
          path
        };
      }
      return {
        diff: {
          start: diff.start,
          end: diff.end - op.text.length,
          text: diff.text
        },
        id,
        path
      };
    }
    case "split_node": {
      if (!Path.equals(op.path, path) || op.position >= diff.end) {
        return {
          diff,
          id,
          path: Path.transform(path, op, {
            affinity: "backward"
          })
        };
      }
      if (op.position > diff.start) {
        return {
          diff: {
            start: diff.start,
            end: Math.min(op.position, diff.end),
            text: diff.text
          },
          id,
          path
        };
      }
      return {
        diff: {
          start: diff.start - op.position,
          end: diff.end - op.position,
          text: diff.text
        },
        id,
        path: Path.transform(path, op, {
          affinity: "forward"
        })
      };
    }
    case "merge_node": {
      if (!Path.equals(op.path, path)) {
        return {
          diff,
          id,
          path: Path.transform(path, op)
        };
      }
      return {
        diff: {
          start: diff.start + op.position,
          end: diff.end + op.position,
          text: diff.text
        },
        id,
        path: Path.transform(path, op)
      };
    }
  }
  var newPath = Path.transform(path, op);
  if (!newPath) {
    return null;
  }
  return {
    diff,
    path: newPath,
    id
  };
}
var doRectsIntersect = (rect, compareRect) => {
  var middle = (compareRect.top + compareRect.bottom) / 2;
  return rect.top <= middle && rect.bottom >= middle;
};
var areRangesSameLine = (editor, range1, range2) => {
  var rect1 = DOMEditor.toDOMRange(editor, range1).getBoundingClientRect();
  var rect2 = DOMEditor.toDOMRange(editor, range2).getBoundingClientRect();
  return doRectsIntersect(rect1, rect2) && doRectsIntersect(rect2, rect1);
};
var findCurrentLineRange = (editor, parentRange) => {
  var parentRangeBoundary = Editor.range(editor, Range.end(parentRange));
  var positions = Array.from(Editor.positions(editor, {
    at: parentRange
  }));
  var left = 0;
  var right = positions.length;
  var middle = Math.floor(right / 2);
  if (areRangesSameLine(editor, Editor.range(editor, positions[left]), parentRangeBoundary)) {
    return Editor.range(editor, positions[left], parentRangeBoundary);
  }
  if (positions.length < 2) {
    return Editor.range(editor, positions[positions.length - 1], parentRangeBoundary);
  }
  while (middle !== positions.length && middle !== left) {
    if (areRangesSameLine(editor, Editor.range(editor, positions[middle]), parentRangeBoundary)) {
      right = middle;
    } else {
      left = middle;
    }
    middle = Math.floor((left + right) / 2);
  }
  return Editor.range(editor, positions[right], parentRangeBoundary);
};
function ownKeys(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys(Object(t2), true).forEach(function(r3) {
      _defineProperty(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var withDOM = function withDOM2(editor) {
  var clipboardFormatKey = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "x-slate-fragment";
  var e3 = editor;
  var {
    apply,
    onChange,
    deleteBackward,
    addMark,
    removeMark
  } = e3;
  EDITOR_TO_KEY_TO_ELEMENT.set(e3, /* @__PURE__ */ new WeakMap());
  e3.addMark = (key, value) => {
    var _EDITOR_TO_SCHEDULE_F, _EDITOR_TO_PENDING_DI;
    (_EDITOR_TO_SCHEDULE_F = EDITOR_TO_SCHEDULE_FLUSH.get(e3)) === null || _EDITOR_TO_SCHEDULE_F === void 0 || _EDITOR_TO_SCHEDULE_F();
    if (!EDITOR_TO_PENDING_INSERTION_MARKS.get(e3) && (_EDITOR_TO_PENDING_DI = EDITOR_TO_PENDING_DIFFS.get(e3)) !== null && _EDITOR_TO_PENDING_DI !== void 0 && _EDITOR_TO_PENDING_DI.length) {
      EDITOR_TO_PENDING_INSERTION_MARKS.set(e3, null);
    }
    EDITOR_TO_USER_MARKS.delete(e3);
    addMark(key, value);
  };
  e3.removeMark = (key) => {
    var _EDITOR_TO_PENDING_DI2;
    if (!EDITOR_TO_PENDING_INSERTION_MARKS.get(e3) && (_EDITOR_TO_PENDING_DI2 = EDITOR_TO_PENDING_DIFFS.get(e3)) !== null && _EDITOR_TO_PENDING_DI2 !== void 0 && _EDITOR_TO_PENDING_DI2.length) {
      EDITOR_TO_PENDING_INSERTION_MARKS.set(e3, null);
    }
    EDITOR_TO_USER_MARKS.delete(e3);
    removeMark(key);
  };
  e3.deleteBackward = (unit) => {
    if (unit !== "line") {
      return deleteBackward(unit);
    }
    if (e3.selection && Range.isCollapsed(e3.selection)) {
      var parentBlockEntry = Editor.above(e3, {
        match: (n3) => Element2.isElement(n3) && Editor.isBlock(e3, n3),
        at: e3.selection
      });
      if (parentBlockEntry) {
        var [, parentBlockPath] = parentBlockEntry;
        var parentElementRange = Editor.range(e3, parentBlockPath, e3.selection.anchor);
        var currentLineRange = findCurrentLineRange(e3, parentElementRange);
        if (!Range.isCollapsed(currentLineRange)) {
          Transforms.delete(e3, {
            at: currentLineRange
          });
        }
      }
    }
  };
  e3.apply = (op) => {
    var matches = [];
    var pathRefMatches = [];
    var pendingDiffs = EDITOR_TO_PENDING_DIFFS.get(e3);
    if (pendingDiffs !== null && pendingDiffs !== void 0 && pendingDiffs.length) {
      var transformed = pendingDiffs.map((textDiff) => transformTextDiff(textDiff, op)).filter(Boolean);
      EDITOR_TO_PENDING_DIFFS.set(e3, transformed);
    }
    var pendingSelection = EDITOR_TO_PENDING_SELECTION.get(e3);
    if (pendingSelection) {
      EDITOR_TO_PENDING_SELECTION.set(e3, transformPendingRange(e3, pendingSelection, op));
    }
    var pendingAction = EDITOR_TO_PENDING_ACTION.get(e3);
    if (pendingAction !== null && pendingAction !== void 0 && pendingAction.at) {
      var at = Point.isPoint(pendingAction === null || pendingAction === void 0 ? void 0 : pendingAction.at) ? transformPendingPoint(e3, pendingAction.at, op) : transformPendingRange(e3, pendingAction.at, op);
      EDITOR_TO_PENDING_ACTION.set(e3, at ? _objectSpread(_objectSpread({}, pendingAction), {}, {
        at
      }) : null);
    }
    switch (op.type) {
      case "insert_text":
      case "remove_text":
      case "set_node":
      case "split_node": {
        matches.push(...getMatches(e3, op.path));
        break;
      }
      case "set_selection": {
        var _EDITOR_TO_USER_SELEC;
        (_EDITOR_TO_USER_SELEC = EDITOR_TO_USER_SELECTION.get(e3)) === null || _EDITOR_TO_USER_SELEC === void 0 || _EDITOR_TO_USER_SELEC.unref();
        EDITOR_TO_USER_SELECTION.delete(e3);
        break;
      }
      case "insert_node":
      case "remove_node": {
        matches.push(...getMatches(e3, Path.parent(op.path)));
        break;
      }
      case "merge_node": {
        var prevPath = Path.previous(op.path);
        matches.push(...getMatches(e3, prevPath));
        break;
      }
      case "move_node": {
        var commonPath = Path.common(Path.parent(op.path), Path.parent(op.newPath));
        matches.push(...getMatches(e3, commonPath));
        var changedPath;
        if (Path.isBefore(op.path, op.newPath)) {
          matches.push(...getMatches(e3, Path.parent(op.path)));
          changedPath = op.newPath;
        } else {
          matches.push(...getMatches(e3, Path.parent(op.newPath)));
          changedPath = op.path;
        }
        var changedNode = Node.get(editor, Path.parent(changedPath));
        var changedNodeKey = DOMEditor.findKey(e3, changedNode);
        var changedPathRef = Editor.pathRef(e3, Path.parent(changedPath));
        pathRefMatches.push([changedPathRef, changedNodeKey]);
        break;
      }
    }
    apply(op);
    switch (op.type) {
      case "insert_node":
      case "remove_node":
      case "merge_node":
      case "move_node":
      case "split_node": {
        IS_NODE_MAP_DIRTY.set(e3, true);
      }
    }
    for (var [path, key] of matches) {
      var [node] = Editor.node(e3, path);
      NODE_TO_KEY.set(node, key);
    }
    for (var [pathRef, _key] of pathRefMatches) {
      if (pathRef.current) {
        var [_node] = Editor.node(e3, pathRef.current);
        NODE_TO_KEY.set(_node, _key);
      }
      pathRef.unref();
    }
  };
  e3.setFragmentData = (data) => {
    var {
      selection
    } = e3;
    if (!selection) {
      return;
    }
    var [start, end] = Range.edges(selection);
    var startVoid = Editor.void(e3, {
      at: start.path
    });
    var endVoid = Editor.void(e3, {
      at: end.path
    });
    if (Range.isCollapsed(selection) && !startVoid) {
      return;
    }
    var domRange = DOMEditor.toDOMRange(e3, selection);
    var contents = domRange.cloneContents();
    var attach = contents.childNodes[0];
    contents.childNodes.forEach((node) => {
      if (node.textContent && node.textContent.trim() !== "") {
        attach = node;
      }
    });
    if (endVoid) {
      var [voidNode] = endVoid;
      var r2 = domRange.cloneRange();
      var domNode = DOMEditor.toDOMNode(e3, voidNode);
      r2.setEndAfter(domNode);
      contents = r2.cloneContents();
    }
    if (startVoid) {
      attach = contents.querySelector("[data-slate-spacer]");
    }
    Array.from(contents.querySelectorAll("[data-slate-zero-width]")).forEach((zw) => {
      var isNewline = zw.getAttribute("data-slate-zero-width") === "n";
      zw.textContent = isNewline ? "\n" : "";
    });
    if (isDOMText(attach)) {
      var span = attach.ownerDocument.createElement("span");
      span.style.whiteSpace = "pre";
      span.appendChild(attach);
      contents.appendChild(span);
      attach = span;
    }
    var fragment = e3.getFragment();
    var string = JSON.stringify(fragment);
    var encoded = window.btoa(encodeURIComponent(string));
    attach.setAttribute("data-slate-fragment", encoded);
    data.setData("application/".concat(clipboardFormatKey), encoded);
    var div = contents.ownerDocument.createElement("div");
    div.appendChild(contents);
    div.setAttribute("hidden", "true");
    contents.ownerDocument.body.appendChild(div);
    data.setData("text/html", div.innerHTML);
    data.setData("text/plain", getPlainText(div));
    contents.ownerDocument.body.removeChild(div);
    return data;
  };
  e3.insertData = (data) => {
    if (!e3.insertFragmentData(data)) {
      e3.insertTextData(data);
    }
  };
  e3.insertFragmentData = (data) => {
    var fragment = data.getData("application/".concat(clipboardFormatKey)) || getSlateFragmentAttribute(data);
    if (fragment) {
      var decoded = decodeURIComponent(window.atob(fragment));
      var parsed = JSON.parse(decoded);
      e3.insertFragment(parsed);
      return true;
    }
    return false;
  };
  e3.insertTextData = (data) => {
    var text = data.getData("text/plain");
    if (text) {
      var lines = text.split(/\r\n|\r|\n/);
      var split = false;
      for (var line of lines) {
        if (split) {
          Transforms.splitNodes(e3, {
            always: true
          });
        }
        e3.insertText(line);
        split = true;
      }
      return true;
    }
    return false;
  };
  e3.onChange = (options) => {
    var onContextChange = EDITOR_TO_ON_CHANGE.get(e3);
    if (onContextChange) {
      onContextChange(options);
    }
    onChange(options);
  };
  return e3;
};
var getMatches = (e3, path) => {
  var matches = [];
  for (var [n3, p] of Editor.levels(e3, {
    at: path
  })) {
    var key = DOMEditor.findKey(e3, n3);
    matches.push([p, key]);
  }
  return matches;
};
var TRIPLE_CLICK = 3;
var HOTKEYS = {
  bold: "mod+b",
  compose: ["down", "left", "right", "up", "backspace", "enter"],
  moveBackward: "left",
  moveForward: "right",
  moveWordBackward: "ctrl+left",
  moveWordForward: "ctrl+right",
  deleteBackward: "shift?+backspace",
  deleteForward: "shift?+delete",
  extendBackward: "shift+left",
  extendForward: "shift+right",
  italic: "mod+i",
  insertSoftBreak: "shift+enter",
  splitBlock: "enter",
  undo: "mod+z"
};
var APPLE_HOTKEYS = {
  moveLineBackward: "opt+up",
  moveLineForward: "opt+down",
  moveWordBackward: "opt+left",
  moveWordForward: "opt+right",
  deleteBackward: ["ctrl+backspace", "ctrl+h"],
  deleteForward: ["ctrl+delete", "ctrl+d"],
  deleteLineBackward: "cmd+shift?+backspace",
  deleteLineForward: ["cmd+shift?+delete", "ctrl+k"],
  deleteWordBackward: "opt+shift?+backspace",
  deleteWordForward: "opt+shift?+delete",
  extendLineBackward: "opt+shift+up",
  extendLineForward: "opt+shift+down",
  redo: "cmd+shift+z",
  transposeCharacter: "ctrl+t"
};
var WINDOWS_HOTKEYS = {
  deleteWordBackward: "ctrl+shift?+backspace",
  deleteWordForward: "ctrl+shift?+delete",
  redo: ["ctrl+y", "ctrl+shift+z"]
};
var create = (key) => {
  var generic = HOTKEYS[key];
  var apple = APPLE_HOTKEYS[key];
  var windows = WINDOWS_HOTKEYS[key];
  var isGeneric = generic && (0, import_is_hotkey.isHotkey)(generic);
  var isApple = apple && (0, import_is_hotkey.isHotkey)(apple);
  var isWindows = windows && (0, import_is_hotkey.isHotkey)(windows);
  return (event) => {
    if (isGeneric && isGeneric(event)) return true;
    if (IS_APPLE && isApple && isApple(event)) return true;
    if (!IS_APPLE && isWindows && isWindows(event)) return true;
    return false;
  };
};
var hotkeys = {
  isBold: create("bold"),
  isCompose: create("compose"),
  isMoveBackward: create("moveBackward"),
  isMoveForward: create("moveForward"),
  isDeleteBackward: create("deleteBackward"),
  isDeleteForward: create("deleteForward"),
  isDeleteLineBackward: create("deleteLineBackward"),
  isDeleteLineForward: create("deleteLineForward"),
  isDeleteWordBackward: create("deleteWordBackward"),
  isDeleteWordForward: create("deleteWordForward"),
  isExtendBackward: create("extendBackward"),
  isExtendForward: create("extendForward"),
  isExtendLineBackward: create("extendLineBackward"),
  isExtendLineForward: create("extendLineForward"),
  isItalic: create("italic"),
  isMoveLineBackward: create("moveLineBackward"),
  isMoveLineForward: create("moveLineForward"),
  isMoveWordBackward: create("moveWordBackward"),
  isMoveWordForward: create("moveWordForward"),
  isRedo: create("redo"),
  isSoftBreak: create("insertSoftBreak"),
  isSplitBlock: create("splitBlock"),
  isTransposeCharacter: create("transposeCharacter"),
  isUndo: create("undo")
};
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
var _excluded = ["anchor", "focus"];
var _excluded2 = ["anchor", "focus"];
var shallowCompare = (obj1, obj2) => Object.keys(obj1).length === Object.keys(obj2).length && Object.keys(obj1).every((key) => obj2.hasOwnProperty(key) && obj1[key] === obj2[key]);
var isDecorationFlagsEqual = (range, other) => {
  var rangeOwnProps = _objectWithoutProperties(range, _excluded);
  var otherOwnProps = _objectWithoutProperties(other, _excluded2);
  return range[PLACEHOLDER_SYMBOL] === other[PLACEHOLDER_SYMBOL] && shallowCompare(rangeOwnProps, otherOwnProps);
};
var isElementDecorationsEqual = (list, another) => {
  if (list.length !== another.length) {
    return false;
  }
  for (var i = 0; i < list.length; i++) {
    var range = list[i];
    var other = another[i];
    if (!Range.equals(range, other) || !isDecorationFlagsEqual(range, other)) {
      return false;
    }
  }
  return true;
};
var isTextDecorationsEqual = (list, another) => {
  if (list.length !== another.length) {
    return false;
  }
  for (var i = 0; i < list.length; i++) {
    var range = list[i];
    var other = another[i];
    if (range.anchor.offset !== other.anchor.offset || range.focus.offset !== other.focus.offset || !isDecorationFlagsEqual(range, other)) {
      return false;
    }
  }
  return true;
};

// node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js
var resizeObservers = [];

// node_modules/@juggle/resize-observer/lib/algorithms/hasActiveObservations.js
var hasActiveObservations = function() {
  return resizeObservers.some(function(ro) {
    return ro.activeTargets.length > 0;
  });
};

// node_modules/@juggle/resize-observer/lib/algorithms/hasSkippedObservations.js
var hasSkippedObservations = function() {
  return resizeObservers.some(function(ro) {
    return ro.skippedTargets.length > 0;
  });
};

// node_modules/@juggle/resize-observer/lib/algorithms/deliverResizeLoopError.js
var msg = "ResizeObserver loop completed with undelivered notifications.";
var deliverResizeLoopError = function() {
  var event;
  if (typeof ErrorEvent === "function") {
    event = new ErrorEvent("error", {
      message: msg
    });
  } else {
    event = document.createEvent("Event");
    event.initEvent("error", false, false);
    event.message = msg;
  }
  window.dispatchEvent(event);
};

// node_modules/@juggle/resize-observer/lib/ResizeObserverBoxOptions.js
var ResizeObserverBoxOptions;
(function(ResizeObserverBoxOptions2) {
  ResizeObserverBoxOptions2["BORDER_BOX"] = "border-box";
  ResizeObserverBoxOptions2["CONTENT_BOX"] = "content-box";
  ResizeObserverBoxOptions2["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
})(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));

// node_modules/@juggle/resize-observer/lib/utils/freeze.js
var freeze = function(obj) {
  return Object.freeze(obj);
};

// node_modules/@juggle/resize-observer/lib/ResizeObserverSize.js
var ResizeObserverSize = /* @__PURE__ */ function() {
  function ResizeObserverSize2(inlineSize, blockSize) {
    this.inlineSize = inlineSize;
    this.blockSize = blockSize;
    freeze(this);
  }
  return ResizeObserverSize2;
}();

// node_modules/@juggle/resize-observer/lib/DOMRectReadOnly.js
var DOMRectReadOnly = function() {
  function DOMRectReadOnly2(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.top = this.y;
    this.left = this.x;
    this.bottom = this.top + this.height;
    this.right = this.left + this.width;
    return freeze(this);
  }
  DOMRectReadOnly2.prototype.toJSON = function() {
    var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
    return { x, y, top, right, bottom, left, width, height };
  };
  DOMRectReadOnly2.fromRect = function(rectangle) {
    return new DOMRectReadOnly2(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  };
  return DOMRectReadOnly2;
}();

// node_modules/@juggle/resize-observer/lib/utils/element.js
var isSVG = function(target) {
  return target instanceof SVGElement && "getBBox" in target;
};
var isHidden = function(target) {
  if (isSVG(target)) {
    var _a = target.getBBox(), width = _a.width, height = _a.height;
    return !width && !height;
  }
  var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
  return !(offsetWidth || offsetHeight || target.getClientRects().length);
};
var isElement = function(obj) {
  var _a;
  if (obj instanceof Element) {
    return true;
  }
  var scope = (_a = obj === null || obj === void 0 ? void 0 : obj.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView;
  return !!(scope && obj instanceof scope.Element);
};
var isReplacedElement = function(target) {
  switch (target.tagName) {
    case "INPUT":
      if (target.type !== "image") {
        break;
      }
    case "VIDEO":
    case "AUDIO":
    case "EMBED":
    case "OBJECT":
    case "CANVAS":
    case "IFRAME":
    case "IMG":
      return true;
  }
  return false;
};

// node_modules/@juggle/resize-observer/lib/utils/global.js
var global2 = typeof window !== "undefined" ? window : {};

// node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js
var cache = /* @__PURE__ */ new WeakMap();
var scrollRegexp = /auto|scroll/;
var verticalRegexp = /^tb|vertical/;
var IE = /msie|trident/i.test(global2.navigator && global2.navigator.userAgent);
var parseDimension = function(pixel) {
  return parseFloat(pixel || "0");
};
var size = function(inlineSize, blockSize, switchSizes) {
  if (inlineSize === void 0) {
    inlineSize = 0;
  }
  if (blockSize === void 0) {
    blockSize = 0;
  }
  if (switchSizes === void 0) {
    switchSizes = false;
  }
  return new ResizeObserverSize((switchSizes ? blockSize : inlineSize) || 0, (switchSizes ? inlineSize : blockSize) || 0);
};
var zeroBoxes = freeze({
  devicePixelContentBoxSize: size(),
  borderBoxSize: size(),
  contentBoxSize: size(),
  contentRect: new DOMRectReadOnly(0, 0, 0, 0)
});
var calculateBoxSizes = function(target, forceRecalculation) {
  if (forceRecalculation === void 0) {
    forceRecalculation = false;
  }
  if (cache.has(target) && !forceRecalculation) {
    return cache.get(target);
  }
  if (isHidden(target)) {
    cache.set(target, zeroBoxes);
    return zeroBoxes;
  }
  var cs = getComputedStyle(target);
  var svg = isSVG(target) && target.ownerSVGElement && target.getBBox();
  var removePadding = !IE && cs.boxSizing === "border-box";
  var switchSizes = verticalRegexp.test(cs.writingMode || "");
  var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || "");
  var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || "");
  var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
  var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
  var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
  var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
  var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
  var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
  var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
  var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
  var horizontalPadding = paddingLeft + paddingRight;
  var verticalPadding = paddingTop + paddingBottom;
  var horizontalBorderArea = borderLeft + borderRight;
  var verticalBorderArea = borderTop + borderBottom;
  var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
  var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
  var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
  var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
  var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
  var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
  var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
  var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
  var boxes = freeze({
    devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
    borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
    contentBoxSize: size(contentWidth, contentHeight, switchSizes),
    contentRect: new DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
  });
  cache.set(target, boxes);
  return boxes;
};
var calculateBoxSize = function(target, observedBox, forceRecalculation) {
  var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
  switch (observedBox) {
    case ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
      return devicePixelContentBoxSize;
    case ResizeObserverBoxOptions.BORDER_BOX:
      return borderBoxSize;
    default:
      return contentBoxSize;
  }
};

// node_modules/@juggle/resize-observer/lib/ResizeObserverEntry.js
var ResizeObserverEntry = /* @__PURE__ */ function() {
  function ResizeObserverEntry2(target) {
    var boxes = calculateBoxSizes(target);
    this.target = target;
    this.contentRect = boxes.contentRect;
    this.borderBoxSize = freeze([boxes.borderBoxSize]);
    this.contentBoxSize = freeze([boxes.contentBoxSize]);
    this.devicePixelContentBoxSize = freeze([boxes.devicePixelContentBoxSize]);
  }
  return ResizeObserverEntry2;
}();

// node_modules/@juggle/resize-observer/lib/algorithms/calculateDepthForNode.js
var calculateDepthForNode = function(node) {
  if (isHidden(node)) {
    return Infinity;
  }
  var depth = 0;
  var parent = node.parentNode;
  while (parent) {
    depth += 1;
    parent = parent.parentNode;
  }
  return depth;
};

// node_modules/@juggle/resize-observer/lib/algorithms/broadcastActiveObservations.js
var broadcastActiveObservations = function() {
  var shallowestDepth = Infinity;
  var callbacks2 = [];
  resizeObservers.forEach(function processObserver(ro) {
    if (ro.activeTargets.length === 0) {
      return;
    }
    var entries = [];
    ro.activeTargets.forEach(function processTarget(ot) {
      var entry = new ResizeObserverEntry(ot.target);
      var targetDepth = calculateDepthForNode(ot.target);
      entries.push(entry);
      ot.lastReportedSize = calculateBoxSize(ot.target, ot.observedBox);
      if (targetDepth < shallowestDepth) {
        shallowestDepth = targetDepth;
      }
    });
    callbacks2.push(function resizeObserverCallback() {
      ro.callback.call(ro.observer, entries, ro.observer);
    });
    ro.activeTargets.splice(0, ro.activeTargets.length);
  });
  for (var _i = 0, callbacks_1 = callbacks2; _i < callbacks_1.length; _i++) {
    var callback = callbacks_1[_i];
    callback();
  }
  return shallowestDepth;
};

// node_modules/@juggle/resize-observer/lib/algorithms/gatherActiveObservationsAtDepth.js
var gatherActiveObservationsAtDepth = function(depth) {
  resizeObservers.forEach(function processObserver(ro) {
    ro.activeTargets.splice(0, ro.activeTargets.length);
    ro.skippedTargets.splice(0, ro.skippedTargets.length);
    ro.observationTargets.forEach(function processTarget(ot) {
      if (ot.isActive()) {
        if (calculateDepthForNode(ot.target) > depth) {
          ro.activeTargets.push(ot);
        } else {
          ro.skippedTargets.push(ot);
        }
      }
    });
  });
};

// node_modules/@juggle/resize-observer/lib/utils/process.js
var process = function() {
  var depth = 0;
  gatherActiveObservationsAtDepth(depth);
  while (hasActiveObservations()) {
    depth = broadcastActiveObservations();
    gatherActiveObservationsAtDepth(depth);
  }
  if (hasSkippedObservations()) {
    deliverResizeLoopError();
  }
  return depth > 0;
};

// node_modules/@juggle/resize-observer/lib/utils/queueMicroTask.js
var trigger;
var callbacks = [];
var notify = function() {
  return callbacks.splice(0).forEach(function(cb) {
    return cb();
  });
};
var queueMicroTask = function(callback) {
  if (!trigger) {
    var toggle_1 = 0;
    var el_1 = document.createTextNode("");
    var config = { characterData: true };
    new MutationObserver(function() {
      return notify();
    }).observe(el_1, config);
    trigger = function() {
      el_1.textContent = "".concat(toggle_1 ? toggle_1-- : toggle_1++);
    };
  }
  callbacks.push(callback);
  trigger();
};

// node_modules/@juggle/resize-observer/lib/utils/queueResizeObserver.js
var queueResizeObserver = function(cb) {
  queueMicroTask(function ResizeObserver2() {
    requestAnimationFrame(cb);
  });
};

// node_modules/@juggle/resize-observer/lib/utils/scheduler.js
var watching = 0;
var isWatching = function() {
  return !!watching;
};
var CATCH_PERIOD = 250;
var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
var events = [
  "resize",
  "load",
  "transitionend",
  "animationend",
  "animationstart",
  "animationiteration",
  "keyup",
  "keydown",
  "mouseup",
  "mousedown",
  "mouseover",
  "mouseout",
  "blur",
  "focus"
];
var time = function(timeout) {
  if (timeout === void 0) {
    timeout = 0;
  }
  return Date.now() + timeout;
};
var scheduled = false;
var Scheduler = function() {
  function Scheduler2() {
    var _this = this;
    this.stopped = true;
    this.listener = function() {
      return _this.schedule();
    };
  }
  Scheduler2.prototype.run = function(timeout) {
    var _this = this;
    if (timeout === void 0) {
      timeout = CATCH_PERIOD;
    }
    if (scheduled) {
      return;
    }
    scheduled = true;
    var until = time(timeout);
    queueResizeObserver(function() {
      var elementsHaveResized = false;
      try {
        elementsHaveResized = process();
      } finally {
        scheduled = false;
        timeout = until - time();
        if (!isWatching()) {
          return;
        }
        if (elementsHaveResized) {
          _this.run(1e3);
        } else if (timeout > 0) {
          _this.run(timeout);
        } else {
          _this.start();
        }
      }
    });
  };
  Scheduler2.prototype.schedule = function() {
    this.stop();
    this.run();
  };
  Scheduler2.prototype.observe = function() {
    var _this = this;
    var cb = function() {
      return _this.observer && _this.observer.observe(document.body, observerConfig);
    };
    document.body ? cb() : global2.addEventListener("DOMContentLoaded", cb);
  };
  Scheduler2.prototype.start = function() {
    var _this = this;
    if (this.stopped) {
      this.stopped = false;
      this.observer = new MutationObserver(this.listener);
      this.observe();
      events.forEach(function(name) {
        return global2.addEventListener(name, _this.listener, true);
      });
    }
  };
  Scheduler2.prototype.stop = function() {
    var _this = this;
    if (!this.stopped) {
      this.observer && this.observer.disconnect();
      events.forEach(function(name) {
        return global2.removeEventListener(name, _this.listener, true);
      });
      this.stopped = true;
    }
  };
  return Scheduler2;
}();
var scheduler = new Scheduler();
var updateCount = function(n3) {
  !watching && n3 > 0 && scheduler.start();
  watching += n3;
  !watching && scheduler.stop();
};

// node_modules/@juggle/resize-observer/lib/ResizeObservation.js
var skipNotifyOnElement = function(target) {
  return !isSVG(target) && !isReplacedElement(target) && getComputedStyle(target).display === "inline";
};
var ResizeObservation = function() {
  function ResizeObservation2(target, observedBox) {
    this.target = target;
    this.observedBox = observedBox || ResizeObserverBoxOptions.CONTENT_BOX;
    this.lastReportedSize = {
      inlineSize: 0,
      blockSize: 0
    };
  }
  ResizeObservation2.prototype.isActive = function() {
    var size2 = calculateBoxSize(this.target, this.observedBox, true);
    if (skipNotifyOnElement(this.target)) {
      this.lastReportedSize = size2;
    }
    if (this.lastReportedSize.inlineSize !== size2.inlineSize || this.lastReportedSize.blockSize !== size2.blockSize) {
      return true;
    }
    return false;
  };
  return ResizeObservation2;
}();

// node_modules/@juggle/resize-observer/lib/ResizeObserverDetail.js
var ResizeObserverDetail = /* @__PURE__ */ function() {
  function ResizeObserverDetail2(resizeObserver, callback) {
    this.activeTargets = [];
    this.skippedTargets = [];
    this.observationTargets = [];
    this.observer = resizeObserver;
    this.callback = callback;
  }
  return ResizeObserverDetail2;
}();

// node_modules/@juggle/resize-observer/lib/ResizeObserverController.js
var observerMap = /* @__PURE__ */ new WeakMap();
var getObservationIndex = function(observationTargets, target) {
  for (var i = 0; i < observationTargets.length; i += 1) {
    if (observationTargets[i].target === target) {
      return i;
    }
  }
  return -1;
};
var ResizeObserverController = function() {
  function ResizeObserverController2() {
  }
  ResizeObserverController2.connect = function(resizeObserver, callback) {
    var detail = new ResizeObserverDetail(resizeObserver, callback);
    observerMap.set(resizeObserver, detail);
  };
  ResizeObserverController2.observe = function(resizeObserver, target, options) {
    var detail = observerMap.get(resizeObserver);
    var firstObservation = detail.observationTargets.length === 0;
    if (getObservationIndex(detail.observationTargets, target) < 0) {
      firstObservation && resizeObservers.push(detail);
      detail.observationTargets.push(new ResizeObservation(target, options && options.box));
      updateCount(1);
      scheduler.schedule();
    }
  };
  ResizeObserverController2.unobserve = function(resizeObserver, target) {
    var detail = observerMap.get(resizeObserver);
    var index = getObservationIndex(detail.observationTargets, target);
    var lastObservation = detail.observationTargets.length === 1;
    if (index >= 0) {
      lastObservation && resizeObservers.splice(resizeObservers.indexOf(detail), 1);
      detail.observationTargets.splice(index, 1);
      updateCount(-1);
    }
  };
  ResizeObserverController2.disconnect = function(resizeObserver) {
    var _this = this;
    var detail = observerMap.get(resizeObserver);
    detail.observationTargets.slice().forEach(function(ot) {
      return _this.unobserve(resizeObserver, ot.target);
    });
    detail.activeTargets.splice(0, detail.activeTargets.length);
  };
  return ResizeObserverController2;
}();

// node_modules/@juggle/resize-observer/lib/ResizeObserver.js
var ResizeObserver = function() {
  function ResizeObserver2(callback) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (typeof callback !== "function") {
      throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
    }
    ResizeObserverController.connect(this, callback);
  }
  ResizeObserver2.prototype.observe = function(target, options) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (!isElement(target)) {
      throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
    }
    ResizeObserverController.observe(this, target, options);
  };
  ResizeObserver2.prototype.unobserve = function(target) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
    }
    if (!isElement(target)) {
      throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
    }
    ResizeObserverController.unobserve(this, target);
  };
  ResizeObserver2.prototype.disconnect = function() {
    ResizeObserverController.disconnect(this);
  };
  ResizeObserver2.toString = function() {
    return "function ResizeObserver () { [polyfill code] }";
  };
  return ResizeObserver2;
}();

// node_modules/slate-react/dist/index.es.js
var import_react_dom = __toESM(require_react_dom());
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
function _typeof2(o3) {
  "@babel/helpers - typeof";
  return _typeof2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o4) {
    return typeof o4;
  } : function(o4) {
    return o4 && "function" == typeof Symbol && o4.constructor === Symbol && o4 !== Symbol.prototype ? "symbol" : typeof o4;
  }, _typeof2(o3);
}
function _toPrimitive2(input, hint) {
  if (_typeof2(input) !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input, hint || "default");
    if (_typeof2(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey2(arg) {
  var key = _toPrimitive2(arg, "string");
  return _typeof2(key) === "symbol" ? key : String(key);
}
function _defineProperty2(obj, key, value) {
  key = _toPropertyKey2(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
var EditorContext = /* @__PURE__ */ (0, import_react.createContext)(null);
var useSlateStatic = () => {
  var editor = (0, import_react.useContext)(EditorContext);
  if (!editor) {
    throw new Error("The `useSlateStatic` hook must be used inside the <Slate> component's context.");
  }
  return editor;
};
var ReactEditor = DOMEditor;
function ownKeys$5(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread$5(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys$5(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys$5(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var RESOLVE_DELAY = 25;
var FLUSH_DELAY = 200;
var debug = function debug2() {
};
var isDataTransfer = (value) => (value === null || value === void 0 ? void 0 : value.constructor.name) === "DataTransfer";
function createAndroidInputManager(_ref) {
  var {
    editor,
    scheduleOnDOMSelectionChange,
    onDOMSelectionChange
  } = _ref;
  var flushing = false;
  var compositionEndTimeoutId = null;
  var flushTimeoutId = null;
  var actionTimeoutId = null;
  var idCounter = 0;
  var insertPositionHint = false;
  var applyPendingSelection = () => {
    var pendingSelection = EDITOR_TO_PENDING_SELECTION.get(editor);
    EDITOR_TO_PENDING_SELECTION.delete(editor);
    if (pendingSelection) {
      var {
        selection
      } = editor;
      var normalized = normalizeRange(editor, pendingSelection);
      if (normalized && (!selection || !Range.equals(normalized, selection))) {
        Transforms.select(editor, normalized);
      }
    }
  };
  var performAction = () => {
    var action = EDITOR_TO_PENDING_ACTION.get(editor);
    EDITOR_TO_PENDING_ACTION.delete(editor);
    if (!action) {
      return;
    }
    if (action.at) {
      var target = Point.isPoint(action.at) ? normalizePoint(editor, action.at) : normalizeRange(editor, action.at);
      if (!target) {
        return;
      }
      var _targetRange = Editor.range(editor, target);
      if (!editor.selection || !Range.equals(editor.selection, _targetRange)) {
        Transforms.select(editor, target);
      }
    }
    action.run();
  };
  var flush = () => {
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId);
      flushTimeoutId = null;
    }
    if (actionTimeoutId) {
      clearTimeout(actionTimeoutId);
      actionTimeoutId = null;
    }
    if (!hasPendingDiffs() && !hasPendingAction()) {
      applyPendingSelection();
      return;
    }
    if (!flushing) {
      flushing = true;
      setTimeout(() => flushing = false);
    }
    if (hasPendingAction()) {
      flushing = "action";
    }
    var selectionRef = editor.selection && Editor.rangeRef(editor, editor.selection, {
      affinity: "forward"
    });
    EDITOR_TO_USER_MARKS.set(editor, editor.marks);
    debug("flush", EDITOR_TO_PENDING_ACTION.get(editor), EDITOR_TO_PENDING_DIFFS.get(editor));
    var scheduleSelectionChange = hasPendingDiffs();
    var diff;
    while (diff = (_EDITOR_TO_PENDING_DI = EDITOR_TO_PENDING_DIFFS.get(editor)) === null || _EDITOR_TO_PENDING_DI === void 0 ? void 0 : _EDITOR_TO_PENDING_DI[0]) {
      var _EDITOR_TO_PENDING_DI, _EDITOR_TO_PENDING_DI2;
      var pendingMarks = EDITOR_TO_PENDING_INSERTION_MARKS.get(editor);
      if (pendingMarks !== void 0) {
        EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor);
        editor.marks = pendingMarks;
      }
      if (pendingMarks && insertPositionHint === false) {
        insertPositionHint = null;
      }
      var range = targetRange(diff);
      if (!editor.selection || !Range.equals(editor.selection, range)) {
        Transforms.select(editor, range);
      }
      if (diff.diff.text) {
        Editor.insertText(editor, diff.diff.text);
      } else {
        Editor.deleteFragment(editor);
      }
      EDITOR_TO_PENDING_DIFFS.set(editor, (_EDITOR_TO_PENDING_DI2 = EDITOR_TO_PENDING_DIFFS.get(editor)) === null || _EDITOR_TO_PENDING_DI2 === void 0 ? void 0 : _EDITOR_TO_PENDING_DI2.filter((_ref2) => {
        var {
          id
        } = _ref2;
        return id !== diff.id;
      }));
      if (!verifyDiffState(editor, diff)) {
        scheduleSelectionChange = false;
        EDITOR_TO_PENDING_ACTION.delete(editor);
        EDITOR_TO_USER_MARKS.delete(editor);
        flushing = "action";
        EDITOR_TO_PENDING_SELECTION.delete(editor);
        scheduleOnDOMSelectionChange.cancel();
        onDOMSelectionChange.cancel();
        selectionRef === null || selectionRef === void 0 || selectionRef.unref();
      }
    }
    var selection = selectionRef === null || selectionRef === void 0 ? void 0 : selectionRef.unref();
    if (selection && !EDITOR_TO_PENDING_SELECTION.get(editor) && (!editor.selection || !Range.equals(selection, editor.selection))) {
      Transforms.select(editor, selection);
    }
    if (hasPendingAction()) {
      performAction();
      return;
    }
    if (scheduleSelectionChange) {
      scheduleOnDOMSelectionChange();
    }
    scheduleOnDOMSelectionChange.flush();
    onDOMSelectionChange.flush();
    applyPendingSelection();
    var userMarks = EDITOR_TO_USER_MARKS.get(editor);
    EDITOR_TO_USER_MARKS.delete(editor);
    if (userMarks !== void 0) {
      editor.marks = userMarks;
      editor.onChange();
    }
  };
  var handleCompositionEnd = (_event) => {
    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId);
    }
    compositionEndTimeoutId = setTimeout(() => {
      IS_COMPOSING.set(editor, false);
      flush();
    }, RESOLVE_DELAY);
  };
  var handleCompositionStart = (_event) => {
    IS_COMPOSING.set(editor, true);
    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId);
      compositionEndTimeoutId = null;
    }
  };
  var updatePlaceholderVisibility = function updatePlaceholderVisibility2() {
    var forceHide = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
    var placeholderElement = EDITOR_TO_PLACEHOLDER_ELEMENT.get(editor);
    if (!placeholderElement) {
      return;
    }
    if (hasPendingDiffs() || forceHide) {
      placeholderElement.style.display = "none";
      return;
    }
    placeholderElement.style.removeProperty("display");
  };
  var storeDiff = (path, diff) => {
    var _EDITOR_TO_PENDING_DI3;
    var pendingDiffs = (_EDITOR_TO_PENDING_DI3 = EDITOR_TO_PENDING_DIFFS.get(editor)) !== null && _EDITOR_TO_PENDING_DI3 !== void 0 ? _EDITOR_TO_PENDING_DI3 : [];
    EDITOR_TO_PENDING_DIFFS.set(editor, pendingDiffs);
    var target = Node.leaf(editor, path);
    var idx = pendingDiffs.findIndex((change) => Path.equals(change.path, path));
    if (idx < 0) {
      var normalized = normalizeStringDiff(target.text, diff);
      if (normalized) {
        pendingDiffs.push({
          path,
          diff,
          id: idCounter++
        });
      }
      updatePlaceholderVisibility();
      return;
    }
    var merged = mergeStringDiffs(target.text, pendingDiffs[idx].diff, diff);
    if (!merged) {
      pendingDiffs.splice(idx, 1);
      updatePlaceholderVisibility();
      return;
    }
    pendingDiffs[idx] = _objectSpread$5(_objectSpread$5({}, pendingDiffs[idx]), {}, {
      diff: merged
    });
  };
  var scheduleAction = function scheduleAction2(run) {
    var {
      at
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    insertPositionHint = false;
    EDITOR_TO_PENDING_SELECTION.delete(editor);
    scheduleOnDOMSelectionChange.cancel();
    onDOMSelectionChange.cancel();
    if (hasPendingAction()) {
      flush();
    }
    EDITOR_TO_PENDING_ACTION.set(editor, {
      at,
      run
    });
    actionTimeoutId = setTimeout(flush);
  };
  var handleDOMBeforeInput = (event) => {
    var _targetRange2;
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId);
      flushTimeoutId = null;
    }
    if (IS_NODE_MAP_DIRTY.get(editor)) {
      return;
    }
    var {
      inputType: type
    } = event;
    var targetRange2 = null;
    var data = event.dataTransfer || event.data || void 0;
    if (insertPositionHint !== false && type !== "insertText" && type !== "insertCompositionText") {
      insertPositionHint = false;
    }
    var [nativeTargetRange] = event.getTargetRanges();
    if (nativeTargetRange) {
      targetRange2 = ReactEditor.toSlateRange(editor, nativeTargetRange, {
        exactMatch: false,
        suppressThrow: true
      });
    }
    var window2 = ReactEditor.getWindow(editor);
    var domSelection = window2.getSelection();
    if (!targetRange2 && domSelection) {
      nativeTargetRange = domSelection;
      targetRange2 = ReactEditor.toSlateRange(editor, domSelection, {
        exactMatch: false,
        suppressThrow: true
      });
    }
    targetRange2 = (_targetRange2 = targetRange2) !== null && _targetRange2 !== void 0 ? _targetRange2 : editor.selection;
    if (!targetRange2) {
      return;
    }
    var canStoreDiff = true;
    if (type.startsWith("delete")) {
      if (Range.isExpanded(targetRange2)) {
        var [_start, _end] = Range.edges(targetRange2);
        var _leaf = Node.leaf(editor, _start.path);
        if (_leaf.text.length === _start.offset && _end.offset === 0) {
          var next = Editor.next(editor, {
            at: _start.path,
            match: Text.isText
          });
          if (next && Path.equals(next[1], _end.path)) {
            targetRange2 = {
              anchor: _end,
              focus: _end
            };
          }
        }
      }
      var direction = type.endsWith("Backward") ? "backward" : "forward";
      var [start, end] = Range.edges(targetRange2);
      var [leaf, path] = Editor.leaf(editor, start.path);
      var diff = {
        text: "",
        start: start.offset,
        end: end.offset
      };
      var pendingDiffs = EDITOR_TO_PENDING_DIFFS.get(editor);
      var relevantPendingDiffs = pendingDiffs === null || pendingDiffs === void 0 ? void 0 : pendingDiffs.find((change) => Path.equals(change.path, path));
      var diffs = relevantPendingDiffs ? [relevantPendingDiffs.diff, diff] : [diff];
      var text = applyStringDiff(leaf.text, ...diffs);
      if (text.length === 0) {
        canStoreDiff = false;
      }
      if (Range.isExpanded(targetRange2)) {
        if (canStoreDiff && Path.equals(targetRange2.anchor.path, targetRange2.focus.path)) {
          var point = {
            path: targetRange2.anchor.path,
            offset: start.offset
          };
          var range = Editor.range(editor, point, point);
          handleUserSelect(range);
          return storeDiff(targetRange2.anchor.path, {
            text: "",
            end: end.offset,
            start: start.offset
          });
        }
        return scheduleAction(() => Editor.deleteFragment(editor, {
          direction
        }), {
          at: targetRange2
        });
      }
    }
    switch (type) {
      case "deleteByComposition":
      case "deleteByCut":
      case "deleteByDrag": {
        return scheduleAction(() => Editor.deleteFragment(editor), {
          at: targetRange2
        });
      }
      case "deleteContent":
      case "deleteContentForward": {
        var {
          anchor
        } = targetRange2;
        if (canStoreDiff && Range.isCollapsed(targetRange2)) {
          var targetNode = Node.leaf(editor, anchor.path);
          if (anchor.offset < targetNode.text.length) {
            return storeDiff(anchor.path, {
              text: "",
              start: anchor.offset,
              end: anchor.offset + 1
            });
          }
        }
        return scheduleAction(() => Editor.deleteForward(editor), {
          at: targetRange2
        });
      }
      case "deleteContentBackward": {
        var _nativeTargetRange;
        var {
          anchor: _anchor
        } = targetRange2;
        var nativeCollapsed = isDOMSelection(nativeTargetRange) ? nativeTargetRange.isCollapsed : !!((_nativeTargetRange = nativeTargetRange) !== null && _nativeTargetRange !== void 0 && _nativeTargetRange.collapsed);
        if (canStoreDiff && nativeCollapsed && Range.isCollapsed(targetRange2) && _anchor.offset > 0) {
          return storeDiff(_anchor.path, {
            text: "",
            start: _anchor.offset - 1,
            end: _anchor.offset
          });
        }
        return scheduleAction(() => Editor.deleteBackward(editor), {
          at: targetRange2
        });
      }
      case "deleteEntireSoftLine": {
        return scheduleAction(() => {
          Editor.deleteBackward(editor, {
            unit: "line"
          });
          Editor.deleteForward(editor, {
            unit: "line"
          });
        }, {
          at: targetRange2
        });
      }
      case "deleteHardLineBackward": {
        return scheduleAction(() => Editor.deleteBackward(editor, {
          unit: "block"
        }), {
          at: targetRange2
        });
      }
      case "deleteSoftLineBackward": {
        return scheduleAction(() => Editor.deleteBackward(editor, {
          unit: "line"
        }), {
          at: targetRange2
        });
      }
      case "deleteHardLineForward": {
        return scheduleAction(() => Editor.deleteForward(editor, {
          unit: "block"
        }), {
          at: targetRange2
        });
      }
      case "deleteSoftLineForward": {
        return scheduleAction(() => Editor.deleteForward(editor, {
          unit: "line"
        }), {
          at: targetRange2
        });
      }
      case "deleteWordBackward": {
        return scheduleAction(() => Editor.deleteBackward(editor, {
          unit: "word"
        }), {
          at: targetRange2
        });
      }
      case "deleteWordForward": {
        return scheduleAction(() => Editor.deleteForward(editor, {
          unit: "word"
        }), {
          at: targetRange2
        });
      }
      case "insertLineBreak": {
        return scheduleAction(() => Editor.insertSoftBreak(editor), {
          at: targetRange2
        });
      }
      case "insertParagraph": {
        return scheduleAction(() => Editor.insertBreak(editor), {
          at: targetRange2
        });
      }
      case "insertCompositionText":
      case "deleteCompositionText":
      case "insertFromComposition":
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertFromYank":
      case "insertReplacementText":
      case "insertText": {
        if (isDataTransfer(data)) {
          return scheduleAction(() => ReactEditor.insertData(editor, data), {
            at: targetRange2
          });
        }
        var _text = data !== null && data !== void 0 ? data : "";
        if (EDITOR_TO_PENDING_INSERTION_MARKS.get(editor)) {
          _text = _text.replace("\uFEFF", "");
        }
        if (type === "insertText" && /.*\n.*\n$/.test(_text)) {
          _text = _text.slice(0, -1);
        }
        if (_text.includes("\n")) {
          return scheduleAction(() => {
            var parts = _text.split("\n");
            parts.forEach((line, i) => {
              if (line) {
                Editor.insertText(editor, line);
              }
              if (i !== parts.length - 1) {
                Editor.insertSoftBreak(editor);
              }
            });
          }, {
            at: targetRange2
          });
        }
        if (Path.equals(targetRange2.anchor.path, targetRange2.focus.path)) {
          var [_start2, _end2] = Range.edges(targetRange2);
          var _diff = {
            start: _start2.offset,
            end: _end2.offset,
            text: _text
          };
          if (_text && insertPositionHint && type === "insertCompositionText") {
            var hintPosition = insertPositionHint.start + insertPositionHint.text.search(/\S|$/);
            var diffPosition = _diff.start + _diff.text.search(/\S|$/);
            if (diffPosition === hintPosition + 1 && _diff.end === insertPositionHint.start + insertPositionHint.text.length) {
              _diff.start -= 1;
              insertPositionHint = null;
              scheduleFlush();
            } else {
              insertPositionHint = false;
            }
          } else if (type === "insertText") {
            if (insertPositionHint === null) {
              insertPositionHint = _diff;
            } else if (insertPositionHint && Range.isCollapsed(targetRange2) && insertPositionHint.end + insertPositionHint.text.length === _start2.offset) {
              insertPositionHint = _objectSpread$5(_objectSpread$5({}, insertPositionHint), {}, {
                text: insertPositionHint.text + _text
              });
            } else {
              insertPositionHint = false;
            }
          } else {
            insertPositionHint = false;
          }
          if (canStoreDiff) {
            storeDiff(_start2.path, _diff);
            return;
          }
        }
        return scheduleAction(() => Editor.insertText(editor, _text), {
          at: targetRange2
        });
      }
    }
  };
  var hasPendingAction = () => {
    return !!EDITOR_TO_PENDING_ACTION.get(editor);
  };
  var hasPendingDiffs = () => {
    var _EDITOR_TO_PENDING_DI4;
    return !!((_EDITOR_TO_PENDING_DI4 = EDITOR_TO_PENDING_DIFFS.get(editor)) !== null && _EDITOR_TO_PENDING_DI4 !== void 0 && _EDITOR_TO_PENDING_DI4.length);
  };
  var hasPendingChanges = () => {
    return hasPendingAction() || hasPendingDiffs();
  };
  var isFlushing = () => {
    return flushing;
  };
  var handleUserSelect = (range) => {
    EDITOR_TO_PENDING_SELECTION.set(editor, range);
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId);
      flushTimeoutId = null;
    }
    var {
      selection
    } = editor;
    if (!range) {
      return;
    }
    var pathChanged = !selection || !Path.equals(selection.anchor.path, range.anchor.path);
    var parentPathChanged = !selection || !Path.equals(selection.anchor.path.slice(0, -1), range.anchor.path.slice(0, -1));
    if (pathChanged && insertPositionHint || parentPathChanged) {
      insertPositionHint = false;
    }
    if (pathChanged || hasPendingDiffs()) {
      flushTimeoutId = setTimeout(flush, FLUSH_DELAY);
    }
  };
  var handleInput = () => {
    if (hasPendingAction() || !hasPendingDiffs()) {
      flush();
    }
  };
  var handleKeyDown = (_) => {
    if (!hasPendingDiffs()) {
      updatePlaceholderVisibility(true);
      setTimeout(updatePlaceholderVisibility);
    }
  };
  var scheduleFlush = () => {
    if (!hasPendingAction()) {
      actionTimeoutId = setTimeout(flush);
    }
  };
  var handleDomMutations = (mutations) => {
    if (hasPendingDiffs() || hasPendingAction()) {
      return;
    }
    if (mutations.some((mutation) => isTrackedMutation(editor, mutation, mutations))) {
      var _EDITOR_TO_FORCE_REND;
      (_EDITOR_TO_FORCE_REND = EDITOR_TO_FORCE_RENDER.get(editor)) === null || _EDITOR_TO_FORCE_REND === void 0 || _EDITOR_TO_FORCE_REND();
    }
  };
  return {
    flush,
    scheduleFlush,
    hasPendingDiffs,
    hasPendingAction,
    hasPendingChanges,
    isFlushing,
    handleUserSelect,
    handleCompositionEnd,
    handleCompositionStart,
    handleDOMBeforeInput,
    handleKeyDown,
    handleDomMutations,
    handleInput
  };
}
function useIsMounted() {
  var isMountedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  return isMountedRef.current;
}
var useIsomorphicLayoutEffect = CAN_USE_DOM ? import_react.useLayoutEffect : import_react.useEffect;
function useMutationObserver(node, callback, options) {
  var [mutationObserver] = (0, import_react.useState)(() => new MutationObserver(callback));
  useIsomorphicLayoutEffect(() => {
    mutationObserver.takeRecords();
  });
  (0, import_react.useEffect)(() => {
    if (!node.current) {
      throw new Error("Failed to attach MutationObserver, `node` is undefined");
    }
    mutationObserver.observe(node.current, options);
    return () => mutationObserver.disconnect();
  }, [mutationObserver, node, options]);
}
var _excluded$2 = ["node"];
function ownKeys$4(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread$4(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys$4(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys$4(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var MUTATION_OBSERVER_CONFIG$1 = {
  subtree: true,
  childList: true,
  characterData: true
};
var useAndroidInputManager = !IS_ANDROID ? () => null : (_ref) => {
  var {
    node
  } = _ref, options = _objectWithoutProperties2(_ref, _excluded$2);
  if (!IS_ANDROID) {
    return null;
  }
  var editor = useSlateStatic();
  var isMounted = useIsMounted();
  var [inputManager] = (0, import_react.useState)(() => createAndroidInputManager(_objectSpread$4({
    editor
  }, options)));
  useMutationObserver(node, inputManager.handleDomMutations, MUTATION_OBSERVER_CONFIG$1);
  EDITOR_TO_SCHEDULE_FLUSH.set(editor, inputManager.scheduleFlush);
  if (isMounted) {
    inputManager.flush();
  }
  return inputManager;
};
function ownKeys$3(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread$3(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys$3(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys$3(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var String$1 = (props) => {
  var {
    isLast,
    leaf,
    parent,
    text
  } = props;
  var editor = useSlateStatic();
  var path = ReactEditor.findPath(editor, text);
  var parentPath = Path.parent(path);
  var isMarkPlaceholder = Boolean(leaf[MARK_PLACEHOLDER_SYMBOL]);
  if (editor.isVoid(parent)) {
    return /* @__PURE__ */ import_react.default.createElement(ZeroWidthString, {
      length: Node.string(parent).length
    });
  }
  if (leaf.text === "" && parent.children[parent.children.length - 1] === text && !editor.isInline(parent) && Editor.string(editor, parentPath) === "") {
    return /* @__PURE__ */ import_react.default.createElement(ZeroWidthString, {
      isLineBreak: true,
      isMarkPlaceholder
    });
  }
  if (leaf.text === "") {
    return /* @__PURE__ */ import_react.default.createElement(ZeroWidthString, {
      isMarkPlaceholder
    });
  }
  if (isLast && leaf.text.slice(-1) === "\n") {
    return /* @__PURE__ */ import_react.default.createElement(TextString, {
      isTrailing: true,
      text: leaf.text
    });
  }
  return /* @__PURE__ */ import_react.default.createElement(TextString, {
    text: leaf.text
  });
};
var TextString = (props) => {
  var {
    text,
    isTrailing = false
  } = props;
  var ref = (0, import_react.useRef)(null);
  var getTextContent = () => {
    return "".concat(text !== null && text !== void 0 ? text : "").concat(isTrailing ? "\n" : "");
  };
  var [initialText] = (0, import_react.useState)(getTextContent);
  useIsomorphicLayoutEffect(() => {
    var textWithTrailing = getTextContent();
    if (ref.current && ref.current.textContent !== textWithTrailing) {
      ref.current.textContent = textWithTrailing;
    }
  });
  return /* @__PURE__ */ import_react.default.createElement(MemoizedText$1, {
    ref
  }, initialText);
};
var MemoizedText$1 = /* @__PURE__ */ (0, import_react.memo)(/* @__PURE__ */ (0, import_react.forwardRef)((props, ref) => {
  return /* @__PURE__ */ import_react.default.createElement("span", {
    "data-slate-string": true,
    ref
  }, props.children);
}));
var ZeroWidthString = (props) => {
  var {
    length = 0,
    isLineBreak = false,
    isMarkPlaceholder = false
  } = props;
  var attributes = {
    "data-slate-zero-width": isLineBreak ? "n" : "z",
    "data-slate-length": length
  };
  if (isMarkPlaceholder) {
    attributes["data-slate-mark-placeholder"] = true;
  }
  return /* @__PURE__ */ import_react.default.createElement("span", _objectSpread$3({}, attributes), !(IS_ANDROID || IS_IOS) || !isLineBreak ? "\uFEFF" : null, isLineBreak ? /* @__PURE__ */ import_react.default.createElement("br", null) : null);
};
function ownKeys$2(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread$2(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys$2(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys$2(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var PLACEHOLDER_DELAY = IS_ANDROID ? 300 : 0;
function disconnectPlaceholderResizeObserver(placeholderResizeObserver, releaseObserver) {
  if (placeholderResizeObserver.current) {
    placeholderResizeObserver.current.disconnect();
    if (releaseObserver) {
      placeholderResizeObserver.current = null;
    }
  }
}
function clearTimeoutRef(timeoutRef) {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}
var Leaf = (props) => {
  var {
    leaf,
    isLast,
    text,
    parent,
    renderPlaceholder,
    renderLeaf = (props2) => /* @__PURE__ */ import_react.default.createElement(DefaultLeaf, _objectSpread$2({}, props2))
  } = props;
  var editor = useSlateStatic();
  var placeholderResizeObserver = (0, import_react.useRef)(null);
  var placeholderRef = (0, import_react.useRef)(null);
  var [showPlaceholder, setShowPlaceholder] = (0, import_react.useState)(false);
  var showPlaceholderTimeoutRef = (0, import_react.useRef)(null);
  var callbackPlaceholderRef = (0, import_react.useCallback)((placeholderEl) => {
    disconnectPlaceholderResizeObserver(placeholderResizeObserver, placeholderEl == null);
    if (placeholderEl == null) {
      var _leaf$onPlaceholderRe;
      EDITOR_TO_PLACEHOLDER_ELEMENT.delete(editor);
      (_leaf$onPlaceholderRe = leaf.onPlaceholderResize) === null || _leaf$onPlaceholderRe === void 0 || _leaf$onPlaceholderRe.call(leaf, null);
    } else {
      EDITOR_TO_PLACEHOLDER_ELEMENT.set(editor, placeholderEl);
      if (!placeholderResizeObserver.current) {
        var ResizeObserver$1 = window.ResizeObserver || ResizeObserver;
        placeholderResizeObserver.current = new ResizeObserver$1(() => {
          var _leaf$onPlaceholderRe2;
          (_leaf$onPlaceholderRe2 = leaf.onPlaceholderResize) === null || _leaf$onPlaceholderRe2 === void 0 || _leaf$onPlaceholderRe2.call(leaf, placeholderEl);
        });
      }
      placeholderResizeObserver.current.observe(placeholderEl);
      placeholderRef.current = placeholderEl;
    }
  }, [placeholderRef, leaf, editor]);
  var children = /* @__PURE__ */ import_react.default.createElement(String$1, {
    isLast,
    leaf,
    parent,
    text
  });
  var leafIsPlaceholder = Boolean(leaf[PLACEHOLDER_SYMBOL]);
  (0, import_react.useEffect)(() => {
    if (leafIsPlaceholder) {
      if (!showPlaceholderTimeoutRef.current) {
        showPlaceholderTimeoutRef.current = setTimeout(() => {
          setShowPlaceholder(true);
          showPlaceholderTimeoutRef.current = null;
        }, PLACEHOLDER_DELAY);
      }
    } else {
      clearTimeoutRef(showPlaceholderTimeoutRef);
      setShowPlaceholder(false);
    }
    return () => clearTimeoutRef(showPlaceholderTimeoutRef);
  }, [leafIsPlaceholder, setShowPlaceholder]);
  if (leafIsPlaceholder && showPlaceholder) {
    var placeholderProps = {
      children: leaf.placeholder,
      attributes: {
        "data-slate-placeholder": true,
        style: {
          position: "absolute",
          top: 0,
          pointerEvents: "none",
          width: "100%",
          maxWidth: "100%",
          display: "block",
          opacity: "0.333",
          userSelect: "none",
          textDecoration: "none",
          // Fixes https://github.com/udecode/plate/issues/2315
          WebkitUserModify: IS_WEBKIT ? "inherit" : void 0
        },
        contentEditable: false,
        ref: callbackPlaceholderRef
      }
    };
    children = /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, renderPlaceholder(placeholderProps), children);
  }
  var attributes = {
    "data-slate-leaf": true
  };
  return renderLeaf({
    attributes,
    children,
    leaf,
    text
  });
};
var MemoizedLeaf = /* @__PURE__ */ import_react.default.memo(Leaf, (prev, next) => {
  return next.parent === prev.parent && next.isLast === prev.isLast && next.renderLeaf === prev.renderLeaf && next.renderPlaceholder === prev.renderPlaceholder && next.text === prev.text && Text.equals(next.leaf, prev.leaf) && next.leaf[PLACEHOLDER_SYMBOL] === prev.leaf[PLACEHOLDER_SYMBOL];
});
var DefaultLeaf = (props) => {
  var {
    attributes,
    children
  } = props;
  return /* @__PURE__ */ import_react.default.createElement("span", _objectSpread$2({}, attributes), children);
};
var Text2 = (props) => {
  var {
    decorations,
    isLast,
    parent,
    renderPlaceholder,
    renderLeaf,
    text
  } = props;
  var editor = useSlateStatic();
  var ref = (0, import_react.useRef)(null);
  var leaves = Text.decorations(text, decorations);
  var key = ReactEditor.findKey(editor, text);
  var children = [];
  for (var i = 0; i < leaves.length; i++) {
    var leaf = leaves[i];
    children.push(/* @__PURE__ */ import_react.default.createElement(MemoizedLeaf, {
      isLast: isLast && i === leaves.length - 1,
      key: "".concat(key.id, "-").concat(i),
      renderPlaceholder,
      leaf,
      text,
      parent,
      renderLeaf
    }));
  }
  var callbackRef = (0, import_react.useCallback)((span) => {
    var KEY_TO_ELEMENT = EDITOR_TO_KEY_TO_ELEMENT.get(editor);
    if (span) {
      KEY_TO_ELEMENT === null || KEY_TO_ELEMENT === void 0 || KEY_TO_ELEMENT.set(key, span);
      NODE_TO_ELEMENT.set(text, span);
      ELEMENT_TO_NODE.set(span, text);
    } else {
      KEY_TO_ELEMENT === null || KEY_TO_ELEMENT === void 0 || KEY_TO_ELEMENT.delete(key);
      NODE_TO_ELEMENT.delete(text);
      if (ref.current) {
        ELEMENT_TO_NODE.delete(ref.current);
      }
    }
    ref.current = span;
  }, [ref, editor, key, text]);
  return /* @__PURE__ */ import_react.default.createElement("span", {
    "data-slate-node": "text",
    ref: callbackRef
  }, children);
};
var MemoizedText = /* @__PURE__ */ import_react.default.memo(Text2, (prev, next) => {
  return next.parent === prev.parent && next.isLast === prev.isLast && next.renderLeaf === prev.renderLeaf && next.renderPlaceholder === prev.renderPlaceholder && next.text === prev.text && isTextDecorationsEqual(next.decorations, prev.decorations);
});
function ownKeys$1(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread$1(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys$1(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys$1(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var Element3 = (props) => {
  var {
    decorations,
    element,
    renderElement = (p) => /* @__PURE__ */ import_react.default.createElement(DefaultElement, _objectSpread$1({}, p)),
    renderPlaceholder,
    renderLeaf,
    selection
  } = props;
  var editor = useSlateStatic();
  var readOnly = useReadOnly();
  var isInline = editor.isInline(element);
  var key = ReactEditor.findKey(editor, element);
  var ref = (0, import_react.useCallback)((ref2) => {
    var KEY_TO_ELEMENT = EDITOR_TO_KEY_TO_ELEMENT.get(editor);
    if (ref2) {
      KEY_TO_ELEMENT === null || KEY_TO_ELEMENT === void 0 || KEY_TO_ELEMENT.set(key, ref2);
      NODE_TO_ELEMENT.set(element, ref2);
      ELEMENT_TO_NODE.set(ref2, element);
    } else {
      KEY_TO_ELEMENT === null || KEY_TO_ELEMENT === void 0 || KEY_TO_ELEMENT.delete(key);
      NODE_TO_ELEMENT.delete(element);
    }
  }, [editor, key, element]);
  var children = useChildren({
    decorations,
    node: element,
    renderElement,
    renderPlaceholder,
    renderLeaf,
    selection
  });
  var attributes = {
    "data-slate-node": "element",
    ref
  };
  if (isInline) {
    attributes["data-slate-inline"] = true;
  }
  if (!isInline && Editor.hasInlines(editor, element)) {
    var text = Node.string(element);
    var dir = (0, import_direction.default)(text);
    if (dir === "rtl") {
      attributes.dir = dir;
    }
  }
  if (Editor.isVoid(editor, element)) {
    attributes["data-slate-void"] = true;
    if (!readOnly && isInline) {
      attributes.contentEditable = false;
    }
    var Tag = isInline ? "span" : "div";
    var [[_text]] = Node.texts(element);
    children = /* @__PURE__ */ import_react.default.createElement(Tag, {
      "data-slate-spacer": true,
      style: {
        height: "0",
        color: "transparent",
        outline: "none",
        position: "absolute"
      }
    }, /* @__PURE__ */ import_react.default.createElement(MemoizedText, {
      renderPlaceholder,
      decorations: [],
      isLast: false,
      parent: element,
      text: _text
    }));
    NODE_TO_INDEX.set(_text, 0);
    NODE_TO_PARENT.set(_text, element);
  }
  return renderElement({
    attributes,
    children,
    element
  });
};
var MemoizedElement = /* @__PURE__ */ import_react.default.memo(Element3, (prev, next) => {
  return prev.element === next.element && prev.renderElement === next.renderElement && prev.renderLeaf === next.renderLeaf && prev.renderPlaceholder === next.renderPlaceholder && isElementDecorationsEqual(prev.decorations, next.decorations) && (prev.selection === next.selection || !!prev.selection && !!next.selection && Range.equals(prev.selection, next.selection));
});
var DefaultElement = (props) => {
  var {
    attributes,
    children,
    element
  } = props;
  var editor = useSlateStatic();
  var Tag = editor.isInline(element) ? "span" : "div";
  return /* @__PURE__ */ import_react.default.createElement(Tag, _objectSpread$1(_objectSpread$1({}, attributes), {}, {
    style: {
      position: "relative"
    }
  }), children);
};
var DecorateContext = /* @__PURE__ */ (0, import_react.createContext)(() => []);
var useDecorate = () => {
  return (0, import_react.useContext)(DecorateContext);
};
var SelectedContext = /* @__PURE__ */ (0, import_react.createContext)(false);
var useSelected = () => {
  return (0, import_react.useContext)(SelectedContext);
};
var useChildren = (props) => {
  var {
    decorations,
    node,
    renderElement,
    renderPlaceholder,
    renderLeaf,
    selection
  } = props;
  var decorate = useDecorate();
  var editor = useSlateStatic();
  IS_NODE_MAP_DIRTY.set(editor, false);
  var path = ReactEditor.findPath(editor, node);
  var children = [];
  var isLeafBlock = Element2.isElement(node) && !editor.isInline(node) && Editor.hasInlines(editor, node);
  for (var i = 0; i < node.children.length; i++) {
    var p = path.concat(i);
    var n3 = node.children[i];
    var key = ReactEditor.findKey(editor, n3);
    var range = Editor.range(editor, p);
    var sel = selection && Range.intersection(range, selection);
    var ds = decorate([n3, p]);
    for (var dec of decorations) {
      var d = Range.intersection(dec, range);
      if (d) {
        ds.push(d);
      }
    }
    if (Element2.isElement(n3)) {
      children.push(/* @__PURE__ */ import_react.default.createElement(SelectedContext.Provider, {
        key: "provider-".concat(key.id),
        value: !!sel
      }, /* @__PURE__ */ import_react.default.createElement(MemoizedElement, {
        decorations: ds,
        element: n3,
        key: key.id,
        renderElement,
        renderPlaceholder,
        renderLeaf,
        selection: sel
      })));
    } else {
      children.push(/* @__PURE__ */ import_react.default.createElement(MemoizedText, {
        decorations: ds,
        key: key.id,
        isLast: isLeafBlock && i === node.children.length - 1,
        parent: node,
        renderPlaceholder,
        renderLeaf,
        text: n3
      }));
    }
    NODE_TO_INDEX.set(n3, i);
    NODE_TO_PARENT.set(n3, node);
  }
  return children;
};
var ReadOnlyContext = /* @__PURE__ */ (0, import_react.createContext)(false);
var useReadOnly = () => {
  return (0, import_react.useContext)(ReadOnlyContext);
};
var SlateContext = /* @__PURE__ */ (0, import_react.createContext)(null);
var useSlate = () => {
  var context = (0, import_react.useContext)(SlateContext);
  if (!context) {
    throw new Error("The `useSlate` hook must be used inside the <Slate> component's context.");
  }
  var {
    editor
  } = context;
  return editor;
};
function useTrackUserInput() {
  var editor = useSlateStatic();
  var receivedUserInput = (0, import_react.useRef)(false);
  var animationFrameIdRef = (0, import_react.useRef)(0);
  var onUserInput = (0, import_react.useCallback)(() => {
    if (receivedUserInput.current) {
      return;
    }
    receivedUserInput.current = true;
    var window2 = ReactEditor.getWindow(editor);
    window2.cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = window2.requestAnimationFrame(() => {
      receivedUserInput.current = false;
    });
  }, [editor]);
  (0, import_react.useEffect)(() => () => cancelAnimationFrame(animationFrameIdRef.current), []);
  return {
    receivedUserInput,
    onUserInput
  };
}
var createRestoreDomManager = (editor, receivedUserInput) => {
  var bufferedMutations = [];
  var clear = () => {
    bufferedMutations = [];
  };
  var registerMutations = (mutations) => {
    if (!receivedUserInput.current) {
      return;
    }
    var trackedMutations = mutations.filter((mutation) => isTrackedMutation(editor, mutation, mutations));
    bufferedMutations.push(...trackedMutations);
  };
  function restoreDOM() {
    if (bufferedMutations.length > 0) {
      bufferedMutations.reverse().forEach((mutation) => {
        if (mutation.type === "characterData") {
          return;
        }
        mutation.removedNodes.forEach((node) => {
          mutation.target.insertBefore(node, mutation.nextSibling);
        });
        mutation.addedNodes.forEach((node) => {
          mutation.target.removeChild(node);
        });
      });
      clear();
    }
  }
  return {
    registerMutations,
    restoreDOM,
    clear
  };
};
var MUTATION_OBSERVER_CONFIG = {
  subtree: true,
  childList: true,
  characterData: true,
  characterDataOldValue: true
};
var RestoreDOMComponent = class extends import_react.Component {
  constructor() {
    super(...arguments);
    _defineProperty2(this, "context", null);
    _defineProperty2(this, "manager", null);
    _defineProperty2(this, "mutationObserver", null);
  }
  observe() {
    var _this$mutationObserve;
    var {
      node
    } = this.props;
    if (!node.current) {
      throw new Error("Failed to attach MutationObserver, `node` is undefined");
    }
    (_this$mutationObserve = this.mutationObserver) === null || _this$mutationObserve === void 0 || _this$mutationObserve.observe(node.current, MUTATION_OBSERVER_CONFIG);
  }
  componentDidMount() {
    var {
      receivedUserInput
    } = this.props;
    var editor = this.context;
    this.manager = createRestoreDomManager(editor, receivedUserInput);
    this.mutationObserver = new MutationObserver(this.manager.registerMutations);
    this.observe();
  }
  getSnapshotBeforeUpdate() {
    var _this$mutationObserve2, _this$mutationObserve3, _this$manager2;
    var pendingMutations = (_this$mutationObserve2 = this.mutationObserver) === null || _this$mutationObserve2 === void 0 ? void 0 : _this$mutationObserve2.takeRecords();
    if (pendingMutations !== null && pendingMutations !== void 0 && pendingMutations.length) {
      var _this$manager;
      (_this$manager = this.manager) === null || _this$manager === void 0 || _this$manager.registerMutations(pendingMutations);
    }
    (_this$mutationObserve3 = this.mutationObserver) === null || _this$mutationObserve3 === void 0 || _this$mutationObserve3.disconnect();
    (_this$manager2 = this.manager) === null || _this$manager2 === void 0 || _this$manager2.restoreDOM();
    return null;
  }
  componentDidUpdate() {
    var _this$manager3;
    (_this$manager3 = this.manager) === null || _this$manager3 === void 0 || _this$manager3.clear();
    this.observe();
  }
  componentWillUnmount() {
    var _this$mutationObserve4;
    (_this$mutationObserve4 = this.mutationObserver) === null || _this$mutationObserve4 === void 0 || _this$mutationObserve4.disconnect();
  }
  render() {
    return this.props.children;
  }
};
_defineProperty2(RestoreDOMComponent, "contextType", EditorContext);
var RestoreDOM = IS_ANDROID ? RestoreDOMComponent : (_ref) => {
  var {
    children
  } = _ref;
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, children);
};
var ComposingContext = /* @__PURE__ */ (0, import_react.createContext)(false);
var _excluded$1 = ["autoFocus", "decorate", "onDOMBeforeInput", "placeholder", "readOnly", "renderElement", "renderLeaf", "renderPlaceholder", "scrollSelectionIntoView", "style", "as", "disableDefaultStyles"];
var _excluded22 = ["text"];
function ownKeys2(e3, r2) {
  var t2 = Object.keys(e3);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e3);
    r2 && (o3 = o3.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e3, r3).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread2(e3) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t2 = null != arguments[r2] ? arguments[r2] : {};
    r2 % 2 ? ownKeys2(Object(t2), true).forEach(function(r3) {
      _defineProperty2(e3, r3, t2[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t2)) : ownKeys2(Object(t2)).forEach(function(r3) {
      Object.defineProperty(e3, r3, Object.getOwnPropertyDescriptor(t2, r3));
    });
  }
  return e3;
}
var Children = (props) => /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, useChildren(props));
var Editable = /* @__PURE__ */ (0, import_react.forwardRef)((props, forwardedRef) => {
  var defaultRenderPlaceholder = (0, import_react.useCallback)((props2) => /* @__PURE__ */ import_react.default.createElement(DefaultPlaceholder, _objectSpread2({}, props2)), []);
  var {
    autoFocus,
    decorate = defaultDecorate,
    onDOMBeforeInput: propsOnDOMBeforeInput,
    placeholder,
    readOnly = false,
    renderElement,
    renderLeaf,
    renderPlaceholder = defaultRenderPlaceholder,
    scrollSelectionIntoView = defaultScrollSelectionIntoView,
    style: userStyle = {},
    as: Component2 = "div",
    disableDefaultStyles = false
  } = props, attributes = _objectWithoutProperties2(props, _excluded$1);
  var editor = useSlate();
  var [isComposing, setIsComposing] = (0, import_react.useState)(false);
  var ref = (0, import_react.useRef)(null);
  var deferredOperations = (0, import_react.useRef)([]);
  var [placeholderHeight, setPlaceholderHeight] = (0, import_react.useState)();
  var processing = (0, import_react.useRef)(false);
  var {
    onUserInput,
    receivedUserInput
  } = useTrackUserInput();
  var [, forceRender] = (0, import_react.useReducer)((s) => s + 1, 0);
  EDITOR_TO_FORCE_RENDER.set(editor, forceRender);
  IS_READ_ONLY.set(editor, readOnly);
  var state = (0, import_react.useMemo)(() => ({
    isDraggingInternally: false,
    isUpdatingSelection: false,
    latestElement: null,
    hasMarkPlaceholder: false
  }), []);
  (0, import_react.useEffect)(() => {
    if (ref.current && autoFocus) {
      ref.current.focus();
    }
  }, [autoFocus]);
  var androidInputManagerRef = (0, import_react.useRef)();
  var onDOMSelectionChange = (0, import_react.useMemo)(() => (0, import_throttle.default)(() => {
    if (IS_NODE_MAP_DIRTY.get(editor)) {
      onDOMSelectionChange();
      return;
    }
    var el = ReactEditor.toDOMNode(editor, editor);
    var root = el.getRootNode();
    if (!processing.current && IS_WEBKIT && root instanceof ShadowRoot) {
      processing.current = true;
      var active = getActiveElement();
      if (active) {
        document.execCommand("indent");
      } else {
        Transforms.deselect(editor);
      }
      processing.current = false;
      return;
    }
    var androidInputManager = androidInputManagerRef.current;
    if ((IS_ANDROID || !ReactEditor.isComposing(editor)) && (!state.isUpdatingSelection || androidInputManager !== null && androidInputManager !== void 0 && androidInputManager.isFlushing()) && !state.isDraggingInternally) {
      var _root = ReactEditor.findDocumentOrShadowRoot(editor);
      var {
        activeElement
      } = _root;
      var _el = ReactEditor.toDOMNode(editor, editor);
      var domSelection = getSelection(_root);
      if (activeElement === _el) {
        state.latestElement = activeElement;
        IS_FOCUSED.set(editor, true);
      } else {
        IS_FOCUSED.delete(editor);
      }
      if (!domSelection) {
        return Transforms.deselect(editor);
      }
      var {
        anchorNode,
        focusNode
      } = domSelection;
      var anchorNodeSelectable = ReactEditor.hasEditableTarget(editor, anchorNode) || ReactEditor.isTargetInsideNonReadonlyVoid(editor, anchorNode);
      var focusNodeInEditor = ReactEditor.hasTarget(editor, focusNode);
      if (anchorNodeSelectable && focusNodeInEditor) {
        var range = ReactEditor.toSlateRange(editor, domSelection, {
          exactMatch: false,
          suppressThrow: true
        });
        if (range) {
          if (!ReactEditor.isComposing(editor) && !(androidInputManager !== null && androidInputManager !== void 0 && androidInputManager.hasPendingChanges()) && !(androidInputManager !== null && androidInputManager !== void 0 && androidInputManager.isFlushing())) {
            Transforms.select(editor, range);
          } else {
            androidInputManager === null || androidInputManager === void 0 || androidInputManager.handleUserSelect(range);
          }
        }
      }
      if (readOnly && (!anchorNodeSelectable || !focusNodeInEditor)) {
        Transforms.deselect(editor);
      }
    }
  }, 100), [editor, readOnly, state]);
  var scheduleOnDOMSelectionChange = (0, import_react.useMemo)(() => (0, import_debounce.default)(onDOMSelectionChange, 0), [onDOMSelectionChange]);
  androidInputManagerRef.current = useAndroidInputManager({
    node: ref,
    onDOMSelectionChange,
    scheduleOnDOMSelectionChange
  });
  useIsomorphicLayoutEffect(() => {
    var _androidInputManagerR, _androidInputManagerR2;
    var window2;
    if (ref.current && (window2 = getDefaultView(ref.current))) {
      EDITOR_TO_WINDOW.set(editor, window2);
      EDITOR_TO_ELEMENT.set(editor, ref.current);
      NODE_TO_ELEMENT.set(editor, ref.current);
      ELEMENT_TO_NODE.set(ref.current, editor);
    } else {
      NODE_TO_ELEMENT.delete(editor);
    }
    var {
      selection
    } = editor;
    var root = ReactEditor.findDocumentOrShadowRoot(editor);
    var domSelection = getSelection(root);
    if (!domSelection || !ReactEditor.isFocused(editor) || (_androidInputManagerR = androidInputManagerRef.current) !== null && _androidInputManagerR !== void 0 && _androidInputManagerR.hasPendingAction()) {
      return;
    }
    var setDomSelection = (forceChange) => {
      var hasDomSelection = domSelection.type !== "None";
      if (!selection && !hasDomSelection) {
        return;
      }
      var focusNode = domSelection.focusNode;
      var anchorNode;
      if (IS_FIREFOX && domSelection.rangeCount > 1) {
        var firstRange = domSelection.getRangeAt(0);
        var lastRange = domSelection.getRangeAt(domSelection.rangeCount - 1);
        if (firstRange.startContainer === focusNode) {
          anchorNode = lastRange.endContainer;
        } else {
          anchorNode = firstRange.startContainer;
        }
      } else {
        anchorNode = domSelection.anchorNode;
      }
      var editorElement = EDITOR_TO_ELEMENT.get(editor);
      var hasDomSelectionInEditor = false;
      if (editorElement.contains(anchorNode) && editorElement.contains(focusNode)) {
        hasDomSelectionInEditor = true;
      }
      if (hasDomSelection && hasDomSelectionInEditor && selection && !forceChange) {
        var slateRange = ReactEditor.toSlateRange(editor, domSelection, {
          exactMatch: true,
          // domSelection is not necessarily a valid Slate range
          // (e.g. when clicking on contentEditable:false element)
          suppressThrow: true
        });
        if (slateRange && Range.equals(slateRange, selection)) {
          var _anchorNode;
          if (!state.hasMarkPlaceholder) {
            return;
          }
          if ((_anchorNode = anchorNode) !== null && _anchorNode !== void 0 && (_anchorNode = _anchorNode.parentElement) !== null && _anchorNode !== void 0 && _anchorNode.hasAttribute("data-slate-mark-placeholder")) {
            return;
          }
        }
      }
      if (selection && !ReactEditor.hasRange(editor, selection)) {
        editor.selection = ReactEditor.toSlateRange(editor, domSelection, {
          exactMatch: false,
          suppressThrow: true
        });
        return;
      }
      state.isUpdatingSelection = true;
      var newDomRange = null;
      try {
        newDomRange = selection && ReactEditor.toDOMRange(editor, selection);
      } catch (e3) {
      }
      if (newDomRange) {
        if (ReactEditor.isComposing(editor) && !IS_ANDROID) {
          domSelection.collapseToEnd();
        } else if (Range.isBackward(selection)) {
          domSelection.setBaseAndExtent(newDomRange.endContainer, newDomRange.endOffset, newDomRange.startContainer, newDomRange.startOffset);
        } else {
          domSelection.setBaseAndExtent(newDomRange.startContainer, newDomRange.startOffset, newDomRange.endContainer, newDomRange.endOffset);
        }
        scrollSelectionIntoView(editor, newDomRange);
      } else {
        domSelection.removeAllRanges();
      }
      return newDomRange;
    };
    if (domSelection.rangeCount <= 1) {
      setDomSelection();
    }
    var ensureSelection = ((_androidInputManagerR2 = androidInputManagerRef.current) === null || _androidInputManagerR2 === void 0 ? void 0 : _androidInputManagerR2.isFlushing()) === "action";
    if (!IS_ANDROID || !ensureSelection) {
      setTimeout(() => {
        state.isUpdatingSelection = false;
      });
      return;
    }
    var timeoutId = null;
    var animationFrameId = requestAnimationFrame(() => {
      if (ensureSelection) {
        var ensureDomSelection = (forceChange) => {
          try {
            var el = ReactEditor.toDOMNode(editor, editor);
            el.focus();
            setDomSelection(forceChange);
          } catch (e3) {
          }
        };
        ensureDomSelection();
        timeoutId = setTimeout(() => {
          ensureDomSelection(true);
          state.isUpdatingSelection = false;
        });
      }
    });
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
  var onDOMBeforeInput = (0, import_react.useCallback)((event) => {
    var el = ReactEditor.toDOMNode(editor, editor);
    var root = el.getRootNode();
    if (processing !== null && processing !== void 0 && processing.current && IS_WEBKIT && root instanceof ShadowRoot) {
      var ranges = event.getTargetRanges();
      var range = ranges[0];
      var newRange = new window.Range();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(range.endContainer, range.endOffset);
      var slateRange = ReactEditor.toSlateRange(editor, newRange, {
        exactMatch: false,
        suppressThrow: false
      });
      Transforms.select(editor, slateRange);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onUserInput();
    if (!readOnly && ReactEditor.hasEditableTarget(editor, event.target) && !isDOMEventHandled(event, propsOnDOMBeforeInput)) {
      var _EDITOR_TO_USER_SELEC;
      if (androidInputManagerRef.current) {
        return androidInputManagerRef.current.handleDOMBeforeInput(event);
      }
      scheduleOnDOMSelectionChange.flush();
      onDOMSelectionChange.flush();
      var {
        selection
      } = editor;
      var {
        inputType: type
      } = event;
      var data = event.dataTransfer || event.data || void 0;
      var isCompositionChange = type === "insertCompositionText" || type === "deleteCompositionText";
      if (isCompositionChange && ReactEditor.isComposing(editor)) {
        return;
      }
      var native = false;
      if (type === "insertText" && selection && Range.isCollapsed(selection) && // Only use native character insertion for single characters a-z or space for now.
      // Long-press events (hold a + press 4 = ä) to choose a special character otherwise
      // causes duplicate inserts.
      event.data && event.data.length === 1 && /[a-z ]/i.test(event.data) && // Chrome has issues correctly editing the start of nodes: https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
      // When there is an inline element, e.g. a link, and you select
      // right after it (the start of the next node).
      selection.anchor.offset !== 0) {
        native = true;
        if (editor.marks) {
          native = false;
        }
        if (!IS_NODE_MAP_DIRTY.get(editor)) {
          var _node$parentElement, _window$getComputedSt;
          var {
            anchor: anchor2
          } = selection;
          var [node, offset] = ReactEditor.toDOMPoint(editor, anchor2);
          var anchorNode = (_node$parentElement = node.parentElement) === null || _node$parentElement === void 0 ? void 0 : _node$parentElement.closest("a");
          var _window = ReactEditor.getWindow(editor);
          if (native && anchorNode && ReactEditor.hasDOMNode(editor, anchorNode)) {
            var _lastText$textContent;
            var lastText = _window === null || _window === void 0 ? void 0 : _window.document.createTreeWalker(anchorNode, NodeFilter.SHOW_TEXT).lastChild();
            if (lastText === node && ((_lastText$textContent = lastText.textContent) === null || _lastText$textContent === void 0 ? void 0 : _lastText$textContent.length) === offset) {
              native = false;
            }
          }
          if (native && node.parentElement && (_window === null || _window === void 0 || (_window$getComputedSt = _window.getComputedStyle(node.parentElement)) === null || _window$getComputedSt === void 0 ? void 0 : _window$getComputedSt.whiteSpace) === "pre") {
            var block = Editor.above(editor, {
              at: anchor2.path,
              match: (n3) => Element2.isElement(n3) && Editor.isBlock(editor, n3)
            });
            if (block && Node.string(block[0]).includes("	")) {
              native = false;
            }
          }
        }
      }
      if ((!type.startsWith("delete") || type.startsWith("deleteBy")) && !IS_NODE_MAP_DIRTY.get(editor)) {
        var [targetRange2] = event.getTargetRanges();
        if (targetRange2) {
          var _range = ReactEditor.toSlateRange(editor, targetRange2, {
            exactMatch: false,
            suppressThrow: false
          });
          if (!selection || !Range.equals(selection, _range)) {
            native = false;
            var selectionRef = !isCompositionChange && editor.selection && Editor.rangeRef(editor, editor.selection);
            Transforms.select(editor, _range);
            if (selectionRef) {
              EDITOR_TO_USER_SELECTION.set(editor, selectionRef);
            }
          }
        }
      }
      if (isCompositionChange) {
        return;
      }
      if (!native) {
        event.preventDefault();
      }
      if (selection && Range.isExpanded(selection) && type.startsWith("delete")) {
        var direction = type.endsWith("Backward") ? "backward" : "forward";
        Editor.deleteFragment(editor, {
          direction
        });
        return;
      }
      switch (type) {
        case "deleteByComposition":
        case "deleteByCut":
        case "deleteByDrag": {
          Editor.deleteFragment(editor);
          break;
        }
        case "deleteContent":
        case "deleteContentForward": {
          Editor.deleteForward(editor);
          break;
        }
        case "deleteContentBackward": {
          Editor.deleteBackward(editor);
          break;
        }
        case "deleteEntireSoftLine": {
          Editor.deleteBackward(editor, {
            unit: "line"
          });
          Editor.deleteForward(editor, {
            unit: "line"
          });
          break;
        }
        case "deleteHardLineBackward": {
          Editor.deleteBackward(editor, {
            unit: "block"
          });
          break;
        }
        case "deleteSoftLineBackward": {
          Editor.deleteBackward(editor, {
            unit: "line"
          });
          break;
        }
        case "deleteHardLineForward": {
          Editor.deleteForward(editor, {
            unit: "block"
          });
          break;
        }
        case "deleteSoftLineForward": {
          Editor.deleteForward(editor, {
            unit: "line"
          });
          break;
        }
        case "deleteWordBackward": {
          Editor.deleteBackward(editor, {
            unit: "word"
          });
          break;
        }
        case "deleteWordForward": {
          Editor.deleteForward(editor, {
            unit: "word"
          });
          break;
        }
        case "insertLineBreak":
          Editor.insertSoftBreak(editor);
          break;
        case "insertParagraph": {
          Editor.insertBreak(editor);
          break;
        }
        case "insertFromComposition":
        case "insertFromDrop":
        case "insertFromPaste":
        case "insertFromYank":
        case "insertReplacementText":
        case "insertText": {
          if (type === "insertFromComposition") {
            if (ReactEditor.isComposing(editor)) {
              setIsComposing(false);
              IS_COMPOSING.set(editor, false);
            }
          }
          if ((data === null || data === void 0 ? void 0 : data.constructor.name) === "DataTransfer") {
            ReactEditor.insertData(editor, data);
          } else if (typeof data === "string") {
            if (native) {
              deferredOperations.current.push(() => Editor.insertText(editor, data));
            } else {
              Editor.insertText(editor, data);
            }
          }
          break;
        }
      }
      var toRestore = (_EDITOR_TO_USER_SELEC = EDITOR_TO_USER_SELECTION.get(editor)) === null || _EDITOR_TO_USER_SELEC === void 0 ? void 0 : _EDITOR_TO_USER_SELEC.unref();
      EDITOR_TO_USER_SELECTION.delete(editor);
      if (toRestore && (!editor.selection || !Range.equals(editor.selection, toRestore))) {
        Transforms.select(editor, toRestore);
      }
    }
  }, [editor, onDOMSelectionChange, onUserInput, propsOnDOMBeforeInput, readOnly, scheduleOnDOMSelectionChange]);
  var callbackRef = (0, import_react.useCallback)((node) => {
    if (node == null) {
      onDOMSelectionChange.cancel();
      scheduleOnDOMSelectionChange.cancel();
      EDITOR_TO_ELEMENT.delete(editor);
      NODE_TO_ELEMENT.delete(editor);
      if (ref.current && HAS_BEFORE_INPUT_SUPPORT) {
        ref.current.removeEventListener("beforeinput", onDOMBeforeInput);
      }
    } else {
      if (HAS_BEFORE_INPUT_SUPPORT) {
        node.addEventListener("beforeinput", onDOMBeforeInput);
      }
    }
    ref.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [onDOMSelectionChange, scheduleOnDOMSelectionChange, editor, onDOMBeforeInput, forwardedRef]);
  useIsomorphicLayoutEffect(() => {
    var window2 = ReactEditor.getWindow(editor);
    var onSelectionChange = (_ref) => {
      var {
        target
      } = _ref;
      var targetElement = target instanceof HTMLElement ? target : null;
      var targetTagName = targetElement === null || targetElement === void 0 ? void 0 : targetElement.tagName;
      if (targetTagName === "INPUT" || targetTagName === "TEXTAREA") {
        return;
      }
      scheduleOnDOMSelectionChange();
    };
    window2.document.addEventListener("selectionchange", onSelectionChange);
    var stoppedDragging = () => {
      state.isDraggingInternally = false;
    };
    window2.document.addEventListener("dragend", stoppedDragging);
    window2.document.addEventListener("drop", stoppedDragging);
    return () => {
      window2.document.removeEventListener("selectionchange", onSelectionChange);
      window2.document.removeEventListener("dragend", stoppedDragging);
      window2.document.removeEventListener("drop", stoppedDragging);
    };
  }, [scheduleOnDOMSelectionChange, state]);
  var decorations = decorate([editor, []]);
  var showPlaceholder = placeholder && editor.children.length === 1 && Array.from(Node.texts(editor)).length === 1 && Node.string(editor) === "" && !isComposing;
  var placeHolderResizeHandler = (0, import_react.useCallback)((placeholderEl) => {
    if (placeholderEl && showPlaceholder) {
      var _placeholderEl$getBou;
      setPlaceholderHeight((_placeholderEl$getBou = placeholderEl.getBoundingClientRect()) === null || _placeholderEl$getBou === void 0 ? void 0 : _placeholderEl$getBou.height);
    } else {
      setPlaceholderHeight(void 0);
    }
  }, [showPlaceholder]);
  if (showPlaceholder) {
    var start = Editor.start(editor, []);
    decorations.push({
      [PLACEHOLDER_SYMBOL]: true,
      placeholder,
      onPlaceholderResize: placeHolderResizeHandler,
      anchor: start,
      focus: start
    });
  }
  var {
    marks
  } = editor;
  state.hasMarkPlaceholder = false;
  if (editor.selection && Range.isCollapsed(editor.selection) && marks) {
    var {
      anchor
    } = editor.selection;
    var leaf = Node.leaf(editor, anchor.path);
    var rest = _objectWithoutProperties2(leaf, _excluded22);
    if (!Text.equals(leaf, marks, {
      loose: true
    })) {
      state.hasMarkPlaceholder = true;
      var unset = Object.fromEntries(Object.keys(rest).map((mark) => [mark, null]));
      decorations.push(_objectSpread2(_objectSpread2(_objectSpread2({
        [MARK_PLACEHOLDER_SYMBOL]: true
      }, unset), marks), {}, {
        anchor,
        focus: anchor
      }));
    }
  }
  (0, import_react.useEffect)(() => {
    setTimeout(() => {
      var {
        selection
      } = editor;
      if (selection) {
        var {
          anchor: _anchor
        } = selection;
        var _text = Node.leaf(editor, _anchor.path);
        if (marks && !Text.equals(_text, marks, {
          loose: true
        })) {
          EDITOR_TO_PENDING_INSERTION_MARKS.set(editor, marks);
          return;
        }
      }
      EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor);
    });
  });
  return /* @__PURE__ */ import_react.default.createElement(ReadOnlyContext.Provider, {
    value: readOnly
  }, /* @__PURE__ */ import_react.default.createElement(ComposingContext.Provider, {
    value: isComposing
  }, /* @__PURE__ */ import_react.default.createElement(DecorateContext.Provider, {
    value: decorate
  }, /* @__PURE__ */ import_react.default.createElement(RestoreDOM, {
    node: ref,
    receivedUserInput
  }, /* @__PURE__ */ import_react.default.createElement(Component2, _objectSpread2(_objectSpread2({
    role: readOnly ? void 0 : "textbox",
    "aria-multiline": readOnly ? void 0 : true
  }, attributes), {}, {
    // COMPAT: Certain browsers don't support the `beforeinput` event, so we'd
    // have to use hacks to make these replacement-based features work.
    // For SSR situations HAS_BEFORE_INPUT_SUPPORT is false and results in prop
    // mismatch warning app moves to browser. Pass-through consumer props when
    // not CAN_USE_DOM (SSR) and default to falsy value
    spellCheck: HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM ? attributes.spellCheck : false,
    autoCorrect: HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM ? attributes.autoCorrect : "false",
    autoCapitalize: HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM ? attributes.autoCapitalize : "false",
    "data-slate-editor": true,
    "data-slate-node": "value",
    // explicitly set this
    contentEditable: !readOnly,
    // in some cases, a decoration needs access to the range / selection to decorate a text node,
    // then you will select the whole text node when you select part the of text
    // this magic zIndex="-1" will fix it
    zindex: -1,
    suppressContentEditableWarning: true,
    ref: callbackRef,
    style: _objectSpread2(_objectSpread2({}, disableDefaultStyles ? {} : _objectSpread2({
      // Allow positioning relative to the editable element.
      position: "relative",
      // Preserve adjacent whitespace and new lines.
      whiteSpace: "pre-wrap",
      // Allow words to break if they are too long.
      wordWrap: "break-word"
    }, placeholderHeight ? {
      minHeight: placeholderHeight
    } : {})), userStyle),
    onBeforeInput: (0, import_react.useCallback)((event) => {
      if (!HAS_BEFORE_INPUT_SUPPORT && !readOnly && !isEventHandled(event, attributes.onBeforeInput) && ReactEditor.hasSelectableTarget(editor, event.target)) {
        event.preventDefault();
        if (!ReactEditor.isComposing(editor)) {
          var _text2 = event.data;
          Editor.insertText(editor, _text2);
        }
      }
    }, [attributes.onBeforeInput, editor, readOnly]),
    onInput: (0, import_react.useCallback)((event) => {
      if (isEventHandled(event, attributes.onInput)) {
        return;
      }
      if (androidInputManagerRef.current) {
        androidInputManagerRef.current.handleInput();
        return;
      }
      for (var op of deferredOperations.current) {
        op();
      }
      deferredOperations.current = [];
      if (!ReactEditor.isFocused(editor)) {
        var native = event.nativeEvent;
        var maybeHistoryEditor = editor;
        if (native.inputType === "historyUndo" && typeof maybeHistoryEditor.undo === "function") {
          maybeHistoryEditor.undo();
          return;
        }
        if (native.inputType === "historyRedo" && typeof maybeHistoryEditor.redo === "function") {
          maybeHistoryEditor.redo();
          return;
        }
      }
    }, [attributes.onInput, editor]),
    onBlur: (0, import_react.useCallback)((event) => {
      if (readOnly || state.isUpdatingSelection || !ReactEditor.hasSelectableTarget(editor, event.target) || isEventHandled(event, attributes.onBlur)) {
        return;
      }
      var root = ReactEditor.findDocumentOrShadowRoot(editor);
      if (state.latestElement === root.activeElement) {
        return;
      }
      var {
        relatedTarget
      } = event;
      var el = ReactEditor.toDOMNode(editor, editor);
      if (relatedTarget === el) {
        return;
      }
      if (isDOMElement(relatedTarget) && relatedTarget.hasAttribute("data-slate-spacer")) {
        return;
      }
      if (relatedTarget != null && isDOMNode(relatedTarget) && ReactEditor.hasDOMNode(editor, relatedTarget)) {
        var node = ReactEditor.toSlateNode(editor, relatedTarget);
        if (Element2.isElement(node) && !editor.isVoid(node)) {
          return;
        }
      }
      if (IS_WEBKIT) {
        var domSelection = getSelection(root);
        domSelection === null || domSelection === void 0 || domSelection.removeAllRanges();
      }
      IS_FOCUSED.delete(editor);
    }, [readOnly, state.isUpdatingSelection, state.latestElement, editor, attributes.onBlur]),
    onClick: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasTarget(editor, event.target) && !isEventHandled(event, attributes.onClick) && isDOMNode(event.target)) {
        var node = ReactEditor.toSlateNode(editor, event.target);
        var path = ReactEditor.findPath(editor, node);
        if (!Editor.hasPath(editor, path) || Node.get(editor, path) !== node) {
          return;
        }
        if (event.detail === TRIPLE_CLICK && path.length >= 1) {
          var blockPath = path;
          if (!(Element2.isElement(node) && Editor.isBlock(editor, node))) {
            var _block$;
            var block = Editor.above(editor, {
              match: (n3) => Element2.isElement(n3) && Editor.isBlock(editor, n3),
              at: path
            });
            blockPath = (_block$ = block === null || block === void 0 ? void 0 : block[1]) !== null && _block$ !== void 0 ? _block$ : path.slice(0, 1);
          }
          var range = Editor.range(editor, blockPath);
          Transforms.select(editor, range);
          return;
        }
        if (readOnly) {
          return;
        }
        var _start = Editor.start(editor, path);
        var end = Editor.end(editor, path);
        var startVoid = Editor.void(editor, {
          at: _start
        });
        var endVoid = Editor.void(editor, {
          at: end
        });
        if (startVoid && endVoid && Path.equals(startVoid[1], endVoid[1])) {
          var _range2 = Editor.range(editor, _start);
          Transforms.select(editor, _range2);
        }
      }
    }, [editor, attributes.onClick, readOnly]),
    onCompositionEnd: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasSelectableTarget(editor, event.target)) {
        var _androidInputManagerR3;
        if (ReactEditor.isComposing(editor)) {
          Promise.resolve().then(() => {
            setIsComposing(false);
            IS_COMPOSING.set(editor, false);
          });
        }
        (_androidInputManagerR3 = androidInputManagerRef.current) === null || _androidInputManagerR3 === void 0 || _androidInputManagerR3.handleCompositionEnd(event);
        if (isEventHandled(event, attributes.onCompositionEnd) || IS_ANDROID) {
          return;
        }
        if (!IS_WEBKIT && !IS_FIREFOX_LEGACY && !IS_IOS && !IS_WECHATBROWSER && !IS_UC_MOBILE && event.data) {
          var placeholderMarks = EDITOR_TO_PENDING_INSERTION_MARKS.get(editor);
          EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor);
          if (placeholderMarks !== void 0) {
            EDITOR_TO_USER_MARKS.set(editor, editor.marks);
            editor.marks = placeholderMarks;
          }
          Editor.insertText(editor, event.data);
          var userMarks = EDITOR_TO_USER_MARKS.get(editor);
          EDITOR_TO_USER_MARKS.delete(editor);
          if (userMarks !== void 0) {
            editor.marks = userMarks;
          }
        }
      }
    }, [attributes.onCompositionEnd, editor]),
    onCompositionUpdate: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasSelectableTarget(editor, event.target) && !isEventHandled(event, attributes.onCompositionUpdate)) {
        if (!ReactEditor.isComposing(editor)) {
          setIsComposing(true);
          IS_COMPOSING.set(editor, true);
        }
      }
    }, [attributes.onCompositionUpdate, editor]),
    onCompositionStart: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasSelectableTarget(editor, event.target)) {
        var _androidInputManagerR4;
        (_androidInputManagerR4 = androidInputManagerRef.current) === null || _androidInputManagerR4 === void 0 || _androidInputManagerR4.handleCompositionStart(event);
        if (isEventHandled(event, attributes.onCompositionStart) || IS_ANDROID) {
          return;
        }
        setIsComposing(true);
        var {
          selection
        } = editor;
        if (selection && Range.isExpanded(selection)) {
          Editor.deleteFragment(editor);
          return;
        }
      }
    }, [attributes.onCompositionStart, editor]),
    onCopy: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasSelectableTarget(editor, event.target) && !isEventHandled(event, attributes.onCopy) && !isDOMEventTargetInput(event)) {
        event.preventDefault();
        ReactEditor.setFragmentData(editor, event.clipboardData, "copy");
      }
    }, [attributes.onCopy, editor]),
    onCut: (0, import_react.useCallback)((event) => {
      if (!readOnly && ReactEditor.hasSelectableTarget(editor, event.target) && !isEventHandled(event, attributes.onCut) && !isDOMEventTargetInput(event)) {
        event.preventDefault();
        ReactEditor.setFragmentData(editor, event.clipboardData, "cut");
        var {
          selection
        } = editor;
        if (selection) {
          if (Range.isExpanded(selection)) {
            Editor.deleteFragment(editor);
          } else {
            var node = Node.parent(editor, selection.anchor.path);
            if (Editor.isVoid(editor, node)) {
              Transforms.delete(editor);
            }
          }
        }
      }
    }, [readOnly, editor, attributes.onCut]),
    onDragOver: (0, import_react.useCallback)((event) => {
      if (ReactEditor.hasTarget(editor, event.target) && !isEventHandled(event, attributes.onDragOver)) {
        var node = ReactEditor.toSlateNode(editor, event.target);
        if (Element2.isElement(node) && Editor.isVoid(editor, node)) {
          event.preventDefault();
        }
      }
    }, [attributes.onDragOver, editor]),
    onDragStart: (0, import_react.useCallback)((event) => {
      if (!readOnly && ReactEditor.hasTarget(editor, event.target) && !isEventHandled(event, attributes.onDragStart)) {
        var node = ReactEditor.toSlateNode(editor, event.target);
        var path = ReactEditor.findPath(editor, node);
        var voidMatch = Element2.isElement(node) && Editor.isVoid(editor, node) || Editor.void(editor, {
          at: path,
          voids: true
        });
        if (voidMatch) {
          var range = Editor.range(editor, path);
          Transforms.select(editor, range);
        }
        state.isDraggingInternally = true;
        ReactEditor.setFragmentData(editor, event.dataTransfer, "drag");
      }
    }, [readOnly, editor, attributes.onDragStart, state]),
    onDrop: (0, import_react.useCallback)((event) => {
      if (!readOnly && ReactEditor.hasTarget(editor, event.target) && !isEventHandled(event, attributes.onDrop)) {
        event.preventDefault();
        var draggedRange = editor.selection;
        var range = ReactEditor.findEventRange(editor, event);
        var data = event.dataTransfer;
        Transforms.select(editor, range);
        if (state.isDraggingInternally) {
          if (draggedRange && !Range.equals(draggedRange, range) && !Editor.void(editor, {
            at: range,
            voids: true
          })) {
            Transforms.delete(editor, {
              at: draggedRange
            });
          }
        }
        ReactEditor.insertData(editor, data);
        if (!ReactEditor.isFocused(editor)) {
          ReactEditor.focus(editor);
        }
      }
    }, [readOnly, editor, attributes.onDrop, state]),
    onDragEnd: (0, import_react.useCallback)((event) => {
      if (!readOnly && state.isDraggingInternally && attributes.onDragEnd && ReactEditor.hasTarget(editor, event.target)) {
        attributes.onDragEnd(event);
      }
    }, [readOnly, state, attributes, editor]),
    onFocus: (0, import_react.useCallback)((event) => {
      if (!readOnly && !state.isUpdatingSelection && ReactEditor.hasEditableTarget(editor, event.target) && !isEventHandled(event, attributes.onFocus)) {
        var el = ReactEditor.toDOMNode(editor, editor);
        var root = ReactEditor.findDocumentOrShadowRoot(editor);
        state.latestElement = root.activeElement;
        if (IS_FIREFOX && event.target !== el) {
          el.focus();
          return;
        }
        IS_FOCUSED.set(editor, true);
      }
    }, [readOnly, state, editor, attributes.onFocus]),
    onKeyDown: (0, import_react.useCallback)((event) => {
      if (!readOnly && ReactEditor.hasEditableTarget(editor, event.target)) {
        var _androidInputManagerR5;
        (_androidInputManagerR5 = androidInputManagerRef.current) === null || _androidInputManagerR5 === void 0 || _androidInputManagerR5.handleKeyDown(event);
        var {
          nativeEvent
        } = event;
        if (ReactEditor.isComposing(editor) && nativeEvent.isComposing === false) {
          IS_COMPOSING.set(editor, false);
          setIsComposing(false);
        }
        if (isEventHandled(event, attributes.onKeyDown) || ReactEditor.isComposing(editor)) {
          return;
        }
        var {
          selection
        } = editor;
        var element = editor.children[selection !== null ? selection.focus.path[0] : 0];
        var isRTL = (0, import_direction.default)(Node.string(element)) === "rtl";
        if (hotkeys.isRedo(nativeEvent)) {
          event.preventDefault();
          var maybeHistoryEditor = editor;
          if (typeof maybeHistoryEditor.redo === "function") {
            maybeHistoryEditor.redo();
          }
          return;
        }
        if (hotkeys.isUndo(nativeEvent)) {
          event.preventDefault();
          var _maybeHistoryEditor = editor;
          if (typeof _maybeHistoryEditor.undo === "function") {
            _maybeHistoryEditor.undo();
          }
          return;
        }
        if (hotkeys.isMoveLineBackward(nativeEvent)) {
          event.preventDefault();
          Transforms.move(editor, {
            unit: "line",
            reverse: true
          });
          return;
        }
        if (hotkeys.isMoveLineForward(nativeEvent)) {
          event.preventDefault();
          Transforms.move(editor, {
            unit: "line"
          });
          return;
        }
        if (hotkeys.isExtendLineBackward(nativeEvent)) {
          event.preventDefault();
          Transforms.move(editor, {
            unit: "line",
            edge: "focus",
            reverse: true
          });
          return;
        }
        if (hotkeys.isExtendLineForward(nativeEvent)) {
          event.preventDefault();
          Transforms.move(editor, {
            unit: "line",
            edge: "focus"
          });
          return;
        }
        if (hotkeys.isMoveBackward(nativeEvent)) {
          event.preventDefault();
          if (selection && Range.isCollapsed(selection)) {
            Transforms.move(editor, {
              reverse: !isRTL
            });
          } else {
            Transforms.collapse(editor, {
              edge: isRTL ? "end" : "start"
            });
          }
          return;
        }
        if (hotkeys.isMoveForward(nativeEvent)) {
          event.preventDefault();
          if (selection && Range.isCollapsed(selection)) {
            Transforms.move(editor, {
              reverse: isRTL
            });
          } else {
            Transforms.collapse(editor, {
              edge: isRTL ? "start" : "end"
            });
          }
          return;
        }
        if (hotkeys.isMoveWordBackward(nativeEvent)) {
          event.preventDefault();
          if (selection && Range.isExpanded(selection)) {
            Transforms.collapse(editor, {
              edge: "focus"
            });
          }
          Transforms.move(editor, {
            unit: "word",
            reverse: !isRTL
          });
          return;
        }
        if (hotkeys.isMoveWordForward(nativeEvent)) {
          event.preventDefault();
          if (selection && Range.isExpanded(selection)) {
            Transforms.collapse(editor, {
              edge: "focus"
            });
          }
          Transforms.move(editor, {
            unit: "word",
            reverse: isRTL
          });
          return;
        }
        if (!HAS_BEFORE_INPUT_SUPPORT) {
          if (hotkeys.isBold(nativeEvent) || hotkeys.isItalic(nativeEvent) || hotkeys.isTransposeCharacter(nativeEvent)) {
            event.preventDefault();
            return;
          }
          if (hotkeys.isSoftBreak(nativeEvent)) {
            event.preventDefault();
            Editor.insertSoftBreak(editor);
            return;
          }
          if (hotkeys.isSplitBlock(nativeEvent)) {
            event.preventDefault();
            Editor.insertBreak(editor);
            return;
          }
          if (hotkeys.isDeleteBackward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "backward"
              });
            } else {
              Editor.deleteBackward(editor);
            }
            return;
          }
          if (hotkeys.isDeleteForward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "forward"
              });
            } else {
              Editor.deleteForward(editor);
            }
            return;
          }
          if (hotkeys.isDeleteLineBackward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "backward"
              });
            } else {
              Editor.deleteBackward(editor, {
                unit: "line"
              });
            }
            return;
          }
          if (hotkeys.isDeleteLineForward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "forward"
              });
            } else {
              Editor.deleteForward(editor, {
                unit: "line"
              });
            }
            return;
          }
          if (hotkeys.isDeleteWordBackward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "backward"
              });
            } else {
              Editor.deleteBackward(editor, {
                unit: "word"
              });
            }
            return;
          }
          if (hotkeys.isDeleteWordForward(nativeEvent)) {
            event.preventDefault();
            if (selection && Range.isExpanded(selection)) {
              Editor.deleteFragment(editor, {
                direction: "forward"
              });
            } else {
              Editor.deleteForward(editor, {
                unit: "word"
              });
            }
            return;
          }
        } else {
          if (IS_CHROME || IS_WEBKIT) {
            if (selection && (hotkeys.isDeleteBackward(nativeEvent) || hotkeys.isDeleteForward(nativeEvent)) && Range.isCollapsed(selection)) {
              var currentNode = Node.parent(editor, selection.anchor.path);
              if (Element2.isElement(currentNode) && Editor.isVoid(editor, currentNode) && (Editor.isInline(editor, currentNode) || Editor.isBlock(editor, currentNode))) {
                event.preventDefault();
                Editor.deleteBackward(editor, {
                  unit: "block"
                });
                return;
              }
            }
          }
        }
      }
    }, [readOnly, editor, attributes.onKeyDown]),
    onPaste: (0, import_react.useCallback)((event) => {
      if (!readOnly && ReactEditor.hasEditableTarget(editor, event.target) && !isEventHandled(event, attributes.onPaste)) {
        if (!HAS_BEFORE_INPUT_SUPPORT || isPlainTextOnlyPaste(event.nativeEvent) || IS_WEBKIT) {
          event.preventDefault();
          ReactEditor.insertData(editor, event.clipboardData);
        }
      }
    }, [readOnly, editor, attributes.onPaste])
  }), /* @__PURE__ */ import_react.default.createElement(Children, {
    decorations,
    node: editor,
    renderElement,
    renderPlaceholder,
    renderLeaf,
    selection: editor.selection
  }))))));
});
var DefaultPlaceholder = (_ref2) => {
  var {
    attributes,
    children
  } = _ref2;
  return (
    // COMPAT: Artificially add a line-break to the end on the placeholder element
    // to prevent Android IMEs to pick up its content in autocorrect and to auto-capitalize the first letter
    /* @__PURE__ */ import_react.default.createElement("span", _objectSpread2({}, attributes), children, IS_ANDROID && /* @__PURE__ */ import_react.default.createElement("br", null))
  );
};
var defaultDecorate = () => [];
var defaultScrollSelectionIntoView = (editor, domRange) => {
  if (domRange.getBoundingClientRect && (!editor.selection || editor.selection && Range.isCollapsed(editor.selection))) {
    var leafEl = domRange.startContainer.parentElement;
    leafEl.getBoundingClientRect = domRange.getBoundingClientRect.bind(domRange);
    e2(leafEl, {
      scrollMode: "if-needed"
    });
    delete leafEl.getBoundingClientRect;
  }
};
var isEventHandled = (event, handler) => {
  if (!handler) {
    return false;
  }
  var shouldTreatEventAsHandled = handler(event);
  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled;
  }
  return event.isDefaultPrevented() || event.isPropagationStopped();
};
var isDOMEventTargetInput = (event) => {
  return isDOMNode(event.target) && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement);
};
var isDOMEventHandled = (event, handler) => {
  if (!handler) {
    return false;
  }
  var shouldTreatEventAsHandled = handler(event);
  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled;
  }
  return event.defaultPrevented;
};
var FocusedContext = /* @__PURE__ */ (0, import_react.createContext)(false);
var useFocused = () => {
  return (0, import_react.useContext)(FocusedContext);
};
var SlateSelectorContext = /* @__PURE__ */ (0, import_react.createContext)({});
function useSelectorContext(editor) {
  var eventListeners = (0, import_react.useRef)([]).current;
  var slateRef = (0, import_react.useRef)({
    editor
  }).current;
  var onChange = (0, import_react.useCallback)((editor2) => {
    slateRef.editor = editor2;
    eventListeners.forEach((listener) => listener(editor2));
  }, [eventListeners, slateRef]);
  var selectorContext = (0, import_react.useMemo)(() => {
    return {
      getSlate: () => slateRef.editor,
      addEventListener: (callback) => {
        eventListeners.push(callback);
        return () => {
          eventListeners.splice(eventListeners.indexOf(callback), 1);
        };
      }
    };
  }, [eventListeners, slateRef]);
  return {
    selectorContext,
    onChange
  };
}
var REACT_MAJOR_VERSION = parseInt(import_react.default.version.split(".")[0], 10);
var _excluded3 = ["editor", "children", "onChange", "onSelectionChange", "onValueChange", "initialValue"];
var Slate = (props) => {
  var {
    editor,
    children,
    onChange,
    onSelectionChange,
    onValueChange,
    initialValue
  } = props, rest = _objectWithoutProperties2(props, _excluded3);
  var [context, setContext] = import_react.default.useState(() => {
    if (!Node.isNodeList(initialValue)) {
      throw new Error("[Slate] initialValue is invalid! Expected a list of elements but got: ".concat(Scrubber.stringify(initialValue)));
    }
    if (!Editor.isEditor(editor)) {
      throw new Error("[Slate] editor is invalid! You passed: ".concat(Scrubber.stringify(editor)));
    }
    editor.children = initialValue;
    Object.assign(editor, rest);
    return {
      v: 0,
      editor
    };
  });
  var {
    selectorContext,
    onChange: handleSelectorChange
  } = useSelectorContext(editor);
  var onContextChange = (0, import_react.useCallback)((options) => {
    var _options$operation;
    if (onChange) {
      onChange(editor.children);
    }
    switch (options === null || options === void 0 || (_options$operation = options.operation) === null || _options$operation === void 0 ? void 0 : _options$operation.type) {
      case "set_selection":
        onSelectionChange === null || onSelectionChange === void 0 || onSelectionChange(editor.selection);
        break;
      default:
        onValueChange === null || onValueChange === void 0 || onValueChange(editor.children);
    }
    setContext((prevContext) => ({
      v: prevContext.v + 1,
      editor
    }));
    handleSelectorChange(editor);
  }, [editor, handleSelectorChange, onChange, onSelectionChange, onValueChange]);
  (0, import_react.useEffect)(() => {
    EDITOR_TO_ON_CHANGE.set(editor, onContextChange);
    return () => {
      EDITOR_TO_ON_CHANGE.set(editor, () => {
      });
    };
  }, [editor, onContextChange]);
  var [isFocused, setIsFocused] = (0, import_react.useState)(ReactEditor.isFocused(editor));
  (0, import_react.useEffect)(() => {
    setIsFocused(ReactEditor.isFocused(editor));
  }, [editor]);
  useIsomorphicLayoutEffect(() => {
    var fn = () => setIsFocused(ReactEditor.isFocused(editor));
    if (REACT_MAJOR_VERSION >= 17) {
      document.addEventListener("focusin", fn);
      document.addEventListener("focusout", fn);
      return () => {
        document.removeEventListener("focusin", fn);
        document.removeEventListener("focusout", fn);
      };
    } else {
      document.addEventListener("focus", fn, true);
      document.addEventListener("blur", fn, true);
      return () => {
        document.removeEventListener("focus", fn, true);
        document.removeEventListener("blur", fn, true);
      };
    }
  }, []);
  return /* @__PURE__ */ import_react.default.createElement(SlateSelectorContext.Provider, {
    value: selectorContext
  }, /* @__PURE__ */ import_react.default.createElement(SlateContext.Provider, {
    value: context
  }, /* @__PURE__ */ import_react.default.createElement(EditorContext.Provider, {
    value: context.editor
  }, /* @__PURE__ */ import_react.default.createElement(FocusedContext.Provider, {
    value: isFocused
  }, children))));
};
var withReact = function withReact2(editor) {
  var clipboardFormatKey = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "x-slate-fragment";
  var e3 = editor;
  e3 = withDOM(e3, clipboardFormatKey);
  var {
    onChange
  } = e3;
  e3.onChange = (options) => {
    var maybeBatchUpdates = REACT_MAJOR_VERSION < 18 ? import_react_dom.default.unstable_batchedUpdates : (callback) => callback();
    maybeBatchUpdates(() => {
      onChange(options);
    });
  };
  return e3;
};

// packages/render/web/ui/Table.tsx
var import_react3 = __toESM(require_react(), 1);

// packages/create/editor/ColumnResizer.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/create/editor/types.ts
var ParagraphType = "paragraph";
var CodeBlockType = "code-block";
var CodeLineType = "code-line";
var HeadingType = /* @__PURE__ */ ((HeadingType2) => {
  HeadingType2["H1"] = "heading-one";
  HeadingType2["H2"] = "heading-two";
  HeadingType2["H3"] = "heading-three";
  HeadingType2["H4"] = "heading-four";
  HeadingType2["H5"] = "heading-five";
  HeadingType2["H6"] = "heading-six";
  return HeadingType2;
})(HeadingType || {});
var isCustomElement = (node) => Element2.isElement(node) && "type" in node;

// packages/create/editor/tableCommands.ts
var isSelectionInTable = (editor) => {
  const [table] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table"
  });
  return !!table;
};
var getCurrentTable = (editor) => {
  const [table] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table"
  });
  return table ? table : void 0;
};
var createTableCell = () => ({
  type: "table-cell",
  children: [{ type: "paragraph", children: [{ text: "" }] }]
});
var insertRow = (editor, direction) => {
  const [rowEntry] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-row"
  });
  const [tableEntry] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table"
  });
  if (rowEntry && tableEntry) {
    const [rowNode, rowPath] = rowEntry;
    const [tableNode] = tableEntry;
    const columns = tableNode.children[0].children.length;
    const newRow = {
      type: "table-row",
      children: Array.from({ length: columns }, createTableCell)
    };
    const insertPath = direction === "below" ? Path.next(rowPath) : rowPath;
    Transforms.insertNodes(editor, newRow, { at: insertPath });
  }
};
var insertColumn = (editor, direction) => {
  const [cellEntry] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-cell"
  });
  const table = getCurrentTable(editor);
  if (cellEntry && table) {
    const [, cellPath] = cellEntry;
    const [tableNode, tablePath] = table;
    const colIndex = cellPath[cellPath.length - 1];
    for (let i = 0; i < tableNode.children.length; i++) {
      const rowPath = [...tablePath, i];
      const insertPath = [
        ...rowPath,
        direction === "right" ? colIndex + 1 : colIndex
      ];
      Transforms.insertNodes(editor, createTableCell(), { at: insertPath });
    }
  }
};
var deleteRow = (editor) => {
  const [rowEntry] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-row"
  });
  if (rowEntry) {
    const table = getCurrentTable(editor);
    if (table && table[0].children.length <= 1) deleteTable(editor);
    else Transforms.removeNodes(editor, { at: rowEntry[1] });
  }
};
var deleteColumn = (editor) => {
  const [cellEntry] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-cell"
  });
  if (cellEntry) {
    const [, cellPath] = cellEntry;
    const table = getCurrentTable(editor);
    const colIndex = cellPath[cellPath.length - 1];
    if (table) {
      const [tableNode, tablePath] = table;
      if (tableNode.children[0].children.length <= 1)
        deleteTable(editor);
      else
        for (let i = 0; i < tableNode.children.length; i++)
          Transforms.removeNodes(editor, { at: [...tablePath, i, colIndex] });
    }
  }
};
var deleteTable = (editor) => {
  const table = getCurrentTable(editor);
  if (table) Transforms.removeNodes(editor, { at: table[1] });
};
var getAllCellsInTable = (editor) => {
  const table = getCurrentTable(editor);
  if (!table) return [];
  const [, tablePath] = table;
  return Array.from(
    Editor.nodes(editor, {
      at: tablePath,
      match: (n3) => isCustomElement(n3) && n3.type === "table-cell"
    })
  );
};
var moveToNextCell = (editor) => {
  const [currentCell] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-cell"
  });
  if (!currentCell) return;
  const allCells = getAllCellsInTable(editor);
  const currentIndex = allCells.findIndex(
    (c) => Path.equals(c[1], currentCell[1])
  );
  if (currentIndex < allCells.length - 1) {
    const nextCellPath = allCells[currentIndex + 1][1];
    Transforms.select(editor, Editor.start(editor, nextCellPath));
  } else {
    insertRow(editor, "below");
    const rowEntry = Editor.above(editor, {
      match: (n3) => isCustomElement(n3) && n3.type === "table-row"
    });
    if (rowEntry) {
      const [, rowPath] = rowEntry;
      const nextRowPath = Path.next(rowPath);
      Transforms.select(editor, Editor.start(editor, nextRowPath));
    }
  }
};
var moveToPreviousCell = (editor) => {
  const [currentCell] = Editor.nodes(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-cell"
  });
  if (!currentCell) return;
  const allCells = getAllCellsInTable(editor);
  const currentIndex = allCells.findIndex(
    (c) => Path.equals(c[1], currentCell[1])
  );
  if (currentIndex > 0) {
    const prevCellPath = allCells[currentIndex - 1][1];
    Transforms.select(editor, Editor.start(editor, prevCellPath));
  }
};
var setColumnWidth = (editor, tablePath, columnIndex, newWidth) => {
  const tableNode = Editor.node(editor, tablePath)[0];
  if (!tableNode || tableNode.type !== "table" || !tableNode.columns) {
    return;
  }
  const newColumns = structuredClone(tableNode.columns);
  if (newColumns[columnIndex]) {
    newColumns[columnIndex].width = Math.max(newWidth, 40);
  } else {
    return;
  }
  Transforms.setNodes(editor, { columns: newColumns }, { at: tablePath });
};
var moveToAdjacentCell = (editor, direction) => {
  const { selection } = editor;
  if (!selection) return;
  const cellEntry = Array.from(
    Editor.nodes(editor, {
      match: (n3) => isCustomElement(n3) && n3.type === "table-cell",
      at: selection
    })
  )[0];
  if (!cellEntry) return;
  const [, cellPath] = cellEntry;
  const tableEntry = Editor.above(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table"
  });
  const rowEntry = Editor.above(editor, {
    match: (n3) => isCustomElement(n3) && n3.type === "table-row"
  });
  if (!tableEntry || !rowEntry) return;
  const [table, tablePath] = tableEntry;
  const [row, rowPath] = rowEntry;
  if (!table.children || !row.children) return;
  const rowIndex = rowPath[rowPath.length - 1];
  const colIndex = cellPath[cellPath.length - 1];
  let targetPath;
  switch (direction) {
    case "up":
      if (rowIndex > 0) {
        targetPath = [...tablePath, rowIndex - 1, colIndex];
      }
      break;
    case "down":
      if (rowIndex < table.children.length - 1) {
        targetPath = [...tablePath, rowIndex + 1, colIndex];
      }
      break;
    case "left":
      if (colIndex > 0) {
        targetPath = [...rowPath, colIndex - 1];
      }
      break;
    case "right":
      if (colIndex < row.children.length - 1) {
        targetPath = [...rowPath, colIndex + 1];
      }
      break;
  }
  if (targetPath && Editor.hasPath(editor, targetPath)) {
    Transforms.select(editor, Editor.start(editor, targetPath));
  }
};
var moveToUpperCell = (editor) => moveToAdjacentCell(editor, "up");
var moveToLowerCell = (editor) => moveToAdjacentCell(editor, "down");
var moveToLeftCell = (editor) => moveToAdjacentCell(editor, "left");
var moveToRightCell = (editor) => moveToAdjacentCell(editor, "right");

// packages/create/editor/ColumnResizer.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ColumnResizer = ({
  columnIndex,
  tablePath
}) => {
  const editor = useSlateStatic();
  const handleRef = (0, import_react2.useRef)(null);
  const startX = (0, import_react2.useRef)(0);
  const startWidth = (0, import_react2.useRef)(0);
  const { handlePointerDown } = useDragResize({
    cursor: "col-resize",
    onMove: (clientX) => {
      const delta = clientX - startX.current;
      const newWidth = startWidth.current + delta;
      setColumnWidth(editor, tablePath, columnIndex, newWidth);
    },
    onStop: () => {
    }
  });
  const onPointerDown = (0, import_react2.useCallback)(
    (event) => {
      const tableNodeEntry = Editor.node(editor, tablePath);
      if (!tableNodeEntry) return;
      const tableElement = ReactEditor.toDOMNode(editor, tableNodeEntry[0]);
      const cellElement = tableElement.querySelector(
        `tr > *:nth-child(${columnIndex + 1})`
      );
      if (!cellElement) {
        console.error("[Resizer] \u627E\u4E0D\u5230\u5355\u5143\u683C\u7684DOM\u5143\u7D20");
        return;
      }
      startX.current = event.clientX;
      startWidth.current = cellElement.getBoundingClientRect().width;
      handlePointerDown(event);
    },
    [editor, tablePath, columnIndex, handlePointerDown]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref: handleRef,
      onPointerDown,
      className: "column-resizer-handle",
      style: {
        position: "absolute",
        top: 0,
        right: -2,
        width: "4px",
        height: "100%",
        cursor: "col-resize",
        zIndex: 10
      }
    }
  );
};

// packages/render/web/ui/Table.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var isSlateTableRowLike = (row) => Boolean(
  row && typeof row === "object" && Array.isArray(row.children)
);
var extractTableData = (tableElement, getDefaultHeaderLabel) => {
  if (!tableElement?.children?.length) return null;
  const tableRows = tableElement.children.filter(isSlateTableRowLike).filter((row) => (row.children?.length ?? 0) > 0);
  if (tableRows.length === 0) return null;
  const columnCount = Math.max(
    ...tableRows.map((row) => row.children?.length ?? 0)
  );
  if (columnCount <= 0) return null;
  const matrix = tableRows.map((row) => {
    const rowTexts = (row.children ?? []).map(
      (cell) => Node.string(cell).trim()
    );
    return Array.from(
      { length: columnCount },
      (_, index) => rowTexts[index] || ""
    );
  });
  const hasHeaderRow = (tableRows[0].children ?? []).every(
    (cell) => Boolean(cell.header)
  );
  const headers = (hasHeaderRow ? matrix[0] : Array.from({ length: columnCount }, () => "")).map((header, index) => header || getDefaultHeaderLabel(index + 1));
  const rows = hasHeaderRow ? matrix.slice(1) : matrix;
  return { headers, rows };
};
var convertToCSV = (headers, rows) => {
  const escapeCSV = (str) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvHeaders = headers.map(escapeCSV).join(",");
  const csvRows = rows.map(
    (row) => row.map((cell) => escapeCSV(cell || "")).join(",")
  );
  return [csvHeaders, ...csvRows].join("\r\n");
};
var mapRowsToObjects = (headers, rows) => rows.map(
  (row) => headers.reduce((acc, header, index) => {
    acc[header] = row[index] || "";
    return acc;
  }, {})
);
var convertToJSON = (headers, rows) => {
  const jsonData = mapRowsToObjects(headers, rows);
  return JSON.stringify(jsonData, null, 2);
};
var parseMetaKey = (dbKey) => {
  const parts = dbKey.split(SEPARATOR);
  if (parts[0] !== "meta" || parts.length < 3) {
    throw new Error(`Invalid table key: ${dbKey}`);
  }
  return {
    tenantId: parts[1],
    tableId: parts.slice(2).join(SEPARATOR)
  };
};
var Table = ({
  attributes,
  children,
  element,
  style,
  isStreaming = false
}) => {
  const { t: t2 } = useTranslation("chat");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { columns = [] } = element || {};
  const [showExportMenu, setShowExportMenu] = (0, import_react3.useState)(false);
  const [isConverting, setIsConverting] = (0, import_react3.useState)(false);
  const tableData = (0, import_react3.useMemo)(
    () => extractTableData(
      element,
      (index) => t2("table.defaultColumnLabel", {
        index,
        defaultValue: `Column ${index}`
      })
    ),
    [element, t2]
  );
  const hasExportableData = Boolean(tableData);
  const canShowHeaderControls = hasExportableData && !isStreaming;
  (0, import_react3.useEffect)(() => {
    if (isStreaming && showExportMenu) {
      setShowExportMenu(false);
    }
  }, [isStreaming, showExportMenu]);
  const handleExport = (0, import_react3.useCallback)(
    async (format) => {
      if (!tableData) return;
      const { headers, rows } = tableData;
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-");
      const baseFileName = `table-export-${timestamp}`;
      if (format === "csv") {
        const csvData = convertToCSV(headers, rows);
        const blob = new Blob(["\uFEFF", csvData], {
          type: "text/csv;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === "json") {
        const jsonData = convertToJSON(headers, rows);
        const blob = new Blob([jsonData], {
          type: "application/json;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === "xlsx") {
        const XLSX = await import("/public/assets/chunks/xlsx-6GJQZJ62.js");
        const jsonData = mapRowsToObjects(headers, rows);
        const ws = XLSX.utils.json_to_sheet(jsonData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${baseFileName}.xlsx`);
      }
      setShowExportMenu(false);
    },
    [tableData]
  );
  const handleConvertToDataTable = (0, import_react3.useCallback)(async () => {
    if (!tableData || isStreaming || isConverting) return;
    setIsConverting(true);
    setShowExportMenu(false);
    try {
      const tableColumns = tableData.headers.map((header, index) => ({
        name: `col_${index + 1}`,
        label: header,
        type: "text"
      }));
      const dbKey = await dispatch(
        createTable({
          title: t2("table.convertedTitle", {
            defaultValue: "Converted Table"
          }),
          columns: tableColumns,
          withDefaultRows: false
        })
      ).unwrap();
      const { tenantId, tableId } = parseMetaKey(dbKey);
      await Promise.all(
        tableData.rows.map(
          (row) => dispatch(
            addRow({
              tenantId,
              tableId,
              values: tableColumns.reduce(
                (acc, column, index) => {
                  acc[column.name] = row[index] || "";
                  return acc;
                },
                {}
              )
            })
          ).unwrap()
        )
      );
      toast.success(
        t2("table.convertSuccess", {
          defaultValue: "Converted to table successfully"
        })
      );
      navigate(`/${dbKey}?edit=true`);
    } catch (error) {
      console.error("Failed to convert markdown table:", error);
      toast.error(
        t2("table.convertFailed", {
          defaultValue: "Failed to convert table"
        })
      );
    } finally {
      setIsConverting(false);
    }
  }, [dispatch, isConverting, isStreaming, navigate, t2, tableData]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      BaseTable,
      {
        columns,
        style,
        headerControls: canShowHeaderControls && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            className: `table-header-controls ${showExportMenu ? "is-active" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: "table-action-button",
                  onClick: () => void handleConvertToDataTable(),
                  disabled: isConverting,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTable2, { size: 14, "aria-hidden": "true" }),
                    isConverting ? t2("table.converting", { defaultValue: "Converting..." }) : t2("table.convertToDataTable", {
                      defaultValue: "Convert to data table"
                    })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { position: "relative" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "table-action-button",
                    onClick: () => setShowExportMenu(!showExportMenu),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuDownload, { size: 14, "aria-hidden": "true" }),
                      t2("table.export", { defaultValue: "Export" })
                    ]
                  }
                ),
                showExportMenu && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "export-menu", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "export-option",
                      onClick: () => void handleExport("csv"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuFileText, { size: 14, "aria-hidden": "true" }),
                        " CSV"
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "export-option",
                      onClick: () => void handleExport("json"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuFileText, { size: 14, "aria-hidden": "true" }),
                        " JSON"
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "export-option",
                      onClick: () => void handleExport("xlsx"),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTable, { size: 14, "aria-hidden": "true" }),
                        " XLSX"
                      ]
                    }
                  )
                ] })
              ] })
            ]
          }
        ),
        ...attributes,
        children
      }
    ),
    showExportMenu && canShowHeaderControls && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "button",
      {
        type: "button",
        "aria-label": t2("table.closeExportMenu", { defaultValue: "\u5173\u95ED\u5BFC\u51FA\u83DC\u5355" }),
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "default"
        },
        onClick: () => setShowExportMenu(false)
      }
    )
  ] });
};
var TableRow = ({
  attributes,
  children,
  style
}) => {
  const { style: attrStyle, ...restAttrs } = attributes || {};
  const mergedStyle = { ...attrStyle || {}, ...style || {} };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(BaseTableRow, { style: mergedStyle, ...restAttrs, children });
};
var TableCell = ({
  attributes,
  children,
  element,
  path,
  isFirstRow,
  style
}) => {
  const isHeader = Boolean(element.header);
  const isPathInvalid = !path || !Array.isArray(path) || path.length < 2;
  const columnIndex = isPathInvalid ? 0 : path[path.length - 1];
  const tablePath = isPathInvalid ? [] : path.slice(0, -2);
  const { style: attrStyle, ...restAttrs } = attributes || {};
  const mergedStyle = { ...attrStyle || {}, ...style || {} };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(BaseTableCell, { header: isHeader, style: mergedStyle, ...restAttrs, children: [
    children,
    isFirstRow && !isPathInvalid && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ColumnResizer, { columnIndex, tablePath })
  ] });
};

export {
  useSlateStatic,
  ReactEditor,
  useSelected,
  useSlate,
  Editable,
  useFocused,
  Slate,
  withReact,
  ParagraphType,
  CodeBlockType,
  CodeLineType,
  HeadingType,
  isCustomElement,
  isSelectionInTable,
  insertRow,
  insertColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
  moveToNextCell,
  moveToPreviousCell,
  moveToUpperCell,
  moveToLowerCell,
  moveToLeftCell,
  moveToRightCell,
  Table,
  TableRow,
  TableCell
};
