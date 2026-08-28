// 文件: render/page/FileDetailsPanel.tsx

import "../page.css";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useAppDispatch } from "app/store";
import { read } from "database/dbSlice";
import {
  LuInfo,
  LuFileText,
  LuType,
  LuCalendar,
  LuTag } from
"react-icons/lu";

interface FileDetailsPanelProps {
  pageKey: string;
}

interface FileMeta {
  id?: string;
  dbKey?: string;
  pageKey?: string;
  title?: string;
  type?: string;
  lastSavedAt?: string;
  updatedAt?: string;
  tags?: string[];
}

const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({ pageKey }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageKey) return;

    let isMounted = true;

    const fetchMeta = async () => {
      try {
        setLoading(true);
        const data = await (dispatch as any)(read({ dbKey: pageKey })).unwrap();
        if (!isMounted) return;
        setMeta(data || null);
        setError(null);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || t("loadFailed", "加载失败"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMeta();
    return () => {
      isMounted = false;
    };
  }, [dispatch, pageKey, t]);

  if (loading) {
    return (
      <div className="FileDetailsPanel">
        <div className="FileDetailsPanel__header">
          <LuInfo size={16} aria-hidden="true" />
          <span>{t("fileDetails", "文件详情")}</span>
        </div>
        <p className="FileDetailsPanel__hint">{t("loading", "加载中...")}</p>
      </div>);

  }

  if (error || !meta) {
    return (
      <div className="FileDetailsPanel">
        <div className="FileDetailsPanel__header">
          <LuInfo size={16} aria-hidden="true" />
          <span>{t("fileDetails", "文件详情")}</span>
        </div>
        <p className="FileDetailsPanel__error">
          {error || t("noData", "未找到文件数据")}
        </p>
      </div>);

  }

  const updatedRaw = meta.lastSavedAt || meta.updatedAt;
  const updatedAt = updatedRaw ?
  format(new Date(updatedRaw), "yyyy-MM-dd HH:mm:ss") :
  t("unknown", "未知");

  const rows = [
  {
    icon: LuFileText,
    label: t("name", "名称"),
    value: meta.title || t("untitled", "未命名资源")
  },
  {
    icon: LuType,
    label: t("type", "类型"),
    value: meta.type?.toUpperCase?.() || "UNKNOWN"
  },
  {
    icon: LuCalendar,
    label: t("updatedAt", "更新时间"),
    value: updatedAt
  },
  {
    icon: LuTag,
    label: t("tags", "标签"),
    value: meta.tags?.join(", ") || t("none", "无")
  },
  {
    icon: LuInfo,
    label: "ID",
    value: meta.pageKey || meta.dbKey || pageKey
  }];


  return (
    <div className="FileDetailsPanel">
      <div className="FileDetailsPanel__header">
        <LuInfo size={16} aria-hidden="true" />
        <span>{t("fileDetails", "文件详情")}</span>
      </div>
      <div className="FileDetailsPanel__body">
        {rows.map((row) =>
        <div key={row.label} className="FileDetailsPanel__row">
            <row.icon size={14} className="FileDetailsPanel__icon" aria-hidden="true" />
            <div className="FileDetailsPanel__text">
              <span className="FileDetailsPanel__label">{row.label}</span>
              <span className="FileDetailsPanel__value">{row.value}</span>
            </div>
          </div>
        )}
      </div>

      
    </div>);

};

export default FileDetailsPanel;
