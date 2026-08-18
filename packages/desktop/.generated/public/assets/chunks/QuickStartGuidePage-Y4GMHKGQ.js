import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/QuickStartGuidePage.tsx
var import_react = __toESM(require_react());

// packages/app/guide/quickStartGuide.ts
var buildQuickStartGuideContent = (t) => ({
  title: t("quickStartGuide.title", "Quick Start Guide"),
  description: t(
    "quickStartGuide.description",
    "Use these three checks to get oriented quickly when you open nolo."
  ),
  sections: [
    {
      title: t("quickStartGuide.setupTitle", "1. Confirm your current environment"),
      items: [
        t(
          "quickStartGuide.setupItem1",
          "The login target is always the current server and language shown on the auth screen."
        ),
        t(
          "quickStartGuide.setupItem2",
          "If an account was created on another server or locale, switch first before signing in."
        ),
        t(
          "quickStartGuide.setupItem3",
          "For RN smoke checks, verify the environment before testing content fetches or chat writes."
        )
      ]
    },
    {
      title: t("quickStartGuide.shortcutsTitle", "2. Start from the three fastest entry points"),
      items: [
        t(
          "quickStartGuide.shortcutsItem1",
          "Quick Note captures an idea immediately and saves it as a page."
        ),
        t(
          "quickStartGuide.shortcutsItem2",
          "New Chat creates a fresh dialog with the default assistant."
        ),
        t(
          "quickStartGuide.shortcutsItem3",
          "Create AI is the fastest way to customize a dedicated assistant."
        )
      ]
    },
    {
      title: t("quickStartGuide.nextStepsTitle", "3. When something looks off"),
      items: [
        t(
          "quickStartGuide.nextStepsItem1",
          "If login fails, re-check that the server and locale match the original registration."
        ),
        t(
          "quickStartGuide.nextStepsItem2",
          "If recent content looks stale, give sync a moment and then reopen the target page."
        ),
        t(
          "quickStartGuide.nextStepsItem3",
          "Use Feedback to report missing data or confusing behavior directly from the home screen."
        )
      ]
    }
  ]
});

// packages/app/pages/QuickStartGuidePage.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var QuickStartGuidePage = () => {
  const { t, i18n } = useTranslation();
  const guide = (0, import_react.useMemo)(
    () => buildQuickStartGuideContent((key, fallback) => {
      const value = t(key);
      return typeof value === "string" && value.trim() && value !== key ? value : fallback;
    }),
    [i18n.language, t]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "QuickStartGuidePage", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "QuickStartGuidePage__hero", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "QuickStartGuidePage__eyebrow", children: t("homeActions.guideTitle", "User Guide") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "QuickStartGuidePage__title", children: guide.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "QuickStartGuidePage__description", children: guide.description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "QuickStartGuidePage__sections", children: guide.sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "QuickStartGuidePage__section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "QuickStartGuidePage__sectionTitle", children: section.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "QuickStartGuidePage__list", children: section.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: "QuickStartGuidePage__listItem", children: item }, item)) })
    ] }, section.title)) })
  ] });
};
var QuickStartGuidePage_default = QuickStartGuidePage;
export {
  QuickStartGuidePage_default as default
};
