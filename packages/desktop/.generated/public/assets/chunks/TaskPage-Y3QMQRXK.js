import {
  Link,
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  read,
  selectById
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildDialogUrl
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
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

// packages/chat/task/TaskPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var formatTime = (value) => {
  const ms = asOptionalFiniteNumber(value);
  return ms !== void 0 ? new Date(ms).toLocaleString() : "\u672A\u5B89\u6392";
};
var TaskPage = ({ taskKey }) => {
  const { spaceId } = useParams();
  const dispatch = useAppDispatch();
  const automation = useAppSelector(
    (state) => selectById(state, taskKey)
  );
  (0, import_react.useEffect)(() => {
    if (taskKey) {
      void dispatch(read({ dbKey: taskKey }));
    }
  }, [dispatch, taskKey]);
  if (!automation) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 24 }, children: "\u6B63\u5728\u52A0\u8F7D\u81EA\u52A8\u5316..." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { style: { padding: 24, maxWidth: 920 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { style: { display: "grid", gap: 8, marginBottom: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#64748b", fontSize: 13 }, children: "\u81EA\u52A8\u5316" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { style: { margin: 0, fontSize: 28 }, children: automation.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: "#475569" }, children: [
        automation.status,
        " \xB7 ",
        automation.runStatus ?? "idle",
        " \xB7",
        " ",
        automation.trigger?.type === "cron" ? automation.trigger.expression : ""
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: { display: "grid", gap: 8, marginBottom: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u4E0B\u6B21\u6267\u884C\uFF1A",
        formatTime(automation.trigger?.nextWakeAt)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u4E0A\u6B21\u6267\u884C\uFF1A",
        formatTime(automation.lastRunAt)
      ] }),
      automation.lastRunDialogKey && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u6700\u8FD1\u4E00\u6B21\u8FD0\u884C\uFF1A",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, { to: buildDialogUrl(automation.lastRunDialogKey, spaceId), children: automation.lastRunDialogKey })
      ] }),
      automation.lastRunError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: "#b91c1c" }, children: [
        "\u6700\u8FD1\u9519\u8BEF\uFF1A",
        automation.lastRunError
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: { display: "grid", gap: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: 0, fontSize: 18 }, children: "\u6307\u4EE4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { whiteSpace: "pre-wrap", color: "#334155" }, children: automation.instruction })
    ] })
  ] });
};
var TaskPage_default = TaskPage;
export {
  TaskPage_default as default
};
