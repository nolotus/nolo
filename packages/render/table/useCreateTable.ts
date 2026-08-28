import { useCallback, useState } from "react";
import { useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { createTable, addRow } from "./tableSlice";
import { buildScopedPagePath } from "create/space/contentKeyUtils";

interface UseCreateTableOptions {
    onSuccess?: () => void;
}

interface CreateNewTableParams {
    spaceId?: string;
    categoryId?: string;
}

export const useCreateTable = (options?: UseCreateTableOptions) => {
    const { onSuccess } = options || {};
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const userId = useUserId();
    const [isCreating, setIsCreating] = useState(false);

    const createNewTable = useCallback(async ({ spaceId, categoryId }: CreateNewTableParams = {}) => {
        if (!userId) {
            toast.error(t("space:userNotFound", "未找到用户信息，无法创建表格"));
            return;
        }

        setIsCreating(true);
        try {
            // 1. 创建表格 Meta
            const dbKey = await dispatch(
                createTable({
                    spaceId,
                    categoryId,
                    title: t("space:newTable", "新建表格"),
                    withDefaultRows: false,
                })
            ).unwrap();

            // 从 dbKey (meta-tenantId-tableId) 中提取 tableId
            const parts = dbKey.split("-");
            const tableId = parts.slice(2).join("-");

            // 2. 添加初始行
            await dispatch(
                addRow({
                    tenantId: userId,
                    tableId,
                    values: { title: "示例数据", note: "这是自动生成的记录" },
                })
            ).unwrap();

            // 3. 成功回调（关闭菜单等）
            onSuccess?.();

            // 4. 导航（带 space 前缀，保持空间上下文）
            const tablePath = `${buildScopedPagePath(dbKey, spaceId)}?edit=true`;
            navigate(tablePath);
        } catch (error) {
            console.error("Failed to create table:", error);
            toast.error(t("space:createFailed", "创建表格失败"));
        } finally {
            setIsCreating(false);
        }
    }, [dispatch, navigate, userId, t, onSuccess]);

    return {
        createNewTable,
        isCreating,
    };
};
