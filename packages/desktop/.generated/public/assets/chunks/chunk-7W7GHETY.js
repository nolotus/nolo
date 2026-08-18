import {
  ShareCard
} from "/public/assets/chunks/chunk-TCYK5LBJ.js";
import {
  createWebSharePath,
  shareApi
} from "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import {
  useSSRCommunityShares
} from "/public/assets/chunks/chunk-MFOH33JJ.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/ShareCommunityPreview.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var mapSummary = (s) => ({
  ...s,
  dbKey: `share-${s.token}`,
  path: createWebSharePath(s.token),
  ...s.authorId ? { authorPath: `/profile/${encodeURIComponent(s.authorId)}` } : {},
  ...s.agentKey ? { agentPath: `/${encodeURIComponent(s.agentKey)}` } : {}
});
var ShareCommunityPreview = ({ active = true }) => {
  const ssrCommunityShares = useSSRCommunityShares();
  const [shares, setShares] = (0, import_react.useState)(
    () => Array.isArray(ssrCommunityShares.data) ? ssrCommunityShares.data.map(mapSummary) : []
  );
  const [loading, setLoading] = (0, import_react.useState)(() => shares.length === 0);
  const [error, setError] = (0, import_react.useState)(null);
  const server = useAppSelector(selectRemoteServer);
  (0, import_react.useEffect)(() => {
    if (!active) return;
    let cancelled = false;
    const load = async () => {
      if (shares.length === 0) {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "6", coverImage: "url" });
        const res = await fetch(shareApi.community(server, params));
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const json = await res.json();
        if (!cancelled) setShares((json.data || []).map(mapSummary));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "\u52A0\u8F7D\u793E\u533A\u5206\u4EAB\u5931\u8D25");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, server, shares.length]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPreview", children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPreview__loading", children: "\u6B63\u5728\u52A0\u8F7D\u6700\u65B0\u5206\u4EAB..." }) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPreview__empty", children: error }) : shares.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPreview__grid", children: shares.map((share) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShareCard, { share }, share.dbKey)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ShareCommunityPreview__empty", children: '\u6682\u65E0\u793E\u533A\u5206\u4EAB\uFF0C\u5148\u53BB\u6587\u7AE0\u6216\u5BF9\u8BDD\u9875\u70B9\u51FB"\u793E\u533A\u5206\u4EAB"\u3002' }) });
};
var ShareCommunityPreview_default = ShareCommunityPreview;

export {
  ShareCommunityPreview_default
};
