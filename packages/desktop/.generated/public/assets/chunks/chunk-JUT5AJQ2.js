import {
  getAgentRecordIdentifiers,
  getAgentRecordKey,
  getAgentRecordTimestamp,
  isAgentRecordOwned
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
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $7705c033048f6da7$export$353f5b6fc5456de1,
  $f2ff30fde7b014be$export$2e1e1122cf0cba88
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectById,
  useFavoriteAgentIds,
  useFavoriteFavoritedAtById
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuBot,
  LuCheck,
  LuChevronDown,
  LuStar,
  LuUser,
  LuZap
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/utils/ime.ts
var IME_FALLBACK_KEYCODE = 229;
var COMPOSITION_END_GRACE_MS = 48;
var shouldDeferEnterForIme = ({
  event,
  isComposing,
  lastCompositionEndAt,
  now = Date.now()
}) => {
  const nativeEvent = event.nativeEvent;
  const keyCode = nativeEvent?.keyCode ?? nativeEvent?.which ?? event.keyCode ?? event.which ?? 0;
  if (isComposing || nativeEvent?.isComposing) {
    return true;
  }
  if (keyCode === IME_FALLBACK_KEYCODE) {
    return true;
  }
  return now - lastCompositionEndAt < COMPOSITION_END_GRACE_MS;
};

// packages/chat/web/AgentPickerControl.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var useAgentEntity = (agentKey) => {
  const cached = useAppSelector(
    (state) => agentKey ? selectById(state, agentKey) : void 0
  );
  const { data: fetched } = useFetchData(
    agentKey && !cached ? agentKey : null
  );
  return fetched ?? cached;
};
var AgentPickerItem = ({ candidate, isActive, onSelect }) => {
  const { t } = useTranslation(["chat", "ai"]);
  const agent = useAgentEntity(candidate.key);
  const badge = candidate.isFavorite ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "agent-picker__item-badge is-favorite",
      "aria-label": t("chat:favoriteAgent", "\u6536\u85CF"),
      title: t("chat:favoriteAgent", "\u6536\u85CF"),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuStar, { size: 11 })
    }
  ) : candidate.isOwned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "agent-picker__item-badge is-owned",
      "aria-label": t("chat:myAgent", "\u6211\u7684"),
      title: t("chat:myAgent", "\u6211\u7684"),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUser, { size: 11 })
    }
  ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "agent-picker__item-badge is-public",
      "aria-label": t("ai:agentSquare", "\u5E7F\u573A"),
      title: t("ai:agentSquare", "\u5E7F\u573A"),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 11 })
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "li",
    {
      className: `agent-picker__item${isActive ? " is-active" : ""}`,
      "aria-current": isActive || void 0,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick: () => onSelect(candidate.key), children: [
        badge,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent-picker__item-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-name", children: agent?.name ?? candidate.key }),
          (agent?.introduction || agent?.model) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-intro", children: agent?.introduction || agent?.model })
        ] }),
        isActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-check", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14 }) })
      ] })
    }
  );
};
var AgentPickerControlBase = ({
  candidates,
  activeAgentKey,
  onSelect,
  defaultOption,
  hint,
  placeholderLabel,
  ariaLabel,
  className
}) => {
  const { t } = useTranslation(["chat", "ai"]);
  const [open, setOpen] = (0, import_react.useState)(false);
  const normalizedActiveKey = typeof activeAgentKey === "string" && activeAgentKey.trim() ? activeAgentKey.trim() : null;
  const activeAgent = useAgentEntity(normalizedActiveKey);
  const isDefaultActive = normalizedActiveKey == null;
  if (candidates.length === 0 && !defaultOption) return null;
  const fallbackLabel = placeholderLabel ?? t("chat:selectAssistant", "\u9009\u62E9\u52A9\u624B");
  const triggerLabel = isDefaultActive ? defaultOption?.label ?? fallbackLabel : activeAgent?.name ?? fallbackLabel;
  const triggerIcon = isDefaultActive && defaultOption ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuZap, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 14, "aria-hidden": "true" });
  const triggerAria = ariaLabel ?? (isDefaultActive ? `${t("chat:switchAssistant", "\u5207\u6362\u52A9\u624B")}\uFF1A${triggerLabel}` : `${t("chat:switchAssistant", "\u5207\u6362\u52A9\u624B")}\uFF1A${triggerLabel}`);
  const handleSelect = (agentKey) => {
    setOpen(false);
    if (agentKey !== (normalizedActiveKey ?? "")) onSelect(agentKey);
  };
  const rootClass = ["agent-picker", open ? "is-open" : "", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: rootClass, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($f2ff30fde7b014be$export$2e1e1122cf0cba88, { isOpen: open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      $7705c033048f6da7$export$353f5b6fc5456de1,
      {
        className: "agent-picker__trigger",
        "aria-label": triggerAria,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__trigger-icon", "aria-hidden": "true", children: triggerIcon }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__trigger-label", children: triggerLabel }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            LuChevronDown,
            {
              size: 12,
              className: "agent-picker__trigger-caret",
              "aria-hidden": "true"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Popover,
      {
        placement: "top start",
        offset: 6,
        hideArrow: true,
        className: "agent-picker__popover nolo-select-popup select-popover",
        style: { width: 280, padding: 0 },
        children: [
          hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-picker__hint", children: hint }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "agent-picker__list", children: [
            defaultOption && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "li",
              {
                className: `agent-picker__item${isDefaultActive ? " is-active" : ""}`,
                "aria-current": isDefaultActive || void 0,
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick: () => handleSelect(""), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "span",
                    {
                      className: "agent-picker__item-badge is-default",
                      "aria-hidden": "true",
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuZap, { size: 11 })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "agent-picker__item-text", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-name", children: defaultOption.label }),
                    defaultOption.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-intro", children: defaultOption.description })
                  ] }),
                  isDefaultActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agent-picker__item-check", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14 }) })
                ] })
              }
            ),
            candidates.map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              AgentPickerItem,
              {
                candidate,
                isActive: candidate.key === normalizedActiveKey,
                onSelect: handleSelect
              },
              candidate.key
            ))
          ] }),
          candidates.length === 0 && defaultOption && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agent-picker__empty", children: t("chat:noAvailableAgents", "\u6682\u65E0\u53EF\u7528 Agent") })
        ]
      }
    )
  ] }) });
};
var AgentPickerControl = (0, import_react.memo)(AgentPickerControlBase);

// packages/chat/hooks/useAgentPickerCandidates.ts
var import_react2 = __toESM(require_react());
var OWNED_AGENT_DATA_TYPES = ["agent" /* AGENT */];
function buildAgentPickerCandidates(input) {
  const {
    ownedAgents,
    publicAgents,
    favoriteAgentIds,
    favoritedAtById,
    activeAgentId,
    currentUserId,
    limit
  } = input;
  const favoriteSet = new Set(favoriteAgentIds.map(String));
  const seen = /* @__PURE__ */ new Set();
  const sortableItems = [];
  let order = 0;
  const add = (key, source, raw) => {
    if (!key || seen.has(key)) return;
    const identifiers = getAgentRecordIdentifiers(raw);
    if (identifiers.some((id) => seen.has(id))) return;
    seen.add(key);
    for (const id of identifiers) {
      if (id) seen.add(id);
    }
    const isFavorite = identifiers.some((id) => favoriteSet.has(id));
    const favoritedAtFor = identifiers.reduce(
      (latest, id) => Math.max(latest, Number(favoritedAtById[id]) || 0),
      0
    );
    const isOwned = isAgentRecordOwned(raw, source, currentUserId);
    sortableItems.push({
      key,
      favoritedAt: isFavorite ? favoritedAtFor || 1 : void 0,
      isOwned,
      isPublic: source === "public" || !isOwned,
      updatedAt: getAgentRecordTimestamp(raw),
      order: order++
    });
  };
  for (const item of ownedAgents) {
    add(getAgentRecordKey(item), "owned", item);
  }
  for (const item of publicAgents) {
    add(getAgentRecordKey(item), "public", item);
  }
  for (const favId of favoriteAgentIds) {
    const key = String(favId || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    sortableItems.push({
      key,
      favoritedAt: Number(favoritedAtById[key]) || 1,
      isOwned: false,
      isPublic: false,
      updatedAt: 0,
      order: order++
    });
  }
  const sorted = sortAgentsFavoriteOwnedPublic(sortableItems).slice(0, limit);
  const result = sorted.map((item) => ({
    key: item.key,
    isFavorite: item.favoritedAt != null && item.favoritedAt > 0,
    isOwned: Boolean(item.isOwned),
    isPublic: Boolean(item.isPublic)
  }));
  if (activeAgentId) {
    const idx = result.findIndex((c) => c.key === activeAgentId);
    if (idx > 0) {
      const [active] = result.splice(idx, 1);
      result.unshift(active);
    } else if (idx === -1) {
      result.unshift({
        key: activeAgentId,
        isFavorite: favoriteSet.has(activeAgentId),
        isOwned: false,
        isPublic: false
      });
    }
  }
  return result;
}
function useAgentPickerCandidates({
  activeAgentId,
  limit = 30
} = {}) {
  const currentUserId = useUserId();
  const favoriteAgentIds = useFavoriteAgentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();
  const fetchLimit = Math.max(limit * 4, 120);
  const { data: publicAgents = [], loading: publicLoading } = usePublicAgents({
    limit: fetchLimit,
    sortBy: "recommended",
    reloadMode: "catalog",
    summary: true
  });
  const { data: ownedAgents = [], loading: ownedLoading } = useUserData(
    OWNED_AGENT_DATA_TYPES,
    currentUserId || "",
    fetchLimit,
    { partialDataStrategy: "hydrated-cache" }
  );
  const candidates = (0, import_react2.useMemo)(
    () => buildAgentPickerCandidates({
      ownedAgents,
      publicAgents,
      favoriteAgentIds,
      favoritedAtById,
      activeAgentId,
      currentUserId,
      limit
    }),
    [
      activeAgentId,
      currentUserId,
      favoriteAgentIds,
      favoritedAtById,
      limit,
      ownedAgents,
      publicAgents
    ]
  );
  return {
    candidates,
    loading: publicLoading || ownedLoading
  };
}

export {
  AgentPickerControl,
  useAgentPickerCandidates,
  shouldDeferEnterForIme
};
