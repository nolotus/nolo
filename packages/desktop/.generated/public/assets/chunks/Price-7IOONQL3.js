import {
  buildStaticPageMeta,
  usePageMeta
} from "/public/assets/chunks/chunk-M4PBN5X7.js";
import {
  Table,
  TableCell,
  TableRow
} from "/public/assets/chunks/chunk-KLA2PJT7.js";
import "/public/assets/chunks/chunk-6Q7JCK5Q.js";
import "/public/assets/chunks/chunk-QJUZO4YG.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT
} from "/public/assets/chunks/chunk-52ICTTPO.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuGift,
  LuRocket,
  LuShield,
  LuSparkles,
  LuX,
  LuZap
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import {
  ALL_MODELS
} from "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  shouldHideKimiAliasFromPricing
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";
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

// packages/app/pages/Pricing/Price.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var getNestedValue = (obj, path) => path.split(".").reduce((o, k) => (o || {})[k], obj);
var Card = ({ tier, isPro }) => {
  const { t } = useTranslation();
  const Icon = tier.icon;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `pricing-card ${isPro ? "pricing-card--pro" : ""}`, children: [
    isPro && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pricing-card__badge", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSparkles, { className: "pricing-card__badge-icon", "aria-hidden": "true" }),
      " ",
      t("pricing.recommend", "\u63A8\u8350")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "pricing-card__icon-wrapper",
        style: { background: tier.color },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { "aria-hidden": "true" })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "pricing-card__title", children: tier.name }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pricing-card__meta", children: tier.meta }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pricing-card__price", children: tier.price }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "pricing-card__features", children: tier.features.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "li",
      {
        className: `pricing-card__feature ${f.ok ? "pricing-card__feature--ok" : "pricing-card__feature--no"}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: `pricing-card__status-icon ${f.ok ? "pricing-card__status-icon--ok" : "pricing-card__status-icon--no"}`,
              children: f.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 12, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 12, "aria-hidden": "true" })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: f.text })
        ]
      },
      f.text
    )) })
  ] });
};
var UsageRules = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const tiers = (0, import_react.useMemo)(() => {
    const starterFeaturesRaw = t("pricing.tiers.starter.features", { returnObjects: true });
    const proFeaturesRaw = t("pricing.tiers.pro.features", { returnObjects: true });
    const advancedFeaturesRaw = t("pricing.tiers.advanced.features", { returnObjects: true });
    const starterFeatures = Array.isArray(starterFeaturesRaw) ? starterFeaturesRaw : [];
    const proFeatures = Array.isArray(proFeaturesRaw) ? proFeaturesRaw : [];
    const advancedFeatures = Array.isArray(advancedFeaturesRaw) ? advancedFeaturesRaw : [];
    return {
      starter: {
        name: t("pricing.tiers.starter.name", "\u57FA\u7840\u7248"),
        meta: t("pricing.tiers.starter.meta", "\u6CE8\u518C\u5373\u53EF\u4F7F\u7528"),
        price: t("pricing.tiers.starter.price", "\u514D\u8D39"),
        icon: LuShield,
        color: "#667eea",
        features: starterFeatures.map((text) => ({
          text,
          ok: true
        }))
      },
      pro: {
        name: t("pricing.tiers.pro.name", "\u4E13\u4E1A\u7248"),
        meta: t("pricing.tiers.pro.meta", `\u4F59\u989D\u8FBE\u5230 ${ADVANCED_FEATURE_MIN_BALANCE} \u79EF\u5206`),
        price: t("pricing.tiers.pro.price", `\u4F59\u989D\u6EE1 ${ADVANCED_FEATURE_MIN_BALANCE} \u79EF\u5206\u89E3\u9501`),
        icon: LuRocket,
        color: "#f5576c",
        features: proFeatures.map((text) => ({
          text,
          ok: true
        }))
      },
      advanced: {
        name: t("pricing.tiers.advanced.name", "\u9AD8\u9636\u7248"),
        meta: t("pricing.tiers.advanced.meta", `\u5355\u7B14\u5145\u503C \u2265 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} \u79EF\u5206`),
        price: t("pricing.tiers.advanced.price", `\u5145\u503C ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} \u79EF\u5206\u89E3\u9501`),
        icon: LuSparkles,
        color: "#14b8a6",
        features: advancedFeatures.map((text) => ({
          text,
          ok: true
        }))
      }
    };
  }, [t]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "rules", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rules__grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { tier: tiers.starter }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { tier: tiers.pro, isPro: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { tier: tiers.advanced })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rules__cta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "rules__cta-title", children: isLoggedIn ? t("pricing.cta.titleLoggedIn", "\u968F\u65F6\u5145\u503C\uFF0C\u968F\u65F6\u7528") : t("pricing.cta.titleLoggedOut", "\u5148\u8BD5\u8BD5\uFF0C\u518D\u51B3\u5B9A\u8981\u4E0D\u8981\u5145\u503C") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rules__plan-note", children: isLoggedIn ? t("pricing.cta.descLoggedIn", `\u5145\u503C\u79EF\u5206\u5373\u65F6\u5230\u8D26\u3002\u4F59\u989D\u8FBE\u5230 ${ADVANCED_FEATURE_MIN_BALANCE} \u89E3\u9501\u4E13\u4E1A\u7248\uFF0C\u5355\u7B14\u5145\u503C ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} \u89E3\u9501\u9AD8\u9636\u7248\u3002`) : t("pricing.cta.descLoggedOut", "\u6CE8\u518C\u540E\u5373\u53EF\u514D\u8D39\u4F53\u9A8C\uFF0C\u611F\u53D7\u591A\u6A21\u578B\u534F\u4F5C\u7684\u6548\u7387\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u5145\u503C\u3002") }),
      isLoggedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "rules__btn", onClick: () => navigate("/recharge"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuZap, { "aria-hidden": "true" }),
        t("pricing.cta.btnRecharge", "\u5145\u503C\u79EF\u5206")
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "rules__btn", onClick: () => navigate("/signup"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGift, { "aria-hidden": "true" }),
          t("pricing.cta.btnFreeStart", "\u514D\u8D39\u5F00\u59CB")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "rules__btn--secondary",
            onClick: () => navigate("/recharge"),
            children: t("pricing.cta.btnDirectRecharge", "\u76F4\u63A5\u5145\u503C")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "rules__cta-trust", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 14, "aria-hidden": "true" }),
        isLoggedIn ? t("pricing.cta.trustLoggedIn", "\u79EF\u5206\u4E0D\u8FC7\u671F\uFF0C\u7528\u591A\u5C11\u6263\u591A\u5C11\uFF0C\u968F\u65F6\u53EF\u9000") : t("pricing.cta.trustLoggedOut", "\u65E0\u9700\u4FE1\u7528\u5361\uFF0C\u6CE8\u518C\u5373\u53EF\u4F53\u9A8C\uFF0C\u65E0\u4EFB\u4F55\u8BA2\u9605\u7ED1\u5B9A")
      ] })
    ] })
  ] });
};
var VisionTag = ({ hasVision }) => {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: `vision-tag ${hasVision ? "vision-tag--yes" : "vision-tag--no"}`,
      children: hasVision ? t("pricing.visionYes", "\u652F\u6301") : t("pricing.visionNo", "\u4E0D\u652F\u6301")
    }
  );
};
var SortButton = ({ active, isAscending, onClick }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  "button",
  {
    type: "button",
    className: `sort-btn ${active ? "active" : ""}`,
    onClick,
    "aria-label": `\u6392\u5E8F${isAscending ? "\u5347\u5E8F" : "\u964D\u5E8F"}`,
    children: isAscending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowUp, { "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowDown, { "aria-hidden": "true" })
  }
);
var ModelComparison = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
  const [sortConfig, setSortConfig] = (0, import_react.useState)({ key: "price.output", direction: "ascending" });
  const formatPrice = (n) => {
    if (typeof n !== "number" || isNaN(n)) return t("pricing.unknown", "\u672A\u77E5");
    if (n === 0) return t("pricing.free", "\u514D\u8D39");
    const abs = Math.abs(n);
    const decimals = abs < 0.01 ? 4 : abs < 1 ? 3 : 2;
    const num = n.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
    return t("pricing.points", { num, defaultValue: `${num} \u79EF\u5206` });
  };
  const tableHeaders = (0, import_react.useMemo)(() => [
    { key: "displayName", label: t("pricing.tableHeader.name", "\u6A21\u578B\u540D\u79F0"), sortable: false },
    { key: "price.input", label: t("pricing.tableHeader.input", "\u8F93\u5165 / 1M \u79EF\u5206"), sortable: true },
    { key: "price.output", label: t("pricing.tableHeader.output", "\u8F93\u51FA / 1M \u79EF\u5206"), sortable: true },
    { key: "vision", label: t("pricing.tableHeader.vision", "\u89C6\u89C9\u8BC6\u522B"), sortable: false }
  ], [t]);
  const cleanModelDisplayName = (displayName, name, provider) => {
    let cleanName = displayName || name;
    const providersPattern = "openai|deepinfra|fireworks|mistral|z\\.ai|moonshot|moonshotai|minimax|google|deepseek|anthropic|qwen|openrouter|mimo|groq|together|baichuan|sensetime|tencent|aliyun|baidu|yi|meta|cohere";
    const suffixRegex = new RegExp(`\\s*\\([^)]*(?:${providersPattern})[^)]*\\)`, "gi");
    cleanName = cleanName.replace(suffixRegex, "");
    const prefixColonRegex = new RegExp(`^(?:[a-z0-9.\\s_-]*(?:${providersPattern})[a-z0-9.\\s_-]*):\\s*`, "gi");
    let hasRemovedColonPrefix = false;
    let prevName = "";
    while (cleanName !== prevName) {
      prevName = cleanName;
      const nextName = cleanName.replace(prefixColonRegex, "");
      if (nextName !== cleanName) {
        cleanName = nextName;
        hasRemovedColonPrefix = true;
      }
    }
    if (hasRemovedColonPrefix) {
      return cleanName.trim();
    }
    const isGenericOrTooShort = (remaining) => {
      const trimmed = remaining.trim();
      if (trimmed.length < 5) return true;
      const firstWord = trimmed.split(/[\s-_]/)[0].toLowerCase();
      if (/^[a-z]\d+/.test(firstWord)) return true;
      const genericModifiers = /^(?:large|medium|small|mini|coder|chat|lite|pro|flash|turbo|base|instruct|online|web|v\d+(\.\d+)*|r\d+)$/i;
      return genericModifiers.test(firstWord);
    };
    const uppercaseProvidersPattern = providersPattern.toUpperCase();
    const prefixSpaceRegex = new RegExp(`^(?:${uppercaseProvidersPattern})\\b\\s+`, "g");
    const tempName = cleanName.replace(prefixSpaceRegex, "");
    if (!isGenericOrTooShort(tempName)) {
      cleanName = tempName;
    }
    if (provider) {
      const providerClean = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
      const specificPrefixRegex = new RegExp(`^(?:${providerClean})\\b\\s+`, "gi");
      const tempNameProvider = cleanName.replace(specificPrefixRegex, "");
      if (!isGenericOrTooShort(tempNameProvider)) {
        cleanName = tempNameProvider;
      }
    }
    return cleanName.trim();
  };
  const normalizeModel = (model) => {
    const rawName = model.displayName || model.name;
    const cleanedName = cleanModelDisplayName(rawName, model.name, model.provider);
    return {
      ...model,
      displayName: cleanedName,
      price: model.price ?? model.pricing,
      hasVision: typeof model.hasVision === "boolean" ? model.hasVision : Boolean(model.supportVision)
    };
  };
  const allModels = (0, import_react.useMemo)(() => {
    const ALLOWED_PROVIDERS = [
      "openai",
      "google",
      "deepinfra",
      "openrouter",
      "fireworks",
      "nolo",
      "mistral"
    ];
    return ALL_MODELS.flatMap((model) => {
      if (!ALLOWED_PROVIDERS.includes(model.provider)) {
        return [];
      }
      if (shouldHideKimiAliasFromPricing(model.provider, model.name)) {
        return [];
      }
      return [normalizeModel(model)];
    });
  }, []);
  const sortedAndFilteredModels = (0, import_react.useMemo)(() => {
    let result = [...allModels];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) => m.displayName.toLowerCase().includes(term)
      );
    }
    const key = sortConfig.key;
    const direction = sortConfig.direction;
    if (key && direction) {
      const comparator = (a, b) => {
        if (key.startsWith("price.")) {
          const valA = getNestedValue(a, key) ?? Infinity;
          const valB = getNestedValue(b, key) ?? Infinity;
          return valA - valB;
        }
        return String(getNestedValue(a, key) ?? "").localeCompare(
          String(getNestedValue(b, key) ?? "")
        );
      };
      result.sort(
        (a, b) => direction === "ascending" ? comparator(a, b) : -comparator(a, b)
      );
    } else {
      result.sort((a, b) => {
        const outputDelta = (a.price?.output ?? Infinity) - (b.price?.output ?? Infinity);
        if (outputDelta !== 0) return outputDelta;
        return String(a.displayName || a.name).localeCompare(
          String(b.displayName || b.name)
        );
      });
    }
    return result;
  }, [allModels, searchTerm, sortConfig]);
  const handleSort = (key) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending";
    setSortConfig({ key, direction: newDirection });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "model-comparison", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "comparison-title", children: t("pricing.comparisonTitle", "\u6A21\u578B\u4EF7\u683C\u5BF9\u6BD4\uFF08\u6D88\u8017\u79EF\u5206\uFF09") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "model-search-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "text",
        className: "model-search-input",
        placeholder: t("pricing.searchPlaceholder", "\u6309\u6A21\u578B\u540D\u641C\u7D22..."),
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value)
      }
    ) }),
    sortedAndFilteredModels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "model-comparison__empty", children: t("pricing.noModelsFound", "\u672A\u627E\u5230\u5339\u914D\u7684\u6A21\u578B") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-view", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: tableHeaders.map(({ key, label, sortable }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TableCell,
          {
            element: { header: true, children: [] },
            path: [],
            isFirstRow: true,
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "header-cell", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
              sortable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                SortButton,
                {
                  active: sortConfig.key === key,
                  isAscending: sortConfig.direction === "ascending",
                  onClick: () => handleSort(key)
                }
              )
            ] })
          },
          key
        )) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: sortedAndFilteredModels.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TableCell,
            {
              element: { header: false, children: [] },
              attributes: { title: model.description },
              path: [],
              isFirstRow: false,
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "model-name", children: model.displayName || model.name })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TableCell,
            {
              element: { header: false, children: [] },
              path: [],
              isFirstRow: false,
              children: formatPrice(model.price?.input)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TableCell,
            {
              element: { header: false, children: [] },
              path: [],
              isFirstRow: false,
              children: formatPrice(model.price?.output)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TableCell,
            {
              element: { header: false, children: [] },
              path: [],
              isFirstRow: false,
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisionTag, { hasVision: !!model.hasVision })
            }
          )
        ] }, `${model.provider ?? ""}-${model.name}`)) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mobile-view", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "model-list", children: sortedAndFilteredModels.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "model-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "card-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "model-name", children: model.displayName || model.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisionTag, { hasVision: !!model.hasVision })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card-item-label", children: t("pricing.tableHeader.input", "\u8F93\u5165 / 1M \u79EF\u5206") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card-item-value", children: formatPrice(model.price?.input) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card-item-label", children: t("pricing.tableHeader.output", "\u8F93\u51FA / 1M \u79EF\u5206") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card-item-value", children: formatPrice(model.price?.output) })
          ] })
        ] })
      ] }, `${model.provider ?? ""}-${model.name}`)) }) })
    ] })
  ] });
};
var PricingFAQ = () => {
  const { t } = useTranslation();
  const faqs = (0, import_react.useMemo)(() => {
    const rawFaqs = t("pricing.faq", { returnObjects: true });
    if (Array.isArray(rawFaqs)) {
      return rawFaqs;
    }
    return [
      {
        q: "\u79EF\u5206\u662F\u4EC0\u4E48\uFF1F",
        a: "\u79EF\u5206\u662F Nolo \u7684\u901A\u7528\u7528\u91CF\u5355\u4F4D\u3002\u6BCF\u6B21\u8C03\u7528 AI \u6A21\u578B\u65F6\uFF0C\u7CFB\u7EDF\u6309\u5B9E\u9645\u6D88\u8017\u7684 token \u6570\u6263\u9664\u5BF9\u5E94\u79EF\u5206\u3002\u4E0D\u540C\u6A21\u578B\u6D88\u8017\u901F\u7387\u4E0D\u540C\u2014\u2014DeepSeek \u6781\u7701\uFF0CGPT-4o \u7A0D\u8D35\uFF0C\u4F60\u53EF\u4EE5\u6309\u9700\u5207\u6362\uFF0C\u81EA\u5DF1\u638C\u63A7\u82B1\u9500\u3002"
      },
      {
        q: "\u600E\u4E48\u5145\u503C\uFF1F\u591A\u5C11\u94B1\u4E00\u4E2A\u79EF\u5206\uFF1F",
        a: "\u5728\u300C\u5145\u503C\u300D\u9875\u9762\u9009\u62E9\u91D1\u989D\u5373\u53EF\uFF0C\u79EF\u5206\u5B9E\u65F6\u5230\u8D26\u3002\u79EF\u5206\u4E0D\u7ED1\u5B9A\u4EFB\u4F55\u5957\u9910\uFF0C\u5145\u591A\u5145\u5C11\u90FD\u884C\uFF0C\u5B9E\u9645\u5151\u6362\u6BD4\u4F8B\u4EE5\u5145\u503C\u9875\u663E\u793A\u4E3A\u51C6\u3002"
      },
      {
        q: "\u79EF\u5206\u4F1A\u8FC7\u671F\u5417\uFF1F",
        a: "\u4E0D\u4F1A\u3002\u5145\u503C\u7684\u79EF\u5206\u957F\u671F\u6709\u6548\uFF0C\u4E0D\u8BBE\u8FC7\u671F\u65F6\u95F4\u3002\u4F60\u53EF\u4EE5\u4ECA\u5929\u5145\u503C\uFF0C\u4E09\u4E2A\u6708\u540E\u518D\u7528\uFF0C\u4E0D\u4F1A\u6709\u4EFB\u4F55\u635F\u8017\u3002"
      },
      {
        q: "\u6BD4\u76F4\u63A5\u7528 ChatGPT \u8D35\u5417\uFF1F",
        a: "\u901A\u5E38\u66F4\u4FBF\u5B9C\u3002Nolo \u6309\u6A21\u578B\u5B9E\u9645 API \u6210\u672C\u900F\u660E\u8BA1\u8D39\uFF0C\u6CA1\u6709\u8BA2\u9605\u6EA2\u4EF7\u3002\u9009 DeepSeek / Mistral \u8FD9\u7C7B\u9AD8\u6027\u4EF7\u6BD4\u6A21\u578B\u65F6\uFF0C\u8D39\u7528\u4F1A\u6BD4 ChatGPT Plus \u8BA2\u9605\u4F4E\u5F88\u591A\uFF1B\u9700\u8981 GPT-4o / Claude \u65F6\u6210\u672C\u76F8\u8FD1\uFF0C\u4F46\u4F60\u53EA\u4E3A\u5B9E\u9645\u7528\u91CF\u4ED8\u8D39\uFF0C\u4E0D\u6D6A\u8D39\u3002"
      }
    ];
  }, [t]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "pricing-faq", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pricing-faq__head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pricing-faq__kicker", children: t("pricing.faqTitle", "\u5E38\u89C1\u95EE\u9898") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "pricing-faq__title", children: t("pricing.faqSubtitle", "\u6709\u7591\u95EE\uFF1F\u5148\u770B\u8FD9\u91CC") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pricing-faq__grid", children: faqs.map((faq) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pricing-faq__card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: faq.q }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: faq.a })
    ] }, faq.q)) })
  ] });
};
var PricingPage = () => {
  const { t } = useTranslation();
  const pageMeta = (0, import_react.useMemo)(() => buildStaticPageMeta(t, "pricing"), [t]);
  usePageMeta(pageMeta);
  const subtitleLines = (0, import_react.useMemo)(() => {
    const rawSubtitle = t(
      "pricing.subtitle",
      `\u79EF\u5206\u5C31\u662F\u4F60\u7684 AI \u7528\u91CF\u2014\u2014\u5145\u503C\u540E\u6309\u5B9E\u9645\u6D88\u8017\u6263\u9664\uFF0C\u6CA1\u7528\u5B8C\u6C38\u4E0D\u6E05\u96F6\u3002
\u4F59\u989D\u8FBE\u5230 ${ADVANCED_FEATURE_MIN_BALANCE} \u79EF\u5206\u81EA\u52A8\u89E3\u9501\u4E13\u4E1A\u7248\uFF0C\u968F\u65F6\u964D\u6863\uFF0C\u65E0\u4EFB\u4F55\u8BA2\u9605\u7ED1\u5B9A\u3002`
    );
    return rawSubtitle.split("\n");
  }, [t]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "pricing-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pricing-page__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "pricing-page__title", children: t("pricing.title", "\u7528\u591A\u5C11\uFF0C\u4ED8\u591A\u5C11") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pricing-page__subtitle", children: subtitleLines.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.default.Fragment, { children: [
        line,
        i < subtitleLines.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {})
      ] }, `${i}-${line}`)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageRules, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PricingFAQ, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelComparison, {})
  ] });
};
var Price_default = PricingPage;
export {
  Price_default as default
};
