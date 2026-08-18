import type { IconType } from "react-icons";
import {
  LuBot,
  LuCalendarClock,
  LuAudioLines,
  LuFile,
  LuFileText,
  LuFolderOpen,
  LuGrid2X2,
  LuImage,
  LuLayoutGrid,
  LuMessageSquare,
  LuVideo,
} from "react-icons/lu";

import type { ContentTab } from "app/utils/myContentItems";
import type { SidebarVisibleType } from "./sidebarVisibleTypes";

type SharedContentTypeId =
  | Extract<
      ContentTab,
      "all" | "app" | "agent" | "dialog" | "page" | "image" | "document" | "video" | "audio" | "table" | "file"
    >
  | "scheduled";

export interface ContentTypeMeta {
  id: SharedContentTypeId;
  icon: IconType;
  shortLabelKey: string;
  shortDefaultLabel: string;
  titleKey?: string;
  defaultTitle?: string;
  sidebarType?: SidebarVisibleType;
}

export const CONTENT_TYPE_META: Record<SharedContentTypeId, ContentTypeMeta> = {
  all: {
    id: "all",
    icon: LuFolderOpen,
    shortLabelKey: "all",
    shortDefaultLabel: "全部",
    titleKey: "homeTabs.myContent",
    defaultTitle: "我的内容",
  },
  app: {
    id: "app",
    icon: LuLayoutGrid,
    shortLabelKey: "apps",
    shortDefaultLabel: "应用",
    titleKey: "homeTabs.myApps",
    defaultTitle: "我的应用",
    sidebarType: "app",
  },
  agent: {
    id: "agent",
    icon: LuBot,
    shortLabelKey: "agents",
    shortDefaultLabel: "AI",
    titleKey: "homeTabs.myAgents",
    defaultTitle: "我的 AI",
    sidebarType: "agent",
  },
  dialog: {
    id: "dialog",
    icon: LuMessageSquare,
    shortLabelKey: "dialogs",
    shortDefaultLabel: "对话",
    titleKey: "homeTabs.myDialogs",
    defaultTitle: "我的对话",
    sidebarType: "dialog",
  },
  page: {
    id: "page",
    icon: LuFileText,
    shortLabelKey: "pages",
    shortDefaultLabel: "文档",
    titleKey: "homeTabs.myDocs",
    defaultTitle: "我的文档",
    sidebarType: "page",
  },
  image: {
    id: "image",
    icon: LuImage,
    shortLabelKey: "images",
    shortDefaultLabel: "图片",
    titleKey: "homeTabs.myImages",
    defaultTitle: "我的图片",
    sidebarType: "image",
  },
  document: {
    id: "document",
    icon: LuFileText,
    shortLabelKey: "documentAttachments",
    shortDefaultLabel: "文档附件",
    titleKey: "homeTabs.myDocumentAttachments",
    defaultTitle: "我的文档附件",
    sidebarType: "document",
  },
  video: {
    id: "video",
    icon: LuVideo,
    shortLabelKey: "videos",
    shortDefaultLabel: "视频",
    titleKey: "homeTabs.myVideos",
    defaultTitle: "我的视频",
    sidebarType: "video",
  },
  audio: {
    id: "audio",
    icon: LuAudioLines,
    shortLabelKey: "audios",
    shortDefaultLabel: "音频",
    titleKey: "homeTabs.myAudios",
    defaultTitle: "我的音频",
    sidebarType: "audio",
  },
  table: {
    id: "table",
    icon: LuGrid2X2,
    shortLabelKey: "tables",
    shortDefaultLabel: "表格",
    titleKey: "homeTabs.myTables",
    defaultTitle: "我的表格",
    sidebarType: "table",
  },
  file: {
    id: "file",
    icon: LuFile,
    shortLabelKey: "files",
    shortDefaultLabel: "其他附件",
    titleKey: "homeTabs.myFiles",
    defaultTitle: "我的其他附件",
    sidebarType: "file",
  },
  scheduled: {
    id: "scheduled",
    icon: LuCalendarClock,
    shortLabelKey: "scheduled",
    shortDefaultLabel: "定时",
    sidebarType: "scheduled",
  },
};

export const MY_CONTENT_TYPE_META = [
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
  CONTENT_TYPE_META.file,
] as const;

export const CHAT_SIDEBAR_TYPE_META = [
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
  CONTENT_TYPE_META.scheduled,
] as const;
