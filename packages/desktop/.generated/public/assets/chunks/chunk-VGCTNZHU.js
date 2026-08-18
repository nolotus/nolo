import {
  LuAudioLines,
  LuBot,
  LuCalendarClock,
  LuFile,
  LuFileText,
  LuFolderOpen,
  LuGrid2X2,
  LuImage,
  LuLayoutGrid,
  LuMessageSquare,
  LuVideo
} from "/public/assets/chunks/chunk-GQPLRP65.js";

// packages/create/space/contentTypeMeta.ts
var CONTENT_TYPE_META = {
  all: {
    id: "all",
    icon: LuFolderOpen,
    shortLabelKey: "all",
    shortDefaultLabel: "\u5168\u90E8",
    titleKey: "homeTabs.myContent",
    defaultTitle: "\u6211\u7684\u5185\u5BB9"
  },
  app: {
    id: "app",
    icon: LuLayoutGrid,
    shortLabelKey: "apps",
    shortDefaultLabel: "\u5E94\u7528",
    titleKey: "homeTabs.myApps",
    defaultTitle: "\u6211\u7684\u5E94\u7528",
    sidebarType: "app"
  },
  agent: {
    id: "agent",
    icon: LuBot,
    shortLabelKey: "agents",
    shortDefaultLabel: "AI",
    titleKey: "homeTabs.myAgents",
    defaultTitle: "\u6211\u7684 AI",
    sidebarType: "agent"
  },
  dialog: {
    id: "dialog",
    icon: LuMessageSquare,
    shortLabelKey: "dialogs",
    shortDefaultLabel: "\u5BF9\u8BDD",
    titleKey: "homeTabs.myDialogs",
    defaultTitle: "\u6211\u7684\u5BF9\u8BDD",
    sidebarType: "dialog"
  },
  page: {
    id: "page",
    icon: LuFileText,
    shortLabelKey: "pages",
    shortDefaultLabel: "\u6587\u6863",
    titleKey: "homeTabs.myDocs",
    defaultTitle: "\u6211\u7684\u6587\u6863",
    sidebarType: "page"
  },
  image: {
    id: "image",
    icon: LuImage,
    shortLabelKey: "images",
    shortDefaultLabel: "\u56FE\u7247",
    titleKey: "homeTabs.myImages",
    defaultTitle: "\u6211\u7684\u56FE\u7247",
    sidebarType: "image"
  },
  document: {
    id: "document",
    icon: LuFileText,
    shortLabelKey: "documentAttachments",
    shortDefaultLabel: "\u6587\u6863\u9644\u4EF6",
    titleKey: "homeTabs.myDocumentAttachments",
    defaultTitle: "\u6211\u7684\u6587\u6863\u9644\u4EF6",
    sidebarType: "document"
  },
  video: {
    id: "video",
    icon: LuVideo,
    shortLabelKey: "videos",
    shortDefaultLabel: "\u89C6\u9891",
    titleKey: "homeTabs.myVideos",
    defaultTitle: "\u6211\u7684\u89C6\u9891",
    sidebarType: "video"
  },
  audio: {
    id: "audio",
    icon: LuAudioLines,
    shortLabelKey: "audios",
    shortDefaultLabel: "\u97F3\u9891",
    titleKey: "homeTabs.myAudios",
    defaultTitle: "\u6211\u7684\u97F3\u9891",
    sidebarType: "audio"
  },
  table: {
    id: "table",
    icon: LuGrid2X2,
    shortLabelKey: "tables",
    shortDefaultLabel: "\u8868\u683C",
    titleKey: "homeTabs.myTables",
    defaultTitle: "\u6211\u7684\u8868\u683C",
    sidebarType: "table"
  },
  file: {
    id: "file",
    icon: LuFile,
    shortLabelKey: "files",
    shortDefaultLabel: "\u5176\u4ED6\u9644\u4EF6",
    titleKey: "homeTabs.myFiles",
    defaultTitle: "\u6211\u7684\u5176\u4ED6\u9644\u4EF6",
    sidebarType: "file"
  },
  scheduled: {
    id: "scheduled",
    icon: LuCalendarClock,
    shortLabelKey: "scheduled",
    shortDefaultLabel: "\u5B9A\u65F6",
    sidebarType: "scheduled"
  }
};
var MY_CONTENT_TYPE_META = [
  CONTENT_TYPE_META.all,
  CONTENT_TYPE_META.agent,
  CONTENT_TYPE_META.dialog,
  CONTENT_TYPE_META.app,
  CONTENT_TYPE_META.page,
  CONTENT_TYPE_META.image,
  CONTENT_TYPE_META.document,
  CONTENT_TYPE_META.video,
  CONTENT_TYPE_META.audio,
  CONTENT_TYPE_META.table,
  CONTENT_TYPE_META.file
];
var CHAT_SIDEBAR_TYPE_META = [
  CONTENT_TYPE_META.dialog,
  CONTENT_TYPE_META.page,
  CONTENT_TYPE_META.image,
  CONTENT_TYPE_META.document,
  CONTENT_TYPE_META.video,
  CONTENT_TYPE_META.audio,
  CONTENT_TYPE_META.file,
  CONTENT_TYPE_META.table,
  CONTENT_TYPE_META.app,
  CONTENT_TYPE_META.agent,
  CONTENT_TYPE_META.scheduled
];

export {
  CONTENT_TYPE_META,
  MY_CONTENT_TYPE_META,
  CHAT_SIDEBAR_TYPE_META
};
