/**
 * One-time local-first coachmark at the top of the chat sidebar.
 * Shown when the first recently-created row is marked; persisted via localStorage.
 */

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import * as stylex from "@stylexjs/stylex";
import { LuX } from "react-icons/lu";
import {
  getSnapshot,
  hasRecentlyCreated,
  subscribe,
} from "./recentlyCreatedStore";
import { sidebarStyles } from "../sidebarStyles";

export const SIDEBAR_COACHMARK_STORAGE_KEY =
  "nolo.localFirst.sidebarCoachmark.shown";

const readCoachmarkShown = (): boolean => {
  try {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(SIDEBAR_COACHMARK_STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
};

const writeCoachmarkShown = (): void => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_COACHMARK_STORAGE_KEY, "1");
  } catch {
    /* quota / private mode — fail closed for re-show */
  }
};

export const SidebarCoachmark: React.FC = () => {
  const { t } = useTranslation();
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const hasRecent = hasRecentlyCreated();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasRecent) return;
    if (readCoachmarkShown()) return;
    writeCoachmarkShown();
    setVisible(true);
  }, [hasRecent]);

  if (!visible) return null;

  // MessageInputCore.tsx:981 惯例：spread 在前，className 显式合并字面类（防 clobber）。
  const closeStyleProps = stylex.props(sidebarStyles.sidebarCoachmarkClose);

  return (
    <div className="SidebarCoachmark" role="status">
      <span className="SidebarCoachmark__text">
        {t(
          "localFirst.sidebar.coachmark",
          "你的助手和对话都在这里,点击随时切换"
        )}
      </span>
      <button
        type="button"
        {...closeStyleProps}
        className={[closeStyleProps.className, "SidebarCoachmark__close"].filter(Boolean).join(" ")}
        onClick={() => setVisible(false)}
        aria-label={t("common:close", "关闭")}
      >
        <LuX size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

export default SidebarCoachmark;
