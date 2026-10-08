import { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { nanoid } from "nanoid";
import { useUserId } from "identity";
import type { AppDispatch } from "app/store";
import {
  addPendingFile,
  restoreMediaJobPendingFiles,
  setMediaJobRuntimeActor,
} from "../dialog/dialogSlice";
import { upload } from "database/dbSlice";
import { withMapItemProcessing } from "app/utils/asyncMapStatus";
import { isMediaFileWithinLimit, splitFiles } from "app/utils/fileUtils";
import { createMediaJob } from "./mediaJobs";
import { toErrorMessage } from "core/errorMessage";
import {
  GLOBAL_DIALOG_RUNTIME_KEY,
  type PendingFile,
} from "../dialog/dialogSlice";
import type * as FileProcessorModule from "./fileProcessor";

let fileProcessorModulePromise: Promise<typeof FileProcessorModule> | null =
  null;

const getProcessDocumentFile = async () => {
  if (!fileProcessorModulePromise) {
    fileProcessorModulePromise = import("./fileProcessor");
  }
  const { processDocumentFile } = await fileProcessorModulePromise;
  return processDocumentFile;
};

type FileStatus = {
  processing: boolean;
  error?: string;
};

interface UseMessageInputFilesOptions {
  dispatch: AppDispatch;
  t: TFunction<"chat", undefined>;
  ocrModel?: string | null;
  currentServer?: string;
  token?: string | null;
  currentDialogKey?: string | null;
  pendingFiles?: PendingFile[];
}

export const useMessageInputFiles = (
  processImages: (files: File[]) => void,
  options: UseMessageInputFilesOptions,
) => {
  const {
    dispatch,
    t,
    ocrModel,
    currentServer,
    token,
    currentDialogKey,
    pendingFiles = [],
  } = options;

  const currentUserId = useUserId();

  const [fileStatus, setFileStatus] = useState<Map<string, FileStatus>>(
    () => new Map(),
  );

  // 刷新 / 重新进入对话（含无 dialogKey 的 quick chat）后，把 localStorage 里
  // 的媒体任务卡片引用恢复到 pendingFiles。放在这个共享 hook 里而不是某个
  // 具体 composer：quick chat（QuickChatRuntime）与对话页
  // （MessageInputCore）都走这里，两条装配路径都覆盖。
  // bucket 推导必须与写入侧严格同源——都是
  // `currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY`，不依赖
  // activeDialogKey 的隐式回退（首页/快速聊天时它可能是别的对话键）。
  // 幂等：store 里已有同 id 条目的会被 addPendingFile 去重。
  useEffect(() => {
    // 先按当前登录账号固定 actor 分桶（账号切换可丢弃内存中旧账号媒体引用），
    // 再据此恢复媒体任务卡片引用。
    setMediaJobRuntimeActor(currentUserId ?? null);
    restoreMediaJobPendingFiles(currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY);
  }, [currentDialogKey, currentUserId]);

  const clearFileStatus = useCallback(() => {
    setFileStatus(new Map());
  }, []);

  const processDocs = useCallback(
    async (docs: File[]) => {
      if (!docs.length) return;

      const processDocumentFile = await getProcessDocumentFile();
      const effectiveDialogKey = currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY;

      await Promise.all(
        docs.map(async (file) => {
          const fileId = nanoid();

          await withMapItemProcessing<string, FileStatus>(
            fileId,
            setFileStatus,
            async () => {
              try {
                await processDocumentFile({
                  file,
                  fileId,
                  dispatch,
                  t,
                  ocrModel: ocrModel ?? undefined,
                  ocrRequest: {
                    serverOrigin: currentServer,
                    accessToken: token ?? undefined,
                    dialogId: currentDialogKey ?? undefined,
                  },
                  dialogKey: effectiveDialogKey,
                });
              } catch (e: unknown) {
                const message = toErrorMessage(e);
                setFileStatus((prev) => {
                  const next = new Map(prev);
                  const prevStatus =
                    next.get(fileId) || ({ processing: false } as FileStatus);
                  next.set(fileId, { ...prevStatus, error: message });
                  return next;
                });
              }
            },
          );
        }),
      );
    },
    [currentDialogKey, currentServer, dispatch, ocrModel, t, token],
  );

  const processFiles = useCallback(
    async (input: FileList | File[] | null) => {
      if (!input) return;

      const filesArray = Array.isArray(input) ? input : Array.from(input);
      if (!filesArray.length) return;

      const [images, media, docs] = splitFiles(filesArray);

      if (images.length) {
        processImages(images);
      }

      const effectiveDialogKey = currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY;
      const transcriptText =
        document.querySelector<HTMLTextAreaElement>("textarea")?.value ?? "";
      const sourceLang = /俄语|俄文|russian/i.test(transcriptText)
        ? "ru"
        : undefined;
      const targetLang = /中文|翻译成中文|chinese/i.test(transcriptText)
        ? "zh"
        : undefined;
      await Promise.all(
        media.map(async (file) => {
          const trackingId = nanoid();
          if (!isMediaFileWithinLimit(file)) {
            setFileStatus((prev) =>
              new Map(prev).set(trackingId, {
                processing: false,
                error: t("mediaFileTooLarge", {
                  defaultValue: "音视频文件不能超过 120 MB",
                }),
              }),
            );
            return;
          }
          await withMapItemProcessing<string, FileStatus>(
            trackingId,
            setFileStatus,
            async () => {
              try {
                const uploadedFile = await dispatch(
                  upload({ file }) as never,
                ).unwrap();
                const fileId = uploadedFile.id as string;
                const { job } = await createMediaJob({
                  fileId,
                  dialogId: currentDialogKey ?? undefined,
                  sourceLang,
                  targetLang,
                });
                dispatch(
                  addPendingFile({
                    id: job.id,
                    name: file.name,
                    type: "media_job",
                    trackingId: job.id,
                    dialogKey: effectiveDialogKey,
                  }),
                );
              } catch (cause) {
                const message = toErrorMessage(cause);
                setFileStatus((prev) =>
                  new Map(prev).set(trackingId, {
                    processing: false,
                    error: message,
                  }),
                );
              }
            },
          );
        }),
      );

      if (docs.length) {
        await processDocs(docs);
      }
    },
    [processDocs, processImages],
  );

  const processingCount = useMemo(
    () =>
      Array.from(fileStatus.values()).filter((status) => status.processing)
        .length,
    [fileStatus],
  );

  const processingFileIds = useMemo(
    () =>
      new Set(
        Array.from(fileStatus.entries()).flatMap(([id, status]) =>
          status.processing ? [id] : [],
        ),
      ),
    [fileStatus],
  );

  const pendingFilesWithStatus = useMemo(
    () =>
      pendingFiles.map((file) => {
        const status = fileStatus.get(file.trackingId ?? file.id);
        return { ...file, error: status?.error };
      }),
    [pendingFiles, fileStatus],
  );

  return {
    fileStatus,
    processingCount,
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus,
  };
};

export type { FileStatus };
