import {
  EmptyState_default,
  PublicAgentsList_default
} from "/public/assets/chunks/chunk-HBS3PDZZ.js";
import "/public/assets/chunks/chunk-7W3NEOUM.js";
import "/public/assets/chunks/chunk-VR5RNFCD.js";
import "/public/assets/chunks/chunk-5GGTP5ZM.js";
import "/public/assets/chunks/chunk-U6SGTC52.js";
import "/public/assets/chunks/chunk-JJGKUQA3.js";
import "/public/assets/chunks/chunk-D2IAHGBR.js";
import {
  getShareTypeLabel
} from "/public/assets/chunks/chunk-XCKMPAB4.js";
import {
  createWebSharePath,
  shareApi
} from "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import "/public/assets/chunks/chunk-WOLEEY5H.js";
import "/public/assets/chunks/chunk-JQ6XROM5.js";
import "/public/assets/chunks/chunk-CA74EWBF.js";
import "/public/assets/chunks/chunk-FYMUXPF2.js";
import "/public/assets/chunks/chunk-UFYPTJWC.js";
import {
  Avatar_default
} from "/public/assets/chunks/chunk-EOM4G5HF.js";
import "/public/assets/chunks/chunk-ZCACUALD.js";
import "/public/assets/chunks/chunk-7HVHEMQ3.js";
import "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  usePublicAgents
} from "/public/assets/chunks/chunk-5SG4AG33.js";
import {
  useFetchData
} from "/public/assets/chunks/chunk-EA4SLPRB.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-4JMBIZX5.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-7HTHEFUV.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-IHMA4QTO.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
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
  createUserKey,
  formatShareTime,
  isSystemAdmin,
  normalizeUserId,
  remove,
  selectCurrentServer,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuGlobe,
  LuPencil,
  LuShare2,
  LuTrash2
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
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

// packages/ai/agent/web/CreatorPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var CreatorPage = () => {
  const { userId = "" } = useParams();
  const { t } = useTranslation(["ai", "common", "space"]);
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const server = useAppSelector(selectCurrentServer);
  const [shares, setShares] = import_react.default.useState([]);
  const [sharesLoading, setSharesLoading] = import_react.default.useState(false);
  const [sharesError, setSharesError] = import_react.default.useState(null);
  const [activeTab, setActiveTab] = import_react.default.useState("agents");
  const cleanUserId = import_react.default.useMemo(() => {
    return normalizeUserId(userId);
  }, [userId]);
  const normalizedCurrentUserId = import_react.default.useMemo(
    () => normalizeUserId(currentUserId),
    [currentUserId]
  );
  const canManageAnyShare = isSystemAdmin(currentUserId);
  import_react.default.useEffect(() => {
    if (!cleanUserId) {
      setShares([]);
      return;
    }
    let cancelled = false;
    const loadCreatorShares = async () => {
      setSharesLoading(true);
      setSharesError(null);
      try {
        const params = new URLSearchParams({ limit: "100" });
        const response = await fetch(
          shareApi.creatorCommunity(server, cleanUserId, params)
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];
        if (!cancelled) setShares(list);
      } catch {
        if (!cancelled) {
          setShares([]);
          setSharesError(t("loadError", "\u65E0\u6CD5\u52A0\u8F7D\u521B\u4F5C\u8005\u5185\u5BB9"));
        }
      } finally {
        if (!cancelled) setSharesLoading(false);
      }
    };
    void loadCreatorShares();
    return () => {
      cancelled = true;
    };
  }, [cleanUserId, t, server]);
  const profileKey = import_react.default.useMemo(() => createUserKey.profile(cleanUserId), [cleanUserId]);
  const { data: profile, isLoading: isProfileLoading } = useFetchData(profileKey);
  const { loading: agentsLoading, error, data: agents, retry } = usePublicAgents({
    userId: cleanUserId,
    limit: 100,
    sortBy: "newest",
    reloadMode: "catalog"
  });
  const loading = agentsLoading || isProfileLoading;
  const creatorName = import_react.default.useMemo(() => {
    if (!isProfileLoading) {
      if (profile?.nickname) return profile.nickname;
      if (profile?.username) return profile.username;
      if (profile?.name) return profile.name;
    }
    const firstAgent = agents?.[0];
    if (firstAgent?.userName) return firstAgent.userName;
    if (firstAgent?.creatorName) return firstAgent.creatorName;
    if (firstAgent?.creator?.name) return firstAgent.creator.name;
    if (isProfileLoading) return " ";
    return cleanUserId.slice(0, 8) || t("unknownUser");
  }, [profile, agents, cleanUserId, t, isProfileLoading]);
  const stats = import_react.default.useMemo(() => {
    if (!agents) return { count: 0, totalUse: 0 };
    return {
      count: agents.length,
      totalUse: agents.reduce((sum, agent) => sum + (agent.metrics?.useCount || 0), 0)
    };
  }, [agents]);
  const canDeleteShare = import_react.default.useCallback(
    (share) => {
      if (!normalizedCurrentUserId) return false;
      const isOwner = normalizeUserId(share.authorId) === normalizedCurrentUserId;
      return isOwner || canManageAnyShare;
    },
    [normalizedCurrentUserId, canManageAnyShare]
  );
  const handleDeleteShare = import_react.default.useCallback(
    async (share) => {
      if (!canDeleteShare(share)) {
        toast.error(t("noPermission", "\u4F60\u6CA1\u6709\u6743\u9650\u5220\u9664\u8BE5\u5206\u4EAB"));
        return;
      }
      const confirmed = window.confirm(
        canManageAnyShare ? "\u786E\u8BA4\u5220\u9664\u8BE5\u5206\u4EAB\uFF1F\u7BA1\u7406\u5458\u5220\u9664\u540E\uFF0C\u8BE5\u793E\u533A\u5206\u4EAB\u5C06\u4E0D\u53EF\u8BBF\u95EE\u3002" : "\u786E\u8BA4\u5220\u9664\u8BE5\u5206\u4EAB\uFF1F\u5220\u9664\u540E\u8BE5\u793E\u533A\u5206\u4EAB\u5C06\u4E0D\u53EF\u8BBF\u95EE\u3002"
      );
      if (!confirmed) return;
      try {
        const dbKey = `share-${share.token}`;
        await dispatch(remove(dbKey)).unwrap();
        setShares((prev) => prev.filter((item) => item.token !== share.token));
        toast.success(t("deleteSuccess", "\u5206\u4EAB\u5DF2\u5220\u9664"));
      } catch {
        toast.error(t("deleteError", "\u5220\u9664\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
      }
    },
    [canDeleteShare, canManageAnyShare, dispatch, t]
  );
  const avatarSrc = profile?.avatar || profile?.avatarUrl || profile?.avatarFileId;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "creator-page__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__header-bg" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__header-content", children: isProfileLoading && !profile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__avatar-wrapper creator-page__avatar-wrapper--skeleton", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__avatar-skeleton creator-page__shimmer" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__main-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__title-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__title-skeleton creator-page__shimmer" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__bio-skeleton creator-page__shimmer" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__stats-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__stat-card-skeleton creator-page__shimmer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__stat-card-skeleton creator-page__shimmer" })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__avatar-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Avatar_default,
          {
            name: creatorName,
            size: "xxlarge",
            type: "user",
            shape: "full",
            className: "creator-page__avatar",
            src: avatarSrc
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__main-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__title-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "creator-page__title", children: creatorName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__badge", children: "Verified Creator" })
          ] }),
          (profile?.bio || profile?.signature) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__bio", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPencil, { size: 14, className: "creator-page__bio-icon", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: profile.bio || profile.signature })
          ] }),
          profile?.website && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__website", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGlobe, { size: 14, className: "creator-page__website-icon", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: profile.website.startsWith("http") ? profile.website : `https://${profile.website}`, target: "_blank", rel: "noopener noreferrer", children: profile.website.replace(/^https?:\/\//, "") })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__stats-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__stat-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-value", children: agentsLoading && !agents ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-value-skeleton creator-page__shimmer" }) : stats.count }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-label", children: t("published", "\u5DF2\u53D1\u5E03") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__stat-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-value", children: agentsLoading && !agents ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-value-skeleton creator-page__shimmer" }) : stats.totalUse }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__stat-label", children: t("totalUse", "\u603B\u4F7F\u7528") })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__tabs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `creator-page__tab-btn ${activeTab === "agents" ? "active" : ""}`,
            onClick: () => setActiveTab("agents"),
            children: [
              t("publicAgents", "\u5C55\u793A\u6A71\u7A97"),
              !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__tab-badge", children: stats.count })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `creator-page__tab-btn ${activeTab === "shares" ? "active" : ""}`,
            onClick: () => setActiveTab("shares"),
            children: [
              t("communityShares", "\u793E\u533A\u5206\u4EAB"),
              !sharesLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__tab-badge", children: shares.length })
            ]
          }
        )
      ] }),
      activeTab === "agents" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__tab-pane", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          PublicAgentsList_default,
          {
            loading: agentsLoading,
            data: agents,
            reload: retry,
            keepGridHeight: true
          }
        ),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__error", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("loadError", "\u65E0\u6CD5\u52A0\u8F7D\u521B\u4F5C\u8005\u5185\u5BB9") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "creator-page__retry-btn", onClick: () => void retry(), children: t("retry", "\u91CD\u65B0\u52A0\u8F7D") })
        ] })
      ] }),
      activeTab === "shares" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__tab-pane", children: [
        sharesLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__share-state", children: t("loading", "\u52A0\u8F7D\u4E2D...") }),
        !sharesLoading && sharesError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__share-state", children: sharesError }),
        !sharesLoading && !sharesError && shares.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          EmptyState_default,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuShare2, { size: 32 }),
            title: t("noCommunityShares", "\u6682\u65E0\u516C\u5F00\u7684\u5206\u4EAB\u5185\u5BB9"),
            subtitle: "\u8BE5\u7528\u6237\u6682\u672A\u5728\u793E\u533A\u516C\u5F00\u5206\u4EAB\u4EFB\u4F55\u5185\u5BB9"
          }
        ),
        !sharesLoading && shares.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "creator-page__share-grid", children: shares.map((share) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "creator-page__share-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__share-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__share-type", children: getShareTypeLabel(share.type) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "creator-page__share-time", children: formatShareTime(share.createdAt) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "creator-page__share-title", children: share.title }),
          share.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "creator-page__share-description", children: share.description }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "creator-page__share-actions", children: [
            share.type === "app" /* APP */ && share.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "a",
              {
                href: share.url,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "creator-page__share-link",
                children: t("openApp", "\u6253\u5F00\u5E94\u7528")
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Link,
              {
                to: createWebSharePath(share.token),
                className: "creator-page__share-link",
                children: t("viewDetails", "\u67E5\u770B\u8BE6\u60C5")
              }
            ),
            canDeleteShare(share) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: "creator-page__share-delete-btn",
                onClick: () => void handleDeleteShare(share),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" }),
                  t("delete", "\u5220\u9664")
                ]
              }
            )
          ] })
        ] }, share.token)) })
      ] })
    ] })
  ] });
};
var CreatorPage_default = CreatorPage;
export {
  CreatorPage_default as default
};
