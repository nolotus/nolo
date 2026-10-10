import { useCallback, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { nanoid } from "nanoid";
import type { AppDispatch } from "app/store";
import { withMapItemProcessing } from "app/utils/asyncMapStatus";
import { splitFiles } from "app/utils/fileUtils";
import { toErrorMessage } from "core/errorMessage";
import {
  GLOBAL_DIALOG_RUNTIME_KEY,
  type PendingFile,
} from "../dialog/dialogSlice";
import type * as FileProcessorModule from "./fileProcessor";

let fileProcessorModulePromise:
  | Promise<typeof FileProcessorModule>
  | null = null;

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
  options: UseMessageInputFilesOptions
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

  const [fileStatus, setFileStatus] = useState<Map<string, FileStatus>>(
    () => new Map()
  );

  const clearFileStatus = useCallback(() => {
    setFileStatus(new Map());
  }, []);

  const processDocs = useCallback(
    async (docs: File[]) => {
      if (!docs.length) return;

      const processDocumentFile = await getProcessDocumentFile();
      const effectiveDialogKey =
        currentDialogKey || GLOBAL_DIALOG_RUNTIME_KEY;

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
            }
          );
        })
      );
    },
    [currentDialogKey, currentServer, dispatch, ocrModel, t, token]
  );

  const processFiles = useCallback(
    async (input: FileList | File[] | null) => {
      if (!input) return;

      const filesArray = Array.isArray(input) ? input : Array.from(input);
      if (!filesArray.length) return;

      const [images, docs] = splitFiles(filesArray);

      if (images.length) {
        processImages(images);
      }

      if (docs.length) {
        await processDocs(docs);
      }
    },
    [processDocs, processImages]
  );

  const processingCount = useMemo(
    () =>
      Array.from(fileStatus.values()).filter((status) => status.processing)
        .length,
    [fileStatus]
  );

  const processingFileIds = useMemo(
    () =>
      new Set(
        Array.from(fileStatus.entries()).flatMap(([id, status]) =>
          status.processing ? [id] : [],
        )
      ),
    [fileStatus]
  );

  const pendingFilesWithStatus = useMemo(
    () =>
      pendingFiles.map((file) => {
        const status = fileStatus.get(file.trackingId ?? file.id);
        return { ...file, error: status?.error };
      }),
    [pendingFiles, fileStatus]
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
