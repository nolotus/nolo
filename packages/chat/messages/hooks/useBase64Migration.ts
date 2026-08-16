import { useEffect, useMemo, useRef } from "react";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { useAppDispatch, useAppSelector } from "app/store";
import { upload, patch } from "database/dbSlice";
import { dataURLtoFile } from "app/utils/imageUtils";
import { buildMessageFileContentUrl } from "../fileUrl";
import { stripDurableImageInlinePayload } from "../imagePayloadPersistence";

/**
 * Fingerprint of base64 image slots only (index + data-url length).
 * Avoids putting full base64 blobs into the effect dep graph, while still
 * re-running when base64 slots appear/disappear.
 */
function getBase64ContentKey(content: unknown): string {
  if (!Array.isArray(content)) return "";
  let key = "";
  for (let index = 0; index < content.length; index++) {
    const part = content[index] as { type?: string; image_url?: { url?: string } };
    const url = part?.image_url?.url;
    if (
      part?.type === "image_url" &&
      typeof url === "string" &&
      url.startsWith("data:")
    ) {
      key += `${index}:${url.length}|`;
    }
  }
  return key;
}

/**
 * 自动将消息中的 base64 图片迁移为远程文件 URL
 * 只在非只读模式下执行，每条消息最多执行一次成功迁移
 */
export function useBase64Migration(message: any | null) {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  // Track last processed (messageId, content fingerprint) so late-arriving
  // base64 slots still migrate; only permanent after a successful attempt.
  const lastProcessedKeyRef = useRef<string | null>(null);
  const contentRef = useRef(message?.content);
  useEffect(() => {
    contentRef.current = message?.content;
  }, [message?.content]);

  const messageId = message?.id as string | undefined;
  const messageDbKey = message?.dbKey as string | undefined;
  const base64ContentKey = useMemo(
    () => getBase64ContentKey(message?.content),
    [message?.content]
  );

  useEffect(() => {
    if (!messageId || !messageDbKey || !currentServer) return;
    const processKey = `${messageId}::${base64ContentKey}`;
    if (lastProcessedKeyRef.current === processKey) return;

    const rawContent = contentRef.current;
    if (!Array.isArray(rawContent) || !base64ContentKey) {
      // Nothing to migrate yet — do not permanently mark messageId so a later
      // base64ContentKey change can still run.
      lastProcessedKeyRef.current = processKey;
      return;
    }

    const base64Items = rawContent.reduce(
      (
        acc: { index: number; dataUrl: string }[],
        part: any,
        index: number
      ) => {
        const url = part?.image_url?.url;
        if (
          part?.type === "image_url" &&
          typeof url === "string" &&
          url.startsWith("data:")
        ) {
          acc.push({ index, dataUrl: url });
        }
        return acc;
      },
      []
    );

    if (!base64Items.length) {
      lastProcessedKeyRef.current = processKey;
      return;
    }

    let cancelled = false;

    const migrate = async () => {
      let currentContent: any[] = rawContent;

      for (const { index, dataUrl } of base64Items) {
        if (cancelled) break;

        const file = dataURLtoFile(
          dataUrl,
          `msg-img-${messageId}-${index}.png`
        );
        if (!file) continue;

        try {
          const metadata = await dispatch(
            upload({
              file,
              customKey: `msg-img-${messageId}-${index}`,
            }) as any
          ).unwrap();

          const fileId = metadata?.id as string | undefined;
          if (!fileId) continue;

          const remoteUrl = buildMessageFileContentUrl(currentServer, fileId);
          if (!remoteUrl) continue;

          const newContent = currentContent.map((p, i) =>
            i === index
              ? stripDurableImageInlinePayload({
                  ...p,
                  image_url: {
                    ...(p.image_url || {}),
                    url: remoteUrl,
                  },
                })
              : p
          );

          await dispatch(
            patch({
              dbKey: messageDbKey,
              changes: { content: newContent },
            }) as any
          ).unwrap();

          currentContent = newContent;
        } catch {
          // 单个图片迁移失败时忽略，尝试处理后续图片
        }
      }

      if (!cancelled) {
        lastProcessedKeyRef.current = processKey;
      }
    };

    void migrate();

    return () => {
      cancelled = true;
    };
    // base64ContentKey tracks message.content slots without embedding full data URLs.
    // contentRef always holds the latest content snapshot for the migrate body.
  }, [messageId, messageDbKey, base64ContentKey, currentServer, dispatch]);
}
