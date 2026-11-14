import "./AppSharePreview.css";
import React from "react";
import { NavLink } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuExternalLink, LuLayoutDashboard, LuRefreshCw } from "react-icons/lu";
import Avatar from "render/web/ui/Avatar";
import { useUserId } from "identity";
import { formatShareTime, normalizeAuthorName, toSafeTimestamp } from "share/helpers";
import type { SharedObject } from "share/types";
import {
  describeAppShareOrigin,
  isAppShareOwner,
  resolveAppShareAppKey,
  resolveAppShareRuntimePath,
} from "./appShareTarget";

/**
 * 应用分享的落地页（`/share/<token>`）——「从探索来的访客」看到的 app 预览页。
 *
 * 内容按访客能拿到的事实给：应用名、作者（含主页链接）、来源 server、封面/说明、
 * 一个主按钮「打开应用」（新窗口运行）。作者本人额外给「在 Nolo 打开应用页」，
 * 因为 `/<appKey>` 走 owner 级读权限（见 appSharePreview.ts 顶部说明），
 * 不能给访客一个点了会 403 的按钮。访客看不到任何编辑/删除入口。
 */
const readAuthorId = (shared: SharedObject): string => {
  const authorId = shared.meta?.authorId;
  return typeof authorId === "string" ? authorId.trim() : "";
};

const AppSharePreview: React.FC<{ shared: SharedObject }> = ({ shared }) => {
  const { t } = useTranslation();
  const viewerId = useUserId();
  const data = (shared.data ?? {}) as Record<string, unknown>;
  const runtimePath = resolveAppShareRuntimePath(data);
  const appKey = resolveAppShareAppKey(data);
  const authorId = readAuthorId(shared);
  const authorName = normalizeAuthorName(shared.meta?.authorName) || authorId;
  const authorAvatar = shared.meta?.authorAvatar;
  const title =
    (typeof data.name === "string" && data.name.trim()) || shared.meta?.title || "应用";
  const description = shared.meta?.description || "";
  const coverImage =
    shared.meta?.coverImage || (typeof data.coverImage === "string" ? data.coverImage : "");
  const sourceHost = describeAppShareOrigin(shared.meta?.originServer);
  const shareDate =
    toSafeTimestamp(shared.meta?.createdAt) ||
    toSafeTimestamp(shared.updatedAt) ||
    toSafeTimestamp(shared.createdAt);
  const viewerIsOwner = isAppShareOwner(authorId, viewerId);

  return (
    <div className="AppSharePreview-root">
      <div className="AppSharePreview-card">
        {coverImage ? (
          <img src={coverImage} alt={title} className="AppSharePreview-cover" />
        ) : (
          <div className="AppSharePreview-coverFallback" aria-hidden="true">
            <LuLayoutDashboard size={48} aria-hidden="true" />
          </div>
        )}
        <div className="AppSharePreview-body">
          <div className="AppSharePreview-meta">
            {authorName && (
              <div className="AppSharePreview-author">
                <Avatar name={authorName} src={authorAvatar} size="small" />
                {authorId ? (
                  <NavLink
                    to={`/profile/${encodeURIComponent(authorId)}`}
                    className="AppSharePreview-authorName"
                  >
                    {authorName}
                  </NavLink>
                ) : (
                  <span className="AppSharePreview-authorName">{authorName}</span>
                )}
                {shareDate > 0 && (
                  <span className="AppSharePreview-date">{formatShareTime(shareDate)}</span>
                )}
              </div>
            )}
            {sourceHost && (
              <span className="AppSharePreview-source">
                {t("appShare_fromServer", "来自")} {sourceHost}
              </span>
            )}
          </div>

          <h1 className="AppSharePreview-title">{title}</h1>
          {description && <p className="AppSharePreview-desc">{description}</p>}

          {runtimePath ? (
            <a
              className="AppSharePreview-openBtn"
              href={runtimePath}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuExternalLink size={16} aria-hidden="true" />
              <span>{t("appShare_openApp", "打开应用")}</span>
            </a>
          ) : (
            <p className="AppSharePreview-notice">
              {t(
                "appShare_missingRuntime",
                "这份分享里没有可运行地址，作者需要重新发布一次才能打开应用。"
              )}
            </p>
          )}

          {viewerIsOwner && appKey && (
            <NavLink className="AppSharePreview-secondaryBtn" to={`/${appKey}`}>
              {t("appShare_openAppPage", "在 Nolo 打开应用页")}
            </NavLink>
          )}

          {runtimePath && (
            <p className="AppSharePreview-hint">
              {t(
                "appShare_openHint",
                "应用会在新窗口里运行；你看到的是作者的只读版本，可以查看，不能编辑。"
              )}{" "}
              <a
                className="AppSharePreview-retry"
                href={runtimePath}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LuRefreshCw size={12} aria-hidden="true" />
                <span>{t("appShare_retryOpen", "打不开？重试")}</span>
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppSharePreview;
