import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/react-aria/dist/private/ssr/SSRProvider.mjs
var import_react = __toESM(require_react(), 1);
var $c7eafbbe1ea5834e$var$defaultContext = {
  prefix: String(Math.round(Math.random() * 1e10)),
  current: 0
};
var $c7eafbbe1ea5834e$var$SSRContext = /* @__PURE__ */ (0, import_react.default).createContext($c7eafbbe1ea5834e$var$defaultContext);
var $c7eafbbe1ea5834e$var$IsSSRContext = /* @__PURE__ */ (0, import_react.default).createContext(false);
var $c7eafbbe1ea5834e$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
var $c7eafbbe1ea5834e$var$componentIds = /* @__PURE__ */ new WeakMap();
function $c7eafbbe1ea5834e$var$useCounter(isDisabled = false) {
  let ctx = (0, import_react.useContext)($c7eafbbe1ea5834e$var$SSRContext);
  let ref = (0, import_react.useRef)(null);
  if (ref.current === null && !isDisabled) {
    let currentOwner = (
      // @ts-ignore
      (0, import_react.default).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current
    );
    if (currentOwner) {
      let prevComponentValue = $c7eafbbe1ea5834e$var$componentIds.get(currentOwner);
      if (prevComponentValue == null)
        $c7eafbbe1ea5834e$var$componentIds.set(currentOwner, {
          id: ctx.current,
          state: currentOwner.memoizedState
        });
      else if (currentOwner.memoizedState !== prevComponentValue.state) {
        ctx.current = prevComponentValue.id;
        $c7eafbbe1ea5834e$var$componentIds.delete(currentOwner);
      }
    }
    ref.current = ++ctx.current;
  }
  return ref.current;
}
function $c7eafbbe1ea5834e$var$useLegacySSRSafeId(defaultId) {
  let ctx = (0, import_react.useContext)($c7eafbbe1ea5834e$var$SSRContext);
  if (ctx === $c7eafbbe1ea5834e$var$defaultContext && !$c7eafbbe1ea5834e$var$canUseDOM && true) console.warn("When server rendering, you must wrap your application in an <SSRProvider> to ensure consistent ids are generated between the client and server.");
  let counter = $c7eafbbe1ea5834e$var$useCounter(!!defaultId);
  let prefix = ctx === $c7eafbbe1ea5834e$var$defaultContext && false ? "react-aria" : `react-aria${ctx.prefix}`;
  return defaultId || `${prefix}-${counter}`;
}
function $c7eafbbe1ea5834e$var$useModernSSRSafeId(defaultId) {
  let id = (0, import_react.default).useId();
  let [didSSR] = (0, import_react.useState)($c7eafbbe1ea5834e$export$535bd6ca7f90a273());
  let prefix = didSSR || false ? "react-aria" : `react-aria${$c7eafbbe1ea5834e$var$defaultContext.prefix}`;
  return defaultId || `${prefix}-${id}`;
}
var $c7eafbbe1ea5834e$export$619500959fc48b26 = typeof (0, import_react.default)["useId"] === "function" ? $c7eafbbe1ea5834e$var$useModernSSRSafeId : $c7eafbbe1ea5834e$var$useLegacySSRSafeId;
function $c7eafbbe1ea5834e$var$getSnapshot() {
  return false;
}
function $c7eafbbe1ea5834e$var$getServerSnapshot() {
  return true;
}
function $c7eafbbe1ea5834e$var$subscribe(onStoreChange) {
  return () => {
  };
}
function $c7eafbbe1ea5834e$export$535bd6ca7f90a273() {
  if (typeof (0, import_react.default)["useSyncExternalStore"] === "function")
    return (0, import_react.default)["useSyncExternalStore"]($c7eafbbe1ea5834e$var$subscribe, $c7eafbbe1ea5834e$var$getSnapshot, $c7eafbbe1ea5834e$var$getServerSnapshot);
  return (0, import_react.useContext)($c7eafbbe1ea5834e$var$IsSSRContext);
}

// node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var import_react2 = __toESM(require_react(), 1);
var $c4867b2f328c2698$export$e5c5a5f917a5871c = typeof document !== "undefined" ? (0, import_react2.default).useLayoutEffect : () => {
};

// node_modules/react-aria/dist/private/utils/useValueEffect.mjs
var import_react3 = __toESM(require_react(), 1);
function $1a716630a9e3a599$export$14d238f342723f25(defaultValue) {
  let [value, setValue] = (0, import_react3.useState)(defaultValue);
  let currValue = (0, import_react3.useRef)(value);
  let effect = (0, import_react3.useRef)(null);
  let nextRef = (0, import_react3.useRef)(() => {
    if (!effect.current) return;
    let newValue = effect.current.next();
    if (newValue.done) {
      effect.current = null;
      return;
    }
    if (currValue.current === newValue.value) nextRef.current();
    else setValue(newValue.value);
  });
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    currValue.current = value;
    if (effect.current) nextRef.current();
  });
  let queue = (0, import_react3.useCallback)((fn) => {
    effect.current = fn(currValue.current);
    nextRef.current();
  }, [
    nextRef
  ]);
  return [
    value,
    queue
  ];
}

// node_modules/react-aria/dist/private/utils/useId.mjs
var import_react4 = __toESM(require_react(), 1);
var $390e54f620492c70$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
var $390e54f620492c70$export$d41a04c74483c6ef = /* @__PURE__ */ new Map();
var $390e54f620492c70$var$registry;
if (typeof FinalizationRegistry !== "undefined") $390e54f620492c70$var$registry = new FinalizationRegistry((heldValue) => {
  $390e54f620492c70$export$d41a04c74483c6ef.delete(heldValue);
});
var $390e54f620492c70$var$registeredIds = /* @__PURE__ */ new WeakMap();
function $390e54f620492c70$export$f680877a34711e37(defaultId) {
  let [value, setValue] = (0, import_react4.useState)(defaultId);
  let nextId = (0, import_react4.useRef)(null);
  let res = (0, $c7eafbbe1ea5834e$export$619500959fc48b26)(value);
  let cleanupRef = (0, import_react4.useRef)(null);
  let registeredId = $390e54f620492c70$var$registeredIds.get(cleanupRef);
  if ($390e54f620492c70$var$registry && registeredId !== res) {
    if (registeredId != null)
      $390e54f620492c70$var$registry.unregister(cleanupRef);
    $390e54f620492c70$var$registry.register(cleanupRef, res, cleanupRef);
    $390e54f620492c70$var$registeredIds.set(cleanupRef, res);
  }
  if ($390e54f620492c70$var$canUseDOM) {
    const cacheIdRef = $390e54f620492c70$export$d41a04c74483c6ef.get(res);
    if (cacheIdRef && !cacheIdRef.includes(nextId))
      cacheIdRef.push(nextId);
    else
      $390e54f620492c70$export$d41a04c74483c6ef.set(res, [
        nextId
      ]);
  }
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let r2 = res;
    return () => {
      if ($390e54f620492c70$var$registry) {
        $390e54f620492c70$var$registry.unregister(cleanupRef);
        $390e54f620492c70$var$registeredIds.delete(cleanupRef);
      }
      $390e54f620492c70$export$d41a04c74483c6ef.delete(r2);
    };
  }, [
    res
  ]);
  (0, import_react4.useEffect)(() => {
    let newId = nextId.current;
    if (newId) setValue(newId);
    return () => {
      if (newId) nextId.current = null;
    };
  });
  return res;
}
function $390e54f620492c70$export$cd8c9cb68f842629(idA, idB) {
  if (idA === idB) return idA;
  let setIdsA = $390e54f620492c70$export$d41a04c74483c6ef.get(idA);
  if (setIdsA) {
    setIdsA.forEach((ref) => ref.current = idB);
    return idB;
  }
  let setIdsB = $390e54f620492c70$export$d41a04c74483c6ef.get(idB);
  if (setIdsB) {
    setIdsB.forEach((ref) => ref.current = idA);
    return idA;
  }
  return idB;
}
function $390e54f620492c70$export$b4cc09c592e8fdb8(depArray = []) {
  let id = $390e54f620492c70$export$f680877a34711e37();
  let [resolvedId, setResolvedId] = (0, $1a716630a9e3a599$export$14d238f342723f25)(id);
  let updateId = (0, import_react4.useCallback)(() => {
    setResolvedId(function* () {
      yield id;
      yield document.getElementById(id) ? id : void 0;
    });
  }, [
    id,
    setResolvedId
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(updateId, [
    id,
    updateId,
    ...depArray
  ]);
  return resolvedId;
}

// node_modules/react-aria/dist/private/utils/chain.mjs
function $a4e76a5424781910$export$e08e3b67e392101e(...callbacks) {
  return (...args) => {
    for (let callback of callbacks) if (typeof callback === "function") callback(...args);
  };
}

// node_modules/react-aria/dist/private/utils/mergeRefs.mjs
function $4064df0d6f9620e1$export$c9058316764c140e(...refs) {
  if (refs.length === 1 && refs[0]) return refs[0];
  return (value) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = $4064df0d6f9620e1$var$setRef(ref, value);
      hasCleanup || (hasCleanup = typeof cleanup == "function");
      return cleanup;
    });
    if (hasCleanup) return () => {
      cleanups.forEach((cleanup, i) => {
        if (typeof cleanup === "function") cleanup();
        else $4064df0d6f9620e1$var$setRef(refs[i], null);
      });
    };
  };
}
function $4064df0d6f9620e1$var$setRef(ref, value) {
  if (typeof ref === "function") return ref(value);
  else if (ref != null) ref.current = value;
}

// node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
var clsx_default = clsx;

// node_modules/react-aria/dist/private/utils/mergeProps.mjs
function $bbaa08b3cd72f041$export$9d1611c77c2fe928(...args) {
  let result = {
    ...args[0]
  };
  for (let i = 1; i < args.length; i++) {
    let props = args[i];
    for (let key in props) {
      let a = result[key];
      let b = props[key];
      if (typeof a === "function" && typeof b === "function" && // This is a lot faster than a regex.
      key[0] === "o" && key[1] === "n" && key.charCodeAt(2) >= /* 'A' */
      65 && key.charCodeAt(2) <= /* 'Z' */
      90) result[key] = (0, $a4e76a5424781910$export$e08e3b67e392101e)(a, b);
      else if ((key === "className" || key === "UNSAFE_className") && typeof a === "string" && typeof b === "string") result[key] = (0, clsx_default)(a, b);
      else if (key === "id" && a && b) result.id = (0, $390e54f620492c70$export$cd8c9cb68f842629)(a, b);
      else if (key === "ref" && a && b) result.ref = (0, $4064df0d6f9620e1$export$c9058316764c140e)(a, b);
      else result[key] = b !== void 0 ? b : a;
    }
  }
  return result;
}

// node_modules/react-aria/dist/private/utils/useObjectRef.mjs
var import_react5 = __toESM(require_react(), 1);
function $03e8ab2d84d7657a$export$4338b53315abf666(ref) {
  const objRef = (0, import_react5.useRef)(null);
  const cleanupRef = (0, import_react5.useRef)(void 0);
  const refEffect = (0, import_react5.useCallback)((instance) => {
    if (typeof ref === "function") {
      const refCallback = ref;
      const refCleanup = refCallback(instance);
      return () => {
        if (typeof refCleanup === "function") refCleanup();
        else refCallback(null);
      };
    } else if (ref) {
      ref.current = instance;
      return () => {
        ref.current = null;
      };
    }
  }, [
    ref
  ]);
  return (0, import_react5.useMemo)(
    () => ({
      get current() {
        return objRef.current;
      },
      set current(value) {
        objRef.current = value;
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = void 0;
        }
        if (value != null) cleanupRef.current = refEffect(value);
      }
    }),
    // oxlint-disable-next-line react/react-compiler
    [
      refEffect
    ]
  );
}

// node_modules/react-aria-components/dist/private/utils.mjs
var import_react6 = __toESM(require_react(), 1);
var $7230ffa83bc0c2cf$export$c62b8e45d58ddad9 = Symbol("default");
function $7230ffa83bc0c2cf$export$2881499e37b75b9a({ values, children }) {
  for (let [Context, value] of values)
    children = /* @__PURE__ */ (0, import_react6.default).createElement(Context.Provider, {
      value
    }, children);
  return children;
}
function $7230ffa83bc0c2cf$export$4d86445c2cf5e3(props) {
  let { className, style, children, defaultClassName, defaultChildren, defaultStyle, values, render } = props;
  return (0, import_react6.useMemo)(() => {
    let computedClassName;
    let computedStyle;
    let computedChildren;
    if (typeof className === "function") computedClassName = className({
      ...values,
      defaultClassName
    });
    else computedClassName = className;
    if (typeof style === "function") computedStyle = style({
      ...values,
      defaultStyle: defaultStyle || {}
    });
    else computedStyle = style;
    if (typeof children === "function") computedChildren = children({
      ...values,
      defaultChildren
    });
    else if (children == null) computedChildren = defaultChildren;
    else computedChildren = children;
    return {
      className: computedClassName ?? defaultClassName,
      style: computedStyle || defaultStyle ? {
        ...defaultStyle,
        ...computedStyle
      } : void 0,
      children: computedChildren ?? defaultChildren,
      "data-rac": "",
      render: render ? (props2) => render(props2, values) : void 0
    };
  }, [
    className,
    style,
    children,
    defaultClassName,
    defaultChildren,
    defaultStyle,
    values,
    render
  ]);
}
function $7230ffa83bc0c2cf$export$c245e6201fed2f75(value, wrap) {
  return (renderProps) => wrap(typeof value === "function" ? value(renderProps) : value, renderProps);
}
function $7230ffa83bc0c2cf$export$fabf2dc03a41866e(context, slot) {
  let ctx = (0, import_react6.useContext)(context);
  if (slot === null)
    return null;
  if (ctx && typeof ctx === "object" && "slots" in ctx && ctx.slots) {
    let slotKey = slot || $7230ffa83bc0c2cf$export$c62b8e45d58ddad9;
    if (!ctx.slots[slotKey]) {
      let availableSlots = new Intl.ListFormat().format(Object.keys(ctx.slots).map((p) => `"${p}"`));
      let errorMessage = slot ? `Invalid slot "${slot}".` : "A slot prop is required.";
      throw new Error(`${errorMessage} Valid slot names are ${availableSlots}.`);
    }
    return ctx.slots[slotKey];
  }
  return ctx;
}
function $7230ffa83bc0c2cf$export$29f1550f4b0d4415(props, ref, context) {
  let ctx = $7230ffa83bc0c2cf$export$fabf2dc03a41866e(context, props.slot) || {};
  let { ref: contextRef, ...contextProps } = ctx;
  let mergedRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)((0, import_react6.useMemo)(() => (0, $4064df0d6f9620e1$export$c9058316764c140e)(ref, contextRef), [
    ref,
    contextRef
  ]));
  let mergedProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(contextProps, props);
  if ("style" in contextProps && contextProps.style && "style" in props && props.style) {
    if (typeof contextProps.style === "function" || typeof props.style === "function")
      mergedProps.style = (renderProps) => {
        let contextStyle = typeof contextProps.style === "function" ? contextProps.style(renderProps) : contextProps.style;
        let defaultStyle = {
          ...renderProps.defaultStyle,
          ...contextStyle
        };
        let style = typeof props.style === "function" ? props.style({
          ...renderProps,
          defaultStyle
        }) : props.style;
        return {
          ...defaultStyle,
          ...style
        };
      };
    else
      mergedProps.style = {
        ...contextProps.style,
        ...props.style
      };
  }
  return [
    mergedProps,
    mergedRef
  ];
}
function $7230ffa83bc0c2cf$export$9d4c57ee4c6ffdd8(initialState = true) {
  let [hasSlot, setHasSlot] = (0, import_react6.useState)(initialState);
  let hasRun = (0, import_react6.useRef)(false);
  let ref = (0, import_react6.useCallback)((el) => {
    hasRun.current = true;
    setHasSlot(!!el);
  }, []);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (!hasRun.current) setHasSlot(false);
  }, []);
  return [
    ref,
    hasSlot
  ];
}
function $7230ffa83bc0c2cf$export$ef03459518577ad4(props) {
  const prefix = /^(data-.*)$/;
  let filteredProps = {};
  for (const prop in props) if (!prefix.test(prop)) filteredProps[prop] = props[prop];
  return filteredProps;
}
function $7230ffa83bc0c2cf$var$DOMElement(ElementType, props, forwardedRef) {
  let { render, ...otherProps } = props;
  let elementRef = (0, import_react6.useRef)(null);
  let ref = (0, import_react6.useMemo)(() => (0, $4064df0d6f9620e1$export$c9058316764c140e)(forwardedRef, elementRef), [
    forwardedRef,
    elementRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (render) {
      if (!elementRef.current) console.warn("Ref was not connected to DOM element returned by custom `render` function. Did you forget to pass through or merge the `ref`?");
      else if (elementRef.current.localName !== ElementType) console.warn(`Unexpected DOM element returned by custom \`render\` function. Expected <${ElementType}>, got <${elementRef.current.localName}>. This may break the component behavior and accessibility.`);
    }
  }, [
    ElementType,
    render
  ]);
  let domProps = {
    ...otherProps,
    ref
  };
  if (render) return render(domProps, void 0);
  return /* @__PURE__ */ (0, import_react6.default).createElement(ElementType, domProps);
}
var $7230ffa83bc0c2cf$var$domComponentCache = {};
var $7230ffa83bc0c2cf$export$df3a06d6289f983e = new Proxy({}, {
  get(target, elementType) {
    if (typeof elementType !== "string") return void 0;
    let res = $7230ffa83bc0c2cf$var$domComponentCache[elementType];
    if (!res) {
      res = /* @__PURE__ */ (0, import_react6.forwardRef)($7230ffa83bc0c2cf$var$DOMElement.bind(null, elementType));
      $7230ffa83bc0c2cf$var$domComponentCache[elementType] = res;
    }
    return res;
  }
});

// node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function $1969ac565cfec8d0$export$de79e2c695e052f3(element) {
  if ($1969ac565cfec8d0$var$supportsPreventScroll()) element.focus({
    preventScroll: true
  });
  else {
    let scrollableElements = $1969ac565cfec8d0$var$getScrollableElements(element);
    element.focus();
    $1969ac565cfec8d0$var$restoreScrollPosition(scrollableElements);
  }
}
var $1969ac565cfec8d0$var$supportsPreventScrollCached = null;
function $1969ac565cfec8d0$var$supportsPreventScroll() {
  if ($1969ac565cfec8d0$var$supportsPreventScrollCached == null) {
    $1969ac565cfec8d0$var$supportsPreventScrollCached = false;
    try {
      let focusElem = document.createElement("div");
      focusElem.focus({
        get preventScroll() {
          $1969ac565cfec8d0$var$supportsPreventScrollCached = true;
          return true;
        }
      });
    } catch {
    }
  }
  return $1969ac565cfec8d0$var$supportsPreventScrollCached;
}
function $1969ac565cfec8d0$var$getScrollableElements(element) {
  let parent = element.parentNode;
  let scrollableElements = [];
  let rootScrollingElement = document.scrollingElement || document.documentElement;
  while (parent instanceof HTMLElement && parent !== rootScrollingElement) {
    if (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) scrollableElements.push({
      element: parent,
      scrollTop: parent.scrollTop,
      scrollLeft: parent.scrollLeft
    });
    parent = parent.parentNode;
  }
  if (rootScrollingElement instanceof HTMLElement) scrollableElements.push({
    element: rootScrollingElement,
    scrollTop: rootScrollingElement.scrollTop,
    scrollLeft: rootScrollingElement.scrollLeft
  });
  return scrollableElements;
}
function $1969ac565cfec8d0$var$restoreScrollPosition(scrollableElements) {
  for (let { element, scrollTop, scrollLeft } of scrollableElements) {
    element.scrollTop = scrollTop;
    element.scrollLeft = scrollLeft;
  }
}

// node_modules/react-aria/dist/private/utils/platform.mjs
function $2add3ce32c6007eb$var$testUserAgent(re) {
  if (typeof window === "undefined" || window.navigator == null) return false;
  let brands = window.navigator["userAgentData"]?.brands;
  return Array.isArray(brands) && brands.some((brand) => re.test(brand.brand)) || re.test(window.navigator.userAgent);
}
function $2add3ce32c6007eb$var$testPlatform(re) {
  return typeof window !== "undefined" && window.navigator != null ? re.test(window.navigator["userAgentData"]?.platform || window.navigator.platform) : false;
}
function $2add3ce32c6007eb$var$cached(fn) {
  if (false) return fn;
  let res = null;
  return () => {
    if (res == null) res = fn();
    return res;
  };
}
var $2add3ce32c6007eb$export$9ac100e40613ea10 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^Mac/i);
});
var $2add3ce32c6007eb$export$186c6964ca17d99 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^iPhone/i);
});
var $2add3ce32c6007eb$export$7bef049ce92e4224 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  $2add3ce32c6007eb$export$9ac100e40613ea10() && navigator.maxTouchPoints > 1;
});
var $2add3ce32c6007eb$export$fedb369cb70207f1 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$186c6964ca17d99() || $2add3ce32c6007eb$export$7bef049ce92e4224();
});
var $2add3ce32c6007eb$export$e1865c3bedcd822b = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$9ac100e40613ea10() || $2add3ce32c6007eb$export$fedb369cb70207f1();
});
var $2add3ce32c6007eb$export$78551043582a6a98 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/AppleWebKit/i) && ($2add3ce32c6007eb$export$fedb369cb70207f1() || !$2add3ce32c6007eb$export$6446a186d09e379e());
});
var $2add3ce32c6007eb$export$95df08bae54cb4df = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$78551043582a6a98() && !$2add3ce32c6007eb$export$6446a186d09e379e() && !$2add3ce32c6007eb$export$b7d78993b74f766d();
});
var $2add3ce32c6007eb$export$6446a186d09e379e = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/Chrome|CriOS|CrMo/i);
});
var $2add3ce32c6007eb$export$a11b0059900ceec8 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/Android/i);
});
var $2add3ce32c6007eb$export$b7d78993b74f766d = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/(Firefox|FxiOS)/i);
});

// node_modules/react-aria/dist/private/utils/openLink.mjs
var import_react7 = __toESM(require_react(), 1);
var $caaf0dd3060ed57c$var$RouterContext = /* @__PURE__ */ (0, import_react7.createContext)({
  isNative: true,
  open: $caaf0dd3060ed57c$var$openSyntheticLink,
  useHref: (href) => href
});
function $caaf0dd3060ed57c$export$9a302a45f65d0572() {
  return (0, import_react7.useContext)($caaf0dd3060ed57c$var$RouterContext);
}
function $caaf0dd3060ed57c$export$efa8c9099e530235(link, modifiers) {
  let target = link.getAttribute("target");
  return (!target || target === "_self") && link.origin === location.origin && !link.hasAttribute("download") && !modifiers.metaKey && // open in new tab (mac)
  !modifiers.ctrlKey && // open in new tab (windows)
  !modifiers.altKey && // download
  !modifiers.shiftKey;
}
function $caaf0dd3060ed57c$export$95185d699e05d4d7(target, modifiers, setOpening = true) {
  let { metaKey, ctrlKey, altKey, shiftKey } = modifiers;
  if (!(0, $2add3ce32c6007eb$export$78551043582a6a98)() && (0, $2add3ce32c6007eb$export$b7d78993b74f766d)() && window.event?.type?.startsWith("key") && target.target === "_blank") {
    if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) metaKey = true;
    else ctrlKey = true;
  }
  let event = (0, $2add3ce32c6007eb$export$78551043582a6a98)() && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && !(0, $2add3ce32c6007eb$export$7bef049ce92e4224)() && true ? new KeyboardEvent("keydown", {
    keyIdentifier: "Enter",
    metaKey,
    ctrlKey,
    altKey,
    shiftKey
  }) : new MouseEvent("click", {
    metaKey,
    ctrlKey,
    altKey,
    shiftKey,
    detail: 1,
    bubbles: true,
    cancelable: true
  });
  $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = setOpening;
  (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(target);
  target.dispatchEvent(event);
  $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
}
$caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
function $caaf0dd3060ed57c$var$getSyntheticLink(target, open) {
  if (target instanceof HTMLAnchorElement) open(target);
  else if (target.hasAttribute("data-href")) {
    let link = document.createElement("a");
    link.href = target.getAttribute("data-href");
    if (target.hasAttribute("data-target")) link.target = target.getAttribute("data-target");
    if (target.hasAttribute("data-rel")) link.rel = target.getAttribute("data-rel");
    if (target.hasAttribute("data-download")) link.download = target.getAttribute("data-download");
    if (target.hasAttribute("data-ping")) link.ping = target.getAttribute("data-ping");
    if (target.hasAttribute("data-referrer-policy")) link.referrerPolicy = target.getAttribute("data-referrer-policy");
    target.appendChild(link);
    open(link);
    target.removeChild(link);
  }
}
function $caaf0dd3060ed57c$var$openSyntheticLink(target, modifiers) {
  $caaf0dd3060ed57c$var$getSyntheticLink(target, (link) => $caaf0dd3060ed57c$export$95185d699e05d4d7(link, modifiers));
}
function $caaf0dd3060ed57c$export$bdc77b0c0a3a85d6(props) {
  let router = $caaf0dd3060ed57c$export$9a302a45f65d0572();
  const href = router.useHref(props.href ?? "");
  return {
    "data-href": props.href ? href : void 0,
    "data-target": props.target,
    "data-rel": props.rel,
    "data-download": props.download,
    "data-ping": props.ping,
    "data-referrer-policy": props.referrerPolicy
  };
}
function $caaf0dd3060ed57c$export$7e924b3091a3bd18(props) {
  let router = $caaf0dd3060ed57c$export$9a302a45f65d0572();
  const href = router.useHref(props?.href ?? "");
  let linkProps = {};
  if (props) {
    for (let key of [
      "href",
      "target",
      "rel",
      "download",
      "ping",
      "referrerPolicy"
    ]) if (key in props && props[key] !== void 0) linkProps[key] = key === "href" ? href : props[key];
  }
  return linkProps;
}
function $caaf0dd3060ed57c$export$13aea1a3cb5e3f1f(e, router, href, routerOptions) {
  if (!router.isNative && e.currentTarget instanceof HTMLAnchorElement && e.currentTarget.href && // If props are applied to a router Link component, it may have already prevented default.
  !e.isDefaultPrevented() && $caaf0dd3060ed57c$export$efa8c9099e530235(e.currentTarget, e) && href) {
    e.preventDefault();
    router.open(e.currentTarget, e, href, routerOptions);
  }
}

// node_modules/react-aria/dist/private/utils/domHelpers.mjs
var $d447af545b77c9f1$export$b204af158042fbac = (target) => {
  if ($d447af545b77c9f1$var$isWindow(target)) return target.document;
  if ($d447af545b77c9f1$export$62858bae88b53fd0(target)) return target;
  return target?.ownerDocument ?? (typeof document !== "undefined" ? document : void 0);
};
var $d447af545b77c9f1$export$f21a1ffae260145a = (target) => {
  let ownerDocument = $d447af545b77c9f1$export$b204af158042fbac(target);
  return ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : void 0);
};
function $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) {
  return value !== null && typeof value === "object" && "nodeType" in value && typeof value.nodeType === "number";
}
function $d447af545b77c9f1$var$isWindow(value) {
  return typeof value === "object" && value != null && "window" in value && value.window === value;
}
function $d447af545b77c9f1$export$62858bae88b53fd0(value) {
  return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 9;
}
function $d447af545b77c9f1$export$af51f0f06c0f328a(value) {
  return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 11 && "host" in value;
}
function $d447af545b77c9f1$export$f531f92e2a15358f(target, event, listener, options) {
  if (listener == null || target == null) return () => {
  };
  let eventTargets = Array.isArray(target) ? target : [
    target
  ];
  for (let eventTarget of eventTargets) eventTarget.addEventListener(event, listener, options);
  return () => {
    for (let eventTarget of eventTargets) eventTarget.removeEventListener(event, listener, options);
  };
}

// node_modules/react-stately/dist/private/flags/flags.mjs
var $6a20a7989e6c817a$var$_shadowDOM = false;
function $6a20a7989e6c817a$export$98658e8c59125e6a() {
  return $6a20a7989e6c817a$var$_shadowDOM;
}

// node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function $23f2114a1b82827e$export$4282f70798064fe0(node, otherNode) {
  if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return otherNode && node ? node.contains(otherNode) : false;
  if (!node || !otherNode) return false;
  let currentNode = otherNode;
  while (currentNode !== null) {
    if (currentNode === node) return true;
    if (typeof currentNode.assignedElements !== "function" && currentNode.assignedSlot?.parentNode)
      currentNode = currentNode.assignedSlot.parentNode;
    else if ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(currentNode))
      currentNode = currentNode.host;
    else currentNode = currentNode.parentNode;
  }
  return false;
}
var $23f2114a1b82827e$export$cd4e5573fbe2b576 = (doc = document) => {
  if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return doc.activeElement;
  let activeElement = doc.activeElement;
  while (activeElement && "shadowRoot" in activeElement && activeElement.shadowRoot?.activeElement) activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
};
function $23f2114a1b82827e$export$e58f029f0fbfdb29(event) {
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)() && event.target instanceof Element && event.target.shadowRoot) {
    if ("composedPath" in event) return event.composedPath()[0] ?? null;
    else if ("composedPath" in event.nativeEvent) return event.nativeEvent.composedPath()[0] ?? null;
  }
  return event.target;
}
function $23f2114a1b82827e$export$da7af4355d792141(from, to) {
  if (to === null) return [];
  to = to ?? (0, $d447af545b77c9f1$export$f21a1ffae260145a)(from);
  let targets = [
    to
  ];
  if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)() || !from || from === to) return targets;
  let toRoot = "getRootNode" in to ? to.getRootNode() : null;
  let current = from.getRootNode() ?? null;
  while ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(current) && current !== toRoot) {
    targets.push(current);
    current = current.host.getRootNode();
  }
  return targets;
}
function $23f2114a1b82827e$export$b4f377a2b6254582(node) {
  if (!node) return false;
  let root = node.getRootNode();
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node);
  if (!(root instanceof ownerWindow.Document || root instanceof ownerWindow.ShadowRoot)) return false;
  let activeElement = root.activeElement;
  return activeElement != null && node.contains(activeElement);
}

// node_modules/react-aria/dist/private/utils/isElementVisible.mjs
var $ae77152785188400$var$supportsCheckVisibility = typeof Element !== "undefined" && "checkVisibility" in Element.prototype;
function $ae77152785188400$var$isStyleVisible(element) {
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  if (!(element instanceof windowObject.HTMLElement) && !(element instanceof windowObject.SVGElement)) return false;
  let { display, visibility } = element.style;
  let isVisible = display !== "none" && visibility !== "hidden" && visibility !== "collapse";
  if (isVisible) {
    const { getComputedStyle } = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    let { display: computedDisplay, visibility: computedVisibility } = getComputedStyle(element);
    isVisible = computedDisplay !== "none" && computedVisibility !== "hidden" && computedVisibility !== "collapse";
  }
  return isVisible;
}
function $ae77152785188400$var$isAttributeVisible(element, childElement) {
  return !element.hasAttribute("hidden") && // Ignore HiddenSelect when tree walking.
  !element.hasAttribute("data-react-aria-prevent-focus") && (element.nodeName === "DETAILS" && childElement && childElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : true);
}
function $ae77152785188400$export$e989c0fffaa6b27a(element, childElement) {
  if ($ae77152785188400$var$supportsCheckVisibility) return element.checkVisibility({
    visibilityProperty: true
  }) && !element.closest("[data-react-aria-prevent-focus]");
  return element.nodeName !== "#comment" && $ae77152785188400$var$isStyleVisible(element) && $ae77152785188400$var$isAttributeVisible(element, childElement) && (!element.parentElement || $ae77152785188400$export$e989c0fffaa6b27a(element.parentElement, element));
}

// node_modules/react-aria/dist/private/utils/isFocusable.mjs
var $3b8b240c1bf84ab9$var$focusableElements = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission"
];
var $3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(":not([hidden]),") + ",[tabindex]:not([disabled]):not([hidden])";
$3b8b240c1bf84ab9$var$focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');
var $3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(':not([hidden]):not([tabindex="-1"]),');
function $3b8b240c1bf84ab9$export$4c063cf1350e6fed(element, options) {
  return element.matches($3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR) && !$3b8b240c1bf84ab9$var$isInert(element) && (options?.skipVisibilityCheck || (0, $ae77152785188400$export$e989c0fffaa6b27a)(element));
}
function $3b8b240c1bf84ab9$export$bebd5a1431fec25d(element) {
  return element.matches($3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR) && (0, $ae77152785188400$export$e989c0fffaa6b27a)(element) && !$3b8b240c1bf84ab9$var$isInert(element);
}
function $3b8b240c1bf84ab9$var$isInert(element) {
  let node = element;
  while (node != null) {
    if (node instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node).HTMLElement && node.inert) return true;
    node = node.parentElement;
  }
  return false;
}

// node_modules/react-aria/dist/private/interactions/utils.mjs
var import_react8 = __toESM(require_react(), 1);
function $a92dc41f639950be$export$525bc4921d56d4a(nativeEvent) {
  let event = nativeEvent;
  event.nativeEvent = nativeEvent;
  event.isDefaultPrevented = () => event.defaultPrevented;
  event.isPropagationStopped = () => event.cancelBubble;
  event.persist = () => {
  };
  return event;
}
function $a92dc41f639950be$export$c2b7abe5d61ec696(event, target) {
  Object.defineProperty(event, "target", {
    value: target
  });
  Object.defineProperty(event, "currentTarget", {
    value: target
  });
}
function $a92dc41f639950be$export$715c682d09d639cc(onBlur) {
  let stateRef = (0, import_react8.useRef)({
    isFocused: false,
    observer: null
  });
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const state = stateRef.current;
    return () => {
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
    };
  }, []);
  return (0, import_react8.useCallback)((e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (eventTarget instanceof HTMLButtonElement || eventTarget instanceof HTMLInputElement || eventTarget instanceof HTMLTextAreaElement || eventTarget instanceof HTMLSelectElement) {
      stateRef.current.isFocused = true;
      let target = eventTarget;
      let onBlurHandler = (e2) => {
        stateRef.current.isFocused = false;
        if (target.disabled) {
          let event = $a92dc41f639950be$export$525bc4921d56d4a(e2);
          onBlur?.(event);
        }
        if (stateRef.current.observer) {
          stateRef.current.observer.disconnect();
          stateRef.current.observer = null;
        }
      };
      target.addEventListener("focusout", onBlurHandler, {
        once: true
      });
      stateRef.current.observer = new MutationObserver(() => {
        if (stateRef.current.isFocused && target.disabled) {
          stateRef.current.observer?.disconnect();
          let relatedTargetEl = target === (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() ? null : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
          target.dispatchEvent(new FocusEvent("blur", {
            relatedTarget: relatedTargetEl
          }));
          target.dispatchEvent(new FocusEvent("focusout", {
            bubbles: true,
            relatedTarget: relatedTargetEl
          }));
        }
      });
      stateRef.current.observer.observe(target, {
        attributes: true,
        attributeFilter: [
          "disabled"
        ]
      });
    }
  }, [
    onBlur
  ]);
}
var $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
function $a92dc41f639950be$export$cabe61c495ee3649(target) {
  while (target && !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(target, {
    skipVisibilityCheck: true
  })) target = target.parentElement;
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
  let activeElement = ownerWindow.document.activeElement;
  if (!activeElement || activeElement === target) return;
  $a92dc41f639950be$export$fda7da73ab5d4c48 = true;
  let isRefocusing = false;
  let onBlur = (e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === activeElement || isRefocusing) e.stopImmediatePropagation();
  };
  let onFocusOut = (e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === activeElement || isRefocusing) {
      e.stopImmediatePropagation();
      if (!target && !isRefocusing) {
        isRefocusing = true;
        (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
        cleanup();
      }
    }
  };
  let onFocus = (e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === target || isRefocusing) e.stopImmediatePropagation();
  };
  let onFocusIn = (e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === target || isRefocusing) {
      e.stopImmediatePropagation();
      if (!isRefocusing) {
        isRefocusing = true;
        (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
        cleanup();
      }
    }
  };
  ownerWindow.addEventListener("blur", onBlur, true);
  ownerWindow.addEventListener("focusout", onFocusOut, true);
  ownerWindow.addEventListener("focusin", onFocusIn, true);
  ownerWindow.addEventListener("focus", onFocus, true);
  let cleanup = () => {
    cancelAnimationFrame(raf);
    ownerWindow.removeEventListener("blur", onBlur, true);
    ownerWindow.removeEventListener("focusout", onFocusOut, true);
    ownerWindow.removeEventListener("focusin", onFocusIn, true);
    ownerWindow.removeEventListener("focus", onFocus, true);
    $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
    isRefocusing = false;
  };
  let raf = requestAnimationFrame(cleanup);
  return cleanup;
}

// node_modules/react-aria/dist/private/interactions/useFocus.mjs
var import_react9 = __toESM(require_react(), 1);
function $1e74c67db218ce67$export$f8168d8dd8fd66e6(props) {
  let { isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange } = props;
  const onBlur = (0, import_react9.useCallback)((e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === e.currentTarget) {
      if (onBlurProp) onBlurProp(e);
      if (onFocusChange) onFocusChange(false);
      return true;
    }
  }, [
    onBlurProp,
    onFocusChange
  ]);
  const onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
  const onFocus = (0, import_react9.useCallback)((e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
    const activeElement = ownerDocument ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument) : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
    if (eventTarget === e.currentTarget && eventTarget === activeElement) {
      if (onFocusProp) onFocusProp(e);
      if (onFocusChange) onFocusChange(true);
      onSyntheticFocus(e);
    }
  }, [
    onFocusChange,
    onFocusProp,
    onSyntheticFocus
  ]);
  return {
    focusProps: {
      onFocus: !isDisabled && (onFocusProp || onFocusChange || onBlurProp) ? onFocus : void 0,
      onBlur: !isDisabled && (onBlurProp || onFocusChange) ? onBlur : void 0
    }
  };
}

// node_modules/react-aria/dist/private/interactions/createEventHandler.mjs
function $8dba16319206abb6$export$48d1ea6320830260(handler) {
  if (!handler) return void 0;
  return (e) => {
    let shouldStopPropagation = true;
    let event = {
      ...e,
      preventDefault() {
        e.preventDefault();
      },
      isDefaultPrevented() {
        return e.isDefaultPrevented();
      },
      stopPropagation() {
        if (shouldStopPropagation && true) console.error("stopPropagation is now the default behavior for events in React Spectrum. You can use continuePropagation() to revert this behavior.");
        else shouldStopPropagation = true;
      },
      continuePropagation() {
        shouldStopPropagation = false;
        if (typeof e.continuePropagation === "function") e.continuePropagation();
      },
      isPropagationStopped() {
        return shouldStopPropagation;
      }
    };
    handler(event);
    if (shouldStopPropagation && !(typeof e.isPropagationStopped === "function" && e.isPropagationStopped())) e.stopPropagation();
  };
}

// node_modules/react-aria/dist/private/interactions/createKeyboardShortcutHandler.mjs
var $cbf729ad7eb217b0$var$MODIFIER_NAMES = /* @__PURE__ */ new Set([
  "shift",
  "alt",
  "control",
  "meta",
  "mod"
  // OS dependent - Cmd on Mac, Control on Windows/Linux
]);
var $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER = [
  "Alt",
  "Control",
  "Meta",
  "Shift"
];
function $cbf729ad7eb217b0$export$9932402e211e7315(parsed) {
  let set = /* @__PURE__ */ new Set();
  if (parsed.alt) set.add("Alt");
  if (parsed.shift) set.add("Shift");
  if (parsed.ctrl) set.add("Control");
  if (parsed.meta) set.add("Meta");
  if (parsed.mod) set.add((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? "Meta" : "Control");
  return set;
}
function $cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e) {
  let set = /* @__PURE__ */ new Set();
  if (e.altKey) set.add("Alt");
  if (e.ctrlKey) set.add("Control");
  if (e.metaKey) set.add("Meta");
  if (e.shiftKey) set.add("Shift");
  return set;
}
function $cbf729ad7eb217b0$var$sortedModifierTokens(set) {
  return $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER.filter((name) => set.has(name));
}
function $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec) {
  let parts = spec.split("+").reduce((prev, part) => {
    let lower = part.toLowerCase();
    if ($cbf729ad7eb217b0$var$MODIFIER_NAMES.has(lower)) {
      if (lower === "shift") prev.shift = true;
      else if (lower === "alt") prev.alt = true;
      else if (lower === "control") prev.ctrl = true;
      else if (lower === "meta") prev.meta = true;
      else if (lower === "mod") prev.mod = true;
    } else prev.key = part;
    return prev;
  }, {
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
    mod: false,
    key: ""
  });
  if (parts.key === "") throw new Error(`Invalid keyboard shortcut: "${spec}". Must include exactly one non-modifier key (e.g. "a", "Enter", "ArrowDown"). Combine any of Shift, Alt, Ctrl, Meta, and Mod.`);
  return parts;
}
function $cbf729ad7eb217b0$var$normalizeEventKey(key) {
  return key.toLowerCase();
}
var $cbf729ad7eb217b0$var$KEY_ALIASES = {
  space: " ",
  esc: "escape",
  del: "delete",
  ins: "insert",
  left: "arrowleft",
  right: "arrowright",
  up: "arrowup",
  down: "arrowdown",
  pageup: "pageup",
  pagedown: "pagedown"
};
function $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(specKey) {
  let k = $cbf729ad7eb217b0$var$normalizeEventKey(specKey);
  let aliased = $cbf729ad7eb217b0$var$KEY_ALIASES[k];
  return aliased != null ? aliased : k;
}
function $cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed) {
  let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$9932402e211e7315(parsed));
  let key = $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(parsed.key);
  return mods.length > 0 ? `${mods.join("+")}+${key}` : key;
}
function $cbf729ad7eb217b0$export$786304bda41dd69f(e) {
  let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e));
  let key = $cbf729ad7eb217b0$var$normalizeEventKey(e.key);
  let prefix = mods.length > 0 ? `${mods.join("+")}+` : "";
  return prefix + key;
}
function $cbf729ad7eb217b0$export$2fd1fc8039383ae1(bindings) {
  let map = /* @__PURE__ */ new Map();
  for (let [spec, action] of Object.entries(bindings)) {
    let parsed = $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec);
    map.set($cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed), action);
  }
  return (e) => {
    let canonical = $cbf729ad7eb217b0$export$786304bda41dd69f(e);
    let action = map.get(canonical);
    let result = action?.(e);
    if (result === void 0 && action !== void 0) result = {
      shouldContinuePropagation: false,
      shouldPreventDefault: true
    };
    else if (typeof result === "boolean") result = {
      shouldContinuePropagation: !result,
      shouldPreventDefault: result
    };
    if (result?.shouldPreventDefault) e.preventDefault();
    if (!action || result?.shouldContinuePropagation) e.continuePropagation();
  };
}

// node_modules/react-aria/dist/private/interactions/useKeyboard.mjs
function $8296dad1a4c5e0dc$export$8f71654801c2f7cd(props) {
  let { shortcuts, allowRepeats = false, allowComposing = false } = props;
  let onKeyDown;
  let onKeyUp;
  if (shortcuts) {
    let shortcutHandler = (0, $cbf729ad7eb217b0$export$2fd1fc8039383ae1)(shortcuts);
    let shortcutOnKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)((e) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
        e.continuePropagation();
        return;
      }
      if (e.nativeEvent?.repeat && !allowRepeats || e.nativeEvent?.isComposing && !allowComposing) {
        e.continuePropagation();
        return;
      }
      shortcutHandler(e);
    });
    let shortcutOnKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)((e) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
        e.continuePropagation();
        return;
      }
      if (e.nativeEvent?.repeat && !allowRepeats || e.nativeEvent?.isComposing && !allowComposing) {
        e.continuePropagation();
        return;
      }
      e.continuePropagation();
    });
    onKeyDown = props.onKeyDown ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyDown, shortcutOnKeyDown) : shortcutOnKeyDown;
    onKeyUp = props.onKeyUp ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyUp, shortcutOnKeyUp) : shortcutOnKeyUp;
  } else {
    onKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyDown);
    onKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyUp);
  }
  return {
    keyboardProps: props.isDisabled ? {} : {
      onKeyDown,
      onKeyUp
    }
  };
}

// node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function $b5c62b033c25b96d$export$60278871457622de(event) {
  if (event.pointerType === "" && event.isTrusted) return true;
  if ((0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.pointerType) return event.type === "click" && event.buttons === 1;
  return event.detail === 0 && !event.pointerType;
}
function $b5c62b033c25b96d$export$29bf1b5f2c56cf63(event) {
  return !(0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 0 && event.height === 0 || (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "mouse";
}

// node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var import_react10 = __toESM(require_react(), 1);
var $8f5a2122b0992be3$var$currentModality = null;
var $8f5a2122b0992be3$var$currentPointerType = "keyboard";
var $8f5a2122b0992be3$export$901e90a13c50a14e = /* @__PURE__ */ new Set();
var $8f5a2122b0992be3$export$d90243b58daecda7 = /* @__PURE__ */ new Map();
var $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
var $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
var $8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS = {
  Tab: true,
  Escape: true
};
function $8f5a2122b0992be3$var$triggerChangeHandlers(modality, e) {
  for (let handler of $8f5a2122b0992be3$export$901e90a13c50a14e) handler(modality, e);
}
function $8f5a2122b0992be3$var$isValidKey(e) {
  return !(e.metaKey || !(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function $8f5a2122b0992be3$var$handleKeyboardEvent(e) {
  $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
  if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && $8f5a2122b0992be3$var$isValidKey(e)) {
    $8f5a2122b0992be3$var$currentModality = "keyboard";
    $8f5a2122b0992be3$var$currentPointerType = "keyboard";
    $8f5a2122b0992be3$var$triggerChangeHandlers("keyboard", e);
  }
}
function $8f5a2122b0992be3$var$handlePointerEvent(e) {
  $8f5a2122b0992be3$var$currentModality = "pointer";
  $8f5a2122b0992be3$var$currentPointerType = "pointerType" in e ? e.pointerType : "mouse";
  if (e.type === "mousedown" || e.type === "pointerdown") {
    $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
    $8f5a2122b0992be3$var$triggerChangeHandlers("pointer", e);
  }
}
function $8f5a2122b0992be3$var$handleClickEvent(e) {
  if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && (0, $b5c62b033c25b96d$export$60278871457622de)(e)) {
    $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
    $8f5a2122b0992be3$var$currentModality = "virtual";
    $8f5a2122b0992be3$var$currentPointerType = "virtual";
  }
}
function $8f5a2122b0992be3$var$handleFocusEvent(e) {
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e));
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e));
  if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === ownerWindow || (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === ownerDocument || (0, $a92dc41f639950be$export$fda7da73ab5d4c48) || !e.isTrusted) return;
  if (!$8f5a2122b0992be3$var$hasEventBeforeFocus && !$8f5a2122b0992be3$var$hasBlurredWindowRecently) {
    $8f5a2122b0992be3$var$currentModality = "virtual";
    $8f5a2122b0992be3$var$currentPointerType = "virtual";
    $8f5a2122b0992be3$var$triggerChangeHandlers("virtual", e);
  }
  $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
  $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
}
function $8f5a2122b0992be3$var$handleWindowBlur() {
  if (0, $a92dc41f639950be$export$fda7da73ab5d4c48) return;
  $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
  $8f5a2122b0992be3$var$hasBlurredWindowRecently = true;
}
function $8f5a2122b0992be3$var$setupGlobalFocusEvents(element) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if ($8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject)) return;
  let focus = windowObject.HTMLElement.prototype.focus;
  Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
    configurable: true,
    writable: true,
    value: function() {
      $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
      focus.apply(this, arguments);
    }
  });
  documentObject.addEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.addEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.addEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
  windowObject.addEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
  windowObject.addEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
  if (typeof PointerEvent !== "undefined") {
    documentObject.addEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  } else if (false) {
    documentObject.addEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  }
  windowObject.addEventListener("beforeunload", () => {
    $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element);
  }, {
    once: true
  });
  $8f5a2122b0992be3$export$d90243b58daecda7.set(windowObject, {
    focus
  });
}
var $8f5a2122b0992be3$var$tearDownWindowFocusTracking = (element, loadListener) => {
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if (loadListener) documentObject.removeEventListener("DOMContentLoaded", loadListener);
  if (!$8f5a2122b0992be3$export$d90243b58daecda7.has(windowObject)) return;
  Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
    configurable: true,
    writable: true,
    value: $8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject).focus
  });
  documentObject.removeEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.removeEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.removeEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
  windowObject.removeEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
  windowObject.removeEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
  if (typeof PointerEvent !== "undefined") {
    documentObject.removeEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  } else if (false) {
    documentObject.removeEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  }
  $8f5a2122b0992be3$export$d90243b58daecda7.delete(windowObject);
};
function $8f5a2122b0992be3$export$2f1888112f558a7d(element) {
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  let loadListener;
  if (documentObject.readyState !== "loading") $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
  else {
    loadListener = () => {
      $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
    };
    documentObject.addEventListener("DOMContentLoaded", loadListener);
  }
  return () => $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element, loadListener);
}
if (typeof document !== "undefined") $8f5a2122b0992be3$export$2f1888112f558a7d();
function $8f5a2122b0992be3$export$b9b3dfddab17db27() {
  return $8f5a2122b0992be3$var$currentModality !== "pointer";
}
function $8f5a2122b0992be3$export$630ff653c5ada6a9() {
  return $8f5a2122b0992be3$var$currentModality;
}
function $8f5a2122b0992be3$export$8397ddfc504fdb9a(modality) {
  $8f5a2122b0992be3$var$currentModality = modality;
  $8f5a2122b0992be3$var$currentPointerType = modality === "pointer" ? "mouse" : modality;
  $8f5a2122b0992be3$var$triggerChangeHandlers(modality, null);
}
function $8f5a2122b0992be3$export$887a228355cf7d95() {
  return $8f5a2122b0992be3$var$currentPointerType;
}
function $8f5a2122b0992be3$export$98e20ec92f614cfe() {
  $8f5a2122b0992be3$var$setupGlobalFocusEvents();
  let [modality, setModality] = (0, import_react10.useState)($8f5a2122b0992be3$var$currentModality);
  (0, import_react10.useEffect)(() => {
    let handler = () => {
      setModality($8f5a2122b0992be3$var$currentModality);
    };
    $8f5a2122b0992be3$export$901e90a13c50a14e.add(handler);
    return () => {
      $8f5a2122b0992be3$export$901e90a13c50a14e.delete(handler);
    };
  }, []);
  return (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)() ? null : modality;
}
var $8f5a2122b0992be3$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $8f5a2122b0992be3$var$isKeyboardFocusEvent(isTextInput, modality, e) {
  let eventTarget = e ? (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) : void 0;
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(eventTarget);
  const IHTMLInputElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLInputElement : HTMLInputElement;
  const IHTMLTextAreaElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLTextAreaElement : HTMLTextAreaElement;
  const IHTMLElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLElement : HTMLElement;
  const IKeyboardEvent = typeof ownerWindow !== "undefined" ? ownerWindow.KeyboardEvent : KeyboardEvent;
  let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
  isTextInput = isTextInput || activeElement instanceof IHTMLInputElement && !$8f5a2122b0992be3$var$nonTextInputTypes.has(activeElement.type) || activeElement instanceof IHTMLTextAreaElement || activeElement instanceof IHTMLElement && activeElement.isContentEditable;
  return !(isTextInput && modality === "keyboard" && e instanceof IKeyboardEvent && !$8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS[e.key]);
}
function $8f5a2122b0992be3$export$ec71b4b83ac08ec3(fn, deps, opts) {
  $8f5a2122b0992be3$var$setupGlobalFocusEvents();
  (0, import_react10.useEffect)(() => {
    if (opts?.enabled === false) return;
    let handler = (modality, e) => {
      if (!$8f5a2122b0992be3$var$isKeyboardFocusEvent(!!opts?.isTextInput, modality, e)) return;
      fn($8f5a2122b0992be3$export$b9b3dfddab17db27());
    };
    $8f5a2122b0992be3$export$901e90a13c50a14e.add(handler);
    return () => {
      $8f5a2122b0992be3$export$901e90a13c50a14e.delete(handler);
    };
  }, deps);
}

// node_modules/react-aria/dist/private/utils/runAfterTransition.mjs
var $081cb5757e08788e$var$transitionsByElement = /* @__PURE__ */ new Map();
var $081cb5757e08788e$var$transitionCallbacks = /* @__PURE__ */ new Set();
function $081cb5757e08788e$var$setupGlobalEvents() {
  if (typeof window === "undefined") return;
  function isTransitionEvent(event) {
    return "propertyName" in event;
  }
  let onTransitionStart = (e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (!isTransitionEvent(e) || !eventTarget) return;
    let transitions = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
    if (!transitions) {
      transitions = /* @__PURE__ */ new Set();
      $081cb5757e08788e$var$transitionsByElement.set(eventTarget, transitions);
      eventTarget.addEventListener("transitioncancel", onTransitionEnd, {
        once: true
      });
    }
    transitions.add(e.propertyName);
  };
  let onTransitionEnd = (e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (!isTransitionEvent(e) || !eventTarget) return;
    let properties = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
    if (!properties) return;
    properties.delete(e.propertyName);
    if (properties.size === 0) {
      eventTarget.removeEventListener("transitioncancel", onTransitionEnd);
      $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
    }
    if ($081cb5757e08788e$var$transitionsByElement.size === 0) {
      for (let cb of $081cb5757e08788e$var$transitionCallbacks) cb();
      $081cb5757e08788e$var$transitionCallbacks.clear();
    }
  };
  document.body.addEventListener("transitionrun", onTransitionStart);
  document.body.addEventListener("transitionend", onTransitionEnd);
}
if (typeof document !== "undefined") {
  if (document.readyState !== "loading") $081cb5757e08788e$var$setupGlobalEvents();
  else document.addEventListener("DOMContentLoaded", $081cb5757e08788e$var$setupGlobalEvents);
}
function $081cb5757e08788e$var$cleanupDetachedElements() {
  for (const [eventTarget] of $081cb5757e08788e$var$transitionsByElement)
    if ("isConnected" in eventTarget && !eventTarget.isConnected) $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
}
function $081cb5757e08788e$export$24490316f764c430(fn) {
  requestAnimationFrame(() => {
    $081cb5757e08788e$var$cleanupDetachedElements();
    if ($081cb5757e08788e$var$transitionsByElement.size === 0) fn();
    else $081cb5757e08788e$var$transitionCallbacks.add(fn);
  });
}

// node_modules/react-aria/dist/private/interactions/focusSafely.mjs
function $f192c2f16961cbe0$export$80f3e147d781571c(element) {
  if (!element.isConnected) return;
  const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if ((0, $8f5a2122b0992be3$export$630ff653c5ada6a9)() === "virtual") {
    let lastFocusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
    (0, $081cb5757e08788e$export$24490316f764c430)(() => {
      const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      if ((activeElement === lastFocusedElement || activeElement === ownerDocument.body) && element.isConnected) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
    });
  } else (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
}

// node_modules/react-aria/dist/private/utils/useSyncRef.mjs
function $b7115c395c64f7b5$export$4debdb1a3f0fa79e(context, ref) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (context && context.ref && ref) {
      context.ref.current = ref.current;
      return () => {
        if (context.ref)
          context.ref.current = null;
      };
    }
  });
}

// node_modules/react-aria/dist/private/interactions/useFocusable.mjs
var import_react11 = __toESM(require_react(), 1);
var $d1116acdf220c2da$export$f9762fab77588ecb = /* @__PURE__ */ (0, import_react11.default).createContext(null);
function $d1116acdf220c2da$var$useFocusableContext(ref) {
  let context = (0, import_react11.useContext)($d1116acdf220c2da$export$f9762fab77588ecb) || {};
  (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, ref);
  let { ref: _, ...otherProps } = context;
  return otherProps;
}
var $d1116acdf220c2da$export$13f3202a3e5ddd5 = /* @__PURE__ */ (0, import_react11.default).forwardRef(function FocusableProvider(props, ref) {
  let { children, ...otherProps } = props;
  let objRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
  let context = {
    ...otherProps,
    ref: objRef
  };
  return /* @__PURE__ */ (0, import_react11.default).createElement($d1116acdf220c2da$export$f9762fab77588ecb.Provider, {
    value: context
  }, children);
});
function $d1116acdf220c2da$export$4c014de7c8940b4c(props, domRef) {
  let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)(props);
  let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)(props);
  let interactions = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(focusProps, keyboardProps);
  let domProps = $d1116acdf220c2da$var$useFocusableContext(domRef);
  let interactionProps = props.isDisabled ? {} : domProps;
  let autoFocusRef = (0, import_react11.useRef)(props.autoFocus);
  (0, import_react11.useEffect)(() => {
    if (autoFocusRef.current && domRef.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(domRef.current);
    autoFocusRef.current = false;
  }, [
    domRef
  ]);
  let tabIndex = props.excludeFromTabOrder ? -1 : 0;
  if (props.isDisabled) tabIndex = void 0;
  return {
    focusableProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)({
      ...interactions,
      tabIndex
    }, interactionProps)
  };
}

// node_modules/react-aria/dist/private/utils/filterDOMProps.mjs
var $8e9d2fae0ecb9001$var$DOMPropNames = /* @__PURE__ */ new Set([
  "id"
]);
var $8e9d2fae0ecb9001$var$labelablePropNames = /* @__PURE__ */ new Set([
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details"
]);
var $8e9d2fae0ecb9001$var$linkPropNames = /* @__PURE__ */ new Set([
  "href",
  "hrefLang",
  "target",
  "rel",
  "download",
  "ping",
  "referrerPolicy"
]);
var $8e9d2fae0ecb9001$var$globalAttrs = /* @__PURE__ */ new Set([
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate"
]);
var $8e9d2fae0ecb9001$var$globalEvents = /* @__PURE__ */ new Set([
  "onClick",
  "onAuxClick",
  "onContextMenu",
  "onDoubleClick",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onPointerDown",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerOver",
  "onPointerOut",
  "onGotPointerCapture",
  "onLostPointerCapture",
  "onScroll",
  "onWheel",
  "onAnimationStart",
  "onAnimationEnd",
  "onAnimationIteration",
  "onTransitionCancel",
  "onTransitionEnd",
  "onTransitionRun",
  "onTransitionStart"
]);
var $8e9d2fae0ecb9001$var$propRe = /^(data-.*)$/;
function $8e9d2fae0ecb9001$export$457c3d6518dd4c6f(props, opts = {}) {
  let { labelable, isLink, global, events = global, propNames } = opts;
  let filteredProps = {};
  for (const prop in props) if (Object.prototype.hasOwnProperty.call(props, prop) && ($8e9d2fae0ecb9001$var$DOMPropNames.has(prop) || labelable && $8e9d2fae0ecb9001$var$labelablePropNames.has(prop) || isLink && $8e9d2fae0ecb9001$var$linkPropNames.has(prop) || global && $8e9d2fae0ecb9001$var$globalAttrs.has(prop) || events && ($8e9d2fae0ecb9001$var$globalEvents.has(prop) || prop.endsWith("Capture") && $8e9d2fae0ecb9001$var$globalEvents.has(prop.slice(0, -7))) || propNames?.has(prop) || $8e9d2fae0ecb9001$var$propRe.test(prop))) filteredProps[prop] = props[prop];
  return filteredProps;
}

// node_modules/react-aria/dist/private/i18n/utils.mjs
var $d805ff57cab8bee2$var$RTL_SCRIPTS = /* @__PURE__ */ new Set([
  "Arab",
  "Syrc",
  "Samr",
  "Mand",
  "Thaa",
  "Mend",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Hebr"
]);
var $d805ff57cab8bee2$var$RTL_LANGS = /* @__PURE__ */ new Set([
  "ae",
  "ar",
  "arc",
  "bcc",
  "bqi",
  "ckb",
  "dv",
  "fa",
  "glk",
  "he",
  "ku",
  "mzn",
  "nqo",
  "pnb",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi"
]);
function $d805ff57cab8bee2$export$702d680b21cbd764(localeString) {
  if (Intl.Locale) {
    let locale = new Intl.Locale(localeString).maximize();
    let textInfo = (
      // @ts-ignore - this was implemented as a property by some browsers before it was standardized as a function.
      typeof locale.getTextInfo === "function" ? locale.getTextInfo() : locale.textInfo
    );
    if (textInfo) return textInfo.direction === "rtl";
    if (locale.script) return $d805ff57cab8bee2$var$RTL_SCRIPTS.has(locale.script);
  }
  let lang = localeString.split("-")[0];
  return $d805ff57cab8bee2$var$RTL_LANGS.has(lang);
}

// node_modules/react-aria/dist/private/i18n/useDefaultLocale.mjs
var import_react12 = __toESM(require_react(), 1);
var $520a025cdb0d710d$var$localeSymbol = Symbol.for("react-aria.i18n.locale");
function $520a025cdb0d710d$export$f09106e7c6677ec5() {
  let locale = typeof window !== "undefined" && window[$520a025cdb0d710d$var$localeSymbol] || // @ts-ignore
  typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([
      locale
    ]);
  } catch {
    locale = "en-US";
  }
  return {
    locale,
    direction: (0, $d805ff57cab8bee2$export$702d680b21cbd764)(locale) ? "rtl" : "ltr"
  };
}
var $520a025cdb0d710d$var$currentLocale = $520a025cdb0d710d$export$f09106e7c6677ec5();
var $520a025cdb0d710d$var$listeners = /* @__PURE__ */ new Set();
function $520a025cdb0d710d$var$updateLocale() {
  $520a025cdb0d710d$var$currentLocale = $520a025cdb0d710d$export$f09106e7c6677ec5();
  for (let listener of $520a025cdb0d710d$var$listeners) listener($520a025cdb0d710d$var$currentLocale);
}
function $520a025cdb0d710d$export$188ec29ebc2bdc3a() {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let [defaultLocale, setDefaultLocale] = (0, import_react12.useState)($520a025cdb0d710d$var$currentLocale);
  (0, import_react12.useEffect)(() => {
    if ($520a025cdb0d710d$var$listeners.size === 0) window.addEventListener("languagechange", $520a025cdb0d710d$var$updateLocale);
    $520a025cdb0d710d$var$listeners.add(setDefaultLocale);
    return () => {
      $520a025cdb0d710d$var$listeners.delete(setDefaultLocale);
      if ($520a025cdb0d710d$var$listeners.size === 0) window.removeEventListener("languagechange", $520a025cdb0d710d$var$updateLocale);
    };
  }, []);
  if (isSSR) {
    let locale = typeof window !== "undefined" && window[$520a025cdb0d710d$var$localeSymbol];
    return {
      locale: locale || "en-US",
      direction: "ltr"
    };
  }
  return defaultLocale;
}

// node_modules/react-aria/dist/private/i18n/I18nProvider.mjs
var import_react13 = __toESM(require_react(), 1);
var $2eb8e6d23f3d0cb0$var$I18nContext = /* @__PURE__ */ (0, import_react13.default).createContext(null);
function $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7() {
  let defaultLocale = (0, $520a025cdb0d710d$export$188ec29ebc2bdc3a)();
  let context = (0, import_react13.useContext)($2eb8e6d23f3d0cb0$var$I18nContext);
  return context || defaultLocale;
}

// node_modules/react-aria/dist/private/utils/useGlobalListeners.mjs
var import_react14 = __toESM(require_react(), 1);
function $48a7d519b337145d$export$4eaf04e54aa8eed6() {
  let globalListeners = (0, import_react14.useRef)(/* @__PURE__ */ new Map());
  let addGlobalListener = (0, import_react14.useCallback)((eventTarget, type, listener, options) => {
    let fn = options?.once ? (...args) => {
      globalListeners.current.delete(listener);
      listener(...args);
    } : listener;
    globalListeners.current.set(listener, {
      type,
      eventTarget,
      fn,
      options
    });
    eventTarget.addEventListener(type, fn, options);
  }, []);
  let removeGlobalListener = (0, import_react14.useCallback)((eventTarget, type, listener, options) => {
    let fn = globalListeners.current.get(listener)?.fn || listener;
    eventTarget.removeEventListener(type, fn, options);
    globalListeners.current.delete(listener);
  }, []);
  let removeAllGlobalListeners = (0, import_react14.useCallback)(() => {
    globalListeners.current.forEach((value, key) => {
      removeGlobalListener(value.eventTarget, value.type, key, value.options);
    });
  }, [
    removeGlobalListener
  ]);
  (0, import_react14.useEffect)(() => {
    return removeAllGlobalListeners;
  }, [
    removeAllGlobalListeners
  ]);
  return {
    addGlobalListener,
    removeGlobalListener,
    removeAllGlobalListeners
  };
}

// node_modules/react-aria/dist/private/interactions/useHover.mjs
var import_react15 = __toESM(require_react(), 1);
var $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
var $e969f22b6713ca4a$var$hoverCount = 0;
function $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents() {
  $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = true;
  setTimeout(() => {
    $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
  }, 500);
}
function $e969f22b6713ca4a$var$handleGlobalPointerEvent(e) {
  if (e.pointerType === "touch") $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents();
}
function $e969f22b6713ca4a$var$setupGlobalTouchEvents() {
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(null);
  if (typeof ownerDocument === "undefined") return;
  if ($e969f22b6713ca4a$var$hoverCount === 0) {
    if (typeof PointerEvent !== "undefined") ownerDocument.addEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
    else if (false) ownerDocument.addEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
  }
  $e969f22b6713ca4a$var$hoverCount++;
  return () => {
    $e969f22b6713ca4a$var$hoverCount--;
    if ($e969f22b6713ca4a$var$hoverCount > 0) return;
    if (typeof PointerEvent !== "undefined") ownerDocument.removeEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
    else if (false) ownerDocument.removeEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
  };
}
function $e969f22b6713ca4a$export$ae780daf29e6d456(props) {
  let { onHoverStart, onHoverChange, onHoverEnd, isDisabled } = props;
  let [isHovered, setHovered] = (0, import_react15.useState)(false);
  let state = (0, import_react15.useRef)({
    isHovered: false,
    ignoreEmulatedMouseEvents: false,
    pointerType: "",
    target: null
  }).current;
  (0, import_react15.useEffect)($e969f22b6713ca4a$var$setupGlobalTouchEvents, []);
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let { hoverProps, triggerHoverEnd } = (0, import_react15.useMemo)(() => {
    let triggerHoverStart = (event, pointerType) => {
      state.pointerType = pointerType;
      if (isDisabled || pointerType === "touch" || state.isHovered || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(event.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event))) return;
      state.isHovered = true;
      let target = event.currentTarget;
      state.target = target;
      addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event)), "pointerover", (e) => {
        if (state.isHovered && state.target && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)))
          triggerHoverEnd2(e, e.pointerType);
      }, {
        capture: true
      });
      if (onHoverStart) onHoverStart({
        type: "hoverstart",
        target,
        pointerType
      });
      if (onHoverChange) onHoverChange(true);
      setHovered(true);
    };
    let triggerHoverEnd2 = (event, pointerType) => {
      let target = state.target;
      state.pointerType = "";
      state.target = null;
      if (pointerType === "touch" || !state.isHovered || !target) return;
      state.isHovered = false;
      removeAllGlobalListeners();
      if (onHoverEnd) onHoverEnd({
        type: "hoverend",
        target,
        pointerType
      });
      if (onHoverChange) onHoverChange(false);
      setHovered(false);
    };
    let hoverProps2 = {};
    if (typeof PointerEvent !== "undefined") {
      hoverProps2.onPointerEnter = (e) => {
        if ($e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents && e.pointerType === "mouse") return;
        triggerHoverStart(e, e.pointerType);
      };
      hoverProps2.onPointerLeave = (e) => {
        if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) triggerHoverEnd2(e, e.pointerType);
      };
    } else if (false) {
      hoverProps2.onTouchStart = () => {
        state.ignoreEmulatedMouseEvents = true;
      };
      hoverProps2.onMouseEnter = (e) => {
        if (!state.ignoreEmulatedMouseEvents && !$e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents) triggerHoverStart(e, "mouse");
        state.ignoreEmulatedMouseEvents = false;
      };
      hoverProps2.onMouseLeave = (e) => {
        if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) triggerHoverEnd2(e, "mouse");
      };
    }
    return {
      hoverProps: hoverProps2,
      triggerHoverEnd: triggerHoverEnd2
    };
  }, [
    onHoverStart,
    onHoverChange,
    onHoverEnd,
    isDisabled,
    state,
    addGlobalListener,
    removeAllGlobalListeners
  ]);
  (0, import_react15.useEffect)(() => {
    if (isDisabled) triggerHoverEnd({
      currentTarget: state.target
    }, state.pointerType);
  }, [
    isDisabled
  ]);
  return {
    hoverProps,
    isHovered
  };
}

// node_modules/react-aria/dist/private/utils/useEffectEvent.mjs
var import_react16 = __toESM(require_react(), 1);
var $fe16bffc7a557bf0$var$useEarlyEffect = (0, import_react16.default)["useInsertionEffect"] ?? (0, $c4867b2f328c2698$export$e5c5a5f917a5871c);
function $fe16bffc7a557bf0$export$7f54fc3180508a52(fn) {
  const ref = (0, import_react16.useRef)(null);
  $fe16bffc7a557bf0$var$useEarlyEffect(() => {
    ref.current = fn;
  }, [
    fn
  ]);
  return (0, import_react16.useCallback)((...args) => {
    const f = ref.current;
    return f?.(...args);
  }, []);
}

// node_modules/react-stately/dist/private/utils/useControlledState.mjs
var import_react17 = __toESM(require_react(), 1);
var $3e6197669829fe11$var$useEarlyEffect = typeof document !== "undefined" ? (0, import_react17.default)["useInsertionEffect"] ?? (0, import_react17.default).useLayoutEffect : () => {
};
function $3e6197669829fe11$export$40bfa8c7b0832715(value, defaultValue, onChange) {
  let [stateValue, setStateValue] = (0, import_react17.useState)(value || defaultValue);
  let valueRef = (0, import_react17.useRef)(stateValue);
  let isControlledRef = (0, import_react17.useRef)(value !== void 0);
  let isControlled = value !== void 0;
  (0, import_react17.useEffect)(() => {
    let wasControlled = isControlledRef.current;
    if (wasControlled !== isControlled && true) console.warn(`WARN: A component changed from ${wasControlled ? "controlled" : "uncontrolled"} to ${isControlled ? "controlled" : "uncontrolled"}.`);
    isControlledRef.current = isControlled;
  }, [
    isControlled
  ]);
  let currentValue = isControlled ? value : stateValue;
  $3e6197669829fe11$var$useEarlyEffect(() => {
    valueRef.current = currentValue;
  });
  let [, forceUpdate] = (0, import_react17.useReducer)(() => ({}), {});
  let setValue = (0, import_react17.useCallback)((value2, ...args) => {
    let newValue = typeof value2 === "function" ? value2(valueRef.current) : value2;
    if (!Object.is(valueRef.current, newValue)) {
      valueRef.current = newValue;
      setStateValue(newValue);
      forceUpdate();
      onChange?.(newValue, ...args);
    }
  }, [
    onChange
  ]);
  return [
    currentValue,
    setValue
  ];
}

// node_modules/react-aria/dist/private/utils/animation.mjs
var import_react_dom = __toESM(require_react_dom(), 1);
var import_react18 = __toESM(require_react(), 1);
function $fcc7165e876206c6$export$6d3443f2c48bfc20(ref, isReady = true) {
  let [isEntering, setEntering] = (0, import_react18.useState)(true);
  let isAnimationReady = isEntering && isReady;
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isAnimationReady && ref.current && "getAnimations" in ref.current) {
      for (let animation of ref.current.getAnimations()) if (animation instanceof CSSTransition) animation.cancel();
    }
  }, [
    ref,
    isAnimationReady
  ]);
  $fcc7165e876206c6$var$useAnimation(ref, isAnimationReady, (0, import_react18.useCallback)(() => setEntering(false), []));
  return isAnimationReady;
}
function $fcc7165e876206c6$export$45fda7c47f93fd48(ref, isOpen) {
  let [exitState, setExitState] = (0, import_react18.useState)(isOpen ? "open" : "closed");
  switch (exitState) {
    case "open":
      if (!isOpen) setExitState("exiting");
      break;
    case "closed":
    case "exiting":
      if (isOpen) setExitState("open");
      break;
  }
  let isExiting = exitState === "exiting";
  $fcc7165e876206c6$var$useAnimation(ref, isExiting, (0, import_react18.useCallback)(() => {
    setExitState((state) => state === "exiting" ? "closed" : state);
  }, []));
  return isExiting;
}
function $fcc7165e876206c6$var$useAnimation(ref, isActive, onEnd) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isActive && ref.current) {
      if (!("getAnimations" in ref.current)) {
        onEnd();
        return;
      }
      let animations = ref.current.getAnimations();
      if (animations.length === 0) {
        onEnd();
        return;
      }
      let canceled = false;
      Promise.allSettled(animations.map((a) => a.finished)).then(() => {
        if (!canceled) (0, import_react_dom.flushSync)(() => {
          onEnd();
        });
      });
      return () => {
        canceled = true;
      };
    }
  }, [
    ref,
    isActive,
    onEnd
  ]);
}

export {
  $a4e76a5424781910$export$e08e3b67e392101e,
  $c4867b2f328c2698$export$e5c5a5f917a5871c,
  $c7eafbbe1ea5834e$export$535bd6ca7f90a273,
  $390e54f620492c70$export$f680877a34711e37,
  $390e54f620492c70$export$b4cc09c592e8fdb8,
  $4064df0d6f9620e1$export$c9058316764c140e,
  $bbaa08b3cd72f041$export$9d1611c77c2fe928,
  $03e8ab2d84d7657a$export$4338b53315abf666,
  $7230ffa83bc0c2cf$export$c62b8e45d58ddad9,
  $7230ffa83bc0c2cf$export$2881499e37b75b9a,
  $7230ffa83bc0c2cf$export$4d86445c2cf5e3,
  $7230ffa83bc0c2cf$export$c245e6201fed2f75,
  $7230ffa83bc0c2cf$export$fabf2dc03a41866e,
  $7230ffa83bc0c2cf$export$29f1550f4b0d4415,
  $7230ffa83bc0c2cf$export$9d4c57ee4c6ffdd8,
  $7230ffa83bc0c2cf$export$ef03459518577ad4,
  $7230ffa83bc0c2cf$export$df3a06d6289f983e,
  $1969ac565cfec8d0$export$de79e2c695e052f3,
  $d447af545b77c9f1$export$b204af158042fbac,
  $d447af545b77c9f1$export$f21a1ffae260145a,
  $d447af545b77c9f1$export$af51f0f06c0f328a,
  $d447af545b77c9f1$export$f531f92e2a15358f,
  $6a20a7989e6c817a$export$98658e8c59125e6a,
  $23f2114a1b82827e$export$4282f70798064fe0,
  $23f2114a1b82827e$export$cd4e5573fbe2b576,
  $23f2114a1b82827e$export$e58f029f0fbfdb29,
  $23f2114a1b82827e$export$da7af4355d792141,
  $23f2114a1b82827e$export$b4f377a2b6254582,
  $ae77152785188400$export$e989c0fffaa6b27a,
  $3b8b240c1bf84ab9$export$4c063cf1350e6fed,
  $3b8b240c1bf84ab9$export$bebd5a1431fec25d,
  $a92dc41f639950be$export$525bc4921d56d4a,
  $a92dc41f639950be$export$c2b7abe5d61ec696,
  $a92dc41f639950be$export$715c682d09d639cc,
  $a92dc41f639950be$export$cabe61c495ee3649,
  $2add3ce32c6007eb$export$9ac100e40613ea10,
  $2add3ce32c6007eb$export$186c6964ca17d99,
  $2add3ce32c6007eb$export$fedb369cb70207f1,
  $2add3ce32c6007eb$export$e1865c3bedcd822b,
  $2add3ce32c6007eb$export$78551043582a6a98,
  $2add3ce32c6007eb$export$6446a186d09e379e,
  $2add3ce32c6007eb$export$a11b0059900ceec8,
  $b5c62b033c25b96d$export$60278871457622de,
  $b5c62b033c25b96d$export$29bf1b5f2c56cf63,
  $caaf0dd3060ed57c$export$9a302a45f65d0572,
  $caaf0dd3060ed57c$export$95185d699e05d4d7,
  $caaf0dd3060ed57c$export$bdc77b0c0a3a85d6,
  $caaf0dd3060ed57c$export$7e924b3091a3bd18,
  $caaf0dd3060ed57c$export$13aea1a3cb5e3f1f,
  $8f5a2122b0992be3$export$b9b3dfddab17db27,
  $8f5a2122b0992be3$export$630ff653c5ada6a9,
  $8f5a2122b0992be3$export$8397ddfc504fdb9a,
  $8f5a2122b0992be3$export$887a228355cf7d95,
  $8f5a2122b0992be3$export$98e20ec92f614cfe,
  $8f5a2122b0992be3$export$ec71b4b83ac08ec3,
  $081cb5757e08788e$export$24490316f764c430,
  $f192c2f16961cbe0$export$80f3e147d781571c,
  $1e74c67db218ce67$export$f8168d8dd8fd66e6,
  $8296dad1a4c5e0dc$export$8f71654801c2f7cd,
  $b7115c395c64f7b5$export$4debdb1a3f0fa79e,
  $d1116acdf220c2da$export$f9762fab77588ecb,
  $d1116acdf220c2da$export$13f3202a3e5ddd5,
  $d1116acdf220c2da$export$4c014de7c8940b4c,
  $8e9d2fae0ecb9001$export$457c3d6518dd4c6f,
  $fe16bffc7a557bf0$export$7f54fc3180508a52,
  $48a7d519b337145d$export$4eaf04e54aa8eed6,
  $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7,
  $3e6197669829fe11$export$40bfa8c7b0832715,
  $fcc7165e876206c6$export$6d3443f2c48bfc20,
  $fcc7165e876206c6$export$45fda7c47f93fd48,
  $e969f22b6713ca4a$export$ae780daf29e6d456
};
