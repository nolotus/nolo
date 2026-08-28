// 文件：create/editor/imageUpload.ts

import { Editor, Transforms } from "slate";
import type { AppDispatch } from "app/store";
import { upload } from "database/dbSlice";
import { uploadAndAddFileToSpace } from "create/space/spaceSlice";
import { toast } from "app/utils/toast"

const createCustomKey = (file: File) =>
    `slate-image-${file.lastModified}-${file.size}-${Math.random()
        .toString(36)
        .slice(2)}`;

/**
 * 从 File 上传并在当前 selection 处插入 image 节点。
 * - 带「上传中」Loading toast；
 * - 成功 / 失败 toast；
 * - 返回 fileId（失败返回 null）。
 */
export const insertImageFromFile = async (
    editor: Editor,
    dispatch: AppDispatch | any,
    file: File,
    spaceId?: string
): Promise<string | null> => {
    const customKey = createCustomKey(file);
    const toastId = toast.loading(`正在上传图片…`);

    try {
        let metadata: any;

        if (spaceId) {
            // 如果在空间内，关联到空间
            metadata = await (dispatch as any)(
                (uploadAndAddFileToSpace as any)({ spaceId, file })
            ).unwrap();
        } else {
            // 否则仅上传（旧逻辑）
            metadata = await dispatch(
                upload({ file, customKey })
            ).unwrap();
        }

        // extract the actual fileId (ULID) for content loading
        const fileId = metadata?.fileId || metadata?.id || metadata?.dbKey;
        if (!fileId) {
            toast.error("上传失败：未返回文件 ID", { id: toastId });
            return null;
        }

        const imageNode: any = {
            type: "image",
            fileId,
            alt: file.name,
            children: [{ text: "" }], // children = Caption
        };

        Transforms.insertNodes(editor, imageNode);
        toast.success("图片上传成功", { id: toastId });

        return fileId;
    } catch {
        toast.error("图片上传失败", { id: toastId });
        return null;
    }
};