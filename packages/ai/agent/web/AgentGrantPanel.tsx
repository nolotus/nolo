import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuUserPlus, LuX, LuRefreshCw } from "react-icons/lu";
import Button from "render/web/ui/Button";
import { useToken } from "identity";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asOptionalTrimmedString } from "core/optionalString";
import { toast } from "app/utils/toast";
import "./AgentGrantPanel.css";

type GrantSummary = {
  granteeUserId: string;
  createdAt?: number;
  revokedAt?: number;
};

type AgentGrantPanelProps = {
  agentKey: string;
};

async function callGrantApi(args: {
  server: string;
  token: string;
  method: "GET" | "POST" | "DELETE";
  agentKey: string;
  granteeUserId?: string;
}) {
  const url = new URL("/api/agent-grants", args.server);
  if (args.method === "GET") {
    url.searchParams.set("agentKey", args.agentKey);
  }
  const res = await fetch(url.toString(), {
    method: args.method,
    headers: {
      Authorization: `Bearer ${args.token}`,
      ...(args.method === "GET" ? {} : { "Content-Type": "application/json" }),
    },
    ...(args.method === "GET"
      ? {}
      : {
          body: JSON.stringify({
            agentKey: args.agentKey,
            granteeUserId: args.granteeUserId,
          }),
        }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : `HTTP ${res.status}`,
    );
  }
  return body;
}

export default function AgentGrantPanel({ agentKey }: AgentGrantPanelProps) {
  const { t } = useTranslation("ai");
  const token = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const server = normalizeServerOrigin(currentServer) || "";

  const [granteeInput, setGranteeInput] = useState("");
  const [grants, setGrants] = useState<GrantSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !server || !agentKey) return;
    setLoading(true);
    try {
      const body = await callGrantApi({
        server,
        token,
        method: "GET",
        agentKey,
      });
      setGrants(Array.isArray(body?.grants) ? body.grants : []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("grant.loadFailed", "加载授权列表失败"),
      );
    } finally {
      setLoading(false);
    }
  }, [agentKey, server, t, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleGrant = useCallback(async () => {
    const granteeUserId = asOptionalTrimmedString(granteeInput);
    if (!granteeUserId || !token || !server) return;
    setSaving(true);
    try {
      await callGrantApi({
        server,
        token,
        method: "POST",
        agentKey,
        granteeUserId,
      });
      setGranteeInput("");
      toast.success(t("grant.created", "已授权"));
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("grant.createFailed", "授权失败"),
      );
    } finally {
      setSaving(false);
    }
  }, [agentKey, granteeInput, refresh, server, t, token]);

  const handleRevoke = useCallback(
    async (granteeUserId: string) => {
      if (!token || !server) return;
      setSaving(true);
      try {
        await callGrantApi({
          server,
          token,
          method: "DELETE",
          agentKey,
          granteeUserId,
        });
        toast.success(t("grant.revoked", "已撤销授权"));
        await refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("grant.revokeFailed", "撤销失败"),
        );
      } finally {
        setSaving(false);
      }
    },
    [agentKey, refresh, server, t, token],
  );

  if (!token || !server) {
    return (
      <section className="agent-grant-panel">
        <p className="agent-grant-panel__hint">
          {t("grant.loginRequired", "登录后可管理额度授权")}
        </p>
      </section>
    );
  }

  return (
    <section className="agent-grant-panel" aria-label={t("grant.title", "额度授权")}>
      <div className="agent-grant-panel__header">
        <h3 className="agent-grant-panel__title">
          {t("grant.title", "额度授权")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="small"
          icon={<LuRefreshCw size={14} aria-hidden="true" />}
          onClick={() => void refresh()}
          disabled={loading || saving}
          title={t("refresh", "刷新")}
        />
      </div>
      <p className="agent-grant-panel__hint">
        {t(
          "grant.hint",
          "收藏 ≠ 授权。公共 Agent 需显式授权；同空间私人 Agent 成员已可自动用你的 OAuth。",
        )}
      </p>
      <div className="agent-grant-panel__form">
        <input
          className="agent-grant-panel__input"
          value={granteeInput}
          onChange={(e) => setGranteeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleGrant();
            }
          }}
          placeholder={t("grant.placeholder", "对方 userId")}
          disabled={saving}
        />
        <Button
          type="button"
          variant="secondary"
          icon={<LuUserPlus size={14} aria-hidden="true" />}
          onClick={() => void handleGrant()}
          disabled={saving || !granteeInput.trim()}
          loading={saving}
        >
          {t("grant.add", "授权")}
        </Button>
      </div>
      {loading && grants.length === 0 ? (
        <p className="agent-grant-panel__empty">{t("loading", "加载中…")}</p>
      ) : grants.length === 0 ? (
        <p className="agent-grant-panel__empty">
          {t("grant.empty", "暂无授权对象")}
        </p>
      ) : (
        <ul className="agent-grant-panel__list">
          {grants.map((grant) => (
            <li key={grant.granteeUserId} className="agent-grant-panel__item">
              <span className="agent-grant-panel__user">{grant.granteeUserId}</span>
              <button
                type="button"
                className="agent-grant-panel__revoke"
                onClick={() => void handleRevoke(grant.granteeUserId)}
                disabled={saving}
                aria-label={t("grant.revoke", "撤销")}
              >
                <LuX size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
