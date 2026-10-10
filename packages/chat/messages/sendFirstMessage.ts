// 文件路径: packages/chat/messages/sendFirstMessage.ts

import type { AgentRuntimeOptions } from "ai/agent/types";
import { handleSendMessage } from "chat/dialog/dialogSlice";
import { upload } from "database/dbSlice";
import { getRuntimeServerContext } from "database/runtimeServerContext";
import { waitForFileReady, compressImageFile } from "app/utils/imageUtils";
import { readFileAsDataURL } from "app/utils/fileReaders";
import type { RootState } from "app/store";
import { buildMessageFileContentUrl, isLocalFileContentUrl } from "./fileUrl";

type MessagePart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
    | { type: string; name: string; pageKey: string; dialogKey?: string };

export interface SendFirstMessageParams {
    dialogKey?: string;
    text?: string;
    // 对于首页场景，图片和文件一般是“原始 File 列表”
    imageFiles?: File[];
    docFiles?: File[];
    runtimeOptions?: AgentRuntimeOptions;
    targetAgentKey?: string;
    extraParts?: MessagePart[];
    quickChatPerfStartedAt?: number;
}

const logQuickChatPerfStage = (
    startedAt: number | undefined,
    stage: string,
    details: Record<string, unknown> = {}
) => {
    if (!startedAt) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    console.info("[QuickChatPerf]", {
        stage,
        elapsedMs: now - startedAt,
        ...(typeof performance !== "undefined" ? { atMs: now } : {}),
        ...details,
    });
};

const IMAGE_PREP_CONCURRENCY = 2;
export const MAX_INLINE_IMAGE_FALLBACK_BYTES = 5 * 1024 * 1024;

const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
    if (items.length === 0) return [];

    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
            const currentIndex = nextIndex++;
            if (currentIndex >= items.length) return;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results;
};

const buildInlineImagePart = async (file: File): Promise<MessagePart> => ({
    type: "image_url",
    image_url: { url: await readFileAsDataURL(file) },
});

const buildFallbackImagePart = async (file: File): Promise<MessagePart> => {
    console.log("[QuickChatTrace] buildFallbackImagePart enter", {
        sizeBytes: file.size,
        limitBytes: MAX_INLINE_IMAGE_FALLBACK_BYTES,
    });
    if (file.size <= MAX_INLINE_IMAGE_FALLBACK_BYTES) {
        const part = await buildInlineImagePart(file);
        console.log("[QuickChatTrace] buildFallbackImagePart → inline data URL", {
            sizeBytes: file.size,
            previewType: part.type,
        });
        return part;
    }
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = (MAX_INLINE_IMAGE_FALLBACK_BYTES / (1024 * 1024)).toFixed(0);
    console.warn("[QuickChatTrace] buildFallbackImagePart → too large, throwing", {
        sizeMB,
        limitMB,
    });
    throw new Error(`图片上传失败，文件过大（${sizeMB}MB，上限 ${limitMB}MB），请压缩后重试。`);
};

/**
 * 发送一条首条消息：
 * - 支持文字 + 图片 + 文档混合
 * - 负责上传图片、等待可访问 URL，构造 parts[]
 * - 最终统一调用 handleSendMessage，触发 streaming
 *
 * 首页 QuickChat / RN OmniInput 等入口可以显式传 dialogKey，
 * 不再依赖“先 init 当前对话，再发送”的时序。
 */
export const sendFirstMessage =
    (params: SendFirstMessageParams) =>
        async (dispatch: any, getState: () => RootState) => {
            const state = getState();
            const { currentServer } = getRuntimeServerContext(state);

            const {
                text,
                imageFiles = [],
                docFiles = [],
                runtimeOptions,
                targetAgentKey,
                extraParts = [],
                quickChatPerfStartedAt,
            } = params;

            const trimmed = text?.trim() ?? "";
            logQuickChatPerfStage(quickChatPerfStartedAt, "send-first-message-entered", {
                hasText: !!trimmed,
                imageCount: imageFiles.length,
                docFileCount: docFiles.length,
                extraPartCount: extraParts.length,
            });
            console.group("[QuickChatTrace] sendFirstMessage thunk enter");
            console.log("[QuickChatTrace] sendFirstMessage context", {
                dialogKey: params.dialogKey,
                hasText: !!trimmed,
                textLength: trimmed.length,
                imageCount: imageFiles.length,
                docFileCount: docFiles.length,
                extraPartCount: extraParts.length,
                targetAgentKey,
                currentServer,
                imageFileSummaries: imageFiles.map((f) => ({
                    name: f.name,
                    type: f.type,
                    sizeBytes: f.size,
                })),
            });

            // 1. 组装最基本的 parts（文字 + 文档）
            const parts: MessagePart[] = [];
            if (trimmed) {
                parts.push({ type: "text", text: trimmed });
            }

            // TODO: 如果以后 docFiles 需要在这里处理，可以复用 MessageInputContainer 的文档处理管线
            // 当前文档逻辑是通过 “pendingFiles + addReferenceKeysAction + createPage”等实现的，
            // 如需首页入口支持文档首条消息，请把那部分逻辑抽成复用函数后在这里调用。

            // 2. 处理图片 files：优先直传压缩后的 File，只有 fallback 时才转 data URL
            console.log("[QuickChatTrace] sendFirstMessage start image upload pipeline", {
                imageCount: imageFiles.length,
                concurrency: IMAGE_PREP_CONCURRENCY,
            });
            const uploadedImgs = await mapWithConcurrency(
                imageFiles,
                IMAGE_PREP_CONCURRENCY,
                async (file, idx): Promise<MessagePart> => {
                    console.group(`[QuickChatTrace] image ${idx} start`);
                    console.log("[QuickChatTrace] image original", {
                        idx,
                        name: file.name,
                        type: file.type,
                        sizeBytes: file.size,
                    });
                    const uploadFile = await compressImageFile(file);
                    console.log("[QuickChatTrace] image compressed", {
                        idx,
                        originalSizeBytes: file.size,
                        compressedSizeBytes: uploadFile.size,
                        compressedType: uploadFile.type,
                    });

                    try {
                        const customKey = `chat-image-${Date.now()}`;
                        console.log("[QuickChatTrace] image upload dispatch", {
                            idx,
                            customKey,
                            targetServer: currentServer,
                            uploadSizeBytes: uploadFile.size,
                        });
                        const metadata = await dispatch(
                            upload({
                                file: uploadFile,
                                customKey,
                            }) as any
                        ).unwrap();
                        const fileId = metadata?.id as string | undefined;
                        console.log("[QuickChatTrace] image upload result", {
                            idx,
                            fileId,
                            metadataKeys: metadata ? Object.keys(metadata) : null,
                        });

                        if (!fileId || !currentServer) {
                            console.warn("[QuickChatTrace] image fallback (no fileId/server)", {
                                idx,
                                fileId,
                                currentServer,
                            });
                            console.groupEnd();
                            return buildFallbackImagePart(uploadFile);
                        }

                        const imageUrl = buildMessageFileContentUrl(currentServer, fileId);
                        console.log("[QuickChatTrace] image url built", { idx, imageUrl });
                        if (!imageUrl) {
                            console.warn("[QuickChatTrace] image fallback (no url)", { idx });
                            console.groupEnd();
                            return buildFallbackImagePart(uploadFile);
                        }

                        if (isLocalFileContentUrl(imageUrl)) {
                            console.warn("[QuickChatTrace] image fallback (local url)", {
                                idx,
                                imageUrl,
                            });
                            console.groupEnd();
                            return buildFallbackImagePart(uploadFile);
                        }

                        console.log("[QuickChatTrace] image waitForFileReady ...", {
                            idx,
                            imageUrl,
                        });
                        const ready = await waitForFileReady(imageUrl);
                        console.log("[QuickChatTrace] image waitForFileReady result", {
                            idx,
                            ready,
                        });
                        if (!ready) {
                            console.warn("[QuickChatTrace] image fallback (not ready)", { idx });
                            console.groupEnd();
                            return buildFallbackImagePart(uploadFile);
                        }

                        console.log("[QuickChatTrace] image upload ok", { idx, imageUrl });
                        console.groupEnd();
                        return {
                            type: "image_url",
                            image_url: { url: imageUrl },
                        };
                    } catch (error) {
                        console.error("[QuickChatTrace] image upload threw", { idx, error });
                        console.warn(
                            "[sendFirstMessage] image upload failed, using configured fallback policy",
                            error
                        );
                        console.groupEnd();
                        return buildFallbackImagePart(uploadFile);
                    }
                }
            );

            const finalParts: MessagePart[] = [
                ...parts,
                ...extraParts,
                ...uploadedImgs,
            ];
            if (!finalParts.length) {
                console.warn("[QuickChatTrace] sendFirstMessage no parts, skip");
                console.groupEnd();
                return;
            }
            console.log("[QuickChatTrace] sendFirstMessage finalParts", {
                totalCount: finalParts.length,
                textCount: finalParts.filter((p) => p.type === "text").length,
                imageUrlCount: finalParts.filter((p) => p.type === "image_url").length,
                otherCount: finalParts.length - finalParts.filter((p) => p.type === "text" || p.type === "image_url").length,
                imageUrls: finalParts
                    .filter((p) => p.type === "image_url")
                    .map((p: any) => p.image_url?.url),
            });
            logQuickChatPerfStage(quickChatPerfStartedAt, "send-first-message-parts-ready", {
                partCount: finalParts.length,
                uploadedImageCount: uploadedImgs.length,
            });

            const payload =
                finalParts.length === 1 && finalParts[0].type === "text"
                    ? (finalParts[0] as any).text
                    : finalParts;

            console.log("[QuickChatTrace] handleSendMessage dispatch", {
                dialogKey: params.dialogKey,
                targetAgentKey,
                payloadKind: typeof payload === "string" ? "string" : "parts",
            });
            try {
                await dispatch(
                    handleSendMessage({
                        userInput: payload,
                        dialogKey: params.dialogKey,
                        runtimeOptions,
                        targetAgentKey,
                        quickChatPerfStartedAt,
                    })
                ).unwrap();
                console.log("[QuickChatTrace] handleSendMessage resolved");
            } catch (err) {
                console.error("[QuickChatTrace] handleSendMessage rejected", err);
                throw err;
            } finally {
                console.groupEnd();
            }
        };
