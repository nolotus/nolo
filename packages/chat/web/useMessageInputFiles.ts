import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { ENABLE_REMOTE_ATTACHMENT_PART_WRITES } from "chat/messages/attachmentWriteRollout";
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

  // 媒体上传中的卡片：hook 本地态（刷新不恢复）。拿到 job 后摘除，
  // 由 pendingFiles 里的 media_job 报价卡接替。
  const [mediaUploads, setMediaUploads] = useState<MediaUploadEntry[]>([]);

  const clearFileStatus = useCallback(() => {
    setFileStatus(new Map());
    // 发送后清掉已失败的上传卡；进行中的保留（发送本就被 processingCount 拦住）。
    setMediaUploads((prev) => prev.filter((item) => item.phase !== "error"));
  }, []);

  const mediaUploadControllersRef = useRef(new Map<string, AbortController>());
  // 上传/建任务中的媒体文件计数：发送拦截需要同步、即时的值（state 提交是异步的）。
  const inFlightMediaCountRef = useRef(0);
  // 「正在建任务」的文件集合：removeMediaUpload 在同步点击路径上判断能否移除。
  // 这条事实必须同步、单调且不受渲染影响：state/effect 镜像会有一个窗口——已进入
  // creating 但 effect 还没跑（甚至用旧 state 把新值覆盖回去）。因此单独用 ref 维护。
  const creatingMediaIdsRef = useRef(new Set<string>());

  const updateMediaUpload = useCallback(
    (trackingId: string, patch: Partial<MediaUploadEntry>) => {
      setMediaUploads((prev) =>
        prev.map((item) =>
          item.trackingId === trackingId ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  const removeMediaUpload = useCallback((trackingId: string) => {
    // 「创建任务中」不可移除：上传已完成、服务端正在建任务，abort 只会留下孤儿任务。
    if (creatingMediaIdsRef.current.has(trackingId)) return;
    mediaUploadControllersRef.current.get(trackingId)?.abort();
    mediaUploadControllersRef.current.delete(trackingId);
    setMediaUploads((prev) =>
      prev.filter((item) => item.trackingId !== trackingId),
    );
  }, []);

  // 注意：卸载时不 abort 上传——首页发送后会跳到对话页，卸载 composer；
  // 让上传与建任务继续，job 照旧落到 runtime store（与改动前行为一致）。

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
      // 媒体文件：同步登记上传卡片（拖入即可见），再异步上传 → 建任务。
      // 这里在任何 await 之前完成 setMediaUploads，drop 事件结束即渲染。
      const mediaEntries = media.map((file) => {
        const trackingId = nanoid();
        const withinLimit = isMediaFileWithinLimit(file);
        const entry: MediaUploadEntry = {
          trackingId,
          name: file.name,
          size: file.size,
          phase: withinLimit ? "uploading" : "error",
          loaded: 0,
          total: file.size,
          error: withinLimit
            ? undefined
            : t("mediaFileTooLarge", {
                defaultValue: "音视频文件不能超过 120 MB",
              }),
        };
        return { file, entry, withinLimit };
      });
      if (mediaEntries.length) {
        setMediaUploads((prev) => [
          ...prev,
          ...mediaEntries.map(({ entry }) => entry),
        ]);
      }

      await Promise.all(
        mediaEntries.map(async ({ file, entry, withinLimit }) => {
          if (!withinLimit) return;
          const { trackingId } = entry;
          // 只有真正进入上传/建任务流程才 +1：这里是第一个 await 之前，仍是同步执行，
          // 所以发送拦截的即时性不变；且与下方 finally 的 -1 一一配对，构造 entry 阶段
          // 抛错也不会泄漏计数。超限（直接进 error）的分支在上面 return，因此不 +1。
          inFlightMediaCountRef.current += 1;
          const controller = new AbortController();
          mediaUploadControllersRef.current.set(trackingId, controller);
          const isCancelled = () => controller.signal.aborted;
          let stage: "upload" | "createJob" = "upload";
          try {
            const uploadedFile = await dispatch(
              upload({
                file,
                signal: controller.signal,
                onProgress: (loaded: number, total: number) => {
                  if (isCancelled()) return;
                  updateMediaUpload(trackingId, { loaded, total });
                },
              }) as never,
            ).unwrap();
            if (isCancelled()) return;
            stage = "createJob";
            // 紧挨着 stage 赋值、中间无 await：从这一刻起移除操作必须被拦住。
            creatingMediaIdsRef.current.add(trackingId);
            updateMediaUpload(trackingId, {
              phase: "creating",
              loaded: file.size,
              total: file.size,
            });
            const fileId = uploadedFile.id as string;
            const { job } = await createMediaJob({
              fileId,
              dialogId: currentDialogKey ?? undefined,
              sourceLang,
              targetLang,
            });
            if (isCancelled()) return;
            // 原位切换：摘上传卡 + 登记任务卡放进同一个 flushSync，一次提交，
            // 不会出现「消失→再出现」或两张并存的中间帧。
            flushSync(() => {
              setMediaUploads((prev) =>
                prev.filter((item) => item.trackingId !== trackingId),
              );
              dispatch(
                addPendingFile({
                  id: job.id,
                  name: file.name,
                  type: "media_job",
                  fileKey: ENABLE_REMOTE_ATTACHMENT_PART_WRITES && uploadedFile.dbKey
                    ? String(uploadedFile.dbKey)
                    : undefined,
                  mimeType: file.type,
                  size: file.size,
                  durationSec: job.durationSec,
                  trackingId: job.id,
                  dialogKey: effectiveDialogKey,
                }),
              );
            });
          } catch (cause) {
            if (isCancelled()) return;
            const prefix =
              stage === "upload"
                ? t("mediaUploadFailed", { defaultValue: "上传失败" })
                : t("mediaJobCreateFailed", {
                    defaultValue: "创建媒体任务失败",
                  });
            updateMediaUpload(trackingId, {
              phase: "error",
              error: `${prefix}：${toErrorMessage(cause)}`,
            });
          } finally {
            // 该文件的全部路径（isCancelled 提前 return、上传/建任务成功或失败）
            // 都经过这里，恰好 -1 一次。
            mediaUploadControllersRef.current.delete(trackingId);
            creatingMediaIdsRef.current.delete(trackingId);
            inFlightMediaCountRef.current -= 1;
          }
        }),
      );

      if (docs.length) {
        await processDocs(docs);
      }
    },
    [
      currentDialogKey,
      dispatch,
      processDocs,
      processImages,
      t,
      updateMediaUpload,
    ],
  );

  // 上传/建任务中的媒体卡也算「处理中」：阻止此时发送（否则消息里没有任务卡）。
  const activeMediaUploadIds = useMemo(
    () =>
      mediaUploads
        .filter((item) => item.phase !== "error")
        .map((item) => item.trackingId),
    [mediaUploads],
  );

  const processingCount = useMemo(
    () =>
      Array.from(fileStatus.values()).filter((status) => status.processing)
        .length + activeMediaUploadIds.length,
    [fileStatus, activeMediaUploadIds],
  );

  const processingFileIds = useMemo(
    () =>
      new Set([
        ...Array.from(fileStatus.entries()).flatMap(([id, status]) =>
          status.processing ? [id] : [],
        ),
        ...activeMediaUploadIds,
      ]),
    [fileStatus, activeMediaUploadIds],
  );

  const pendingFilesWithStatus = useMemo<PendingFileWithStatus[]>(
    () => [
      ...pendingFiles.map((file) => {
        const status = fileStatus.get(file.trackingId ?? file.id);
        return { ...file, error: status?.error };
      }),
      // 上传卡不进 Redux/runtime store（不会被发送、不会被 localStorage 镜像），
      // 只在渲染层拼在附件列表末尾。
      ...mediaUploads.map(
        (item): PendingFileWithStatus => ({
          id: item.trackingId,
          name: item.name,
          type: "media_job",
          trackingId: item.trackingId,
          error: item.error,
          mediaUpload: {
            phase: item.phase,
            loaded: item.loaded,
            total: item.total,
            size: item.size,
            remove: () => removeMediaUpload(item.trackingId),
          },
        }),
      ),
    ],
    [pendingFiles, fileStatus, mediaUploads, removeMediaUpload],
  );

  // 发送拦截用的同步查询：state 层日志之外再暴露一个即时的 in-flight 标志。
  const hasInFlightMediaUpload = useCallback(
    () => inFlightMediaCountRef.current > 0,
    [],
  );

  return {
    fileStatus,
    processingCount,
    processingFileIds,
    pendingFilesWithStatus,
    processFiles,
    clearFileStatus,
    hasInFlightMediaUpload,
  };
};

export type { FileStatus };

type MediaUploadPhase = "uploading" | "creating" | "error";

interface MediaUploadEntry {
  trackingId: string;
  name: string;
  size: number;
  phase: MediaUploadPhase;
  loaded: number;
  total: number;
  error?: string;
}

/** 渲染层附加在 PendingFile 上的上传态；存在即表示「还没拿到 job」的上传卡。 */
export interface PendingMediaUploadState {
  phase: MediaUploadPhase;
  loaded: number;
  total: number;
  size: number;
  remove: () => void;
}

export type PendingFileWithStatus = PendingFile & {
  error?: string;
  mediaUpload?: PendingMediaUploadState;
};
