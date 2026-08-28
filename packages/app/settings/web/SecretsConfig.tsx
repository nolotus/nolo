// packages/app/settings/web/SecretsConfig.tsx
//
// 用户密钥管理页：存储第三方 API Key 等敏感凭证。
//
// 存储架构：
//   - 已登录：POST /api/user-secrets/set → 服务端 AES-256-GCM 加密后存入 LevelDB
//   - 未登录：写入 localStorage（仅本设备，无加密）
//   - UI 展示时服务端返回掩码值（前4后4），原始值不传至前端

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuKey, LuPlus, LuTrash2, LuEye, LuEyeOff, LuRefreshCw } from "react-icons/lu";
import { toast } from "app/utils/toast"
import { useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import "./SecretsConfig.css";

const STORAGE_KEY = "nolo-local-secrets";
const WEREAD_SKILLS_URL = "https://weread.qq.com/r/weread-skills";
const WEREAD_SECRET_KEY = "WEREAD_API_KEY";

const PRESET_KEYS = [
  { key: "OPENAI_KEY", desc: "OpenAI API Key" },
  { key: "ANTHROPIC_API_KEY", desc: "Anthropic Claude API Key" },
  { key: "GOOGLE_API_KEY", desc: "Google / Gemini API Key" },
  { key: "GITHUB_TOKEN", desc: "GitHub Personal Access Token" },
  { key: WEREAD_SECRET_KEY, desc: "微信读书 API Key" },
];

type SecretsMap = Record<string, string>;

function loadLocalSecrets(): SecretsMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** 读取单个本地密钥（供离线/未登录场景调用） */
export function getLocalSecret(key: string): string | null {
  return loadLocalSecrets()[key] ?? null;
}

export default function SecretsConfig() {
  const { t } = useTranslation();
  const currentToken = useToken();
  const configuredServer = useAppSelector(selectRemoteServer);
  const currentServer =
    typeof window !== "undefined" && /^https?:\/\//.test(window.location.origin)
      ? window.location.origin.replace(/\/+$/, "")
      : configuredServer;

  const [secrets, setSecrets] = useState<SecretsMap>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [setupSource, setSetupSource] = useState("");

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${currentToken}`,
  }), [currentToken]);

  const loadServerSecrets = useCallback(async () => {
    if (!currentToken || !currentServer) return;
    setLoading(true);
    try {
      const res = await fetch(`${currentServer}/api/user-secrets`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // 服务端返回 { success: true, secrets: { KEY: "****" } }
      setSecrets(data.secrets ?? {});
    } catch (e) {
      toast.error(t("settings.secrets.loadFailed", "加载密钥失败，请刷新重试"));
    } finally {
      setLoading(false);
    }
  }, [currentToken, currentServer]);

  useEffect(() => {
    if (currentToken) {
      loadServerSecrets();
    } else {
      setSecrets(loadLocalSecrets());
    }
  }, [currentToken, loadServerSecrets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key")?.trim().toUpperCase();
    if (key && /^[A-Z0-9_]{1,64}$/.test(key)) {
      setNewKey(key);
    }
    setSetupSource(asTrimmedLowercaseString(params.get("source")));
  }, []);

  async function handleAdd() {
    if (!newKey || !newValue) return;
    const key = newKey.toUpperCase();
    if (!/^[A-Z0-9_]{1,64}$/.test(key)) {
      toast.error(t("settings.secrets.invalidKey", "Key 只允许大写字母、数字和下划线，最多64位"));
      return;
    }
    if (currentToken && currentServer) {
      try {
        const res = await fetch(`${currentServer}/api/user-secrets/set`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ key, value: newValue }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSecrets((prev) => ({ ...prev, [key]: newValue }));
        setNewKey("");
        setNewValue("");
        toast.success(t("settings.secrets.saveSuccess", "已保存 {{key}}", { key }));
      } catch {
        toast.error(t("settings.secrets.saveFailed", "服务器保存失败，请重试"));
        // 已登录时不写 localStorage，避免刷新后数据静默丢失
      }
    } else {
      const local = loadLocalSecrets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...local, [key]: newValue }));
      setSecrets((prev) => ({ ...prev, [key]: newValue }));
      setNewKey("");
      setNewValue("");
      toast.success(t("settings.secrets.saveLocal", "已保存 {{key}}（仅本设备）", { key }));
    }
  }

  async function handleDelete(key: string) {
    if (currentToken && currentServer) {
      try {
        const res = await fetch(`${currentServer}/api/user-secrets/delete`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ key }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success(t("settings.secrets.deleteSuccess", "已删除 {{key}}", { key }));
      } catch {
        toast.error(t("settings.secrets.deleteFailed", "服务器删除失败"));
        return;
      }
    } else {
      const local = { ...loadLocalSecrets() };
      delete local[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      toast.success(t("settings.secrets.deleteSuccess", "已删除 {{key}}", { key }));
    }
    setSecrets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const keys = Object.keys(secrets);

  return (
    <div className="secrets-page">
      <header className="secrets-page__header">
        <h1 className="page-title">
          <LuKey size={18} aria-hidden="true" />
          {t("settings.secrets.title", "密钥管理")}
        </h1>
        {currentToken && (
          <button
            type="button"
            className="secret-btn"
            onClick={loadServerSecrets}
            disabled={loading}
            title={t("common.refresh", "刷新")}
            aria-label={t("common.refresh", "刷新")}
          >
            <LuRefreshCw
              size={14}
              aria-hidden="true"
              style={loading ? { animation: "spin 1s linear infinite" } : {}}
            />
          </button>
        )}
      </header>
      <p className="page-description">
        {currentToken
          ? t("settings.secrets.description_server",
              "密钥在服务器端 AES-256-GCM 加密后存储，数据库泄露也无法还原原始值。登录后可跨设备安全使用这些第三方服务凭证。")
          : t("settings.secrets.description_local",
              "登录后密钥将 AES-256-GCM 加密存储在服务器，可跨设备使用；当前未登录，仅明文保存在本设备浏览器中。")}
      </p>
      {(setupSource === "weread" || newKey === WEREAD_SECRET_KEY) && (
        <div className="secret-setup-card">
          <div>
            <strong>{t("settings.secrets.weread.title", "微信读书 API Key")}</strong>
            <p>{t("settings.secrets.weread.hint", "先获取 Key，再粘贴到下方 value 输入框；Key 名已预填为 {{key}}。", { key: WEREAD_SECRET_KEY })}</p>
          </div>
          <a
            className="secret-link-btn"
            href={WEREAD_SKILLS_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t("settings.secrets.weread.getKey", "获取 Key")}
          </a>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="empty-state">{t("settings.secrets.empty", "还没有保存任何密钥")}</p>
      ) : (
        <div className="secrets-list">
          {keys.map((key) => (
            <div key={key} className="secret-row">
              <span className="secret-key">{key}</span>
              <span className="secret-value">
                {showValues[key] ? secrets[key] : "••••••••••••"}
              </span>
              <div className="secret-actions">
                <button
                  type="button"
                  className="secret-btn"
                  onClick={() => setShowValues((v) => ({ ...v, [key]: !v[key] }))}
                  title={showValues[key] ? t("settings.secrets.hide", "隐藏") : t("settings.secrets.show", "显示")}
                  aria-label={showValues[key] ? t("settings.secrets.hide", "隐藏") : t("settings.secrets.show", "显示")}
                >
                  {showValues[key] ? (
                    <LuEyeOff size={14} aria-hidden="true" />
                  ) : (
                    <LuEye size={14} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className="secret-btn danger"
                  onClick={() => handleDelete(key)}
                  title={t("settings.secrets.delete", "删除")}
                  aria-label={t("settings.secrets.delete", "删除")}
                >
                  <LuTrash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="add-form">
        <input
          placeholder={t("settings.secrets.add.keyPlaceholder", "KEY_NAME")}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <input
          type="password"
          placeholder={t("settings.secrets.add.valuePlaceholder", "value...")}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button type="button" className="add-btn" onClick={handleAdd} disabled={!newKey || !newValue}>
          <LuPlus size={14} aria-hidden="true" />
          {t("settings.secrets.add.button", "添加")}
        </button>
      </div>

      <div className="preset-keys">
        <p className="preset-title">{t("settings.secrets.presetTitle", "常用 Key 名称（点击自动填入）：")}</p>
        <div className="preset-list">
          {PRESET_KEYS.map(({ key, desc }) => (
            <button
              type="button"
              key={key}
              className="preset-tag"
              title={desc}
              onClick={() => setNewKey(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
