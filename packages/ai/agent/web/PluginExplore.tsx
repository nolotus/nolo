// packages/ai/agent/web/PluginExplore.tsx

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuBox,
  LuKey,
  LuSave,
  LuShieldAlert,
  LuInfo,
  LuCheck,
  LuCopy,
  LuCheckCheck,
  LuRefreshCw,
} from "react-icons/lu";
import { toast } from "app/utils/toast";
import { useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import { CLOUD_PLUGIN_SPECS } from "../../../agent-runtime/cloudPluginSpecs";
import "./PluginExplore.css";

const SECRET_KEY_API_KEY = "INSTABOX_API_KEY";
const SECRET_KEY_TEMPLATE_ID = "INSTABOX_TEMPLATE_ID";

type SecretsMap = Record<string, string>;

interface InstaboxReadinessAutoPlacement {
  enabled: boolean;
  reason: string;
}

type InstaboxTemplateSource = "user" | "free-tier-default" | "paid-default";

type InstaboxReadinessResponse =
  | {
      configured: false;
      reason: string;
    }
  | {
      configured: true;
      tier?: string;
      orgKind?: string;
      freeTier: boolean;
      template: string;
      templateSource: InstaboxTemplateSource;
      templateNote: string;
      autoPlacement: InstaboxReadinessAutoPlacement;
      missing: string[];
      observedAt: number;
    };

type CloudConnection = {
  platformId: string;
  owner?: { kind: string };
  credentialPresent?: boolean | Record<string, boolean>;
  reasonCode?: string;
};

// Only server-declared presence is retained, never returned credential values.
const connectionSummary = (value: unknown): CloudConnection[] => {
  const rows = Array.isArray(value) ? value :
    value && typeof value === "object" && "connections" in value ? value.connections : null;
  if (!Array.isArray(rows)) throw new Error("INVALID_CONNECTION_RESPONSE");
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object" || typeof row.platformId !== "string") return [];
    const presence = row.credentialPresent;
    return [{
      platformId: row.platformId,
      owner: row.owner && typeof row.owner === "object" && typeof row.owner.kind === "string"
        ? { kind: row.owner.kind } : undefined,
      credentialPresent: typeof presence === "boolean" ? presence :
        presence && typeof presence === "object" ? Object.fromEntries(
          Object.entries(presence).map(([key, present]) => [key, present === true])
        ) : false,
      reasonCode: typeof row.reasonCode === "string" ? row.reasonCode : undefined,
    }];
  });
};

const unavailableReason = async (res: Response): Promise<string> => {
  const data = await res.json().catch(() => null);
  const reasonCode = typeof data?.reasonCode === "string" ? data.reasonCode :
    typeof data?.error?.reasonCode === "string" ? data.error.reasonCode : `HTTP_${res.status}`;
  return `未接线/不可用 · ${reasonCode}`;
};

const CloudPluginCards: React.FC<{ token: string; server: string }> = ({ token, server }) => {
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const generationRef = useRef(0);
  const controllers = useRef(new Set<AbortController>());

  useEffect(() => {
    const generation = ++generationRef.current;
    setConnections([]);
    setInputs({});
    setErrors({});
    setListError(null);
    setPending({});
    setLoading(false);
    if (!token || !server) return;
    const controller = new AbortController();
    controllers.current.add(controller);
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`${server}/api/cloud-plugins/connections`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (!res.ok) throw new Error(await unavailableReason(res));
        const rows = connectionSummary(await res.json());
        if (!controller.signal.aborted && generationRef.current === generation) setConnections(rows);
      } catch (error) {
        if (!controller.signal.aborted && generationRef.current === generation) {
          setConnections([]);
          setListError(error instanceof Error && error.message.startsWith("未接线/不可用")
            ? error.message : "未接线/不可用 · CONNECTION_LIST_FAILED");
        }
      } finally {
        controllers.current.delete(controller);
        if (!controller.signal.aborted && generationRef.current === generation) setLoading(false);
      }
    })();
    return () => {
      ++generationRef.current;
      controllers.current.forEach((request) => request.abort());
      controllers.current.clear();
    };
  }, [token, server]);

  const save = async (platformId: string) => {
    if (!token || !server || pending[platformId]) return;
    const spec = CLOUD_PLUGIN_SPECS.find((item) => item.id === platformId);
    if (!spec) return;
    const credentials = Object.fromEntries(spec.configFields
      .filter((field) => !field.operatorOnly && inputs[platformId]?.[field.key]?.trim())
      .map((field) => [field.key, inputs[platformId][field.key].trim()]));
    const generation = generationRef.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    setPending((prev) => ({ ...prev, [platformId]: true }));
    setErrors((prev) => ({ ...prev, [platformId]: "" }));
    try {
      const res = await fetch(`${server}/api/cloud-plugins/connections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ platformId, scope: "personal", credentials }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await unavailableReason(res));
      // Re-read safe presence metadata; saving is not a readiness probe.
      const listed = await fetch(`${server}/api/cloud-plugins/connections`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!listed.ok) throw new Error(await unavailableReason(listed));
      const rows = connectionSummary(await listed.json());
      if (controller.signal.aborted || generationRef.current !== generation) return;
      setConnections(rows);
      setListError(null);
    } catch (error) {
      if (!controller.signal.aborted && generationRef.current === generation) {
        setErrors((prev) => ({ ...prev, [platformId]:
          error instanceof Error && error.message.startsWith("未接线/不可用")
            ? error.message : "未接线/不可用 · CONNECTION_SAVE_FAILED" }));
      }
    } finally {
      controllers.current.delete(controller);
      if (!controller.signal.aborted && generationRef.current === generation) {
        setInputs((prev) => ({ ...prev, [platformId]: {} }));
        setPending((prev) => ({ ...prev, [platformId]: false }));
      }
    }
  };

  return <>{CLOUD_PLUGIN_SPECS.map((spec) => {
    const connection = connections.find((item) => item.platformId === spec.id && item.owner?.kind === "user");
    const credentialPresent = connection?.credentialPresent;
    const present = (key: string) => typeof credentialPresent === "boolean"
      ? credentialPresent : credentialPresent?.[key] === true;
    const error = errors[spec.id] || listError;
    return <section className="plugin-card" key={spec.id} data-testid={`plugin-card-${spec.id}`}>
      <div className="plugin-card__header"><h3>{spec.displayName}</h3></div>
      <p>runtimeKey: {spec.runtimeKey} · {spec.credentialMode}</p>
      <p>能力声明：probe {String(spec.capabilities.probe)} / execute {String(spec.capabilities.execute)}（不代表就绪）</p>
      <p role="status">{error || (loading ? "加载中…" : connection?.reasonCode
        ? `未接线/不可用 · ${connection.reasonCode}` : connection
          ? "连接已保存，尚未验证可用" : "尚未保存连接，尚未验证可用")}</p>
      <p>组织连接暂不可用：当前入口无法传入 organizationId。</p>
      {token ? <form className="plugin-form" onSubmit={(event) => { event.preventDefault(); void save(spec.id); }}>
        {spec.configFields.map((field) => <div className="plugin-form-group" key={field.key}>
          <label className="plugin-form-label" htmlFor={`${spec.id}-${field.key}`}>{field.label}{field.required ? " *" : ""}</label>
          <p className="plugin-form-hint">{field.description}</p>
          <p>credentialPresent: {String(present(field.key))}</p>
          {field.operatorOnly ? <p>仅运营方配置，不接受用户输入。</p> : <input
            id={`${spec.id}-${field.key}`} className="plugin-form-input"
            type={field.secret ? "password" : "text"} autoComplete="new-password"
            required={field.required && !present(field.key)}
            disabled={pending[spec.id] || loading || !server}
            value={inputs[spec.id]?.[field.key] ?? ""}
            onChange={(event) => setInputs((prev) => ({ ...prev, [spec.id]: {
              ...prev[spec.id], [field.key]: event.target.value,
            } }))}
          />}
        </div>)}
        <button className="plugin-btn-save" type="submit" disabled={pending[spec.id] || loading || !server}>
          {pending[spec.id] ? "保存中…" : "保存个人连接"}
        </button>
      </form> : <p>请登录后配置个人连接。</p>}
    </section>;
  })}</>;
};

export const PluginExplore: React.FC = () => {
  const { t } = useTranslation();
  const currentToken = useToken();
  const configuredServer = useAppSelector(selectRemoteServer);
  const currentServer =
    typeof window !== "undefined" && /^https?:\/\//.test(window.location.origin)
      ? window.location.origin.replace(/\/+$/, "")
      : configuredServer;

  const [secrets, setSecrets] = useState<SecretsMap>({});
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [templateIdInput, setTemplateIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instaboxAvailabilityError, setInstaboxAvailabilityError] = useState<string | null>(null);

  // 就绪状态与连接检查
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [readinessData, setReadinessData] = useState<InstaboxReadinessResponse | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // 代次守卫与请求控制器：token/server 切换立即失效旧请求，防止旧身份数据回写
  const generationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readinessAbortRef = useRef<AbortController | null>(null);

  // 当 token 或 server 切换时：立即清空旧 secrets 与输入明文，中止未完成的请求并重置就绪状态
  useEffect(() => {
    generationRef.current += 1;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readinessAbortRef.current) {
      readinessAbortRef.current.abort();
      readinessAbortRef.current = null;
    }

    setSecrets({});
    setInstaboxAvailabilityError(null);
    setApiKeyInput("");
    setTemplateIdInput("");
    setLoading(false);
    setSaving(false);
    setCheckingReadiness(false);
    setReadinessData(null);
    setReadinessError(null);
    setCopiedCommand(false);

    if (!currentToken || !currentServer) {
      return;
    }

    const currentGeneration = generationRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadSecrets = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${currentServer}/api/user-secrets`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted || generationRef.current !== currentGeneration) {
          return;
        }

        if (!res.ok) {
          throw new Error(await unavailableReason(res));
        }

        const data = await res.json();
        if (controller.signal.aborted || generationRef.current !== currentGeneration) {
          return;
        }

        setSecrets(data.secrets ?? {});
        setInstaboxAvailabilityError(null);
      } catch (error) {
        if (controller.signal.aborted || generationRef.current !== currentGeneration) {
          return;
        }
        setInstaboxAvailabilityError(error instanceof Error && error.message.startsWith("未接线/不可用")
          ? error.message : "未接线/不可用 · SECRET_LIST_FAILED");
        toast.error(t("explorePage.plugin.loadSecretsFailed", "加载凭据配置状态失败"));
      } finally {
        if (!controller.signal.aborted && generationRef.current === currentGeneration) {
          setLoading(false);
        }
      }
    };

    loadSecrets();

    return () => {
      controller.abort();
      if (readinessAbortRef.current) {
        readinessAbortRef.current.abort();
        readinessAbortRef.current = null;
      }
    };
  }, [currentToken, currentServer, t]);

  const hasApiKey = Boolean(secrets[SECRET_KEY_API_KEY]);
  const maskedApiKey = secrets[SECRET_KEY_API_KEY];
  const hasTemplateId = Boolean(secrets[SECRET_KEY_TEMPLATE_ID]);
  const maskedTemplateId = secrets[SECRET_KEY_TEMPLATE_ID];

  // 连接就绪状态检查：向服务端发送 POST /api/instabox/readiness 获取配置与路由事实
  const handleCheckReadiness = async () => {
    if (!currentToken || !currentServer) {
      toast.error(t("explorePage.plugin.loginRequired", "请先登录以绑定凭据"));
      return;
    }

    if (readinessAbortRef.current) {
      readinessAbortRef.current.abort();
      readinessAbortRef.current = null;
    }

    const checkGeneration = generationRef.current;
    const tokenSnapshot = currentToken;
    const serverSnapshot = currentServer;
    const controller = new AbortController();
    readinessAbortRef.current = controller;

    setCheckingReadiness(true);
    setReadinessError(null);

    try {
      const res = await fetch(`${serverSnapshot}/api/instabox/readiness`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenSnapshot}`,
        },
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        generationRef.current !== checkGeneration ||
        currentToken !== tokenSnapshot ||
        currentServer !== serverSnapshot
      ) {
        return;
      }

      if (!res.ok) {
        throw new Error(await unavailableReason(res));
      }

      const data: InstaboxReadinessResponse = await res.json();
      if (
        controller.signal.aborted ||
        generationRef.current !== checkGeneration ||
        currentToken !== tokenSnapshot ||
        currentServer !== serverSnapshot
      ) {
        return;
      }

      setReadinessData(data);
    } catch (err) {
      if (
        !controller.signal.aborted &&
        generationRef.current === checkGeneration &&
        currentToken === tokenSnapshot &&
        currentServer === serverSnapshot
      ) {
        setReadinessError(
          err instanceof Error
            ? err.message
            : t("explorePage.plugin.checkFailed", "检查连接失败，请稍后重试")
        );
      }
    } finally {
      if (
        !controller.signal.aborted &&
        generationRef.current === checkGeneration &&
        currentToken === tokenSnapshot &&
        currentServer === serverSnapshot
      ) {
        setCheckingReadiness(false);
      }
    }
  };

  const buildRunCommand = (freeTier: boolean): string => {
    const base =
      'nolo agent run --agent <agent> --msg "..." --runtime-key instabox --instabox-workspace empty --instabox-artifact-dir <绝对目录>';
    return freeTier ? base : `${base} --instabox-allow-paid`;
  };

  const handleCopyCommand = async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedCommand(true);
        setTimeout(() => setCopiedCommand(false), 2000);
      }
    } catch {
      toast.error(t("explorePage.plugin.copyFailed", "复制失败"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 保存前校验当前认证
    if (!currentToken || !currentServer) {
      toast.error(t("explorePage.plugin.loginRequired", "请先登录以绑定凭据"));
      return;
    }

    const saveGeneration = generationRef.current;
    const tokenSnapshot = currentToken;
    const serverSnapshot = currentServer;

    const trimmedApiKey = apiKeyInput.trim();
    const trimmedTemplateId = templateIdInput.trim();

    if (!trimmedApiKey && !hasApiKey) {
      toast.error(t("explorePage.plugin.apiKeyRequired", "请输入 Instabox API Key"));
      return;
    }

    if (!trimmedApiKey && !trimmedTemplateId) {
      return;
    }

    setSaving(true);
    setInstaboxAvailabilityError(null);

    try {
      const saveSingleSecret = async (
        key: string,
        value: string
      ): Promise<{ success: boolean; masked?: string }> => {
        const res = await fetch(`${serverSnapshot}/api/user-secrets/set`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenSnapshot}`,
          },
          body: JSON.stringify({ key, value }),
          signal: abortControllerRef.current?.signal,
        });
        if (!res.ok) {
          const reason = await unavailableReason(res);
          if (generationRef.current === saveGeneration) setInstaboxAvailabilityError(reason);
          return { success: false };
        }
        const data = await res.json();
        return { success: true, masked: data.masked || "****" };
      };

      // 仅保存 API Key
      if (trimmedApiKey && !trimmedTemplateId) {
        const result = await saveSingleSecret(SECRET_KEY_API_KEY, trimmedApiKey);
        if (
          generationRef.current !== saveGeneration ||
          currentToken !== tokenSnapshot ||
          currentServer !== serverSnapshot
        ) {
          return;
        }
        if (result.success) {
          setSecrets((prev) => ({ ...prev, [SECRET_KEY_API_KEY]: result.masked! }));
          setApiKeyInput("");
          setReadinessData(null);
          setReadinessError(null);
          toast.success(t("explorePage.plugin.saveSuccess", "Instabox 凭据已保存"));
        } else {
          toast.error(t("explorePage.plugin.saveFailed", "保存凭据失败，请重试"));
        }
        return;
      }

      // 仅保存 Template ID
      if (!trimmedApiKey && trimmedTemplateId) {
        const result = await saveSingleSecret(SECRET_KEY_TEMPLATE_ID, trimmedTemplateId);
        if (
          generationRef.current !== saveGeneration ||
          currentToken !== tokenSnapshot ||
          currentServer !== serverSnapshot
        ) {
          return;
        }
        if (result.success) {
          setSecrets((prev) => ({ ...prev, [SECRET_KEY_TEMPLATE_ID]: result.masked! }));
          setTemplateIdInput("");
          setReadinessData(null);
          setReadinessError(null);
          toast.success(t("explorePage.plugin.saveSuccess", "Instabox 凭据已保存"));
        } else {
          toast.error(t("explorePage.plugin.saveFailed", "保存凭据失败，请重试"));
        }
        return;
      }

      // 同时保存 API Key 与 Template ID
      if (trimmedApiKey && trimmedTemplateId) {
        const [apiKeyRes, templateIdRes] = await Promise.all([
          saveSingleSecret(SECRET_KEY_API_KEY, trimmedApiKey),
          saveSingleSecret(SECRET_KEY_TEMPLATE_ID, trimmedTemplateId),
        ]);

        if (
          generationRef.current !== saveGeneration ||
          currentToken !== tokenSnapshot ||
          currentServer !== serverSnapshot
        ) {
          return;
        }

        if (apiKeyRes.success && templateIdRes.success) {
          setSecrets((prev) => ({
            ...prev,
            [SECRET_KEY_API_KEY]: apiKeyRes.masked!,
            [SECRET_KEY_TEMPLATE_ID]: templateIdRes.masked!,
          }));
          setApiKeyInput("");
          setTemplateIdInput("");
          setReadinessData(null);
          setReadinessError(null);
          toast.success(t("explorePage.plugin.saveSuccess", "Instabox 凭据已保存"));
        } else if (apiKeyRes.success && !templateIdRes.success) {
          // 部分成功：API Key 成功，Template ID 失败（禁止报全部成功）
          setSecrets((prev) => ({ ...prev, [SECRET_KEY_API_KEY]: apiKeyRes.masked! }));
          setApiKeyInput("");
          setReadinessData(null);
          setReadinessError(null);
          toast.error(
            t(
              "explorePage.plugin.apiKeySavedTemplateFailed",
              "API Key 已保存，但 Template ID 保存失败，请重试"
            )
          );
        } else if (!apiKeyRes.success && templateIdRes.success) {
          // 部分成功：Template ID 成功，API Key 失败（禁止报全部成功）
          setSecrets((prev) => ({ ...prev, [SECRET_KEY_TEMPLATE_ID]: templateIdRes.masked! }));
          setTemplateIdInput("");
          setReadinessData(null);
          setReadinessError(null);
          toast.error(
            t(
              "explorePage.plugin.templateSavedApiKeyFailed",
              "Template ID 已保存，但 API Key 保存失败，请重试"
            )
          );
        } else {
          toast.error(t("explorePage.plugin.saveFailed", "保存凭据失败，请重试"));
        }
      }
    } catch {
      if (
        generationRef.current === saveGeneration &&
        currentToken === tokenSnapshot &&
        currentServer === serverSnapshot
      ) {
        toast.error(t("explorePage.plugin.saveFailed", "保存凭据失败，请重试"));
      }
    } finally {
      if (
        generationRef.current === saveGeneration &&
        currentToken === tokenSnapshot &&
        currentServer === serverSnapshot
      ) {
        setSaving(false);
      }
    }
  };

  return (
    <div className="plugin-explore" data-testid="plugin-explore">
      <div className="plugin-explore__grid">
        <section className="plugin-card" aria-label="Instabox Plugin Card">
          <header className="plugin-card__header">
            <div className="plugin-card__header-left">
              <div className="plugin-card__icon" aria-hidden="true">
                <LuBox />
              </div>
              <div className="plugin-card__title-row">
                <span className="plugin-card__category">Sandbox Plugin</span>
                <h2 className="plugin-card__title">Instabox</h2>
              </div>
            </div>
            <div className="plugin-card__header-right">
              {hasApiKey ? (
                <span className="plugin-badge plugin-badge--configured" data-testid="status-configured">
                  <LuCheck size={12} />
                  {t("explorePage.plugin.statusConfigured", "已配置")}
                </span>
              ) : (
                <span className="plugin-badge plugin-badge--unconfigured" data-testid="status-unconfigured">
                  {t("explorePage.plugin.statusUnconfigured", "未配置")}
                </span>
              )}
            </div>
          </header>

          <p className="plugin-card__desc">
            {t(
              "explorePage.plugin.instaboxDesc",
              "提供隔离的云端容器与沙盒运行环境，支持安全的代码执行、动态调试与验证。"
            )}
          </p>

          <div className="plugin-card__disclaimers" role="note" aria-label="条款与限制说明">
            <div className="plugin-disclaimer-item plugin-disclaimer-item--warning">
              <LuShieldAlert className="plugin-disclaimer-icon" />
              <span>
                {t(
                  "explorePage.plugin.billingDisclaimer",
                  "第三方执行与按其账户计费：Instabox 为独立第三方运行环境，所有执行及资源消耗按您的 Instabox 账户规则计费，本平台不提供亦不承诺免费额度。"
                )}
              </span>
            </div>
            <div className="plugin-disclaimer-item">
              <LuInfo className="plugin-disclaimer-icon" />
              <span>
                {t(
                  "explorePage.plugin.authDisclaimer",
                  "未授权不运行/上传：需用户主动授权并绑定凭据后方可使用。未完成凭据配置或未经明确授权，绝不静默运行或上传代码与数据。"
                )}
              </span>
            </div>
          </div>

          {/* 状态展示区：掩码仅表示已配置，严禁标称已验证或可运行 */}
          {hasApiKey && (
            <div className="plugin-card__status-box" data-testid="configured-secrets-display">
              <div className="plugin-card__status-header">
                <span>{t("explorePage.plugin.configuredTitle", "凭据存储状态")}</span>
                <span>{loading ? t("common.loading", "加载中...") : ""}</span>
              </div>
              <div className="plugin-card__masked-item">
                <span className="plugin-card__masked-key">{SECRET_KEY_API_KEY}</span>
                <span className="plugin-card__masked-val">{maskedApiKey}</span>
              </div>
              {hasTemplateId && (
                <div className="plugin-card__masked-item">
                  <span className="plugin-card__masked-key">{SECRET_KEY_TEMPLATE_ID}</span>
                  <span className="plugin-card__masked-val">{maskedTemplateId}</span>
                </div>
              )}
              <div className="plugin-card__status-note">
                {t(
                  "explorePage.plugin.configuredNotice",
                  "掩码存在仅表示已配置，不代表已验证可用或可运行。"
                )}
              </div>
            </div>
          )}

          {/* 连接检查与就绪状态区 */}
          {currentToken && (
            <div className="plugin-card__readiness-section" data-testid="instabox-readiness-section">
              <div className="plugin-card__readiness-header">
                <span className="plugin-card__readiness-title">
                  {t("explorePage.plugin.readinessTitle", "连接与就绪状态")}
                </span>
                <button
                  type="button"
                  className="plugin-btn-check"
                  onClick={handleCheckReadiness}
                  disabled={checkingReadiness}
                  data-testid="btn-check-readiness"
                >
                  <LuRefreshCw className={checkingReadiness ? "plugin-spin" : ""} size={14} />
                  <span>
                    {checkingReadiness
                      ? t("explorePage.plugin.checking", "检查中...")
                      : t("explorePage.plugin.checkConnection", "检查连接")}
                  </span>
                </button>
              </div>

              {/* 失败可读提示 */}
              {readinessError && (
                <div className="plugin-readiness-alert plugin-readiness-alert--error" data-testid="readiness-error">
                  <LuShieldAlert size={14} />
                  <span>{readinessError}</span>
                </div>
              )}

              {/* 服务端返回事实展示区 */}
              {readinessData && !checkingReadiness && (
                <div className="plugin-readiness-details" data-testid="readiness-details">
                  {!readinessData.configured ? (
                    <div className="plugin-readiness-unconfigured-note" data-testid="readiness-unconfigured">
                      <LuInfo size={14} />
                      <span>
                        {t(
                          "explorePage.plugin.readinessUnconfiguredNote",
                          "服务端返回未配置状态（原因：{{reason}}）。",
                          { reason: readinessData.reason }
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="plugin-readiness-content" data-testid="readiness-content">
                      {/* 免费/付费层级 */}
                      <div className="plugin-readiness-item" data-testid="readiness-tier">
                        <span className="plugin-readiness-item__label">
                          {t("explorePage.plugin.tierLabel", "运行层级：")}
                        </span>
                        <span className="plugin-readiness-item__value">
                          {readinessData.freeTier
                            ? t("explorePage.plugin.freeTier", "免费层")
                            : t("explorePage.plugin.paidTier", "付费层")}
                          {readinessData.tier ? ` (${readinessData.tier})` : ""}
                          {readinessData.orgKind ? ` · ${readinessData.orgKind}` : ""}
                        </span>
                      </div>

                      {/* 将使用的模板及来源 */}
                      <div className="plugin-readiness-item" data-testid="readiness-template">
                        <span className="plugin-readiness-item__label">
                          {t("explorePage.plugin.templateLabel", "使用模板：")}
                        </span>
                        <div className="plugin-readiness-item__subblock">
                          <span className="plugin-readiness-item__value">
                            {readinessData.template}
                            <span className="plugin-readiness-tag">
                              {readinessData.templateSource === "user"
                                ? t("explorePage.plugin.templateSourceUser", "用户指定")
                                : readinessData.templateSource === "free-tier-default"
                                ? t("explorePage.plugin.templateSourceFreeDefault", "免费层默认")
                                : t("explorePage.plugin.templateSourcePaidDefault", "付费层默认")}
                            </span>
                          </span>
                          {readinessData.templateNote && (
                            <span className="plugin-readiness-item__note">
                              {readinessData.templateNote}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 自动分流是否启用及原因 */}
                      <div className="plugin-readiness-item" data-testid="readiness-autoplacement">
                        <span className="plugin-readiness-item__label">
                          {t("explorePage.plugin.autoPlacementLabel", "自动分流：")}
                        </span>
                        <span className="plugin-readiness-item__value">
                          {readinessData.autoPlacement.enabled
                            ? t("explorePage.plugin.enabled", "已启用")
                            : t("explorePage.plugin.disabled", "未启用")}
                          {readinessData.autoPlacement.reason && (
                            <span className="plugin-readiness-item__reason">
                              （{readinessData.autoPlacement.reason}）
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 可复制的运行命令 */}
                      <div className="plugin-readiness-command-box" data-testid="readiness-command-box">
                        <div className="plugin-readiness-command-header">
                          <span className="plugin-readiness-command-title">
                            {t("explorePage.plugin.commandTitle", "运行命令示例：")}
                          </span>
                          <button
                            type="button"
                            className="plugin-btn-copy"
                            onClick={() => handleCopyCommand(buildRunCommand(readinessData.freeTier))}
                            data-testid="btn-copy-command"
                            title={t("common.copy", "复制")}
                          >
                            {copiedCommand ? <LuCheckCheck size={13} /> : <LuCopy size={13} />}
                            <span>
                              {copiedCommand
                                ? t("common.copied", "已复制")
                                : t("common.copy", "复制命令")}
                            </span>
                          </button>
                        </div>
                        <pre className="plugin-readiness-command-code" data-testid="readiness-command-code">
                          <code>{buildRunCommand(readinessData.freeTier)}</code>
                        </pre>
                        <div className="plugin-readiness-command-hint" data-testid="readiness-command-hint">
                          {t(
                            "explorePage.plugin.commandPaidHint",
                            "提示：付费账号的 --instabox-allow-paid 是付费授权开关（不加时不会自动用付费账号）。"
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 凭据绑定表单 */}
          {currentToken ? (
            <form className="plugin-card__form" onSubmit={handleSave} data-testid="instabox-secret-form">
              <h3 className="plugin-card__form-title">
                {hasApiKey
                  ? t("explorePage.plugin.updateCredentials", "更新凭据绑定")
                  : t("explorePage.plugin.bindCredentials", "绑定凭据")}
              </h3>

              <div className="plugin-form-group">
                <label className="plugin-form-label" htmlFor="instabox-api-key">
                  <span>
                    {t("explorePage.plugin.apiKeyLabel", "Instabox API Key")}
                    <span className="plugin-form-required">*</span>
                  </span>
                  <span className="plugin-form-hint">
                    {hasApiKey
                      ? t("explorePage.plugin.apiKeyConfiguredHint", "留空保留原配置，输入新值覆盖")
                      : t("explorePage.plugin.apiKeyRequiredHint", "必需，用于连接 Instabox 沙盒平台")}
                  </span>
                </label>
                <div className="plugin-input-wrapper">
                  <LuKey className="plugin-input-icon" />
                  <input
                    id="instabox-api-key"
                    type="password"
                    autoComplete="new-password"
                    className="plugin-form-input"
                    placeholder={hasApiKey ? "••••••••" : "输入 Instabox API Key"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    disabled={saving}
                    data-testid="input-instabox-api-key"
                  />
                </div>
              </div>

              <div className="plugin-form-group">
                <label className="plugin-form-label" htmlFor="instabox-template-id">
                  <span>{t("explorePage.plugin.templateIdLabel", "Template ID")}</span>
                  <span className="plugin-form-hint">
                    {hasTemplateId
                      ? t("explorePage.plugin.templateConfiguredHint", "留空保留原配置，输入新值覆盖")
                      : t("explorePage.plugin.templateOptionalHint", "可选，指定自定义沙盒模板 ID")}
                  </span>
                </label>
                <input
                  id="instabox-template-id"
                  type="password"
                  autoComplete="new-password"
                  className="plugin-form-input"
                  placeholder={hasTemplateId ? "••••••••" : "输入可选 Template ID"}
                  value={templateIdInput}
                  onChange={(e) => setTemplateIdInput(e.target.value)}
                  disabled={saving}
                  data-testid="input-instabox-template-id"
                />
              </div>

              <div className="plugin-form-actions">
                <button
                  type="submit"
                  className="plugin-btn-save"
                  disabled={saving || (!apiKeyInput.trim() && !templateIdInput.trim())}
                  data-testid="btn-save-credentials"
                >
                  <LuSave size={14} />
                  <span>{saving ? t("common.saving", "保存中...") : t("explorePage.plugin.save", "保存凭据")}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="plugin-unauth-prompt" data-testid="plugin-unauth-prompt">
              {t(
                "explorePage.plugin.unauthMessage",
                "请登录后绑定 Instabox 凭据（未登录不进行客户端缓存）。"
              )}
            </div>
          )}
        </section>
        {instaboxAvailabilityError && <p role="alert">{instaboxAvailabilityError}</p>}
        <CloudPluginCards token={currentToken || ""} server={currentServer || ""} />
      </div>
    </div>
  );
};

export default PluginExplore;
