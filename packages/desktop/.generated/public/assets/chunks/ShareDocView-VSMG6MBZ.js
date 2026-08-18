import {
  ReadOnlyMarkdownContent_default
} from "/public/assets/chunks/chunk-5DFY76KP.js";
import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  splitSlateTitleAndBody
} from "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  slateToRenderMarkdown
} from "/public/assets/chunks/chunk-PTH5G2FS.js";
import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  NavLink
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectCurrentSpaceId,
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCheck,
  LuDownload,
  LuLoader
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/share/ShareDocView.tsx
var import_react2 = __toESM(require_react());

// packages/app/pages/share/DocImportView.tsx
var import_react = __toESM(require_react());

// packages/app/pages/share/ImportBar.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ImportBar = ({
  status,
  importedKey,
  error,
  price,
  onImport,
  onPurchaseAndImport,
  onCancelPurchase
}) => {
  if (status === "done" && importedKey) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ImportBar-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ImportBar-success", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 16, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5DF2\u5BFC\u5165\u5230\u4F60\u7684\u7A7A\u95F4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, { to: `/${encodeURIComponent(importedKey)}`, className: "ImportBar-link", children: "\u6253\u5F00\u6587\u6863 \u2192" })
    ] }) });
  }
  if (status === "requires-purchase") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ImportBar-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ImportBar-purchaseBar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ImportBar-price", children: [
        price,
        " \u79EF\u5206"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "ImportBar-btn ImportBar-btn--primary", onClick: onPurchaseAndImport, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 15, "aria-hidden": "true" }),
        " \u8D2D\u4E70\u5E76\u5BFC\u5165"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ImportBar-btn ImportBar-btn--ghost", onClick: onCancelPurchase, children: "\u53D6\u6D88" })
    ] }) });
  }
  const isLoading = status === "importing" || status === "purchasing";
  const label = status === "purchasing" ? "\u8D2D\u4E70\u4E2D\u2026" : status === "importing" ? "\u5BFC\u5165\u4E2D\u2026" : "\u5BFC\u5165\u5230\u6211\u7684\u7A7A\u95F4";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ImportBar-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "ImportBar-btn ImportBar-btn--primary",
        onClick: onImport,
        disabled: isLoading,
        children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLoader, { size: 15, className: "ImportBar-spinner", "aria-hidden": "true" }),
          " ",
          label
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 15, "aria-hidden": "true" }),
          " ",
          label
        ] })
      }
    ),
    status === "error" && error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ImportBar-error", children: error })
  ] });
};
var ImportBar_default = ImportBar;

// packages/app/pages/share/DocImportView.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var Editor = (0, import_react.lazy)(() => import("/public/assets/chunks/Editor-D6LWDHBK.js"));
var PlainMarkdownFallback = ({
  markdown,
  initialValue
}) => {
  const normalizedMarkdown = asTrimmedString(markdown);
  if (normalizedMarkdown) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("article", { className: "DocImportView-plainMarkdownFallback", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("pre", { children: normalizedMarkdown }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Editor, { initialValue, readOnly: true });
};
var DocImportView = ({
  shared,
  token,
  documentTitle,
  initialValue,
  markdown
}) => {
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const [status, setStatus] = (0, import_react.useState)("idle");
  const [importedKey, setImportedKey] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [price, setPrice] = (0, import_react.useState)(0);
  const isLockedPreview = shared.meta?.previewLocked || shared.meta?.requiresPurchase;
  const callImport = (0, import_react.useCallback)(async () => {
    if (!currentToken || !currentServer) return false;
    setStatus("importing");
    const res = await fetch(`${currentServer}/api/v1/share/${token}/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ spaceId: currentSpaceId ?? void 0 })
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 402 && json?.requiresPurchase) {
      setPrice(json.price ?? 0);
      setStatus("requires-purchase");
      return false;
    }
    if (!res.ok || !json?.success || !json?.dbKey) {
      setError(json?.message ?? `\u5BFC\u5165\u5931\u8D25 (${res.status})`);
      setStatus("error");
      return false;
    }
    setImportedKey(json.dbKey);
    setStatus("done");
    return true;
  }, [currentToken, currentServer, currentSpaceId, token]);
  const handleImport = (0, import_react.useCallback)(async () => {
    if (!currentToken) return;
    if (status !== "idle" && status !== "error") return;
    setError(null);
    await callImport();
  }, [currentToken, status, callImport]);
  const handlePurchaseAndImport = (0, import_react.useCallback)(async () => {
    if (!currentToken || !currentServer) return;
    setStatus("purchasing");
    setError(null);
    const res = await fetch(`${currentServer}/api/v1/share/${token}/purchase`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const json = await res.json().catch(() => ({}));
    if (!json?.success) {
      setError(json?.message ?? "\u8D2D\u4E70\u5931\u8D25");
      setStatus("error");
      return;
    }
    await callImport();
  }, [currentToken, currentServer, token, callImport]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "DocImportView-root", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "DocImportView-shell", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "DocImportView-titleShell", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "h1",
      {
        className: `DocImportView-title${!asOptionalTrimmedString(documentTitle) ? " is-placeholder" : ""}`,
        children: asOptionalTrimmedString(documentTitle) ?? "\u672A\u547D\u540D\u9875\u9762"
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PageLoading_default, { message: "\u6B63\u5728\u6E32\u67D3\u5206\u4EAB\u5185\u5BB9...", fullHeight: false }), children: isLockedPreview ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "DocImportView-lockedCard", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u8BE5\u6587\u6863\u4E3A\u4ED8\u8D39\u5185\u5BB9" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u5F53\u524D\u4EC5\u5C55\u793A\u5206\u4EAB\u4FE1\u606F\uFF0C\u8D2D\u4E70\u540E\u53EF\u5BFC\u5165\u5230\u4F60\u7684\u7A7A\u95F4\u67E5\u770B\u5B8C\u6574\u6B63\u6587\u3002" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ReadOnlyMarkdownContent_default,
      {
        markdown,
        fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          PlainMarkdownFallback,
          {
            markdown,
            initialValue
          }
        )
      }
    ) }),
    currentToken && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ImportBar_default,
      {
        status,
        importedKey,
        error,
        price,
        onImport: handleImport,
        onPurchaseAndImport: handlePurchaseAndImport,
        onCancelPurchase: () => setStatus("idle")
      }
    )
  ] }) });
};
var DocImportView_default = DocImportView;

// packages/app/pages/share/ShareDocView.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var EMPTY_DOC_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];
var EMPTY_SHARED_PAGE_VALUE = [{ type: "paragraph", children: [{ text: "(Empty shared page)" }] }];
var buildInitialValue = (shared) => {
  const pageData = shared.data;
  if (Array.isArray(pageData?.slateData) && pageData.slateData.length > 0) {
    return splitSlateTitleAndBody(pageData.slateData, shared.meta?.title).body;
  }
  if (typeof pageData?.content === "string" && pageData.content.trim()) {
    try {
      return splitSlateTitleAndBody(markdownToSlate(pageData.content), shared.meta?.title).body;
    } catch {
      return EMPTY_SHARED_PAGE_VALUE;
    }
  }
  return EMPTY_SHARED_PAGE_VALUE;
};
var buildMarkdown = (shared, initialValue) => {
  if (Array.isArray(initialValue) && initialValue.length > 0) {
    const nextMarkdown = slateToRenderMarkdown(initialValue).trim();
    if (nextMarkdown) return nextMarkdown;
  }
  const legacyContent = shared.data?.content;
  return asOptionalTrimmedString(legacyContent) ?? null;
};
var buildDocumentTitle = (shared, fallbackTitle) => {
  if (Array.isArray(shared.data?.slateData) && shared.data.slateData.length > 0) {
    return splitSlateTitleAndBody(shared.data.slateData, shared.meta?.title).title || fallbackTitle;
  }
  if (typeof shared.data?.content === "string" && shared.data.content.trim()) {
    try {
      return splitSlateTitleAndBody(markdownToSlate(shared.data.content), shared.meta?.title).title || fallbackTitle;
    } catch {
      return fallbackTitle;
    }
  }
  return fallbackTitle;
};
var ShareDocView = ({ shared, token, fallbackTitle }) => {
  const initialValue = (0, import_react2.useMemo)(() => buildInitialValue(shared), [shared]);
  const markdown = (0, import_react2.useMemo)(() => buildMarkdown(shared, initialValue), [initialValue, shared]);
  const documentTitle = (0, import_react2.useMemo)(
    () => buildDocumentTitle(shared, fallbackTitle),
    [fallbackTitle, shared]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    DocImportView_default,
    {
      shared,
      token,
      documentTitle,
      initialValue: initialValue ?? EMPTY_DOC_VALUE,
      markdown
    }
  );
};
var ShareDocView_default = ShareDocView;
export {
  ShareDocView_default as default
};
