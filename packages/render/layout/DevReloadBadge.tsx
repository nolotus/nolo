import "./layout.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useStaleBuildPrompt } from "./useStaleBuildPrompt";

export const DevReloadBadge: React.FC = () => {
  const { t } = useTranslation();
  const stale = useStaleBuildPrompt();
  if (!stale) return null;

  const label = t("devReload.badge", "New build available, click to reload");

  return (
    <button
      type="button"
      className="DevReloadBadge"
      onClick={() => window.location.reload()}
      title={label}
      aria-label={label}
    />
  );
};