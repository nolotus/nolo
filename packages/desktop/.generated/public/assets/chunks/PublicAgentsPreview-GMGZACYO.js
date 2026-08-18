import {
  AgentGrid_default
} from "/public/assets/chunks/chunk-5GGTP5ZM.js";
import "/public/assets/chunks/chunk-U6SGTC52.js";
import {
  AgentCard_default
} from "/public/assets/chunks/chunk-WPWDPBUQ.js";
import "/public/assets/chunks/chunk-JJGKUQA3.js";
import "/public/assets/chunks/chunk-D2IAHGBR.js";
import "/public/assets/chunks/chunk-WOLEEY5H.js";
import "/public/assets/chunks/chunk-JQ6XROM5.js";
import "/public/assets/chunks/chunk-CA74EWBF.js";
import "/public/assets/chunks/chunk-FYMUXPF2.js";
import "/public/assets/chunks/chunk-UFYPTJWC.js";
import "/public/assets/chunks/chunk-EOM4G5HF.js";
import "/public/assets/chunks/chunk-ZCACUALD.js";
import "/public/assets/chunks/chunk-7HVHEMQ3.js";
import "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  usePublicAgents
} from "/public/assets/chunks/chunk-5SG4AG33.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-4JMBIZX5.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-IHMA4QTO.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
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

// packages/ai/agent/web/PublicAgentsPreview.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SKELETON_COUNT = 6;
var PublicAgentsPreviewSkeleton = (0, import_react.memo)(() => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentGrid_default, { children: Array.from({ length: SKELETON_COUNT }).map((_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-card", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-avatar public-agents__shimmer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-header-text", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" })
    ] })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-body", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__shimmer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "public-agents__skeleton-footer", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__shimmer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" })
  ] })
] }, index)) }));
PublicAgentsPreviewSkeleton.displayName = "PublicAgentsPreviewSkeleton";
var PublicAgentsPreview = (0, import_react.memo)(({ data = [] }) => {
  const { data: refreshedData } = usePublicAgents({
    limit: 6,
    sortBy: "recommended",
    initialData: data,
    reloadMode: "catalog",
    summary: true
  });
  const previewData = refreshedData.length > 0 ? refreshedData : data;
  const hasData = previewData.length > 0;
  if (!hasData) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__list-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PublicAgentsPreviewSkeleton, {}) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "public-agents__list-wrapper", "data-preview-only": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentGrid_default, { children: previewData.slice(0, 6).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentCard_default, { item }, item.id)) }) });
});
PublicAgentsPreview.displayName = "PublicAgentsPreview";
var PublicAgentsPreview_default = PublicAgentsPreview;
export {
  PublicAgentsPreview_default as default
};
