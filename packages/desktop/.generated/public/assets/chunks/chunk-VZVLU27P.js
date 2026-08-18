import {
  withTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __publicField,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/ChatErrorBoundary.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ChatErrorBoundary = class extends import_react.Component {
  constructor() {
    super(...arguments);
    __publicField(this, "state", { hasError: false });
    __publicField(this, "handleRetry", () => {
      this.setState({ hasError: false });
    });
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ChatErrorBoundary:", error, errorInfo);
  }
  render() {
    const { t, fallbackMessage } = this.props;
    if (this.state.hasError) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-error-boundary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: fallbackMessage || t("chat.errorBoundary.message", "\u6B64\u533A\u57DF\u52A0\u8F7D\u51FA\u9519") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: this.handleRetry, children: t("chat.errorBoundary.retry", "\u91CD\u8BD5") })
      ] });
    }
    return this.props.children;
  }
};
var ChatErrorBoundary_default = withTranslation()(ChatErrorBoundary);

export {
  ChatErrorBoundary_default
};
