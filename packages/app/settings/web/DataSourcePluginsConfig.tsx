// packages/app/settings/web/DataSourcePluginsConfig.tsx
//
// 数据源插件开关设置页。
//
// 数据源清单的唯一真源是服务端注册表（DATA_SOURCE_PLUGIN_SPECS，经
// `GET /api/plugins/data-sources` 下发）：前端不硬编码 id 或数量，
// 后端新增一个数据源这里就自动多一行。
//
// 开关语义：点一下即 POST，采用「乐观更新 + 失败回滚」——先按用户意图改本地
// 状态，失败则把列表回滚到点击前并 toast，成功后用服务端返回的列表覆盖本地
// （服务端是权威）。界面绝不能显示「已开」而服务端没开。

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuDatabase, LuRefreshCw } from "react-icons/lu";
import { useToken } from "identity";
import { useAuthTargetServer } from "app/settings/useAuthTargetServer";
import ToggleSwitch from "render/web/ui/ToggleSwitch";
import { toast } from "app/utils/toast";
import {
  loadDataSourcePlugins,
  saveDataSourcePluginPreference,
  type DataSourcePlugin,
} from "./dataSourcePluginsClient";
import "./DataSourcePluginsConfig.css";

type LoadState = "loading" | "ready" | "error";

export default function DataSourcePluginsConfig() {
  const { t } = useTranslation();
  const currentToken = useToken();
  const { currentServer: configuredServer } = useAuthTargetServer();

  // 与 SecretsConfig 同一取法：Web/云版本用运行时 origin 作为 API 基址
  // （用户此刻就在这台 server 上），桌面端 origin 非 http(s) 时退回配置值。
  const currentServer = useMemo(() => {
    if (typeof window !== "undefined" && /^https?:\/\//.test(window.location.origin)) {
      return window.location.origin.replace(/\/+$/, "");
    }
    return configuredServer ? configuredServer.replace(/\/+$/, "") : "";
  }, [configuredServer]);

  const [plugins, setPlugins] = useState<DataSourcePlugin[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [reloadNonce, setReloadNonce] = useState(0);

  // 在途请求的**同步**计数与递增序号。不能用 pendingIds 闭包判断「有没有别的请求在飞」：
  // 闭包捕获的是 handleToggle 启动那一刻的快照，两个并发请求都会看到「只有自己」，
  // 于是都能整表覆盖，较早请求的旧列表会把较晚请求已保存的变更冲掉（本轮 R4 残留）。
  const inflightRef = useRef(0);
  const requestSeqRef = useRef(0);

  // 页面卸载后不再 setState：请求可能晚于导航返回。
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canRequest = Boolean(currentToken && currentServer);
  const notSignedIn = t("settings.dataSources.notSignedIn", "请先登录后再管理数据源");

  const reload = useCallback(() => setReloadNonce((value) => value + 1), []);

  useEffect(() => {
    if (!currentToken || !currentServer) {
      setState("error");
      setPlugins([]);
      setErrorMessage(notSignedIn);
      return;
    }
    let cancelled = false;
    setState("loading");
    setErrorMessage(null);
    void (async () => {
      const result = await loadDataSourcePlugins({
        server: currentServer,
        token: currentToken,
      });
      if (cancelled || !mountedRef.current) return;
      if (!result.ok) {
        setPlugins([]);
        setState("error");
        setErrorMessage(
          t("settings.dataSources.loadFailed", "无法加载数据源列表：{{reason}}", {
            reason: result.error,
          }),
        );
        return;
      }
      setPlugins(result.plugins);
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [currentServer, currentToken, notSignedIn, reloadNonce, t]);

  const handleToggle = useCallback(
    async (plugin: DataSourcePlugin, nextEnabled: boolean) => {
      if (pendingIds[plugin.id] || !currentToken || !currentServer) return;
      // 只记住**这一行**回滚前的值，不要捕获整份列表快照：不同插件的请求可以并发，
      // 用整份快照回滚会把另一行已经保存成功的变更一起覆盖掉（R4）。
      const previousEnabled = !nextEnabled;
      // 同步记账：这次请求的序号 + 在途计数（不依赖 render 后的 pendingIds）。
      const seq = ++requestSeqRef.current;
      inflightRef.current += 1;
      // 乐观更新：立刻反映用户意图
      setPlugins((current) =>
        current.map((item) =>
          item.id === plugin.id ? { ...item, enabled: nextEnabled } : item,
        ),
      );
      setPendingIds((current) => ({ ...current, [plugin.id]: true }));
      const result = await saveDataSourcePluginPreference({
        server: currentServer,
        token: currentToken,
        pluginId: plugin.id,
        enabled: nextEnabled,
      });
      inflightRef.current = Math.max(0, inflightRef.current - 1);
      const isLatestRequest = seq === requestSeqRef.current;
      if (!mountedRef.current) return;
      if (!result.ok) {
        // 失败只回滚这一行，其它行保持当前（可能是别的请求刚写成功的）状态。
        setPlugins((current) =>
          current.map((item) =>
            item.id === plugin.id ? { ...item, enabled: previousEnabled } : item,
          ),
        );
        toast.error(
          t("settings.dataSources.toggleFailed", "{{name}} 保存失败：{{reason}}", {
            name: plugin.displayName,
            reason: result.error,
          }),
        );
      } else {
        // 服务端列表是权威，但**只有最新一次请求的响应**才允许整表覆盖。
        // 乱序到达的旧响应若整表覆盖，会把更晚请求已保存成功的变更改回去（R4 残留）。
        if (isLatestRequest && inflightRef.current === 0) {
          setPlugins(result.plugins);
        }
        setState("ready");
        setErrorMessage(null);
      }
      setPendingIds((current) => {
        const next = { ...current };
        delete next[plugin.id];
        return next;
      });
    },
    [currentServer, currentToken, pendingIds, t],
  );

  const isLoading = state === "loading";

  return (
    <div className="productivity-page data-sources-page">
      <div className="data-sources-page__header">
        <h1 className="page-title">
          <LuDatabase size={18} aria-hidden="true" />
          {t("settings.dataSources.title", "数据源")}
        </h1>
        <button
          type="button"
          className="data-sources-page__refresh"
          onClick={reload}
          disabled={!canRequest || isLoading}
          title={t("common.refresh", "刷新")}
          aria-label={t("common.refresh", "刷新")}
        >
          <LuRefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      <p className="page-description">
        {t(
          "settings.dataSources.description",
          "数据源决定 agent 能查询哪类外部信息。零凭据、零外部费用的数据源默认开启，其余默认关闭；在这里关闭后，对应工具会立即从 agent 的工具面移除。",
        )}
      </p>

      {isLoading && (
        <p className="data-sources-state" role="status">
          {t("settings.dataSources.loading", "正在加载数据源…")}
        </p>
      )}

      {!isLoading && state === "error" && (
        <div className="data-sources-state data-sources-state--error" role="alert">
          <p>{errorMessage ?? t("settings.dataSources.loadFailed", "无法加载数据源列表")}</p>
          {canRequest && (
            <button type="button" className="data-sources-state__retry" onClick={reload}>
              {t("settings.dataSources.retry", "重试")}
            </button>
          )}
        </div>
      )}

      {!isLoading && state === "ready" && plugins.length === 0 && (
        <p className="data-sources-state" role="status">
          {t(
            "settings.dataSources.empty",
            "服务端当前没有注册任何数据源。注册表更新后刷新即可看到。",
          )}
        </p>
      )}

      {!isLoading && state === "ready" && plugins.length > 0 && (
        <ul className="data-sources-list">
          {plugins.map((plugin) => {
            const pending = Boolean(pendingIds[plugin.id]);
            return (
              <li key={plugin.id} className="data-sources-item">
                <div className="data-sources-item__copy">
                  <div className="data-sources-item__title">
                    {plugin.displayName}
                    {plugin.requiresCredential && (
                      <span className="data-sources-item__badge">
                        {t("settings.dataSources.requiresCredential", "需 API Key")}
                      </span>
                    )}
                  </div>
                  {plugin.requiresCredential && (
                    <p className="data-sources-item__note">
                      {t(
                        "settings.dataSources.credentialNote",
                        "需先在密钥页配置该数据源的 API Key。注意：该数据源目前读取服务器环境里的 SERPAPI_API_KEY，在「密钥」页保存的用户凭据暂不会注入它；Key 缺失时工具会直接报错，而不是返回空结果。",
                      )}
                    </p>
                  )}
                </div>
                <div className="data-sources-item__control">
                  <ToggleSwitch
                    checked={plugin.enabled}
                    loading={pending}
                    disabled={pending}
                    onChange={(next) => {
                      void handleToggle(plugin, next);
                    }}
                    label={plugin.displayName}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
