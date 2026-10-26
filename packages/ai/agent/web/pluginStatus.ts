// packages/ai/agent/web/pluginStatus.ts
//
// 插件状态契约的唯一实现：secret key 常量、连接摘要解析、失败原因解析，
// 以及广场卡需要的只读状态探针。
//
// 只读取服务端声明的“是否存在凭据”（布尔 / 掩码），绝不取回、缓存或渲染明文。
// 配置页的读写逻辑仍在 PluginConfigPage，这里只供广场展示状态标签，
// 因此不改动配置页的任何读写行为。

import { useEffect, useRef, useState } from "react";
import { CLOUD_PLUGIN_SPECS } from "../../../agent-runtime/cloudPluginSpecs";
import type { PluginCardState } from "./pluginPresentation";

export const SECRET_KEY_API_KEY = "INSTABOX_API_KEY";
export const SECRET_KEY_TEMPLATE_ID = "INSTABOX_TEMPLATE_ID";

const CLOUD_IDS = CLOUD_PLUGIN_SPECS.map((spec) => spec.id);

export type SecretsMap = Record<string, string>;

export type CloudConnection = {
  platformId: string;
  owner?: { kind: string };
  /**
   * 连接所属 Space。缺席 = 个人私有连接。服务端的 listConnections 是 caller-scoped，
   * 会把「Space 内授权给你」的连接一并返回，且这些连接的 owner.kind 同样是 "user"
   * （owner 只记创建者身份、不表授权范围）。判断「这是不是你自己的个人连接」必须看
   * spaceId，不能看 owner.kind，否则空间共享的凭据会被显示成「我已配置」。
   */
  spaceId?: string;
  credentialPresent?: boolean | Record<string, boolean>;
  reasonCode?: string;
};

// Only server-declared presence is retained, never returned credential values.
export const connectionSummary = (value: unknown): CloudConnection[] => {
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
      spaceId: typeof row.spaceId === "string" ? row.spaceId : undefined,
      credentialPresent: typeof presence === "boolean" ? presence :
        presence && typeof presence === "object" ? Object.fromEntries(
          Object.entries(presence).map(([key, present]) => [key, present === true])
        ) : false,
      reasonCode: typeof row.reasonCode === "string" ? row.reasonCode : undefined,
    }];
  });
};

export const unavailableReason = async (res: Response): Promise<string> => {
  const data = await res.json().catch(() => null);
  const reasonCode = typeof data?.reasonCode === "string" ? data.reasonCode :
    typeof data?.error?.reasonCode === "string" ? data.error.reasonCode : `HTTP_${res.status}`;
  return `未接线/不可用 · ${reasonCode}`;
};

const idleStates = (): Record<string, PluginCardState> => {
  const states: Record<string, PluginCardState> = { instabox: "unconfigured" };
  for (const id of CLOUD_IDS) states[id] = "unconfigured";
  return states;
};

/**
 * 广场卡的只读状态：6 个云厂商 + Instabox。
 *
 * 代次守卫 + AbortController 与配置页同一套口径：token/server 一变，
 * 上一轮结果全部作废，绝不让旧身份的读取结果回写到新身份的画面上。
 */
export const usePluginCardStates = (
  token: string,
  server: string
): Record<string, PluginCardState> => {
  const [states, setStates] = useState<Record<string, PluginCardState>>(idleStates);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    setStates(idleStates());

    if (!token || !server) {
      return () => {
        controller.abort();
      };
    }

    const alive = () => !controller.signal.aborted && generationRef.current === generation;

    const readStates = async () => {
      const next = idleStates();

      // Instabox：沿用 /api/user-secrets，只看 key 是否存在。
      try {
        const res = await fetch(`${server}/api/user-secrets`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await unavailableReason(res));
        const data = await res.json();
        if (!alive()) return;
        const secrets: SecretsMap = data?.secrets ?? {};
        next.instabox = secrets[SECRET_KEY_API_KEY] ? "connected" : "unconfigured";
      } catch {
        if (!alive()) return;
        next.instabox = "unavailable";
      }

      // 云厂商：沿用 /api/cloud-plugins/connections，逐 spec 算同一套状态。
      try {
        const res = await fetch(`${server}/api/cloud-plugins/connections`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await unavailableReason(res));
        const rows = connectionSummary(await res.json());
        if (!alive()) return;
        for (const spec of CLOUD_PLUGIN_SPECS) {
          const connection = rows.find(
            (item) => item.platformId === spec.id && !item.spaceId
          );
          const presence = connection?.credentialPresent;
          const present = (key: string) =>
            typeof presence === "boolean" ? presence : presence?.[key] === true;
          next[spec.id] = connection?.reasonCode
            ? "unavailable"
            : spec.configFields.some((field) => present(field.key))
              ? "connected"
              : "unconfigured";
        }
      } catch {
        if (!alive()) return;
        for (const id of CLOUD_IDS) next[id] = "unavailable";
      }

      if (!alive()) return;
      setStates(next);
    };

    void readStates();

    return () => {
      ++generationRef.current;
      controller.abort();
    };
  }, [token, server]);

  return states;
};
