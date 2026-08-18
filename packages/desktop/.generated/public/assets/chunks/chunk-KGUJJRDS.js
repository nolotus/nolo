import {
  ChatErrorBoundary_default
} from "/public/assets/chunks/chunk-VZVLU27P.js";
import {
  MessageContent,
  MessageLayout,
  StatusIcon,
  StreamingPendingIndicator,
  ToolMessageContent_default,
  ToolMessageGroup_default,
  buildCanvasNodeEditingTarget,
  markPendingCanvasEditSelection,
  publishCanvasEditSelection,
  safeParse,
  useCanvasEditSelection,
  useMessageInteraction
} from "/public/assets/chunks/chunk-W5JSORLZ.js";
import {
  formatCredits
} from "/public/assets/chunks/chunk-FXB3NEER.js";
import {
  AgentForm_default
} from "/public/assets/chunks/chunk-TFTFADYD.js";
import {
  resolveAvatarUrl
} from "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  clearSelectedNode,
  useAppSelectedNode
} from "/public/assets/chunks/chunk-F6NU5WEW.js";
import {
  BrowseContextIndicator,
  FileUploadButton_default,
  SendButton_default,
  VoiceInputButton_default,
  sendFirstMessage,
  useAutoResizeTextarea,
  useChatInput,
  useFileDropZone,
  useMessageInputFiles
} from "/public/assets/chunks/chunk-DKWNAD22.js";
import {
  AgentPickerControl,
  shouldDeferEnterForIme,
  useAgentPickerCandidates
} from "/public/assets/chunks/chunk-JUT5AJQ2.js";
import {
  getAgentRecordIdentifiers,
  getAgentRecordTimestamp
} from "/public/assets/chunks/chunk-6EJRYVCO.js";
import {
  sortAgentsFavoriteOwnedPublic,
  usePublicAgents
} from "/public/assets/chunks/chunk-5SG4AG33.js";
import {
  useFetchData
} from "/public/assets/chunks/chunk-EA4SLPRB.js";
import {
  useUserData
} from "/public/assets/chunks/chunk-QADHV2NS.js";
import {
  nanoid
} from "/public/assets/chunks/chunk-T73R6CXN.js";
import {
  publishChatInputSeed,
  useChatInputSeed
} from "/public/assets/chunks/chunk-AFCUL4LM.js";
import {
  clipboard_default
} from "/public/assets/chunks/chunk-AOBBTRZH.js";
import {
  useTheme
} from "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  Tooltip
} from "/public/assets/chunks/chunk-WZN2TP6C.js";
import {
  DocxPreviewDialog_default
} from "/public/assets/chunks/chunk-2NEHLYGB.js";
import {
  useIsMobile
} from "/public/assets/chunks/chunk-ZQBH52MP.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $7705c033048f6da7$export$353f5b6fc5456de1,
  $8d5785ac9f5d0f19$export$62e3ae2a4090b879,
  $b8dcdc58eeae0d40$export$2c73285ae9390cec,
  $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
  $f2ff30fde7b014be$export$2e1e1122cf0cba88
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  resolveAgentImageInputSupport
} from "/public/assets/chunks/chunk-FPYFWXR7.js";
import {
  executeToolRun,
  resolveMessageAgentKey,
  updateProcessLaunchStatus,
  useAllToolRuns,
  useToolRunById,
  useToolRunsByMessageId
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  GPT_PRO_BLOCKED_MESSAGE,
  shouldBlockForGptPro
} from "/public/assets/chunks/chunk-52ICTTPO.js";
import {
  getFinalPrice,
  getModelPricing,
  getPrices,
  hasExplicitAgentPricing
} from "/public/assets/chunks/chunk-5IJJ57JD.js";
import {
  getPublicImageAgentMode
} from "/public/assets/chunks/chunk-VCSNZD3S.js";
import {
  createDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  StreamingIndicator_default
} from "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useCouldEdit,
  useCurrentUser,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  Link,
  QUICK_CHAT_COMPOSER_VT_NAME,
  useLocation,
  useNavigate,
  viewTransitionStyle
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  BUILTIN_TITLE_LLM_CONFIG,
  asOptionalJsonRecord,
  buildActivityTimeline,
  buildMessageFileContentUrl,
  buildRunStreamingAgentHandoffPresentation,
  createAsyncThunk,
  createDialog,
  createToolNameTranslator,
  dataURLtoFile,
  deleteMessage,
  editUserMessageAndReplay,
  extractToolCallArgs,
  fetchUserProfile,
  formatToolRowHeaderSummary,
  getModelContextWindow,
  getPrimaryDialogAgentId,
  handleSendMessage,
  initFavorites,
  isAssistantToolStub,
  isAutoDialog,
  isAwaitingVisibleAssistantReply,
  isDeviceLocalDbKey,
  isHiddenOrchestratorToolMessage,
  isIntermediateAssistantProgress,
  isLocalFileContentUrl,
  loadOlderMessages,
  normalizeToolDisplaySummary,
  patch,
  read,
  resolveDialogAutoAgentConfig,
  runLlm,
  selectAllMsgs,
  selectById,
  selectCurrentDialogTokens,
  selectCurrentSpaceId,
  selectCurrentUserBalance,
  selectLastAssistantMessage,
  selectMsgById,
  selectOcrModel,
  selectRuntimeCurrentServer,
  selectRuntimeSnapshot,
  selectShowScrollToBottomButton,
  selectShowScrollToTopButton,
  setPrimaryDialogAgent,
  shouldAutoCollapseToolGroup,
  streamAgentChatTurn,
  stripDurableImageInlinePayload,
  toast,
  updateDialogSummaryAction,
  updateToolMessage,
  upload,
  useFavoriteAgentIds,
  useFavoriteFavoritedAtById,
  useFavoritesInitialized,
  useHasStreamingMessage,
  useLastStreamTimestamp,
  useMessagesLoadingState,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  LuArrowRight,
  LuBookmark,
  LuBrain,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuCircle,
  LuClock,
  LuCode,
  LuCopy,
  LuGitBranch,
  LuPencilLine,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuSquare,
  LuTimer,
  LuTrash2,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildDialogUrl
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString,
  asTrimmedNonEmptyStringArray
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  clearPendingAttachments,
  clearPendingUserInputQueue,
  enqueueUserInput,
  extractCustomId,
  useActiveControllers,
  useCurrentDialogKey,
  usePendingFiles,
  usePendingUserInputQueue
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  getApproxPricePerImage,
  getModelConfig,
  getProviderByModelName
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalPositiveFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __commonJS,
  __publicField,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/prop-types/node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "node_modules/prop-types/node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        var hasSymbol = typeof Symbol === "function" && Symbol.for;
        var REACT_ELEMENT_TYPE = hasSymbol ? Symbol.for("react.element") : 60103;
        var REACT_PORTAL_TYPE = hasSymbol ? Symbol.for("react.portal") : 60106;
        var REACT_FRAGMENT_TYPE = hasSymbol ? Symbol.for("react.fragment") : 60107;
        var REACT_STRICT_MODE_TYPE = hasSymbol ? Symbol.for("react.strict_mode") : 60108;
        var REACT_PROFILER_TYPE = hasSymbol ? Symbol.for("react.profiler") : 60114;
        var REACT_PROVIDER_TYPE = hasSymbol ? Symbol.for("react.provider") : 60109;
        var REACT_CONTEXT_TYPE = hasSymbol ? Symbol.for("react.context") : 60110;
        var REACT_ASYNC_MODE_TYPE = hasSymbol ? Symbol.for("react.async_mode") : 60111;
        var REACT_CONCURRENT_MODE_TYPE = hasSymbol ? Symbol.for("react.concurrent_mode") : 60111;
        var REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for("react.forward_ref") : 60112;
        var REACT_SUSPENSE_TYPE = hasSymbol ? Symbol.for("react.suspense") : 60113;
        var REACT_SUSPENSE_LIST_TYPE = hasSymbol ? Symbol.for("react.suspense_list") : 60120;
        var REACT_MEMO_TYPE = hasSymbol ? Symbol.for("react.memo") : 60115;
        var REACT_LAZY_TYPE = hasSymbol ? Symbol.for("react.lazy") : 60116;
        var REACT_BLOCK_TYPE = hasSymbol ? Symbol.for("react.block") : 60121;
        var REACT_FUNDAMENTAL_TYPE = hasSymbol ? Symbol.for("react.fundamental") : 60117;
        var REACT_RESPONDER_TYPE = hasSymbol ? Symbol.for("react.responder") : 60118;
        var REACT_SCOPE_TYPE = hasSymbol ? Symbol.for("react.scope") : 60119;
        function isValidElementType(type) {
          return typeof type === "string" || typeof type === "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
          type === REACT_FRAGMENT_TYPE || type === REACT_CONCURRENT_MODE_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type === "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_RESPONDER_TYPE || type.$$typeof === REACT_SCOPE_TYPE || type.$$typeof === REACT_BLOCK_TYPE);
        }
        function typeOf(object) {
          if (typeof object === "object" && object !== null) {
            var $$typeof = object.$$typeof;
            switch ($$typeof) {
              case REACT_ELEMENT_TYPE:
                var type = object.type;
                switch (type) {
                  case REACT_ASYNC_MODE_TYPE:
                  case REACT_CONCURRENT_MODE_TYPE:
                  case REACT_FRAGMENT_TYPE:
                  case REACT_PROFILER_TYPE:
                  case REACT_STRICT_MODE_TYPE:
                  case REACT_SUSPENSE_TYPE:
                    return type;
                  default:
                    var $$typeofType = type && type.$$typeof;
                    switch ($$typeofType) {
                      case REACT_CONTEXT_TYPE:
                      case REACT_FORWARD_REF_TYPE:
                      case REACT_LAZY_TYPE:
                      case REACT_MEMO_TYPE:
                      case REACT_PROVIDER_TYPE:
                        return $$typeofType;
                      default:
                        return $$typeof;
                    }
                }
              case REACT_PORTAL_TYPE:
                return $$typeof;
            }
          }
          return void 0;
        }
        var AsyncMode = REACT_ASYNC_MODE_TYPE;
        var ConcurrentMode = REACT_CONCURRENT_MODE_TYPE;
        var ContextConsumer = REACT_CONTEXT_TYPE;
        var ContextProvider = REACT_PROVIDER_TYPE;
        var Element = REACT_ELEMENT_TYPE;
        var ForwardRef = REACT_FORWARD_REF_TYPE;
        var Fragment12 = REACT_FRAGMENT_TYPE;
        var Lazy = REACT_LAZY_TYPE;
        var Memo = REACT_MEMO_TYPE;
        var Portal = REACT_PORTAL_TYPE;
        var Profiler = REACT_PROFILER_TYPE;
        var StrictMode = REACT_STRICT_MODE_TYPE;
        var Suspense2 = REACT_SUSPENSE_TYPE;
        var hasWarnedAboutDeprecatedIsAsyncMode = false;
        function isAsyncMode(object) {
          {
            if (!hasWarnedAboutDeprecatedIsAsyncMode) {
              hasWarnedAboutDeprecatedIsAsyncMode = true;
              console["warn"]("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.");
            }
          }
          return isConcurrentMode(object) || typeOf(object) === REACT_ASYNC_MODE_TYPE;
        }
        function isConcurrentMode(object) {
          return typeOf(object) === REACT_CONCURRENT_MODE_TYPE;
        }
        function isContextConsumer(object) {
          return typeOf(object) === REACT_CONTEXT_TYPE;
        }
        function isContextProvider(object) {
          return typeOf(object) === REACT_PROVIDER_TYPE;
        }
        function isElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function isForwardRef(object) {
          return typeOf(object) === REACT_FORWARD_REF_TYPE;
        }
        function isFragment(object) {
          return typeOf(object) === REACT_FRAGMENT_TYPE;
        }
        function isLazy(object) {
          return typeOf(object) === REACT_LAZY_TYPE;
        }
        function isMemo(object) {
          return typeOf(object) === REACT_MEMO_TYPE;
        }
        function isPortal(object) {
          return typeOf(object) === REACT_PORTAL_TYPE;
        }
        function isProfiler(object) {
          return typeOf(object) === REACT_PROFILER_TYPE;
        }
        function isStrictMode(object) {
          return typeOf(object) === REACT_STRICT_MODE_TYPE;
        }
        function isSuspense(object) {
          return typeOf(object) === REACT_SUSPENSE_TYPE;
        }
        exports.AsyncMode = AsyncMode;
        exports.ConcurrentMode = ConcurrentMode;
        exports.ContextConsumer = ContextConsumer;
        exports.ContextProvider = ContextProvider;
        exports.Element = Element;
        exports.ForwardRef = ForwardRef;
        exports.Fragment = Fragment12;
        exports.Lazy = Lazy;
        exports.Memo = Memo;
        exports.Portal = Portal;
        exports.Profiler = Profiler;
        exports.StrictMode = StrictMode;
        exports.Suspense = Suspense2;
        exports.isAsyncMode = isAsyncMode;
        exports.isConcurrentMode = isConcurrentMode;
        exports.isContextConsumer = isContextConsumer;
        exports.isContextProvider = isContextProvider;
        exports.isElement = isElement;
        exports.isForwardRef = isForwardRef;
        exports.isFragment = isFragment;
        exports.isLazy = isLazy;
        exports.isMemo = isMemo;
        exports.isPortal = isPortal;
        exports.isProfiler = isProfiler;
        exports.isStrictMode = isStrictMode;
        exports.isSuspense = isSuspense;
        exports.isValidElementType = isValidElementType;
        exports.typeOf = typeOf;
      })();
    }
  }
});

// node_modules/prop-types/node_modules/react-is/index.js
var require_react_is = __commonJS({
  "node_modules/prop-types/node_modules/react-is/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_is_development();
    }
  }
});

// node_modules/object-assign/index.js
var require_object_assign = __commonJS({
  "node_modules/object-assign/index.js"(exports, module) {
    "use strict";
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;
    function toObject(val) {
      if (val === null || val === void 0) {
        throw new TypeError("Object.assign cannot be called with null or undefined");
      }
      return Object(val);
    }
    function shouldUseNative() {
      try {
        if (!Object.assign) {
          return false;
        }
        var test1 = new String("abc");
        test1[5] = "de";
        if (Object.getOwnPropertyNames(test1)[0] === "5") {
          return false;
        }
        var test2 = {};
        for (var i = 0; i < 10; i++) {
          test2["_" + String.fromCharCode(i)] = i;
        }
        var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
          return test2[n];
        });
        if (order2.join("") !== "0123456789") {
          return false;
        }
        var test3 = {};
        "abcdefghijklmnopqrst".split("").forEach(function(letter) {
          test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    module.exports = shouldUseNative() ? Object.assign : function(target, source) {
      var from;
      var to = toObject(target);
      var symbols;
      for (var s = 1; s < arguments.length; s++) {
        from = Object(arguments[s]);
        for (var key in from) {
          if (hasOwnProperty.call(from, key)) {
            to[key] = from[key];
          }
        }
        if (getOwnPropertySymbols) {
          symbols = getOwnPropertySymbols(from);
          for (var i = 0; i < symbols.length; i++) {
            if (propIsEnumerable.call(from, symbols[i])) {
              to[symbols[i]] = from[symbols[i]];
            }
          }
        }
      }
      return to;
    };
  }
});

// node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS({
  "node_modules/prop-types/lib/ReactPropTypesSecret.js"(exports, module) {
    "use strict";
    var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
    module.exports = ReactPropTypesSecret;
  }
});

// node_modules/prop-types/lib/has.js
var require_has = __commonJS({
  "node_modules/prop-types/lib/has.js"(exports, module) {
    module.exports = Function.call.bind(Object.prototype.hasOwnProperty);
  }
});

// node_modules/prop-types/checkPropTypes.js
var require_checkPropTypes = __commonJS({
  "node_modules/prop-types/checkPropTypes.js"(exports, module) {
    "use strict";
    var printWarning = function() {
    };
    if (true) {
      ReactPropTypesSecret = require_ReactPropTypesSecret();
      loggedTypeFailures = {};
      has = require_has();
      printWarning = function(text) {
        var message = "Warning: " + text;
        if (typeof console !== "undefined") {
          console.error(message);
        }
        try {
          throw new Error(message);
        } catch (x) {
        }
      };
    }
    var ReactPropTypesSecret;
    var loggedTypeFailures;
    var has;
    function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
      if (true) {
        for (var typeSpecName in typeSpecs) {
          if (has(typeSpecs, typeSpecName)) {
            var error;
            try {
              if (typeof typeSpecs[typeSpecName] !== "function") {
                var err = Error(
                  (componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`."
                );
                err.name = "Invariant Violation";
                throw err;
              }
              error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
            } catch (ex) {
              error = ex;
            }
            if (error && !(error instanceof Error)) {
              printWarning(
                (componentName || "React class") + ": type specification of " + location + " `" + typeSpecName + "` is invalid; the type checker function must return `null` or an `Error` but returned a " + typeof error + ". You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument)."
              );
            }
            if (error instanceof Error && !(error.message in loggedTypeFailures)) {
              loggedTypeFailures[error.message] = true;
              var stack = getStack ? getStack() : "";
              printWarning(
                "Failed " + location + " type: " + error.message + (stack != null ? stack : "")
              );
            }
          }
        }
      }
    }
    checkPropTypes.resetWarningCache = function() {
      if (true) {
        loggedTypeFailures = {};
      }
    };
    module.exports = checkPropTypes;
  }
});

// node_modules/prop-types/factoryWithTypeCheckers.js
var require_factoryWithTypeCheckers = __commonJS({
  "node_modules/prop-types/factoryWithTypeCheckers.js"(exports, module) {
    "use strict";
    var ReactIs = require_react_is();
    var assign = require_object_assign();
    var ReactPropTypesSecret = require_ReactPropTypesSecret();
    var has = require_has();
    var checkPropTypes = require_checkPropTypes();
    var printWarning = function() {
    };
    if (true) {
      printWarning = function(text) {
        var message = "Warning: " + text;
        if (typeof console !== "undefined") {
          console.error(message);
        }
        try {
          throw new Error(message);
        } catch (x) {
        }
      };
    }
    function emptyFunctionThatReturnsNull() {
      return null;
    }
    module.exports = function(isValidElement, throwOnDirectAccess) {
      var ITERATOR_SYMBOL = typeof Symbol === "function" && Symbol.iterator;
      var FAUX_ITERATOR_SYMBOL = "@@iterator";
      function getIteratorFn(maybeIterable) {
        var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
        if (typeof iteratorFn === "function") {
          return iteratorFn;
        }
      }
      var ANONYMOUS = "<<anonymous>>";
      var ReactPropTypes = {
        array: createPrimitiveTypeChecker("array"),
        bigint: createPrimitiveTypeChecker("bigint"),
        bool: createPrimitiveTypeChecker("boolean"),
        func: createPrimitiveTypeChecker("function"),
        number: createPrimitiveTypeChecker("number"),
        object: createPrimitiveTypeChecker("object"),
        string: createPrimitiveTypeChecker("string"),
        symbol: createPrimitiveTypeChecker("symbol"),
        any: createAnyTypeChecker(),
        arrayOf: createArrayOfTypeChecker,
        element: createElementTypeChecker(),
        elementType: createElementTypeTypeChecker(),
        instanceOf: createInstanceTypeChecker,
        node: createNodeChecker(),
        objectOf: createObjectOfTypeChecker,
        oneOf: createEnumTypeChecker,
        oneOfType: createUnionTypeChecker,
        shape: createShapeTypeChecker,
        exact: createStrictShapeTypeChecker
      };
      function is(x, y) {
        if (x === y) {
          return x !== 0 || 1 / x === 1 / y;
        } else {
          return x !== x && y !== y;
        }
      }
      function PropTypeError(message, data) {
        this.message = message;
        this.data = data && typeof data === "object" ? data : {};
        this.stack = "";
      }
      PropTypeError.prototype = Error.prototype;
      function createChainableTypeChecker(validate) {
        if (true) {
          var manualPropTypeCallCache = {};
          var manualPropTypeWarningCount = 0;
        }
        function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
          componentName = componentName || ANONYMOUS;
          propFullName = propFullName || propName;
          if (secret !== ReactPropTypesSecret) {
            if (throwOnDirectAccess) {
              var err = new Error(
                "Calling PropTypes validators directly is not supported by the `prop-types` package. Use `PropTypes.checkPropTypes()` to call them. Read more at http://fb.me/use-check-prop-types"
              );
              err.name = "Invariant Violation";
              throw err;
            } else if (typeof console !== "undefined") {
              var cacheKey = componentName + ":" + propName;
              if (!manualPropTypeCallCache[cacheKey] && // Avoid spamming the console because they are often not actionable except for lib authors
              manualPropTypeWarningCount < 3) {
                printWarning(
                  "You are manually calling a React.PropTypes validation function for the `" + propFullName + "` prop on `" + componentName + "`. This is deprecated and will throw in the standalone `prop-types` package. You may be seeing this warning due to a third-party PropTypes library. See https://fb.me/react-warning-dont-call-proptypes for details."
                );
                manualPropTypeCallCache[cacheKey] = true;
                manualPropTypeWarningCount++;
              }
            }
          }
          if (props[propName] == null) {
            if (isRequired) {
              if (props[propName] === null) {
                return new PropTypeError("The " + location + " `" + propFullName + "` is marked as required " + ("in `" + componentName + "`, but its value is `null`."));
              }
              return new PropTypeError("The " + location + " `" + propFullName + "` is marked as required in " + ("`" + componentName + "`, but its value is `undefined`."));
            }
            return null;
          } else {
            return validate(props, propName, componentName, location, propFullName);
          }
        }
        var chainedCheckType = checkType.bind(null, false);
        chainedCheckType.isRequired = checkType.bind(null, true);
        return chainedCheckType;
      }
      function createPrimitiveTypeChecker(expectedType) {
        function validate(props, propName, componentName, location, propFullName, secret) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== expectedType) {
            var preciseType = getPreciseType(propValue);
            return new PropTypeError(
              "Invalid " + location + " `" + propFullName + "` of type " + ("`" + preciseType + "` supplied to `" + componentName + "`, expected ") + ("`" + expectedType + "`."),
              { expectedType }
            );
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createAnyTypeChecker() {
        return createChainableTypeChecker(emptyFunctionThatReturnsNull);
      }
      function createArrayOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== "function") {
            return new PropTypeError("Property `" + propFullName + "` of component `" + componentName + "` has invalid PropType notation inside arrayOf.");
          }
          var propValue = props[propName];
          if (!Array.isArray(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected an array."));
          }
          for (var i = 0; i < propValue.length; i++) {
            var error = typeChecker(propValue, i, componentName, location, propFullName + "[" + i + "]", ReactPropTypesSecret);
            if (error instanceof Error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createElementTypeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          if (!isValidElement(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected a single ReactElement."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createElementTypeTypeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          if (!ReactIs.isValidElementType(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected a single ReactElement type."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createInstanceTypeChecker(expectedClass) {
        function validate(props, propName, componentName, location, propFullName) {
          if (!(props[propName] instanceof expectedClass)) {
            var expectedClassName = expectedClass.name || ANONYMOUS;
            var actualClassName = getClassName(props[propName]);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + actualClassName + "` supplied to `" + componentName + "`, expected ") + ("instance of `" + expectedClassName + "`."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createEnumTypeChecker(expectedValues) {
        if (!Array.isArray(expectedValues)) {
          if (true) {
            if (arguments.length > 1) {
              printWarning(
                "Invalid arguments supplied to oneOf, expected an array, got " + arguments.length + " arguments. A common mistake is to write oneOf(x, y, z) instead of oneOf([x, y, z])."
              );
            } else {
              printWarning("Invalid argument supplied to oneOf, expected an array.");
            }
          }
          return emptyFunctionThatReturnsNull;
        }
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          for (var i = 0; i < expectedValues.length; i++) {
            if (is(propValue, expectedValues[i])) {
              return null;
            }
          }
          var valuesString = JSON.stringify(expectedValues, function replacer(key, value) {
            var type = getPreciseType(value);
            if (type === "symbol") {
              return String(value);
            }
            return value;
          });
          return new PropTypeError("Invalid " + location + " `" + propFullName + "` of value `" + String(propValue) + "` " + ("supplied to `" + componentName + "`, expected one of " + valuesString + "."));
        }
        return createChainableTypeChecker(validate);
      }
      function createObjectOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== "function") {
            return new PropTypeError("Property `" + propFullName + "` of component `" + componentName + "` has invalid PropType notation inside objectOf.");
          }
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected an object."));
          }
          for (var key in propValue) {
            if (has(propValue, key)) {
              var error = typeChecker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
              if (error instanceof Error) {
                return error;
              }
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createUnionTypeChecker(arrayOfTypeCheckers) {
        if (!Array.isArray(arrayOfTypeCheckers)) {
          true ? printWarning("Invalid argument supplied to oneOfType, expected an instance of array.") : void 0;
          return emptyFunctionThatReturnsNull;
        }
        for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
          var checker = arrayOfTypeCheckers[i];
          if (typeof checker !== "function") {
            printWarning(
              "Invalid argument supplied to oneOfType. Expected an array of check functions, but received " + getPostfixForTypeWarning(checker) + " at index " + i + "."
            );
            return emptyFunctionThatReturnsNull;
          }
        }
        function validate(props, propName, componentName, location, propFullName) {
          var expectedTypes = [];
          for (var i2 = 0; i2 < arrayOfTypeCheckers.length; i2++) {
            var checker2 = arrayOfTypeCheckers[i2];
            var checkerResult = checker2(props, propName, componentName, location, propFullName, ReactPropTypesSecret);
            if (checkerResult == null) {
              return null;
            }
            if (checkerResult.data && has(checkerResult.data, "expectedType")) {
              expectedTypes.push(checkerResult.data.expectedType);
            }
          }
          var expectedTypesMessage = expectedTypes.length > 0 ? ", expected one of type [" + expectedTypes.join(", ") + "]" : "";
          return new PropTypeError("Invalid " + location + " `" + propFullName + "` supplied to " + ("`" + componentName + "`" + expectedTypesMessage + "."));
        }
        return createChainableTypeChecker(validate);
      }
      function createNodeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          if (!isNode(props[propName])) {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` supplied to " + ("`" + componentName + "`, expected a ReactNode."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function invalidValidatorError(componentName, location, propFullName, key, type) {
        return new PropTypeError(
          (componentName || "React class") + ": " + location + " type `" + propFullName + "." + key + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + type + "`."
        );
      }
      function createShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type `" + propType + "` " + ("supplied to `" + componentName + "`, expected `object`."));
          }
          for (var key in shapeTypes) {
            var checker = shapeTypes[key];
            if (typeof checker !== "function") {
              return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
            }
            var error = checker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
            if (error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createStrictShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type `" + propType + "` " + ("supplied to `" + componentName + "`, expected `object`."));
          }
          var allKeys = assign({}, props[propName], shapeTypes);
          for (var key in allKeys) {
            var checker = shapeTypes[key];
            if (has(shapeTypes, key) && typeof checker !== "function") {
              return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
            }
            if (!checker) {
              return new PropTypeError(
                "Invalid " + location + " `" + propFullName + "` key `" + key + "` supplied to `" + componentName + "`.\nBad object: " + JSON.stringify(props[propName], null, "  ") + "\nValid keys: " + JSON.stringify(Object.keys(shapeTypes), null, "  ")
              );
            }
            var error = checker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
            if (error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function isNode(propValue) {
        switch (typeof propValue) {
          case "number":
          case "string":
          case "undefined":
            return true;
          case "boolean":
            return !propValue;
          case "object":
            if (Array.isArray(propValue)) {
              return propValue.every(isNode);
            }
            if (propValue === null || isValidElement(propValue)) {
              return true;
            }
            var iteratorFn = getIteratorFn(propValue);
            if (iteratorFn) {
              var iterator = iteratorFn.call(propValue);
              var step;
              if (iteratorFn !== propValue.entries) {
                while (!(step = iterator.next()).done) {
                  if (!isNode(step.value)) {
                    return false;
                  }
                }
              } else {
                while (!(step = iterator.next()).done) {
                  var entry = step.value;
                  if (entry) {
                    if (!isNode(entry[1])) {
                      return false;
                    }
                  }
                }
              }
            } else {
              return false;
            }
            return true;
          default:
            return false;
        }
      }
      function isSymbol(propType, propValue) {
        if (propType === "symbol") {
          return true;
        }
        if (!propValue) {
          return false;
        }
        if (propValue["@@toStringTag"] === "Symbol") {
          return true;
        }
        if (typeof Symbol === "function" && propValue instanceof Symbol) {
          return true;
        }
        return false;
      }
      function getPropType(propValue) {
        var propType = typeof propValue;
        if (Array.isArray(propValue)) {
          return "array";
        }
        if (propValue instanceof RegExp) {
          return "object";
        }
        if (isSymbol(propType, propValue)) {
          return "symbol";
        }
        return propType;
      }
      function getPreciseType(propValue) {
        if (typeof propValue === "undefined" || propValue === null) {
          return "" + propValue;
        }
        var propType = getPropType(propValue);
        if (propType === "object") {
          if (propValue instanceof Date) {
            return "date";
          } else if (propValue instanceof RegExp) {
            return "regexp";
          }
        }
        return propType;
      }
      function getPostfixForTypeWarning(value) {
        var type = getPreciseType(value);
        switch (type) {
          case "array":
          case "object":
            return "an " + type;
          case "boolean":
          case "date":
          case "regexp":
            return "a " + type;
          default:
            return type;
        }
      }
      function getClassName(propValue) {
        if (!propValue.constructor || !propValue.constructor.name) {
          return ANONYMOUS;
        }
        return propValue.constructor.name;
      }
      ReactPropTypes.checkPropTypes = checkPropTypes;
      ReactPropTypes.resetWarningCache = checkPropTypes.resetWarningCache;
      ReactPropTypes.PropTypes = ReactPropTypes;
      return ReactPropTypes;
    };
  }
});

// node_modules/prop-types/index.js
var require_prop_types = __commonJS({
  "node_modules/prop-types/index.js"(exports, module) {
    if (true) {
      ReactIs = require_react_is();
      throwOnDirectAccess = true;
      module.exports = require_factoryWithTypeCheckers()(ReactIs.isElement, throwOnDirectAccess);
    } else {
      module.exports = null();
    }
    var ReactIs;
    var throwOnDirectAccess;
  }
});

// packages/chat/dialog/useCurrentDialogConfig.ts
function useCurrentDialogConfig() {
  const key = useCurrentDialogKey();
  return useAppSelector(
    (state) => key ? selectById(state, key) : null
  );
}

// packages/chat/dialog/dialogPageRenderMode.ts
var BASE_APP_TITLE = "Nolo";
var STREAMING_TITLE_PREFIX = "\u25CF";
var getQuickChatFirstMessageText = (routeState) => {
  const text = routeState?.quickChatFirstMessage?.text;
  return asTrimmedString(text);
};
var shouldRenderQuickChatNewDialogShell = ({
  isNew,
  dialogId,
  hasPersistedDialogConfig,
  quickChatFirstMessageText
}) => !!isNew && !!dialogId && (!!quickChatFirstMessageText || !!hasPersistedDialogConfig);
var resolveDialogPageLoadState = ({
  dialogId,
  pageKey,
  isLoggedIn,
  isDeviceLocalDialog = false,
  hasStartedDialogLoadForCurrentRoute,
  hasFinishedDialogLoadForCurrentRoute,
  error,
  currentDialogKey,
  currentDialogConfig
}) => {
  const configStillMissing = !currentDialogKey && !currentDialogConfig || currentDialogKey === pageKey && !currentDialogConfig;
  const bootstrapStillRunning = !hasStartedDialogLoadForCurrentRoute || !hasFinishedDialogLoadForCurrentRoute;
  const mayBootstrap = isLoggedIn || isDeviceLocalDialog;
  return {
    isBootstrappingSelectedDialog: !!dialogId && !!pageKey && mayBootstrap && !hasStartedDialogLoadForCurrentRoute,
    isResolvingSelectedDialog: !!dialogId && !!pageKey && !error && configStillMissing && bootstrapStillRunning
  };
};
var getDialogPageRenderMode = ({
  currentDialogConfig,
  dialogId,
  error,
  hasMounted,
  isBootstrappingSelectedDialog,
  /**
   * @deprecated OPT-FE-09: initial message load no longer blocks chat-area /
   * time-to-first-input. Kept optional for call-site compatibility; ignored.
   */
  isLoadingInitial: _isLoadingInitial,
  isLoggedIn,
  isDeviceLocalDialog = false,
  isResolvingSelectedDialog,
  canRenderNewDialogShell
}) => {
  if (!hasMounted && dialogId) {
    return "hydration-loading";
  }
  if (!isLoggedIn && !isDeviceLocalDialog) return "guest-guide";
  if (!canRenderNewDialogShell && (isBootstrappingSelectedDialog || isResolvingSelectedDialog)) {
    return "loading";
  }
  if (error && currentDialogConfig && dialogId) return "inline-error";
  if (error) return "error-view";
  if (currentDialogConfig && dialogId) return "chat-area";
  if (canRenderNewDialogShell) return "chat-area";
  if (!isLoggedIn && isDeviceLocalDialog && dialogId) return "loading";
  return "empty";
};
var getDialogPageTitle = ({
  dialogTitle,
  hasStreamingMessage
}) => {
  const trimmedDialogTitle = dialogTitle?.trim();
  const baseTitle = trimmedDialogTitle || BASE_APP_TITLE;
  return hasStreamingMessage ? `${STREAMING_TITLE_PREFIX} ${baseTitle}` : baseTitle;
};
var resolveDialogNotificationState = ({
  lastAssistantMessageId,
  hasNotificationApi,
  permission,
  isDocumentVisible,
  lastNotifiedMessageId,
  dialogTitle
}) => {
  if (!lastAssistantMessageId) {
    return { shouldNotify: false, reason: "missing-message" };
  }
  if (!hasNotificationApi) {
    return { shouldNotify: false, reason: "api-unavailable" };
  }
  if (permission !== "granted") {
    return { shouldNotify: false, reason: "permission-denied" };
  }
  if (isDocumentVisible) {
    return { shouldNotify: false, reason: "document-visible" };
  }
  if (lastNotifiedMessageId === lastAssistantMessageId) {
    return { shouldNotify: false, reason: "already-notified" };
  }
  return {
    shouldNotify: true,
    reason: "ready",
    title: asOptionalTrimmedString(dialogTitle) ?? (BASE_APP_TITLE || "\u65B0\u56DE\u590D")
  };
};
var resolveInheritedContextBanner = ({
  inheritedFromDialogKey,
  inheritedFromDialogTitle
}) => {
  if (!inheritedFromDialogKey) return null;
  const trimmedTitle = inheritedFromDialogTitle?.trim();
  if (trimmedTitle) {
    return {
      sourceDialogKey: inheritedFromDialogKey,
      translationKey: "inheritedContextNoticeWithTitle",
      fallback: "\u6B64\u5BF9\u8BDD\u7EE7\u627F\u81EA\u201C{{title}}\u201D\u7684\u4E0A\u4E0B\u6587",
      params: { title: trimmedTitle }
    };
  }
  return {
    sourceDialogKey: inheritedFromDialogKey,
    translationKey: "inheritedContextNotice",
    fallback: "\u6B64\u5BF9\u8BDD\u7EE7\u627F\u81EA\u4E0A\u4E00\u6BB5\u5BF9\u8BDD\u7684\u4E0A\u4E0B\u6587",
    params: void 0
  };
};

// packages/chat/web/stagedDialogFiles.ts
var stagedFilesByDialog = /* @__PURE__ */ new Map();
function stageFilesForDialog(dialogKey, files) {
  if (!dialogKey || files.length === 0) return;
  const existing = stagedFilesByDialog.get(dialogKey);
  stagedFilesByDialog.set(
    dialogKey,
    existing ? [...existing, ...files] : [...files]
  );
}
function takeStagedFilesForDialog(dialogKey) {
  const files = stagedFilesByDialog.get(dialogKey);
  if (!files?.length) return [];
  stagedFilesByDialog.delete(dialogKey);
  return files;
}

// packages/chat/web/ChatArea.tsx
var import_react32 = __toESM(require_react());

// packages/chat/messages/web/MessageList.tsx
var import_react13 = __toESM(require_react());
var import_prop_types = __toESM(require_prop_types());

// packages/chat/messages/web/MessageItem.tsx
var import_react5 = __toESM(require_react());

// packages/chat/messages/web/MessageActions.tsx
var import_react2 = __toESM(require_react());

// packages/chat/dialog/actions/compactDialogAndForkAction.ts
var runCompactDialogAndForkAction = async (args, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const dialogKey = args.dialogKey;
  const dialogId = extractCustomId(dialogKey);
  const dialogConfig = selectById(state, dialogKey);
  const preFetchedMessages = state.message.dialogStateById[dialogId]?.msgs?.ids?.flatMap(
    (id) => {
      const msg = state.message.dialogStateById[dialogId]?.msgs?.entities?.[id];
      return msg ? [msg] : [];
    }
  ) ?? [];
  const nextAgentKey = dialogConfig?.cybots?.[0];
  if (!nextAgentKey) {
    throw new Error("Cannot compact a dialog without a primary agent.");
  }
  await updateDialogSummaryAction(
    { dialogKey, preFetchedMessages, force: true, reason: "manual" },
    thunkApi
  );
  return dispatch(
    createDialog({
      cybots: [nextAgentKey],
      category: dialogConfig?.category,
      spaceId: dialogConfig?.spaceId,
      inheritFromDialogKey: dialogKey,
      skipGreeting: true
    })
  ).unwrap();
};
var compactDialogAndForkAction = createAsyncThunk(
  "dialog/compactDialogAndFork",
  runCompactDialogAndForkAction
);

// packages/chat/messages/hooks/useMessageDelete.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
function useMessageDelete({
  dbKey,
  confirmMessageKey,
  t: tOverride
}) {
  const dispatch = useAppDispatch();
  const defaultT = useTranslation("chat").t;
  const t = tOverride ?? defaultT;
  const [showConfirm, setShowConfirm] = (0, import_react.useState)(false);
  const openConfirm = (0, import_react.useCallback)(
    (e) => {
      e?.stopPropagation?.();
      if (!dbKey) {
        toast.error(t("deleteFailed", "\u5220\u9664\u5931\u8D25"));
        return;
      }
      setShowConfirm(true);
    },
    [dbKey, t]
  );
  const confirmDelete = (0, import_react.useCallback)(() => {
    if (!dbKey) {
      toast.error(t("deleteFailed", "\u5220\u9664\u5931\u8D25"));
      setShowConfirm(false);
      return;
    }
    dispatch(deleteMessage(dbKey));
    toast.success(t("deleteSuccess", "\u5DF2\u5220\u9664"));
    setShowConfirm(false);
  }, [dbKey, dispatch, t]);
  const closeConfirm = (0, import_react.useCallback)(() => {
    setShowConfirm(false);
  }, []);
  const modal = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ConfirmModal,
    {
      isOpen: showConfirm,
      onClose: closeConfirm,
      onConfirm: confirmDelete,
      title: t("deleteMessageTitle", "\u5220\u9664\u6D88\u606F"),
      message: t(confirmMessageKey, "\u5220\u9664\u6B64\u6D88\u606F\uFF1F"),
      confirmText: t("confirm", "\u786E\u8BA4"),
      cancelText: t("cancel", "\u53D6\u6D88"),
      type: "warning"
    }
  );
  return {
    openConfirm,
    confirmDelete,
    closeConfirm,
    modal,
    canDelete: Boolean(dbKey)
  };
}

// packages/chat/messages/web/MessageActions.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var SAVE_TITLE_TIMEOUT_MS = 1500;
var isTextPart = (item) => {
  if (!item || typeof item !== "object" || !("type" in item) || !("text" in item)) {
    return false;
  }
  return item.type === "text" && typeof item.text === "string";
};
var serializePart = (item) => {
  if (item.type === "text" && typeof item.text === "string") return item.text;
  if (item.type === "image_url" && typeof item.image_url?.url === "string") {
    return `[Image: ${item.image_url.url}]`;
  }
  if (typeof item.pageKey === "string") {
    return `[File: ${item.name || "\u672A\u77E5\u6587\u4EF6"}]`;
  }
  return "";
};
var getContentString = (content, thinkContent = "", showThinking = false, t) => {
  const baseContent = typeof content === "string" ? content : Array.isArray(content) ? content.map(serializePart).join("\n") : content == null ? "" : JSON.stringify(content);
  return showThinking && thinkContent ? `**${t("thinkingContent")}**:
${thinkContent}

**${t("answerContent")}**:
${baseContent}` : baseContent;
};
var getPlainText = (content) => {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => isTextPart(item) ? item.text : "").filter(Boolean).join("\n").trim();
  }
  return "";
};
var MessageActions = ({
  message,
  isRobot,
  isSelf,
  isStreaming = false,
  canBranch = false,
  showActions,
  showThinking = false,
  isTouch = false,
  onDismissActions
}) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  const currentDialogKey = useCurrentDialogKey();
  const { content, thinkContent, dbKey } = message || {};
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const [copied, setCopied] = import_react2.default.useState(false);
  const [isSaving, setIsSaving] = import_react2.default.useState(false);
  const [isBranching, setIsBranching] = import_react2.default.useState(false);
  const isSavingRef = import_react2.default.useRef(false);
  const isBranchingRef = import_react2.default.useRef(false);
  const handleCopy = (e) => {
    e?.stopPropagation?.();
    const text = content ? getContentString(content, thinkContent, showThinking, t) : "";
    if (!text) return toast.error(t("copyFailed"));
    clipboard_default(text, {
      onSuccess: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
        toast.success(t("copySuccess"));
      },
      onError: () => toast.error(t("copyFailed"))
    });
  };
  const handleSave = async (e) => {
    e?.stopPropagation?.();
    if (isSavingRef.current) return;
    if (!user?.userId) return toast.error(t("userNotAuthenticated"));
    const str = content ? getContentString(content, thinkContent, showThinking, t) : "";
    if (!str) return toast.error(t("contentIsEmpty"));
    isSavingRef.current = true;
    setIsSaving(true);
    let title;
    try {
      title = await Promise.race([
        dispatch(
          runLlm({
            llmConfig: BUILTIN_TITLE_LLM_CONFIG,
            content: str.substring(0, 8e3)
          })
        ).unwrap(),
        new Promise(
          (resolve) => setTimeout(() => resolve(void 0), SAVE_TITLE_TIMEOUT_MS)
        )
      ]) || void 0;
    } catch {
    }
    try {
      const savedKey = await createDocState(
        {
          title,
          content: str,
          ...currentSpaceId ? { spaceId: currentSpaceId } : {}
        },
        { dispatch, getState: store.getState }
      );
      toast.success(
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          t("saveSuccess"),
          savedKey && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            Link,
            {
              to: `/${savedKey}`,
              target: "_blank",
              style: { marginLeft: "8px", color: "var(--primary)" },
              children: t("clickHere")
            }
          )
        ] })
      );
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };
  const handleEdit = (e) => {
    e?.stopPropagation?.();
    const seed = getPlainText(content);
    if (!seed) {
      toast.error(t("editEmptyContent", "\u6D88\u606F\u6CA1\u6709\u53EF\u7F16\u8F91\u7684\u6587\u672C"));
      return;
    }
    publishChatInputSeed({
      text: seed,
      mode: "replace",
      focus: true,
      editMessageId: message?.id,
      originalContent: content
    });
    toast.success(t("editSeeded", "\u5DF2\u8FDB\u5165\u7F16\u8F91\u6A21\u5F0F"), { duration: 2e3 });
  };
  const { openConfirm: handleDeleteClick, modal: deleteConfirmModal } = useMessageDelete({ dbKey, confirmMessageKey: "delConfirmMessage", t });
  const handleBranch = import_react2.default.useCallback(
    async (e) => {
      e?.stopPropagation?.();
      if (isBranchingRef.current) return;
      if (!currentDialogKey) {
        toast.error(t("branchFailed", "\u5F53\u524D\u5BF9\u8BDD\u4E0D\u53EF\u5206\u53C9"));
        return;
      }
      isBranchingRef.current = true;
      setIsBranching(true);
      try {
        const result = await dispatch(
          compactDialogAndForkAction({ dialogKey: currentDialogKey })
        ).unwrap();
        navigate(buildDialogUrl(result.dbKey, result.spaceId), {
          state: { isNew: true }
        });
        toast.success(t("branchCreated", "\u5DF2\u521B\u5EFA\u5206\u652F\u5BF9\u8BDD"));
      } catch (error) {
        console.error("[MessageActions] branch failed:", error);
        toast.error(t("branchFailed", "\u521B\u5EFA\u5206\u652F\u5931\u8D25"));
      } finally {
        isBranchingRef.current = false;
        setIsBranching(false);
      }
    },
    [currentDialogKey, dispatch, navigate, t]
  );
  const actions = [
    {
      key: "copy",
      icon: copied ? LuCheck : LuCopy,
      handler: handleCopy,
      label: t("copyContent"),
      active: copied
    },
    !isSelf && !isStreaming ? {
      key: "save",
      icon: LuBookmark,
      handler: handleSave,
      label: isSaving ? t("savingContent", "\u4FDD\u5B58\u4E2D\u2026") : t("saveContent"),
      disabled: isSaving,
      busy: isSaving,
      active: isSaving
    } : null,
    canBranch && isRobot && !isStreaming ? {
      key: "branch",
      icon: LuGitBranch,
      handler: handleBranch,
      label: isBranching ? t("branchingMessage", "\u5206\u53C9\u4E2D\u2026") : t("branchMessage", "Branch"),
      disabled: isBranching,
      busy: isBranching,
      active: isBranching
    } : null,
    isSelf ? {
      key: "edit",
      icon: LuPencilLine,
      handler: handleEdit,
      label: t("editMessage", "\u7F16\u8F91\u6D88\u606F")
    } : null,
    !isStreaming && dbKey ? {
      key: "delete",
      icon: LuTrash2,
      handler: handleDeleteClick,
      label: t("deleteMessage", "\u5220\u9664\u6D88\u606F")
    } : null
  ].filter((a) => Boolean(a));
  if (!isTouch) {
    if (actions.length === 0) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "div",
        {
          className: `actions desktop ${showActions ? "show" : ""}`,
          "data-message-actions": "desktop",
          children: actions.map(
            ({ key, icon: Icon, handler, label, active, disabled, busy }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Tooltip, { content: label, placement: "top", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: `action-btn ${active ? "active" : ""} ${busy ? "busy" : ""}`,
                onClick: handler,
                "aria-label": label,
                "aria-busy": busy || void 0,
                disabled: disabled || void 0,
                children: busy ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "action-spinner", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon, { size: 14 })
              }
            ) }, key)
          )
        }
      ),
      deleteConfirmModal
    ] });
  }
  if (!showActions) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "actions-overlay mobile", "data-message-actions": "mobile", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "overlay-backdrop",
          "aria-label": t("closeActions", "\u5173\u95ED\u64CD\u4F5C"),
          onClick: (e) => {
            e.stopPropagation();
            onDismissActions?.();
          },
          style: {
            margin: 0,
            padding: 0,
            border: "none",
            cursor: "pointer",
            font: "inherit"
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "dialog",
        {
          className: "actions-panel",
          open: true,
          "aria-label": t("messageActions", "\u6D88\u606F\u64CD\u4F5C"),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "panel-header", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "panel-indicator" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "actions-grid", children: actions.map(
              ({ key, icon: Icon, handler, label, active, disabled, busy }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: `action-item ${active ? "active" : ""} ${busy ? "busy" : ""}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    handler(e);
                  },
                  "aria-label": label,
                  "aria-busy": busy || void 0,
                  disabled: disabled || void 0,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "action-icon", children: busy ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "action-spinner", "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon, { size: 20 }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "action-label", children: label })
                  ]
                },
                key
              )
            ) })
          ]
        }
      )
    ] }),
    deleteConfirmModal
  ] });
};

// packages/chat/messages/web/MessageToolConfirmBar.tsx
var import_react3 = __toESM(require_react());

// packages/chat/toolConfirmPolicy.ts
var COMPOSER_DELETE_CONFIRM_TOOL_NAMES = [
  "deleteDialogs",
  "deleteSpaces"
];
var DELETE_CONFIRM_CONFIG = {
  deleteDialogs: {
    confirmedInputKey: "confirmedDialogIds",
    idKey: "dialogId",
    labelKeys: ["title"],
    fallbackLabel: "toolConfirm.fallbackDialogs",
    failureLabel: "toolConfirm.failureDialogs",
    executedSummary: "toolConfirm.executedDialogs",
    entityLabel: "toolConfirm.entityDialog"
  },
  deleteSpaces: {
    confirmedInputKey: "confirmedSpaceIds",
    idKey: "spaceId",
    labelKeys: ["name", "title"],
    fallbackLabel: "toolConfirm.fallbackSpaces",
    failureLabel: "toolConfirm.failureSpaces",
    executedSummary: "toolConfirm.executedSpaces",
    entityLabel: "toolConfirm.entitySpace"
  }
};
var getDeleteConfirmConfig = (toolName) => toolName && toolName in DELETE_CONFIRM_CONFIG ? DELETE_CONFIRM_CONFIG[toolName] : void 0;
var isComposerDeleteConfirmToolName = (toolName) => typeof toolName === "string" && COMPOSER_DELETE_CONFIRM_TOOL_NAMES.includes(toolName);
var shouldShowToolMessageConfirmBanner = (toolName, activeRun) => !!activeRun && activeRun.interaction === "confirm" && !isComposerDeleteConfirmToolName(toolName) && (activeRun.status === "pending" || activeRun.status === "running" || activeRun.status === "failed");
var buildConfirmActionGate = (toolName, activeRun) => {
  if (!activeRun || activeRun.interaction !== "confirm") return null;
  const name = asOptionalTrimmedString(toolName) ?? asOptionalTrimmedString(activeRun.toolName) ?? "tool";
  const deleteConfig = getDeleteConfirmConfig(name);
  return {
    id: activeRun.id || `gate-${name}-confirm`,
    kind: "confirm",
    title: deleteConfig ? "toolConfirm.confirmDelete" : "toolConfirm.confirmExecGate",
    titleParams: deleteConfig ? { entity: deleteConfig.entityLabel } : { name },
    ...activeRun.outputSummary ? { body: activeRun.outputSummary } : {},
    payload: {
      toolName: name,
      input: activeRun.input
    }
  };
};
var parseDeleteConfirmPreview = (content) => asOptionalJsonRecord(content) ?? null;
var translateGateTitle = (t, gate) => {
  const params = gate.titleParams ? { ...gate.titleParams } : void 0;
  if (params && typeof params.entity === "string") {
    params.entity = t(String(params.entity));
  }
  return t(gate.title, params);
};
var resolveDeleteConfirmLabel = ({
  config,
  preview,
  fallback,
  translateMultiple
}) => {
  const deletable = Array.isArray(preview?.deletable) ? preview.deletable : [];
  const firstItem = deletable[0];
  const firstTitle = asTrimmedNonEmptyStringArray(
    config?.labelKeys?.map((key) => firstItem?.[key])
  )[0];
  if (!firstTitle || !config) return fallback;
  if (deletable.length <= 1) return firstTitle;
  return translateMultiple({
    title: firstTitle,
    count: deletable.length,
    entity: config.entityLabel
  });
};
var collectDeleteConfirmIds = ({
  config,
  preview
}) => Array.isArray(preview?.deletable) ? asTrimmedNonEmptyStringArray(
  preview.deletable.map((item) => item?.[config.idKey])
) : [];

// packages/chat/messages/web/MessageToolConfirmBar.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var MessageToolConfirmBar = ({
  messageId,
  isRobot
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const EMPTY_TOOL_RUNS = (0, import_react3.useMemo)(() => [], []);
  const liveToolRuns = useToolRunsByMessageId(messageId ?? "");
  const toolRuns = messageId ? liveToolRuns : EMPTY_TOOL_RUNS;
  const confirmRun = (0, import_react3.useMemo)(
    () => toolRuns.find(
      (run) => shouldShowToolMessageConfirmBanner(run.toolName, run)
    ),
    [toolRuns]
  );
  const handleConfirmExecute = (0, import_react3.useCallback)(() => {
    if (!confirmRun) return;
    if (confirmRun.status === "running") return;
    dispatch(executeToolRun({ id: confirmRun.id }));
  }, [dispatch, confirmRun]);
  if (!isRobot || !confirmRun) return null;
  const { status, toolName, error, input } = confirmRun;
  const actionGate = buildConfirmActionGate(toolName, confirmRun);
  let buttonLabel = "";
  let buttonDisabled = false;
  if (status === "running") {
    buttonLabel = t("toolConfirm.executing");
    buttonDisabled = true;
  } else if (status === "succeeded") {
    if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.patchApplied");
    } else {
      buttonLabel = t("toolConfirm.executed", { name: toolName });
    }
    buttonDisabled = true;
  } else if (status === "failed") {
    if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.retryApplyPatch");
    } else {
      buttonLabel = t("toolConfirm.retryExec", { name: toolName });
    }
  } else {
    if (toolName === "deleteSpaces") {
      buttonLabel = t("toolConfirm.confirmDeleteSpaces");
    } else if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.applyPatchDanger");
    } else if (actionGate) {
      buttonLabel = translateGateTitle(t, actionGate);
    } else {
      buttonLabel = t("toolConfirm.confirmExec", { name: toolName });
    }
  }
  let statusText = null;
  let statusClass = null;
  if (status === "succeeded") {
    if (toolName === "applyDiff") {
      const filePath = input?.filePath || "";
      statusText = filePath ? t("toolConfirm.successPatch", { path: filePath }) : t("toolConfirm.successExec", { name: "applyDiff" });
    } else {
      statusText = t("toolConfirm.successExec", { name: toolName });
    }
    statusClass = "success";
  } else if (status === "failed") {
    statusText = t("toolConfirm.failure", {
      error: error || t("toolConfirm.unknownError")
    });
    statusClass = "failed";
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "tool-confirm-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "button",
        className: "tool-confirm-button",
        onClick: handleConfirmExecute,
        disabled: buttonDisabled,
        children: buttonLabel
      }
    ),
    statusText && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: `tool-confirm-status ${statusClass === "success" ? "success" : "failed"}`,
        children: statusText
      }
    )
  ] }) });
};

// packages/chat/messages/hooks/useBase64Migration.ts
var import_react4 = __toESM(require_react());
function getBase64ContentKey(content) {
  if (!Array.isArray(content)) return "";
  let key = "";
  for (let index = 0; index < content.length; index++) {
    const part = content[index];
    const url = part?.image_url?.url;
    if (part?.type === "image_url" && typeof url === "string" && url.startsWith("data:")) {
      key += `${index}:${url.length}|`;
    }
  }
  return key;
}
function useBase64Migration(message) {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  const lastProcessedKeyRef = (0, import_react4.useRef)(null);
  const contentRef = (0, import_react4.useRef)(message?.content);
  (0, import_react4.useEffect)(() => {
    contentRef.current = message?.content;
  }, [message?.content]);
  const messageId = message?.id;
  const messageDbKey = message?.dbKey;
  const base64ContentKey = (0, import_react4.useMemo)(
    () => getBase64ContentKey(message?.content),
    [message?.content]
  );
  (0, import_react4.useEffect)(() => {
    if (!messageId || !messageDbKey || !currentServer) return;
    const processKey = `${messageId}::${base64ContentKey}`;
    if (lastProcessedKeyRef.current === processKey) return;
    const rawContent = contentRef.current;
    if (!Array.isArray(rawContent) || !base64ContentKey) {
      lastProcessedKeyRef.current = processKey;
      return;
    }
    const base64Items = rawContent.reduce(
      (acc, part, index) => {
        const url = part?.image_url?.url;
        if (part?.type === "image_url" && typeof url === "string" && url.startsWith("data:")) {
          acc.push({ index, dataUrl: url });
        }
        return acc;
      },
      []
    );
    if (!base64Items.length) {
      lastProcessedKeyRef.current = processKey;
      return;
    }
    let cancelled = false;
    const migrate = async () => {
      let currentContent = rawContent;
      for (const { index, dataUrl } of base64Items) {
        if (cancelled) break;
        const file = dataURLtoFile(
          dataUrl,
          `msg-img-${messageId}-${index}.png`
        );
        if (!file) continue;
        try {
          const metadata = await dispatch(
            upload({
              file,
              customKey: `msg-img-${messageId}-${index}`
            })
          ).unwrap();
          const fileId = metadata?.id;
          if (!fileId) continue;
          const remoteUrl = buildMessageFileContentUrl(currentServer, fileId);
          if (!remoteUrl) continue;
          const newContent = currentContent.map(
            (p, i) => i === index ? stripDurableImageInlinePayload({
              ...p,
              image_url: {
                ...p.image_url || {},
                url: remoteUrl
              }
            }) : p
          );
          await dispatch(
            patch({
              dbKey: messageDbKey,
              changes: { content: newContent }
            })
          ).unwrap();
          currentContent = newContent;
        } catch {
        }
      }
      if (!cancelled) {
        lastProcessedKeyRef.current = processKey;
      }
    };
    void migrate();
    return () => {
      cancelled = true;
    };
  }, [messageId, messageDbKey, base64ContentKey, currentServer, dispatch]);
}

// packages/chat/messages/web/MessageItem.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
function areMessageItemPropsEqual(prev, next) {
  return prev.readOnly === next.readOnly && prev.canBranch === next.canBranch && prev.enableActions === next.enableActions && prev.message === next.message;
}
var MessageItem = (0, import_react5.memo)(
  ({
    message,
    readOnly = false,
    canBranch: canBranchProp,
    enableActions = true
  }) => {
    const currentUserId = useUserId();
    const currentServer = useAppSelector(selectRuntimeCurrentServer);
    const {
      content,
      thinkContent,
      imageGenerationState,
      userId,
      role,
      isStreaming = false
    } = message || {};
    const messageAgentKey = resolveMessageAgentKey(message);
    const isSelf = role === "user" && (currentUserId === userId || !messageAgentKey);
    const isRobot = role !== "user";
    const type = isSelf ? "self" : "robot";
    const lastAssistantMessageId = useAppSelector((state) => {
      if (canBranchProp !== void 0) return null;
      return selectLastAssistantMessage(state)?.id ?? null;
    });
    const isLatestAssistantMessage = canBranchProp !== void 0 ? canBranchProp : isRobot && lastAssistantMessageId === message?.id;
    const { data: robotData } = useFetchData(isRobot ? messageAgentKey : null);
    const [agentDialogOpen, setAgentDialogOpen] = (0, import_react5.useState)(false);
    const canEditAgent = useCouldEdit(messageAgentKey || "");
    const isCliAgent = robotData?.apiSource === "cli";
    const displayName = isRobot ? message.agentName || robotData?.name || "AI Assistant" : "User";
    const avatarSrc = (0, import_react5.useMemo)(() => {
      const d = robotData;
      const fromFileId = resolveAvatarUrl(d?.avatarFileId, d?.originServer || currentServer);
      if (fromFileId) return fromFileId;
      const raw = d?.avatar || d?.avatarUrl || d?.logoUrl || null;
      return typeof raw === "string" && raw.trim() ? raw : void 0;
    }, [robotData, currentServer]);
    const handleAvatarClick = (0, import_react5.useCallback)((e) => {
      e.stopPropagation();
      if (!isRobot || !robotData) return;
      setAgentDialogOpen(true);
    }, [isRobot, robotData]);
    const handleCloseAgentDialog = (0, import_react5.useCallback)(() => {
      setAgentDialogOpen(false);
    }, []);
    const {
      isTouch,
      showActions,
      setShowActions,
      handleClick,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd
    } = useMessageInteraction({
      messageId: message?.id,
      onToggleActions: () => setShowActions((v) => !v)
    });
    const handleDismissActions = (0, import_react5.useCallback)(() => {
      setShowActions(false);
    }, [setShowActions]);
    useBase64Migration(readOnly ? null : message);
    const actionsNode = !readOnly && enableActions ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      MessageActions,
      {
        isRobot,
        isSelf,
        isStreaming,
        canBranch: isLatestAssistantMessage,
        message,
        showActions,
        isTouch,
        onDismissActions: handleDismissActions
      }
    ) : void 0;
    const confirmBarNode = isRobot && !readOnly ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MessageToolConfirmBar, { messageId: message?.id, isRobot }) : void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        MessageLayout,
        {
          isRobot,
          type,
          displayName,
          isTouch,
          isStreaming,
          hasVisibleContent: !!content,
          isCliAgent,
          avatarSrc,
          onAvatarClick: isRobot ? handleAvatarClick : void 0,
          collapsed: false,
          showActions,
          messageId: message?.id,
          content: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            MessageContent,
            {
              content: content || "",
              thinkContent: thinkContent || "",
              imageGenerationState,
              role: isSelf ? "self" : "other",
              isStreaming,
              messageId: message?.id,
              finishReason: message?.finishReason,
              retryProgress: message?.retryProgress
            }
          ),
          actions: actionsNode,
          confirmBar: confirmBarNode,
          onClick: handleClick,
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd
        }
      ),
      isRobot && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        Dialog,
        {
          isOpen: agentDialogOpen,
          onClose: handleCloseAgentDialog,
          title: canEditAgent ? `\u7F16\u8F91 ${robotData?.name || "Agent"}` : `${robotData?.name || "Agent"} (\u53EA\u8BFB)`,
          size: "large",
          children: robotData ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            AgentForm_default,
            {
              mode: "edit",
              initialValues: robotData,
              onClose: handleCloseAgentDialog,
              readOnly: !canEditAgent
            }
          ) : null
        }
      )
    ] });
  },
  areMessageItemPropsEqual
);
var MessageItem_default = MessageItem;

// packages/chat/messages/web/ToolMessageItem.tsx
var import_react7 = __toESM(require_react());

// packages/chat/messages/web/AskChoicePanelWeb.tsx
var import_react6 = __toESM(require_react());

// packages/ai/tools/askChoiceState.ts
function normalizeAskChoiceArgs(args) {
  const blocking = args.blocking !== false;
  if (Array.isArray(args.questions) && args.questions.length > 0) {
    return {
      questions: args.questions.map(
        (q, i) => normalizeQuestion(q, i)
      ),
      blocking
    };
  }
  const question = String(args.question ?? "").trim();
  const choices = Array.isArray(args.choices) ? args.choices : [];
  if (!question || choices.length === 0) {
    return { questions: [], blocking };
  }
  return {
    questions: [
      normalizeQuestion(
        { question, choices, multiSelect: false, allowOther: true, required: true },
        0
      )
    ],
    blocking
  };
}
function normalizeQuestion(raw, index) {
  return {
    id: String(raw?.id ?? `q${index}`),
    question: String(raw?.question ?? "").trim(),
    choices: (Array.isArray(raw?.choices) ? raw.choices : []).map(
      (c, ci) => ({
        id: String(c?.id ?? `c${ci}`),
        label: String(c?.label ?? "").trim(),
        ...typeof c?.detail === "string" && c.detail.trim() ? { detail: c.detail.trim() } : {},
        ...typeof c?.userMessage === "string" && c.userMessage.trim() ? { userMessage: c.userMessage.trim() } : {}
      })
    ),
    multiSelect: raw?.multiSelect === true,
    allowOther: raw?.allowOther !== false,
    required: raw?.required !== false
  };
}
function createInitialAskChoiceState(questions) {
  return {
    questions,
    activeIndex: 0,
    questionStates: questions.map(() => ({
      cursorIndex: 0,
      selectedIds: [],
      pickedId: null,
      otherText: "",
      otherFocused: false
    })),
    phase: "active"
  };
}
function askChoiceReducer(state, action) {
  if (action.type === "HYDRATE_QUESTIONS") {
    if (state.phase !== "active") return state;
    const newQuestions = action.questions;
    if (newQuestions.length <= state.questionStates.length) {
      if (newQuestions.length === state.questions.length) return state;
      return { ...state, questions: newQuestions };
    }
    const appended = newQuestions.slice(state.questionStates.length).map(() => ({
      cursorIndex: 0,
      selectedIds: [],
      pickedId: null,
      otherText: "",
      otherFocused: false
    }));
    return {
      ...state,
      questions: newQuestions,
      questionStates: [...state.questionStates, ...appended],
      activeIndex: Math.min(state.activeIndex, newQuestions.length - 1)
    };
  }
  if (state.phase !== "active") return state;
  switch (action.type) {
    case "CANCEL":
      return { ...state, phase: "cancelled" };
    case "SUBMIT": {
      if (!canSubmit(state)) return state;
      return { ...state, phase: "submitted" };
    }
    case "SWITCH_TAB": {
      const idx = clamp(action.index, 0, state.questions.length - 1);
      return { ...state, activeIndex: idx };
    }
    case "NEXT_TAB": {
      const idx = Math.min(state.activeIndex + 1, state.questions.length - 1);
      return { ...state, activeIndex: idx };
    }
    case "PREV_TAB": {
      const idx = Math.max(state.activeIndex - 1, 0);
      return { ...state, activeIndex: idx };
    }
    case "MOVE_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      const maxIndex = q.allowOther ? q.choices.length : q.choices.length - 1;
      const next = clamp(qs.cursorIndex + action.delta, 0, maxIndex);
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = {
        ...qs,
        cursorIndex: next,
        otherFocused: false
      };
      return { ...state, questionStates: newQs };
    }
    case "TOGGLE_AT_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      if (!q.multiSelect) return state;
      const isOtherRow = qs.cursorIndex >= q.choices.length;
      if (isOtherRow) {
        const newQs2 = [...state.questionStates];
        newQs2[state.activeIndex] = { ...qs, otherFocused: !qs.otherFocused };
        return { ...state, questionStates: newQs2 };
      }
      const choiceId = q.choices[qs.cursorIndex]?.id;
      if (!choiceId) return state;
      const has = qs.selectedIds.includes(choiceId);
      const newSelected = has ? qs.selectedIds.filter((id) => id !== choiceId) : [...qs.selectedIds, choiceId];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, selectedIds: newSelected };
      return { ...state, questionStates: newQs };
    }
    case "SELECT_AT_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      const isOtherRow = qs.cursorIndex >= q.choices.length;
      if (isOtherRow) {
        const newQs2 = [...state.questionStates];
        newQs2[state.activeIndex] = { ...qs, otherFocused: true };
        return { ...state, questionStates: newQs2 };
      }
      const choiceId = q.choices[qs.cursorIndex]?.id;
      if (!choiceId) return state;
      if (q.multiSelect) {
        const has = qs.selectedIds.includes(choiceId);
        const newSelected = has ? qs.selectedIds.filter((id) => id !== choiceId) : [...qs.selectedIds, choiceId];
        const newQs2 = [...state.questionStates];
        newQs2[state.activeIndex] = { ...qs, selectedIds: newSelected };
        return { ...state, questionStates: newQs2 };
      }
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, pickedId: choiceId, otherFocused: false };
      if (state.questions.length === 1) {
        return {
          ...state,
          questionStates: newQs,
          phase: "submitted"
        };
      }
      const nextState = { ...state, questionStates: newQs };
      const isLastTab = state.activeIndex >= state.questions.length - 1;
      if (isLastTab && canSubmit(nextState)) {
        return { ...nextState, phase: "submitted" };
      }
      const nextTab = Math.min(
        state.activeIndex + 1,
        state.questions.length - 1
      );
      return { ...nextState, activeIndex: nextTab };
    }
    case "FOCUS_OTHER": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, otherFocused: true };
      return { ...state, questionStates: newQs };
    }
    case "BLUR_OTHER": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, otherFocused: false };
      return { ...state, questionStates: newQs };
    }
    case "SET_OTHER_TEXT": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, otherText: action.text };
      return { ...state, questionStates: newQs };
    }
    default:
      return state;
  }
}
function isQuestionAnswered(q, qs) {
  if (!q.required) return true;
  const hasSelection = q.multiSelect ? qs.selectedIds.length > 0 : qs.pickedId !== null;
  const hasOther = q.allowOther && qs.otherText.trim().length > 0;
  return hasSelection || hasOther;
}
function canSubmit(state) {
  return state.questions.every(
    (q, i) => isQuestionAnswered(q, state.questionStates[i])
  );
}
function buildAskChoiceResult(state) {
  if (state.phase === "cancelled") return { kind: "cancelled" };
  if (state.phase !== "submitted") return { kind: "cancelled" };
  const answers = state.questions.map((q, i) => {
    const qs = state.questionStates[i];
    const selectedIds = q.multiSelect ? qs.selectedIds : qs.pickedId ? [qs.pickedId] : [];
    const otherText = qs.otherText.trim();
    const parts = [];
    for (const id of selectedIds) {
      const choice = q.choices.find((c) => c.id === id);
      if (choice) {
        parts.push(choice.userMessage || choice.label);
      }
    }
    if (otherText) {
      parts.push(otherText);
    }
    return {
      questionId: q.id,
      selectedIds,
      otherText,
      userMessage: parts.join("\n")
    };
  });
  return { kind: "submitted", answers };
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// packages/chat/messages/web/AskChoicePanelWeb.tsx
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var AskChoicePanelWeb = ({
  rawData,
  toolPayload,
  dbKey,
  interactive = true,
  onDelete
}) => {
  const dispatch = useAppDispatch();
  const merged = {
    ...rawData,
    ...rawData?.questions ? {} : toolPayload?.input?.questions ? { questions: toolPayload.input.questions } : {}
  };
  const normalized = normalizeAskChoiceArgs(merged);
  const questions = normalized.questions;
  const [state, dispatchAction] = (0, import_react6.useReducer)(
    askChoiceReducer,
    questions,
    createInitialAskChoiceState
  );
  const handleSubmit = (0, import_react6.useCallback)(() => {
    if (!canSubmit(state)) return;
    const submitted = askChoiceReducer(state, { type: "SUBMIT" });
    const result = buildAskChoiceResult(submitted);
    if (result.kind === "cancelled") return;
    const userMessage = result.answers.map((a) => a.userMessage).filter(Boolean).join("\n\n");
    if (userMessage) {
      dispatch(handleSendMessage({ userInput: userMessage }));
    }
  }, [state, dispatch]);
  const sentRef = (0, import_react6.useRef)(false);
  (0, import_react6.useEffect)(() => {
    if (state.phase === "submitted" && !sentRef.current) {
      sentRef.current = true;
      const result = buildAskChoiceResult(state);
      if (result.kind === "cancelled") return;
      const userMessage = result.answers.map((a) => a.userMessage).filter(Boolean).join("\n\n");
      if (userMessage) {
        dispatch(handleSendMessage({ userInput: userMessage }));
      }
    }
  }, [state.phase, state, dispatch]);
  (0, import_react6.useEffect)(() => {
    if (questions.length !== state.questionStates.length) {
      dispatchAction({ type: "HYDRATE_QUESTIONS", questions });
    }
  }, [questions, state.questionStates.length, dispatchAction]);
  if (questions.length === 0) return null;
  const clampedActiveIndex = Math.min(state.activeIndex, questions.length - 1);
  const activeQ = questions[clampedActiveIndex];
  const activeQs = state.questionStates[clampedActiveIndex];
  const isResolved = !interactive || state.phase !== "active";
  if (!activeQ || !activeQs) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ui-choice-wrap ui-choice-panel", children: [
    onDelete && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "button",
      {
        type: "button",
        className: "ui-choice-delete",
        onClick: onDelete,
        title: "\u5220\u9664",
        "aria-label": "\u5220\u9664",
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" })
      }
    ),
    questions.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ui-choice-tabs", children: questions.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "button",
      {
        type: "button",
        className: `ui-choice-tab ${i === clampedActiveIndex ? "active" : ""}`,
        onClick: () => dispatchAction({ type: "SWITCH_TAB", index: i }),
        disabled: isResolved,
        children: [
          "Q",
          i + 1
        ]
      },
      q.id
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ui-choice-question", children: activeQ.question }),
    activeQ.multiSelect && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ui-choice-hint", children: "\u53EF\u591A\u9009\uFF0C\u9009\u5B8C\u540E\u70B9\u63D0\u4EA4" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ui-choice-list", children: [
      activeQ.choices.map((choice, i) => {
        const isSelected = activeQ.multiSelect ? activeQs.selectedIds.includes(choice.id) : activeQs.pickedId === choice.id;
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "button",
          {
            type: "button",
            className: `ui-choice-row ${isSelected ? "selected" : ""}`,
            onClick: () => {
              if (isResolved) return;
              const delta = i - activeQs.cursorIndex;
              if (delta !== 0) {
                dispatchAction({ type: "MOVE_CURSOR", delta });
              }
              if (activeQ.multiSelect) {
                dispatchAction({ type: "TOGGLE_AT_CURSOR" });
              } else {
                dispatchAction({ type: "SELECT_AT_CURSOR" });
              }
            },
            disabled: isResolved,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "ui-choice-row-left", children: [
                activeQ.multiSelect ? isSelected ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuCheck, { size: 16, className: "ui-choice-check" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuSquare, { size: 16, className: "ui-choice-uncheck" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: `ui-choice-radio ${isSelected ? "checked" : ""}`, children: isSelected && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ui-choice-radio-inner" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "ui-choice-row-text", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ui-choice-row-label", children: choice.label }),
                  choice.detail && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ui-choice-row-detail", children: choice.detail })
                ] })
              ] }),
              !activeQ.multiSelect && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuArrowRight, { size: 14, className: "ui-chip-icon", "aria-hidden": "true" })
            ]
          },
          choice.id
        );
      }),
      activeQ.allowOther && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ui-choice-other", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { className: "ui-choice-other-label", children: "\u5176\u4ED6\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            type: "text",
            className: "ui-choice-other-input",
            value: activeQs.otherText,
            onChange: (e) => dispatchAction({ type: "SET_OTHER_TEXT", text: e.target.value }),
            onFocus: () => dispatchAction({ type: "FOCUS_OTHER" }),
            onBlur: () => dispatchAction({ type: "BLUR_OTHER" }),
            placeholder: "\u8F93\u5165\u81EA\u5B9A\u4E49\u56DE\u7B54\u2026",
            disabled: isResolved
          }
        )
      ] })
    ] }),
    (questions.length > 1 || activeQ.multiSelect) && !isResolved && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "button",
      {
        type: "button",
        className: `ui-choice-submit ${canSubmit(state) ? "enabled" : ""}`,
        onClick: handleSubmit,
        disabled: !canSubmit(state),
        children: "\u63D0\u4EA4"
      }
    )
  ] });
};
var AskChoicePanelWeb_default = import_react6.default.memo(AskChoicePanelWeb);

// packages/chat/messages/web/ToolMessageItem.tsx
var import_jsx_runtime6 = __toESM(require_jsx_runtime());
var TR_HEADER_BUTTON_STYLE = {
  width: "100%",
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "transparent",
  appearance: "none"
};
var TR_HEADER_TOGGLE_STYLE = {
  ...TR_HEADER_BUTTON_STYLE,
  width: "auto",
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 6,
  padding: 0,
  border: "none",
  cursor: "pointer"
};
var ToolMessageItem = (0, import_react7.memo)(
  ({ message, readOnly = false }) => {
    const { t } = useTranslation("chat");
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { content, toolName, isStreaming, toolPayload, dbKey } = message;
    const rawData = (0, import_react7.useMemo)(() => safeParse(content), [content]);
    const isRepairableFailure = rawData?.code === "PREFLIGHT_FAILED" && !!rawData?.repairPlan;
    const isError = (toolPayload?.status === "failed" || !!toolPayload?.error || !!rawData?.error) && !isRepairableFailure;
    const statusStr = isStreaming ? "running" : isRepairableFailure ? "repairing" : isError ? "failed" : "success";
    const toolRunId = toolPayload?.toolRunId;
    const activeRun = useToolRunById(toolRunId ?? "");
    const displaySummary = (0, import_react7.useMemo)(() => {
      if (isRepairableFailure) {
        const count = Array.isArray(rawData?.issues) ? rawData.issues.length : 0;
        return t(
          "tool.preflightRepairing",
          "\u9884\u68C0\u53D1\u73B0 {{count}} \u4E2A\u95EE\u9898\uFF0C\u6B63\u5728\u81EA\u52A8\u4FEE\u590D\u2026",
          { count }
        );
      }
      const summarySource = activeRun?.status === "running" && activeRun.outputSummary || activeRun?.outputSummary || toolPayload?.summary || rawData?.summary || toolName || "";
      return formatToolRowHeaderSummary({
        toolName,
        toolArgs: extractToolCallArgs(toolPayload),
        existingSummary: normalizeToolDisplaySummary(summarySource, toolName),
        translate: createToolNameTranslator(
          (key, options) => String(t(key, options))
        )
      });
    }, [isRepairableFailure, rawData, activeRun, toolPayload, toolName, t]);
    const renderRunProgress = () => {
      if (!activeRun || activeRun.toolName !== "appDeploy") return null;
      const steps = Array.isArray(activeRun.steps) ? activeRun.steps : [];
      const summary = activeRun.outputSummary?.trim();
      if (!summary && steps.length === 0) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tool-run-progress", children: [
        summary && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-progress-summary", children: summary }),
        steps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-step-list", children: steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: `tr-step is-${step.status}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "tr-step-dot" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-step-texts", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-step-label", children: step.label }),
            step.detail && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-step-detail", children: step.detail })
          ] })
        ] }, step.id)) })
      ] });
    };
    const parentAssistant = useAppSelector(
      (state) => message.parentMessageId ? selectMsgById(state, message.parentMessageId) : void 0
    );
    const parentAgentKey = parentAssistant?.cybotKey;
    const showConfirmBanner = shouldShowToolMessageConfirmBanner(
      toolName,
      activeRun
    );
    const [collapsed, setCollapsed] = (0, import_react7.useState)(() => {
      if (showConfirmBanner || isStreaming || isRepairableFailure || isError)
        return false;
      if (toolName === "ziweiChart") return false;
      return true;
    });
    const userCollapsedOverrideRef = (0, import_react7.useRef)(false);
    const [showDebug, setShowDebug] = (0, import_react7.useState)(false);
    const [preview, setPreview] = (0, import_react7.useState)(
      null
    );
    (0, import_react7.useEffect)(() => {
      if (showConfirmBanner) setCollapsed(false);
    }, [showConfirmBanner]);
    (0, import_react7.useEffect)(() => {
      if (toolName === "ziweiChart") {
        userCollapsedOverrideRef.current = true;
        setCollapsed(false);
      }
    }, [toolName]);
    (0, import_react7.useEffect)(() => {
      if (showConfirmBanner) return;
      if (statusStr === "running" || statusStr === "repairing") {
        userCollapsedOverrideRef.current = false;
        setCollapsed(false);
        return;
      }
      if (statusStr === "success" && !userCollapsedOverrideRef.current) {
        setCollapsed(true);
      }
    }, [statusStr, showConfirmBanner]);
    const handleCopy = (e) => {
      e.stopPropagation();
      const txt = typeof rawData === "string" ? rawData : JSON.stringify(rawData, null, 2);
      clipboard_default(txt, { onSuccess: () => toast.success("Copied") });
    };
    const { openConfirm: handleDeleteClick, modal: deleteConfirmModal } = useMessageDelete({ dbKey, confirmMessageKey: "delConfirm", t });
    const applyConfirmedToolResult = (result) => {
      const nextRawData = result?.rawData ?? {};
      const nextSummary = asOptionalTrimmedString(result?.displayData) ?? (activeRun?.outputSummary || toolPayload?.summary || displaySummary);
      const nextToolPayload = {
        ...toolPayload ?? {},
        toolName,
        status: "succeeded",
        input: activeRun?.input ?? toolPayload?.input,
        rawToolCall: toolPayload?.rawToolCall,
        toolRunId,
        summary: nextSummary
      };
      const changes = {
        content: JSON.stringify(nextRawData),
        isStreaming: false,
        toolName,
        toolRunId,
        toolPayload: nextToolPayload
      };
      dispatch(updateToolMessage({ id: message.id, changes }));
      if (dbKey) {
        dispatch(
          write({
            data: {
              ...message,
              ...changes,
              type: "msg" /* MSG */
            },
            customKey: dbKey
          })
        );
      }
    };
    if (toolName === "ask_user" || rawData?.type === "ask_user") {
      if (readOnly) return null;
      const isResolved = !!rawData?.selected || !!rawData?.cancelled || !!rawData?.answers;
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          AskChoicePanelWeb_default,
          {
            rawData,
            toolPayload,
            dbKey,
            interactive: !isResolved && !isStreaming,
            onDelete: handleDeleteClick
          }
        ),
        deleteConfirmModal
      ] });
    }
    if (toolName === "runStreamingAgent") {
      const handoff = buildRunStreamingAgentHandoffPresentation({
        rawData,
        toolPayload,
        isStreaming,
        isError
      });
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "div",
          {
            className: `tool-msg-row tool-msg-row--handoff ${statusStr} ${collapsed ? "is-collapsed" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                "button",
                {
                  type: "button",
                  className: "tr-header",
                  style: TR_HEADER_BUTTON_STYLE,
                  onClick: () => {
                    userCollapsedOverrideRef.current = true;
                    setCollapsed((p) => !p);
                  },
                  "aria-expanded": !collapsed,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-main", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: `tr-icon ${statusStr}`, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusIcon, { status: statusStr, toolName }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "tr-summary u-truncate", children: handoff.summary })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-chevron", "aria-hidden": "true", children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuChevronRight, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuChevronDown, { size: 14 }) })
                  ]
                }
              ),
              !collapsed && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-body handoff-tool__body", children: [
                !handoff.inline && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "handoff-tool__detail-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__label", children: "\u5B50 dialog" }),
                  handoff.targetDialogKey ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "handoff-tool__link",
                      onClick: (event) => {
                        event.stopPropagation();
                        navigate(
                          buildDialogUrl(
                            handoff.targetDialogKey,
                            handoff.targetSpaceId
                          )
                        );
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "\u6253\u5F00\u5BF9\u8BDD" }),
                        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuArrowRight, { size: 14, "aria-hidden": "true" })
                      ]
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__value", children: "\u672A\u5355\u72EC\u521B\u5EFA" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "handoff-tool__detail-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__label", children: "\u76EE\u6807 Agent" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    "span",
                    {
                      className: "handoff-tool__value",
                      title: handoff.agentKey || void 0,
                      children: handoff.targetLabel
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "handoff-tool__detail-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__label", children: "\u8F93\u5165\u6458\u8981" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__value", children: handoff.inputSummary })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "handoff-tool__detail-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__label", children: "\u72B6\u6001" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "handoff-tool__value", children: handoff.statusLabel })
                ] })
              ] })
            ]
          }
        ),
        deleteConfirmModal
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "div",
        {
          className: `tool-msg-row ${statusStr} ${collapsed ? "is-collapsed" : ""} ${toolName === "appDeploy" ? "tool-msg-row--app-deploy" : ""}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                "button",
                {
                  type: "button",
                  className: "tr-header-toggle",
                  style: TR_HEADER_TOGGLE_STYLE,
                  onClick: () => {
                    userCollapsedOverrideRef.current = true;
                    setCollapsed((p) => !p);
                  },
                  "aria-expanded": !collapsed,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-main", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: `tr-icon ${statusStr}`, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusIcon, { status: statusStr, toolName }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "tr-summary u-truncate", children: displaySummary })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-chevron", "aria-hidden": "true", children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuChevronRight, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuChevronDown, { size: 14 }) })
                  ]
                }
              ),
              !readOnly && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "tr-actions", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-act-bar", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: handleCopy,
                    className: "tr-act-btn",
                    title: t("common:copy", "\u590D\u5236"),
                    "aria-label": t("common:copy", "\u590D\u5236"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuCopy, { size: 12, "aria-hidden": "true" })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowDebug(!showDebug),
                    className: `tr-act-btn ${showDebug ? "on" : ""}`,
                    title: showDebug ? t("hideDebug", "\u9690\u85CF\u8C03\u8BD5") : t("showDebug", "\u663E\u793A\u8C03\u8BD5"),
                    "aria-label": showDebug ? t("hideDebug", "\u9690\u85CF\u8C03\u8BD5") : t("showDebug", "\u663E\u793A\u8C03\u8BD5"),
                    "aria-pressed": showDebug,
                    children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuCode, { size: 12, "aria-hidden": "true" })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: handleDeleteClick,
                    className: "tr-act-btn danger",
                    title: t("delete", "\u5220\u9664"),
                    "aria-label": t("delete", "\u5220\u9664"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuTrash2, { size: 12, "aria-hidden": "true" })
                  }
                )
              ] }) })
            ] }),
            !collapsed && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "tr-body", children: [
              showConfirmBanner && activeRun && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "confirm-banner", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "cb-text", children: activeRun.status === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "u-error-text", children: activeRun.error || t("tool.failed", "Execution failed") }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: activeRun.status === "running" ? t("tool.executing", "Executing...") : t("tool.requiresApproval", "Requires Approval") }) }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "btn-primary-sm",
                    disabled: activeRun.status === "running",
                    "aria-label": activeRun.status === "running" ? t("tool.executing", "Executing...") : void 0,
                    onClick: () => {
                      if (!activeRun) return;
                      dispatch(executeToolRun({ id: activeRun.id })).unwrap().then((result) => {
                        applyConfirmedToolResult(result);
                        if (parentAgentKey) {
                          dispatch(
                            streamAgentChatTurn({
                              agentKey: parentAgentKey,
                              userInput: t("tool.resumePrompt", {
                                defaultValue: "\u8BF7\u57FA\u4E8E\u521A\u624D\u5DE5\u5177\u6267\u884C\u7684\u7ED3\u679C\u7EE7\u7EED\u5B8C\u6210\u4F60\u4E4B\u524D\u7684\u8BA1\u5212\uFF1B\u5982\u679C\u4EFB\u52A1\u5DF2\u7ECF\u5B8C\u6210\uFF0C\u8BF7\u7528\u7B80\u6D01\u7684\u65B9\u5F0F\u603B\u7ED3\u7ED3\u679C\u3002"
                              })
                            })
                          );
                        }
                      }).catch(() => {
                      });
                    },
                    children: activeRun.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuCircle, { className: "icon-primary", "aria-hidden": "true" }) : activeRun.status === "failed" ? t("common.retry", "Retry") : toolName === "deleteSpaces" ? "\u786E\u8BA4\u5220\u9664" : t("common.run", "Run")
                  }
                )
              ] }),
              renderRunProgress(),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                ToolMessageContent_default,
                {
                  toolName,
                  rawData,
                  isError,
                  t,
                  openPreview: (id, name) => setPreview({ id, name }),
                  navigateToPage: (id) => navigate(`/${id}`),
                  toolArgs: extractToolCallArgs(toolPayload)
                }
              )
            ] }),
            showDebug && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "debug-box", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("pre", { children: JSON.stringify(toolPayload || rawData, null, 2) }) }),
            preview && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              DocxPreviewDialog_default,
              {
                isOpen: true,
                onClose: () => setPreview(null),
                pageKey: preview.id,
                fileName: preview.name
              }
            )
          ]
        }
      ),
      deleteConfirmModal
    ] });
  }
);

// packages/chat/messages/web/groupToolEntries.ts
function buildToolCallNameIndex(entries) {
  const index = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (entry.type !== "single") continue;
    const calls = entry.message?.tool_calls;
    if (entry.message?.role !== "assistant" || !Array.isArray(calls)) continue;
    for (const call of calls) {
      const id = typeof call?.id === "string" ? call.id : "";
      const name = typeof call?.function?.name === "string" ? call.function.name : "";
      if (id && name) index.set(id, name);
    }
  }
  return index;
}
function enrichToolMessageName(message, index) {
  const existing = typeof message?.toolName === "string" ? message.toolName.trim() : "";
  if (existing) return message;
  const callId = typeof message?.toolCallId === "string" && message.toolCallId.trim() || (typeof message?.tool_call_id === "string" ? message.tool_call_id.trim() : "");
  const resolved = callId ? index.get(callId) : void 0;
  if (!resolved) return message;
  return { ...message, toolName: resolved };
}
function hasActivitySignal(message) {
  const activity = message?.metadata?.activity ?? message?.toolPayload?.activity;
  return !!activity && typeof activity === "object";
}
var INTERACTIVE_TOOL_NAMES = /* @__PURE__ */ new Set(["ask_user", "runStreamingAgent"]);
function isInteractiveToolMessage(message) {
  if (message?.role !== "tool") return false;
  const toolName = typeof message?.toolName === "string" && message.toolName.trim() || "";
  return INTERACTIVE_TOOL_NAMES.has(toolName);
}
function toolMessageKey(message) {
  return message?.id ?? message?.dbKey ?? message?.tool_call_id ?? message?.toolCallId ?? "tool-single";
}
function isFinalActivityAssistant(entry) {
  return entry?.type === "single" && entry.message?.role === "assistant" && !Array.isArray(entry.message?.tool_calls) && hasActivitySignal(entry.message);
}
function groupConsecutiveToolEntries(entries) {
  const toolCallNameById = buildToolCallNameIndex(entries);
  const result = [];
  let currentGroupMessages = [];
  let currentActivityMessages = [];
  const flushGroup = () => {
    if (currentGroupMessages.length === 0) return;
    const firstToolId = toolMessageKey(currentGroupMessages[0]);
    const groupKey = `tool-group-${firstToolId}`;
    const groupEntry = {
      type: "tool-group",
      key: groupKey,
      messages: [...currentGroupMessages],
      ...currentActivityMessages.length > 0 ? { activityMessages: [...currentActivityMessages] } : {}
    };
    result.push(groupEntry);
    currentGroupMessages = [];
    currentActivityMessages = [];
  };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isTool = entry.type === "single" && entry.message?.role === "tool";
    if (isTool && isInteractiveToolMessage(entry.message)) {
      flushGroup();
      result.push({
        type: "single",
        key: toolMessageKey(entry.message),
        message: enrichToolMessageName(entry.message, toolCallNameById)
      });
      continue;
    }
    if (isTool) {
      const toolMsg = enrichToolMessageName(entry.message, toolCallNameById);
      currentGroupMessages.push(toolMsg);
      if (hasActivitySignal(toolMsg)) {
        currentActivityMessages.push(toolMsg);
      }
      continue;
    }
    if (currentGroupMessages.length > 0 && isFinalActivityAssistant(entry) && i === entries.length - 1) {
      currentActivityMessages.push(entry.message);
      flushGroup();
      result.push(entry);
      continue;
    }
    flushGroup();
    result.push(entry);
  }
  flushGroup();
  return result;
}

// packages/chat/messages/web/TopLoadingIndicator.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime());
var spinKeyframes = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
var TopLoadingIndicator = () => {
  const theme = useTheme();
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: spinKeyframes }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "chat-messages__loading-indicator-container", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "chat-messages__loading-indicator-spinner" }) })
  ] });
};
var TopLoadingIndicator_default = TopLoadingIndicator;

// packages/chat/web/ScrollToBottomButton.tsx
var import_react8 = __toESM(require_react());
var import_jsx_runtime8 = __toESM(require_jsx_runtime());
var ScrollToBottomButtonComponent = ({
  isVisible,
  onClick
}) => {
  if (!isVisible) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_jsx_runtime8.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "button",
    {
      type: "button",
      className: "scroll-to-bottom-button",
      onClick,
      "aria-label": "\u6EDA\u52A8\u5230\u5E95\u90E8",
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuChevronDown, { size: 18, "aria-hidden": "true" })
    }
  ) });
};
var ScrollToBottomButton = (0, import_react8.memo)(ScrollToBottomButtonComponent);

// packages/chat/web/ScrollToTopButton.tsx
var import_react9 = __toESM(require_react());
var import_jsx_runtime9 = __toESM(require_jsx_runtime());
var ScrollToTopButtonComponent = ({
  isVisible,
  onClick
}) => {
  if (!isVisible) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
    "button",
    {
      type: "button",
      className: "scroll-to-top-button",
      onClick,
      "aria-label": "\u6EDA\u52A8\u5230\u9876\u90E8",
      children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LuChevronUp, { size: 18, "aria-hidden": "true" })
    }
  );
};
var ScrollToTopButton = (0, import_react9.memo)(ScrollToTopButtonComponent);

// packages/chat/messages/web/useLoopStopReason.ts
var import_react10 = __toESM(require_react());
var w = typeof window !== "undefined" ? window : null;
var useLoopStopReason = (isRunning) => {
  const [reason, setReason] = (0, import_react10.useState)(null);
  const hasRun = (0, import_react10.useRef)(false);
  (0, import_react10.useEffect)(() => {
    if (isRunning) {
      hasRun.current = true;
      setReason(null);
      if (w) w.__LOOP_STOP_REASON__ = null;
      return;
    }
    if (!hasRun.current) return;
    const timer = setTimeout(() => {
      const raw = w?.__LOOP_STOP_REASON__ ?? null;
      setReason(raw);
    }, 200);
    return () => clearTimeout(timer);
  }, [isRunning]);
  return reason;
};

// packages/chat/messages/web/LoopStopBadge.tsx
var import_jsx_runtime10 = __toESM(require_jsx_runtime());
var CONFIG = {
  done: { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuArrowRight, { size: 13, "aria-hidden": "true" }), label: "\u56DE\u7B54\u5B8C\u6210", color: "#4ade80" },
  handoff: { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuArrowRight, { size: 13, "aria-hidden": "true" }), label: "\u5DF2\u79FB\u4EA4\u5B50 Agent", color: "#60a5fa" },
  pending: { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuTimer, { size: 13, "aria-hidden": "true" }), label: "\u7B49\u5F85\u4F60\u786E\u8BA4", color: "#facc15" },
  aborted: { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuTimer, { size: 13, "aria-hidden": "true" }), label: "\u5DF2\u505C\u6B62\u751F\u6210", color: "#94a3b8" },
  timeout: {
    icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuClock, { size: 13, "aria-hidden": "true" }),
    label: "\u6267\u884C\u8D85\u65F6",
    sub: "\u5355\u6B21\u5DE5\u5177\u8C03\u7528\u8017\u65F6\u8FC7\u957F\u88AB\u4E2D\u65AD",
    color: "#f97316",
    canRetry: true
  },
  error: { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuRefreshCw, { size: 13, "aria-hidden": "true" }), label: "\u6267\u884C\u51FA\u9519", color: "#f87171", canRetry: true }
};
var LoopStopBadge = ({ reason, onRetry }) => {
  if (!reason || reason === "done") return null;
  const cfg = CONFIG[reason];
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    margin: "8px 16px",
    padding: "6px 12px",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--fontSize-sm)",
    color: cfg.color,
    border: `1px solid ${cfg.color}44`,
    background: `${cfg.color}11`
  }, children: [
    cfg.icon,
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontWeight: 500 }, children: cfg.label }),
    cfg.sub && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { opacity: 0.65, fontSize: "var(--fontSize-xs)" }, children: [
      "\u2014 ",
      cfg.sub
    ] }),
    cfg.canRetry && onRetry && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
      "button",
      {
        type: "button",
        onClick: onRetry,
        style: {
          marginLeft: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${cfg.color}88`,
          background: `${cfg.color}22`,
          color: cfg.color,
          fontSize: "var(--fontSize-xs)",
          cursor: "pointer",
          fontWeight: 500
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LuRefreshCw, { size: 11, "aria-hidden": "true" }),
          "\u91CD\u8BD5"
        ]
      }
    )
  ] });
};

// packages/chat/messages/web/AssistantReplyPending.tsx
var import_react11 = __toESM(require_react());
var import_jsx_runtime11 = __toESM(require_jsx_runtime());
var AssistantReplyPending = (0, import_react11.memo)(function AssistantReplyPending2() {
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "assistant-reply-pending", "aria-live": "polite", "aria-busy": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "assistant-reply-pending__avatar", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(StreamingPendingIndicator, { size: "md" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "assistant-reply-pending__body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "assistant-reply-pending__label", children: "\u6B63\u5728\u56DE\u590D\u2026" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "empty-content", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "empty-content__line empty-content__line--short" }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "empty-content__line" })
      ] })
    ] })
  ] });
});

// packages/chat/messages/web/IntermediateNarrationRow.tsx
var import_react12 = __toESM(require_react());
var import_jsx_runtime12 = __toESM(require_jsx_runtime());
function isEmptyNarrationBody(content, thinkContent) {
  const isEmpty = (v) => v == null || typeof v === "string" && v.trim().length === 0 || Array.isArray(v) && v.length === 0;
  return isEmpty(content) && isEmpty(thinkContent);
}
var IntermediateNarrationRow = (0, import_react12.memo)(function IntermediateNarrationRow2({
  message
}) {
  const { content, thinkContent, isStreaming = false, id, imageGenerationState } = message || {};
  if (!isStreaming && isEmptyNarrationBody(content, thinkContent)) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
    "div",
    {
      className: "intermediate-narration",
      "data-message-id": id,
      "aria-live": isStreaming ? "polite" : void 0,
      children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        MessageContent,
        {
          content: content || "",
          thinkContent: thinkContent || "",
          role: "other",
          isStreaming,
          messageId: id,
          imageGenerationState
        }
      )
    }
  );
});

// packages/chat/messages/web/MessageList.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime());
var LOAD_THRESHOLD = 50;
var DEFAULT_SCROLL_CONTAINER_SELECTOR = ".MainLayout__main";
var getNearBottomThreshold = () => Math.min(window.innerHeight * 0.15, 200);
var MessageRowErrorBoundary = class extends import_react13.Component {
  constructor() {
    super(...arguments);
    __publicField(this, "state", { hasError: false });
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Message row render failed:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "chat-messages__item-error", children: "\u8FD9\u6761\u6D88\u606F\u52A0\u8F7D\u5931\u8D25" });
    }
    return this.props.children;
  }
};
__publicField(MessageRowErrorBoundary, "propTypes", {
  children: import_prop_types.default.node.isRequired
});
var buildMessageRenderEntries = (messages) => {
  const entries = [];
  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i];
    if (!msg || typeof msg.id !== "string") continue;
    if (isHiddenOrchestratorToolMessage(msg)) continue;
    if (isAssistantToolStub(msg)) continue;
    entries.push({ type: "single", key: msg.id, message: msg });
  }
  return entries;
};
var MessagesList = ({
  dialogId,
  scrollContainerSelector
}) => {
  const dispatch = useAppDispatch();
  const listRef = (0, import_react13.useRef)(null);
  const messages = useAppSelector((state) => selectAllMsgs(state, dialogId));
  const location = useLocation();
  const currentUserId = useUserId();
  const quickChatFirstMessageText = getQuickChatFirstMessageText(
    location.state
  );
  const displayMessages = (0, import_react13.useMemo)(() => {
    if (!quickChatFirstMessageText) return messages;
    if (messages.some((message) => message?.role === "user")) {
      return messages;
    }
    const optimisticUserMessage = {
      id: "__optimistic_quickchat_user__",
      role: "user",
      content: quickChatFirstMessageText,
      userId: currentUserId,
      dialogId
    };
    return [optimisticUserMessage, ...messages];
  }, [messages, quickChatFirstMessageText, currentUserId, dialogId]);
  const { isLoadingOlder, hasMoreOlder } = useMessagesLoadingState(dialogId);
  const lastStreamTimestamp = useLastStreamTimestamp(dialogId);
  const hasStreamingMessage = useHasStreamingMessage(dialogId);
  const lastAssistantMessageId = useAppSelector(
    (state) => selectLastAssistantMessage(state, dialogId)?.id ?? null
  );
  const currentDialogConfig = useCurrentDialogConfig();
  const activeDialogKey = currentDialogConfig?.dbKey && extractCustomId(currentDialogConfig.dbKey) === dialogId ? currentDialogConfig.dbKey : void 0;
  const activeControllers = useActiveControllers(activeDialogKey);
  const isRunning = !!activeDialogKey && Object.keys(activeControllers).length > 0;
  const loopStopReason = useLoopStopReason(isRunning);
  const allToolRuns = useAllToolRuns();
  const hasUnresolvedConfirmRun = (0, import_react13.useMemo)(
    () => allToolRuns.some(
      (run) => run.interaction === "confirm" && (run.status === "pending" || run.status === "running")
    ),
    [allToolRuns]
  );
  const visibleLoopStopReason = loopStopReason === "pending" && !hasUnresolvedConfirmRun ? null : loopStopReason;
  const navigate = useNavigate();
  const [showScrollToBottom, setShowScrollToBottom] = (0, import_react13.useState)(false);
  const [showScrollToTop, setShowScrollToTop] = (0, import_react13.useState)(false);
  const scrollToTopEnabled = useAppSelector(selectShowScrollToTopButton);
  const scrollToBottomEnabled = useAppSelector(selectShowScrollToBottomButton);
  const [isInitialRender, setIsInitialRender] = (0, import_react13.useState)(true);
  const stateRef = (0, import_react13.useRef)({
    isInitialLoad: true,
    prevMessagesLength: 0,
    isLoadingOlder: false,
    hasMoreOlder: true,
    scrollContainer: null,
    isNearBottom: true
  });
  const rafIdRef = (0, import_react13.useRef)(null);
  const wasStreamingRef = (0, import_react13.useRef)(false);
  const forceFollowCurrentTurnRef = (0, import_react13.useRef)(false);
  stateRef.current.isLoadingOlder = isLoadingOlder;
  stateRef.current.hasMoreOlder = hasMoreOlder;
  const handleCreateNewDialog = (0, import_react13.useCallback)(async () => {
    if (!currentDialogConfig || !currentDialogConfig.cybots) return;
    try {
      const result = await dispatch(
        createDialog({
          cybots: currentDialogConfig.cybots,
          category: currentDialogConfig.category,
          inheritFromDialogKey: currentDialogConfig.dbKey
        })
      ).unwrap();
      if (result && result.dbKey) {
        navigate(buildDialogUrl(result.dbKey, result.spaceId), {
          state: { isNew: true }
        });
      }
    } catch (err) {
      console.error("Failed to create inherited dialog:", err);
    }
  }, [dispatch, currentDialogConfig, navigate]);
  const getScroller = (0, import_react13.useCallback)(() => {
    const selector = scrollContainerSelector ?? DEFAULT_SCROLL_CONTAINER_SELECTOR;
    return listRef.current?.closest(selector);
  }, [scrollContainerSelector]);
  const updateScrollShadowAttrs = (0, import_react13.useCallback)(() => {
    const scroller = stateRef.current.scrollContainer;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    if (scroller.scrollTop > 1) {
      scroller.setAttribute("data-top-scroll", "");
    } else {
      scroller.removeAttribute("data-top-scroll");
    }
    if (distanceFromBottom > 1) {
      scroller.setAttribute("data-bottom-scroll", "");
    } else {
      scroller.removeAttribute("data-bottom-scroll");
    }
  }, []);
  const scrollToBottomRAF = (0, import_react13.useCallback)(
    (behavior = "smooth") => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const scroller = getScroller() ?? stateRef.current.scrollContainer;
        if (!scroller) return;
        scroller.scrollTo({ top: scroller.scrollHeight, behavior });
      });
    },
    [getScroller]
  );
  const scheduleStreamingFollowScroll = (0, import_react13.useCallback)(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const scroller = getScroller() ?? stateRef.current.scrollContainer;
      if (!scroller) return;
      const distance = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      if (distance <= 1) return;
      if (distance < 120 || stateRef.current.isNearBottom) {
        scroller.scrollTop = scroller.scrollHeight;
        return;
      }
      scroller.scrollTop += distance * 0.35;
    });
  }, [getScroller]);
  (0, import_react13.useLayoutEffect)(() => {
    const scroller = getScroller();
    if (!scroller) return;
    stateRef.current.scrollContainer = scroller;
    scroller.setAttribute("data-nolo-chat-scroll-shadow", "");
    updateScrollShadowAttrs();
    const prevMessagesLength = stateRef.current.prevMessagesLength;
    const appendedMessages = messages.length > prevMessagesLength ? messages.slice(prevMessagesLength) : [];
    const appendedUserMessage = [...appendedMessages].reverse().find((msg) => msg.role === "user");
    if (stateRef.current.isInitialLoad && messages.length > 0) {
      requestAnimationFrame(() => {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
      });
      stateRef.current.isInitialLoad = false;
      stateRef.current.prevMessagesLength = messages.length;
      requestAnimationFrame(() => setIsInitialRender(false));
      return;
    }
    if (wasStreamingRef.current && !hasStreamingMessage && (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current)) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
      forceFollowCurrentTurnRef.current = false;
    }
    if (appendedUserMessage) {
      forceFollowCurrentTurnRef.current = true;
      scrollToBottomRAF("auto");
    } else if (messages.length > prevMessagesLength) {
      if (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current) {
        if (hasStreamingMessage) {
          scheduleStreamingFollowScroll();
        } else {
          scrollToBottomRAF("smooth");
        }
      }
    } else if ((stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current) && lastStreamTimestamp) {
      if (hasStreamingMessage) {
        scheduleStreamingFollowScroll();
      } else {
        scrollToBottomRAF("smooth");
      }
    }
    wasStreamingRef.current = hasStreamingMessage;
    stateRef.current.prevMessagesLength = messages.length;
  }, [
    messages,
    lastStreamTimestamp,
    hasStreamingMessage,
    getScroller,
    scrollToBottomRAF,
    scheduleStreamingFollowScroll
  ]);
  (0, import_react13.useEffect)(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);
  (0, import_react13.useEffect)(() => {
    stateRef.current = {
      ...stateRef.current,
      isInitialLoad: true,
      prevMessagesLength: 0,
      scrollContainer: null,
      isNearBottom: true
    };
    wasStreamingRef.current = false;
    forceFollowCurrentTurnRef.current = false;
    setIsInitialRender(true);
    setShowScrollToBottom(false);
    setShowScrollToTop(false);
  }, [dialogId]);
  const handleLoadOlder = (0, import_react13.useCallback)(() => {
    if (stateRef.current.isLoadingOlder || !stateRef.current.hasMoreOlder || messages.length === 0)
      return;
    const scroller = getScroller();
    if (!scroller) return;
    const prevScrollHeight = scroller.scrollHeight;
    const prevScrollTop = scroller.scrollTop;
    const oldestMessage = messages[0];
    const beforeKey = oldestMessage.dbKey ?? oldestMessage.id;
    if (!beforeKey) return;
    dispatch(
      loadOlderMessages({
        dialogId,
        dialogKey: currentDialogConfig?.dbKey,
        beforeKey
      })
    ).then(() => {
      const currentScroller = getScroller();
      if (!currentScroller) return;
      const heightDiff = currentScroller.scrollHeight - prevScrollHeight;
      currentScroller.scrollTop = prevScrollTop + heightDiff;
      requestAnimationFrame(updateScrollShadowAttrs);
    });
  }, [dispatch, messages, dialogId, currentDialogConfig?.dbKey, getScroller]);
  const handleScroll = (0, import_react13.useCallback)(() => {
    const scroller = stateRef.current.scrollContainer;
    if (!scroller) return;
    if (scroller.scrollTop < LOAD_THRESHOLD) {
      handleLoadOlder();
    }
    const threshold = getNearBottomThreshold();
    const distanceFromBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    stateRef.current.isNearBottom = distanceFromBottom <= threshold;
    if (forceFollowCurrentTurnRef.current && distanceFromBottom > Math.max(140, threshold * 1.5)) {
      forceFollowCurrentTurnRef.current = false;
    }
    setShowScrollToBottom(distanceFromBottom > 100);
    setShowScrollToTop(scroller.scrollTop > 100);
    updateScrollShadowAttrs();
  }, [handleLoadOlder, updateScrollShadowAttrs]);
  (0, import_react13.useEffect)(() => {
    const scroller = getScroller();
    if (!scroller) return;
    stateRef.current.scrollContainer = scroller;
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeAttribute("data-nolo-chat-scroll-shadow");
      scroller.removeAttribute("data-top-scroll");
      scroller.removeAttribute("data-bottom-scroll");
      if (stateRef.current.scrollContainer === scroller) {
        stateRef.current.scrollContainer = null;
      }
    };
  }, [handleScroll, getScroller]);
  const scrollToBottom = (0, import_react13.useCallback)(() => {
    forceFollowCurrentTurnRef.current = true;
    if (hasStreamingMessage) {
      scheduleStreamingFollowScroll();
    } else {
      scrollToBottomRAF("smooth");
    }
  }, [hasStreamingMessage, scrollToBottomRAF, scheduleStreamingFollowScroll]);
  const scrollToTop = (0, import_react13.useCallback)(() => {
    const scroller = getScroller() ?? stateRef.current.scrollContainer;
    if (!scroller) return;
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  }, [getScroller]);
  const renderEntries = (0, import_react13.useMemo)(
    () => groupConsecutiveToolEntries(buildMessageRenderEntries(displayMessages)),
    [displayMessages]
  );
  const awaitingAssistantReply = (0, import_react13.useMemo)(
    () => isAwaitingVisibleAssistantReply(messages, isRunning),
    [isRunning, messages]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: `chat-messages__list-wrapper${isInitialRender ? " chat-messages__list-wrapper--initial" : ""}`, ref: listRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "chat-messages__list", role: "log", "aria-live": "polite", children: [
      isLoadingOlder && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "top-loading", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(TopLoadingIndicator_default, {}) }),
      !hasMoreOlder && currentDialogConfig?.summarizedBeforeId && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "summary-divider", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: "\u5DF2\u5F52\u6863\u5230\u6458\u8981" }) }),
      renderEntries.map((entry, entryIndex) => {
        if (entry.type === "tool-group") {
          const canCollapse = shouldAutoCollapseToolGroup({
            entries: renderEntries,
            groupIndex: entryIndex,
            isRunning: isRunning || awaitingAssistantReply,
            hasStreamingMessage
          });
          return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_react13.default.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "chat-messages__item-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(MessageRowErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            ToolMessageGroup_default,
            {
              messages: entry.messages,
              activityMessages: entry.activityMessages,
              canCollapse
            }
          ) }) }) }, entry.key);
        }
        const msg = entry.message;
        const isTool = msg.role === "tool";
        const isIntermediateNarration = !isTool && msg.role === "assistant" && isIntermediateAssistantProgress(renderEntries, entryIndex);
        const isLastSummarized = currentDialogConfig?.summarizedBeforeId === msg.id;
        const canBranch = !isTool && msg.role !== "user" && typeof msg.id === "string" && msg.id === lastAssistantMessageId;
        const enableActions = isTool || msg.role === "user" || !isIntermediateNarration;
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_react13.default.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            "div",
            {
              className: isIntermediateNarration ? "chat-messages__item-wrapper chat-messages__item-wrapper--narration" : "chat-messages__item-wrapper",
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(MessageRowErrorBoundary, { children: isTool ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ToolMessageItem, { message: msg }) : isIntermediateNarration ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(IntermediateNarrationRow, { message: msg }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                MessageItem_default,
                {
                  message: msg,
                  canBranch,
                  enableActions
                }
              ) })
            }
          ),
          isLastSummarized && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "summary-divider", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: "\u5DF2\u5F52\u6863\u5230\u6458\u8981" }) })
        ] }, entry.key);
      }),
      awaitingAssistantReply && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "chat-messages__item-wrapper chat-messages__item-wrapper--pending", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(AssistantReplyPending, {}) }),
      (currentDialogConfig?.compressionCount || 0) >= 3 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "compression-hint", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: "\u5BF9\u8BDD\u8F83\u957F\uFF0C\u5EFA\u8BAE" }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            type: "button",
            className: "compression-hint__link",
            onClick: handleCreateNewDialog,
            children: "\u5F00\u542F\u65B0\u5BF9\u8BDD"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: "\uFF08\u53EF\u7EE7\u627F\u5F53\u524D\u4E0A\u4E0B\u6587\uFF09" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(MemorySavedIndicator, { dialogConfig: currentDialogConfig })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(LoopStopBadge, { reason: visibleLoopStopReason }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "scroll-buttons", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        ScrollToTopButton,
        {
          isVisible: scrollToTopEnabled && showScrollToTop,
          onClick: scrollToTop
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        ScrollToBottomButton,
        {
          isVisible: scrollToBottomEnabled && showScrollToBottom,
          onClick: scrollToBottom
        }
      )
    ] })
  ] });
};
function getSavedMemories(dialogConfig) {
  if (!dialogConfig) return [];
  const list = [];
  const collect = (arr, fromSavedMemories = false) => {
    if (Array.isArray(arr)) {
      if (fromSavedMemories) {
        list.push(...arr.map((item) => {
          if (item && typeof item === "object") {
            return { ...item, type: item.type || "memory.saved" };
          }
          return item;
        }));
      } else {
        list.push(...arr);
      }
    }
  };
  collect(dialogConfig.memoryEvents);
  collect(dialogConfig.artifacts);
  collect(dialogConfig.savedMemories, true);
  const checkpoint = dialogConfig.runtimeCheckpoint;
  if (checkpoint && typeof checkpoint === "object") {
    collect(checkpoint.memoryEvents);
    collect(checkpoint.artifacts);
    collect(checkpoint.savedMemories, true);
  }
  const result = [];
  const seenContent = /* @__PURE__ */ new Set();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    if (item.type !== "memory.saved") continue;
    if (typeof item.content !== "string") continue;
    const content = item.content.trim();
    if (!content) continue;
    const sourceKind = item.sourceKind;
    if (typeof sourceKind !== "string") continue;
    const lowerSourceKind = sourceKind.toLowerCase();
    if (lowerSourceKind.includes("inferred") || lowerSourceKind.includes("understanding") || lowerSourceKind === "inferred-understanding") {
      continue;
    }
    if (lowerSourceKind !== "explicit-user-directive" && lowerSourceKind !== "agent-tool") {
      continue;
    }
    const normalized = content.toLowerCase().replace(/[\s\p{P}]/gu, "");
    if (!seenContent.has(normalized)) {
      seenContent.add(normalized);
      result.push({
        content,
        sourceKind: lowerSourceKind,
        visibility: item.visibility || "private",
        ...typeof item.id === "string" && item.id ? { id: item.id } : {},
        ...typeof item.dbKey === "string" && item.dbKey ? { dbKey: item.dbKey } : {}
      });
    }
  }
  return result;
}
var MemorySavedIndicator = ({ dialogConfig }) => {
  const memories = getSavedMemories(dialogConfig);
  if (memories.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "memory-saved-container", children: memories.map((mem) => {
    const isExplicit = mem.sourceKind === "explicit-user-directive";
    const prefix = isExplicit ? "\u5DF2\u4FDD\u5B58\u8BB0\u5FC6" : "\u52A9\u624B\u5DF2\u4FDD\u5B58\u8BB0\u5FC6";
    const memoryKey = mem.id ?? mem.dbKey ?? `${mem.sourceKind}:${mem.content}`;
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "memory-saved-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "memory-saved-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(LuBrain, { size: 14, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "memory-saved-prefix", children: [
        prefix,
        "\uFF1A"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "memory-saved-content", title: mem.content, children: mem.content })
    ] }, memoryKey);
  }) });
};
var MessageList_default = MessagesList;

// packages/chat/web/MessageInputContainer.tsx
var import_react31 = __toESM(require_react());

// packages/ai/agent/hooks/useAgentConfig.ts
var import_react14 = __toESM(require_react());
var useAgentConfig = () => {
  const dispatch = useAppDispatch();
  const [loadState, setLoadState] = (0, import_react14.useState)("idle");
  const currentDialogKey = useCurrentDialogKey();
  const currentDialogConfig = useCurrentDialogConfig();
  const agentKey = getPrimaryDialogAgentId(currentDialogConfig);
  const { currentToken, currentServer } = useAppSelector(selectRuntimeSnapshot);
  const agentConfig = useAppSelector(
    (state) => agentKey ? selectById(state, agentKey) ?? null : null
  );
  (0, import_react14.useEffect)(() => {
    if (currentDialogKey && !currentDialogConfig) {
      setLoadState("loading");
      return;
    }
    if (!agentKey) {
      setLoadState("idle");
      return;
    }
    if (agentConfig) {
      setLoadState("ready");
      return;
    }
    if (!currentToken && !isDeviceLocalDbKey(agentKey)) {
      setLoadState("loading");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    void (async () => {
      try {
        await dispatch(read({ dbKey: agentKey })).unwrap();
        if (cancelled) return;
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.warn("[useAgentConfig] Primary server failed to load agent config, trying multi-master fallback:", error);
        const candidateServers = ["https://us.nolo.chat", "https://nolo.chat"].filter(
          (s) => s !== currentServer
        );
        let fallbackSuccess = false;
        for (const fallbackServer of candidateServers) {
          try {
            await dispatch(read({ dbKey: agentKey, serverOrigin: fallbackServer })).unwrap();
            if (cancelled) return;
            setLoadState("ready");
            fallbackSuccess = true;
            break;
          } catch {
          }
        }
        if (cancelled) return;
        if (!fallbackSuccess) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    agentConfig,
    agentKey,
    currentDialogConfig,
    currentDialogKey,
    currentServer,
    currentToken,
    dispatch
  ]);
  return {
    agentConfig: agentConfig ?? null,
    isLoading: loadState === "loading",
    loadState
  };
};
var useAgentConfig_default = useAgentConfig;

// packages/chat/hooks/useSendPermission.ts
var import_react15 = __toESM(require_react());

// packages/chat/hooks/sendPermissionResolver.ts
function resolveSendPermissionState(input) {
  const {
    currentDialogKey,
    hasDialogConfig,
    agentKey,
    agentConfig,
    agentLoadState,
    currentUserId,
    userBalance,
    serverPrices
  } = input;
  if (currentDialogKey && !hasDialogConfig) {
    return {
      isLoading: true,
      sendPermission: { allowed: false }
    };
  }
  if (agentKey && !agentConfig && agentLoadState === "loading") {
    return {
      isLoading: true,
      sendPermission: { allowed: false }
    };
  }
  if (agentKey && !agentConfig && agentLoadState === "error") {
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "AGENT_LOAD_FAILED" }
    };
  }
  if (!agentConfig) {
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "NO_CONFIG" }
    };
  }
  const isCustomApi = agentConfig.apiSource === "custom";
  const isCliApi = agentConfig.apiSource === "cli";
  const SUBSCRIPTION_OAUTH_REFS = /* @__PURE__ */ new Set([
    "cursor",
    "chatgpt",
    "xai",
    "antigravity",
    "claude"
  ]);
  const isSubscriptionOAuth = SUBSCRIPTION_OAUTH_REFS.has(
    (agentConfig.apiKeyRef ?? "").trim().toLowerCase()
  );
  const isDeviceLocalOwner = agentConfig.userId === "local" && !currentUserId;
  const isOwner = isDeviceLocalOwner || !!currentUserId && agentConfig.userId === currentUserId;
  if (!isOwner) {
    const hasWhitelist = Array.isArray(agentConfig.whitelist) && agentConfig.whitelist.length > 0;
    if (hasWhitelist) {
      const isUserInWhitelist = !!currentUserId && (agentConfig.whitelist ?? []).includes(currentUserId);
      if (!isUserInWhitelist) {
        return {
          isLoading: false,
          sendPermission: { allowed: false, reason: "NOT_IN_WHITELIST" }
        };
      }
    }
  }
  if (isCustomApi || isCliApi || isSubscriptionOAuth) {
    return {
      isLoading: false,
      sendPermission: {
        allowed: true,
        pricing: {
          modelName: agentConfig.model || (isCliApi ? "copilot-cli" : "custom"),
          pricePerMessage: 0
        }
      }
    };
  }
  if (!serverPrices && !hasExplicitAgentPricing(agentConfig)) {
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "NO_MODEL_PRICING" }
    };
  }
  const prices = getPrices(agentConfig, serverPrices ?? null);
  const maxPrice = getFinalPrice(prices);
  const hasEnoughBalance = userBalance >= maxPrice;
  return {
    isLoading: false,
    sendPermission: {
      allowed: hasEnoughBalance,
      reason: hasEnoughBalance ? void 0 : "INSUFFICIENT_BALANCE",
      requiredAmount: hasEnoughBalance ? void 0 : maxPrice,
      pricing: {
        modelName: agentConfig.model,
        pricePerMessage: maxPrice
      }
    }
  };
}

// packages/chat/hooks/useSendPermission.ts
var EMPTY_MESSAGES = [];
var useSendPermission = (userBalance = 0) => {
  const { t } = useTranslation("chat");
  const currentUserId = useUserId();
  const currentDialogKey = useCurrentDialogKey();
  const currentDialogConfig = useCurrentDialogConfig();
  const agentKey = getPrimaryDialogAgentId(currentDialogConfig);
  const { agentConfig: fixedAgentConfig, isLoading, loadState } = useAgentConfig_default();
  const agentConfig = fixedAgentConfig ?? resolveDialogAutoAgentConfig(currentDialogConfig);
  const currentDialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;
  const isCustomApi = agentConfig?.apiSource === "custom";
  const isCliApi = agentConfig?.apiSource === "cli";
  const SUBSCRIPTION_OAUTH_REFS = /* @__PURE__ */ new Set([
    "cursor",
    "chatgpt",
    "xai",
    "antigravity",
    "claude"
  ]);
  const isSubscriptionOAuth = SUBSCRIPTION_OAUTH_REFS.has(
    (agentConfig?.apiKeyRef ?? "").trim().toLowerCase()
  );
  const serverPrices = agentConfig && !isCustomApi && !isCliApi && !isSubscriptionOAuth ? getModelPricing(agentConfig.provider || "", agentConfig.model) : null;
  const resolved = resolveSendPermissionState({
    currentDialogKey,
    hasDialogConfig: !!currentDialogConfig,
    agentKey,
    agentConfig,
    agentLoadState: loadState,
    currentUserId: currentUserId ?? null,
    userBalance,
    serverPrices
  });
  const messages = useAppSelector(
    (state) => currentDialogId ? selectAllMsgs(state, currentDialogId) ?? EMPTY_MESSAGES : EMPTY_MESSAGES
  );
  const hasInlineHandoffMessage = (0, import_react15.useMemo)(() => {
    return messages.some((message) => {
      if (message?.toolName === "runStreamingAgent") {
        let contentObj = null;
        try {
          contentObj = typeof message.content === "string" ? JSON.parse(message.content) : message.content;
        } catch (_) {
        }
        const inline = contentObj?.inline === true || contentObj?.handoff === true || message.toolPayload?.inline === true;
        if (inline) {
          return true;
        }
      }
      return false;
    });
  }, [messages]);
  const dialogConfigAny = currentDialogConfig;
  const isHandoffOrInlineDialog = dialogConfigAny?.presentationIntent === "handoff_speaker" || dialogConfigAny?.presentationIntent === "inline_result" || dialogConfigAny?.threadKind === "handoff" || dialogConfigAny?.threadKind === "inline" || hasInlineHandoffMessage;
  const isAgentLoadOrConfigError = resolved.sendPermission.reason === "AGENT_LOAD_FAILED" || resolved.sendPermission.reason === "NO_CONFIG";
  const finalSendPermission = { ...resolved.sendPermission };
  if (isHandoffOrInlineDialog && isAgentLoadOrConfigError) {
    finalSendPermission.allowed = true;
    finalSendPermission.reason = void 0;
  }
  const getErrorMessage = (reason, pricing) => {
    if (reason === "AGENT_LOAD_FAILED") {
      return t(
        "agentConfigLoadFailed",
        "\u667A\u80FD\u4F53\u914D\u7F6E\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002"
      );
    }
    if (reason === "NOT_IN_WHITELIST") {
      return t("notInWhitelist", "\u60A8\u4E0D\u5728\u8BE5\u5E94\u7528\u7684\u767D\u540D\u5355\u4E2D\uFF0C\u65E0\u6CD5\u4F7F\u7528\u3002");
    }
    if (reason === "INSUFFICIENT_BALANCE" && pricing) {
      return t("insufficientBalanceDetailed", {
        modelName: pricing.modelName,
        pricePerMessage: pricing.pricePerMessage.toFixed(2),
        balance: userBalance.toFixed(2)
      });
    }
    return t(
      reason === "NO_CONFIG" ? "agentConfigMissing" : reason === "NO_MODEL_PRICING" ? "modelPricingMissing" : "noAvailableAgentMessage"
    );
  };
  return {
    sendPermission: finalSendPermission,
    getErrorMessage,
    isLoading: isLoading || resolved.isLoading
  };
};

// packages/chat/dialog/AddAgentDialog.tsx
var import_react16 = __toESM(require_react());
var import_jsx_runtime14 = __toESM(require_jsx_runtime());
var OWNED_AGENT_DATA_TYPES = ["agent" /* AGENT */];
var SEARCH_DEBOUNCE_MS = 150;
function matchesAgentSearch(item, query) {
  const q = asTrimmedLowercaseString(query);
  if (!q) return true;
  const haystack = [
    item?.name,
    item?.introduction,
    item?.model,
    item?.provider,
    item?.description
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();
  return haystack.includes(q);
}
var AddAgentDialog = ({
  isOpen,
  onClose,
  onAddAgent,
  limit = 50,
  title,
  actionLabel,
  selectionMode = "multiple",
  excludeAgentIds = [],
  emptyLabel,
  preferredCapabilities,
  preferredProvider
}) => {
  const { t } = useTranslation(["chat", "translation"]);
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const favoriteAgentIds = useFavoriteAgentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();
  const favoritesInitialized = useFavoritesInitialized();
  const [selectedAgents, setSelectedAgents] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [searchTerm, setSearchTerm] = (0, import_react16.useState)("");
  const [debouncedSearch, setDebouncedSearch] = (0, import_react16.useState)("");
  const [highlightedIndex, setHighlightedIndex] = (0, import_react16.useState)(-1);
  const [limitNotice, setLimitNotice] = (0, import_react16.useState)(false);
  const searchInputRef = (0, import_react16.useRef)(null);
  const listRef = (0, import_react16.useRef)(null);
  const cardRefs = (0, import_react16.useRef)(/* @__PURE__ */ new Map());
  const isSingleSelect = selectionMode === "single";
  const publicAgentFetchLimit = Math.max(limit, 200);
  (0, import_react16.useEffect)(() => {
    if (isOpen && !favoritesInitialized) {
      dispatch(initFavorites());
    }
  }, [dispatch, favoritesInitialized, isOpen]);
  (0, import_react16.useEffect)(() => {
    if (!isOpen) {
      setSelectedAgents(/* @__PURE__ */ new Set());
      setSearchTerm("");
      setDebouncedSearch("");
      setHighlightedIndex(-1);
      setLimitNotice(false);
    }
  }, [isOpen]);
  (0, import_react16.useEffect)(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm, isOpen]);
  (0, import_react16.useEffect)(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);
  const {
    loading: publicLoading,
    data: publicAgents = [],
    error: publicError,
    retry: retryPublicAgents
  } = usePublicAgents({
    limit: publicAgentFetchLimit,
    sortBy: "recommended",
    reloadMode: "catalog",
    summary: true
  });
  const {
    loading: ownedLoading,
    data: ownedAgents = [],
    reload: reloadOwnedAgents,
    clearCache: clearOwnedAgentsCache
  } = useUserData(
    OWNED_AGENT_DATA_TYPES,
    currentUserId || "",
    publicAgentFetchLimit,
    { partialDataStrategy: "hydrated-cache" }
  );
  const handleReload = (0, import_react16.useCallback)(async () => {
    retryPublicAgents();
    clearOwnedAgentsCache();
    await reloadOwnedAgents();
  }, [clearOwnedAgentsCache, reloadOwnedAgents, retryPublicAgents]);
  const getAgentId = (0, import_react16.useCallback)(
    (item) => String(item?.dbKey || item?.id || ""),
    []
  );
  const getAgentMergeId = (0, import_react16.useCallback)(
    (item) => String(item?.id || item?.dbKey || ""),
    []
  );
  const getAgentIdentifiers = (0, import_react16.useCallback)(
    (item) => getAgentRecordIdentifiers(item),
    []
  );
  const getAgentTimestamp = (0, import_react16.useCallback)(
    (item) => getAgentRecordTimestamp(item),
    []
  );
  const resolveModelInfo = (0, import_react16.useCallback)((item) => {
    let providerStr = String(item.provider ?? "").toLowerCase();
    let modelStr = String(item.model ?? "");
    if (modelStr.includes("/")) {
      const slash = modelStr.indexOf("/");
      if (!providerStr) {
        providerStr = modelStr.slice(0, slash).toLowerCase();
      }
      modelStr = modelStr.slice(slash + 1);
    }
    try {
      return {
        provider: providerStr,
        config: getModelConfig(providerStr, modelStr)
      };
    } catch {
      const detectedProvider = getProviderByModelName(modelStr);
      if (!detectedProvider) {
        return {
          provider: providerStr,
          config: null
        };
      }
      return {
        provider: detectedProvider,
        config: getModelConfig(detectedProvider, modelStr)
      };
    }
  }, []);
  const matchesPreferredCapabilities = (0, import_react16.useCallback)(
    (item) => {
      if (!preferredCapabilities) return true;
      const { config } = resolveModelInfo(item);
      if (!config) return false;
      const itemHasImageOutput = !!(config.hasImageOutput ?? config.supportsImageOutput);
      if (preferredCapabilities.hasImageOutput) {
        return itemHasImageOutput;
      }
      if (preferredCapabilities.hasVision) {
        return config.hasVision;
      }
      return true;
    },
    [preferredCapabilities, resolveModelInfo]
  );
  const getProviderPriority = (0, import_react16.useCallback)(
    (item) => {
      if (!preferredProvider) return 0;
      const normalizedPreferredProvider = preferredProvider.toLowerCase();
      const { provider } = resolveModelInfo(item);
      return provider === normalizedPreferredProvider ? 1 : 0;
    },
    [preferredProvider, resolveModelInfo]
  );
  const excludeAgentIdKey = JSON.stringify(excludeAgentIds.map(String));
  const excludeAgentIdSet = (0, import_react16.useMemo)(
    () => new Set(JSON.parse(excludeAgentIdKey)),
    [excludeAgentIdKey]
  );
  const baseAgents = (0, import_react16.useMemo)(() => {
    const favoriteSet = new Set(favoriteAgentIds.map(String));
    const mergedById = /* @__PURE__ */ new Map();
    const originalOrder = /* @__PURE__ */ new Map();
    const mergeItem = (item, source, index) => {
      const agentId = getAgentId(item);
      const mergeId = getAgentMergeId(item);
      if (!agentId || !mergeId) return;
      const identifiers = getAgentIdentifiers(item);
      const isFavorite = identifiers.some(
        (identifier) => favoriteSet.has(identifier)
      );
      const isOwned = source === "owned" || !!currentUserId && item?.userId === currentUserId;
      const existing = mergedById.get(mergeId);
      if (!existing) {
        mergedById.set(mergeId, {
          ...item,
          __isFavorite: isFavorite,
          __isOwned: isOwned
        });
        originalOrder.set(mergeId, index);
        return;
      }
      const shouldPreferNext = isOwned && !existing.__isOwned || getAgentTimestamp(item) > getAgentTimestamp(existing) && source === "owned";
      mergedById.set(mergeId, {
        ...shouldPreferNext ? existing : item,
        ...shouldPreferNext ? item : existing,
        __isFavorite: Boolean(existing.__isFavorite || isFavorite),
        __isOwned: Boolean(existing.__isOwned || isOwned)
      });
    };
    ownedAgents.forEach((item, index) => {
      mergeItem(item, "owned", index);
    });
    publicAgents.forEach((item, index) => {
      mergeItem(item, "public", ownedAgents.length + index);
    });
    const filtered = Array.from(mergedById.values()).filter((item) => {
      const identifiers = getAgentIdentifiers(item);
      return !identifiers.some(
        (identifier) => excludeAgentIdSet.has(identifier)
      );
    });
    const shouldPreferSimilarModels = !!(preferredCapabilities || preferredProvider);
    const capabilityMatched = shouldPreferSimilarModels ? filtered.filter(matchesPreferredCapabilities) : filtered;
    const baseList = shouldPreferSimilarModels && capabilityMatched.length > 0 ? capabilityMatched : filtered;
    const providerGroups = /* @__PURE__ */ new Map();
    for (const item of baseList) {
      const p = getProviderPriority(item);
      const group = providerGroups.get(p) ?? [];
      group.push(item);
      providerGroups.set(p, group);
    }
    const sortedProviderKeys = Array.from(providerGroups.keys()).sort((a, b) => b - a);
    const result = [];
    for (const pKey of sortedProviderKeys) {
      const group = providerGroups.get(pKey);
      const sortable = group.map((item) => {
        const identifiers = getAgentIdentifiers(item);
        const favAt = identifiers.reduce(
          (latest, identifier) => Math.max(latest, Number(favoritedAtById[identifier]) || 0),
          0
        );
        return {
          key: getAgentMergeId(item) || getAgentId(item),
          favoritedAt: favAt || void 0,
          isOwned: Boolean(item.__isOwned),
          isPublic: !item.__isOwned,
          updatedAt: getAgentTimestamp(item),
          order: originalOrder.get(getAgentMergeId(item) || getAgentId(item)) ?? void 0
        };
      });
      const sortedItems = sortAgentsFavoriteOwnedPublic(sortable);
      const orderMap = new Map(sortedItems.map((s, i) => [s.key, i]));
      const sortedGroup = [...group].sort(
        (a, b) => (orderMap.get(getAgentMergeId(a) || getAgentId(a)) ?? 0) - (orderMap.get(getAgentMergeId(b) || getAgentId(b)) ?? 0)
      );
      result.push(...sortedGroup);
    }
    return result.slice(0, limit);
  }, [
    currentUserId,
    excludeAgentIdSet,
    favoriteAgentIds,
    favoritedAtById,
    getAgentId,
    getAgentIdentifiers,
    getAgentMergeId,
    getAgentTimestamp,
    limit,
    ownedAgents,
    preferredCapabilities,
    preferredProvider,
    publicAgents,
    matchesPreferredCapabilities,
    getProviderPriority
  ]);
  const visibleAgents = (0, import_react16.useMemo)(() => {
    const q = debouncedSearch.trim();
    if (!q) return baseAgents;
    return baseAgents.filter((item) => matchesAgentSearch(item, q));
  }, [baseAgents, debouncedSearch]);
  const loading = publicLoading || ownedLoading;
  const error = publicError;
  const isSearchPending = asTrimmedLowercaseString(searchTerm) !== asTrimmedLowercaseString(debouncedSearch);
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const selectionAtLimit = !isSingleSelect && selectedAgents.size >= limit;
  const safeHighlightedIndex = visibleAgents.length === 0 ? -1 : highlightedIndex < 0 ? highlightedIndex : Math.min(highlightedIndex, visibleAgents.length - 1);
  const highlightedIndexRef = (0, import_react16.useRef)(safeHighlightedIndex);
  (0, import_react16.useEffect)(() => {
    highlightedIndexRef.current = safeHighlightedIndex;
  }, [safeHighlightedIndex]);
  const scrollHighlightIntoView = (0, import_react16.useCallback)((index) => {
    if (index < 0) return;
    requestAnimationFrame(() => {
      cardRefs.current.get(index)?.scrollIntoView({ block: "nearest" });
    });
  }, []);
  const handleAddAgent = (0, import_react16.useCallback)(
    (agentId) => {
      if (!agentId) return;
      onAddAgent(agentId);
      onClose();
    },
    [onAddAgent, onClose]
  );
  const toggleSelection = (0, import_react16.useCallback)(
    (agentId) => {
      if (!agentId) return;
      if (selectedAgents.has(agentId)) {
        setSelectedAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentId);
          return next;
        });
        setLimitNotice(false);
        return;
      }
      if (selectedAgents.size >= limit) {
        setLimitNotice(true);
        return;
      }
      setSelectedAgents((prev) => {
        const next = new Set(prev);
        next.add(agentId);
        return next;
      });
      setLimitNotice(false);
    },
    [limit, selectedAgents]
  );
  const addSelected = (0, import_react16.useCallback)(() => {
    if (selectedAgents.size > 0) {
      const ids = Array.from(selectedAgents);
      onAddAgent(ids.length === 1 ? ids[0] : ids);
      onClose();
    }
  }, [selectedAgents, onAddAgent, onClose]);
  const clearSearch = (0, import_react16.useCallback)(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    highlightedIndexRef.current = -1;
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);
  const moveHighlight = (0, import_react16.useCallback)(
    (delta) => {
      if (visibleAgents.length === 0) return;
      const prev = highlightedIndexRef.current;
      let next;
      if (prev < 0) {
        next = delta > 0 ? 0 : visibleAgents.length - 1;
      } else {
        next = prev + delta;
        if (next < 0) next = 0;
        if (next >= visibleAgents.length) next = visibleAgents.length - 1;
      }
      highlightedIndexRef.current = next;
      setHighlightedIndex(next);
      scrollHighlightIntoView(next);
    },
    [scrollHighlightIntoView, visibleAgents.length]
  );
  const activateHighlighted = (0, import_react16.useCallback)(() => {
    if (safeHighlightedIndex < 0 || safeHighlightedIndex >= visibleAgents.length) {
      return;
    }
    const item = visibleAgents[safeHighlightedIndex];
    const agentId = getAgentId(item);
    if (!agentId) return;
    if (isSingleSelect) {
      handleAddAgent(agentId);
      return;
    }
    if (!selectedAgents.has(agentId) && selectionAtLimit) {
      setLimitNotice(true);
      return;
    }
    toggleSelection(agentId);
  }, [
    getAgentId,
    handleAddAgent,
    isSingleSelect,
    safeHighlightedIndex,
    selectedAgents,
    selectionAtLimit,
    toggleSelection,
    visibleAgents
  ]);
  const handleSearchKeyDown = (0, import_react16.useCallback)(
    (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        listRef.current?.focus();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        listRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && searchTerm) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && safeHighlightedIndex >= 0 && !event.nativeEvent.isComposing) {
        if (event.key === " ") return;
        event.preventDefault();
        activateHighlighted();
      }
    },
    [
      activateHighlighted,
      clearSearch,
      moveHighlight,
      safeHighlightedIndex,
      searchTerm
    ]
  );
  const handleListKeyDown = (0, import_react16.useCallback)(
    (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        if (visibleAgents.length > 0) {
          highlightedIndexRef.current = 0;
          setHighlightedIndex(0);
          scrollHighlightIntoView(0);
        }
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        if (visibleAgents.length > 0) {
          const last = visibleAgents.length - 1;
          highlightedIndexRef.current = last;
          setHighlightedIndex(last);
          scrollHighlightIntoView(last);
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateHighlighted();
        return;
      }
      if (event.key === "Escape" && searchTerm) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
      }
    },
    [
      activateHighlighted,
      clearSearch,
      moveHighlight,
      scrollHighlightIntoView,
      searchTerm,
      visibleAgents.length
    ]
  );
  const renderLoading = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "state-container loading", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuRefreshCw, { className: "spin-icon", size: 24, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: t("LoadingAgents") })
  ] });
  const renderError = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "state-container error", role: "alert", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { children: t("FailedToLoadAgents") }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Button_default, { onClick: handleReload, size: "small", children: t("Retry") })
  ] });
  const renderEmptyCatalog = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "state-container empty", role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuSearch, { size: 24, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: emptyLabel ?? t("NoAgents") }),
    !favoritesInitialized && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "state-hint", children: t("loadingFavoritesHint", "\u6B63\u5728\u540C\u6B65\u6536\u85CF\u2026") })
  ] });
  const renderNoMatch = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "state-container empty", role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuSearch, { size: 24, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: t("NoMatchingAgents", "\u6CA1\u6709\u5339\u914D\u300C{{query}}\u300D\u7684\u667A\u80FD\u4F53", {
      query: debouncedSearch.trim()
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Button_default, { onClick: clearSearch, size: "small", variant: "ghost", children: t("clearSearch", "\u6E05\u7A7A\u641C\u7D22") })
  ] });
  const renderAgents = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "agent-container", children: [
    !isSingleSelect && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "batch-bar", "aria-live": "polite", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { children: [
        t("selectedAgentsCount", "Selected {{count}} Agents", {
          count: selectedAgents.size
        }),
        selectionAtLimit ? ` \xB7 ${t("selectionLimitReached", "\u5DF2\u8FBE\u4E0A\u9650 {{limit}}", {
          limit
        })}` : ""
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "batch-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          Button_default,
          {
            onClick: addSelected,
            size: "small",
            variant: "primary",
            disabled: selectedAgents.size === 0,
            "aria-disabled": selectedAgents.size === 0,
            children: actionLabel ?? t("addSelectedAgents", "Add selected")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          Button_default,
          {
            onClick: () => {
              setSelectedAgents(/* @__PURE__ */ new Set());
              setLimitNotice(false);
            },
            size: "small",
            variant: "ghost",
            disabled: selectedAgents.size === 0,
            children: t("clearSelection", "Clear")
          }
        )
      ] })
    ] }),
    limitNotice && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "limit-notice", role: "status", children: t(
      "selectionLimitNotice",
      "\u6700\u591A\u9009\u62E9 {{limit}} \u4E2A\u667A\u80FD\u4F53\uFF0C\u8BF7\u5148\u53D6\u6D88\u90E8\u5206\u5DF2\u9009",
      { limit }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      "div",
      {
        className: "agent-grid",
        ref: listRef,
        role: "listbox",
        "aria-label": t("SelectAgentToAdd", "Select an Agent to add to the dialog"),
        "aria-multiselectable": !isSingleSelect,
        "aria-activedescendant": safeHighlightedIndex >= 0 ? `add-agent-option-${safeHighlightedIndex}` : void 0,
        tabIndex: 0,
        onKeyDown: handleListKeyDown,
        children: visibleAgents.map((item, index) => {
          const agentId = getAgentId(item);
          const agentKey = getAgentMergeId(item) || agentId;
          const isSelected = selectedAgents.has(agentId);
          const isHighlighted = index === safeHighlightedIndex;
          const isDisabledUnselected = !isSingleSelect && selectionAtLimit && !isSelected;
          const isRecommended = !!preferredCapabilities && matchesPreferredCapabilities(item);
          return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
            "div",
            {
              id: `add-agent-option-${index}`,
              role: "option",
              "aria-selected": isSingleSelect ? isHighlighted : isSelected,
              "aria-disabled": isDisabledUnselected || void 0,
              ref: (el) => {
                cardRefs.current.set(index, el);
              },
              className: [
                "agent-card",
                !isSingleSelect && isSelected ? "selected" : "",
                isHighlighted ? "highlighted" : "",
                isDisabledUnselected ? "disabled" : ""
              ].filter(Boolean).join(" "),
              onMouseEnter: () => {
                highlightedIndexRef.current = index;
                setHighlightedIndex(index);
                scrollHighlightIntoView(index);
              },
              onClick: () => {
                if (isSingleSelect) {
                  handleAddAgent(agentId);
                  return;
                }
                if (isDisabledUnselected) {
                  setLimitNotice(true);
                  return;
                }
                toggleSelection(agentId);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "card-header", children: [
                  !isSingleSelect && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "select-btn",
                      tabIndex: -1,
                      disabled: isDisabledUnselected,
                      onClick: (e) => {
                        e.stopPropagation();
                        if (isDisabledUnselected) {
                          setLimitNotice(true);
                          return;
                        }
                        toggleSelection(agentId);
                      },
                      "aria-label": isSelected ? t("clearSelection", "Clear") : t("SelectAgentToAdd"),
                      children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: `checkbox ${isSelected ? "checked" : ""}`, children: isSelected && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuCheck, { size: 12, "aria-hidden": "true" }) })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "card-info", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "avatar", children: item.name?.[0]?.toUpperCase() || "?" }),
                    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "info", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { className: "title", children: item.name || t("Unnamed") }),
                      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "tags", children: [
                        item.model && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "tag", children: item.model }),
                        item.__isFavorite && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "tag tag-highlight", children: t("favoriteAgent", "Favorite") }),
                        item.__isOwned && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "tag tag-highlight", children: t("myAgent", "Mine") }),
                        isRecommended && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "tag tag-recommended", children: t("capabilityMatch", "\u80FD\u529B\u5339\u914D") }),
                        !item.__isFavorite && !item.__isOwned && !isRecommended && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "tag", children: t("recommended", "\u63A8\u8350") })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "card-actions", children: [
                    item.outputPrice && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "price", children: formatCredits(
                      item.outputPrice,
                      t("creditsUnit", "credits"),
                      2
                    ) }),
                    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "add-btn",
                        tabIndex: -1,
                        disabled: isDisabledUnselected,
                        onClick: (e) => {
                          e.stopPropagation();
                          handleAddAgent(agentId);
                        },
                        "aria-label": actionLabel ?? t("AddAgent", "\u6DFB\u52A0\u667A\u80FD\u4F53"),
                        title: actionLabel ?? t("AddAgent", "\u6DFB\u52A0\u667A\u80FD\u4F53"),
                        children: isSingleSelect ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuPlus, { size: 14, "aria-hidden": "true" })
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "description", children: item.introduction || t("NoDescription") })
              ]
            },
            agentKey
          );
        })
      }
    )
  ] });
  const renderBody = () => {
    if (error) return renderError();
    if (loading && baseAgents.length === 0) return renderLoading();
    if (!loading && baseAgents.length === 0) return renderEmptyCatalog();
    if (baseAgents.length > 0 && visibleAgents.length === 0) {
      return renderNoMatch();
    }
    return renderAgents();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    Dialog,
    {
      isOpen,
      onClose,
      title: title ?? t("AddAgent"),
      size: "large",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "add-agent-content", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("search", { className: "search-bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuSearch, { className: "search-icon", size: 16, "aria-hidden": true }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "input",
              {
                ref: searchInputRef,
                type: "search",
                className: "search-input",
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                onKeyDown: handleSearchKeyDown,
                placeholder: t("searchAgentsPlaceholder", "\u641C\u7D22\u540D\u79F0\u3001\u6A21\u578B\u6216\u7B80\u4ECB\u2026"),
                "aria-label": t("searchAgentsPlaceholder", "\u641C\u7D22\u540D\u79F0\u3001\u6A21\u578B\u6216\u7B80\u4ECB\u2026"),
                autoComplete: "off",
                spellCheck: false
              }
            ),
            isSearchPending && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "search-pending", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuRefreshCw, { className: "spin-icon", size: 14, "aria-hidden": "true" }) }),
            searchTerm.length > 0 && !isSearchPending && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "button",
              {
                type: "button",
                className: "search-clear",
                onClick: clearSearch,
                "aria-label": t("clearSearch", "\u6E05\u7A7A\u641C\u7D22"),
                children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuX, { size: 14, "aria-hidden": "true" })
              }
            )
          ] }),
          renderBody()
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: `
        .add-agent-content {
          padding: ${theme.space[4]};
          display: flex;
          flex-direction: column;
          gap: ${theme.space[4]};
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: ${theme.space[2]};
          padding: ${theme.space[2]} ${theme.space[3]};
          border: 1px solid ${theme.border};
          border-radius: var(--radius-xs);
          background: ${theme.backgroundSecondary};
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .search-bar:focus-within {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 3px ${theme.primary}22;
        }

        .search-icon {
          color: ${theme.textSecondary};
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: ${theme.text};
          font-size: 14px;
          line-height: 1.4;
          padding: ${theme.space[1]} 0;
        }

        .search-input::placeholder {
          color: ${theme.textSecondary};
        }

        .search-clear,
        .search-pending {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: ${theme.textSecondary};
          border-radius: var(--radius-xs);
          cursor: pointer;
          flex-shrink: 0;
        }

        .search-clear:hover {
          background: ${theme.backgroundHover};
          color: ${theme.text};
        }

        .search-pending {
          cursor: default;
          color: ${theme.primary};
        }

        .state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${theme.space[4]};
          padding: ${theme.space[12]} ${theme.space[4]};
          text-align: center;
          min-height: 300px;
          color: ${theme.textSecondary};
        }

        .state-container.loading { color: ${theme.primary}; }
        .state-container.error { color: ${theme.error}; }

        .state-hint {
          font-size: 12px;
          color: ${theme.textTertiary || theme.textSecondary};
        }

        .spin-icon {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .agent-container {
          display: flex;
          flex-direction: column;
          gap: ${theme.space[4]};
        }

        .batch-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: ${theme.space[3]} ${theme.space[4]};
          background: ${theme.primaryGhost};
          border-radius: ${theme.space[3]};
          border: 1px solid ${theme.primary}30;
          font-size: 14px;
          font-weight: 500;
          color: ${theme.primary};
        }

        .batch-actions {
          display: flex;
          gap: ${theme.space[2]};
        }

        .limit-notice {
          padding: ${theme.space[2]} ${theme.space[3]};
          border-radius: var(--radius-xs);
          background: ${theme.warning ? `${theme.warning}18` : `${theme.primary}12`};
          color: ${theme.warning || theme.primary};
          font-size: 13px;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${theme.space[4]};
          outline: none;
        }

        .agent-grid:focus-visible {
          box-shadow: 0 0 0 2px ${theme.primary}40;
          border-radius: var(--radius-xs);
        }

        .agent-card {
          background: ${theme.backgroundSecondary};
          border: 1px solid ${theme.border};
          border-radius: var(--radius-xs);
          padding: ${theme.space[4]};
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: ${theme.space[3]};
          cursor: pointer;
        }

        .agent-card:hover {
          transform: translateY(-2px);
          border-color: ${theme.primary}40;
          box-shadow: 0 8px 32px -8px ${theme.shadowLight};
        }

        .agent-card.selected {
          border-color: ${theme.primary};
          background: ${theme.primaryGhost}20;
        }

        .agent-card.highlighted {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 2px ${theme.primary}35;
        }

        .agent-card.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .agent-card.disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: ${theme.space[3]};
        }

        .select-btn {
          background: none;
          border: none;
          padding: ${theme.space[1]};
          cursor: pointer;
          border-radius: var(--radius-xs);
        }

        .select-btn:hover:not(:disabled) {
          background: ${theme.backgroundHover};
        }

        .select-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid ${theme.border};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${theme.background};
          transition: all 0.2s ease;
        }

        .checkbox.checked {
          background: ${theme.primary};
          border-color: ${theme.primary};
          color: white;
        }

        .card-info {
          display: flex;
          align-items: center;
          gap: ${theme.space[3]};
          flex: 1;
          min-width: 0;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          background: ${theme.primaryGhost}40;
          color: ${theme.primary};
          flex-shrink: 0;
        }

        .info {
          min-width: 0;
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 ${theme.space[1]} 0;
          color: ${theme.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tags {
          display: flex;
          gap: ${theme.space[1]};
          flex-wrap: wrap;
        }

        .tag {
          font-size: 12px;
          color: ${theme.textSecondary};
          background: ${theme.backgroundTertiary};
          padding: 2px ${theme.space[2]};
          border-radius: var(--radius-xs);
          border: 1px solid ${theme.border};
        }

        .tag-recommended {
          color: ${theme.primary};
          background: ${theme.primary}18;
          border-color: ${theme.primary}40;
          font-weight: 500;
        }

        .tag-highlight {
          color: ${theme.primary};
          background: ${theme.primaryGhost};
          border-color: ${theme.primary}30;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: ${theme.space[2]};
          flex-shrink: 0;
        }

        .price {
          font-size: 12px;
          font-weight: 600;
          color: ${theme.primary};
          background: ${theme.primaryGhost};
          padding: ${theme.space[1]} ${theme.space[2]};
          border-radius: var(--radius-xs);
          font-family: var(--font-mono, monospace);
        }

        .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background: ${theme.primary};
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 12px -2px ${theme.primary}40;
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .description {
          font-size: 14px;
          line-height: 1.6;
          color: ${theme.textSecondary};
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        @media (max-width: 768px) {
          .agent-grid {
            grid-template-columns: 1fr;
            gap: ${theme.space[3]};
          }

          .batch-bar {
            flex-direction: column;
            gap: ${theme.space[3]};
            text-align: center;
          }

          .batch-actions {
            justify-content: center;
          }
        }
      ` })
      ]
    }
  );
};
var AddAgentDialog_default = AddAgentDialog;

// packages/chat/web/messageInputAgentUi.ts
var formatImageWaitHint = (range) => {
  if (!range || typeof range.min !== "number" || typeof range.max !== "number") {
    return void 0;
  }
  return `\u901A\u5E38\u9700\u8981 ${range.min}-${range.max} \u79D2`;
};
function normalizeFavoriteAgentSummary(agentKey, agent) {
  const rawName = asTrimmedString(agent?.name);
  return {
    agentKey,
    name: rawName || agentKey
  };
}
function resolveFavoriteAgentSummaries(sources) {
  return sources.flatMap(
    (source) => source.agent ? [normalizeFavoriteAgentSummary(source.agentKey, source.agent)] : []
  );
}
function filterFavoriteAgentsByQuery(input) {
  const { favoriteAgents, isAgentMentionActive, query } = input;
  if (!isAgentMentionActive || favoriteAgents.length === 0) return [];
  const normalizedQuery = asTrimmedLowercaseString(query);
  if (!normalizedQuery) return favoriteAgents;
  return favoriteAgents.filter((agent) => {
    const name = agent.name.toLowerCase();
    const key = agent.agentKey.toLowerCase();
    return name.includes(normalizedQuery) || key.includes(normalizedQuery);
  });
}
function resolveAgentModelIdentity(agent) {
  const safeAgent = agent ?? {};
  let providerKey = (safeAgent.provider || "").toLowerCase();
  let modelName = safeAgent.model ?? "";
  if (modelName.includes("/")) {
    const slash = modelName.indexOf("/");
    if (!providerKey) providerKey = modelName.slice(0, slash);
    modelName = modelName.slice(slash + 1);
  }
  let modelConfig = null;
  try {
    modelConfig = getModelConfig(providerKey, modelName);
  } catch {
    try {
      const detected = getProviderByModelName(modelName);
      if (detected) {
        modelConfig = getModelConfig(detected, modelName);
        providerKey = detected;
      }
    } catch {
      modelConfig = null;
    }
  }
  return { providerKey, modelConfig };
}
function toPricingModel(modelConfig) {
  if (!modelConfig) return void 0;
  return {
    pricePerImage: modelConfig.pricePerImage,
    imageTokenPricePerMillion: modelConfig.imageTokenPricePerMillion,
    imageOutputTokenEstimateBySize: modelConfig.imageOutputTokenEstimateBySize
  };
}
function resolveImageProfiles(args) {
  const { providerKey, modelConfig } = args;
  if (!modelConfig?.imageGenerationProfiles?.length) {
    return { imageProfiles: [] };
  }
  const imageProfiles = modelConfig.imageGenerationProfiles.flatMap((profile) => {
    let profileModelConfig = null;
    try {
      profileModelConfig = getModelConfig(
        providerKey,
        profile.imageModel
      );
    } catch {
      profileModelConfig = null;
    }
    const pricingModel = toPricingModel(profileModelConfig);
    return [
      {
        key: profile.key,
        label: profile.label,
        imageModelOverride: profile.imageModel,
        waitHint: formatImageWaitHint(profile.waitTimeSeconds) ?? formatImageWaitHint(profileModelConfig?.imageGenerationWaitTimeSeconds),
        pricingModel,
        pricePerImage: getApproxPricePerImage(pricingModel, void 0) ?? void 0
      }
    ];
  });
  return {
    imageProfiles,
    defaultImageProfileKey: modelConfig.imageGenerationProfiles.find(
      (profile) => profile.imageModel === modelConfig.name
    )?.key
  };
}
function resolveMessageInputAgentUi(input) {
  const { agent, userId } = input;
  const safeAgent = agent ?? {};
  const switchModelQueryUserId = asOptionalTrimmedString(userId) ?? asOptionalTrimmedString(safeAgent.userId) ?? null;
  const { providerKey, modelConfig } = resolveAgentModelIdentity(safeAgent);
  const hasVision = resolveAgentImageInputSupport(safeAgent);
  if (!modelConfig) {
    return {
      switchModelQueryUserId,
      currentModelCapabilities: {
        hasImageOutput: false,
        hasVision,
        provider: providerKey || "custom"
      },
      imageUiConfig: null
    };
  }
  const imageMode = getPublicImageAgentMode(agent);
  const hasImageOutput = !!(modelConfig.hasImageOutput ?? modelConfig.supportsImageOutput) || imageMode === "continuous";
  const currentModelCapabilities = {
    hasImageOutput,
    hasVision,
    provider: providerKey
  };
  if (!hasImageOutput) {
    return {
      switchModelQueryUserId,
      currentModelCapabilities,
      imageUiConfig: {
        showControls: false,
        supportsImageConfig: false,
        supportedAspectRatios: [],
        supportedImageSizes: [],
        waitHint: void 0,
        defaultImageProfileKey: void 0,
        imageProfiles: [],
        pricingModel: void 0
      }
    };
  }
  const supportsImageConfig = !!modelConfig.supportsImageConfig || imageMode === "continuous";
  const supportedAspectRatios = modelConfig.supportedAspectRatios ?? (imageMode === "continuous" ? ["1:1", "4:3", "16:9", "9:16"] : ["1:1", "4:3", "16:9", "9:16", "21:9"]);
  const supportedImageSizes = modelConfig.supportedImageSizes ?? (imageMode === "continuous" ? ["1K", "2K"] : ["1K", "2K", "4K"]);
  const pricingModel = toPricingModel(modelConfig);
  const { imageProfiles, defaultImageProfileKey } = resolveImageProfiles({
    providerKey,
    modelConfig
  });
  return {
    switchModelQueryUserId,
    currentModelCapabilities,
    imageUiConfig: {
      showControls: true,
      supportsImageConfig,
      supportedAspectRatios,
      supportedImageSizes,
      waitHint: formatImageWaitHint(modelConfig.imageGenerationWaitTimeSeconds),
      defaultImageProfileKey,
      imageProfiles,
      pricePerImage: getApproxPricePerImage(pricingModel, void 0) ?? void 0,
      pricingModel
    }
  };
}

// packages/chat/web/MessageInputShell.tsx
var import_jsx_runtime15 = __toESM(require_jsx_runtime());
var BaseShell = ({ containerClassName, children }) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: `message-input ${containerClassName}`, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "message-input__wrapper", children }) });
var LoadingPlaceholder = () => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(BaseShell, { containerClassName: "message-input--skeleton", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "message-input__skeleton-bar", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(StreamingIndicator_default, {}) }) });
var ErrorMessage = ({
  message,
  showRecharge,
  onRecharge,
  showChooseModel,
  onChooseModel
}) => {
  const { t } = useTranslation("chat");
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(BaseShell, { containerClassName: "message-input--error", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "message-input__error-box", children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "message-input__error-text", children: message }),
    (showRecharge || showChooseModel) && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "message-input__error-actions", children: [
      showRecharge && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "button",
        {
          type: "button",
          className: "message-input__recharge-link",
          onClick: onRecharge,
          children: t("recharge", "\u5145\u503C")
        }
      ),
      showChooseModel && onChooseModel && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "button",
        {
          type: "button",
          className: "message-input__recharge-link",
          onClick: onChooseModel,
          children: t("chooseAnotherModelContinue", "\u9009\u62E9\u5176\u4ED6\u6A21\u578B\u7EE7\u7EED")
        }
      )
    ] })
  ] }) });
};

// packages/chat/web/MessageInputCore.tsx
var import_react30 = __toESM(require_react());

// packages/app/hooks/useClipboardFiles.ts
var import_react17 = __toESM(require_react());
function deduplicateFiles(files) {
  const fileArray = Array.from(files);
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const file of fileArray) {
    const signature = `${file.name}-${file.size}-${file.type}-${file.lastModified ?? 0}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      result.push(file);
    }
  }
  return result;
}
function useClipboardFiles(onFiles) {
  const handlePaste = (0, import_react17.useCallback)(
    (event) => {
      const rawFiles = event.clipboardData?.files;
      if (rawFiles && rawFiles.length > 0) {
        event.stopPropagation();
        const uniqueFiles = deduplicateFiles(rawFiles);
        if (uniqueFiles.length > 0) {
          onFiles(uniqueFiles);
        }
      }
    },
    [onFiles]
  );
  return { handlePaste };
}

// packages/app/hooks/useElementSizeVar.ts
var import_react18 = __toESM(require_react());
var defaultGetSize = (rect) => rect.height;
function useElementSizeVar(ref, cssVarName, getSize = defaultGetSize) {
  (0, import_react18.useEffect)(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const size = getSize(entry.contentRect);
      document.documentElement.style.setProperty(cssVarName, `${size}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, cssVarName, getSize]);
}

// packages/chat/web/messageInputKeyBehavior.ts
var decideMessageInputKeyAction = ({
  key,
  shiftKey,
  isMobile,
  hasMentionMenu,
  shouldDeferEnterForIme: shouldDeferEnterForIme2
}) => {
  if (hasMentionMenu) {
    if (key === "ArrowDown") {
      return "mention-next";
    }
    if (key === "ArrowUp") {
      return "mention-prev";
    }
    if (key === "Enter") {
      if (shouldDeferEnterForIme2) {
        return "none";
      }
      return "mention-select";
    }
    if (key === "Tab") {
      return "mention-select";
    }
    if (key === "Escape") {
      return "mention-close";
    }
  }
  if (!isMobile && key === "Enter" && !shiftKey && !shouldDeferEnterForIme2) {
    return "send";
  }
  return "none";
};

// packages/chat/web/messageInputMention.ts
var createInactiveMentionState = () => ({
  active: false,
  kind: null,
  query: "",
  startIndex: -1
});
var resolveAgentMentionState = (value, cursorIndex) => {
  const textValue = value ?? "";
  const cursor = Math.min(Math.max(cursorIndex, 0), textValue.length);
  for (let i = cursor - 1; i >= 0; i -= 1) {
    const ch = textValue[i];
    if (ch === "@") {
      if (i > 0 && /\w/.test(textValue[i - 1])) {
        break;
      }
      const query = textValue.slice(i + 1, cursor);
      if (/\s/.test(query)) {
        break;
      }
      return {
        active: true,
        kind: "agent",
        query,
        startIndex: i
      };
    }
    if (/\s/.test(ch)) {
      break;
    }
  }
  return createInactiveMentionState();
};
var buildAgentMentionInsertion = ({
  currentValue,
  cursorPos,
  mentionState,
  agent
}) => {
  if (!mentionState.active || mentionState.kind !== "agent" || mentionState.startIndex < 0) {
    return null;
  }
  const before = currentValue.slice(0, mentionState.startIndex);
  const after = currentValue.slice(cursorPos);
  const safeName = agent.name || agent.agentKey;
  const mentionText = `@${safeName} `;
  return {
    nextText: `${before}${mentionText}${after}`,
    nextMentionState: createInactiveMentionState(),
    nextMentionHighlightIndex: 0,
    targetAgentKey: agent.agentKey
  };
};
var moveMentionHighlightIndex = ({
  previousIndex,
  optionCount,
  direction
}) => {
  if (optionCount <= 0) return 0;
  const maxIndex = optionCount - 1;
  if (direction === "next") {
    return previousIndex >= maxIndex ? maxIndex : previousIndex + 1;
  }
  return previousIndex <= 0 ? 0 : previousIndex - 1;
};

// packages/core/collapsedPaste.ts
var COLLAPSE_PASTE_MIN_LINES = 8;
var COLLAPSE_PASTE_MIN_CHARS = 400;
var WEB_COLLAPSE_PASTE_MIN_LINES = 100;
var WEB_COLLAPSE_PASTE_MIN_CHARS = 5e3;
var WEB_PASTE_THRESHOLD = {
  minLines: WEB_COLLAPSE_PASTE_MIN_LINES,
  minChars: WEB_COLLAPSE_PASTE_MIN_CHARS
};
function countTextLines(text) {
  if (text.length === 0) return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) lines += 1;
  }
  return lines;
}
function shouldCollapsePaste(text, threshold = {}) {
  const minLines = threshold.minLines ?? COLLAPSE_PASTE_MIN_LINES;
  const minChars = threshold.minChars ?? COLLAPSE_PASTE_MIN_CHARS;
  if (text.length === 0) return false;
  if (text.length >= minChars) return true;
  return countTextLines(text) >= minLines;
}
function formatPasteByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}
function estimatePasteBytes(text) {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code <= 127) bytes += 1;
    else if (code <= 2047) bytes += 2;
    else if (code >= 55296 && code <= 56319) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

// packages/chat/web/MessageInputComposer.tsx
var import_react20 = __toESM(require_react());

// packages/chat/web/AgentMentionMenu.tsx
var import_react19 = __toESM(require_react());
var import_jsx_runtime16 = __toESM(require_jsx_runtime());
var AgentMentionMenuComponent = ({
  visible,
  agents,
  highlightIndex,
  headerText,
  onSelect,
  onHover
}) => {
  const containerRef = (0, import_react19.useRef)(null);
  (0, import_react19.useEffect)(() => {
    if (!visible) return;
    if (highlightIndex < 0 || highlightIndex >= agents.length) return;
    const container = containerRef.current;
    if (!container) return;
    const activeItem = container.querySelector(
      ".message-input__mentions-item.is-active"
    );
    if (!activeItem) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;
    const itemOffsetTop = itemRect.top - containerRect.top + currentScrollTop;
    const itemHeight = activeItem.offsetHeight;
    const targetScrollTop = itemOffsetTop - container.clientHeight / 2 + itemHeight / 2;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const nextScrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop);
    container.scrollTo({
      top: nextScrollTop,
      behavior: "auto"
    });
  }, [highlightIndex, visible, agents.length]);
  if (!visible || agents.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_jsx_runtime16.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "message-input__mentions", ref: containerRef, children: [
    headerText && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "message-input__mentions-header", children: headerText }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ul", { className: "message-input__mentions-list", children: agents.map((agent, index) => {
      const isActive = index === highlightIndex;
      return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "li",
        {
          className: `message-input__mentions-item${isActive ? " is-active" : ""}`,
          onMouseDown: (event) => {
            event.preventDefault();
            onSelect(agent);
          },
          onMouseEnter: () => {
            if (onHover) onHover(index);
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "message-input__mentions-item-name", children: agent.name })
        },
        agent.agentKey
      );
    }) })
  ] }) });
};
var AgentMentionMenu = (0, import_react19.memo)(AgentMentionMenuComponent);
var AgentMentionMenu_default = AgentMentionMenu;

// packages/chat/web/MessageInputComposer.tsx
var import_jsx_runtime17 = __toESM(require_jsx_runtime());
var MessageInputComposer = (0, import_react20.memo)(function MessageInputComposer2({
  areaRef,
  text,
  placeholder,
  ariaLabel,
  onChange,
  onCompositionStart,
  onCompositionEnd,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  mentionMenuVisible,
  filteredFavoriteAgents,
  mentionHighlightIndex,
  mentionHeaderText,
  onSelectMention,
  onHoverMention
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "message-input__textarea-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      $b8dcdc58eeae0d40$export$2c73285ae9390cec,
      {
        style: { flex: 1, display: "flex", width: "100%" },
        "aria-label": ariaLabel,
        children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
          {
            ref: areaRef,
            className: "message-input__textarea",
            value: text,
            rows: 1,
            placeholder,
            onChange,
            onCompositionStart,
            onCompositionEnd,
            onFocus,
            onKeyDown,
            onBlur,
            onPaste
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      AgentMentionMenu_default,
      {
        visible: mentionMenuVisible,
        agents: filteredFavoriteAgents,
        highlightIndex: mentionHighlightIndex,
        headerText: mentionHeaderText,
        onSelect: onSelectMention,
        onHover: onHoverMention
      }
    )
  ] });
});

// packages/chat/web/MessageInputControlsBar.tsx
var import_react23 = __toESM(require_react());

// packages/chat/web/DialogUsageGaugeIcon.tsx
var import_react21 = __toESM(require_react());
var import_jsx_runtime18 = __toESM(require_jsx_runtime());
var RING_RADIUS = 9;
var CENTER = 12;
var CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
var DialogUsageGaugeIcon = ({
  fillPercent,
  size = 22
}) => {
  const gradientId = (0, import_react21.useId)().replace(/:/g, "");
  const positiveFill = asOptionalPositiveFiniteNumber(fillPercent);
  const clamped = positiveFill !== void 0 ? Math.min(100, Math.max(0, positiveFill)) : 0;
  const dash = clamped / 100 * CIRCUMFERENCE;
  const gap = CIRCUMFERENCE - dash;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "svg",
    {
      className: "dialog-usage-gauge-icon",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      "aria-hidden": true,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("linearGradient", { id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: "0.55" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: "0.95" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "circle",
          {
            className: "dialog-usage-gauge-icon__track",
            cx: CENTER,
            cy: CENTER,
            r: RING_RADIUS,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2.25",
            strokeOpacity: "0.22"
          }
        ),
        positiveFill !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "circle",
          {
            className: "dialog-usage-gauge-icon__fill",
            cx: CENTER,
            cy: CENTER,
            r: RING_RADIUS,
            fill: "none",
            stroke: `url(#${gradientId})`,
            strokeWidth: "2.25",
            strokeLinecap: "round",
            strokeDasharray: `${dash} ${gap}`,
            transform: `rotate(-90 ${CENTER} ${CENTER})`
          }
        )
      ]
    }
  );
};

// packages/chat/web/DialogUsagePanel.tsx
var import_react22 = __toESM(require_react());

// packages/chat/dialog/dialogUsageFormat.ts
var formatCompactTokenCount = (count) => {
  const safe = Math.max(0, count);
  if (safe < 1e3) return String(safe);
  if (safe < 1e6) {
    const val2 = safe / 1e3;
    return val2 % 1 === 0 ? `${val2}k` : `${val2.toFixed(1)}k`;
  }
  const val = safe / 1e6;
  return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
};
var getDialogTokenTotal = (inputTokens, outputTokens) => Math.max(0, inputTokens) + Math.max(0, outputTokens);
var getContextWindowUsagePercent = (usedTokens, contextWindow) => {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) return 0;
  return Math.min(100, Math.round(usedTokens / contextWindow * 100));
};

// packages/render/web/ui/Meter.tsx
var import_jsx_runtime19 = __toESM(require_jsx_runtime(), 1);
var joinClass = (base, extra) => extra ? `${base} ${extra}` : base;
function Meter({
  label,
  hideLabel,
  className,
  ...props
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
    $8d5785ac9f5d0f19$export$62e3ae2a4090b879,
    {
      ...props,
      className: joinClass(
        "react-aria-Meter nolo-meter",
        typeof className === "string" ? className : void 0
      ),
      "data-hide-label": hideLabel || void 0,
      children: ({ percentage, valueText }) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
        label && !hideLabel ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "nolo-meter-label", children: label }) : null,
        !hideLabel ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "nolo-meter-value", children: valueText }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "nolo-meter-track", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "div",
          {
            className: "nolo-meter-fill",
            style: {
              width: `${percentage}%`,
              // Keep a readable sliver for tiny non-zero values.
              minWidth: percentage > 0 ? 4 : void 0,
              ["--meter-fill-color"]: percentage < 70 ? "var(--success, var(--primary))" : percentage < 90 ? "var(--warning, #d99a00)" : "var(--error, var(--danger, #e11d48))"
            }
          }
        ) })
      ] })
    }
  );
}

// packages/chat/web/DialogUsagePanel.tsx
var import_jsx_runtime20 = __toESM(require_jsx_runtime());
var formatExactTokens = (count) => Math.max(0, count).toLocaleString();
var DialogUsagePanel = ({
  tokenStats,
  contextWindow = 0,
  compressionCount = 0,
  className = ""
}) => {
  const { t } = useTranslation(["common", "chat"]);
  const inputTokens = tokenStats?.inputTokens ?? 0;
  const outputTokens = tokenStats?.outputTokens ?? 0;
  const totalTokens = getDialogTokenTotal(inputTokens, outputTokens);
  const totalCost = tokenStats?.totalCost ?? 0;
  const creditsUnit = t("chat:creditsUnit", "\u79EF\u5206");
  const contextWindowLabel = t("chat:contextWindow", "\u4E0A\u4E0B\u6587\u7A97\u53E3");
  const contextUsage = (0, import_react22.useMemo)(() => {
    if (!contextWindow || contextWindow <= 0) return null;
    const percent = getContextWindowUsagePercent(totalTokens, contextWindow);
    return {
      percent,
      usedExact: formatExactTokens(totalTokens),
      windowLabel: formatCompactTokenCount(contextWindow)
    };
  }, [contextWindow, totalTokens]);
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
    "div",
    {
      className: `dialog-usage-panel ${className}`.trim(),
      "aria-label": contextWindowLabel,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "dialog-usage-panel__row dialog-usage-panel__row--main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "dialog-usage-panel__headline", children: contextUsage ? /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
            contextUsage.usedExact,
            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("span", { className: "dialog-usage-panel__headline-muted", children: [
              " ",
              "/ ",
              contextUsage.windowLabel,
              " \xB7 ",
              contextUsage.percent,
              "%"
            ] })
          ] }) : formatExactTokens(totalTokens) }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "dialog-usage-panel__billing-value", children: formatCredits(totalCost, creditsUnit, 4) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("p", { className: "dialog-usage-panel__io", children: [
          "\u2191",
          formatExactTokens(inputTokens),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "dialog-usage-panel__io-sep", "aria-hidden": "true", children: "\xB7" }),
          "\u2193",
          formatExactTokens(outputTokens)
        ] }),
        contextUsage && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          Meter,
          {
            className: "dialog-usage-panel__meter",
            label: contextWindowLabel,
            hideLabel: true,
            value: contextUsage.percent,
            maxValue: 100,
            "aria-label": contextWindowLabel
          }
        ),
        compressionCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "dialog-usage-panel__compression", children: t("compressedTimes", "\u5DF2\u538B\u7F29 {{count}} \u6B21", { count: compressionCount }) })
      ]
    }
  );
};

// packages/chat/web/DialogUsageTrigger.tsx
var import_jsx_runtime21 = __toESM(require_jsx_runtime());
var DialogUsageTrigger = () => {
  const { t } = useTranslation(["common", "chat"]);
  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const dialogConfig = useCurrentDialogConfig();
  const agentId = getPrimaryDialogAgentId(dialogConfig);
  const { data: agent } = useFetchData(agentId || void 0);
  const contextWindow = getModelContextWindow(agent?.model || "");
  const totalTokens = getDialogTokenTotal(
    tokenStats?.inputTokens ?? 0,
    tokenStats?.outputTokens ?? 0
  );
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)($f2ff30fde7b014be$export$2e1e1122cf0cba88, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      $7705c033048f6da7$export$353f5b6fc5456de1,
      {
        className: "dialog-usage-trigger",
        "aria-label": t("chat:dialogUsageTitle", "\u4F1A\u8BDD\u7528\u91CF"),
        ...{ title: t("chat:dialogUsageTitle", "\u4F1A\u8BDD\u7528\u91CF") },
        children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          DialogUsageGaugeIcon,
          {
            size: 22,
            fillPercent: contextWindow > 0 && totalTokens > 0 ? getContextWindowUsagePercent(totalTokens, contextWindow) : void 0
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      Popover,
      {
        placement: "top end",
        hideArrow: true,
        offset: 10,
        className: "dialog-usage-popover",
        children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          DialogUsagePanel,
          {
            tokenStats,
            contextWindow,
            compressionCount: dialogConfig?.compressionCount ?? 0
          }
        )
      }
    )
  ] });
};

// packages/chat/web/MessageInputControlsBar.tsx
var import_jsx_runtime22 = __toESM(require_jsx_runtime());
var MessageInputControlsBar = (0, import_react23.memo)(function MessageInputControlsBar2({
  fileUploadDisabled,
  onFilesSelected,
  showVoiceInput,
  onTranscribed,
  onVoiceSend,
  onSendClick,
  sendDisabled,
  agentPicker
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "message-input__controls", children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "message-input__controls-left", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        FileUploadButton_default,
        {
          disabled: fileUploadDisabled,
          onFilesSelected
        }
      ),
      agentPicker && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(AgentPickerControl, { ...agentPicker })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "message-input__controls-right", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogUsageTrigger, {}),
      showVoiceInput ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        VoiceInputButton_default,
        {
          onTranscribed,
          onSend: onVoiceSend,
          className: "voice-btn-in-send",
          iconSize: 20
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(SendButton_default, { onClick: onSendClick, disabled: sendDisabled })
    ] })
  ] });
});

// packages/chat/web/MessageInputContextPanels.tsx
var import_react26 = __toESM(require_react());

// packages/chat/web/ActivityProgressPanel.tsx
var import_react24 = __toESM(require_react());
var import_jsx_runtime23 = __toESM(require_jsx_runtime());
function getRecentTaskMessages(messages) {
  const lastUserIndex = [...messages].reverse().findIndex((message) => message?.role === "user");
  const startIndex = lastUserIndex === -1 ? 0 : messages.length - 1 - lastUserIndex + 1;
  return messages.slice(startIndex);
}
var phaseStatusLabel = (phase) => {
  if (phase.status === "running") return "\u8FDB\u884C\u4E2D";
  if (phase.status === "failed") return "\u5931\u8D25";
  if (phase.status === "success") return "\u5B8C\u6210";
  return "\u5F85\u5904\u7406";
};
var ActivityProgressPanel = (0, import_react24.memo)(
  ({ messages, isActive = false }) => {
    const [isMinimized, setIsMinimized] = (0, import_react24.useState)(true);
    const [expandedPhaseIds, setExpandedPhaseIds] = (0, import_react24.useState)(() => /* @__PURE__ */ new Set());
    const taskMessages = (0, import_react24.useMemo)(() => getRecentTaskMessages(messages), [messages]);
    const timeline = (0, import_react24.useMemo)(() => buildActivityTimeline(taskMessages), [taskMessages]);
    if (timeline.phases.length === 0 || timeline.totalPhases <= 1) return null;
    const overallStatus = timeline.phases.some((phase) => phase.status === "failed") ? "failed" : timeline.phases.some((phase) => phase.status === "running") ? "running" : timeline.completedPhases >= timeline.totalPhases ? "success" : "pending";
    if (!isActive && overallStatus === "success") return null;
    const togglePhase = (phaseId) => {
      setExpandedPhaseIds((prev) => {
        const next = new Set(prev);
        if (next.has(phaseId)) next.delete(phaseId);
        else next.add(phaseId);
        return next;
      });
    };
    const runningPhase = timeline.phases.find((phase) => phase.status === "running");
    const currentStepText = runningPhase ? ` / ${runningPhase.title}` : "";
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: `activity-progress-panel activity-progress-panel--${overallStatus}${isMinimized ? " activity-progress-panel--minimized" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
        "button",
        {
          type: "button",
          className: "activity-progress-panel__head",
          onClick: () => setIsMinimized((value) => !value),
          "aria-expanded": !isMinimized,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "activity-progress-panel__title", children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__status", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(StatusIcon, { status: overallStatus, toolName: "" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__title-text", children: "\u4EFB\u52A1\u8FDB\u5EA6" }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "activity-progress-panel__meta-text", children: [
                ` / \u5DF2\u5B8C\u6210 ${timeline.completedPhases} / ${timeline.totalPhases}`,
                currentStepText
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__chevron", "aria-hidden": "true", children: isMinimized ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(LuChevronRight, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(LuChevronDown, { size: 15 }) })
          ]
        }
      ),
      !isMinimized && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "activity-progress-panel__phases", children: timeline.phases.map((phase) => {
        const isExpanded = expandedPhaseIds.has(phase.id) || phase.status === "running";
        const canExpand = phase.actions.length > 0;
        return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
          "div",
          {
            className: `activity-progress-panel__phase activity-progress-panel__phase--${phase.status}${isExpanded ? " activity-progress-panel__phase--expanded" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                "button",
                {
                  type: "button",
                  className: "activity-progress-panel__phase-row",
                  onClick: () => {
                    if (canExpand) togglePhase(phase.id);
                  },
                  "aria-expanded": canExpand ? isExpanded : void 0,
                  disabled: !canExpand,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__phase-icon", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(StatusIcon, { status: phase.status, toolName: "" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__phase-title", children: phase.title }),
                    (isActive || phase.status === "running") && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__phase-status", children: phaseStatusLabel(phase) }),
                    canExpand && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__phase-chevron", "aria-hidden": "true", children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(LuChevronDown, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(LuChevronRight, { size: 14 }) })
                  ]
                }
              ),
              isExpanded && canExpand && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "activity-progress-panel__actions", children: phase.actions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: `activity-progress-panel__action activity-progress-panel__action--${action.status}`, children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: `activity-progress-panel__action-dot activity-progress-panel__action-dot--${action.status}` }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "activity-progress-panel__action-title", children: action.label })
              ] }, action.id)) })
            ]
          },
          phase.id
        );
      }) })
    ] });
  }
);
var ActivityProgressPanel_default = ActivityProgressPanel;

// packages/chat/web/MessageInputConfirmBar.tsx
var import_react25 = __toESM(require_react());
var import_jsx_runtime24 = __toESM(require_jsx_runtime());
var MessageInputConfirmBar = (0, import_react25.memo)(function MessageInputConfirmBar2({
  status,
  errorText,
  failureLabel,
  deleteLabel,
  confirmDisabled,
  dismissDisabled,
  onConfirm,
  onDismiss
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(
    "div",
    {
      className: "message-input__confirm-bar",
      role: "status",
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { className: "message-input__confirm-text", children: status === "failed" ? errorText || failureLabel : `\u662F\u5426\u5220\u9664\u300C${deleteLabel}\u300D\uFF1F` }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "message-input__confirm-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
            "button",
            {
              type: "button",
              className: "message-input__confirm-secondary",
              onClick: onDismiss,
              disabled: dismissDisabled,
              children: "\u53D6\u6D88"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
            "button",
            {
              type: "button",
              className: "message-input__confirm-danger",
              onClick: onConfirm,
              disabled: confirmDisabled,
              children: status === "running" ? "\u5220\u9664\u4E2D\u2026" : status === "failed" ? "\u91CD\u8BD5\u5220\u9664" : "\u786E\u8BA4\u5220\u9664"
            }
          )
        ] })
      ]
    }
  );
});

// packages/chat/web/MessageInputContextPanels.tsx
var import_jsx_runtime25 = __toESM(require_jsx_runtime());
var AttachmentsPreview = (0, import_react26.lazy)(() => import("/public/assets/chunks/AttachmentsPreview-OXUBOWJK.js"));
var ImageConfigRow = (0, import_react26.lazy)(() => import("/public/assets/chunks/ImageConfigRow-FNANIGX5.js"));
var MessageInputAttachmentsPanel = (0, import_react26.memo)(
  function MessageInputAttachmentsPanel2({
    imagePreviews,
    pendingFiles,
    onRemoveImage,
    processingFiles,
    isMobile
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(import_react26.Suspense, { fallback: null, children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      AttachmentsPreview,
      {
        imagePreviews,
        pendingFiles,
        onRemoveImage,
        processingFiles,
        isMobile
      }
    ) });
  }
);
var MessageInputImageConfigPanel = (0, import_react26.memo)(
  function MessageInputImageConfigPanel2({
    visible,
    aspectRatio,
    imageSize,
    imageProfileKey,
    imageUiConfig,
    onAspectRatioChange,
    onImageSizeChange,
    onImageProfileChange
  }) {
    if (!visible) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(import_react26.Suspense, { fallback: null, children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      ImageConfigRow,
      {
        aspectRatio,
        imageSize,
        imageProfileKey,
        imageUiConfig,
        onAspectRatioChange,
        onImageSizeChange,
        onImageProfileChange
      }
    ) });
  }
);
var MessageInputChip = (0, import_react26.memo)(function MessageInputChip2({
  label,
  onDismiss,
  dismissAriaLabel,
  onActivate,
  activateAriaLabel,
  className
}) {
  const rootClass = [
    "message-input__canvas-edit-chip",
    onActivate ? "message-input__canvas-edit-chip--actionable" : "",
    className ?? ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: rootClass, children: [
    onActivate ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      "button",
      {
        type: "button",
        className: "message-input__canvas-edit-chip-label",
        onClick: onActivate,
        "aria-label": activateAriaLabel ?? label,
        children: label
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("button", { type: "button", onClick: onDismiss, "aria-label": dismissAriaLabel, children: "\xD7" })
  ] });
});
var MessageInputActivityPanel = (0, import_react26.memo)(
  function MessageInputActivityPanel2({
    messages,
    isActive
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(ActivityProgressPanel_default, { messages, isActive });
  }
);
function isProcessLaunch(value) {
  return !!value && typeof value === "object" && typeof value.pid === "number" && typeof value.label === "string";
}
var RunningProcessesPanel = (0, import_react26.memo)(function RunningProcessesPanel2({
  messages
}) {
  const toolRuns = useAllToolRuns();
  const running = (0, import_react26.useMemo)(() => {
    const byPid = /* @__PURE__ */ new Map();
    for (const run of toolRuns) {
      const p = run.processLaunch;
      if (p && p.status === "running" && typeof p.pid === "number") {
        byPid.set(p.pid, { pid: p.pid, label: p.label, toolRunId: run.id });
      }
    }
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || msg.role !== "tool") continue;
        const p = msg?.metadata?.processLaunch;
        if (isProcessLaunch(p) && p.status === "running") {
          if (!byPid.has(p.pid)) {
            byPid.set(p.pid, { pid: p.pid, label: p.label });
          }
        }
      }
    }
    return Array.from(byPid.values());
  }, [toolRuns, messages]);
  const handleStop = (0, import_react26.useCallback)(
    (entry) => {
      const sendToHost = globalThis.__electrobunSendToHost;
      if (typeof sendToHost === "function") {
        sendToHost({
          type: "nolo-desktop-process-control",
          action: "stop-process",
          pid: entry.pid
        });
      }
      if (entry.toolRunId) {
        updateProcessLaunchStatus({ toolRunId: entry.toolRunId, status: "stopped" });
      }
    },
    []
  );
  const canStop = typeof globalThis.__electrobunSendToHost === "function";
  if (running.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "running-processes-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "running-processes-panel__title", children: [
      "\u8FD0\u884C\u4E2D\u8FDB\u7A0B (",
      running.length,
      ")"
    ] }),
    running.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "running-processes-panel__row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "running-processes-panel__label", title: entry.label, children: entry.label }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { className: "running-processes-panel__pid", children: [
        "pid ",
        entry.pid
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        "button",
        {
          type: "button",
          className: "running-processes-panel__stop-btn",
          disabled: !canStop,
          onClick: () => handleStop(entry),
          children: "\u505C\u6B62"
        }
      )
    ] }, entry.pid))
  ] });
});
var MessageInputConfirmPanel = (0, import_react26.memo)(function MessageInputConfirmPanel2({
  visible,
  ...barProps
}) {
  if (!visible) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(MessageInputConfirmBar, { ...barProps });
});

// packages/chat/web/QueueBadge.tsx
var import_react27 = __toESM(require_react());
var import_jsx_runtime26 = __toESM(require_jsx_runtime());
function QueueBadgeImpl({ dialogKey, isRunning }) {
  const { t } = useTranslation("chat");
  const queue = usePendingUserInputQueue(dialogKey ?? void 0);
  const [open, setOpen] = (0, import_react27.useState)(false);
  const popoverRef = (0, import_react27.useRef)(null);
  (0, import_react27.useEffect)(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const count = Array.isArray(queue) ? queue.length : 0;
  const visible = isRunning && count > 0;
  const previewMax = 5;
  const handleClear = (0, import_react27.useCallback)(() => {
    clearPendingUserInputQueue(dialogKey ? { dialogKey } : void 0);
    setOpen(false);
  }, [dialogKey]);
  if (!visible) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "queue-badge", ref: popoverRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
      "button",
      {
        type: "button",
        className: "queue-badge__pill",
        onClick: () => setOpen((v) => !v),
        "aria-label": t("queueBadgeLabel", "\u6392\u961F\u6D88\u606F"),
        "aria-expanded": open,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "queue-badge__icon", children: "\u21A5" }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "queue-badge__count", children: count }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "queue-badge__label", children: t("queueBadgeQueued", "\u6392\u961F\u4E2D") })
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "queue-badge__popover", role: "dialog", children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "queue-badge__popover-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: t("queueBadgeTitle", "\u6392\u961F\u6D88\u606F") }),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          "button",
          {
            type: "button",
            className: "queue-badge__clear",
            onClick: handleClear,
            children: t("queueBadgeClear", "\u6E05\u7A7A")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("ul", { className: "queue-badge__list", children: [
        queue.slice(0, previewMax).map((text, i) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("li", { className: "queue-badge__item", title: text, children: text.length > 60 ? text.slice(0, 60) + "\u2026" : text }, i)),
        count > previewMax && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("li", { className: "queue-badge__item queue-badge__item--more", children: t("queueBadgeMore", "\u8FD8\u6709 {{n}} \u6761", { n: count - previewMax }) })
      ] })
    ] })
  ] });
}
var QueueBadge = (0, import_react27.memo)(QueueBadgeImpl);

// packages/chat/web/useMessageInputSend.ts
var import_react28 = __toESM(require_react());

// packages/chat/messages/pendingAttachmentParts.ts
var normalizeText = (value) => String(value ?? "").trim();
var buildReferencePart = (file) => {
  const pageKey = normalizeText(file.pageKey);
  if (!pageKey) return null;
  return {
    type: normalizeText(file.type) || "page",
    name: normalizeText(file.name) || pageKey,
    pageKey,
    dialogKey: normalizeText(file.sourceDialogKey) || normalizeText(file.dialogKey) || void 0
  };
};
var buildImageContextText = (file, pageKey) => {
  const name = normalizeText(file.name) || pageKey;
  return [`[Image attachment: ${name}]`, `Source file: ${pageKey}`].join("\n");
};
var isPendingVisualImage = (file) => normalizeText(file.type) === "image";
var pendingAttachmentToMessageParts = (file, args) => {
  if (normalizeText(file.type) === "ocr_text" && normalizeText(file.ocrText)) {
    return [
      {
        type: "text",
        text: `[\u56FE\u7247 OCR\uFF1A${normalizeText(file.name)}]
${normalizeText(file.ocrText)}`
      }
    ];
  }
  const pageKey = normalizeText(file.pageKey);
  if (isPendingVisualImage(file) && pageKey) {
    const imageUrl = buildMessageFileContentUrl(args.currentServer, pageKey);
    if (imageUrl) {
      return [
        { type: "text", text: buildImageContextText(file, pageKey) },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    }
  }
  const fallbackPart = buildReferencePart(file);
  return fallbackPart ? [fallbackPart] : [];
};
var resolvePendingAttachmentToMessageParts = async (file, args) => {
  const parts = pendingAttachmentToMessageParts(file, args);
  if (!args.resolveImageUrl) return parts;
  return Promise.all(
    parts.map(async (part) => {
      if (part.type !== "image_url") return part;
      const imagePart = part;
      const resolvedUrl = await args.resolveImageUrl?.(imagePart.image_url.url, file);
      return {
        ...imagePart,
        image_url: {
          ...imagePart.image_url,
          url: normalizeText(resolvedUrl) || imagePart.image_url.url
        }
      };
    })
  );
};
var resolvePendingAttachmentsToMessageParts = async (files, args) => {
  const nested = await Promise.all(
    deduplicatePendingAttachments(files).map(
      (file) => resolvePendingAttachmentToMessageParts(file, args)
    )
  );
  return nested.flat();
};
var pendingAttachmentIdentity = (file) => normalizeText(file.pageKey) || normalizeText(file.sourceDialogKey) || normalizeText(file.dialogKey);
var deduplicatePendingAttachments = (files) => {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const file of files) {
    const identity = pendingAttachmentIdentity(file);
    if (identity && seen.has(identity)) continue;
    if (identity) seen.add(identity);
    result.push(file);
  }
  return result;
};

// packages/chat/messages/browserImageUrl.ts
var blobToDataUrl = (blob) => {
  if (typeof FileReader === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};
var buildAuthHeaders = (authToken) => authToken ? { Authorization: `Bearer ${authToken}` } : void 0;
var resolveBrowserModelImageUrl = async (imageUrl, args = {}) => {
  if (!isLocalFileContentUrl(imageUrl)) return imageUrl;
  const fetchImpl = args.deps?.fetch ?? globalThis.fetch;
  const blobToDataUrlImpl = args.deps?.blobToDataUrl ?? blobToDataUrl;
  if (!fetchImpl) return imageUrl;
  try {
    const response = await fetchImpl(imageUrl, {
      headers: buildAuthHeaders(args.authToken)
    });
    if (!response.ok) return imageUrl;
    const dataUrl = await blobToDataUrlImpl(await response.blob());
    return dataUrl || imageUrl;
  } catch {
    return imageUrl;
  }
};

// packages/chat/web/messageSlashCommands.ts
var FRESH_DIALOG_SLASH_COMMAND = "/new";
var COMPACT_DIALOG_SLASH_COMMAND = "/compact";
function isFreshDialogSlashCommand(input) {
  return input.trim() === FRESH_DIALOG_SLASH_COMMAND;
}
function isCompactDialogSlashCommand(input) {
  return input.trim() === COMPACT_DIALOG_SLASH_COMMAND;
}

// packages/core/chat/resolveChatSendDecision.ts
function resolveChatSendDecision(input) {
  const trimmed = input.text.trim();
  if (input.isFreshDialogSlashCommand(trimmed)) {
    return { kind: "arm-fresh-dialog" };
  }
  if (input.isCompactDialogSlashCommand(trimmed)) {
    if (input.isLoopRunning || input.isSendPending) {
      return { kind: "compact-blocked" };
    }
    return { kind: "compact-dialog" };
  }
  if (!trimmed && !input.imagePreviewCount && !input.pendingFileCount || input.isSendBlocked) {
    return { kind: "noop" };
  }
  if (!input.canMultiImg && input.imagePreviewCount > 1) {
    return { kind: "multi-image-blocked" };
  }
  if (input.isLoopRunning) {
    if (trimmed && !input.imagePreviewCount && !input.pendingFileCount) {
      return { kind: "queue-text", text: trimmed };
    }
    return { kind: "queue-blocked" };
  }
  return { kind: "send", text: trimmed };
}

// packages/app/appInspector/buildLocalPreviewEditingTarget.ts
var LOCAL_PREVIEW_EDITING_KIND = "local_preview";
function buildLocalPreviewEditingTarget(node) {
  return {
    kind: LOCAL_PREVIEW_EDITING_KIND,
    ...node.noloLoc ? { key: node.noloLoc } : {},
    title: node.tagName,
    metadata: { selectedNode: node }
  };
}

// packages/chat/web/useMessageInputSend.ts
function useMessageInputSend(args) {
  const {
    text,
    textRef,
    imageFiles,
    imgPreviews,
    pendingFiles,
    clearInput,
    clearFileStatus,
    processingCount,
    hasStreamingMessage,
    isLoopRunning,
    canMultiImg,
    mentionTargetAgentKey,
    setMentionStateInactive,
    currentDialogKey,
    currentDialogConfig,
    currentServer,
    token,
    runtimeOptions,
    imageUiConfig,
    imageAspectRatio,
    imageSize,
    selectedImageProfile,
    canvasEditSelection,
    editingSession,
    setEditingSession,
    appSelectedNode,
    areaRef
  } = args;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  const [isSending, setIsSending] = (0, import_react28.useState)(false);
  const [pendingSendImageCount, setPendingSendImageCount] = (0, import_react28.useState)(0);
  const [startFreshOnNextSend, setStartFreshOnNextSend] = (0, import_react28.useState)(false);
  const sendingGuardRef = (0, import_react28.useRef)(false);
  const startFreshOnNextSendRef = (0, import_react28.useRef)(false);
  const sendMessageRef = (0, import_react28.useRef)(
    async () => {
    }
  );
  const latestRef = (0, import_react28.useRef)(args);
  (0, import_react28.useEffect)(() => {
    latestRef.current = args;
    latestRef.current.text = text;
  });
  const markStartFreshOnNextSend = (0, import_react28.useCallback)((next) => {
    startFreshOnNextSendRef.current = next;
    setStartFreshOnNextSend(next);
  }, []);
  const clearState = (0, import_react28.useCallback)(() => {
    clearInput();
    clearFileStatus();
    setMentionStateInactive();
    dispatch(clearPendingAttachments());
    if (areaRef.current) {
      areaRef.current.style.height = "auto";
      areaRef.current.focus();
    }
  }, [clearInput, clearFileStatus, dispatch, setMentionStateInactive, areaRef]);
  const cancelEditingSession = (0, import_react28.useCallback)(() => {
    setEditingSession(null);
  }, [setEditingSession]);
  const armFreshDialogSend = (0, import_react28.useCallback)(() => {
    clearState();
    markStartFreshOnNextSend(true);
    toast.success(
      "Started a fresh dialog. Next message will open a new chat."
    );
  }, [clearState, markStartFreshOnNextSend]);
  const runCompactDialog = (0, import_react28.useCallback)(async () => {
    if (!currentDialogKey) {
      throw new Error(
        "Cannot compact before the current dialog is initialized."
      );
    }
    const result = await dispatch(
      compactDialogAndForkAction({ dialogKey: currentDialogKey })
    ).unwrap();
    clearState();
    navigate(buildDialogUrl(result.dbKey, result.spaceId), {
      state: { isNew: true }
    });
    toast.success("Compacted this chat and switched to a new dialog.");
  }, [clearState, currentDialogKey, dispatch, navigate]);
  const isSendPending = isSending && !hasStreamingMessage && !isLoopRunning;
  const isSendBlocked = processingCount > 0 || isSendPending;
  const fileUploadDisabled = processingCount > 0 || isSendPending;
  const sendViaFreshDialog = (0, import_react28.useCallback)(
    async ({
      text: sendText,
      imageFiles: sendImageFiles,
      extraParts,
      runtimeOptions: sendRuntimeOptions,
      targetAgentKey
    }) => {
      const nextAgentKey = targetAgentKey ?? getPrimaryDialogAgentId(currentDialogConfig);
      if (!nextAgentKey) {
        throw new Error(
          "Cannot start a fresh dialog without a primary agent."
        );
      }
      const result = await dispatch(
        createDialog({ cybots: [nextAgentKey], skipGreeting: true })
      ).unwrap();
      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true }
      });
      await dispatch(
        sendFirstMessage({
          dialogKey: result.dbKey,
          text: sendText,
          imageFiles: sendImageFiles,
          extraParts,
          runtimeOptions: sendRuntimeOptions,
          targetAgentKey
        })
      );
      markStartFreshOnNextSend(false);
    },
    [currentDialogConfig, dispatch, markStartFreshOnNextSend, navigate]
  );
  const sendMessage = (0, import_react28.useCallback)(async (overrideText) => {
    if (sendingGuardRef.current) return;
    const snap = latestRef.current;
    const liveText = overrideText ?? snap.textRef.current ?? snap.text;
    const liveImgPreviews = snap.imgPreviews;
    const livePendingFiles = snap.pendingFiles;
    const decisionIsSendPending = sendingGuardRef.current && !snap.hasStreamingMessage && !snap.isLoopRunning;
    const decisionIsSendBlocked = snap.processingCount > 0 || decisionIsSendPending;
    const decision = resolveChatSendDecision({
      text: liveText,
      imagePreviewCount: liveImgPreviews.length,
      pendingFileCount: livePendingFiles.length,
      isSendBlocked: decisionIsSendBlocked,
      canMultiImg: snap.canMultiImg,
      isLoopRunning: snap.isLoopRunning,
      isSendPending: decisionIsSendPending,
      isFreshDialogSlashCommand,
      isCompactDialogSlashCommand
    });
    switch (decision.kind) {
      case "arm-fresh-dialog":
        armFreshDialogSend();
        return;
      case "compact-blocked":
        toast.error(
          "Wait for the current response to finish before using /compact."
        );
        return;
      case "compact-dialog":
        break;
      case "noop":
        return;
      case "multi-image-blocked":
        toast.error(
          t(
            "insufficientBalanceForMultipleImagesSend",
            "\u4F59\u989D\u672A\u8FBE\u523019\uFF0C\u65E0\u6CD5\u53D1\u9001\u591A\u5F20\u56FE\u7247"
          )
        );
        return;
      case "queue-text":
        dispatch(
          enqueueUserInput({
            text: decision.text,
            dialogKey: snap.currentDialogKey ?? void 0
          })
        );
        clearState();
        toast.success(
          t("messageQueued", "\u6D88\u606F\u5DF2\u6392\u961F\uFF0C\u5C06\u5728\u5F53\u524D\u8F6E\u6B21\u7ED3\u675F\u540E\u53D1\u9001"),
          {
            duration: 2e3
          }
        );
        return;
      case "queue-blocked":
        toast.error(
          t(
            "cannotSendFileDuringLoop",
            "Agent \u8FD0\u884C\u4E2D\uFF0C\u542B\u9644\u4EF6\u6D88\u606F\u8BF7\u7B49\u5F85\u5B8C\u6210\u540E\u518D\u53D1\u9001"
          )
        );
        return;
      case "send":
        break;
    }
    if (decision.kind === "compact-dialog") {
      try {
        await runCompactDialog();
      } catch (e) {
        console.error("[MessageInput] runCompactDialog error:", e);
        const rawMsg = typeof e === "string" ? e : e?.message || t("sendFailMessage");
        const msg = rawMsg === "Rejected" ? t("sendFailMessage") : rawMsg;
        toast.error(msg);
      }
      return;
    }
    const trimmed = decision.text;
    const currentImageFiles = Array.from(snap.imageFiles.values());
    const targetAgentKey = snap.mentionTargetAgentKey ?? void 0;
    const canOverrideImageConfig = snap.imageUiConfig?.showControls && snap.imageUiConfig.supportsImageConfig;
    const hasImageOverride = canOverrideImageConfig && (snap.imageAspectRatio || snap.imageSize || snap.selectedImageProfile?.imageModelOverride);
    const effectiveRuntimeOptionsBase = hasImageOverride ? {
      ...snap.runtimeOptions,
      imageConfigOverride: {
        ...snap.runtimeOptions?.imageConfigOverride,
        imageModelOverride: snap.selectedImageProfile?.imageModelOverride,
        aspectRatio: snap.imageAspectRatio,
        imageSize: snap.imageSize
      }
    } : snap.runtimeOptions;
    const base = effectiveRuntimeOptionsBase ?? {};
    const effectiveRuntimeOptions = snap.canvasEditSelection ? {
      ...base,
      editingTarget: buildCanvasNodeEditingTarget(snap.canvasEditSelection)
    } : snap.appSelectedNode && !base.editingTarget ? {
      ...base,
      editingTarget: buildLocalPreviewEditingTarget(snap.appSelectedNode)
    } : base;
    if (snap.canvasEditSelection) {
      markPendingCanvasEditSelection(snap.canvasEditSelection);
    }
    setPendingSendImageCount(currentImageFiles.length);
    sendingGuardRef.current = true;
    setIsSending(true);
    if (!snap.editingSession) {
      clearState();
    }
    if (snap.appSelectedNode) {
      clearSelectedNode();
    }
    try {
      if (snap.editingSession) {
        if (currentImageFiles.length > 0 || livePendingFiles.length > 0) {
          throw new Error("\u7F16\u8F91\u5386\u53F2\u6D88\u606F\u65F6\u6682\u4E0D\u652F\u6301\u65B0\u589E\u9644\u4EF6");
        }
        await dispatch(
          editUserMessageAndReplay({
            dialogKey: snap.currentDialogKey ?? void 0,
            messageId: snap.editingSession.messageId,
            originalContent: snap.editingSession.originalContent,
            nextText: trimmed,
            runtimeOptions: effectiveRuntimeOptions,
            targetAgentKey,
            quickChatPerfStartedAt: void 0
          })
        ).unwrap();
        if (snap.canvasEditSelection) {
          publishCanvasEditSelection(null);
        }
        clearState();
        cancelEditingSession();
        markStartFreshOnNextSend(false);
        return;
      }
      const attachmentParts = await resolvePendingAttachmentsToMessageParts(
        livePendingFiles,
        {
          currentServer: snap.currentServer,
          resolveImageUrl: (imageUrl) => resolveBrowserModelImageUrl(imageUrl, {
            authToken: snap.token
          })
        }
      );
      if (startFreshOnNextSendRef.current) {
        await sendViaFreshDialog({
          text: trimmed,
          imageFiles: currentImageFiles,
          extraParts: attachmentParts,
          runtimeOptions: effectiveRuntimeOptions,
          targetAgentKey
        });
        if (snap.canvasEditSelection) {
          publishCanvasEditSelection(null);
        }
        return;
      }
      await dispatch(
        sendFirstMessage({
          text: trimmed,
          imageFiles: currentImageFiles,
          extraParts: attachmentParts,
          dialogKey: snap.currentDialogKey ?? void 0,
          runtimeOptions: effectiveRuntimeOptions,
          targetAgentKey
        })
      );
      if (snap.canvasEditSelection) {
        publishCanvasEditSelection(null);
      }
      markStartFreshOnNextSend(false);
    } catch (e) {
      if (snap.canvasEditSelection) {
        markPendingCanvasEditSelection(null);
      }
      console.error("[MessageInput] sendMessage error:", e);
      if (e?.__errorInDialog === true) {
        return;
      }
      const rawMsg = typeof e === "string" ? e : e?.message || t("sendFailMessage");
      const msg = rawMsg === "Rejected" ? t("sendFailMessage") : rawMsg;
      toast.error(msg);
    } finally {
      sendingGuardRef.current = false;
      setIsSending(false);
      setPendingSendImageCount(0);
    }
  }, [
    armFreshDialogSend,
    cancelEditingSession,
    clearState,
    dispatch,
    markStartFreshOnNextSend,
    runCompactDialog,
    sendViaFreshDialog,
    t
  ]);
  (0, import_react28.useEffect)(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);
  return {
    isSending,
    pendingSendImageCount,
    startFreshOnNextSend,
    // Prefer the ref-synced setter so external callers cannot desync the flag.
    setStartFreshOnNextSend: markStartFreshOnNextSend,
    isSendPending,
    isSendBlocked,
    fileUploadDisabled,
    clearState,
    cancelEditingSession,
    armFreshDialogSend,
    runCompactDialog,
    sendMessage,
    sendMessageRef
  };
}

// packages/chat/web/useMessageInputDeleteConfirm.ts
var import_react29 = __toESM(require_react());
function useMessageInputDeleteConfirm(input) {
  const { allToolRuns, currentMessages } = input;
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const [dismissedConfirmRunIds, setDismissedConfirmRunIds] = (0, import_react29.useState)(() => /* @__PURE__ */ new Set());
  const pendingDeleteRun = (0, import_react29.useMemo)(
    () => [...allToolRuns].reverse().find(
      (run) => !!getDeleteConfirmConfig(run.toolName) && run.interaction === "confirm" && (run.status === "pending" || run.status === "running" || run.status === "failed") && !dismissedConfirmRunIds.has(run.id)
    ),
    [allToolRuns, dismissedConfirmRunIds]
  );
  const pendingDeleteConfig = getDeleteConfirmConfig(
    pendingDeleteRun?.toolName
  );
  const pendingDeleteMessage = (0, import_react29.useMemo)(
    () => pendingDeleteRun ? currentMessages.find(
      (message) => message?.toolPayload?.toolRunId === pendingDeleteRun.id
    ) : null,
    [currentMessages, pendingDeleteRun]
  );
  const pendingDeletePreview = (0, import_react29.useMemo)(() => {
    return parseDeleteConfirmPreview(pendingDeleteMessage?.content);
  }, [pendingDeleteMessage]);
  const pendingDeleteActionGate = (0, import_react29.useMemo)(
    () => buildConfirmActionGate(pendingDeleteRun?.toolName, pendingDeleteRun),
    [pendingDeleteRun]
  );
  const pendingDeleteLabel = (0, import_react29.useMemo)(() => {
    const fallback = pendingDeleteRun?.input?.query || pendingDeleteMessage?.toolPayload?.summary || (pendingDeleteActionGate ? translateGateTitle(t, pendingDeleteActionGate) : void 0) || (pendingDeleteConfig?.fallbackLabel ? t(pendingDeleteConfig.fallbackLabel) : void 0) || t("toolConfirm.fallbackMatched");
    return resolveDeleteConfirmLabel({
      config: pendingDeleteConfig,
      preview: pendingDeletePreview,
      fallback,
      translateMultiple: ({ title, count, entity }) => t("toolConfirm.deleteLabelMultiple", {
        title,
        count,
        entity: t(entity)
      })
    });
  }, [
    pendingDeleteActionGate,
    pendingDeleteConfig,
    pendingDeleteMessage,
    pendingDeletePreview,
    pendingDeleteRun,
    t
  ]);
  const pendingDeleteFailureLabel = (0, import_react29.useMemo)(
    () => pendingDeleteConfig?.failureLabel ? t(pendingDeleteConfig.failureLabel) : "",
    [pendingDeleteConfig, t]
  );
  const handleConfirmDelete = (0, import_react29.useCallback)(() => {
    if (!pendingDeleteRun || !pendingDeleteConfig) return;
    const confirmedIds = collectDeleteConfirmIds({
      config: pendingDeleteConfig,
      preview: pendingDeletePreview
    });
    if (confirmedIds.length === 0) return;
    dispatch(
      executeToolRun({
        id: pendingDeleteRun.id,
        inputOverride: {
          ...pendingDeleteRun.input ?? {},
          [pendingDeleteConfig.confirmedInputKey]: confirmedIds
        }
      })
    ).unwrap().then((result) => {
      const toolMessage = pendingDeleteMessage;
      const nextSummary = typeof result?.displayData === "string" && result.displayData.trim() || pendingDeleteRun.outputSummary || toolMessage?.toolPayload?.summary || t(pendingDeleteConfig.executedSummary);
      if (toolMessage?.id) {
        const changes = {
          content: JSON.stringify(result?.rawData ?? {}),
          isStreaming: false,
          toolName: pendingDeleteRun.toolName,
          toolRunId: pendingDeleteRun.id,
          toolPayload: {
            ...toolMessage.toolPayload ?? {},
            toolName: pendingDeleteRun.toolName,
            status: "succeeded",
            input: pendingDeleteRun.input,
            rawToolCall: toolMessage.toolPayload?.rawToolCall,
            toolRunId: pendingDeleteRun.id,
            summary: nextSummary
          }
        };
        dispatch(
          updateToolMessage({ id: toolMessage.id, changes })
        );
        if (toolMessage.dbKey) {
          dispatch(
            write({
              data: {
                ...toolMessage,
                ...changes,
                type: "msg" /* MSG */
              },
              customKey: toolMessage.dbKey
            })
          );
        }
      }
      const parentAssistant = currentMessages.find(
        (message) => message?.id === pendingDeleteRun.messageId
      );
      const parentAgentKey = parentAssistant?.cybotKey;
      if (parentAgentKey) {
        dispatch(
          streamAgentChatTurn({
            agentKey: parentAgentKey,
            userInput: t("tool.resumePrompt", {
              defaultValue: "\u8BF7\u57FA\u4E8E\u521A\u624D\u5DE5\u5177\u6267\u884C\u7684\u7ED3\u679C\u7EE7\u7EED\u5B8C\u6210\u4F60\u4E4B\u524D\u7684\u8BA1\u5212\uFF1B\u5982\u679C\u4EFB\u52A1\u5DF2\u7ECF\u5B8C\u6210\uFF0C\u8BF7\u7528\u7B80\u6D01\u7684\u65B9\u5F0F\u603B\u7ED3\u7ED3\u679C\u3002"
            })
          })
        );
      }
    }).catch(() => void 0);
  }, [
    currentMessages,
    dispatch,
    pendingDeleteConfig,
    pendingDeleteMessage,
    pendingDeletePreview,
    pendingDeleteRun,
    t
  ]);
  const handleDismissDelete = (0, import_react29.useCallback)(() => {
    if (!pendingDeleteRun) return;
    setDismissedConfirmRunIds((prev) => {
      const next = new Set(prev);
      next.add(pendingDeleteRun.id);
      return next;
    });
  }, [pendingDeleteRun]);
  return {
    pendingDeleteRun,
    pendingDeleteConfig,
    pendingDeletePreview,
    pendingDeleteLabel,
    pendingDeleteFailureLabel,
    handleConfirmDelete,
    handleDismissDelete
  };
}

// packages/chat/web/MessageInputCore.tsx
var import_jsx_runtime27 = __toESM(require_jsx_runtime());
var MOBILE_BREAKPOINT = 768;
var DESKTOP_TEXTAREA_MAX_HEIGHT = 360;
var MOBILE_TEXTAREA_MAX_HEIGHT = 220;
var MessageInput = (0, import_react30.forwardRef)(({
  runtimeOptions,
  imageUiConfig,
  agentPicker
}, ref) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const currentDialogKey = useCurrentDialogKey();
  const pendingFiles = usePendingFiles(currentDialogKey);
  const currentDialogConfig = useCurrentDialogConfig();
  const currentDialogId = (0, import_react30.useMemo)(
    () => currentDialogConfig?.id ?? (currentDialogKey ? extractCustomId(currentDialogKey) : null),
    [currentDialogConfig?.id, currentDialogKey]
  );
  const currentMessages = useAppSelector(
    (state) => currentDialogId && state?.message ? selectAllMsgs(state, currentDialogId) : []
  );
  const allToolRuns = useAllToolRuns();
  const balance = useAppSelector(selectCurrentUserBalance) ?? 0;
  const canMultiImg = balance >= 19;
  const { currentServer, currentToken: token } = useAppSelector(selectRuntimeSnapshot);
  const ocrModel = useAppSelector(selectOcrModel);
  const favoriteAgentIds = useFavoriteAgentIds();
  const favoriteAgentIdsSignature = (0, import_react30.useMemo)(
    () => favoriteAgentIds.join("|"),
    [favoriteAgentIds]
  );
  const favoriteAgentIdList = (0, import_react30.useMemo)(
    () => favoriteAgentIdsSignature.length > 0 ? favoriteAgentIdsSignature.split("|") : [],
    [favoriteAgentIdsSignature]
  );
  const cachedFavoriteAgents = useAppSelector(
    (state) => favoriteAgentIds.map((agentKey) => {
      try {
        return {
          agentKey,
          agent: selectById(state, agentKey) ?? null
        };
      } catch {
        return {
          agentKey,
          agent: null
        };
      }
    })
  );
  const cachedFavoriteAgentsRef = (0, import_react30.useRef)(cachedFavoriteAgents);
  (0, import_react30.useEffect)(() => {
    cachedFavoriteAgentsRef.current = cachedFavoriteAgents;
  }, [cachedFavoriteAgents]);
  const [loadedFavoriteAgentsByKey, setLoadedFavoriteAgentsByKey] = (0, import_react30.useState)({});
  const {
    text,
    setText,
    imageFiles,
    imgPreviews,
    processImages: hookProcessImages,
    removeImage: hookRemoveImage,
    clear: clearInputBase
  } = useChatInput({
    draftKey: currentDialogKey,
    maxImages: canMultiImg ? Infinity : 1,
    onImageLimitExceeded: () => {
      toast.error(
        t(
          "insufficientBalanceForMultipleImages",
          "\u4F59\u989D\u672A\u8FBE\u523019\uFF0C\u4EC5\u96501\u5F20\u56FE\u7247"
        )
      );
    }
  });
  const [pastedBlocks, setPastedBlocks] = (0, import_react30.useState)([]);
  const clearInput = (0, import_react30.useCallback)(() => {
    clearInputBase();
    setPastedBlocks([]);
  }, [clearInputBase]);
  const textRef = (0, import_react30.useRef)(text);
  (0, import_react30.useEffect)(() => {
    textRef.current = text;
  }, [text]);
  const composeOutgoingText = (0, import_react30.useCallback)(
    (baseText = text) => {
      const parts = [
        baseText.trim() ? baseText : "",
        ...pastedBlocks.map((block) => block.text)
      ].filter((part) => part.length > 0);
      return parts.join("\n\n");
    },
    [pastedBlocks, text]
  );
  const removePastedBlock = (0, import_react30.useCallback)((id) => {
    setPastedBlocks((prev) => prev.filter((block) => block.id !== id));
  }, []);
  const {
    processingCount,
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus
  } = useMessageInputFiles(hookProcessImages, {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    currentDialogKey,
    pendingFiles
  });
  (0, import_react30.useEffect)(() => {
    if (!currentDialogKey) return;
    const staged = takeStagedFilesForDialog(currentDialogKey);
    if (staged.length) void processFiles(staged);
  }, [currentDialogKey, processFiles]);
  const hasStreamingMessage = useHasStreamingMessage(currentDialogId);
  const activeControllers = useActiveControllers();
  const isLoopRunning = Object.keys(activeControllers).length > 0;
  const appSelectedNode = useAppSelectedNode();
  const [imageAspectRatio, setImageAspectRatio] = (0, import_react30.useState)(
    void 0
  );
  const [imageSize, setImageSize] = (0, import_react30.useState)(
    void 0
  );
  const [imageProfileKey, setImageProfileKey] = (0, import_react30.useState)(void 0);
  const selectedImageProfile = (0, import_react30.useMemo)(
    () => imageUiConfig?.imageProfiles?.find(
      (profile) => profile.key === imageProfileKey
    ),
    [imageProfileKey, imageUiConfig]
  );
  (0, import_react30.useEffect)(() => {
    if (!imageProfileKey) return;
    if (selectedImageProfile) return;
    setImageProfileKey(void 0);
  }, [imageProfileKey, selectedImageProfile]);
  const [mentionState, setMentionState] = (0, import_react30.useState)(
    () => createInactiveMentionState()
  );
  const [mentionHighlightIndex, setMentionHighlightIndex] = (0, import_react30.useState)(0);
  const [mentionTargetAgentKey, setMentionTargetAgentKey] = (0, import_react30.useState)(null);
  const [isTextareaFocused, setIsTextareaFocused] = (0, import_react30.useState)(false);
  const [editingSession, setEditingSession] = (0, import_react30.useState)(
    null
  );
  const canvasEditSelection = useCanvasEditSelection();
  const chatInputSeed = useChatInputSeed();
  const areaRef = (0, import_react30.useRef)(null);
  const rootRef = (0, import_react30.useRef)(null);
  const isComposingRef = (0, import_react30.useRef)(false);
  const lastCompositionEndAtRef = (0, import_react30.useRef)(0);
  (0, import_react30.useEffect)(() => {
    if (!chatInputSeed) return;
    const { text: seedText, mode, focus } = chatInputSeed;
    if (!seedText) return;
    {
      const prev = text;
      const spacer = prev && !prev.endsWith(" ") ? " " : "";
      setText(
        mode === "append" && prev ? `${prev}${spacer}${seedText}` : seedText
      );
    }
    setEditingSession(
      chatInputSeed.editMessageId ? {
        messageId: chatInputSeed.editMessageId,
        originalContent: chatInputSeed.originalContent
      } : null
    );
    publishChatInputSeed(null);
    if (focus && areaRef.current) {
      requestAnimationFrame(() => {
        areaRef.current?.focus();
        const len = areaRef.current?.value?.length ?? 0;
        areaRef.current?.setSelectionRange(len, len);
      });
    }
  }, [chatInputSeed, setText, text]);
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const maxTextareaHeight = isMobile ? MOBILE_TEXTAREA_MAX_HEIGHT : DESKTOP_TEXTAREA_MAX_HEIGHT;
  const expandPastedBlock = (0, import_react30.useCallback)(
    (id) => {
      const target = pastedBlocks.find((block) => block.id === id);
      if (!target) return;
      const nextText = text.trim() ? `${text}

${target.text}` : target.text;
      setPastedBlocks((prev) => prev.filter((block) => block.id !== id));
      setText(nextText);
      requestAnimationFrame(() => {
        const el = areaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, maxTextareaHeight)}px`;
        el.focus();
        const end = nextText.length;
        el.setSelectionRange(end, end);
      });
    },
    [maxTextareaHeight, pastedBlocks, setText, text]
  );
  useElementSizeVar(
    rootRef,
    "--message-input-height"
  );
  const { handleChange: autoResizeOnChange } = useAutoResizeTextarea({
    maxHeight: maxTextareaHeight,
    onTextChange: setText,
    value: text,
    ref: areaRef
  });
  (0, import_react30.useEffect)(() => {
    if (favoriteAgentIdList.length === 0) {
      setLoadedFavoriteAgentsByKey({});
      return;
    }
    let cancelled = false;
    const loadFavoriteAgents = async () => {
      const results = await Promise.all(
        favoriteAgentIdList.map(async (agentKey) => {
          try {
            const cachedEntry = cachedFavoriteAgentsRef.current.find(
              (entry) => entry.agentKey === agentKey
            );
            if (cachedEntry?.agent) return null;
            const agent = await dispatch(
              read({ dbKey: agentKey })
            ).unwrap();
            if (!agent || cancelled) return null;
            return { agentKey, agent };
          } catch (err) {
            console.warn(
              "[MessageInput] Failed to load favorite agent:",
              agentKey,
              err
            );
            return null;
          }
        })
      );
      if (!cancelled) {
        setLoadedFavoriteAgentsByKey((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const result of results) {
            if (result?.agentKey && result.agent && next[result.agentKey] !== result.agent) {
              next[result.agentKey] = result.agent;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    };
    void loadFavoriteAgents();
    return () => {
      cancelled = true;
    };
  }, [favoriteAgentIdList, dispatch]);
  const favoriteAgents = (0, import_react30.useMemo)(
    () => resolveFavoriteAgentSummaries(
      favoriteAgentIdList.map((agentKey) => ({
        agentKey,
        agent: cachedFavoriteAgents.find(
          (entry) => entry.agentKey === agentKey
        )?.agent ?? loadedFavoriteAgentsByKey[agentKey] ?? null
      }))
    ),
    [cachedFavoriteAgents, favoriteAgentIdList, loadedFavoriteAgentsByKey]
  );
  const updateMentionState = (0, import_react30.useCallback)(
    (value, cursorIndex) => {
      setMentionState(resolveAgentMentionState(value, cursorIndex));
      setMentionHighlightIndex(0);
    },
    []
  );
  const handleTextareaChange = (0, import_react30.useCallback)(
    (event) => {
      autoResizeOnChange(event);
      const cursor = event.target.selectionStart ?? event.target.value.length;
      updateMentionState(event.target.value, cursor);
    },
    [autoResizeOnChange, updateMentionState]
  );
  const filteredFavoriteAgents = (0, import_react30.useMemo)(() => {
    return filterFavoriteAgentsByQuery({
      favoriteAgents,
      isAgentMentionActive: mentionState.active && mentionState.kind === "agent",
      query: mentionState.query
    });
  }, [mentionState, favoriteAgents]);
  const insertMention = (0, import_react30.useCallback)(
    (agent) => {
      const textarea = areaRef.current;
      if (!textarea) return;
      const currentValue = textarea.value ?? "";
      const cursorPos = textarea.selectionStart ?? currentValue.length;
      const result = buildAgentMentionInsertion({
        currentValue,
        cursorPos,
        mentionState,
        agent
      });
      if (!result) return;
      setText(result.nextText);
      setMentionTargetAgentKey(result.targetAgentKey);
      setMentionState(result.nextMentionState);
      setMentionHighlightIndex(result.nextMentionHighlightIndex);
      requestAnimationFrame(() => {
        if (!areaRef.current) return;
        const nextCursor = result.nextText.length - currentValue.slice(cursorPos).length;
        areaRef.current.focus();
        areaRef.current.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [mentionState, setText]
  );
  const setMentionStateInactive = (0, import_react30.useCallback)(() => {
    setMentionState({
      active: false,
      kind: null,
      query: "",
      startIndex: -1
    });
    setMentionHighlightIndex(0);
    setMentionTargetAgentKey(null);
  }, []);
  (0, import_react30.useImperativeHandle)(ref, () => ({ processFiles }), [processFiles]);
  const {
    pendingSendImageCount,
    isSendPending,
    isSendBlocked,
    fileUploadDisabled,
    cancelEditingSession,
    sendMessage,
    sendMessageRef
  } = useMessageInputSend({
    text,
    textRef,
    imageFiles,
    imgPreviews,
    pendingFiles,
    clearInput,
    clearFileStatus,
    processingCount,
    hasStreamingMessage,
    isLoopRunning,
    canMultiImg,
    mentionTargetAgentKey,
    setMentionStateInactive,
    currentDialogKey,
    currentDialogConfig,
    currentServer,
    token,
    runtimeOptions,
    imageUiConfig,
    imageAspectRatio,
    imageSize,
    selectedImageProfile,
    canvasEditSelection,
    editingSession,
    setEditingSession,
    appSelectedNode,
    areaRef
  });
  const hasContent = (0, import_react30.useMemo)(
    () => !!text.trim() || pastedBlocks.length > 0 || imgPreviews.length > 0 || pendingFiles.length > 0,
    [text, pastedBlocks.length, imgPreviews.length, pendingFiles.length]
  );
  const showVoiceInput = !hasContent && !isSendBlocked && !isTextareaFocused;
  const { handlePaste: handleFilesPaste } = useClipboardFiles(processFiles);
  const handleTextareaPaste = (0, import_react30.useCallback)(
    (event) => {
      handleFilesPaste(event);
      const files = event.clipboardData?.files;
      if (files && files.length > 0) return;
      const pasted = event.clipboardData?.getData("text/plain") ?? "";
      if (!shouldCollapsePaste(pasted, WEB_PASTE_THRESHOLD)) return;
      event.preventDefault();
      setPastedBlocks((prev) => [...prev, { id: nanoid(), text: pasted }]);
    },
    [handleFilesPaste]
  );
  const handleTextareaKeyDown = (0, import_react30.useCallback)(
    (event) => {
      const shouldDeferEnter = shouldDeferEnterForIme({
        event,
        isComposing: isComposingRef.current,
        lastCompositionEndAt: lastCompositionEndAtRef.current
      });
      const hasMentionMenu = mentionState.active && mentionState.kind === "agent" && filteredFavoriteAgents.length > 0;
      switch (decideMessageInputKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        isMobile,
        hasMentionMenu,
        shouldDeferEnterForIme: shouldDeferEnter
      })) {
        case "mention-next":
          event.preventDefault();
          event.stopPropagation();
          setMentionHighlightIndex(
            (prev) => moveMentionHighlightIndex({
              previousIndex: prev,
              optionCount: filteredFavoriteAgents.length,
              direction: "next"
            })
          );
          return;
        case "mention-prev":
          event.preventDefault();
          event.stopPropagation();
          setMentionHighlightIndex(
            (prev) => moveMentionHighlightIndex({
              previousIndex: prev,
              optionCount: filteredFavoriteAgents.length,
              direction: "prev"
            })
          );
          return;
        case "mention-select": {
          event.preventDefault();
          event.stopPropagation();
          const target = filteredFavoriteAgents[mentionHighlightIndex] ?? filteredFavoriteAgents[0];
          if (target) {
            insertMention(target);
          }
          return;
        }
        case "mention-close":
          event.preventDefault();
          event.stopPropagation();
          setMentionState(createInactiveMentionState());
          setMentionHighlightIndex(0);
          return;
        case "send":
          event.preventDefault();
          void sendMessage(composeOutgoingText());
          return;
        default:
          return;
      }
    },
    [
      isMobile,
      sendMessage,
      composeOutgoingText,
      mentionState,
      filteredFavoriteAgents,
      mentionHighlightIndex,
      insertMention
    ]
  );
  const handleSendClick = (0, import_react30.useCallback)(() => {
    void sendMessage(composeOutgoingText());
  }, [composeOutgoingText, sendMessage]);
  const showIndicator = processingCount > 0 || isSendPending;
  const indicatorText = processingCount ? t("processingFiles", { count: processingCount }) : pendingSendImageCount > 0 ? t("compressingImagesMessage", "Compressing images, please wait...") : t("sending", "Sending...");
  const resolvedImageUiConfig = (0, import_react30.useMemo)(() => {
    if (!imageUiConfig) return imageUiConfig;
    const activePricingModel = selectedImageProfile?.pricingModel ?? imageUiConfig.pricingModel;
    const activeWaitHint = selectedImageProfile?.waitHint ?? imageUiConfig.waitHint;
    if (!activePricingModel && !activeWaitHint) return imageUiConfig;
    return {
      ...imageUiConfig,
      waitHint: activeWaitHint,
      pricePerImage: getApproxPricePerImage(
        activePricingModel,
        imageSize
      ) ?? void 0,
      pricingModel: activePricingModel
    };
  }, [imageSize, imageUiConfig, selectedImageProfile]);
  const showImageConfigRow = !!resolvedImageUiConfig?.showControls && !!resolvedImageUiConfig.supportsImageConfig;
  const mentionMenuVisible = mentionState.active && mentionState.kind === "agent" && filteredFavoriteAgents.length > 0;
  const {
    pendingDeleteRun,
    pendingDeleteConfig,
    pendingDeletePreview,
    pendingDeleteLabel,
    pendingDeleteFailureLabel,
    handleConfirmDelete,
    handleDismissDelete
  } = useMessageInputDeleteConfirm({
    allToolRuns,
    currentMessages
  });
  const handleCompositionStart = (0, import_react30.useCallback)(() => {
    isComposingRef.current = true;
  }, []);
  const handleCompositionEnd = (0, import_react30.useCallback)(() => {
    isComposingRef.current = false;
    lastCompositionEndAtRef.current = Date.now();
  }, []);
  const handleTextareaFocus = (0, import_react30.useCallback)(() => {
    setIsTextareaFocused(true);
  }, []);
  const handleTextareaBlur = (0, import_react30.useCallback)(() => {
    isComposingRef.current = false;
    setIsTextareaFocused(false);
  }, []);
  const handleHoverMention = (0, import_react30.useCallback)((index) => {
    setMentionHighlightIndex(index);
  }, []);
  const handleVoiceTranscribed = (0, import_react30.useCallback)(
    (transcript) => {
      setText(textRef.current ? `${textRef.current} ${transcript}` : transcript);
    },
    [setText]
  );
  const handleVoiceSend = (0, import_react30.useCallback)((transcript) => {
    void sendMessageRef.current(transcript);
  }, [sendMessageRef]);
  const handleDismissCanvasEdit = (0, import_react30.useCallback)(() => {
    publishCanvasEditSelection(null);
  }, []);
  const sendDisabled = !hasContent || isSendBlocked || !canMultiImg && imgPreviews.length > 1;
  const canvasChipLabel = canvasEditSelection ? `\u6B63\u5728\u7F16\u8F91 ${canvasEditSelection.part} \xB7 ${canvasEditSelection.type}` : "";
  const editingChipLabel = t(
    "editingMessageNotice",
    "\u6B63\u5728\u7F16\u8F91\u5386\u53F2\u6D88\u606F\uFF0C\u53D1\u9001\u540E\u5C06\u4E22\u5F03\u5176\u540E\u7684\u6D88\u606F"
  );
  const placeholder = processingCount > 0 ? t("waitForProcessing") : t("messageOrFileHere");
  const composerVtStyle = viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME);
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(import_jsx_runtime27.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
    "div",
    {
      ref: rootRef,
      className: `message-input ${processingCount > 0 ? "message-input--processing" : ""}`,
      style: composerVtStyle,
      children: /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "message-input__wrapper", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(BrowseContextIndicator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputAttachmentsPanel,
          {
            imagePreviews: imgPreviews,
            pendingFiles: pendingFilesWithStatus,
            onRemoveImage: hookRemoveImage,
            processingFiles: processingFileIds,
            isMobile
          }
        ),
        resolvedImageUiConfig && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputImageConfigPanel,
          {
            visible: showImageConfigRow,
            aspectRatio: imageAspectRatio,
            imageSize,
            imageProfileKey,
            imageUiConfig: resolvedImageUiConfig,
            onAspectRatioChange: setImageAspectRatio,
            onImageSizeChange: setImageSize,
            onImageProfileChange: (v) => setImageProfileKey(v)
          }
        ),
        canvasEditSelection && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputChip,
          {
            label: canvasChipLabel,
            onDismiss: handleDismissCanvasEdit,
            dismissAriaLabel: "\u53D6\u6D88\u753B\u5E03\u7F16\u8F91\u76EE\u6807"
          }
        ),
        editingSession && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputChip,
          {
            label: editingChipLabel,
            onDismiss: cancelEditingSession,
            dismissAriaLabel: t("cancelEditingMessage", "\u53D6\u6D88\u7F16\u8F91\u6D88\u606F")
          }
        ),
        pastedBlocks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "message-input__paste-chips", children: pastedBlocks.map((block, index) => /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputChip,
          {
            className: "message-input__paste-chip",
            label: t(
              "pastedTextChip",
              "Pasted text #{{id}} \xB7 {{lines}} lines \xB7 {{size}}",
              {
                id: index + 1,
                lines: countTextLines(block.text),
                size: formatPasteByteSize(
                  estimatePasteBytes(block.text)
                )
              }
            ),
            onActivate: () => expandPastedBlock(block.id),
            activateAriaLabel: t(
              "expandPastedText",
              "Expand pasted text into the input"
            ),
            onDismiss: () => removePastedBlock(block.id),
            dismissAriaLabel: t("removePastedText", "Remove pasted text")
          },
          block.id
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputActivityPanel,
          {
            messages: currentMessages,
            isActive: isLoopRunning || hasStreamingMessage
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(RunningProcessesPanel, { messages: currentMessages }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          QueueBadge,
          {
            dialogKey: currentDialogKey,
            isRunning: isLoopRunning || hasStreamingMessage
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          MessageInputConfirmPanel,
          {
            visible: !!(pendingDeleteRun && pendingDeleteConfig),
            status: pendingDeleteRun?.status ?? "pending",
            errorText: pendingDeleteRun?.error,
            failureLabel: pendingDeleteFailureLabel,
            deleteLabel: pendingDeleteLabel,
            confirmDisabled: pendingDeleteRun?.status === "running" || !Array.isArray(pendingDeletePreview?.deletable) || pendingDeletePreview.deletable.length === 0,
            dismissDisabled: pendingDeleteRun?.status === "running",
            onConfirm: handleConfirmDelete,
            onDismiss: handleDismissDelete
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "message-input__box chat-input-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
            MessageInputComposer,
            {
              areaRef,
              text,
              placeholder,
              ariaLabel: t("messageInput"),
              onChange: handleTextareaChange,
              onCompositionStart: handleCompositionStart,
              onCompositionEnd: handleCompositionEnd,
              onFocus: handleTextareaFocus,
              onBlur: handleTextareaBlur,
              onKeyDown: handleTextareaKeyDown,
              onPaste: handleTextareaPaste,
              mentionMenuVisible,
              filteredFavoriteAgents,
              mentionHighlightIndex,
              mentionHeaderText: t(
                "mentionFavoritesLabel",
                "\u9009\u62E9\u8981 @ \u7684\u6536\u85CF\u52A9\u624B"
              ),
              onSelectMention: insertMention,
              onHoverMention: handleHoverMention
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
            MessageInputControlsBar,
            {
              fileUploadDisabled,
              onFilesSelected: processFiles,
              showVoiceInput,
              onTranscribed: handleVoiceTranscribed,
              onVoiceSend: handleVoiceSend,
              onSendClick: handleSendClick,
              sendDisabled,
              agentPicker
            }
          )
        ] }),
        showIndicator && /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "message-input__indicator", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "message-input__spinner" }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { children: indicatorText })
        ] })
      ] })
    }
  ) });
});

// packages/chat/web/MessageInputContainer.tsx
var import_jsx_runtime28 = __toESM(require_jsx_runtime());
var MessageInputContainer = (0, import_react31.forwardRef)(({ runtimeOptions, agentPicker }, ref) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation("chat");
  const balance = useAppSelector(selectCurrentUserBalance);
  const userId = useUserId();
  const {
    sendPermission,
    getErrorMessage,
    isLoading: isSendPermissionLoading
  } = useSendPermission(balance ?? 0);
  const isLoading = isSendPermissionLoading || typeof balance !== "number" && !sendPermission.allowed;
  const dialogConfig = useCurrentDialogConfig();
  const autoDialog = isAutoDialog(dialogConfig);
  const activeAgentId = autoDialog ? null : getPrimaryDialogAgentId(dialogConfig);
  const activeAgent = useAppSelector((state) => {
    if (!activeAgentId) return null;
    try {
      return selectById(state, activeAgentId) ?? null;
    } catch {
      return null;
    }
  });
  const [loadedActiveAgent, setLoadedActiveAgent] = (0, import_react31.useState)(
    null
  );
  const [isSwitchModelDialogOpen, setIsSwitchModelDialogOpen] = (0, import_react31.useState)(false);
  (0, import_react31.useEffect)(() => {
    if (userId) {
      dispatch(fetchUserProfile());
    }
  }, [userId, dispatch]);
  (0, import_react31.useEffect)(() => {
    if (!activeAgentId) {
      setLoadedActiveAgent(null);
      return;
    }
    if (activeAgent) {
      setLoadedActiveAgent(activeAgent);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const agent = await dispatch(
          read({ dbKey: activeAgentId })
        ).unwrap();
        if (cancelled) return;
        setLoadedActiveAgent(agent ?? null);
      } catch (error) {
        if (cancelled) return;
        console.warn(
          "[MessageInputContainer] Failed to load agent/model config:",
          error
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAgent, activeAgentId, dispatch]);
  const resolvedActiveAgent = activeAgent ?? loadedActiveAgent;
  const resolvedAgentUi = (0, import_react31.useMemo)(
    () => resolveMessageInputAgentUi({
      agent: resolvedActiveAgent ?? resolveDialogAutoAgentConfig(dialogConfig),
      userId: userId ?? null
    }),
    [resolvedActiveAgent, dialogConfig, userId]
  );
  const switchModelQueryUserId = resolvedAgentUi.switchModelQueryUserId;
  const currentModelCapabilities = resolvedAgentUi.currentModelCapabilities;
  const imageUiConfig = resolvedAgentUi.imageUiConfig;
  const handleOpenSwitchModelDialog = (0, import_react31.useCallback)(() => {
    setIsSwitchModelDialogOpen(true);
  }, []);
  const handleCloseSwitchModelDialog = (0, import_react31.useCallback)(() => {
    setIsSwitchModelDialogOpen(false);
  }, []);
  const handleSelectPrimaryAgent = (0, import_react31.useCallback)(
    async (nextAgentId) => {
      const targetAgentId = Array.isArray(nextAgentId) ? nextAgentId[0] : nextAgentId;
      if (!targetAgentId) return;
      try {
        await dispatch(setPrimaryDialogAgent(targetAgentId)).unwrap();
        setIsSwitchModelDialogOpen(false);
        toast.success(
          t("switchModelContinueSuccess", "\u5DF2\u5207\u6362\u6A21\u578B\uFF0C\u5E76\u7EE7\u7EED\u5F53\u524D\u5BF9\u8BDD")
        );
      } catch (error) {
        console.error(
          "[MessageInputContainer] Failed to switch model:",
          error
        );
        toast.error(t("switchModelContinueFailed", "\u5207\u6362\u6A21\u578B\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"));
      }
    },
    [dispatch, t]
  );
  const handleSwitchAgent = (0, import_react31.useCallback)(
    async (agentKey) => {
      if (!dialogConfig) {
        toast.success(
          t("switchModelNoDialog", "\u5F53\u524D\u8FD8\u6CA1\u6709\u5BF9\u8BDD\uFF0C\u53D1\u9001\u4E00\u6761\u6D88\u606F\u540E\u518D\u5207\u6362\u6A21\u578B")
        );
        return;
      }
      try {
        await dispatch(setPrimaryDialogAgent(agentKey)).unwrap();
        toast.success(
          t("switchModelContinueSuccess", "\u5DF2\u5207\u6362\u6A21\u578B\uFF0C\u5E76\u7EE7\u7EED\u5F53\u524D\u5BF9\u8BDD")
        );
      } catch (error) {
        console.error(
          "[MessageInputContainer] Failed to switch composer agent:",
          error
        );
        toast.error(t("switchModelContinueFailed", "\u5207\u6362\u6A21\u578B\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"));
      }
    },
    [dialogConfig, dispatch, t]
  );
  const { candidates: pickerCandidates } = useAgentPickerCandidates({
    activeAgentId,
    limit: 30
  });
  const defaultAgentPicker = (0, import_react31.useMemo)(() => {
    return {
      candidates: pickerCandidates,
      activeAgentKey: activeAgentId,
      onSelect: handleSwitchAgent,
      defaultOption: {
        label: "\u81EA\u52A8",
        description: "\u7531\u5F53\u524D\u6D88\u606F\u548C\u4EE3\u7801\u5185\u7F6E\u6267\u884C\u7B56\u7565\u9009\u62E9\u6A21\u578B"
      }
    };
  }, [pickerCandidates, activeAgentId, handleSwitchAgent]);
  const resolvedAgentPicker = agentPicker ?? defaultAgentPicker;
  const currentUser = useCurrentUser();
  const isProBlocked = (0, import_react31.useMemo)(() => {
    return shouldBlockForGptPro(
      resolvedActiveAgent,
      currentUser?.gptProAccess?.status
    ).blocked;
  }, [resolvedActiveAgent, currentUser]);
  if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(LoadingPlaceholder, {});
  if (isProBlocked) {
    return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
        ErrorMessage,
        {
          message: GPT_PRO_BLOCKED_MESSAGE,
          showRecharge: true,
          onRecharge: () => navigate("/recharge"),
          showChooseModel: !!activeAgentId,
          onChooseModel: handleOpenSwitchModelDialog
        }
      ),
      isSwitchModelDialogOpen && switchModelQueryUserId && activeAgentId && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
        AddAgentDialog_default,
        {
          isOpen: isSwitchModelDialogOpen,
          onClose: handleCloseSwitchModelDialog,
          onAddAgent: handleSelectPrimaryAgent,
          title: t("chooseAnotherModelDialogTitle", "\u9009\u62E9\u5176\u4ED6\u6A21\u578B"),
          actionLabel: t("useThisModelContinue", "\u7528\u8FD9\u4E2A\u6A21\u578B\u7EE7\u7EED"),
          selectionMode: "single",
          excludeAgentIds: [activeAgentId],
          emptyLabel: t("noAlternativeModels", "\u6CA1\u6709\u5176\u4ED6\u53EF\u7528\u6A21\u578B"),
          preferredCapabilities: currentModelCapabilities ?? void 0,
          preferredProvider: currentModelCapabilities?.provider
        }
      )
    ] });
  }
  if (!sendPermission.allowed) {
    return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
        ErrorMessage,
        {
          message: getErrorMessage(
            sendPermission.reason,
            sendPermission.pricing
          ),
          showRecharge: sendPermission.reason === "INSUFFICIENT_BALANCE",
          onRecharge: () => navigate("/recharge"),
          showChooseModel: sendPermission.reason === "NO_MODEL_PRICING" && !!activeAgentId,
          onChooseModel: handleOpenSwitchModelDialog
        }
      ),
      isSwitchModelDialogOpen && switchModelQueryUserId && activeAgentId && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
        AddAgentDialog_default,
        {
          isOpen: isSwitchModelDialogOpen,
          onClose: handleCloseSwitchModelDialog,
          onAddAgent: handleSelectPrimaryAgent,
          title: t("chooseAnotherModelDialogTitle", "\u9009\u62E9\u5176\u4ED6\u6A21\u578B"),
          actionLabel: t("useThisModelContinue", "\u7528\u8FD9\u4E2A\u6A21\u578B\u7EE7\u7EED"),
          selectionMode: "single",
          excludeAgentIds: [activeAgentId],
          emptyLabel: t("noAlternativeModels", "\u6CA1\u6709\u5176\u4ED6\u53EF\u7528\u6A21\u578B"),
          preferredCapabilities: currentModelCapabilities ?? void 0,
          preferredProvider: currentModelCapabilities?.provider
        }
      )
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
    MessageInput,
    {
      ref,
      runtimeOptions,
      imageUiConfig,
      agentPicker: resolvedAgentPicker
    }
  );
});
var MessageInputContainer_default = MessageInputContainer;

// packages/chat/web/ChatArea.tsx
var import_jsx_runtime29 = __toESM(require_jsx_runtime());
var ChatAreaComponent = ({
  dialogId,
  scrollContainerSelector,
  runtimeOptions,
  messagesClassName,
  agentPicker
}) => {
  const messageInputRef = (0, import_react32.useRef)(null);
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } = useFileDropZone((files) => {
    messageInputRef.current?.processFiles(files);
  });
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
    "div",
    {
      className: "chat-area",
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
          "div",
          {
            className: messagesClassName,
            style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
            children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(ChatErrorBoundary_default, { fallbackMessage: "\u6D88\u606F\u5217\u8868\u52A0\u8F7D\u51FA\u9519", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
              MessageList_default,
              {
                dialogId,
                scrollContainerSelector
              }
            ) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(ChatErrorBoundary_default, { fallbackMessage: "\u8F93\u5165\u6846\u52A0\u8F7D\u51FA\u9519", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
          MessageInputContainer_default,
          {
            ref: messageInputRef,
            runtimeOptions,
            agentPicker
          }
        ) }),
        isDragOver && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "chat-area__drop-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { children: "\u62D6\u5165\u56FE\u7247\u6216\u6587\u4EF6\u4EE5\u6DFB\u52A0\u9644\u4EF6" }) })
      ]
    }
  );
};
var ChatArea = (0, import_react32.memo)(ChatAreaComponent);

export {
  useCurrentDialogConfig,
  getQuickChatFirstMessageText,
  shouldRenderQuickChatNewDialogShell,
  resolveDialogPageLoadState,
  getDialogPageRenderMode,
  getDialogPageTitle,
  resolveDialogNotificationState,
  resolveInheritedContextBanner,
  stageFilesForDialog,
  ChatArea
};
