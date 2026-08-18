import {
  CONTENT_TYPE_META,
  MY_CONTENT_TYPE_META
} from "/public/assets/chunks/chunk-VGCTNZHU.js";
import {
  LuFile,
  LuStar
} from "/public/assets/chunks/chunk-GQPLRP65.js";

// packages/app/constants/mySections.tsx
var MY_CONTENT_FILTERS = MY_CONTENT_TYPE_META.map((meta) => ({
  id: meta.id,
  titleKey: meta.titleKey,
  defaultTitle: meta.defaultTitle,
  shortLabelKey: meta.shortLabelKey,
  shortDefaultLabel: meta.shortDefaultLabel,
  icon: meta.icon
}));
var MY_ROUTE_SECTIONS = [
  {
    id: "all",
    tab: "all",
    path: "/content",
    titleKey: CONTENT_TYPE_META.all.titleKey,
    defaultTitle: CONTENT_TYPE_META.all.defaultTitle,
    subtitleKey: "homeTabs.myContentPageSubtitle",
    defaultSubtitle: "\u8DE8 space \u67E5\u770B\u6700\u8FD1\u66F4\u65B0\u7684\u6587\u6863\u3001\u8868\u683C\u3001\u5E94\u7528\u3001\u56FE\u7247\u3001\u9644\u4EF6\u3001AI \u4E0E\u5BF9\u8BDD\u3002",
    icon: CONTENT_TYPE_META.all.icon,
    kind: "content"
  },
  {
    id: "dialog",
    tab: "dialog",
    path: "/dialogs",
    titleKey: CONTENT_TYPE_META.dialog.titleKey,
    defaultTitle: CONTENT_TYPE_META.dialog.defaultTitle,
    subtitleKey: "homeTabs.myDialogsPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u6700\u8FD1\u66F4\u65B0\u6216\u53C2\u4E0E\u7684\u5BF9\u8BDD\u3002",
    icon: CONTENT_TYPE_META.dialog.icon,
    kind: "content"
  },
  {
    id: "page",
    tab: "page",
    path: "/docs",
    titleKey: CONTENT_TYPE_META.page.titleKey,
    defaultTitle: CONTENT_TYPE_META.page.defaultTitle,
    subtitleKey: "homeTabs.myDocsPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u7684\u6587\u6863\u3001\u7B14\u8BB0\u4E0E\u77E5\u8BC6\u8349\u7A3F\u3002",
    icon: CONTENT_TYPE_META.page.icon,
    kind: "content"
  },
  {
    id: "table",
    tab: "table",
    path: "/tables",
    titleKey: CONTENT_TYPE_META.table.titleKey,
    defaultTitle: CONTENT_TYPE_META.table.defaultTitle,
    subtitleKey: "homeTabs.myTablesPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u7684\u8868\u683C\u4E0E\u7ED3\u6784\u5316\u6570\u636E\u3002",
    icon: CONTENT_TYPE_META.table.icon,
    kind: "content"
  },
  {
    id: "image",
    tab: "image",
    path: "/images",
    titleKey: CONTENT_TYPE_META.image.titleKey,
    defaultTitle: CONTENT_TYPE_META.image.defaultTitle,
    subtitleKey: "homeTabs.myImagesPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u751F\u6210\u3001\u4E0A\u4F20\u6216\u4FDD\u5B58\u7684\u56FE\u7247\u3002",
    icon: CONTENT_TYPE_META.image.icon,
    kind: "content"
  },
  {
    id: "document",
    tab: "document",
    path: "/attachments/documents",
    titleKey: CONTENT_TYPE_META.document.titleKey,
    defaultTitle: CONTENT_TYPE_META.document.defaultTitle,
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u4E0A\u4F20\u3001\u4FDD\u5B58\u6216\u5F15\u7528\u7684\u6587\u6863\u9644\u4EF6\u3002",
    icon: CONTENT_TYPE_META.document.icon,
    kind: "content"
  },
  {
    id: "video",
    tab: "video",
    path: "/videos",
    titleKey: CONTENT_TYPE_META.video.titleKey,
    defaultTitle: CONTENT_TYPE_META.video.defaultTitle,
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u4E0A\u4F20\u3001\u4FDD\u5B58\u6216\u751F\u6210\u7684\u89C6\u9891\u3002",
    icon: CONTENT_TYPE_META.video.icon,
    kind: "content"
  },
  {
    id: "audio",
    tab: "audio",
    path: "/audios",
    titleKey: CONTENT_TYPE_META.audio.titleKey,
    defaultTitle: CONTENT_TYPE_META.audio.defaultTitle,
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u4E0A\u4F20\u3001\u4FDD\u5B58\u6216\u751F\u6210\u7684\u97F3\u9891\u3002",
    icon: CONTENT_TYPE_META.audio.icon,
    kind: "content"
  },
  {
    id: "attachment",
    tab: "attachment",
    path: "/attachments",
    titleKey: "homeTabs.myAttachments",
    defaultTitle: "\u6211\u7684\u9644\u4EF6",
    subtitleKey: "homeTabs.myAttachmentsPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u4E0A\u4F20\u548C\u4FDD\u5B58\u7684\u5168\u90E8\u9644\u4EF6\u3002",
    icon: LuFile,
    kind: "content"
  },
  {
    id: "file",
    tab: "file",
    path: "/files",
    titleKey: CONTENT_TYPE_META.file.titleKey,
    defaultTitle: CONTENT_TYPE_META.file.defaultTitle,
    subtitleKey: "homeTabs.myFilesPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u4E0A\u4F20\u548C\u4FDD\u5B58\u7684\u9644\u4EF6\u3002",
    icon: LuFile,
    kind: "content"
  },
  {
    id: "agent",
    tab: "agent",
    path: "/agents",
    titleKey: CONTENT_TYPE_META.agent.titleKey,
    defaultTitle: CONTENT_TYPE_META.agent.defaultTitle,
    subtitleKey: "homeTabs.myAgentsPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u521B\u5EFA\u3001\u914D\u7F6E\u548C\u5E38\u7528\u7684 AI\u3002",
    icon: CONTENT_TYPE_META.agent.icon,
    kind: "content"
  },
  {
    id: "apps",
    tab: "app",
    path: "/apps",
    titleKey: CONTENT_TYPE_META.app.titleKey,
    defaultTitle: CONTENT_TYPE_META.app.defaultTitle,
    subtitleKey: "homeTabs.myAppsPageSubtitle",
    defaultSubtitle: "\u96C6\u4E2D\u67E5\u770B\u4F60\u6784\u5EFA\u548C\u53D1\u5E03\u7684\u5E94\u7528\u3002",
    icon: CONTENT_TYPE_META.app.icon,
    kind: "content"
  },
  {
    id: "favorites",
    path: "/favorites",
    titleKey: "homeTabs.myFavorites",
    defaultTitle: "\u6211\u7684\u6536\u85CF",
    icon: LuStar,
    kind: "favorites"
  }
];
var PRIMARY_CONTENT_TAB_IDS = /* @__PURE__ */ new Set([
  "all",
  "app",
  "agent",
  "dialog",
  "page",
  "table"
]);
var ATTACHMENT_SUB_TAB_IDS = /* @__PURE__ */ new Set([
  "image",
  "document",
  "video",
  "audio",
  "file"
]);
var PRIMARY_CONTENT_FILTERS = MY_CONTENT_FILTERS.filter(
  (f) => PRIMARY_CONTENT_TAB_IDS.has(f.id)
);
var ATTACHMENT_SUB_FILTERS = MY_CONTENT_FILTERS.filter(
  (f) => ATTACHMENT_SUB_TAB_IDS.has(f.id)
);
var MY_CONTENT_ROUTE_SECTIONS = MY_ROUTE_SECTIONS.filter(
  (section) => section.kind === "content"
);
function getMyRouteSection(id) {
  return MY_ROUTE_SECTIONS.find((section) => section.id === id) ?? MY_ROUTE_SECTIONS[0];
}
function getMyRoutePathForTab(tab) {
  return MY_CONTENT_ROUTE_SECTIONS.find((section) => section.tab === tab)?.path ?? "/content";
}

export {
  MY_CONTENT_FILTERS,
  MY_ROUTE_SECTIONS,
  ATTACHMENT_SUB_TAB_IDS,
  PRIMARY_CONTENT_FILTERS,
  ATTACHMENT_SUB_FILTERS,
  getMyRouteSection,
  getMyRoutePathForTab
};
