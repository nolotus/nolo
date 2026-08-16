import React, { useState, useEffect, useCallback } from "react";
import "./VersionHistoryPanel.css";
import {
  LuHistory,
  LuPin,
  LuPinOff,
  LuRefreshCw,
  LuTrash2,
  LuPencil,
  LuCheck,
  LuX,
  LuClock,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import {
  buildVersionDeleteRequest,
  buildVersionLabelRequest,
  buildVersionListRequest,
  buildVersionPinRequest,
  buildVersionRestoreRequest,
} from "./versionApi";
import {
  ensureSpecificAppVersionLocal,
  fetchAppVersionsCurrentServerFirst,
} from "./appVersionReplication";

export type VersionEntityType = "app" | "doc" | "agent";

interface VersionEntry {
  versionId: string;
  entityId: string;
  type: VersionEntityType;
  snapshot: any;
  label?: string;
  pinned?: boolean;
  createdAt: string;
}

interface VersionHistoryPanelProps {
  type: VersionEntityType;
  entityId: string;
  sourceServerOrigin?: string | null;
  onRestore?: () => void;
  onClose: () => void;
}

function timeAgo(iso: string, t: (k: string, o?: any) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("version.justNow", { defaultValue: "just now" });
  if (mins < 60)
    return t("version.minsAgo", { count: mins, defaultValue: `${mins}m ago` });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return t("version.hrsAgo", { count: hrs, defaultValue: `${hrs}h ago` });
  const days = Math.floor(hrs / 24);
  return t("version.daysAgo", { count: days, defaultValue: `${days}d ago` });
}

export function VersionHistoryPanel({
  type,
  entityId,
  sourceServerOrigin,
  onRestore,
  onClose,
}: VersionHistoryPanelProps) {
  const { t } = useTranslation();
  const { currentServer: server, currentToken: token } =
    useAppSelector(selectRuntimeSnapshot);

  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      if (type === "app") {
        const data = await fetchAppVersionsCurrentServerFirst({
          currentServer: server!,
          sourceServer: sourceServerOrigin,
          token: token!,
          appId: entityId,
        });
        setVersions(data as VersionEntry[]);
        return;
      }
      const request = buildVersionListRequest(server!, token!, type, entityId);
      const res = await fetch(request.url, request.init);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [entityId, server, sourceServerOrigin, token, type]);

  const ensureLocalVersion = useCallback(
    async (versionId: string) => {
      if (type !== "app" || !sourceServerOrigin) return true;
      return ensureSpecificAppVersionLocal({
        currentServer: server!,
        sourceServer: sourceServerOrigin,
        token: token!,
        appId: entityId,
        versionId,
      });
    },
    [entityId, server, sourceServerOrigin, token, type]
  );

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handlePin = async (v: VersionEntry) => {
    if (!(await ensureLocalVersion(v.versionId))) return;
    const request = buildVersionPinRequest(
      server!,
      token!,
      type,
      entityId,
      v.versionId,
      !v.pinned
    );
    const res = await fetch(request.url, request.init);
    if (res.ok) fetchVersions();
  };

  const handleRestore = async (v: VersionEntry) => {
    setRestoring(v.versionId);
    try {
      if (!(await ensureLocalVersion(v.versionId))) return;
      const request = buildVersionRestoreRequest(
        server!,
        token!,
        type,
        entityId,
        v.versionId,
        type === "app" ? { restoreMode: "source_only" } : undefined
      );
      const res = await fetch(request.url, request.init);
      if (res.ok) {
        onRestore?.();
        onClose();
      }
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (v: VersionEntry) => {
    setDeleting(v.versionId);
    try {
      if (!(await ensureLocalVersion(v.versionId))) return;
      const request = buildVersionDeleteRequest(
        server!,
        token!,
        type,
        entityId,
        v.versionId
      );
      const res = await fetch(request.url, request.init);
      if (res.ok) fetchVersions();
    } finally {
      setDeleting(null);
    }
  };

  const handleLabelSave = async (v: VersionEntry) => {
    if (!(await ensureLocalVersion(v.versionId))) return;
    const request = buildVersionLabelRequest(
      server!,
      token!,
      type,
      entityId,
      v.versionId,
      editLabel
    );
    const res = await fetch(request.url, request.init);
    if (res.ok) {
      setEditingId(null);
      fetchVersions();
    }
  };

  const pinned = versions.filter((v) => v.pinned);
  const unpinned = versions.filter((v) => !v.pinned);

  return (
    <>

      <button
        type="button"
        className="vhp-overlay"
        aria-label={t("close", { defaultValue: "Close" })}
        onClick={onClose}
      />
      <div className="vhp-panel">
        <div className="vhp-header">
          <span className="vhp-header-icon"><LuHistory size={15} aria-hidden="true" /></span>
          {t("version.history", { defaultValue: "Version History" })}
          <div className="vhp-stats">
            <span className="vhp-stat-badge">{t("version.pinCount", { count: pinned.length, defaultValue: `${pinned.length}/10 pinned` })}</span>
            <span className="vhp-stat-badge">{t("version.totalCount", { count: unpinned.length, defaultValue: `${unpinned.length}/50 auto` })}</span>
          </div>
          <button
            type="button"
            className="vhp-close"
            onClick={onClose}
            title={t("close", { defaultValue: "Close" })}
            aria-label={t("close", { defaultValue: "Close" })}
          >
            <LuX size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="vhp-body">
          {loading ? (
            <div className="vhp-loading">
              <LuRefreshCw size={18} className="vhp-spin" aria-hidden="true" />
            </div>
          ) : versions.length === 0 ? (
            <div className="vhp-empty">
              <span className="vhp-empty-icon"><LuHistory size={28} aria-hidden="true" /></span>
              {t("version.empty", { defaultValue: "No version history yet." })}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <div className="vhp-section-label">
                    {t("version.pinned", { defaultValue: "Pinned" })}
                  </div>
                  {pinned.map((v) => (
                    <VersionItem
                      key={v.versionId}
                      v={v}
                      editingId={editingId}
                      editLabel={editLabel}
                      restoring={restoring}
                      deleting={deleting}
                      onPin={handlePin}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      onEditStart={(id, lbl) => { setEditingId(id); setEditLabel(lbl || ""); }}
                      onEditCancel={() => setEditingId(null)}
                      onEditSave={handleLabelSave}
                      onEditLabelChange={setEditLabel}
                      t={t}
                    />
                  ))}
                </>
              )}
              {unpinned.length > 0 && (
                <>
                  {pinned.length > 0 && (
                    <div className="vhp-section-label">
                      {t("version.auto", { defaultValue: "Auto-saved" })}
                    </div>
                  )}
                  {unpinned.map((v) => (
                    <VersionItem
                      key={v.versionId}
                      v={v}
                      editingId={editingId}
                      editLabel={editLabel}
                      restoring={restoring}
                      deleting={deleting}
                      onPin={handlePin}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      onEditStart={(id, lbl) => { setEditingId(id); setEditLabel(lbl || ""); }}
                      onEditCancel={() => setEditingId(null)}
                      onEditSave={handleLabelSave}
                      onEditLabelChange={setEditLabel}
                      t={t}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

interface VersionItemProps {
  v: VersionEntry;
  editingId: string | null;
  editLabel: string;
  restoring: string | null;
  deleting: string | null;
  onPin: (v: VersionEntry) => void;
  onRestore: (v: VersionEntry) => void;
  onDelete: (v: VersionEntry) => void;
  onEditStart: (id: string, lbl: string | undefined) => void;
  onEditCancel: () => void;
  onEditSave: (v: VersionEntry) => void;
  onEditLabelChange: (s: string) => void;
  t: (k: string, o?: any) => string;
}

function VersionItem({
  v, editingId, editLabel, restoring, deleting,
  onPin, onRestore, onDelete, onEditStart, onEditCancel, onEditSave, onEditLabelChange, t,
}: VersionItemProps) {
  const isEditing = editingId === v.versionId;
  const defaultLabel = v.label || t("version.autoSave", { defaultValue: "Auto-save" });

  return (
    <div className="vhp-item">
      <div className={`vhp-item-icon${v.pinned ? " pinned" : ""}`}>
        <LuClock size={14} aria-hidden="true" />
      </div>
      <div className="vhp-item-main">
        {isEditing ? (
          <div className="vhp-label-edit">
            <input
              className="vhp-label-input"
              value={editLabel}
              onChange={(e) => onEditLabelChange(e.target.value)}
              autoFocus
              aria-label={t("version.editLabel", { defaultValue: "Edit label" })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEditSave(v);
                if (e.key === "Escape") onEditCancel();
              }}
            />
            <button
              type="button"
              className="vhp-btn"
              onClick={() => onEditSave(v)}
              title={t("save", { defaultValue: "Save" })}
              aria-label={t("save", { defaultValue: "Save" })}
            >
              <LuCheck size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="vhp-btn"
              onClick={onEditCancel}
              title={t("cancel", { defaultValue: "Cancel" })}
              aria-label={t("cancel", { defaultValue: "Cancel" })}
            >
              <LuX size={13} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="vhp-item-label">{defaultLabel}</div>
        )}
        <div className="vhp-item-time">{timeAgo(v.createdAt, t)}</div>
      </div>
      <div className="vhp-actions">
        <button
          type="button"
          className={`vhp-btn${v.pinned ? " pin-active" : ""}`}
          onClick={() => onPin(v)}
          title={v.pinned ? t("version.unpin", { defaultValue: "Unpin" }) : t("version.pin", { defaultValue: "Pin" })}
          aria-label={v.pinned ? t("version.unpin", { defaultValue: "Unpin" }) : t("version.pin", { defaultValue: "Pin" })}
        >
          {v.pinned ? (
            <LuPinOff size={13} aria-hidden="true" />
          ) : (
            <LuPin size={13} aria-hidden="true" />
          )}
        </button>
        {!isEditing && (
          <button
            type="button"
            className="vhp-btn"
            onClick={() => onEditStart(v.versionId, v.label)}
            title={t("version.editLabel", { defaultValue: "Edit label" })}
            aria-label={t("version.editLabel", { defaultValue: "Edit label" })}
          >
            <LuPencil size={13} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="vhp-btn restore"
          onClick={() => onRestore(v)}
          disabled={restoring === v.versionId}
          title={t("version.restore", { defaultValue: "Restore" })}
          aria-label={t("version.restore", { defaultValue: "Restore" })}
        >
          <LuRefreshCw
            size={13}
            className={restoring === v.versionId ? "vhp-spin" : undefined}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="vhp-btn delete"
          onClick={() => onDelete(v)}
          disabled={deleting === v.versionId || !!v.pinned}
          title={v.pinned ? t("version.cannotDeletePinned", { defaultValue: "Unpin first to delete" }) : t("delete", { defaultValue: "Delete" })}
          aria-label={v.pinned ? t("version.cannotDeletePinned", { defaultValue: "Unpin first to delete" }) : t("delete", { defaultValue: "Delete" })}
        >
          <LuTrash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
