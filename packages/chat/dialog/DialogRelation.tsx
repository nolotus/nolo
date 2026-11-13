// packages/chat/dialog/DialogRelation.tsx
// 子对话页的父关系入口：显示真实父对话标题并可回到父对话。
//
// 复用已授权的单条 DB read；不 hydrate 列表或消息，不写缓存。

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import { useToken } from "identity";
import { useAuthTargetServer } from "app/settings/useAuthTargetServer";
import { isTombstoneRecord } from "database/tombstones";
import { buildDialogUrl } from "./dialogUrl";
import {
  buildOwnedDialogKey,
  normalizeDialogId,
  resolveParentRelation,
  type ParentDialogSummary,
} from "./dialogRelationState";

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: "var(--fontSize-sm)",
  color: "var(--primaryColor, #3355ff)",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
};

const mutedStyle: React.CSSProperties = {
  fontSize: "var(--fontSize-sm)",
  color: "var(--textTertiary)",
};

/** 单条授权读取。状态绑定 key，换对话时绝不暴露上一条链接。 */
export const useAuthorizedDialogSummary = (dialogKey: string | null) => {
  const token = useToken();
  const { currentServer: server } = useAuthTargetServer();
  const [state, setState] = useState<{
    key: string | null;
    data: ParentDialogSummary | null;
    loading: boolean;
  }>({ key: null, data: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ key: dialogKey, data: null, loading: !!dialogKey && !!token });
    if (!dialogKey || !token) return;
    void (async () => {
      let data: ParentDialogSummary | null = null;
      try {
        const origin = String(server ?? "").replace(/\/+$/, "");
        const response = await fetch(
          `${origin}/api/v1/db/read/${encodeURIComponent(dialogKey)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        if (response.ok) {
          const payload = await response.json();
          const raw = payload?.data ?? payload;
          if (raw && typeof raw === "object" && !Array.isArray(raw) &&
              !isTombstoneRecord(raw) && !raw.error &&
              (!raw.dbKey || raw.dbKey === dialogKey)) {
            data = {
              title: typeof raw.title === "string" ? raw.title.trim() || null : null,
              spaceId: typeof raw.spaceId === "string" ? raw.spaceId.trim() || null : null,
              dialogKey,
            };
          }
        }
      } catch { /* unavailable or unauthorized: never generate a dead link */ }
      if (!controller.signal.aborted) setState({ key: dialogKey, data, loading: false });
    })();
    return () => controller.abort();
  }, [dialogKey, server, token]);
  return state.key === dialogKey ? state : { data: null, loading: !!dialogKey && !!token };
};

/** 子对话页顶部的父对话入口。 */
export const DialogParentLink: React.FC<{
  selfDialogId: string;
  parentDialogId: string;
  ownerId: string;
}> = ({ selfDialogId, parentDialogId, ownerId }) => {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const location = useLocation();
  const parentId = normalizeDialogId(parentDialogId, ownerId);
  const { data, loading } = useAuthorizedDialogSummary(
    buildOwnedDialogKey(ownerId, parentId),
  );

  const relation = useMemo(() => {
    const summary = data;
    return resolveParentRelation({
      selfDialogId,
      parentDialogId,
      ownerId,
      summary,
    });
  }, [data, selfDialogId, parentDialogId, ownerId]);

  if (relation.status === "none" || relation.status === "self") return null;

  if (loading) {
    return (
      <div style={mutedStyle}>
        {t("dialogRelation.parentLoading", "正在确认父对话…")}
      </div>
    );
  }

  if (relation.status !== "resolved" || !relation.parentDialogKey) {
    return (
      <div style={mutedStyle}>
        {t(
          "dialogRelation.parentUnknown",
          "父对话关系暂不可用（未加载或无权限）",
        )}
      </div>
    );
  }

  // 父对话按它自己的 space 路由，不把当前（子）对话的 space 强加给父。
  const target = `${buildDialogUrl(
    relation.parentDialogKey,
    relation.parentSpaceId ?? null,
  )}${location.search || ""}`;
  const label = relation.parentTitle ?? relation.parentDialogId ?? "";
  return (
    <button
      type="button"
      style={linkStyle}
      onClick={() => navigate(target)}
      data-hook="dialog-parent-link"
    >
      ←{" "}
      {t("dialogRelation.parentOf", "父对话：{{title}}", { title: label })}
    </button>
  );
};

/** 对话页关系区块：当前只有「回到父对话」；子对话入口复用 ChildRunObserverPanel。 */
export const DialogRelationSection: React.FC<{
  dialogId: string;
  parentDialogId?: string | null;
  ownerId?: string | null;
}> = ({ dialogId, parentDialogId, ownerId }) => {
  if (!parentDialogId) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "4px 16px",
        flexShrink: 0,
      }}
      data-hook="dialog-relation-section"
    >
      <DialogParentLink
        selfDialogId={dialogId}
        parentDialogId={parentDialogId}
        ownerId={ownerId ?? ""}
      />
    </div>
  );
};

export default DialogRelationSection;
