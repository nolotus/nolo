import "./layout.css";
import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Link } from "app/routing";
import {
  LuHistory,
  LuRefreshCw,
  LuExternalLink,
  LuBot,
  LuInfo,
  LuX,
  LuFileCode,
  LuPackage,
  LuTrash2,
  LuEllipsisVertical,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useClickOutside } from "app/hooks/useClickOutside";
import type { AppDetail } from "app/hooks/useAppDetail";

interface TopbarAppSlotProps {
  app: AppDetail | null;
  refetchApp: () => void;
  isAppEditMode: boolean;
  appEditorUrl: string;
  appPrimaryUrl: string;
  onShowVersionPanel: () => void;
  onDelete?: () => Promise<boolean>;
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleString();
}

const TopbarAppSlot: React.FC<TopbarAppSlotProps> = ({
  app,
  refetchApp,
  isAppEditMode,
  appEditorUrl,
  appPrimaryUrl,
  onShowVersionPanel,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);

  useClickOutside(panelRef as any, (e) => {
    // 排除 info 按钮本身（避免关了又开）
    if (btnRef.current?.contains(e.target as Node)) return;
    setShowInfo(false);
  });

  useEffect(() => {
    if (!showInfo) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowInfo(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showInfo]);

  // 点击外部关闭三点菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        if (!deleting) setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, deleting]);

  const handleToggleInfo = useCallback(() => {
    if (!showInfo && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
        zIndex: 1001,
        margin: 0,
      });
    }
    setShowInfo((v) => !v);
  }, [showInfo]);

  const handleDeleteClick = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!onDelete || deleting) return;
    setDeleting(true);
    const ok = await onDelete();
    if (!ok) setDeleting(false);
  }, [confirmDelete, onDelete, deleting]);

  const sourceFiles =
    Array.isArray(app?.files) && app.files.length > 0
      ? app.files
      : app?.code
        ? [{ name: "worker.ts" }]
        : [];

  const infoFields = app
    ? [
        { label: "App ID", value: app.appId ?? "-" },
        {
          label: t("appDetail.framework", "框架"),
          value: app.framework ?? "worker",
        },
        {
          label: t("appDetail.visibility", "可见性"),
          value: app.visibility ?? "-",
        },
        { label: t("appDetail.space", "空间"), value: app.spaceId ?? "-" },
        {
          label: t("appDetail.accessUrl", "访问地址"),
          value: app.url ?? "-",
        },
        ...(app.customUrl && app.customUrl !== app.url
          ? [
              {
                label: t("appDetail.customUrl", "自定义域名"),
                value: app.customUrl,
              },
            ]
          : []),
        {
          label: t("appDetail.createdAt", "创建时间"),
          value: formatDate(app.createdAt),
        },
        {
          label: t("appDetail.updatedAt", "最近更新"),
          value: formatDate(app.modifiedOn),
        },
      ]
    : [];

  return (
    <>
      <div className="topbar__app-slot">
        {/* 应用名 + 框架标签 */}
        <div className="topbar__app-identity">
          <span className="topbar__app-name">
            {app?.userFriendlyName ?? "…"}
          </span>
          {app?.framework && (
            <span className="topbar__app-badge">{app.framework}</span>
          )}
        </div>

        {/* 信息图标 + 详情浮层（portal 渲染，绕过 overflow:hidden） */}
        <div className="topbar__app-info-wrap">
          <button
            ref={btnRef}
            type="button"
            className={`topbar__app-btn topbar__app-btn--icon ${showInfo ? "is-active" : ""}`}
            onClick={handleToggleInfo}
            title={t("appDetail.info", "应用信息")}
            aria-label={t("appDetail.info", "应用信息")}
            aria-haspopup="dialog"
            aria-expanded={showInfo}
          >
            <LuInfo size={14} aria-hidden="true" />
          </button>

          {showInfo && typeof document !== "undefined" && ReactDOM.createPortal(
            <dialog
              open
              ref={panelRef}
              className="topbar__app-info-panel"
              style={panelStyle}
              role="dialog"
              aria-modal="true"
              aria-label={t("appDetail.info", "应用信息")}
            >
              {/* 面板头 */}
              <div className="topbar__app-info-header">
                <span className="topbar__app-info-title">
                  {app?.userFriendlyName ?? "…"}
                </span>
                <button
                  type="button"
                  className="topbar__app-info-close"
                  onClick={() => setShowInfo(false)}
                  aria-label={t("close", "关闭")}
                >
                  <LuX size={13} aria-hidden="true" />
                </button>
              </div>

              {/* 基础信息 */}
              <div className="topbar__app-info-grid">
                {infoFields.map((item) => (
                  <React.Fragment key={item.label}>
                    <span className="topbar__app-info-label">{item.label}</span>
                    <span className="topbar__app-info-value">{item.value}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* 源文件 */}
              {sourceFiles.length > 0 && (
                <div className="topbar__app-info-section">
                  <div className="topbar__app-info-section-title">
                    <LuFileCode size={12} aria-hidden="true" />
                    {t("appDetail.filesTitle", "源码文件")}
                  </div>
                  <div className="topbar__app-info-chips">
                    {sourceFiles.map((f) => (
                      <span key={f.name} className="topbar__app-info-chip">
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 外部依赖 */}
              {Array.isArray(app?.externalImports) &&
                app.externalImports.length > 0 && (
                  <div className="topbar__app-info-section">
                    <div className="topbar__app-info-section-title">
                      <LuPackage size={12} aria-hidden="true" />
                      {t("appDetail.externalImportsTitle", "外部依赖")}
                    </div>
                    <div className="topbar__app-info-chips">
                      {app.externalImports.map((pkg) => (
                        <span key={pkg} className="topbar__app-info-chip">
                          {pkg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </dialog>,
            document.body
          )}
        </div>

        {/* 对话按钮 + 三点菜单 */}
        <div className="topbar__app-sep" />
        <div className="topbar__app-actions">
          {/* 对话编辑（等同于原来的编辑入口） */}
          {!isAppEditMode && appEditorUrl && (
            <Link to={appEditorUrl} className="topbar__app-btn topbar__app-btn--icon" title={t("appEditor.chatMode_title", "对话编辑")}>
              <LuBot size={16} aria-hidden="true" />
            </Link>
          )}
          {isAppEditMode && appEditorUrl && (
            <Link to={appEditorUrl} className="topbar__app-btn topbar__app-btn--icon" title={t("appEditor.chatMode_title", "对话编辑")}>
              <LuBot size={16} aria-hidden="true" />
            </Link>
          )}

          {/* 三点菜单：版本管理、刷新、打开应用、删除 */}
          <div className="topbar__app-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="topbar__app-btn topbar__app-btn--icon"
              onClick={() => setMenuOpen((v) => !v)}
              title={t("moreActions", "更多操作")}
              aria-label={t("moreActions", "更多操作")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <LuEllipsisVertical size={16} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="topbar__app-menu" role="menu">
                <button
                  type="button"
                  className="topbar__app-menu-item"
                  onClick={() => { setMenuOpen(false); onShowVersionPanel(); }}
                  disabled={!app?.appId}
                  role="menuitem"
                >
                  <LuHistory size={14} aria-hidden="true" />
                  {t("appEditor.snapshot", "历史快照")}
                </button>
                <button
                  type="button"
                  className="topbar__app-menu-item"
                  onClick={() => { setMenuOpen(false); refetchApp(); window.dispatchEvent(new CustomEvent("app-editor-refresh")); }}
                  role="menuitem"
                >
                  <LuRefreshCw size={14} aria-hidden="true" />
                  {t("appEditor.refresh", "刷新")}
                </button>
                {appPrimaryUrl && (
                  <a
                    href={appPrimaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="topbar__app-menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LuExternalLink size={14} aria-hidden="true" />
                    {t("appEditor.openApp", "打开应用")}
                  </a>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className={`topbar__app-menu-item topbar__app-menu-item--danger ${confirmDelete ? "is-confirm" : ""}`}
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    role="menuitem"
                  >
                    <LuTrash2 size={14} aria-hidden="true" />
                    {confirmDelete ? t("app_delete_confirm", "确认删除？") : t("app_delete", "删除应用")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      
    </>
  );
};

export default TopbarAppSlot;
