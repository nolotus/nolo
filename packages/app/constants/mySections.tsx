import type { IconType } from "react-icons";
import {
  LuFile,
  LuStar,
} from "react-icons/lu";

import type { ContentTab } from "app/utils/myContentItems";
import {
  CONTENT_TYPE_META,
  MY_CONTENT_TYPE_META,
} from "create/space/contentTypeMeta";

export type MyRouteSectionId =
  | "all"
  | "dialog"
  | "page"
  | "table"
  | "image"
  | "document"
  | "video"
  | "audio"
  | "file"
  | "attachment"
  | "agent"
  | "apps"
  | "favorites";

export interface MySectionDefinition {
  id: MyRouteSectionId;
  tab?: ContentTab;
  path: string;
  titleKey: string;
  defaultTitle: string;
  subtitleKey?: string;
  defaultSubtitle?: string;
  icon: IconType;
  kind: "content" | "favorites";
}

export const MY_CONTENT_FILTERS: Array<{
  id: ContentTab;
  titleKey: string;
  defaultTitle: string;
  shortLabelKey: string;
  shortDefaultLabel: string;
  icon: IconType;
}> = MY_CONTENT_TYPE_META.map((meta) => ({
  id: meta.id as ContentTab,
  titleKey: meta.titleKey!,
  defaultTitle: meta.defaultTitle!,
  shortLabelKey: meta.shortLabelKey,
  shortDefaultLabel: meta.shortDefaultLabel,
  icon: meta.icon,
}));

export const MY_ROUTE_SECTIONS: MySectionDefinition[] = [
  {
    id: "all",
    tab: "all",
    path: "/content",
    titleKey: CONTENT_TYPE_META.all.titleKey!,
    defaultTitle: CONTENT_TYPE_META.all.defaultTitle!,
    subtitleKey: "homeTabs.myContentPageSubtitle",
    defaultSubtitle: "跨 space 查看最近更新的文档、表格、应用、图片、附件、AI 与对话。",
    icon: CONTENT_TYPE_META.all.icon,
    kind: "content",
  },
  {
    id: "dialog",
    tab: "dialog",
    path: "/dialogs",
    titleKey: CONTENT_TYPE_META.dialog.titleKey!,
    defaultTitle: CONTENT_TYPE_META.dialog.defaultTitle!,
    subtitleKey: "homeTabs.myDialogsPageSubtitle",
    defaultSubtitle: "集中查看你最近更新或参与的对话。",
    icon: CONTENT_TYPE_META.dialog.icon,
    kind: "content",
  },
  {
    id: "page",
    tab: "page",
    path: "/docs",
    titleKey: CONTENT_TYPE_META.page.titleKey!,
    defaultTitle: CONTENT_TYPE_META.page.defaultTitle!,
    subtitleKey: "homeTabs.myDocsPageSubtitle",
    defaultSubtitle: "集中查看你的文档、笔记与知识草稿。",
    icon: CONTENT_TYPE_META.page.icon,
    kind: "content",
  },
  {
    id: "table",
    tab: "table",
    path: "/tables",
    titleKey: CONTENT_TYPE_META.table.titleKey!,
    defaultTitle: CONTENT_TYPE_META.table.defaultTitle!,
    subtitleKey: "homeTabs.myTablesPageSubtitle",
    defaultSubtitle: "集中查看你的表格与结构化数据。",
    icon: CONTENT_TYPE_META.table.icon,
    kind: "content",
  },
  {
    id: "image",
    tab: "image",
    path: "/images",
    titleKey: CONTENT_TYPE_META.image.titleKey!,
    defaultTitle: CONTENT_TYPE_META.image.defaultTitle!,
    subtitleKey: "homeTabs.myImagesPageSubtitle",
    defaultSubtitle: "集中查看你生成、上传或保存的图片。",
    icon: CONTENT_TYPE_META.image.icon,
    kind: "content",
  },
  {
    id: "document",
    tab: "document",
    path: "/attachments/documents",
    titleKey: CONTENT_TYPE_META.document.titleKey!,
    defaultTitle: CONTENT_TYPE_META.document.defaultTitle!,
    defaultSubtitle: "集中查看你上传、保存或引用的文档附件。",
    icon: CONTENT_TYPE_META.document.icon,
    kind: "content",
  },
  {
    id: "video",
    tab: "video",
    path: "/videos",
    titleKey: CONTENT_TYPE_META.video.titleKey!,
    defaultTitle: CONTENT_TYPE_META.video.defaultTitle!,
    defaultSubtitle: "集中查看你上传、保存或生成的视频。",
    icon: CONTENT_TYPE_META.video.icon,
    kind: "content",
  },
  {
    id: "audio",
    tab: "audio",
    path: "/audios",
    titleKey: CONTENT_TYPE_META.audio.titleKey!,
    defaultTitle: CONTENT_TYPE_META.audio.defaultTitle!,
    defaultSubtitle: "集中查看你上传、保存或生成的音频。",
    icon: CONTENT_TYPE_META.audio.icon,
    kind: "content",
  },
  {
    id: "attachment",
    tab: "attachment",
    path: "/attachments",
    titleKey: "homeTabs.myAttachments",
    defaultTitle: "我的附件",
    subtitleKey: "homeTabs.myAttachmentsPageSubtitle",
    defaultSubtitle: "集中查看你上传和保存的全部附件。",
    icon: LuFile,
    kind: "content",
  },
  {
    id: "file",
    tab: "file",
    path: "/files",
    titleKey: CONTENT_TYPE_META.file.titleKey!,
    defaultTitle: CONTENT_TYPE_META.file.defaultTitle!,
    subtitleKey: "homeTabs.myFilesPageSubtitle",
    defaultSubtitle: "集中查看你上传和保存的附件。",
    icon: LuFile,
    kind: "content",
  },
  {
    id: "agent",
    tab: "agent",
    path: "/agents",
    titleKey: CONTENT_TYPE_META.agent.titleKey!,
    defaultTitle: CONTENT_TYPE_META.agent.defaultTitle!,
    subtitleKey: "homeTabs.myAgentsPageSubtitle",
    defaultSubtitle: "集中查看你创建、配置和常用的 AI。",
    icon: CONTENT_TYPE_META.agent.icon,
    kind: "content",
  },
  {
    id: "apps",
    tab: "app",
    path: "/apps",
    titleKey: CONTENT_TYPE_META.app.titleKey!,
    defaultTitle: CONTENT_TYPE_META.app.defaultTitle!,
    subtitleKey: "homeTabs.myAppsPageSubtitle",
    defaultSubtitle: "集中查看你构建和发布的应用。",
    icon: CONTENT_TYPE_META.app.icon,
    kind: "content",
  },
  {
    id: "favorites",
    path: "/favorites",
    titleKey: "homeTabs.myFavorites",
    defaultTitle: "我的收藏",
    icon: LuStar,
    kind: "favorites",
  },
];

/** Primary tabs — always visible in the first row. */
export const PRIMARY_CONTENT_TAB_IDS: ReadonlySet<ContentTab> = new Set([
  "all", "app", "agent", "dialog", "page", "table",
]);

/** Attachment sub-tabs — shown in a collapsible second row. */
export const ATTACHMENT_SUB_TAB_IDS: ReadonlySet<ContentTab> = new Set([
  "image", "document", "video", "audio", "file",
]);

export const PRIMARY_CONTENT_FILTERS = MY_CONTENT_FILTERS.filter(
  (f) => PRIMARY_CONTENT_TAB_IDS.has(f.id),
);

export const ATTACHMENT_SUB_FILTERS = MY_CONTENT_FILTERS.filter(
  (f) => ATTACHMENT_SUB_TAB_IDS.has(f.id),
);

export const MY_CONTENT_ROUTE_SECTIONS = MY_ROUTE_SECTIONS.filter(
  (section) => section.kind === "content"
);

export function getMyRouteSection(id: MyRouteSectionId): MySectionDefinition {
  return MY_ROUTE_SECTIONS.find((section) => section.id === id) ?? MY_ROUTE_SECTIONS[0]!;
}

export function getMyRoutePathForTab(tab: ContentTab): string {
  return (
    MY_CONTENT_ROUTE_SECTIONS.find((section) => section.tab === tab)?.path ??
    "/content"
  );
}
