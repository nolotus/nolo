import React, { useCallback, useEffect, useState } from "react";
import {
  LuGlobe,
  LuTrash2,
  LuPlus,
  LuLoader,
  LuExternalLink,
  LuCopy,
  LuCheck,
  LuTriangleAlert,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import type { CustomDomain } from "app/types/appSummary";
import "./DomainBindingPanel.css";

interface DomainBindingPanelProps {
  appId: string;
  onBind: (
    appId: string,
    hostname: string
  ) => Promise<{
    ok: boolean;
    url?: string;
    error?: string;
    code?: string;
    mode?: string;
    pendingDns?: boolean;
    aRecords?: string[];
  }>;
  onUnbind: (appId: string, hostname: string) => Promise<{ ok: boolean; error?: string }>;
  onList: (appId: string) => Promise<CustomDomain[]>;
}

const ARecordInstructions: React.FC<{ hostname: string; aRecords: string[] }> = ({
  hostname,
  aRecords,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="DomainPanel__dns-card">
      <div className="DomainPanel__dns-header">
        <LuTriangleAlert size={14} aria-hidden="true" />
        {t("domain_a_title")}
      </div>
      <p className="DomainPanel__dns-step">{t("domain_a_step1")}</p>
      <p className="DomainPanel__dns-step">{t("domain_a_step2")}</p>
      <table className="DomainPanel__dns-table">
        <thead>
          <tr>
            <th>{t("domain_a_type")}</th>
            <th>{t("domain_a_host")}</th>
            <th>{t("domain_a_target")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {aRecords.map((ip) => (
            <tr key={ip}>
              <td>
                <span className="DomainPanel__dns-badge">A</span>
              </td>
              <td>
                <code>{hostname}</code>
              </td>
              <td>
                <code className="DomainPanel__dns-value">{ip}</code>
              </td>
              <td>
                <button
                  type="button"
                  className="DomainPanel__copy-btn"
                  onClick={() => copy(ip)}
                  title="Copy"
                  aria-label={copied === ip ? "Copied" : "Copy"}
                >
                  {copied === ip ? (
                    <LuCheck size={13} aria-hidden="true" />
                  ) : (
                    <LuCopy size={13} aria-hidden="true" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="DomainPanel__dns-note">{t("domain_a_note")}</p>
    </div>
  );
};

export const DomainBindingPanel: React.FC<DomainBindingPanelProps> = ({
  appId,
  onBind,
  onUnbind,
  onList,
}) => {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [hostname, setHostname] = useState("");
  const [binding, setBinding] = useState(false);
  const [unbinding, setUnbinding] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [lastResult, setLastResult] = useState<{
    hostname: string;
    pendingDns?: boolean;
    aRecords?: string[];
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setDomains(await onList(appId));
    setLoading(false);
  }, [appId, onList]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLastResult(null);
    if (!hostname.trim()) {
      setErr(t("domain_err_empty"));
      return;
    }
    setBinding(true);
    const result = await onBind(appId, hostname.trim());
    setBinding(false);
    if (!result.ok) {
      if (result.code === "HOSTNAME_ALREADY_BOUND") {
        setErr(t("domain_err_already_bound"));
      } else {
        setErr(result.error ?? t("domain_err_empty"));
      }
      return;
    }
    setLastResult({
      hostname: hostname.trim(),
      pendingDns: result.pendingDns,
      aRecords: result.aRecords ?? [],
    });
    setHostname("");
    void refresh();
  };

  const handleUnbind = async (targetHostname: string) => {
    setErr("");
    setUnbinding(targetHostname);
    const result = await onUnbind(appId, targetHostname);
    setUnbinding(null);
    if (!result.ok) {
      setErr(result.error ?? "");
      return;
    }
    await refresh();
    if (lastResult?.hostname === targetHostname) setLastResult(null);
  };

  return (
    <div className="DomainPanel">

      <div className="DomainPanel__title">
        <LuGlobe size={12} aria-hidden="true" /> {t("domain_panel_title")}
      </div>

      {!loading && domains.length > 0 && (
        <div className="DomainPanel__list">
          {domains.map((domain) => (
            <div key={domain.hostname} className="DomainPanel__item">
              <span className="DomainPanel__hostname">{domain.hostname}</span>
              <span
                className={`DomainPanel__status ${domain.pendingDns ? "DomainPanel__status--pending" : ""}`}
              >
                {domain.pendingDns ? t("domain_status_pending") : t("domain_status_active")}
              </span>
              <a
                href={`https://${domain.hostname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="DomainPanel__link"
                aria-label={domain.hostname}
              >
                <LuExternalLink size={13} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="DomainPanel__unbind"
                disabled={unbinding === domain.hostname}
                onClick={() => void handleUnbind(domain.hostname)}
                title={t("domain_unbind_tip")}
                aria-label={t("domain_unbind_tip")}
              >
                {unbinding === domain.hostname ? (
                  <LuLoader size={13} className="spin" aria-hidden="true" />
                ) : (
                  <LuTrash2 size={13} aria-hidden="true" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="DomainPanel__form" onSubmit={handleBind}>
        <input
          className="DomainPanel__input"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder={t("domain_input_placeholder")}
          autoComplete="off"
        />
        <button type="submit" className="DomainPanel__bind-btn" disabled={binding}>
          {binding ? <LuLoader size={13} className="spin" aria-hidden="true" /> : <LuPlus size={13} aria-hidden="true" />}
          {binding ? t("domain_binding") : t("domain_bind_btn")}
        </button>
      </form>

      {err && <div className="DomainPanel__err">{err}</div>}
      {lastResult && (
        <div className="DomainPanel__ok">
          {lastResult.pendingDns
            ? t("domain_success_pending_a", { hostname: lastResult.hostname })
            : t("domain_success_active_a", { hostname: lastResult.hostname })}
        </div>
      )}
      <div className="DomainPanel__hint">{t("domain_hint_platform_a")}</div>
      {lastResult?.aRecords?.length ? (
        <ARecordInstructions hostname={lastResult.hostname} aRecords={lastResult.aRecords} />
      ) : null}
    </div>
  );
};
