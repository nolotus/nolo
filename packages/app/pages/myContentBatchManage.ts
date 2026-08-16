import type { TFunction } from "i18next";
import type { ContentTab } from "app/utils/myContentItems";

export const MY_CONTENT_BATCH_TABS: ContentTab[] = [
  "dialog",
  "table",
  "page",
  "image",
  "document",
  "video",
  "audio",
  "file",
  "attachment",
];

export const getMyContentBatchItemNoun = (
  activeTab: ContentTab,
  t: TFunction
): string => {
  if (activeTab === "table") {
    return t("homeTabs.myTablesBatchNoun", "表格");
  }
  if (activeTab === "page") {
    return t("homeTabs.myDocsBatchNoun", "文档");
  }
  if (activeTab === "image") {
    return t("homeTabs.myImagesBatchNoun", "图片");
  }
  if (activeTab === "document") {
    return t("homeTabs.myDocumentsBatchNoun", "文档附件");
  }
  if (activeTab === "video") {
    return t("homeTabs.myVideosBatchNoun", "视频");
  }
  if (activeTab === "audio") {
    return t("homeTabs.myAudiosBatchNoun", "音频");
  }
  if (activeTab === "file") {
    return t("homeTabs.myFilesBatchNoun", "文件");
  }
  if (activeTab === "attachment") {
    return t("homeTabs.myAttachmentsBatchNoun", "附件");
  }
  return t("homeTabs.myDialogsBatchNoun", "对话");
};

export type MyContentBatchDeleteCopy = {
  title: string;
  message: string;
  confirmText: string;
};

export const getMyContentBatchDeleteCopy = (
  activeTab: ContentTab,
  count: number,
  t: TFunction
): MyContentBatchDeleteCopy => {
  const noun = getMyContentBatchItemNoun(activeTab, t);
  if (activeTab === "dialog") {
    return {
      title: t("myContentBatch.deleteTitle", "确认删除"),
      message: t(
        "confirm_delete_selected_dialogs",
        `确定要删除选中的 ${count} 个对话吗？相关消息与附件将一并移除。`,
        { count }
      ),
      confirmText: t("myContentBatch.deleteConfirm", "删除"),
    };
  }
  return {
    title: t("myContentBatch.deleteTitle", "确认删除"),
    message: t(
      `confirm_delete_selected_${activeTab}s`,
      `确定要删除选中的 ${count} 个${noun}吗？删除后可在回收站恢复（如已启用）。`,
      { count, noun }
    ),
    confirmText: t("myContentBatch.deleteConfirm", "删除"),
  };
};

export const shouldIncludeAttachmentsOnBatchDelete = (
  activeTab: ContentTab
): boolean => activeTab === "dialog";